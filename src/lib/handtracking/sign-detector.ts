/**
 * Sign Detector — detect discrete hand signs from 21 MediaPipe hand landmarks.
 *
 * Pure functions only — no React, no DOM, no side effects.
 */

import type { HandLandmarks, HandSign } from "./types";
import { fingerCurl, landmarkDistance } from "./gesture-extractor";

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Palm size: distance from wrist (landmark 0) to middle MCP (landmark 9).
 * Used to normalize distances so detection is scale-invariant.
 */
function palmSize(landmarks: HandLandmarks): number {
  return landmarkDistance(landmarks[0], landmarks[9]);
}

// ─── Main Detection ──────────────────────────────────────────

/**
 * Detect a discrete hand sign from 21 hand landmarks.
 *
 * Detection priority (most specific first):
 * 1. OK Sign
 * 2. Heart
 * 3. Middle Finger
 * 4. Rock/Horns
 * 5. Peace
 * 6. Thumbs Up
 * 7. Thumbs Down
 * 8. None
 */
export function detectHandSign(landmarks: HandLandmarks): HandSign {
  const palm = palmSize(landmarks);
  const safePalm = Math.max(palm, 1e-6);

  // Finger curl values (0 = fully curled, 1 = fully extended)
  const thumbCurl = fingerCurl(landmarks, 0);
  const indexCurl = fingerCurl(landmarks, 1);
  const middleCurl = fingerCurl(landmarks, 2);
  const ringCurl = fingerCurl(landmarks, 3);
  const pinkyCurl = fingerCurl(landmarks, 4);

  // Thumb-index distance normalized by palm size
  const thumbIndexDist = landmarkDistance(landmarks[4], landmarks[8]) / safePalm;

  // ── 1. OK Sign ──────────────────────────────────────────────
  // Thumb and index touching, other fingers extended
  if (
    thumbIndexDist < 0.05 &&
    middleCurl > 0.6 &&
    ringCurl > 0.6 &&
    pinkyCurl > 0.6
  ) {
    return "ok_sign";
  }

  // ── 2. Heart ────────────────────────────────────────────────
  // Thumb and index touching, other fingers curled
  if (
    thumbIndexDist < 0.05 &&
    middleCurl < 0.45 &&
    ringCurl < 0.45 &&
    pinkyCurl < 0.45
  ) {
    return "heart";
  }

  // ── 3. Middle Finger ────────────────────────────────────────
  // Middle finger extended, all others curled
  if (
    middleCurl > 0.7 &&
    indexCurl < 0.4 &&
    ringCurl < 0.4 &&
    pinkyCurl < 0.4 &&
    thumbCurl < 0.5
  ) {
    return "middle_finger";
  }

  // ── 4. Rock / Horns ─────────────────────────────────────────
  // Index and pinky extended, middle and ring curled
  if (
    indexCurl > 0.7 &&
    pinkyCurl > 0.7 &&
    middleCurl < 0.4 &&
    ringCurl < 0.4
  ) {
    return "rock";
  }

  // ── 5. Peace ────────────────────────────────────────────────
  // Index and middle extended, ring and pinky curled
  if (
    indexCurl > 0.7 &&
    middleCurl > 0.7 &&
    ringCurl < 0.4 &&
    pinkyCurl < 0.4
  ) {
    return "peace";
  }

  // ── 6. Thumbs Up ───────────────────────────────────────────
  // Thumb extended and pointing up, all other fingers curled
  // In image coordinates, lower y = higher position
  if (
    thumbCurl > 0.6 &&
    landmarks[4].y < landmarks[1].y &&
    indexCurl < 0.4 &&
    middleCurl < 0.4 &&
    ringCurl < 0.4 &&
    pinkyCurl < 0.4
  ) {
    return "thumbs_up";
  }

  // ── 7. Thumbs Down ─────────────────────────────────────────
  // Thumb extended and pointing down, all other fingers curled
  if (
    thumbCurl > 0.6 &&
    landmarks[4].y > landmarks[1].y &&
    indexCurl < 0.4 &&
    middleCurl < 0.4 &&
    ringCurl < 0.4 &&
    pinkyCurl < 0.4
  ) {
    return "thumbs_down";
  }

  // ── 8. None ─────────────────────────────────────────────────
  return "none";
}
