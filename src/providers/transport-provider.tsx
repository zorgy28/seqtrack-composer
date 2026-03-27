"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { SeqtrackChannel } from "@/lib/midi/types";
import { ALL_CHANNELS, STEPS_PER_BAR } from "@/lib/midi/constants";
import { useProject } from "@/providers/project-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";

export interface TransportState {
  isPlaying: boolean;
  currentStep: number | null;
  totalSteps: number;
}

export interface TransportControls {
  play: () => Promise<void>;
  stop: () => void;
  seek: (step: number) => void;
}

type TransportContextValue = TransportState & TransportControls;

const TransportContext = createContext<TransportContextValue | null>(null);

export function TransportProvider({ children }: { children: ReactNode }) {
  const { project } = useProject();
  const { device } = useMidiConnection();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [totalSteps, setTotalSteps] = useState(16);
  const playbackRef = useRef<{ cancel: () => void; seek: (step: number) => void } | null>(null);

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

  // Cleanup on unmount (app close)
  useEffect(() => {
    return () => {
      playbackRef.current?.cancel();
      playbackRef.current = null;
    };
  }, []);

  return (
    <TransportContext.Provider
      value={{ isPlaying, currentStep, totalSteps, play, stop, seek }}
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
