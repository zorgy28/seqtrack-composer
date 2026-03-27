/**
 * Pure canvas drawing functions for rendering hand landmarks as an overlay.
 * No React, no DOM creation — only side effects are drawing to the provided
 * canvas context.
 */

import type { GestureAxes, Handedness, HandLandmarks } from "./types";

// ─── Hand Skeleton Connections ──────────────────────────────────

/** Index pairs defining the hand skeleton lines (MediaPipe 21-point model). */
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  // Index finger
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // Middle finger
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  // Ring finger
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  // Pinky
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  // Palm cross-connections
  [5, 9],
  [9, 13],
  [13, 17],
];

// ─── Color Constants ────────────────────────────────────────────

const COLOR_LEFT = "rgba(0, 255, 255, 1)"; // cyan
const COLOR_RIGHT = "rgba(255, 0, 255, 1)"; // magenta
const COLOR_CONNECTION = "rgba(255, 255, 255, 0.4)"; // semi-transparent white
const CONNECTION_WIDTH = 2;
const LANDMARK_RADIUS = 4;

// ─── Helpers ────────────────────────────────────────────────────

function handColor(handedness: Handedness): string {
  return handedness === "Left" ? COLOR_LEFT : COLOR_RIGHT;
}

function scaleX(
  normalizedX: number,
  canvasWidth: number,
  mirror: boolean,
): number {
  return mirror ? canvasWidth - normalizedX * canvasWidth : normalizedX * canvasWidth;
}

function scaleY(normalizedY: number, canvasHeight: number): number {
  return normalizedY * canvasHeight;
}

// ─── drawLandmarks ──────────────────────────────────────────────

/**
 * Draws 21 hand landmarks and the skeleton connections onto a canvas.
 *
 * @param ctx         - 2D canvas rendering context
 * @param landmarks   - 21 normalized landmarks (x, y in 0-1)
 * @param handedness  - "Left" or "Right"
 * @param canvasWidth - Canvas pixel width
 * @param canvasHeight- Canvas pixel height
 * @param mirror      - If true, flip x coordinates (for selfie/mirror view)
 */
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmarks,
  handedness: Handedness,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean,
): void {
  // Draw all connections in a single batched path (reduces ~23 draw calls to 1)
  ctx.strokeStyle = COLOR_CONNECTION;
  ctx.lineWidth = CONNECTION_WIDTH;
  ctx.beginPath();
  for (const [from, to] of HAND_CONNECTIONS) {
    const a = landmarks[from];
    const b = landmarks[to];
    if (!a || !b) continue;

    ctx.moveTo(scaleX(a.x, canvasWidth, mirror), scaleY(a.y, canvasHeight));
    ctx.lineTo(scaleX(b.x, canvasWidth, mirror), scaleY(b.y, canvasHeight));
  }
  ctx.stroke();

  // Draw all landmark dots in a single batched path (reduces ~21 draw calls to 1)
  const color = handColor(handedness);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const lm of landmarks) {
    if (!lm) continue;
    const x = scaleX(lm.x, canvasWidth, mirror);
    const y = scaleY(lm.y, canvasHeight);

    ctx.moveTo(x + LANDMARK_RADIUS, y);
    ctx.arc(x, y, LANDMARK_RADIUS, 0, Math.PI * 2);
  }
  ctx.fill();
}

// ─── drawGestureIndicators ──────────────────────────────────────

/**
 * Draws visual feedback for the extracted gesture axes:
 * - Pinch indicator circle between thumb tip and index tip
 * - Crosshair at the palm center position
 * - Rotation arc indicating hand roll
 *
 * @param ctx          - 2D canvas rendering context
 * @param axes         - Extracted gesture axes for this hand
 * @param landmarks    - 21 normalized landmarks
 * @param canvasWidth  - Canvas pixel width
 * @param canvasHeight - Canvas pixel height
 * @param mirror       - If true, flip x coordinates
 */
export function drawGestureIndicators(
  ctx: CanvasRenderingContext2D,
  axes: GestureAxes,
  landmarks: HandLandmarks,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean,
): void {
  drawPinchIndicator(ctx, landmarks, axes.pinchThumbIndex, canvasWidth, canvasHeight, mirror);
  drawPalmCrosshair(ctx, axes, canvasWidth, canvasHeight);
  drawRollIndicator(ctx, axes, landmarks, canvasWidth, canvasHeight, mirror);
}

