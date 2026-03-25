"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Project, SeqtrackChannel, Pattern } from "@/lib/midi/types";
import type { TranscriptionOption } from "@/lib/transcription/types";
import { createEmptyProject, createTrack } from "@/lib/midi/pattern-generators";

interface ProjectContextValue {
  project: Project;
  setProject: (project: Project) => void;
  selectedChannel: SeqtrackChannel;
  setSelectedChannel: (ch: SeqtrackChannel) => void;
  updatePattern: (channel: SeqtrackChannel, patternIndex: number, pattern: Pattern) => void;
  updateBpm: (bpm: number) => void;
  loadTranscription: (option: TranscriptionOption) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const AUTOSAVE_KEY = "seqtrack-current-project";

function loadSavedProject(): Project {
  if (typeof window === "undefined") return createEmptyProject();
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Project;
      if (parsed && parsed.tracks && parsed.bpm) return parsed;
    }
  } catch { /* ignore */ }
  return createEmptyProject();
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let saveCount = 0;

function checkStorageUsage() {
  if (typeof window === "undefined") return;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) total += localStorage.getItem(key)?.length ?? 0;
  }
  if (total > 4_000_000) { // 4MB warning (limit is usually 5-10MB)
    console.warn(`[storage] Using ${(total / 1024 / 1024).toFixed(1)}MB of localStorage`);
  }
}

function autoSave(project: Project) {
  if (typeof window === "undefined") return;
  // Debounce: only save after 300ms of no changes
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
    } catch { /* localStorage full */ }
    // Check storage usage every 10th save
    saveCount++;
    if (saveCount % 10 === 0) {
      checkStorageUsage();
    }
  }, 300);
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<Project>(() => loadSavedProject());
  const [selectedChannel, setSelectedChannel] = useState<SeqtrackChannel>(1);

  const setProject = useCallback((p: Project) => {
    const updated = { ...p, updatedAt: new Date().toISOString() };
    setProjectState(updated);
    autoSave(updated);
  }, []);

  const updatePattern = useCallback(
    (channel: SeqtrackChannel, patternIndex: number, pattern: Pattern) => {
      setProjectState((prev) => {
        const track = { ...prev.tracks[channel] };
        const patterns = [...track.patterns];
        patterns[patternIndex] = pattern;
        track.patterns = patterns;
        const updated = {
          ...prev,
          tracks: { ...prev.tracks, [channel]: track },
          updatedAt: new Date().toISOString(),
        };
        autoSave(updated);
        return updated;
      });
    },
    [],
  );

  const updateBpm = useCallback((bpm: number) => {
    setProjectState((prev) => ({ ...prev, bpm, updatedAt: new Date().toISOString() }));
  }, []);

  const loadTranscription = useCallback((option: TranscriptionOption) => {
    const newProject = createEmptyProject(option.label);
    newProject.bpm = option.bpm;

    // Parse key into root + scale (e.g., "C minor" → root "C", scale "natural_minor")
    if (option.key) {
      const parts = option.key.split(/\s+/);
      if (parts[0]) newProject.scaleRoot = parts[0];
      if (parts[1]) newProject.scaleName = parts[1].toLowerCase().replace(/ /g, "_");
    }

    // option.tracks is TranscriptionTrack[] from types.ts
    for (const t of option.tracks) {
      const ch = t.channel as SeqtrackChannel;
      const track = createTrack(ch);

      if (t.patterns.length > 0) {
        track.patterns = t.patterns.map((p) => ({
          ...p,
          swing: p.swing ?? option.swing ?? 0,
        }));
      }

      newProject.tracks[ch] = track;
    }

    setProject(newProject);
  }, [setProject]);

  return (
    <ProjectContext.Provider
      value={{ project, setProject, selectedChannel, setSelectedChannel, updatePattern, updateBpm, loadTranscription }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
