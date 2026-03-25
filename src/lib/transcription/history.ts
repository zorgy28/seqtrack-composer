import type { MLServiceResult, TranscriptionOption } from "./types";

export interface TranscriptionHistoryEntry {
  id: string;
  createdAt: string;
  source: {
    type: "file" | "url";
    name: string;
    url?: string;
  };
  bars: number;
  analysis: {
    bpm: number;
    key: string;
    genre: string;
  };
  mlResult: MLServiceResult;
  options: TranscriptionOption[];
  appliedOptionIndex: number | null;
}

const STORAGE_KEY = "seqtrack-transcription-history";
const MAX_ENTRIES = 20;

let historyTimeout: ReturnType<typeof setTimeout> | null = null;

function saveToStorage(entries: TranscriptionHistoryEntry[]) {
  if (historyTimeout) clearTimeout(historyTimeout);
  historyTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, 200);
}

export function getHistory(): TranscriptionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TranscriptionHistoryEntry[];
  } catch {
    return [];
  }
}

export function addToHistory(entry: TranscriptionHistoryEntry): void {
  const history = getHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }
  saveToStorage(history);
}

export function removeFromHistory(id: string): void {
  const history = getHistory().filter((e) => e.id !== id);
  saveToStorage(history);
}

export function getEntryById(id: string): TranscriptionHistoryEntry | null {
  return getHistory().find((e) => e.id === id) ?? null;
}

export function updateAppliedOption(id: string, index: number): void {
  const history = getHistory();
  const entry = history.find((e) => e.id === id);
  if (entry) {
    entry.appliedOptionIndex = index;
    saveToStorage(history);
  }
}
