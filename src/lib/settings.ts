// ---------------------------------------------------------------------------
// Settings store – localStorage-backed, no React dependency
// ---------------------------------------------------------------------------

const STORAGE_KEY = "seqtrack-settings";

export type PlaybackMode = "device" | "internal" | "both";
export type LlmProvider = "claude" | "gemini" | "openrouter" | "lm-studio" | "ollama" | "zai";
export type StepGridSize = "compact" | "normal" | "large";
export type StemModel = "htdemucs" | "htdemucs_6s" | "htdemucs_ft";

export interface AppSettings {
  // Audio & MIDI
  autoMonitor: boolean;
  monitorVolume: number; // 0-100
  playbackMode: PlaybackMode;
  /** Show the waveform visualization in the Audio Monitor panel */
  showWaveform: boolean;
  /** Show the spectrum visualization in the Audio Monitor panel */
  showSpectrum: boolean;
  /** Show the level meter in the Audio Monitor panel */
  showLevelMeter: boolean;

  // AI & Models
  llmProvider: LlmProvider;
  claudeApiKey: string;
  claudeModel: string;
  geminiApiKey: string;
  geminiModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  lmStudioUrl: string;
  lmStudioApiKey: string;
  lmStudioModel: string;
  ollamaUrl: string;
  ollamaModel: string;
  zaiApiKey: string;
  zaiUrl: string;
  zaiModel: string;
  doclingUrl: string;
  doclingApiKey: string;
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
  // Visualizations default OFF for performance — user can opt in via toggles
  showWaveform: false,
  showSpectrum: false,
  showLevelMeter: true,

  llmProvider: "lm-studio",
  claudeApiKey: "",
  claudeModel: "claude-sonnet-4-6",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
  openrouterApiKey: "",
  openrouterModel: "anthropic/claude-sonnet-4.5",
  lmStudioUrl: "http://192.168.1.125:1235",
  lmStudioApiKey: "",
  lmStudioModel: "google/gemma-3-4b",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "",
  zaiApiKey: "",
  zaiUrl: "https://api.z.ai/api/coding/paas/v4",
  zaiModel: "glm-4.7",
  doclingUrl: "",
  doclingApiKey: "",
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
  saveSettingsToPrefs(next);
  return next;
}

// ---------------------------------------------------------------------------
// Provider config builders
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  provider: LlmProvider;
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}

export function buildProviderConfig(settings: AppSettings): ProviderConfig {
  const base = (() => {
    switch (settings.llmProvider) {
      case "claude":
        return { provider: "claude" as const, modelId: settings.claudeModel, apiKey: settings.claudeApiKey };
      case "gemini":
        return { provider: "gemini" as const, modelId: settings.geminiModel, apiKey: settings.geminiApiKey };
      case "openrouter":
        return { provider: "openrouter" as const, modelId: settings.openrouterModel, apiKey: settings.openrouterApiKey };
      case "lm-studio": {
        // Ensure baseUrl ends with /v1 for OpenAI-compatible endpoint
        const lmBase = settings.lmStudioUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
        return { provider: "lm-studio" as const, modelId: settings.lmStudioModel, baseUrl: `${lmBase}/v1`, apiKey: settings.lmStudioApiKey };
      }
      case "ollama":
        return { provider: "ollama" as const, modelId: settings.ollamaModel, baseUrl: settings.ollamaUrl };
      case "zai":
        return { provider: "zai" as const, modelId: settings.zaiModel, apiKey: settings.zaiApiKey, baseUrl: settings.zaiUrl || "https://api.z.ai/api/coding/paas/v4" };
      default:
        return { provider: "claude" as const, modelId: settings.claudeModel, apiKey: settings.claudeApiKey };
    }
  })();
  return { ...base, temperature: settings.temperature };
}

export function buildDoclingConfig(settings: AppSettings): { url: string; apiKey: string } {
  return { url: settings.doclingUrl, apiKey: settings.doclingApiKey };
}

// ---------------------------------------------------------------------------
// Electron persistence layer — ~/Library/Preferences/
// ---------------------------------------------------------------------------

const isElectron = typeof window !== "undefined" && !!(window as unknown as { electronAPI?: unknown }).electronAPI;

async function saveSettingsToPrefs(settings: AppSettings): Promise<void> {
  if (!isElectron) return;
  try {
    await (window as unknown as { electronAPI: { writePrefs: (data: AppSettings) => Promise<boolean> } }).electronAPI.writePrefs(settings);
  } catch {
    // Electron IPC unavailable — silently ignore
  }
}

async function loadSettingsFromPrefs(): Promise<Partial<AppSettings> | null> {
  if (!isElectron) return null;
  try {
    return await (window as unknown as { electronAPI: { readPrefs: () => Promise<Partial<AppSettings> | null> } }).electronAPI.readPrefs();
  } catch {
    return null;
  }
}

export async function restoreSettingsIfNeeded(): Promise<AppSettings> {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };

  const hasLocal = !!localStorage.getItem(STORAGE_KEY);
  if (hasLocal) return getSettings();

  const prefs = await loadSettingsFromPrefs();
  if (prefs) {
    const merged = { ...DEFAULT_SETTINGS, ...prefs };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Storage full
    }
    return merged;
  }

  return { ...DEFAULT_SETTINGS };
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
