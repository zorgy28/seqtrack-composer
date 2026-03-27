/**
 * Gesture Extractor — pure functions that convert 21 MediaPipe hand
 * landmarks into continuous GestureAxes for MIDI CC mapping.
 *
 * Pure functions only — no React, no DOM, no side effects.
 */

import type { NormalizedLandmark, HandLandmarks, GestureAxes } from "./types";
import { clamp } from "@/lib/midi/note-utils";

// ─── Landmark Constants ──────────────────────────────────────
// Named indices for all 21 MediaPipe hand landmarks.

export const WRIST = 0;

export const THUMB_CMC = 1;
export const THUMB_MCP = 2;
export const THUMB_IP = 3;
export const THUMB_TIP = 4;

export const INDEX_MCP = 5;
export const INDEX_PIP = 6;
export const INDEX_DIP = 7;
export const INDEX_TIP = 8;

export const MIDDLE_MCP = 9;
export const MIDDLE_PIP = 10;
export const MIDDLE_DIP = 11;
export const MIDDLE_TIP = 12;

export const RING_MCP = 13;
export const RING_PIP = 14;
export const RING_DIP = 15;
export const RING_TIP = 16;

export const PINKY_MCP = 17;
export const PINKY_PIP = 18;
export const PINKY_DIP = 19;
export const PINKY_TIP = 20;

// Finger base (MCP) and tip indices, ordered by finger
const FINGER_MCP = [THUMB_MCP, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP] as const;
const FINGER_TIP = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP] as const;

// ─── Core Functions ──────────────────────────────────────────

/**
 * Euclidean distance between two NormalizedLandmark points (3D).
 */
export function landmarkDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute the palm center as the average of the wrist and the four
 * finger MCP joints (index, middle, ring, pinky).
 */
export function palmCenter(landmarks: HandLandmarks): NormalizedLandmark {
  const indices = [WRIST, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP];
  let x = 0;
  let y = 0;
  let z = 0;

  for (const i of indices) {
    x += landmarks[i].x;
    y += landmarks[i].y;
    z += landmarks[i].z;
  }

  const n = indices.length;
  return { x: x / n, y: y / n, z: z / n };
}

/**
 * Compute how curled a finger is.
 *
 * @param landmarks   21 hand landmarks
 * @param fingerIndex 0=thumb, 1=index, 2=middle, 3=ring, 4=pinky
 * @returns 0 (fully curled) to 1 (fully extended)
 *
 * Method: compare the distance from fingertip to wrist against
 * the distance from the finger's MCP joint to the wrist. When the
 * finger is extended, tip-to-wrist >= MCP-to-wrist; when curled,
 * tip-to-wrist is much smaller.
 */
export function fingerCurl(landmarks: HandLandmarks, fingerIndex: number): number {
  const wrist = landmarks[WRIST];
  const mcp = landmarks[FINGER_MCP[fingerIndex]];
  const tip = landmarks[FINGER_TIP[fingerIndex]];

  const tipDist = landmarkDistance(tip, wrist);
  const mcpDist = landmarkDistance(mcp, wrist);

  // Avoid division by zero
  if (mcpDist < 1e-6) return 0;

  // Ratio can exceed 1 when fully extended; clamp to [0, 1]
  return clamp(tipDist / mcpDist, 0, 1);
}

/**
 * Calculate hand roll angle from the line between index MCP and pinky MCP.
 *
 * @returns Value mapped to -1 (full clockwise tilt) to 1 (full counter-clockwise).
 */
export function calculateHandRoll(landmarks: HandLandmarks): number {
  const indexMcp = landmarks[INDEX_MCP];
  const pinkyMcp = landmarks[PINKY_MCP];

  // Vector from pinky MCP to index MCP
  const dx = indexMcp.x - pinkyMcp.x;
  const dy = indexMcp.y - pinkyMcp.y;

  // atan2 gives the angle relative to the positive X axis
  const angle = Math.atan2(dy, dx);

  // Map the angle to -1..1.
  // At 0 radians the hand is flat horizontal; +/-PI is fully inverted.
  // Dividing by PI/2 maps the useful range (~-90 to +90 degrees) to -1..1.
  return clamp(angle / (Math.PI / 2), -1, 1);
}

// ─── Main Extraction ─────────────────────────────────────────

/**
 * Extract all continuous gesture axes from 21 hand landmarks.
 */
export function extractGestureAxes(landmarks: HandLandmarks): GestureAxes {
  const center = palmCenter(landmarks);

  // ── Palm position ───────────────────────────────────────────
  const palmX = 1 - center.x; // Mirror: moving hand right → higher value
  const palmY = 1 - center.y; // Invert: moving hand up → higher value
  const palmZ = clamp(1 - (center.z + 0.5), 0, 1); // Normalize depth, closer = higher

  // ── Palm reference size (for normalizing distances) ─────────
  const palmSize = landmarkDistance(landmarks[WRIST], landmarks[MIDDLE_MCP]);
  const safePalmSize = Math.max(palmSize, 1e-6);

  // ── Pinch distances ─────────────────────────────────────────
  const thumbIndexDist = landmarkDistance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
  const pinchThumbIndex = clamp(thumbIndexDist / safePalmSize, 0, 1);

  const thumbMiddleDist = landmarkDistance(landmarks[THUMB_TIP], landmarks[MIDDLE_TIP]);
  const pinchThumbMiddle = clamp(thumbMiddleDist / safePalmSize, 0, 1);

  // ── Hand openness (average finger curl) ─────────────────────
  let curlSum = 0;
  for (let i = 0; i < 5; i++) {
    curlSum += fingerCurl(landmarks, i);
  }
  const openness = curlSum / 5;

  // ── Hand roll ───────────────────────────────────────────────
  const roll = calculateHandRoll(landmarks);

  // ── Finger spread ───────────────────────────────────────────
  // Sum of distances between adjacent fingertips, normalized by palm size.
  let spreadSum = 0;
  for (let i = 0; i < FINGER_TIP.length - 1; i++) {
    spreadSum += landmarkDistance(landmarks[FINGER_TIP[i]], landmarks[FINGER_TIP[i + 1]]);
  }
  // Normalize: 4 inter-finger gaps, each roughly palm-sized when maximally spread
  const spread = clamp(spreadSum / (safePalmSize * 4), 0, 1);

  return {
    palmX,
    palmY,
    palmZ,
    pinchThumbIndex,
    pinchThumbMiddle,
    openness,
    roll,
    spread,
  };
}

// ─── Gesture Queries ─────────────────────────────────────────

/**
 * Check whether the hand is open (all fingers extended).
 *
 * @param axes      Extracted gesture axes
 * @param threshold Openness threshold (default 0.7)
 */
export function isHandOpen(axes: GestureAxes, threshold = 0.7): boolean {
  return axes.openness >= threshold;
}
