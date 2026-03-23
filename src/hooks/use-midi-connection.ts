"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MidiConnectionState, MidiDevice, SeqtrackChannel, ChannelTestResult } from "@/lib/midi/types";

export function useMidiConnection() {
  const [state, setState] = useState<MidiConnectionState>({
    status: "disconnected",
    device: null,
    outputs: [],
    inputs: [],
    error: null,
  });
  const [testResults, setTestResults] = useState<ChannelTestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const initRef = useRef(false);

  // Initialize MIDI on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      const { initMidi, onDeviceChange } = await import("@/lib/webmidi/midi-connection");
      const result = await initMidi();
      setState(result);

      // Listen for device changes
      const cleanup = onDeviceChange(({ outputs, inputs }) => {
        setState((prev) => {
          const seqtrack = outputs.find((o) => o.isSeqtrack) ?? null;
          return {
            ...prev,
            outputs,
            inputs,
            device: seqtrack ?? prev.device,
            status: seqtrack ? "connected" : prev.device ? "disconnected" : prev.status,
          };
        });
      });

      return cleanup;
    }

    let cleanup: (() => void) | undefined;
    init().then((c) => { cleanup = c; });

    return () => { cleanup?.(); };
  }, []);

  const selectDevice = useCallback((device: MidiDevice) => {
    setState((prev) => ({
      ...prev,
      device,
      status: "connected",
    }));
  }, []);

  const disconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      device: null,
      status: "disconnected",
    }));
  }, []);

  const runTest = useCallback(async () => {
    if (!state.device) return;
    setIsTesting(true);
    setTestResults([]);

    const { runConnectionTest } = await import("@/lib/webmidi/midi-test");
    await runConnectionTest(state.device.id, (result) => {
      setTestResults((prev) => {
        const existing = prev.findIndex((r) => r.channel === result.channel);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = result;
          return updated;
        }
        return [...prev, result];
      });
    });

    setIsTesting(false);
  }, [state.device]);

  const testChannel = useCallback(async (channel: SeqtrackChannel) => {
    if (!state.device) return;
    const { testSingleChannel } = await import("@/lib/webmidi/midi-test");
    const result = testSingleChannel(state.device.id, channel);
    setTestResults((prev) => {
      const existing = prev.findIndex((r) => r.channel === result.channel);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  }, [state.device]);

  const sendNoteToDevice = useCallback(async (
    channel: SeqtrackChannel,
    pitch: number,
    velocity: number,
    durationMs: number,
  ) => {
    if (!state.device) return;
    const { sendNote } = await import("@/lib/webmidi/midi-sender");
    sendNote(state.device.id, channel, pitch, velocity, durationMs);
  }, [state.device]);

  return {
    ...state,
    testResults,
    isTesting,
    selectDevice,
    disconnect,
    runTest,
    testChannel,
    sendNoteToDevice,
  };
}
