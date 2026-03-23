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

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<Project>(() => createEmptyProject());
  const [selectedChannel, setSelectedChannel] = useState<SeqtrackChannel>(1);

  const setProject = useCallback((p: Project) => {
    setProjectState({ ...p, updatedAt: new Date().toISOString() });
  }, []);

  const updatePattern = useCallback(
    (channel: SeqtrackChannel, patternIndex: number, pattern: Pattern) => {
      setProjectState((prev) => {
        const track = { ...prev.tracks[channel] };
        const patterns = [...track.patterns];
        patterns[patternIndex] = pattern;
        track.patterns = patterns;
        return {
          ...prev,
          tracks: { ...prev.tracks, [channel]: track },
          updatedAt: new Date().toISOString(),
        };
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
