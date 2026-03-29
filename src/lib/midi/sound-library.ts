import type { SoundPreset, SoundCategory, SoundEngine, SeqtrackChannel } from "./types";

// Use inline shape to avoid circular dependency with @/lib/devices/types
type ProfileLike = { tracks?: Array<{ channel: number }>; sounds?: { getPresetsForTrack: (i: number) => SoundPreset[] } };
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
 * O(1) lookup map: "${bankMSB}-${bankLSB}-${programNumber}" → SoundPreset.
 * Rebuilt lazily whenever the preset list changes.
 */
let _presetLookup: Map<string, SoundPreset> | null = null;

/** O(1) lookup by preset numeric ID. Lazily built on first call. */
let _idLookup: Map<number, SoundPreset> | null = null;

function buildPresetKey(bankMSB: number, bankLSB: number, programNumber: number): string {
  return `${bankMSB}-${bankLSB}-${programNumber}`;
}

function getPresetLookup(): Map<string, SoundPreset> {
  if (_presetLookup) return _presetLookup;
  const map = new Map<string, SoundPreset>();
  for (const p of getAllPresets()) {
    map.set(buildPresetKey(p.bankMSB, p.bankLSB, p.programNumber), p);
  }
  _presetLookup = map;
  return map;
}

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
  _presetLookup = null;
  _idLookup = null;
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

/**
 * Get presets compatible with a specific channel.
 * When a ProfileLike is provided, delegates to its sound library.
 * Otherwise uses SEQTRAK-specific channel-to-engine mapping.
 */
export function getPresetsForChannel(channel: SeqtrackChannel, profile?: ProfileLike): SoundPreset[] {
  if (profile?.tracks && profile.sounds) {
    const trackIndex = profile.tracks.findIndex(t => t.channel === channel);
    if (trackIndex >= 0) return profile.sounds.getPresetsForTrack(trackIndex);
    return [];
  }

  // SEQTRAK default mapping
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
  return getPresetLookup().get(buildPresetKey(bankMSB, bankLSB, programNumber)) ?? null;
}

function getIdLookup(): Map<number, SoundPreset> {
  if (_idLookup) return _idLookup;
  const map = new Map<number, SoundPreset>();
  for (const p of getAllPresets()) map.set(p.id, p);
  _idLookup = map;
  return map;
}

/** Find a preset by its numeric ID (1-2032 for sounds, 1-392 for sampler) */
export function findPresetById(id: number): SoundPreset | null {
  return getIdLookup().get(id) ?? null;
}
