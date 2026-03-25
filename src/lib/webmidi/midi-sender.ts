import type { SeqtrackChannel, Pattern } from "@/lib/midi/types";
import { STEPS_PER_BAR } from "@/lib/midi/constants";
import { stepDurationMs } from "@/lib/midi/note-utils";
import { getOutputPort } from "./midi-connection";

/**
 * Send a single note to the connected device.
 */
export function sendNote(
  deviceId: string,
  channel: SeqtrackChannel,
  pitch: number,
  velocity: number,
  durationMs: number,
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;

  // WebMidi.js uses 1-indexed channels
  output.playNote(pitch, {
    channels: channel,
    attack: velocity / 127,
    release: 0.5,
    duration: durationMs,
  });
}

/**
 * Send a CC message to the device.
 */
export function sendCC(
  deviceId: string,
  channel: SeqtrackChannel,
  cc: number,
  value: number,
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;

  output.sendControlChange(cc, value, { channels: channel });
}

/**
 * Send a Program Change message.
 */
export function sendProgramChange(
  deviceId: string,
  channel: SeqtrackChannel,
  program: number,
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;
  output.sendProgramChange(program, { channels: channel });
}

/**
 * Send Bank Select (CC0 + CC32).
 */
export function sendBankSelect(
  deviceId: string,
  channel: SeqtrackChannel,
  msb: number,
  lsb: number,
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;
  output.sendControlChange(0, msb, { channels: channel });
  output.sendControlChange(32, lsb, { channels: channel });
}

/**
 * Send raw SysEx data to the device.
 */
export function sendSysEx(
  deviceId: string,
  data: number[],
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;
  // WebMidi.js sendSysex expects manufacturer ID separately
  // Our data already includes F0...F7, so send as raw
  output.send(data);
}

/**
 * Send all-notes-off on all channels (panic).
 */
export function sendAllNotesOff(deviceId: string): void {
  const output = getOutputPort(deviceId);
  if (!output) return;

  for (let ch = 1; ch <= 11; ch++) {
    output.sendAllNotesOff({ channels: ch });
  }
}

/**
 * Play a pattern in real-time by scheduling all notes ahead of time.
 * Uses performance.now() timestamps for jitter-free playback.
 * Returns a cancel function.
 */
export function playPattern(
  deviceId: string,
  pattern: Pattern,
  channel: SeqtrackChannel,
  bpm: number,
): () => void {
  const output = getOutputPort(deviceId);
  if (!output) return () => {};

  const stepMs = stepDurationMs(bpm);
  const totalSteps = pattern.bars * STEPS_PER_BAR;
  let cancelled = false;

  // Schedule all notes using setTimeout with high-precision timestamps
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  for (const note of pattern.notes) {
    if (note.step >= totalSteps) continue;

    const startMs = note.step * stepMs;
    const durMs = note.duration * stepMs;

    const timeout = setTimeout(() => {
      if (cancelled) return;
      output.playNote(note.pitch, {
        channels: channel,
        attack: note.velocity / 127,
        release: 0.5,
        duration: durMs,
      });
    }, startMs);

    timeouts.push(timeout);
  }

  return () => {
    cancelled = true;
    timeouts.forEach(clearTimeout);
    sendAllNotesOff(deviceId);
  };
}

/**
 * Play a pattern in a continuous loop until cancelled.
 * Returns a cancel function that stops playback.
 */
export function playPatternLooped(
  deviceId: string,
  pattern: Pattern,
  channel: SeqtrackChannel,
  bpm: number,
): () => void {
  const output = getOutputPort(deviceId);
  if (!output) return () => {};

  const sMs = stepDurationMs(bpm);
  const totalMs = pattern.bars * STEPS_PER_BAR * sMs;
  let cancelled = false;
  let currentCancel: (() => void) | null = null;
  const loopTimeouts: ReturnType<typeof setTimeout>[] = [];

  function scheduleLoop() {
    if (cancelled) return;
    currentCancel = playPattern(deviceId, pattern, channel, bpm);
    const t = setTimeout(() => scheduleLoop(), totalMs);
    loopTimeouts.push(t);
  }

  scheduleLoop();

  return () => {
    cancelled = true;
    currentCancel?.();
    loopTimeouts.forEach(clearTimeout);
    sendAllNotesOff(deviceId);
  };
}

