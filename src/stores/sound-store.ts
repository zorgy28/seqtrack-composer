"use client";

/**
 * Global sound control store.
 *
 * IMPORTANT: This is a module-level singleton, not per-component state.
 * Previously, `useSoundControl` was a hook with local `useState` — each caller
 * got its own state and attached its own MIDI input listener. With 15+ callers
 * (TrackHeaders x11, SoundPicker, Editor, Compose, browsers...) this produced:
 *   - 15+ duplicate MIDI listeners on the same port
 *   - 15+ isolated state copies that didn't share sound changes
 *   - Major reactivity slowdown on every sound/track interaction
 *
 * This store fixes that by keeping state and the listener in module scope.
 */

import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import type { SoundPreset, SeqtrackChannel, TrackSoundState } from "@/lib/midi/types";

interface SoundState {
  /** Per-channel sound state (preset + CC values). */
  trackSounds: Partial<Record<SeqtrackChannel, TrackSoundState>>;
}

interface SoundActions {
  setTrackPreset: (channel: SeqtrackChannel, preset: SoundPreset) => void;
  setTrackCc: (channel: SeqtrackChannel, cc: number, value: number) => void;
  clearAll: () => void;
}

type SoundStore = SoundState & SoundActions;

/**
 * The Zustand store itself. Single instance at module load time.
 * Do NOT use `useSoundStore` for full subscriptions — prefer the narrow
 * selector hooks below (`useTrackSound`, `useTrackCcValues`) to avoid
 * cascade re-renders when any track's state changes.
 */
export const useSoundStore = create<SoundStore>((set) => ({
  trackSounds: {},

  setTrackPreset: (channel, preset) =>
    set((state) => ({
      trackSounds: {
        ...state.trackSounds,
        [channel]: {
          preset,
          ccValues: state.trackSounds[channel]?.ccValues ?? {},
        },
      },
    })),

  setTrackCc: (channel, cc, value) =>
    set((state) => ({
      trackSounds: {
        ...state.trackSounds,
        [channel]: {
          preset: state.trackSounds[channel]?.preset ?? null,
          ccValues: { ...(state.trackSounds[channel]?.ccValues ?? {}), [cc]: value },
        },
      },
    })),

  clearAll: () => set({ trackSounds: {} }),
}));

// ─── Narrow selector hooks ──────────────────────────────────────

/**
 * Subscribe to just ONE track's sound state. Re-renders only when
 * that channel's preset or CC values change — NOT when other channels
 * update. This is the hook TrackHeader and MelodicTrackRow should use.
 */
export function useTrackSound(channel: SeqtrackChannel): TrackSoundState {
  return useSoundStore((s) => s.trackSounds[channel] ?? EMPTY_TRACK_SOUND);
}

const EMPTY_TRACK_SOUND: TrackSoundState = { preset: null, ccValues: {} };

/** Stable action reference — no re-render triggered by this hook. */
export function useSetTrackPreset() {
  return useSoundStore((s) => s.setTrackPreset);
}

/** Stable action reference — no re-render triggered by this hook. */
export function useSetTrackCc() {
  return useSoundStore((s) => s.setTrackCc);
}

/** Full subscription (compat helper) — prefer useTrackSound(channel) where possible. */
export function useAllTrackSounds() {
  return useSoundStore(useShallow((s) => s.trackSounds));
}
