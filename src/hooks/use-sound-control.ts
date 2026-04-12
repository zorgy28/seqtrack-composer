"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SoundPreset, SeqtrackChannel, TrackSoundState } from "@/lib/midi/types";
import { useMidiConnection } from "./use-midi-connection";
import { useDeviceProfile } from "@/providers/device-provider";
import { listenForSoundChanges } from "@/lib/webmidi/midi-input-listener";
import { findPresetByBankPC } from "@/lib/midi/sound-library";

export function useSoundControl() {
  const { device } = useMidiConnection();
  const { profile } = useDeviceProfile();
  const [trackSounds, setTrackSounds] = useState<
    Partial<Record<SeqtrackChannel, TrackSoundState>>
  >({});

  // Track recently sent sound changes to prevent feedback loops
  const recentlySentRef = useRef<Map<number, { msb: number; lsb: number; pc: number; time: number }>>(new Map());

  const selectPreset = useCallback(
    async (channel: SeqtrackChannel, preset: SoundPreset) => {
      if (!device) return;

      const { selectSound } = await import("@/lib/midi/program-change");
      selectSound(device.id, channel, preset, profile);

      // Record what we just sent to suppress incoming echo, then auto-cleanup
      recentlySentRef.current.set(channel, {
        msb: preset.bankMSB,
        lsb: preset.bankLSB,
        pc: preset.programNumber,
        time: Date.now(),
      });
      setTimeout(() => recentlySentRef.current.delete(channel), 500);

      setTrackSounds((prev) => ({
        ...prev,
        [channel]: {
          preset,
          ccValues: prev[channel]?.ccValues ?? {},
        },
      }));
    },
    [device, profile],
  );

  const setCC = useCallback(
    async (channel: SeqtrackChannel, cc: number, value: number) => {
      if (!device) return;

      const { sendCC } = await import("@/lib/webmidi/midi-sender");
      sendCC(device.id, channel, cc, value);

      setTrackSounds((prev) => ({
        ...prev,
        [channel]: {
          preset: prev[channel]?.preset ?? null,
          ccValues: { ...(prev[channel]?.ccValues ?? {}), [cc]: value },
        },
      }));
    },
    [device],
  );

  const sendSysExMessage = useCallback(
    async (data: number[]) => {
      if (!device) return;
      const { sendSysEx } = await import("@/lib/webmidi/midi-sender");
      sendSysEx(device.id, data);
    },
    [device],
  );

  const getTrackSound = useCallback(
    (channel: SeqtrackChannel): TrackSoundState => {
      return trackSounds[channel] ?? { preset: null, ccValues: {} };
    },
    [trackSounds],
  );

  // Listen for incoming sound changes from the SEQTRAK
  useEffect(() => {
    if (!device) return;

    const cleanup = listenForSoundChanges(device.id, (channel, msb, lsb, pc) => {
      // Check if this is an echo of something we just sent
      const sent = recentlySentRef.current.get(channel);
      if (sent && sent.msb === msb && sent.lsb === lsb && sent.pc === pc && Date.now() - sent.time < 200) {
        console.log(`[sync] Echo suppressed ch${channel} (MSB=${msb} LSB=${lsb} PC=${pc})`);
        return;
      }

      // Look up the preset from our library
      const preset = findPresetByBankPC(msb, lsb, pc);
      if (preset) {
        setTrackSounds((prev) => ({
          ...prev,
          [channel]: {
            preset,
            ccValues: prev[channel]?.ccValues ?? {},
          },
        }));
        console.log(`[sync] Device changed ch${channel} to: ${preset.name} (MSB=${msb} LSB=${lsb} PC=${pc})`);
      } else {
        // Unknown preset — show raw bank/PC so user knows something changed
        console.warn(`[sync] Unknown preset on ch${channel}: MSB=${msb} LSB=${lsb} PC=${pc}`);
        setTrackSounds((prev) => ({
          ...prev,
          [channel]: {
            preset: { id: -1, name: `Bank ${msb}-${lsb} PC ${pc}`, category: "SFX", engine: "drum", bankMSB: msb, bankLSB: lsb, programNumber: pc },
            ccValues: prev[channel]?.ccValues ?? {},
          },
        }));
      }
    });

    return cleanup;
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
