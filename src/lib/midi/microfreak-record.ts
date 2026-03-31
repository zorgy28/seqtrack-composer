/**
 * Record a composed pattern into the MicroFreak's internal sequencer.
 *
 * The MicroFreak records incoming MIDI notes when its sequencer is in
 * Record + Play mode. This module orchestrates:
 * 1. MIDI Clock for tempo sync
 * 2. MIDI Start to trigger the sequencer
 * 3. Playing the pattern notes at the correct timing
 * 4. MIDI Stop when done
 *
 * The user must manually arm Record on the MicroFreak hardware before
 * starting this session — there is no MIDI command for Record mode.
 */

import type { Pattern } from "./types";
import { STEPS_PER_BAR } from "./constants";
import { stepDurationMs } from "./note-utils";
import { getOutputPort } from "@/lib/webmidi/midi-connection";
import {
  startMidiClock,
  sendMidiStart,
  sendMidiStop,
  sendAllNotesOff,
} from "@/lib/webmidi/midi-sender";

// ─── Types ──────────────────────────────────────────────────────

export interface RecordSession {
  cancel: () => void;
}

export type RecordState = "idle" | "waiting" | "recording" | "done" | "cancelled";

// ─── Main Function ──────────────────────────────────────────────

/**
 * Record a pattern into the MicroFreak's internal sequencer via MIDI.
 *
 * @param deviceId   MIDI output device ID
 * @param pattern    The pattern to record (notes, bars)
 * @param bpm        Tempo in BPM
 * @param channel    MIDI channel (1 for MicroFreak)
 * @param onStep     Called each step with (currentStep, totalSteps)
 * @param onComplete Called when recording finishes successfully
 * @returns RecordSession with cancel method
 */
export function recordPatternToDevice(
  deviceId: string,
  pattern: Pattern,
  bpm: number,
  channel: number,
  onStep: (step: number, totalSteps: number) => void,
  onComplete: () => void,
): RecordSession {
  const output = getOutputPort(deviceId);
  if (!output) {
    onComplete();
    return { cancel: () => {} };
  }

  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopClock: (() => void) | null = null;

  const sMs = stepDurationMs(bpm);
  const totalSteps = pattern.bars * STEPS_PER_BAR;
  const totalDurationMs = totalSteps * sMs;

  // 1. Start MIDI Clock for tempo sync
  stopClock = startMidiClock(deviceId, bpm);

  // 2. Send MIDI Start — triggers the MicroFreak sequencer
  sendMidiStart(deviceId);

  // 3. Wait a brief moment (1 beat = 4 steps) for sequencer to arm,
  //    then schedule all pattern notes
  const armDelayMs = 4 * sMs; // 1 beat

  const armTimeout = setTimeout(() => {
    if (cancelled) return;

    // Schedule step progress callbacks
    for (let step = 0; step < totalSteps; step++) {
      const t = setTimeout(() => {
        if (!cancelled) onStep(step, totalSteps);
      }, step * sMs);
      timeouts.push(t);
    }

    // Schedule all notes
    for (const note of pattern.notes) {
      if (note.step >= totalSteps) continue;

      const startMs = note.step * sMs;
      const durMs = Math.max(note.duration * sMs, sMs * 0.8); // min 80% of step

      const t = setTimeout(() => {
        if (cancelled) return;
        output.playNote(note.pitch, {
          channels: channel,
          attack: Math.max(0.01, Math.min(1, note.velocity / 127)),
          release: 0.5,
          duration: durMs,
        });
      }, startMs);
      timeouts.push(t);
    }

    // 4. Schedule completion: stop clock + transport after pattern ends
    const endTimeout = setTimeout(() => {
      if (cancelled) return;
      sendAllNotesOff(deviceId, [channel]);
      sendMidiStop(deviceId);
      if (stopClock) stopClock();
      onStep(totalSteps, totalSteps);
      onComplete();
    }, totalDurationMs + sMs); // +1 step buffer
    timeouts.push(endTimeout);
  }, armDelayMs);
  timeouts.push(armTimeout);

  return {
    cancel: () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      sendAllNotesOff(deviceId, [channel]);
      sendMidiStop(deviceId);
      if (stopClock) stopClock();
    },
  };
}
