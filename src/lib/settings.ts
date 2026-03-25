// ---------------------------------------------------------------------------
// Settings store – localStorage-backed, no React dependency
// ---------------------------------------------------------------------------

const STORAGE_KEY = "seqtrack-settings";

export type PlaybackMode = "device" | "internal" | "both";
export type LlmProvider = "claude" | "gemini" | "openrouter" | "lm-studio";
export type StepGridSize = "compact" | "normal" | "large";
export type StemModel = "htdemucs" | "htdemucs_6s" | "htdemucs_ft";

export interface AppSettings {
  // Audio & MIDI
  autoMonitor: boolean;
  monitorVolume: number; // 0-100
  playbackMode: PlaybackMode;

  // AI & Models
  llmProvider: LlmProvider;
  claudeModel: string;
  geminiApiKey: string;
  geminiModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  lmStudioUrl: string;
  lmStudioModel: string;
  temperature: number; // 0-1
  maxTokens: number;

  // Composition defaults
  defaultBpm: number;
  defaultKey: string;
  defaultScale: string;
  defaultBars: number;
  defaultSwing: number; // 0-100
  autoMelodic: boolean;

  // Editor
  pianoRollOctaves: number;
  showHarmonyHints: boolean;
  autoPlayOnApply: boolean;
  stepGridSize: StepGridSize;

  // Transcription / ML
  mlServiceUrl: string;
  defaultStemModel: StemModel;
  autoDetectBpm: boolean;
  maxHistory: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoMonitor: false,
  monitorVolume: 80,
  playbackMode: "device",

  llmProvider: "claude",
  claudeModel: "claude-sonnet-4-6",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
  openrouterApiKey: "",
  openrouterModel: "anthropic/claude-sonnet-4.5",
  lmStudioUrl: "http://169.254.48.100:1235/v1",
  lmStudioModel: "minimax/minimax-m2.5",
  temperature: 0.3,
  maxTokens: 8192,

  defaultBpm: 120,
  defaultKey: "C",
  defaultScale: "chromatic",
  defaultBars: 4,
  defaultSwing: 0,
  autoMelodic: true,

  pianoRollOctaves: 2,
  showHarmonyHints: true,
  autoPlayOnApply: false,
  stepGridSize: "normal",

  mlServiceUrl: "http://localhost:8200",
  defaultStemModel: "htdemucs_6s",
  autoDetectBpm: true,
  maxHistory: 20,
};

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Read settings from localStorage, filling missing keys with defaults. */
export function getSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Merge a partial update into stored settings and persist. */
export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const next = { ...current, ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full — silently fail
  }
  return next;
}

/** Remove stored settings so defaults take effect on next read. */
export function resetSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

/** Return a JSON string of current settings (for export / backup). */
export function exportSettings(): string {
  return JSON.stringify(getSettings(), null, 2);
}

/** Parse a JSON string and persist as settings. Throws on invalid JSON. */
export function importSettings(json: string): AppSettings {
  const parsed = JSON.parse(json) as Partial<AppSettings>;
  const merged = { ...DEFAULT_SETTINGS, ...parsed };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

// ---------------------------------------------------------------------------
// Storage usage
// ---------------------------------------------------------------------------

export interface StorageUsage {
  used: number; // bytes
  limit: number; // bytes (estimated)
}

/** Estimate localStorage usage. Limit is a rough 5 MB default. */
export function getStorageUsage(): StorageUsage {
  if (typeof window === "undefined") return { used: 0, limit: 5_242_880 };

  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Each char is stored as UTF-16 → 2 bytes
        used += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
      }
    }
  } catch {
    // noop
  }

  return { used, limit: 5_242_880 };
}
