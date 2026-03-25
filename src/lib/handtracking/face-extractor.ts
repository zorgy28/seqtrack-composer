/**
 * Face Extractor — pure functions that convert MediaPipe blendshapes
 * into curated FaceAxes for MIDI CC mapping.
 *
 * Pure functions only — no React, no DOM, no side effects.
 */

import type { FaceAxes } from "./types";

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Average of two optional values (default 0 if undefined).
 */
export function avg(a?: number, b?: number): number {
  return ((a ?? 0) + (b ?? 0)) / 2;
}

// ─── Main Extraction ─────────────────────────────────────────

/**
 * Extract 12 curated face expression axes from the raw 52 ARKit blendshapes.
 *
 * @param blendshapes Map of blendshape name to score (0-1)
 * @returns FaceAxes with 12 curated expression values
 */
export function extractFaceAxes(blendshapes: Map<string, number>): FaceAxes {
  return {
    jawOpen: blendshapes.get("jawOpen") ?? 0,
    mouthSmile: avg(blendshapes.get("mouthSmileLeft"), blendshapes.get("mouthSmileRight")),
    mouthFrown: avg(blendshapes.get("mouthFrownLeft"), blendshapes.get("mouthFrownRight")),
    mouthPucker: blendshapes.get("mouthPucker") ?? 0,
    mouthFunnel: blendshapes.get("mouthFunnel") ?? 0,
    browInnerUp: blendshapes.get("browInnerUp") ?? 0,
    browDown: avg(blendshapes.get("browDownLeft"), blendshapes.get("browDownRight")),
    eyeWide: avg(blendshapes.get("eyeWideLeft"), blendshapes.get("eyeWideRight")),
    eyeBlink: avg(blendshapes.get("eyeBlinkLeft"), blendshapes.get("eyeBlinkRight")),
    eyeSquint: avg(blendshapes.get("eyeSquintLeft"), blendshapes.get("eyeSquintRight")),
    cheekPuff: blendshapes.get("cheekPuff") ?? 0,
    noseSneer: avg(blendshapes.get("noseSneerLeft"), blendshapes.get("noseSneerRight")),
  };
}
