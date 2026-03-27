"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { SeqtrackChannel } from "@/lib/midi/types";
import type { RecordingStatus } from "@/lib/recording/types";
import { ALL_CHANNELS, STEPS_PER_BAR } from "@/lib/midi/constants";
import { useProject } from "@/providers/project-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";

export interface TransportState {
  isPlaying: boolean;
  currentStep: number | null;
  totalSteps: number;
  recordState: RecordingStatus;
  recordingElapsedMs: number;
  recordingMidiCount: number;
}

export interface TransportControls {
  play: () => Promise<void>;
  stop: () => void;
  seek: (step: number) => void;
  armRecord: () => Promise<void>;
  startRecord: (audioStream?: MediaStream) => Promise<void>;
  stopRecord: () => Promise<string | null>;
  discardRecord: () => void;
}

type TransportContextValue = TransportState & TransportControls;

const TransportContext = createContext<TransportContextValue | null>(null);

export function TransportProvider({ children }: { children: ReactNode }) {
  const { project } = useProject();
  const { device } = useMidiConnection();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [totalSteps, setTotalSteps] = useState(16);
  const [recordState, setRecordState] = useState<RecordingStatus>("idle");
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [recordingMidiCount, setRecordingMidiCount] = useState(0);
  const playbackRef = useRef<{ cancel: () => void; seek: (step: number) => void } | null>(null);
  const engineRef = useRef<import("@/lib/recording/recording-engine").RecordingEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live ref to project so the tick callback reads current state
  const projectRef = useRef(project);
  projectRef.current = project;

  const deviceRef = useRef(device);
  deviceRef.current = device;

  const stop = useCallback(() => {
    playbackRef.current?.cancel();
    playbackRef.current = null;
    setIsPlaying(false);
    setCurrentStep(null);
  }, []);

  const play = useCallback(async () => {
    // If already playing, stop first
    if (playbackRef.current) {
      stop();
    }

    const dev = deviceRef.current;
    if (!dev) return;

    const { playPatternLoopedWithCursor } = await import("@/lib/webmidi/midi-sender");

    const p = projectRef.current;
    const initialTracks: Array<{
      pattern: { bars: number; notes: Array<{ pitch: number; velocity: number; step: number; duration: number; probability: number }>; name: string; swing: number };
      channel: SeqtrackChannel;
    }> = [];

    for (const ch of ALL_CHANNELS) {
      const track = p.tracks[ch];
      const pattern = track.patterns[track.activePattern];
      if (pattern.notes.length > 0) {
        initialTracks.push({ pattern, channel: ch });
      }
    }

    if (initialTracks.length === 0) return;

    const maxSteps = Math.max(16, ...initialTracks.map((t) => t.pattern.bars * STEPS_PER_BAR));
    setTotalSteps(maxSteps);
    setIsPlaying(true);

    const control = playPatternLoopedWithCursor(
      dev.id,
      initialTracks,
      p.bpm,
      (step) => setCurrentStep(step),
      () => {
        const live = projectRef.current;
        const liveTracks = ALL_CHANNELS.map((ch) => {
          const track = live.tracks[ch];
          const pattern = track.patterns[track.activePattern];
          return { pattern, channel: ch, muted: track.muted || pattern.notes.length === 0, volume: track.volume };
        });
        return { tracks: liveTracks, bpm: live.bpm };
      },
    );
    playbackRef.current = control;
  }, [stop]);

  const seek = useCallback((step: number) => {
    playbackRef.current?.seek(step);
  }, []);

  const resetRecordingState = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    engineRef.current?.dispose();
    engineRef.current = null;
    setRecordState("idle");
    setRecordingElapsedMs(0);
    setRecordingMidiCount(0);
  }, []);

  const armRecord = useCallback(async () => {
    const dev = deviceRef.current;
    if (!dev) return;
    try {
      const { RecordingEngine } = await import("@/lib/recording/recording-engine");
      const engine = new RecordingEngine({
        onStatusChange: (s) => setRecordState(s),
        onMidiEvent: () => setRecordingMidiCount((c) => c + 1),
      });
      const p = projectRef.current;
      await engine.arm({
        midiDeviceId: dev.id,
        projectId: p.id,
        bpm: p.bpm,
        name: `Recording ${new Date().toLocaleString()}`,
      });
      engineRef.current = engine;
    } catch (err) {
      console.error("[Transport] Failed to arm recording:", err);
      resetRecordingState();
    }
  }, [resetRecordingState]);

  const startRecord = useCallback(async (audioStream?: MediaStream) => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await engine.start(audioStream);
      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setRecordingElapsedMs(engine.getElapsedMs());
        setRecordingMidiCount(engine.getMidiEventCount());
      }, 100);
      // Also start playback
      await play();
    } catch (err) {
      console.error("[Transport] Failed to start recording:", err);
      resetRecordingState();
    }
  }, [play, resetRecordingState]);

  const stopRecord = useCallback(async () => {
    // Stop timer
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    // Stop playback
    stop();
    const engine = engineRef.current;
    if (!engine) { resetRecordingState(); return null; }
    try {
      const session = await engine.stop();
      const audioBlob = engine.getAudioBlob();
      // Save to IndexedDB
      const { saveRecordingSessionWithAudio } = await import("@/lib/storage/indexed-db");
      await saveRecordingSessionWithAudio(session, audioBlob);
      engineRef.current = null;
      setRecordState("idle");
      setRecordingElapsedMs(0);
      setRecordingMidiCount(0);
      return session.id;
    } catch (err) {
      console.error("[Transport] Failed to stop/save recording:", err);
      resetRecordingState();
      return null;
    }
  }, [stop, resetRecordingState]);

  const discardRecord = useCallback(() => {
    resetRecordingState();
  }, [resetRecordingState]);

  // Cleanup on unmount (app close)
  useEffect(() => {
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      engineRef.current?.dispose();
      engineRef.current = null;
      playbackRef.current?.cancel();
      playbackRef.current = null;
    };
  }, []);

  return (
    <TransportContext.Provider
      value={{
        isPlaying,
        currentStep,
        totalSteps,
        recordState,
        recordingElapsedMs,
        recordingMidiCount,
        play,
        stop,
        seek,
        armRecord,
        startRecord,
        stopRecord,
        discardRecord,
      }}
    >
      {children}
    </TransportContext.Provider>
  );
}

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext);
  if (!ctx) throw new Error("useTransport must be used within TransportProvider");
  return ctx;
}
