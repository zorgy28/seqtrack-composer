import type { Note } from "@/lib/midi/types";
import type { RawMidiEvent } from "./types";
import { STEPS_PER_BAR, MAX_BARS } from "@/lib/midi/constants";
import { createNote } from "@/lib/midi/pattern-generators";

// ---- Public API -----------------------------------------------------

/**
 * Detect how many bars the events span at the given BPM.
 * Returns a value clamped to 1-8.
 */
export function detectBars(events: RawMidiEvent[], bpm: number): number {
  if (events.length === 0) return 1;

  const maxTime = Math.max(...events.map((e) => e.end));
  const secondsPerBar = (60 / bpm) * 4; // 4 beats per bar
  const rawBars = Math.ceil(maxTime / secondsPerBar);

  return Math.max(1, Math.min(rawBars, MAX_BARS));
}

/**
 * Quantize raw MIDI events to a 16-step-per-bar grid.
 *
 * Algorithm:
 * 1. Convert time (seconds) to step: step = round(time * (bpm / 60) * 4)
 * 2. Clamp: step = step % (maxBars * STEPS_PER_BAR)
 * 3. Merge same-step + same-pitch events (keep highest velocity)
 * 4. Normalize velocities to 1-127
 * 5. Compute duration: max(1, round((end - start) * (bpm / 60) * 4))
 * 6. Assign probability: 100 for strong hits (vel > 60), scaled down for softer ones
 */
export function quantizeEvents(
  events: RawMidiEvent[],
  bpm: number,
  maxBars: number,
): Note[] {
  if (events.length === 0) return [];

  const totalSteps = maxBars * STEPS_PER_BAR;
  const stepsPerSecond = (bpm / 60) * 4; // 16th notes per second
  const maxTimeSeconds = totalSteps / stepsPerSecond; // only import notes within this window

  // ---- Step 1 & 2: time → step, filtered to requested bars ----------

  interface Quantized {
    pitch: number;
    step: number;
    velocity: number;
    duration: number;
    confidence: number;
  }

  const quantized: Quantized[] = [];
  for (const e of events) {
    // Only import notes that start within the requested bar range
    // (don't wrap a 5-minute song into 8 bars — that fills every step)
    if (e.start >= maxTimeSeconds) continue;

    const rawStep = Math.round(e.start * stepsPerSecond);
    const step = Math.min(rawStep, totalSteps - 1);
    const duration = Math.max(1, Math.round((e.end - e.start) * stepsPerSecond));
    quantized.push({
      pitch: e.pitch,
      step,
      velocity: e.velocity,
      duration,
      confidence: e.confidence ?? 1,
    });
  }

  // ---- Step 3: merge same-step + same-pitch (keep highest vel) -----

  const merged = new Map<string, Quantized>();

  for (const q of quantized) {
    const key = `${q.step}:${q.pitch}`;
    const existing = merged.get(key);
    if (!existing || q.velocity > existing.velocity) {
      merged.set(key, q);
    }
  }

  const deduped = Array.from(merged.values());

  // ---- Step 4: velocity normalization (scale to 1-127) --------------

  const maxVel = Math.max(...deduped.map((q) => q.velocity));
  const minVel = Math.min(...deduped.map((q) => q.velocity));
  const velRange = maxVel - minVel;

  const normalized = deduped.map((q) => {
    let vel: number;
    if (velRange === 0) {
      vel = Math.min(127, Math.max(1, q.velocity));
    } else {
      // Scale to 1-127 range
      vel = Math.round(((q.velocity - minVel) / velRange) * 126) + 1;
    }
    return { ...q, velocity: vel };
  });

  // ---- Steps 5 & 6: create Note objects -----------------------------

  return normalized.map((q) =>
    createNote({
      pitch: q.pitch,
      step: q.step,
      velocity: q.velocity,
      duration: Math.min(q.duration, totalSteps - q.step), // don't exceed pattern length
      probability: q.velocity > 60 ? 100 : Math.max(10, Math.round((q.velocity / 60) * 100)),
    }),
  );
}
