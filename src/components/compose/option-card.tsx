"use client";

import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SeqtrackChannel, Note } from "@/lib/midi/types";
import { SEQTRAK_TRACKS, STEPS_PER_BAR, getTrackSolidClass } from "@/lib/midi/constants";

// ─── Types ────────────────────────────────────────────────────────

export interface SoundRecommendation {
  id: number;
  name: string;
  category: string;
}

export interface TranscriptionOption {
  mode: "faithful" | "simplified" | "creative";
  label: string;
  description: string;
  bpm: number;
  key: string;
  tracks: Partial<Record<SeqtrackChannel, {
    notes: Note[];
    bars: number;
    sound: SoundRecommendation;
    alternatives: SoundRecommendation[];
  }>>;
}

const MODE_STYLES: Record<string, { color: string; label: string }> = {
  faithful: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Faithful" },
  simplified: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Simplified" },
  creative: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Creative" },
};

// ─── Mini Step Grid ───────────────────────────────────────────────

function MiniStepGrid({
  tracks,
  currentStep,
}: {
  tracks: TranscriptionOption["tracks"];
  currentStep?: number | null;
}) {
  const channels = (Object.keys(SEQTRAK_TRACKS).map(Number) as SeqtrackChannel[]);

  // Calculate total steps from all bars across all tracks
  const maxBars = Math.max(1, ...Object.values(tracks).filter(Boolean).map((t) => t!.bars));
  const displaySteps = maxBars * STEPS_PER_BAR;

  // Scale dot size based on total steps
  const dotSize =
    displaySteps <= 16 ? "size-[6px]" :
    displaySteps <= 32 ? "size-[5px]" :
    displaySteps <= 64 ? "size-[4px]" :
    "size-[3px]";

  return (
    <div className="flex flex-col gap-px rounded-md bg-muted/30 p-1.5">
      {channels.map((ch) => {
        const trackData = tracks[ch];
        const notes = trackData?.notes ?? [];
        const noteSteps = new Set(notes.filter((n) => n.step < displaySteps).map((n) => n.step));

        return (
          <div key={ch} className="flex gap-px">
            {Array.from({ length: displaySteps }, (_, step) => {
              const isBarBoundary = step > 0 && step % STEPS_PER_BAR === 0;
              return (
                <div
                  key={step}
                  className={cn(
                    dotSize,
                    "rounded-[1px] transition-colors",
                    isBarBoundary && "ml-px",
                    noteSteps.has(step)
                      ? getTrackSolidClass(ch)
                      : "bg-foreground/5",
                    currentStep != null && step === currentStep && "ring-1 ring-primary bg-primary/40"
                  )}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sound Preset List ────────────────────────────────────────────

function SoundPresetList({
  tracks,
}: {
  tracks: TranscriptionOption["tracks"];
}) {
  const entries = (Object.entries(tracks) as [string, NonNullable<TranscriptionOption["tracks"][SeqtrackChannel]>][])
    .filter(([, data]) => data.notes.length > 0)
    .slice(0, 6); // Show at most 6 to keep compact

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {entries.map(([chStr, data]) => {
        const ch = Number(chStr) as SeqtrackChannel;
        const trackInfo = SEQTRAK_TRACKS[ch];
        return (
          <div key={ch} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                getTrackSolidClass(ch)
              )}
            />
            <span className="text-muted-foreground">{trackInfo.name}</span>
            <span className="flex-1 truncate text-foreground/80">
              {data.sound.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Option Card ──────────────────────────────────────────────────

interface OptionCardProps {
  option: TranscriptionOption;
  onPreview: () => void;
  onApply: () => void;
  currentStep?: number | null;
  isPlaying?: boolean;
}

export function OptionCard({ option, onPreview, onApply, currentStep, isPlaying }: OptionCardProps) {
  const modeStyle = MODE_STYLES[option.mode] ?? MODE_STYLES.faithful;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium",
              modeStyle.color
            )}
          >
            {modeStyle.label}
          </span>
        </div>
        <CardTitle className="mt-1">{option.label}</CardTitle>
        <CardDescription>{option.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Mini step grid */}
        <MiniStepGrid tracks={option.tracks} currentStep={currentStep} />

        {/* Sound presets */}
        <SoundPresetList tracks={option.tracks} />

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{option.bpm} BPM</Badge>
          <Badge variant="secondary">{option.key}</Badge>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onPreview} className="gap-1.5">
          {isPlaying ? (
            <>
              <Square className="size-3" data-icon="inline-start" />
              Stop
            </>
          ) : (
            <>
              <Play className="size-3" data-icon="inline-start" />
              Preview
            </>
          )}
        </Button>
        <Button size="sm" onClick={onApply} className="ml-auto">
          Apply
        </Button>
      </CardFooter>
    </Card>
  );
}
