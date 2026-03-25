/**
 * Mapping Engine — converts filtered gesture values into MIDI CC values.
 *
 * Pure functions only — no React, no DOM, no browser APIs.
 */

import { OneEuroFilter } from "./one-euro-filter";
import type {
  CCOutput,
  FaceAxes,
  GestureAxis,
  GestureMapping,
  TrackingFrame,
  HandState,
} from "./types";
import { FACE_AXIS_KEYS } from "./types";

// ─── Core Mapping ──────────────────────────────────────────────

/**
 * Map a gesture value through a GestureMapping to a MIDI CC value.
 *
 * 1. Clamp gestureValue to mapping.inputRange
 * 2. Normalize to 0-1 within input range
 * 3. If mapping.invert, flip: normalized = 1 - normalized
 * 4. Scale to mapping.outputRange
 * 5. Round to integer and clamp to 0-127 (& 0x7F)
 */
export function mapGestureToCC(
  gestureValue: number,
  mapping: GestureMapping
): number {
  const [inMin, inMax] = mapping.inputRange;
  const [outMin, outMax] = mapping.outputRange;

  // Clamp to input range
  const clamped = Math.max(inMin, Math.min(inMax, gestureValue));

  // Normalize to 0-1
  const range = inMax - inMin;
  let normalized = range === 0 ? 0 : (clamped - inMin) / range;

  // Invert if requested
  if (mapping.invert) {
    normalized = 1 - normalized;
  }

  // Scale to output range
  const scaled = outMin + normalized * (outMax - outMin);

  // Round and clamp to valid MIDI CC range (0-127)
  return Math.round(Math.max(0, Math.min(127, scaled))) & 0x7f;
}

// ─── Dead Zone ─────────────────────────────────────────────────

/**
 * Suppress small changes that would cause MIDI CC jitter.
 *
 * @returns `null` if the change is within the dead zone, otherwise `newValue`.
 */
export function applyDeadZone(
  newValue: number,
  lastSentValue: number,
  deadZone: number
): number | null {
  if (Math.abs(newValue - lastSentValue) < deadZone) {
    return null;
  }
  return newValue;
}

// ─── Frame Processing ──────────────────────────────────────────

/**
 * Check whether a gesture axis belongs to the face (blendshape) axes
 * rather than the hand gesture axes.
 */
function isFaceAxis(axis: GestureAxis): boolean {
  return (FACE_AXIS_KEYS as readonly string[]).includes(axis);
}

/**
 * Find the matching hand for a mapping's handedness preference.
 *
 * - "Left" / "Right": exact match
 * - "any": first available hand
 */
function findHand(
  hands: HandState[],
  preference: GestureMapping["hand"]
): HandState | undefined {
  if (preference === "any") {
    return hands.find((h) => h.isTracked);
  }
  return hands.find((h) => h.handedness === preference && h.isTracked);
}

/**
 * Process a single tracking frame through all enabled mappings.
 *
 * For each enabled mapping:
 *   1. Find the correct hand from frame (by handedness, or first hand for "any")
 *   2. Read the gesture axis value from the hand's axes
 *   3. Run through the OneEuroFilter for this mapping (by mapping.id)
 *   4. Map filtered value to CC via mapGestureToCC
 *   5. Apply dead zone vs last sent value
 *   6. Return CCOutput with changed flag
 *
 * @param frame          Current tracking frame with hand data
 * @param mappings       All configured gesture-to-CC mappings
 * @param filters        Map of OneEuroFilter instances keyed by mapping.id
 * @param lastSentValues Map of last-sent CC values keyed by mapping.id
 * @param deadZone       Minimum CC change to emit (in CC units)
 * @returns              Array of CCOutput results, one per enabled mapping with a matched hand
 */
export function processFrame(
  frame: TrackingFrame,
  mappings: GestureMapping[],
  filters: Map<string, OneEuroFilter>,
  lastSentValues: Map<string, number>,
  deadZone: number
): CCOutput[] {
  const outputs: CCOutput[] = [];
  const timestampSec = frame.timestamp / 1000; // Convert ms to seconds for 1€ filter

  for (const mapping of mappings) {
    if (!mapping.enabled) continue;

    // Read raw gesture axis value — face axes come from face data, hand axes from hand data
    let rawValue: number;
    if (isFaceAxis(mapping.axis) && frame.face) {
      rawValue = frame.face[mapping.axis as keyof FaceAxes];
    } else {
      // Find the correct hand
      const hand = findHand(frame.hands, mapping.hand);
      if (!hand) continue;
      rawValue = hand.axes[mapping.axis as keyof typeof hand.axes];
    }

    // Get or create filter for this mapping
    let filter = filters.get(mapping.id);
    if (!filter) {
      filter = new OneEuroFilter();
      filters.set(mapping.id, filter);
    }

    // Apply 1€ filter for smoothing
    const filteredValue = filter.filter(rawValue, timestampSec);

    // Map to CC value
    const ccValue = mapGestureToCC(filteredValue, mapping);

    // Check dead zone against last sent value
    const lastSent = lastSentValues.get(mapping.id) ?? -1;
    const afterDeadZone = applyDeadZone(ccValue, lastSent, deadZone);
    const changed = afterDeadZone !== null;

    // Update last sent value if changed
    if (changed) {
      lastSentValues.set(mapping.id, ccValue);
    }

    outputs.push({
      mapping,
      rawValue,
      filteredValue,
      ccValue,
      changed,
    });
  }

  return outputs;
}
