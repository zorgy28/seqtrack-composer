import type { SoundPreset, SoundCategory, SoundEngine, SeqtrackChannel } from "./types";
import { loadScannedPresets } from "./sound-scanner";
import { COMPLETE_PRESETS } from "./sound-data-complete";

/**
 * SEQTRAK Sound Library — all 2032 presets from Data List V2.00.
 *
 * Bank mapping from SEQTRAK Data List V2.00, page 117:
 *   MSB=63, LSB=0-15 → Preset banks (128 sounds per bank)
 *   Sound number = (LSB * 128) + PC + 1
 *
 * Categories and ranges derived from the official Yamaha Data List.
 * Known names overlaid from hand-curated presets; others use
 * positional names (e.g. "Kick 1", "Bass 42").
 */

// ─── Exports ────────────────────────────────────────────────────

/** Complete built-in sound library — all 2032 presets */
export const ALL_PRESETS: SoundPreset[] = COMPLETE_PRESETS;

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

/** Find a preset by its Bank Select MSB/LSB and Program Change number */
export function findPresetByBankPC(
  bankMSB: number,
  bankLSB: number,
  programNumber: number,
): SoundPreset | null {
  const presets = getAllPresets();
  return presets.find(
    (p) => p.bankMSB === bankMSB && p.bankLSB === bankLSB && p.programNumber === programNumber,
  ) ?? null;
}
