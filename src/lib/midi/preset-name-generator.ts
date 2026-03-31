/**
 * Auto-generate preset names from pattern characteristics and CC parameters.
 * Names are capped at 16 characters (MicroFreak display limit).
 */

import type { Pattern, SoundCategory } from "./types";
import { STEPS_PER_BAR } from "./constants";

// ─── Oscillator type short labels (from CC9 values) ────────────

const OSC_SHORT: Record<number, string> = {
  10: "Basic", 21: "Super", 32: "WavTbl", 42: "Harmo",
  53: "Karplus", 64: "VAnlg", 74: "WvShpr", 85: "TwoFM",
  95: "Formnt", 106: "Chord", 117: "Speech", 127: "Modal",
};

function closestOscLabel(cc9: number): string {
  let best = "Synth";
  let minDist = Infinity;
  for (const [v, label] of Object.entries(OSC_SHORT)) {
    const d = Math.abs(Number(v) - cc9);
    if (d < minDist) { minDist = d; best = label; }
  }
  return best;
}

// ─── Pattern character analysis ────────────────────────────────

function analyzePattern(pattern: Pattern): string {
  const { notes, bars } = pattern;
  if (notes.length === 0) return "Empty";

  const totalSteps = bars * STEPS_PER_BAR;
  const density = notes.length / bars;

  // Average pitch
  const avgPitch = notes.reduce((s, n) => s + n.pitch, 0) / notes.length;

  // Average duration
  const avgDur = notes.reduce((s, n) => s + n.duration, 0) / notes.length;

  // Simultaneous notes (chords)
  const stepCounts = new Map<number, number>();
  for (const n of notes) {
    stepCounts.set(n.step, (stepCounts.get(n.step) ?? 0) + 1);
  }
  const maxSimultaneous = Math.max(...stepCounts.values());

  // Character label
  if (maxSimultaneous >= 3 && avgDur >= 4) return "Pad";
  if (maxSimultaneous >= 3) return "Chords";
  if (density >= 12 && avgDur <= 1.5) return "Arp";
  if (density >= 8) return "Seq";
  if (avgPitch < 52) return "Bass";
  if (avgDur >= 4) return "Lead";
  if (density <= 3) return "Sparse";
  return "Groove";
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Generate a preset name from pattern + optional CC params.
 * Max 16 characters.
 */
export function generatePresetName(
  pattern: Pattern,
  bpm: number,
  params?: Record<number, number>,
): string {
  const character = analyzePattern(pattern);

  // Engine prefix from CC9
  let engine = "";
  if (params && params[9] !== undefined) {
    engine = closestOscLabel(params[9]);
  }

  // Build name: "{Engine} {Character}" or just "{Character} {bpm}"
  let name: string;
  if (engine) {
    name = `${engine} ${character}`;
  } else {
    name = `${character} ${bpm}bpm`;
  }

  // Cap at 16 characters
  return name.slice(0, 16);
}

/**
 * Infer a SoundCategory from CC parameters and pattern analysis.
 */
export function inferCategory(
  params: Record<number, number>,
  pattern?: Pattern,
): SoundCategory {
  const attack = params[105] ?? 0;
  const decay = params[106] ?? 64;
  const sustain = params[29] ?? 100;
  const cutoff = params[23] ?? 127;

  // Long attack + high sustain → Pad
  if (attack > 60 && sustain > 80) return "Pad";

  // Short decay, no sustain → Bell/Perc
  if (decay < 30 && sustain < 20) return "Bell";

  // Low cutoff → Bass-like
  if (cutoff < 50) return "Bass";

  // Pattern-based inference
  if (pattern) {
    const char = analyzePattern(pattern);
    if (char === "Bass") return "Bass";
    if (char === "Pad" || char === "Chords") return "Pad";
    if (char === "Arp" || char === "Seq") return "Rhythmic";
    if (char === "Lead") return "Synth Lead";
  }

  return "Keyboard"; // safe default
}