// ─── Pinch Indicator ────────────────────────────────────────────

/**
 * Draws a circle between thumb tip (landmark 4) and index tip (landmark 8).
 * Green when close (pinch ≈ 0), fading to transparent as distance increases.
 */
function drawPinchIndicator(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmarks,
  pinchDistance: number,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean,
): void {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  if (!thumbTip || !indexTip) return;

  const tx = scaleX(thumbTip.x, canvasWidth, mirror);
  const ty = scaleY(thumbTip.y, canvasHeight);
  const ix = scaleX(indexTip.x, canvasWidth, mirror);
  const iy = scaleY(indexTip.y, canvasHeight);

  // Center between the two fingertips
  const cx = (tx + ix) / 2;
  const cy = (ty + iy) / 2;

  // Radius proportional to the pixel distance between tips
  const dx = tx - ix;
  const dy = ty - iy;
  const pixelDist = Math.sqrt(dx * dx + dy * dy);
  const radius = Math.max(pixelDist / 2, 6);

  // Opacity: fully opaque when pinched (distance=0), transparent when open (distance=1)
  const opacity = Math.max(0, 1 - pinchDistance);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0, 255, 100, ${opacity.toFixed(2)})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fill with a subtle glow when very close
  if (pinchDistance < 0.3) {
    ctx.fillStyle = `rgba(0, 255, 100, ${(opacity * 0.25).toFixed(2)})`;
    ctx.fill();
  }
}

// ─── Palm Crosshair ─────────────────────────────────────────────

/** Draws a crosshair at the palm center position derived from gesture axes. */
function drawPalmCrosshair(
  ctx: CanvasRenderingContext2D,
  axes: GestureAxes,
  canvasWidth: number,
  canvasHeight: number,
): void {
  // palmX is already in 0-1 space (mirrored), palmY is 0(bottom)-1(top)
  const px = axes.palmX * canvasWidth;
  const py = (1 - axes.palmY) * canvasHeight; // flip Y: top of canvas = small y

  const armLength = 12;
  const gap = 4;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1.5;

  // Horizontal arms
  ctx.beginPath();
  ctx.moveTo(px - armLength, py);
  ctx.lineTo(px - gap, py);
  ctx.moveTo(px + gap, py);
  ctx.lineTo(px + armLength, py);
  ctx.stroke();

  // Vertical arms
  ctx.beginPath();
  ctx.moveTo(px, py - armLength);
  ctx.lineTo(px, py - gap);
  ctx.moveTo(px, py + gap);
  ctx.lineTo(px, py + armLength);
  ctx.stroke();
}

// ─── Roll Indicator ─────────────────────────────────────────────

/**
 * Draws an arc around the wrist indicating hand roll angle.
 * Roll ranges from -1 to 1 and is mapped to an arc sweep.
 */
function drawRollIndicator(
  ctx: CanvasRenderingContext2D,
  axes: GestureAxes,
  landmarks: HandLandmarks,
  canvasWidth: number,
  canvasHeight: number,
  mirror: boolean,
): void {
  const wrist = landmarks[0];
  if (!wrist) return;

  const wx = scaleX(wrist.x, canvasWidth, mirror);
  const wy = scaleY(wrist.y, canvasHeight);

  const arcRadius = 20;
  // Map roll (-1 to 1) to an arc: center at -π/2 (12 o'clock), sweep ±π/2
  const centerAngle = -Math.PI / 2;
  const sweep = axes.roll * (Math.PI / 2); // half-turn max in each direction

  const startAngle = centerAngle;
  const endAngle = centerAngle + sweep;

  ctx.beginPath();
  ctx.arc(wx, wy, arcRadius, startAngle, endAngle, sweep < 0);
  ctx.strokeStyle = "rgba(255, 200, 0, 0.7)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw a small tick at the end of the arc
  const tickX = wx + arcRadius * Math.cos(endAngle);
  const tickY = wy + arcRadius * Math.sin(endAngle);
  ctx.beginPath();
  ctx.arc(tickX, tickY, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 200, 0, 0.9)";
  ctx.fill();
}