// ---------------------------------------------------------------------------
// Timing Worker — keeps MIDI playback precise even in background tabs.
// Chrome throttles main-thread setInterval to 1s min in hidden tabs,
// but Web Workers maintain full-speed timing regardless.
// ---------------------------------------------------------------------------

let sharedWorker: Worker | null = null;

function getTimingWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (!sharedWorker) {
    try {
      sharedWorker = new Worker("/timing-worker.js");
    } catch {
      return null; // fallback to setInterval
    }
  }
  return sharedWorker;
}

/**
 * Play multiple patterns in a continuous loop with step-level cursor callback.
 * Uses a Web Worker for timing so playback continues in background tabs.
 *
 * Accepts a `getState` function that is called every tick to read the LIVE
 * project state. This means mute/unmute and pattern edits take effect
 * immediately without restarting playback.
 */
export interface PlaybackControl {
  cancel: () => void;
  seek: (step: number) => void;
}

export function playPatternLoopedWithCursor(
  deviceId: string,
  tracks: Array<{ pattern: Pattern; channel: SeqtrackChannel }>,
  bpm: number,
  onStep: (step: number) => void,
  getState?: () => {
    tracks: Array<{ pattern: Pattern; channel: SeqtrackChannel; muted: boolean; volume: number }>;
    bpm: number;
  },
): PlaybackControl {
  const output = getOutputPort(deviceId);
  if (!output) return { cancel: () => {}, seek: () => {} };

  const sMs = stepDurationMs(bpm);

  let currentStep = 0;
  let cancelled = false;

  function tick() {
    if (cancelled) return;

    onStep(currentStep);

    // Read live state if getter provided, otherwise use initial tracks
    const liveTracks = getState?.().tracks ?? tracks.map((t) => ({ ...t, muted: false, volume: 127 }));

    // Find the live total steps (pattern length may have changed)
    const liveTotalSteps = Math.max(16, ...liveTracks.map((t) => t.pattern.bars * STEPS_PER_BAR));

    // Play all notes at this step across all non-muted tracks
    for (const { pattern, channel, muted, volume } of liveTracks) {
      if (muted) continue;

      for (const note of pattern.notes) {
        if (note.step === currentStep % liveTotalSteps) {
          // Scale note velocity by track volume (both 0-127)
          const scaledVelocity = (note.velocity / 127) * (volume / 127);
          output.playNote(note.pitch, {
            channels: channel,
            attack: Math.max(0.01, scaledVelocity),
            release: 0.5,
            duration: note.duration * sMs,
          });
        }
      }
    }

    currentStep = (currentStep + 1) % liveTotalSteps;
  }

  // Try worker-based timing (background-tab safe), fall back to setInterval
  const worker = getTimingWorker();
  let fallbackInterval: ReturnType<typeof setInterval> | null = null;

  if (worker) {
    worker.onmessage = () => tick();
    worker.postMessage({ type: "start", intervalMs: sMs });
  } else {
    fallbackInterval = setInterval(tick, sMs);
  }

  // Fire initial step
  onStep(0);

  // Request Wake Lock to prevent OS suspension during playback
  let wakeLock: WakeLockSentinel | null = null;
  if ("wakeLock" in navigator) {
    navigator.wakeLock.request("screen").then(
      (wl) => { if (!cancelled) wakeLock = wl; else wl.release(); },
      () => {},
    );
  }

  return {
    cancel: () => {
      cancelled = true;
      if (worker) {
        worker.postMessage({ type: "stop" });
        worker.onmessage = null;
      }
      if (fallbackInterval !== null) clearInterval(fallbackInterval);
      wakeLock?.release();
      sendAllNotesOff(deviceId);
    },
    seek: (step: number) => {
      currentStep = step;
      sendAllNotesOff(deviceId); // silence current notes before jumping
      onStep(step);
    },
  };
}
