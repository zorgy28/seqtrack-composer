"use client";

import { memo, useRef, useEffect } from "react";
import type { TimelineSelection } from "@/lib/recording/types";

// ---------------------------------------------------------------------------
// TimelineWaveform — audio waveform canvas for session timeline
// ---------------------------------------------------------------------------

interface TimelineWaveformProps {
  audioBuffer: AudioBuffer | null;
  pixelsPerSecond: number;
  scrollOffsetMs: number;
  selection: TimelineSelection | null;
  playheadMs: number;
  height?: number;
}

/** Convert a time in ms to a pixel x-coordinate. */
function msToPixel(
  timeMs: number,
  scrollOffsetMs: number,
  pixelsPerSecond: number,
): number {
  return ((timeMs - scrollOffsetMs) * pixelsPerSecond) / 1000;
}

/** Downsample channel data into per-pixel peak buckets. */
function computePeaks(
  channelData: Float32Array,
  sampleRate: number,
  pixelsPerSecond: number,
): Float32Array {
  const samplesPerPixel = sampleRate / pixelsPerSecond;
  const totalPixels = Math.ceil(channelData.length / samplesPerPixel);
  const peaks = new Float32Array(totalPixels);

  for (let px = 0; px < totalPixels; px++) {
    const start = Math.floor(px * samplesPerPixel);
    const end = Math.min(Math.ceil((px + 1) * samplesPerPixel), channelData.length);
    let peak = 0;
    for (let i = start; i < end; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
    }
    peaks[px] = peak;
  }

  return peaks;
}

const TimelineWaveform = memo(function TimelineWaveform({
  audioBuffer,
  pixelsPerSecond,
  scrollOffsetMs,
  selection,
  playheadMs,
  height = 120,
}: TimelineWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const peakCacheRef = useRef<{
    peaks: Float32Array;
    pixelsPerSecond: number;
    buffer: AudioBuffer | null;
  } | null>(null);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const dpr = window.devicePixelRatio;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    });

    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [height]);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Clear
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(10, 10, 15, 1)";
      ctx.fillRect(0, 0, w, h);

      // Draw time ruler at bottom
      drawTimeRuler(ctx, w, h, scrollOffsetMs, pixelsPerSecond);

      if (audioBuffer) {
        // Compute / cache peaks
        const cache = peakCacheRef.current;
        let peaks: Float32Array;

        if (
          cache &&
          cache.pixelsPerSecond === pixelsPerSecond &&
          cache.buffer === audioBuffer
        ) {
          peaks = cache.peaks;
        } else {
          const channelData = audioBuffer.getChannelData(0);
          peaks = computePeaks(channelData, audioBuffer.sampleRate, pixelsPerSecond);
          peakCacheRef.current = {
            peaks,
            pixelsPerSecond,
            buffer: audioBuffer,
          };
        }

        // Draw waveform (only visible portion)
        const rulerHeight = 20;
        const waveAreaHeight = h - rulerHeight;
        const centerY = waveAreaHeight / 2;

        const scrollOffsetPx = (scrollOffsetMs * pixelsPerSecond) / 1000;
        const startPeak = Math.max(0, Math.floor(scrollOffsetPx));
        const endPeak = Math.min(peaks.length, Math.ceil(scrollOffsetPx + w));

        ctx.strokeStyle = "rgba(255, 140, 0, 0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let px = startPeak; px < endPeak; px++) {
          const x = px - scrollOffsetPx;
          const peak = peaks[px];
          const peakHeight = peak * centerY;

          ctx.moveTo(x, centerY - peakHeight);
          ctx.lineTo(x, centerY + peakHeight);
        }

        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = "rgba(255, 140, 0, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
      }

      // Draw selection overlay
      if (selection) {
        const selStartX = msToPixel(selection.startMs, scrollOffsetMs, pixelsPerSecond);
        const selEndX = msToPixel(selection.endMs, scrollOffsetMs, pixelsPerSecond);
        const selW = selEndX - selStartX;

        if (selEndX > 0 && selStartX < w) {
          ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
          ctx.fillRect(
            Math.max(0, selStartX),
            0,
            Math.min(selW, w - Math.max(0, selStartX)),
            h,
          );

          // Selection edges
          ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
          ctx.lineWidth = 1;
          if (selStartX >= 0 && selStartX <= w) {
            ctx.beginPath();
            ctx.moveTo(selStartX, 0);
            ctx.lineTo(selStartX, h);
            ctx.stroke();
          }
          if (selEndX >= 0 && selEndX <= w) {
            ctx.beginPath();
            ctx.moveTo(selEndX, 0);
            ctx.lineTo(selEndX, h);
            ctx.stroke();
          }
        }
      }

      // Draw playhead
      const playheadX = msToPixel(playheadMs, scrollOffsetMs, pixelsPerSecond);
      if (playheadX >= 0 && playheadX <= w) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, h);
        ctx.stroke();

        // Small triangle at top
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(playheadX - 4, 0);
        ctx.lineTo(playheadX + 4, 0);
        ctx.lineTo(playheadX, 6);
        ctx.closePath();
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [audioBuffer, pixelsPerSecond, scrollOffsetMs, selection, playheadMs, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md"
      style={{ height }}
    />
  );
});

// ---------------------------------------------------------------------------
// Time ruler — tick marks every second, labels every 5 seconds
// ---------------------------------------------------------------------------

function drawTimeRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollOffsetMs: number,
  pixelsPerSecond: number,
): void {
  const rulerHeight = 20;
  const rulerY = height - rulerHeight;

  // Ruler background
  ctx.fillStyle = "rgba(20, 20, 25, 0.8)";
  ctx.fillRect(0, rulerY, width, rulerHeight);

  // Ruler top border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, rulerY);
  ctx.lineTo(width, rulerY);
  ctx.stroke();

  // Determine visible time range
  const startMs = scrollOffsetMs;
  const endMs = scrollOffsetMs + (width / pixelsPerSecond) * 1000;

  // Draw ticks every second
  const firstSecond = Math.floor(startMs / 1000);
  const lastSecond = Math.ceil(endMs / 1000);

  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = "10px ui-monospace, monospace";

  for (let sec = firstSecond; sec <= lastSecond; sec++) {
    const x = msToPixel(sec * 1000, scrollOffsetMs, pixelsPerSecond);
    if (x < -10 || x > width + 10) continue;

    const isMajor = sec % 5 === 0;
    const tickHeight = isMajor ? 8 : 4;

    ctx.strokeStyle = isMajor
      ? "rgba(255, 255, 255, 0.4)"
      : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, rulerY);
    ctx.lineTo(x, rulerY + tickHeight);
    ctx.stroke();

    // Label every 5 seconds
    if (isMajor) {
      const minutes = Math.floor(sec / 60);
      const secs = sec % 60;
      const label = `${minutes}:${String(secs).padStart(2, "0")}`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText(label, x, height - 1);
    }
  }
}

export { TimelineWaveform };
