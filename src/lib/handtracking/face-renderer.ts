/**
 * Face Renderer — canvas drawing for simplified face mesh overlay.
 *
 * Pure canvas drawing functions — no React, no DOM creation.
 */

import type { NormalizedLandmark } from "./types";

// ─── Face Contour Indices ───────────────────────────────────

/** Face oval / jaw outline (36 landmarks) */
const JAW_OUTLINE = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

/** Left eye contour (16 landmarks) */
const LEFT_EYE = [
  33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7,
] as const;

/** Right eye contour (16 landmarks) */
const RIGHT_EYE = [
  263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249,
] as const;

/** Lips outer contour (20 landmarks) */
const LIPS_OUTER = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
] as const;

// ─── Colors ─────────────────────────────────────────────────

const COLOR_JAW = "rgba(255, 200, 100, 0.5)";
const COLOR_EYE = "rgba(100, 200, 255, 0.6)";
const COLOR_LIPS = "rgba(255, 100, 150, 0.6)";

// ─── Helpers ────────────────────────────────────────────────

/**
 * Draw connected lines through the specified landmark indices.
 *
 * @param ctx          Canvas 2D context
 * @param landmarks    Full array of face landmarks
 * @param indices      Array of landmark indices to connect
 * @param canvasWidth  Canvas width for scaling
 * @param canvasHeight Canvas height for scaling
 * @param color        Stroke color (CSS string)
 * @param close        Whether to close the path (loop back to first point)
 */
function drawContour(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  indices: readonly number[],
  canvasWidth: number,
  canvasHeight: number,
  color: string,
  close: boolean,
): void {
  if (indices.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const first = landmarks[indices[0]];
  ctx.moveTo(first.x * canvasWidth, first.y * canvasHeight);

  for (let i = 1; i < indices.length; i++) {
    const pt = landmarks[indices[i]];
    ctx.lineTo(pt.x * canvasWidth, pt.y * canvasHeight);
  }

  if (close) {
    ctx.closePath();
  }

  ctx.stroke();
}

// ─── Main Drawing ───────────────────────────────────────────

/**
 * Draw a simplified face mesh overlay on a canvas.
 *
 * Renders four contours: jaw outline, left eye, right eye, and lips.
 * Uses only key landmark indices rather than all 478 points.
 *
 * @param ctx          Canvas 2D rendering context
 * @param landmarks    Array of 478 face landmarks (NormalizedLandmark)
 * @param canvasWidth  Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 */
export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
): void {
  // Jaw outline (open contour — connects first to last but does not loop)
  drawContour(ctx, landmarks, JAW_OUTLINE, canvasWidth, canvasHeight, COLOR_JAW, false);

  // Left eye (closed loop)
  drawContour(ctx, landmarks, LEFT_EYE, canvasWidth, canvasHeight, COLOR_EYE, true);

  // Right eye (closed loop)
  drawContour(ctx, landmarks, RIGHT_EYE, canvasWidth, canvasHeight, COLOR_EYE, true);

  // Lips outer (closed loop)
  drawContour(ctx, landmarks, LIPS_OUTER, canvasWidth, canvasHeight, COLOR_LIPS, true);
}
