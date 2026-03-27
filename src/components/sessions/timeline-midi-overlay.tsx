"use client";

import { memo, useRef, useEffect, useMemo } from "react";
import type { PairedNote } from "@/lib/recording/types";

// ---------------------------------------------------------------------------
// TimelineMidiOverlay — MIDI note visualization canvas for session timeline
// ---------------------------------------------------------------------------

/** Channel colors matching SEQTRAK track palette. */
const CHANNEL_COLORS: Record<number, string> = {
  1: "#ef4444",  // Kick — red
  2: "#eab308",  // Snare — yellow
  3: "#d946ef",  // Clap — fuchsia
  4: "#06b6d4",  // Hat 1 — cyan
  5: "#3b82f6",  // Hat 2 — blue
  6: "#22c55e",  // Perc 1 — green
  7: "#64748b",  // Perc 2 — slate
  8: "#a855f7",  // Synth 1 — purple
  9: "#14b8a6",  // Synth 2 — teal
  10: "#f59e0b", // DX — amber
  11: "#10b981", // Sampler — emerald
};

const DEFAULT_NOTE_COLOR = "#94a3b8";

interface TimelineMidiOverlayProps {
  notes: PairedNote[];
  pixelsPerSecond: number;
  scrollOffsetMs: number;
  durationMs: number;
  height?: number;
  pitchRange?: { min: number; max: number };
}

/** Convert a time in ms to a pixel x-coordinate. */
function msToPixel(
  timeMs: number,
  scrollOffsetMs: number,
  pixelsPerSecond: number,
): number {
  return ((timeMs - scrollOffsetMs) * pixelsPerSecond) / 1000;
}

/** Parse a hex color string to r, g, b components. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = parseInt(hex.slice(1), 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

const TimelineMidiOverlay = memo(function TimelineMidiOverlay({
  notes,
  pixelsPerSecond,
  scrollOffsetMs,
  durationMs,
  height = 120,
  pitchRange: pitchRangeProp,
}: TimelineMidiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute pitch range from notes (with padding) or use prop
  const pitchRange = useMemo(() => {
    if (pitchRangeProp) return pitchRangeProp;
    if (notes.length === 0) return { min: 48, max: 84 };

    let min = 127;
    let max = 0;
    for (const note of notes) {
      if (note.pitch < min) min = note.pitch;
      if (note.pitch > max) max = note.pitch;
    }

    // Add padding (at least 2 semitones each side, ensure min range of 12)
    const padding = 2;
    min = Math.max(0, min - padding);
    max = Math.min(127, max + padding);
    if (max - min < 12) {
      const center = Math.round((min + max) / 2);
      min = Math.max(0, center - 6);
      max = Math.min(127, center + 6);
    }

    return { min, max };
  }, [notes, pitchRangeProp]);

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

  // Render notes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Clear with transparency (this overlays on top of the waveform)
    ctx.clearRect(0, 0, w, h);

    if (notes.length === 0) return;

    const pRange = pitchRange.max - pitchRange.min;
    if (pRange <= 0) return;

    const noteHeight = Math.max(3, h / pRange);
    const pxPerMs = pixelsPerSecond / 1000;

    // Determine visible time range
    const visibleStartMs = scrollOffsetMs;
    const visibleEndMs = scrollOffsetMs + (w / pixelsPerSecond) * 1000;

    for (const note of notes) {
      // Skip notes outside visible viewport
      if (note.endMs < visibleStartMs || note.startMs > visibleEndMs) continue;

      const x = msToPixel(note.startMs, scrollOffsetMs, pixelsPerSecond);
      const noteW = Math.max(2, (note.endMs - note.startMs) * pxPerMs);

      // Higher pitches at top
      const pitchNorm = 1 - (note.pitch - pitchRange.min) / pRange;
      const y = pitchNorm * (h - noteHeight);

      // Color from channel map
      const hex = CHANNEL_COLORS[note.channel] ?? DEFAULT_NOTE_COLOR;
      const { r, g, b } = hexToRgb(hex);

      // Opacity based on velocity: 0.4 at velocity 0, 1.0 at velocity 127
      const alpha = 0.4 + (note.velocity / 127) * 0.6;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(x, y, noteW, noteHeight);

      // Subtle border for visibility at small sizes
      if (noteW > 4 && noteHeight > 4) {
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha + 0.2)})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, noteW, noteHeight);
      }
    }
  }, [notes, pixelsPerSecond, scrollOffsetMs, durationMs, height, pitchRange]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md pointer-events-none"
      style={{ height }}
    />
  );
});

export { TimelineMidiOverlay };
