"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AudioMonitorState } from "@/lib/audio/audio-capture";

export interface UseAudioMonitorReturn {
  /** Whether audio capture is active (getUserMedia acquired) */
  isCapturing: boolean;
  /** Whether audio is routed to speakers */
  isMonitoring: boolean;
  /** RMS level 0-1 (updated ~30fps while capturing) */
  level: number;
  /** Available audio input devices */
  devices: MediaDeviceInfo[];
  /** Currently selected device ID */
  selectedDeviceId: string | null;
  /** Error message, if any */
  error: string | null;

  startCapture: (deviceId?: string) => Promise<void>;
  stopCapture: () => void;
  toggleMonitoring: () => void;
  setVolume: (vol: number) => void;
  getAnalyser: () => AnalyserNode | null;
  getStream: () => MediaStream | null;
}

export function useAudioMonitor(): UseAudioMonitorReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<AudioMonitorState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastLevelUpdateRef = useRef(0);
  // Pre-allocate typed array for RMS computation (avoids ~30 GC allocs/sec)
  const levelDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  // Enumerate audio input devices on mount
  useEffect(() => {
    let cancelled = false;

    async function enumerate() {
      try {
        const { listAudioInputDevices, findSeqtrackAudioInput } = await import(
          "@/lib/audio/audio-capture"
        );
        const inputs = await listAudioInputDevices();
        if (cancelled) return;
        setDevices(inputs);

        // Auto-select SEQTRAK if found
        const seqtrack = await findSeqtrackAudioInput();
        if (seqtrack && !cancelled) {
          setSelectedDeviceId(seqtrack.deviceId);
        }
      } catch {
        // Permission not yet granted — devices may have empty labels.
        // This is expected; devices will be re-enumerated after startCapture.
      }
    }

    enumerate();

    // Listen for device changes (USB connect/disconnect)
    const handler = () => { enumerate(); };
    navigator.mediaDevices?.addEventListener("devicechange", handler);

    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener("devicechange", handler);
    };
  }, []);

  // Level meter animation loop — throttled to ~30fps
  const startLevelLoop = useCallback(() => {
    function tick() {
      const now = performance.now();
      // Throttle to ~30fps (33ms interval)
      if (now - lastLevelUpdateRef.current >= 33) {
        lastLevelUpdateRef.current = now;
        const s = stateRef.current;
        if (s) {
          const fftSize = s.analyser.fftSize;
          if (!levelDataRef.current || levelDataRef.current.length !== fftSize) {
            levelDataRef.current = new Float32Array(fftSize);
          }
          const data = levelDataRef.current;
          s.analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
          }
          setLevel(Math.sqrt(sum / data.length));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startCapture = useCallback(
    async (deviceId?: string) => {
      setError(null);

      try {
        const { startAudioCapture, findSeqtrackAudioInput, listAudioInputDevices } =
          await import("@/lib/audio/audio-capture");

        // Priority: explicit arg > current selection > auto-detect SEQTRAK
        let resolvedDeviceId = deviceId ?? selectedDeviceId ?? undefined;
        if (!resolvedDeviceId) {
          const seqtrack = await findSeqtrackAudioInput();
          resolvedDeviceId = seqtrack?.deviceId ?? undefined;
        }

        if (!resolvedDeviceId) {
          setError("No SEQTRAK audio device found. Select a device from the dropdown.");
          return;
        }

        const state = await startAudioCapture(resolvedDeviceId);
        stateRef.current = state;
        setIsCapturing(true);
        setSelectedDeviceId(resolvedDeviceId);

        // Re-enumerate devices after permission granted (labels now available)
        const inputs = await listAudioInputDevices();
        setDevices(inputs);

        startLevelLoop();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start audio capture";
        setError(message);
        setIsCapturing(false);
      }
    },
    [startLevelLoop, selectedDeviceId],
  );

  const stopCapture = useCallback(() => {
    stopLevelLoop();

    const s = stateRef.current;
    if (s) {
      import("@/lib/audio/audio-capture").then(({ stopAudioCapture }) => {
        stopAudioCapture(s);
      });
      stateRef.current = null;
    }

    setIsCapturing(false);
    setIsMonitoring(false);
    setLevel(0);
  }, [stopLevelLoop]);

  const toggleMonitoring = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;

    import("@/lib/audio/audio-capture").then(
      ({ enableMonitoring, disableMonitoring }) => {
        if (s.isMonitoring) {
          disableMonitoring(s);
          setIsMonitoring(false);
        } else {
          enableMonitoring(s);
          setIsMonitoring(true);
        }
      },
    );
  }, []);

  const setVolume = useCallback((vol: number) => {
    const s = stateRef.current;
    if (s) {
      s.gainNode.gain.value = Math.max(0, Math.min(1, vol));
    }
  }, []);

  const getAnalyser = useCallback((): AnalyserNode | null => {
    return stateRef.current?.analyser ?? null;
  }, []);

  const getStream = useCallback((): MediaStream | null => {
    return stateRef.current?.stream ?? null;
  }, []);

  // Resume AudioContext and level loop when tab becomes visible again
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        // Tab hidden: pause visualization RAF (saves CPU)
        stopLevelLoop();
      } else {
        // Tab visible: resume AudioContext if it was suspended
        const s = stateRef.current;
        if (s && s.audioContext.state === "suspended") {
          s.audioContext.resume();
        }
        if (s) startLevelLoop();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [startLevelLoop, stopLevelLoop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopLevelLoop();
      const s = stateRef.current;
      if (s) {
        import("@/lib/audio/audio-capture").then(({ stopAudioCapture }) => {
          stopAudioCapture(s);
        });
        stateRef.current = null;
      }
    };
  }, [stopLevelLoop]);

  return {
    isCapturing,
    isMonitoring,
    level,
    devices,
    selectedDeviceId,
    error,
    startCapture,
    stopCapture,
    toggleMonitoring,
    setVolume,
    getAnalyser,
    getStream,
  };
}
