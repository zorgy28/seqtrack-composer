import type { SoundPreset, SoundCategory, SoundEngine, SeqtrackChannel } from "./types";
import { loadScannedPresets } from "./sound-scanner";

/**
 * SEQTRAK Sound Library — representative presets from each category.
 * Full library has 2032 sounds; this contains the most useful presets
 * with correct Bank Select (MSB/LSB) + Program Change values.
 *
 * Bank mapping from SEQTRAK Data List V2.00, page 117:
 *   MSB=63, LSB=0-31 → Preset banks (128 sounds per bank)
 *   MSB=32-38 → DrumKit sounds (MSB encodes part/channel)
 *   MSB=62 → Sampler elements
 *
 * Sound numbering: presets are sequential across LSB banks.
 *   LSB 0: PC 0-127 = sounds 1-128
 *   LSB 1: PC 0-127 = sounds 129-256
 *   etc.
 */

// ─── Drum Presets (IDs 1-855, Ch 1-7) ──────────────────────────

const DRUM_PRESETS: SoundPreset[] = [
  // Kick (channel 1) — 120+ presets
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

  // Snare (channel 2) — 120+ presets
  { id: 121, name: "Acoustic Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 0, programNumber: 120 },
  { id: 122, name: "Tight Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 0 },
  { id: 123, name: "808 Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 1 },
  { id: 124, name: "909 Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 2 },
  { id: 125, name: "Trap Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 3 },
  { id: 126, name: "Brush Snare", category: "Snare", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 4 },

  // Clap (channel 3)
  { id: 241, name: "808 Clap", category: "Clap", engine: "drum", bankMSB: 63, bankLSB: 1, programNumber: 120 },
  { id: 242, name: "909 Clap", category: "Clap", engine: "drum", bankMSB: 63, bankLSB: 2, programNumber: 0 },
  { id: 243, name: "Finger Snap", category: "Snap", engine: "drum", bankMSB: 63, bankLSB: 2, programNumber: 1 },

  // HiHat Closed (channel 4)
  { id: 361, name: "Closed Hat Tight", category: "Closed HiHat", engine: "drum", bankMSB: 63, bankLSB: 2, programNumber: 120 },
  { id: 362, name: "808 Closed Hat", category: "Closed HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 0 },
  { id: 363, name: "909 Closed Hat", category: "Closed HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 1 },

  // HiHat Open (channel 5)
  { id: 441, name: "Open Hat", category: "Open HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 80 },
  { id: 442, name: "808 Open Hat", category: "Open HiHat", engine: "drum", bankMSB: 63, bankLSB: 3, programNumber: 81 },

  // Percussion 1 (channel 6)
  { id: 561, name: "Shaker", category: "Shaker", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 50 },
  { id: 562, name: "Tambourine", category: "Shaker", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 51 },
  { id: 563, name: "Ride Cymbal", category: "Ride", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 60 },
  { id: 564, name: "Cowbell", category: "Bell", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 70 },
  { id: 565, name: "Conga", category: "Conga", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 80 },
  { id: 566, name: "Tom Low", category: "Tom", engine: "drum", bankMSB: 63, bankLSB: 4, programNumber: 90 },

  // Percussion 2 (channel 7)
  { id: 681, name: "Crash Cymbal", category: "Crash", engine: "drum", bankMSB: 63, bankLSB: 5, programNumber: 50 },
  { id: 682, name: "Tom High", category: "Tom", engine: "drum", bankMSB: 63, bankLSB: 5, programNumber: 60 },
  { id: 683, name: "Bongo", category: "Conga", engine: "drum", bankMSB: 63, bankLSB: 5, programNumber: 70 },
];

// ─── Synth Presets (AWM2, IDs 856-1932, Ch 8-9) ────────────────

const SYNTH_PRESETS: SoundPreset[] = [
  // Bass (856-950)
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

  // Synth Lead (951-1102)
  { id: 951, name: "Slow Saw Lead", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 95 },
  { id: 952, name: "Trance Attack", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 96 },
  { id: 953, name: "PWM Stabs", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 97 },
  { id: 954, name: "Super Saw", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 98 },
  { id: 955, name: "Retro Lead", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 99 },
  { id: 956, name: "Hoover", category: "Synth Lead", engine: "awm2", bankMSB: 63, bankLSB: 7, programNumber: 100 },

  // Piano (1103-1134)
  { id: 1103, name: "Full Concert Grand", category: "Piano", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 100 },
  { id: 1104, name: "CP80", category: "Piano", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 101 },
  { id: 1105, name: "Honkytonk", category: "Piano", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 102 },

  // Keyboard (1135-1215)
  { id: 1135, name: "E.Piano 1", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 8, programNumber: 120 },
  { id: 1136, name: "Sweetness", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 0 },
  { id: 1137, name: "DX Legend", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 1 },
  { id: 1138, name: "Wurlitzer", category: "Keyboard", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 2 },

  // Organ (1216-1289)
  { id: 1216, name: "Jazzy 1", category: "Organ", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 80 },
  { id: 1217, name: "Rock Organ", category: "Organ", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 81 },
  { id: 1218, name: "Church Organ", category: "Organ", engine: "awm2", bankMSB: 63, bankLSB: 9, programNumber: 82 },

  // Pad (1290-1438)
  { id: 1290, name: "Warm Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 10 },
  { id: 1291, name: "Trance Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 11 },
  { id: 1292, name: "Sci-Fi Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 12 },
  { id: 1293, name: "Space Vocals", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 13 },
  { id: 1294, name: "Ambient Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 14 },
  { id: 1295, name: "Dark Pad", category: "Pad", engine: "awm2", bankMSB: 63, bankLSB: 10, programNumber: 15 },

  // Strings (1439-1516)
  { id: 1439, name: "Violin", category: "Strings", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 30 },
  { id: 1440, name: "Cello Solo", category: "Strings", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 31 },
  { id: 1441, name: "String Ensemble", category: "Strings", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 32 },

  // Brass (1517-1589)
  { id: 1517, name: "Trumpet", category: "Brass", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 110 },
  { id: 1518, name: "Trombone", category: "Brass", engine: "awm2", bankMSB: 63, bankLSB: 11, programNumber: 111 },

  // Guitar (1643-1738)
  { id: 1643, name: "Classical Guitar", category: "Guitar", engine: "awm2", bankMSB: 63, bankLSB: 12, programNumber: 100 },
  { id: 1644, name: "Electric Clean", category: "Guitar", engine: "awm2", bankMSB: 63, bankLSB: 12, programNumber: 101 },

  // Mallet (1774-1793)
  { id: 1774, name: "Marimba", category: "Mallet", engine: "awm2", bankMSB: 63, bankLSB: 13, programNumber: 100 },
  { id: 1775, name: "Vibraphone", category: "Mallet", engine: "awm2", bankMSB: 63, bankLSB: 13, programNumber: 101 },
  { id: 1776, name: "Steel Drum", category: "Mallet", engine: "awm2", bankMSB: 63, bankLSB: 13, programNumber: 102 },

  // Bell (1794-1827)
  { id: 1794, name: "Metallic Bell", category: "Bell", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 0 },
  { id: 1795, name: "Gamelan", category: "Bell", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 1 },
  { id: 1796, name: "Music Box", category: "Bell", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 2 },

  // Rhythmic/Arp (1828-1891)
  { id: 1828, name: "Bass Morpher [Arp]", category: "Rhythmic", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 30 },
  { id: 1829, name: "HPF Dance [Arp]", category: "Rhythmic", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 31 },

  // SFX (1892-1932)
  { id: 1892, name: "Blaster Beam", category: "SFX", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 95 },
  { id: 1893, name: "Seashore", category: "SFX", engine: "awm2", bankMSB: 63, bankLSB: 14, programNumber: 96 },
];

// ─── DX/FM Presets (IDs 1933-2032, Ch 10) ──────────────────────

const DX_PRESETS: SoundPreset[] = [
  // Bass (1933-1945)
  { id: 1933, name: "FM Lo-Fi Bass", category: "Bass", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 10 },
  { id: 1934, name: "FM Dark Bass", category: "Bass", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 11 },
  { id: 1935, name: "FM Bold Bass", category: "Bass", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 12 },

  // Synth Lead (1946-1959)
  { id: 1946, name: "FM Metallic Lead", category: "Synth Lead", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 25 },
  { id: 1947, name: "FM Saw Bright", category: "Synth Lead", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 26 },

  // Piano (1960-1963)
  { id: 1960, name: "FM Simple Piano", category: "Piano", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 40 },
  { id: 1961, name: "FM B Piano", category: "Piano", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 41 },

  // Keyboard (1964-1972)
  { id: 1964, name: "Legend EP", category: "Keyboard", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 44 },
  { id: 1965, name: "Wood EP", category: "Keyboard", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 45 },
  { id: 1966, name: "Crystal EP", category: "Keyboard", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 46 },

  // Pad (1976-1991)
  { id: 1976, name: "FM 5th Atmosphere", category: "Pad", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 55 },
  { id: 1977, name: "FM Glass Dream", category: "Pad", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 56 },
  { id: 1978, name: "FM Strings Pad", category: "Pad", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 57 },

  // Bell (2013-2015)
  { id: 2013, name: "FM Tubular Bells", category: "Bell", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 90 },
  { id: 2014, name: "Future Bell", category: "Bell", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 91 },

  // SFX (2030-2032)
  { id: 2030, name: "D'n Beats", category: "SFX", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 110 },
  { id: 2031, name: "Buzz Siren", category: "SFX", engine: "dx", bankMSB: 63, bankLSB: 15, programNumber: 111 },
];

// ─── Exports ────────────────────────────────────────────────────

/** Built-in sound presets (fallback when no scan data is available) */
export const ALL_PRESETS: SoundPreset[] = [
  ...DRUM_PRESETS,
  ...SYNTH_PRESETS,
  ...DX_PRESETS,
];

// ─── Dynamic Library (scanned data preferred) ───────────────────

/** Cache for scanned presets to avoid repeated localStorage reads */
let _cachedComplete: SoundPreset[] | null = null;

/**
 * Get all presets, preferring scanned data over built-in defaults.
 * Returns the complete scanned library if available (>100 presets),
 * otherwise falls back to the built-in ALL_PRESETS.
 */
export function getAllPresets(): SoundPreset[] {
  if (_cachedComplete) return _cachedComplete;
  const scanned = loadScannedPresets();
  if (scanned && scanned.length > 100) {
    _cachedComplete = scanned;
    return scanned;
  }
  return ALL_PRESETS;
}

/** Check whether a complete scanned library is loaded */
export function isCompleteLibrary(): boolean {
  const scanned = loadScannedPresets();
  return scanned !== null && scanned.length > 100;
}

/** Invalidate the cached scanned presets (call after a new scan) */
export function invalidatePresetCache(): void {
  _cachedComplete = null;
}

// ─── Query Functions ────────────────────────────────────────────

/** Get presets for a specific engine type */
export function getPresetsByEngine(engine: SoundEngine): SoundPreset[] {
  return getAllPresets().filter((p) => p.engine === engine);
}

/** Get presets for a specific category */
export function getPresetsByCategory(category: SoundCategory): SoundPreset[] {
  return getAllPresets().filter((p) => p.category === category);
}

/** Get presets compatible with a specific channel */
export function getPresetsForChannel(channel: SeqtrackChannel): SoundPreset[] {
  if (channel >= 1 && channel <= 7) return getPresetsByEngine("drum");
  if (channel === 8 || channel === 9) return getPresetsByEngine("awm2");
  if (channel === 10) return getPresetsByEngine("dx");
  if (channel === 11) {
    const all = getAllPresets();
    return all.filter((p) => p.engine === "sampler");
  }
  return [];
}

/** Search presets by name */
export function searchPresets(query: string): SoundPreset[] {
  const q = query.toLowerCase();
  return getAllPresets().filter((p) => p.name.toLowerCase().includes(q));
}

/** Get unique categories for a specific engine */
export function getCategoriesForEngine(engine: SoundEngine): SoundCategory[] {
  const categories = new Set<SoundCategory>();
  for (const p of getAllPresets()) {
    if (p.engine === engine) categories.add(p.category);
  }
  return Array.from(categories);
}

/** Get all unique categories */
export function getAllCategories(): SoundCategory[] {
  const categories = new Set<SoundCategory>();
  for (const p of getAllPresets()) categories.add(p.category);
  return Array.from(categories);
}
