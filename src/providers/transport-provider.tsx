"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, startTransition } from "react";
import type { ReactNode } from "react";
import type { Project, SeqtrackChannel } from "@/lib/midi/types";
import type { RecordingStatus } from "@/lib/recording/types";
import { ALL_CHANNELS, STEPS_PER_BAR } from "@/lib/midi/constants";
import { useProject } from "@/providers/project-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { useSetActivePatternAll } from "@/stores/project-store";

/**
 * Pre-compute the live state object once per project change.
 * The playback tick callback then returns this ref without per-tick allocation,
 * which saves ~20ms of work at 120–240 BPM.
 */
interface LiveState {
  tracks: Array<{
    pattern: { bars: number; notes: Array<{ pitch: number; velocity: number; step: number; duration: number; probability: number }>; name: string; swing: number };
    channel: SeqtrackChannel;
    muted: boolean;
    volume: number;
  }>;
  bpm: number;
}

function computeLiveState(project: Project): LiveState {
  const tracks: LiveState["tracks"] = [];
  for (const ch of ALL_CHANNELS) {
    const track = project.tracks[ch];
    if (!track) continue;
    const pattern = track.patterns[track.activePattern];
    if (!pattern) continue; // skip if activePattern index is stale/out-of-bounds
    tracks.push({
      pattern,
      channel: ch,
      muted: (track.muted ?? false) || pattern.notes.length === 0,
      volume: track.volume,
    });
  }
  return { tracks, bpm: project.bpm };
}

/** Max number of patterns across all tracks (determines song length). */
function computeMaxPatterns(project: Project): number {
  let max = 1;
  for (const track of Object.values(project.tracks)) {
    if (track && track.patterns.length > max) max = track.patterns.length;
  }
  return max;
}

export interface TransportState {
  isPlaying: boolean;
  totalSteps: number;
  recordState: RecordingStatus;
  recordingElapsedMs: number;
  recordingMidiCount: number;
  /** When true, playback advances through all patterns in sequence. */
  isSongMode: boolean;
}

export interface TransportControls {
  play: () => Promise<void>;
  stop: () => void;
  seek: (step: number) => void;
  armRecord: () => Promise<void>;
  startRecord: (audioStream?: MediaStream) => Promise<void>;
  stopRecord: () => Promise<string | null>;
  discardRecord: () => void;
  /** Toggle song mode (sequential pattern playback). */
  setSongMode: (on: boolean) => void;
}

type TransportContextValue = TransportState & TransportControls;

const TransportContext = createContext<TransportContextValue | null>(null);

/**
 * Separate context for currentStep ONLY, so that playback ticks (which fire
 * every 8–16ms at 120–240 BPM) only re-render components that actually need
 * the step position (the PlaybackCursor leaf), not the entire TransportBar,
 * AppHeader, useRecording consumers, etc.
 */
const CurrentStepContext = createContext<number | null>(null);

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

  // Song mode: play all patterns P1..Pn in sequence, wrapping at each loop.
  const [isSongMode, setIsSongMode] = useState(false);
  const isSongModeRef = useRef(false);
  isSongModeRef.current = isSongMode;
  const songIndexRef = useRef(0);
  const lastStepRef = useRef(-1);

  // Live ref to project so the tick callback reads current state
  const projectRef = useRef(project);
  projectRef.current = project;

  // Hook reference to the setActivePatternAll action so we can call it from
  // inside the tick callback (which runs outside React's render cycle).
  const setActivePatternAll = useSetActivePatternAll();
  const setActivePatternAllRef = useRef(setActivePatternAll);
  setActivePatternAllRef.current = setActivePatternAll;

  // Pre-computed live state — updated via useEffect when project changes,
  // read by the playback tick loop with zero allocation.
  const liveStateRef = useRef<LiveState>(computeLiveState(project));

  useEffect(() => {
    liveStateRef.current = computeLiveState(project);
  }, [project]);

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

    // Song mode: start from whatever pattern is currently active
    songIndexRef.current = p.tracks[ALL_CHANNELS[0]]?.activePattern ?? 0;
    lastStepRef.current = -1;

    const control = playPatternLoopedWithCursor(
      dev.id,
      initialTracks,
      p.bpm,
      (step) => {
        setCurrentStep(step);

        // Song mode: detect loop wrap (step just went back to 0 from a high value)
        // and advance to the next pattern in the sequence.
        if (isSongModeRef.current && step === 0 && lastStepRef.current > 0) {
          const maxPatterns = computeMaxPatterns(projectRef.current);
          if (maxPatterns > 1) {
            const nextIdx = (songIndexRef.current + 1) % maxPatterns;
            songIndexRef.current = nextIdx;
            // startTransition so the heavy grid re-render is non-blocking
            startTransition(() => setActivePatternAllRef.current(nextIdx));
          }
        }
        lastStepRef.current = step;
      },
      // Zero-allocation ref read — updated via useEffect([project]) above
      () => liveStateRef.current,
    );
    playbackRef.current = control;
  }, [stop]);

  const setSongMode = useCallback((on: boolean) => {
    setIsSongMode(on);
    // When enabling mid-playback, sync songIndex to whichever pattern is
    // currently active so we don't jump unexpectedly.
    if (on) {
      const p = projectRef.current;
      songIndexRef.current = p.tracks[ALL_CHANNELS[0]]?.activePattern ?? 0;
    }
  }, []);

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

  // Memoized so the value reference only changes when a stable field
  // actually changes — crucial during playback, when currentStep fires
  // every tick but the stable fields don't move.
  const transportValue = useMemo<TransportContextValue>(() => ({
    isPlaying,
    totalSteps,
    recordState,
    recordingElapsedMs,
    recordingMidiCount,
    isSongMode,
    play,
    stop,
    seek,
    armRecord,
    startRecord,
    stopRecord,
    discardRecord,
    setSongMode,
  }), [isPlaying, totalSteps, recordState, recordingElapsedMs, recordingMidiCount, isSongMode, play, stop, seek, armRecord, startRecord, stopRecord, discardRecord, setSongMode]);

  return (
    <TransportContext.Provider value={transportValue}>
      <CurrentStepContext.Provider value={currentStep}>
        {children}
      </CurrentStepContext.Provider>
    </TransportContext.Provider>
  );
}

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext);
  if (!ctx) throw new Error("useTransport must be used within TransportProvider");
  return ctx;
}

/**
 * Subscribe ONLY to the current playback step. Updates every playback tick
 * (~8–16ms at 120–240 BPM). Use this in leaf components that display the
 * playhead; do not destructure currentStep from useTransport() anywhere
 * performance-sensitive.
 */
export function useCurrentStep(): number | null {
  return useContext(CurrentStepContext);
}
