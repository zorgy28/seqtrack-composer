"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { MidiConnectionState, MidiDevice, SeqtrackChannel, ChannelTestResult } from "@/lib/midi/types";

interface MidiConnectionContextValue {
  status: MidiConnectionState["status"];
  device: MidiConnectionState["device"];
  outputs: MidiConnectionState["outputs"];
  inputs: MidiConnectionState["inputs"];
  error: MidiConnectionState["error"];
  testResults: ChannelTestResult[];
  isTesting: boolean;
  selectDevice: (device: MidiDevice) => void;
  disconnect: () => void;
  runTest: () => Promise<void>;
  testChannel: (channel: SeqtrackChannel) => Promise<void>;
  sendNoteToDevice: (channel: SeqtrackChannel, pitch: number, velocity: number, durationMs: number) => Promise<void>;
}

const MidiConnectionContext = createContext<MidiConnectionContextValue | null>(null);

export function MidiConnectionProvider({ children }: { children: ReactNode }) {
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
  const deviceIdRef = useRef<string | null>(null);

  // Initialize MIDI on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      const { initMidi, onDeviceChange } = await import("@/lib/webmidi/midi-connection");
      const result = await initMidi();
      deviceIdRef.current = result.device?.id ?? null;
      setState(result);

      // Listen for device changes
      const cleanup = onDeviceChange(({ outputs, inputs }) => {
        setState((prev) => {
          const seqtrack = outputs.find((o) => o.isSeqtrack) ?? null;
          const newDevice = seqtrack ?? prev.device;
          deviceIdRef.current = newDevice?.id ?? null;
          return {
            ...prev,
            outputs,
            inputs,
            device: newDevice,
            status: seqtrack ? "connected" : prev.device ? "disconnected" : prev.status,
          };
        });
      });

      return cleanup;
    }

    let cleanup: (() => void) | undefined;
    init().then((c) => { cleanup = c; });

    // In Electron: send All Notes Off before quit to prevent stuck notes on SEQTRAK
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onBeforeQuit) {
      electronAPI.onBeforeQuit(() => {
        const id = deviceIdRef.current;
        if (!id) return;
        import("@/lib/webmidi/midi-sender").then(({ sendAllNotesOff }) => {
          sendAllNotesOff(id);
        });
      });
    }

    return () => { cleanup?.(); };
  }, []);

  const selectDevice = useCallback((device: MidiDevice) => {
    deviceIdRef.current = device.id;
    setState((prev) => ({
      ...prev,
      device,
      status: "connected",
    }));
  }, []);

  const disconnect = useCallback(() => {
    deviceIdRef.current = null;
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

  return (
    <MidiConnectionContext.Provider
      value={{
        ...state,
        testResults,
        isTesting,
        selectDevice,
        disconnect,
        runTest,
        testChannel,
        sendNoteToDevice,
      }}
    >
      {children}
    </MidiConnectionContext.Provider>
  );
}

export function useMidiConnection(): MidiConnectionContextValue {
  const ctx = useContext(MidiConnectionContext);
  if (!ctx) {
    throw new Error("useMidiConnection must be used within a MidiConnectionProvider");
  }
  return ctx;
}
