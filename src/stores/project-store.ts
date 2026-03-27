import { createStore, useStore } from "zustand";
import { createContext, useContext } from "react";
import type { Project, SeqtrackChannel, Pattern, Track } from "@/lib/midi/types";
import type { TranscriptionOption } from "@/lib/transcription/types";
import { createEmptyProject, createTrack } from "@/lib/midi/pattern-generators";
import {
  saveProject as idbSaveProject,
  saveSetting,
} from "@/lib/storage/indexed-db";

// ─── Types ──────────────────────────────────────────────────────

export interface ProjectState {
  project: Project;
  selectedChannel: SeqtrackChannel;
}

export interface ProjectActions {
  setProject: (project: Project) => void;
  setSelectedChannel: (ch: SeqtrackChannel) => void;
  updatePattern: (channel: SeqtrackChannel, patternIndex: number, pattern: Pattern) => void;
  updateBpm: (bpm: number) => void;
  loadTranscription: (option: TranscriptionOption) => void;
  /** Called once IDB is ready — internal, not part of public API */
  _hydrateFromIdb: (project: Project) => void;
}

export type ProjectStore = ProjectState & ProjectActions;

// ─── Auto-save: IndexedDB primary, localStorage fallback ────────

const AUTOSAVE_KEY = "seqtrack-current-project";

let useIdb = false;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/** Enable IndexedDB auto-save (called after migration completes) */
export function enableIdb() { useIdb = true; }

function autoSave(project: Project) {
  if (typeof window === "undefined") return;

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (useIdb) {
      idbSaveProject(project)
        .then(() => saveSetting("current-project-id", project.id))
        .catch(() => {
          try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
          } catch { /* storage full */ }
        });
    } else {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
      } catch { /* storage full */ }
    }
  }, 300);
}

/** Synchronous load from localStorage for instant first render */
export function loadSavedProject(): Project {
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

// ─── Store factory ──────────────────────────────────────────────

export function createProjectStore(initialProject?: Project) {
  return createStore<ProjectStore>()((set) => ({
    project: initialProject ?? loadSavedProject(),
    selectedChannel: 1 as SeqtrackChannel,

    setProject: (p: Project) => {
      const updated = { ...p, updatedAt: new Date().toISOString() };
      set({ project: updated });
      autoSave(updated);
    },

    setSelectedChannel: (ch: SeqtrackChannel) => {
      set({ selectedChannel: ch });
    },

    updatePattern: (channel: SeqtrackChannel, patternIndex: number, pattern: Pattern) => {
      set((state) => {
        const prev = state.project;
        const track = { ...prev.tracks[channel] };
        const patterns = [...track.patterns];
        patterns[patternIndex] = pattern;
        track.patterns = patterns;
        const updated: Project = {
          ...prev,
          tracks: { ...prev.tracks, [channel]: track },
          updatedAt: new Date().toISOString(),
        };
        autoSave(updated);
        return { project: updated };
      });
    },

    updateBpm: (bpm: number) => {
      set((state) => {
        const updated: Project = {
          ...state.project,
          bpm,
          updatedAt: new Date().toISOString(),
        };
        autoSave(updated);
        return { project: updated };
      });
    },

    loadTranscription: (option: TranscriptionOption) => {
      const newProject = createEmptyProject(option.label);
      newProject.bpm = option.bpm;

      if (option.key) {
        const parts = option.key.split(/\s+/);
        if (parts[0]) newProject.scaleRoot = parts[0];
        if (parts[1]) newProject.scaleName = parts[1].toLowerCase().replace(/ /g, "_");
      }

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

      const updated = { ...newProject, updatedAt: new Date().toISOString() };
      set({ project: updated });
      autoSave(updated);
    },

    _hydrateFromIdb: (project: Project) => {
      set((state) => {
        if (project.updatedAt > state.project.updatedAt) {
          return { project };
        }
        return state;
      });
    },
  }));
}

// ─── React context ──────────────────────────────────────────────

export type ProjectStoreApi = ReturnType<typeof createProjectStore>;

export const ProjectStoreContext = createContext<ProjectStoreApi | null>(null);

function useProjectStore(): ProjectStoreApi {
  const store = useContext(ProjectStoreContext);
  if (!store) throw new Error("useProject must be used within ProjectProvider");
  return store;
}

// ─── Selectors ──────────────────────────────────────────────────

/**
 * Full backward-compatible hook — returns all state + actions.
 * Components using this re-render on ANY project change.
 */
export function useProject() {
  const store = useProjectStore();
  return useStore(store);
}

/**
 * Select a single track by channel. Only re-renders when THAT track changes.
 */
export function useTrack(channel: SeqtrackChannel): Track {
  const store = useProjectStore();
  return useStore(store, (s) => s.project.tracks[channel]);
}

/**
 * Project metadata: everything except tracks.
 * Re-renders on bpm/scale/name changes but NOT on individual track changes.
 */
export function useProjectMeta() {
  const store = useProjectStore();
  return useStore(store, (s) => ({
    id: s.project.id,
    name: s.project.name,
    bpm: s.project.bpm,
    scaleRoot: s.project.scaleRoot,
    scaleName: s.project.scaleName,
    quantize: s.project.quantize,
    scenes: s.project.scenes,
    createdAt: s.project.createdAt,
    updatedAt: s.project.updatedAt,
  }));
}

/** Just the selected channel + setter. */
export function useSelectedChannel() {
  const store = useProjectStore();
  const selectedChannel = useStore(store, (s) => s.selectedChannel);
  const setSelectedChannel = useStore(store, (s) => s.setSelectedChannel);
  return { selectedChannel, setSelectedChannel };
}

/** Just the updatePattern action — stable reference, never causes re-renders on its own. */
export function useUpdatePattern() {
  const store = useProjectStore();
  return useStore(store, (s) => s.updatePattern);
}
