import type { SoundPreset, SoundCategory, SoundEngine } from "./types";

// Complete SEQTRAK sound library — 2032 presets from Data List V2.00
// Names from built-in library where known, positional names otherwise.

// ─── Known preset names from the original built-in library ──────
// These are the 99 presets with real names from the hand-curated list.

/**
 * Exported so downstream code (GM mapping, etc.) can resolve sound names
 * to real bank/LSB/PC addresses without going through the generated
 * COMPLETE_PRESETS (which uses a different ID → bank/PC formula and
 * therefore doesn't preserve the hand-curated addresses).
 */
export const KNOWN_PRESETS: SoundPreset[] = [
  // Drum
  { id: 1, name: "Acoustic Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 0 },
  { id: 2, name: "Tight Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 1 },
  { id: 3, name: "Deep Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 2 },
  { id: 4, name: "808 Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 3 },
  { id: 5, name: "909 Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 4 },
  { id: 6, name: "Punchy Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 5 },
  { id: 7, name: "Sub Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 6 },
  { id: 8, name: "Lo-Fi Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 7 },
  { id: 9, name: "Distorted Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 8 },
  { id: 10, name: "Techno Kick", category: "Kick", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 9 },
  { id: 121, name: "Acoustic Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 120 },
  { id: 122, name: "Tight Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 0 },
  { id: 123, name: "808 Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 1 },
  { id: 124, name: "909 Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 2 },
  { id: 125, name: "Trap Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 3 },
  { id: 126, name: "Brush Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 4 },
  { id: 241, name: "808 Clap", category: "Clap", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 120 },
  { id: 242, name: "909 Clap", category: "Clap", engine: "drum", bankMSB: 63, bankLSB: 2, programNumber: 0 },
  { id: 243, name: "Finger Snap", category: "Snap", engine: "drum", bankMSB: 63, bankLSB: 2, programNumber: 1 },
  { id: 361, name: "Closed Hat Tight", category: "Closed HiHat", engine: "drum", bankMSB: 63, bankLSB: 2, programNumber: 120 },
  { id: 362, name: "808 Closed Hat", category: "Closed HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 0 },
  { id: 363, name: "909 Closed Hat", category: "Closed HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 1 },
  { id: 441, name: "Open Hat", category: "Open HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 80 },
  { id: 442, name: "808 Open Hat", category: "Open HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 81 },
  { id: 561, name: "Shaker", category: "Shaker", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 50 },
  { id: 562, name: "Tambourine", category: "Shaker", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 51 },
  { id: 563, name: "Ride Cymbal", category: "Ride", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 60 },
  { id: 564, name: "Cowbell", category: "Bell", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 70 },
  { id: 565, name: "Conga", category: "Conga", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 80 },
  { id: 566, name: "Tom Low", category: "Tom", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 90 },
  { id: 681, name: "Crash Cymbal", category: "Crash", engine: "drum", bankMSB: 63, bankLSB: 5, programNumber: 50 },
  { id: 682, name: "Tom High", category: "Tom", engine: "drum", bankMSB: 63, bankLSB: 5, programNumber: 60 },
  { id: 683, name: "Bongo", category: "Conga", engine: "drum", bankMSB: 63, bankLSB: 5, programNumber: 70 },
  // Synth AWM2
  { id: 856, name: "Rn Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 6, programNumber: 120 },
  { id: 857, name: "Buzz Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 0 },
  { id: 858, name: "3 VCOs", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 1 },
  { id: 859, name: "Analog Bullet Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 2 },
  { id: 860, name: "Sub Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 3 },
  { id: 861, name: "Acid Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 4 },
  { id: 862, name: "Wobble Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 5 },
  { id: 863, name: "Finger Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 6 },
  { id: 864, name: "Slap Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 7 },
  { id: 865, name: "Moog Bass", category: "Bass", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 8 },
  { id: 951, name: "Slow Saw Lead", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 95 },
  { id: 952, name: "Trance Attack", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 96 },
  { id: 953, name: "PWM Stabs", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 97 },
  { id: 954, name: "Super Saw", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 98 },
  { id: 955, name: "Retro Lead", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 99 },
  { id: 956, name: "Hoover", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 100 },
  { id: 1103, name: "Full Concert Grand", category: "Piano", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 100 },
  { id: 1104, name: "CP80", category: "Piano", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 101 },
  { id: 1105, name: "Honkytonk", category: "Piano", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 102 },
  { id: 1135, name: "E.Piano 1", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 120 },
  { id: 1136, name: "Sweetness", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 0 },
  { id: 1137, name: "DX Legend", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 1 },
  { id: 1138, name: "Wurlitzer", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 2 },
  { id: 1216, name: "Jazzy 1", category: "Organ", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 80 },
  { id: 1217, name: "Rock Organ", category: "Organ", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 81 },
  { id: 1218, name: "Church Organ", category: "Organ", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 82 },
  { id: 1290, name: "Warm Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 10 },
  { id: 1291, name: "Trance Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 11 },
  { id: 1292, name: "Sci-Fi Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 12 },
  { id: 1293, name: "Space Vocals", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 13 },
  { id: 1294, name: "Ambient Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 14 },
  { id: 1295, name: "Dark Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 15 },
  { id: 1439, name: "Violin", category: "Strings", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 30 },
  { id: 1440, name: "Cello Solo", category: "Strings", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 31 },
  { id: 1441, name: "String Ensemble", category: "Strings", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 32 },
  { id: 1517, name: "Trumpet", category: "Brass", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 110 },
  { id: 1518, name: "Trombone", category: "Brass", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 111 },
  { id: 1643, name: "Classical Guitar", category: "Guitar", engine: "awm2", bankMSB: 63, bankLSB: 12, programNumber: 100 },
  { id: 1644, name: "Electric Clean", category: "Guitar", engine: "awm2", bankMSB: 63, bankLSB: 12, programNumber: 101 },
  { id: 1774, name: "Marimba", category: "Mallet", engine: "awm2", bankMSB: 63, bankLSB: 13, programNumber: 100 },
  { id: 1775, name: "Vibraphone", category: "Mallet", engine: "awm2", bankMSB: 63, bankLSB: 13, programNumber: 101 },
  { id: 1776, name: "Steel Drum", category: "Mallet", engine: "awm2", bankMSB: 63, bankLSB: 13, programNumber: 102 },
  { id: 1794, name: "Metallic Bell", category: "Bell", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 0 },
  { id: 1795, name: "Gamelan", category: "Bell", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 1 },
  { id: 1796, name: "Music Box", category: "Bell", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 2 },
  { id: 1828, name: "Bass Morpher [Arp]", category: "Rhythmic", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 30 },
  { id: 1829, name: "HPF Dance [Arp]", category: "Rhythmic", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 31 },
  { id: 1892, name: "Blaster Beam", category: "SFX", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 95 },
  { id: 1893, name: "Seashore", category: "SFX", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 96 },
  // DX/FM
  { id: 1933, name: "FM Lo-Fi Bass", category: "Bass", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 10 },
  { id: 1934, name: "FM Dark Bass", category: "Bass", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 11 },
  { id: 1935, name: "FM Bold Bass", category: "Bass", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 12 },
  { id: 1946, name: "FM Metallic Lead", category: "Synth Lead", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 25 },
  { id: 1947, name: "FM Saw Bright", category: "Synth Lead", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 26 },
  { id: 1960, name: "FM Simple Piano", category: "Piano", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 40 },
  { id: 1961, name: "FM B Piano", category: "Piano", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 41 },
  { id: 1964, name: "Legend EP", category: "Keyboard", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 44 },
  { id: 1965, name: "Wood EP", category: "Keyboard", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 45 },
  { id: 1966, name: "Crystal EP", category: "Keyboard", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 46 },
  { id: 1976, name: "FM 5th Atmosphere", category: "Pad", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 55 },
  { id: 1977, name: "FM Glass Dream", category: "Pad", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 56 },
  { id: 1978, name: "FM Strings Pad", category: "Pad", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 57 },
  { id: 2013, name: "FM Tubular Bells", category: "Bell", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 90 },
  { id: 2014, name: "Future Bell", category: "Bell", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 91 },
  { id: 2030, name: "D'n Beats", category: "SFX", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 110 },
  { id: 2031, name: "Buzz Siren", category: "SFX", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 111 },
];

// ─── Category range definitions from Yamaha Data List V2.00 ─────

interface CategoryRange {
  start: number; // inclusive sound number
  end: number;   // inclusive sound number
  category: SoundCategory;
  engine: SoundEngine;
}

const CATEGORY_RANGES: CategoryRange[] = [
  // Drum (1-855)
  { start: 1,    end: 112,  category: "Kick",         engine: "drum" },
  { start: 113,  end: 214,  category: "Snare",        engine: "drum" },
  { start: 215,  end: 248,  category: "Rim",          engine: "drum" },
  { start: 249,  end: 296,  category: "Clap",         engine: "drum" },
  { start: 297,  end: 311,  category: "Snap",         engine: "drum" },
  { start: 312,  end: 384,  category: "Closed HiHat", engine: "drum" },
  { start: 385,  end: 456,  category: "Open HiHat",   engine: "drum" },
  { start: 457,  end: 497,  category: "Shaker",       engine: "drum" },
  { start: 498,  end: 527,  category: "Ride",         engine: "drum" },
  { start: 528,  end: 548,  category: "Crash",        engine: "drum" },
  { start: 549,  end: 618,  category: "Tom",          engine: "drum" },
  { start: 619,  end: 650,  category: "Bell",         engine: "drum" },
  { start: 651,  end: 676,  category: "Conga",        engine: "drum" },
  { start: 677,  end: 787,  category: "World",        engine: "drum" },
  { start: 788,  end: 855,  category: "SFX",          engine: "drum" },
  // Synth AWM2 (856-1932)
  { start: 856,  end: 950,  category: "Bass",         engine: "awm2" },
  { start: 951,  end: 1102, category: "Synth Lead",   engine: "awm2" },
  { start: 1103, end: 1134, category: "Piano",        engine: "awm2" },
  { start: 1135, end: 1215, category: "Keyboard",     engine: "awm2" },
  { start: 1216, end: 1289, category: "Organ",        engine: "awm2" },
  { start: 1290, end: 1438, category: "Pad",          engine: "awm2" },
  { start: 1439, end: 1516, category: "Strings",      engine: "awm2" },
  { start: 1517, end: 1589, category: "Brass",        engine: "awm2" },
  { start: 1590, end: 1642, category: "Woodwind",     engine: "awm2" },
  { start: 1643, end: 1738, category: "Guitar",       engine: "awm2" },
  { start: 1739, end: 1773, category: "World",        engine: "awm2" },
  { start: 1774, end: 1793, category: "Mallet",       engine: "awm2" },
  { start: 1794, end: 1827, category: "Bell",         engine: "awm2" },
  { start: 1828, end: 1891, category: "Rhythmic",     engine: "awm2" },
  { start: 1892, end: 1932, category: "SFX",          engine: "awm2" },
  // DX/FM (1933-2032)
  { start: 1933, end: 1945, category: "Bass",         engine: "dx" },
  { start: 1946, end: 1959, category: "Synth Lead",   engine: "dx" },
  { start: 1960, end: 1963, category: "Piano",        engine: "dx" },
  { start: 1964, end: 1975, category: "Keyboard",     engine: "dx" },
  { start: 1976, end: 1991, category: "Pad",          engine: "dx" },
  { start: 1992, end: 2015, category: "Bell",         engine: "dx" },
  { start: 2016, end: 2025, category: "Rhythmic",     engine: "dx" },
  { start: 2026, end: 2032, category: "SFX",          engine: "dx" },
];

// ─── Lookup helpers ─────────────────────────────────────────────

function getCategory(soundNo: number): { category: SoundCategory; engine: SoundEngine } {
  for (const range of CATEGORY_RANGES) {
    if (soundNo >= range.start && soundNo <= range.end) {
      return { category: range.category, engine: range.engine };
    }
  }
  // Should never happen for valid sound numbers 1-2032, but safe fallback
  if (soundNo <= 855) return { category: "SFX", engine: "drum" };
  if (soundNo <= 1932) return { category: "SFX", engine: "awm2" };
  return { category: "SFX", engine: "dx" };
}

/** Compute position within the category (1-based) for naming */
function positionInCategory(soundNo: number): number {
  for (const range of CATEGORY_RANGES) {
    if (soundNo >= range.start && soundNo <= range.end) {
      return soundNo - range.start + 1;
    }
  }
  return 1;
}

// ─── Build the known-name lookup map (by bankMSB-bankLSB-programNumber) ──
// The user spec says: match existing 99 built-in presets by bankMSB/bankLSB/
// programNumber and overlay their real names.

const knownNames = new Map<string, string>();
for (const p of KNOWN_PRESETS) {
  const key = `${p.bankMSB}-${p.bankLSB}-${p.programNumber}`;
  knownNames.set(key, p.name);
}

// ─── Generate a single preset ───────────────────────────────────

function generatePreset(soundNo: number): SoundPreset {
  const bankMSB = 63;
  const bankLSB = Math.floor((soundNo - 1) / 128);
  const programNumber = (soundNo - 1) % 128;
  const { category, engine } = getCategory(soundNo);

  // Check if this bank/PC slot has a known name from the built-in library
  const key = `${bankMSB}-${bankLSB}-${programNumber}`;
  const knownName = knownNames.get(key);

  // Generate positional name within category if no known name
  const pos = positionInCategory(soundNo);
  const name = knownName ?? `${category} ${pos}`;

  return { id: soundNo, name, category, engine, bankMSB, bankLSB, programNumber };
}

// ─── Generate all 2032 presets ──────────────────────────────────

function buildCompleteLibrary(): SoundPreset[] {
  const presets: SoundPreset[] = [];
  for (let soundNo = 1; soundNo <= 2032; soundNo++) {
    presets.push(generatePreset(soundNo));
  }
  return presets;
}

/** Complete SEQTRAK sound library — all 2032 presets */
export const COMPLETE_PRESETS: SoundPreset[] = buildCompleteLibrary();
