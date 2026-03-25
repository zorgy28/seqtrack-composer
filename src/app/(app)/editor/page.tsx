"use client";

import { useState, useCallback, useRef } from "react";
import { Sparkles, Play, Square, FileMusic } from "lucide-react";
import { StepGrid } from "@/components/editor/step-grid";
import { useProject } from "@/providers/project-provider";
import { applyDrumPatternToProject, createEmptyProject } from "@/lib/midi/pattern-generators";
import { DRUM_STYLES, ALL_CHANNELS } from "@/lib/midi/constants";
import type { DrumStyle, SeqtrackChannel } from "@/lib/midi/types";
import { downloadMidi } from "@/lib/midi/midi-export";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { Button } from "@/components/ui/button";
import { EnhanceDialog } from "@/components/enhance/enhance-dialog";
import { ImportDialog } from "@/components/editor/import-dialog";

export default function EditorPage() {
  const { project, setProject } = useProject();
  const { device } = useMidiConnection();
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const cancelPlayRef = useRef<(() => void) | null>(null);

  // Live ref to project so the player can read current state each tick
  const projectRef = useRef(project);
  projectRef.current = project;

  const handleGenerateDrum = (style: DrumStyle) => {
    const updated = applyDrumPatternToProject(project, style, 1);
    setProject(updated);
  };

  const handleClearAll = () => {
    setProject(createEmptyProject(project.name));
  };

  const handleTogglePlay = useCallback(async () => {
    if (isPlaying) {
      cancelPlayRef.current?.();
      cancelPlayRef.current = null;
      setIsPlaying(false);
      setCurrentStep(null);
      return;
    }

    if (!device) return;

    const { playPatternLoopedWithCursor } = await import("@/lib/webmidi/midi-sender");

    // Initial tracks for total steps calculation
    const initialTracks: Array<{ pattern: { bars: number; notes: Array<{ pitch: number; velocity: number; step: number; duration: number; probability: number }>; name: string; swing: number }; channel: SeqtrackChannel }> = [];

    for (const ch of ALL_CHANNELS) {
      const track = project.tracks[ch];
      const pattern = track.patterns[track.activePattern];
      if (pattern.notes.length > 0) {
        initialTracks.push({ pattern, channel: ch });
      }
    }

    if (initialTracks.length === 0) return;

    setIsPlaying(true);
    const cancel = playPatternLoopedWithCursor(
      device.id,
      initialTracks,
      project.bpm,
      (step) => setCurrentStep(step),
      // Live state getter — called every tick for real-time mute/edit
      () => {
        const p = projectRef.current;
        const liveTracks = ALL_CHANNELS.map((ch) => {
          const track = p.tracks[ch];
          const pattern = track.patterns[track.activePattern];
          return { pattern, channel: ch, muted: track.muted || pattern.notes.length === 0, volume: track.volume };
        });
        return { tracks: liveTracks, bpm: p.bpm };
      },
    );
    cancelPlayRef.current = cancel;
  }, [device, project, isPlaying]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
        <span className="text-sm font-medium">Presets:</span>
        <div className="flex gap-1 flex-wrap">
          {DRUM_STYLES.map((style) => (
            <Button
              key={style}
              variant="outline"
              size="sm"
              className="h-7 text-xs font-mono"
              onClick={() => handleGenerateDrum(style)}
            >
              {style.replace("_", " ")}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setEnhanceOpen(true)}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          Enhance
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setImportOpen(true)}
        >
          <FileMusic className="w-3 h-3 mr-1" />
          Import
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleClearAll}
        >
          Clear
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => downloadMidi(project)}
        >
          Export .mid
        </Button>
        {device && (
          <Button
            size="sm"
            className="h-7 text-xs"
            variant={isPlaying ? "destructive" : "default"}
            onClick={handleTogglePlay}
          >
            {isPlaying ? (
              <><Square className="w-3 h-3 mr-1" /> Stop</>
            ) : (
              <><Play className="w-3 h-3 mr-1" /> Play</>
            )}
          </Button>
        )}
      </div>

      {/* Step Grid */}
      <div className="flex-1 overflow-auto p-3 pb-20">
        <StepGrid currentStep={currentStep} />
      </div>

      <EnhanceDialog open={enhanceOpen} onOpenChange={setEnhanceOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
