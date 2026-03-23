"use client";

import { useState, useCallback } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useEnhance, type EnhanceAction } from "@/hooks/use-enhance";
import { useProject } from "@/providers/project-provider";
import { useSoundControl } from "@/hooks/use-sound-control";
import { getAllPresets } from "@/lib/midi/sound-library";
import type { SeqtrackChannel } from "@/lib/midi/types";
import { EnhancePreview } from "./enhance-preview";

// ── Constants ────────────────────────────────────────────────────

const QUICK_PRESETS: { label: string; instruction: string; action?: EnhanceAction }[] = [
  { label: "Add swing", instruction: "Add swing to hi-hats and percussion" },
  { label: "Ghost notes", instruction: "Add ghost notes to snare and hats for groove" },
  { label: "More variation", instruction: "Add variation and fills at bar endings" },
  { label: "Make darker", instruction: "Make the overall feel darker and heavier" },
  { label: "Trap sounds", instruction: "Choose trap-style sounds for all channels", action: "sounds" },
  { label: "House sounds", instruction: "Choose classic house sounds", action: "sounds" },
  { label: "Lo-fi vibes", instruction: "Choose lo-fi hip hop sounds and add swing", action: "all" },
];

const ACTIONS: { value: EnhanceAction; label: string; desc: string }[] = [
  { value: "enhance", label: "Enhance", desc: "Improve patterns" },
  { value: "sounds", label: "Sounds", desc: "Choose presets" },
  { value: "rearrange", label: "Rearrange", desc: "Optimize mix" },
  { value: "all", label: "All", desc: "Everything" },
];

// ── Component ────────────────────────────────────────────────────

interface EnhanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhanceDialog({ open, onOpenChange }: EnhanceDialogProps) {
  const { stage, result, error, run, reset } = useEnhance();
  const { project, setProject } = useProject();
  const { selectPreset } = useSoundControl();

  const [instruction, setInstruction] = useState("");
  const [action, setAction] = useState<EnhanceAction>("enhance");

  // ── Handlers ─────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    if (!instruction.trim()) return;
    void run(project, instruction.trim(), action);
  }, [project, instruction, action, run]);

  const handleQuickPreset = useCallback(
    (preset: typeof QUICK_PRESETS[number]) => {
      setInstruction(preset.instruction);
      if (preset.action) setAction(preset.action);
      void run(project, preset.instruction, preset.action ?? action);
    },
    [project, action, run],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      setInstruction(suggestion);
      void run(project, suggestion, action);
    },
    [project, action, run],
  );

  const handleTryAgain = useCallback(() => {
    reset();
  }, [reset]);

  const handleApply = useCallback(() => {
    if (!result) return;

    // Build new project with enhanced tracks
    const updatedProject = { ...project };
    const updatedTracks = { ...updatedProject.tracks };

    for (const t of result.tracks) {
      const ch = t.channel as SeqtrackChannel;
      const existing = { ...updatedTracks[ch] };
      if (t.patterns.length > 0) {
        existing.patterns = [...existing.patterns];
        existing.patterns[existing.activePattern] = t.patterns[0];
      }
      updatedTracks[ch] = existing;

      // Apply sound preset if recommended
      if (t.soundPreset) {
        const fullPreset = getAllPresets().find((p) => p.id === t.soundPreset!.id);
        if (fullPreset) {
          void selectPreset(ch, fullPreset);
        }
      }
    }

    updatedProject.tracks = updatedTracks;
    if (result.bpm) updatedProject.bpm = result.bpm;
    updatedProject.updatedAt = new Date().toISOString();

    setProject(updatedProject);
    onOpenChange(false);
    reset();
  }, [result, project, setProject, selectPreset, onOpenChange, reset]);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && stage === "loading") return;
      if (!nextOpen) {
        reset();
        setInstruction("");
        setAction("enhance");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset, stage],
  );

  const handleForceClose = useCallback(() => {
    reset();
    setInstruction("");
    setAction("enhance");
    onOpenChange(false);
  }, [onOpenChange, reset]);

  // ── Render ───────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <DialogTitle>Enhance Project</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleForceClose}
            >
              <X />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <DialogDescription>
            {stage === "idle" &&
              "Describe how you want to improve your patterns, sounds, or arrangement."}
            {stage === "loading" &&
              "Enhancing your project... Do not close this window."}
            {stage === "preview" &&
              "Review the suggested changes before applying."}
            {stage === "error" &&
              "Something went wrong. You can try again with a different instruction."}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="min-h-[180px]">
          {/* ── Idle: Input form ─────────────────────────────── */}
          {stage === "idle" && (
            <div className="flex flex-col gap-4">
              {/* Instruction textarea */}
              <Textarea
                placeholder="e.g. Add ghost notes and make the groove more complex..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleRun();
                  }
                }}
                className="min-h-[72px] resize-none"
              />

              {/* Action selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Mode
                </span>
                <div className="flex gap-1">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAction(a.value)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs transition-colors",
                        action === a.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span className="font-medium">{a.label}</span>
                      <span className="text-[10px] opacity-70">{a.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Quick presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="inline-flex h-6 items-center rounded-full border border-border bg-muted/50 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      onClick={() => handleQuickPreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Go button */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!instruction.trim()}
                  onClick={handleRun}
                  className="gap-1.5"
                >
                  <Sparkles className="size-3" data-icon="inline-start" />
                  Enhance
                </Button>
              </div>
            </div>
          )}

          {/* ── Loading: Spinner ─────────────────────────────── */}
          {stage === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enhancing...</p>
              <p className="text-xs text-muted-foreground/70 max-w-sm text-center">
                &ldquo;{instruction}&rdquo;
              </p>
            </div>
          )}

          {/* ── Preview: Results ─────────────────────────────── */}
          {stage === "preview" && result && (
            <EnhancePreview
              result={result}
              onApply={handleApply}
              onTryAgain={handleTryAgain}
              onSuggestion={handleSuggestion}
            />
          )}

          {/* ── Error ────────────────────────────────────────── */}
          {stage === "error" && (
            <div className="flex flex-col gap-3 rounded-lg bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTryAgain}
                className="w-fit"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
