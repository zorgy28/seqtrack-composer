/**
 * localStorage persistence for user-created MicroFreak presets.
 *
 * Each preset stores the full CC parameter snapshot alongside
 * standard SoundPreset fields (name, category, bank, program).
 */

import type { MicroFreakUserPreset } from "./types";

const STORAGE_KEY = "microfreak-user-presets";

// ─── CRUD ──────────────────────────────────────────────────────

/** Load all user presets from localStorage (keyed by slot ID). */
export function loadUserPresets(): Record<number, MicroFreakUserPreset> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<number, MicroFreakUserPreset>;
  } catch {
    return {};
  }
}

/** Save a user preset to a specific slot (1-512). */
export function saveUserPreset(slotId: number, preset: MicroFreakUserPreset): void {
  const store = loadUserPresets();
  store[slotId] = preset;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to save user preset:", err);
  }
}

/** Delete a user preset from a slot. */
export function deleteUserPreset(slotId: number): void {
  const store = loadUserPresets();
  delete store[slotId];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to delete user preset:", err);
  }
}

/** Get a single user preset by slot ID, or null if empty. */
export function getUserPreset(slotId: number): MicroFreakUserPreset | null {
  const store = loadUserPresets();
  return store[slotId] ?? null;
}
