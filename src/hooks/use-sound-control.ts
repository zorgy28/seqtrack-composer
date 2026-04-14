"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SoundPreset, SeqtrackChannel, TrackSoundState } from "@/lib/midi/types";
import { useMidiConnection } from "./use-midi-connection";
import { useDeviceProfile } from "@/providers/device-provider";
import { listenForSoundChanges } from "@/lib/webmidi/midi-input-listener";
import { findPresetByBankPC } from "@/lib/midi/sound-library";
import { useSoundStore, useAllTrackSounds } from "@/stores/sound-store";

// ── Module-level state (shared across all hook instances) ─────────
// Echo suppression: map of channel → recently-sent preset values.
// Must be module-level so all callers share the same echo history.
const recentlySent = new Map<number, { msb: number; lsb: number; pc: number; time: number }>();

// MIDI input listener singleton: ensures we attach only ONE listener per
// device, even though many components call useSoundControl().
let listenerCleanup: (() => void) | null = null;
let listenerDeviceId: string | null = null;
let listenerRefCount = 0;

function attachListenerOnce(deviceId: string) {
  if (listenerDeviceId === deviceId && listenerCleanup) {
    listenerRefCount += 1;
    return;
  }
  // Device changed — release previous listener before attaching new one
  if (listenerCleanup) {
    try { listenerCleanup(); } catch { /* ignore */ }
    listenerCleanup = null;
  }

  const cleanup = listenForSoundChanges(deviceId, (channel, msb, lsb, pc) => {
    // Echo suppression
    const sent = recentlySent.get(channel);
    if (sent && sent.msb === msb && sent.lsb === lsb && sent.pc === pc && Date.now() - sent.time < 200) {
      console.log(`[sync] Echo suppressed ch${channel} (MSB=${msb} LSB=${lsb} PC=${pc})`);
      return;
    }

    const store = useSoundStore.getState();
    const preset = findPresetByBankPC(msb, lsb, pc);
    if (preset) {
      store.setTrackPreset(channel, preset);
      console.log(`[sync] Device changed ch${channel} to: ${preset.name} (MSB=${msb} LSB=${lsb} PC=${pc})`);
    } else {
      console.warn(`[sync] Unknown preset on ch${channel}: MSB=${msb} LSB=${lsb} PC=${pc}`);
      store.setTrackPreset(channel, {
        id: -1,
        name: `Bank ${msb}-${lsb} PC ${pc}`,
        category: "SFX",
        engine: "drum",
        bankMSB: msb,
        bankLSB: lsb,
        programNumber: pc,
      });
    }
  });

  listenerCleanup = cleanup;
  listenerDeviceId = deviceId;
  listenerRefCount = 1;
}

function releaseListener() {
  listenerRefCount = Math.max(0, listenerRefCount - 1);
  if (listenerRefCount === 0 && listenerCleanup) {
    try { listenerCleanup(); } catch { /* ignore */ }
    listenerCleanup = null;
    listenerDeviceId = null;
  }
}

// ── Public hook ───────────────────────────────────────────────────

/**
 * Sound control hook. Public API is unchanged — callers still get
 * { trackSounds, selectPreset, setCC, sendSysExMessage, getTrackSound, isConnected }.
 *
 * Under the hood, state lives in a shared Zustand store and the MIDI input
 * listener is attached exactly once across all hook instances (via refcount).
 *
 * For narrower subscriptions use `useTrackSound(channel)` from
 * `@/stores/sound-store` directly — it only re-renders when that
 * specific channel's sound changes.
 */
export function useSoundControl() {
  const { device } = useMidiConnection();
  const { profile } = useDeviceProfile();
  const trackSounds = useAllTrackSounds();

  const deviceIdRef = useRef<string | null>(null);
  deviceIdRef.current = device?.id ?? null;

  const selectPreset = useCallback(
    async (channel: SeqtrackChannel, preset: SoundPreset) => {
      if (!deviceIdRef.current) return;

      const { selectSound } = await import("@/lib/midi/program-change");
      selectSound(deviceIdRef.current, channel, preset, profile);

      // Record echo suppression entry + schedule cleanup
      recentlySent.set(channel, {
        msb: preset.bankMSB,
        lsb: preset.bankLSB,
        pc: preset.programNumber,
        time: Date.now(),
      });
      setTimeout(() => recentlySent.delete(channel), 500);

      useSoundStore.getState().setTrackPreset(channel, preset);
    },
    [profile],
  );

  const setCC = useCallback(
    async (channel: SeqtrackChannel, cc: number, value: number) => {
      if (!deviceIdRef.current) return;
      const { sendCC } = await import("@/lib/webmidi/midi-sender");
      sendCC(deviceIdRef.current, channel, cc, value);
      useSoundStore.getState().setTrackCc(channel, cc, value);
    },
    [],
  );

  const sendSysExMessage = useCallback(
    async (data: number[]) => {
      if (!deviceIdRef.current) return;
      const { sendSysEx } = await import("@/lib/webmidi/midi-sender");
      sendSysEx(deviceIdRef.current, data);
    },
    [],
  );

  const getTrackSound = useCallback(
    (channel: SeqtrackChannel): TrackSoundState => {
      return useSoundStore.getState().trackSounds[channel] ?? EMPTY_SOUND;
    },
    [],
  );

  // Attach the listener once per mounted hook, release on unmount.
  // The refcount ensures only ONE actual MIDI listener exists at a time.
  useEffect(() => {
    if (!device) return;
    attachListenerOnce(device.id);
    return () => releaseListener();
  }, [device]);

  return {
    trackSounds,
    selectPreset,
    setCC,
    sendSysExMessage,
    getTrackSound,
    isConnected: !!device,
  };
}

const EMPTY_SOUND: TrackSoundState = { preset: null, ccValues: {} };
