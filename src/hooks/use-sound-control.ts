"use client";

import { useState, useCallback } from "react";
import type { SoundPreset, SeqtrackChannel, TrackSoundState } from "@/lib/midi/types";
import { useMidiConnection } from "./use-midi-connection";

export function useSoundControl() {
  const { device } = useMidiConnection();
  const [trackSounds, setTrackSounds] = useState<
    Partial<Record<SeqtrackChannel, TrackSoundState>>
  >({});

  const selectPreset = useCallback(
    async (channel: SeqtrackChannel, preset: SoundPreset) => {
      if (!device) return;

      const { selectSound } = await import("@/lib/midi/program-change");
      selectSound(device.id, channel, preset);

      setTrackSounds((prev) => ({
        ...prev,
        [channel]: {
          preset,
          ccValues: prev[channel]?.ccValues ?? {},
        },
      }));
    },
    [device],
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

  return {
    trackSounds,
    selectPreset,
    setCC,
    sendSysExMessage,
    getTrackSound,
    isConnected: !!device,
  };
}
