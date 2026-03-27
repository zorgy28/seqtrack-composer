"use client";

import { useState } from "react";
import { Play, Square, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SEQTRAK_TRACKS, STEPS_PER_BAR, getTrackSolidClass } from "@/lib/midi/constants";
import type { SeqtrackChannel } from "@/lib/midi/types";
import type { CompositionOutput } from "@/lib/ai/schema";

// ── Mini Step Row ───────────────────────────────────────────────

function MiniStepRow({
  notes,
  bars,
  channel,
  currentStep,
}: {
  notes: { step: number }[];
  bars: number;
  channel: number;
  currentStep: number | null;
}) {
  const totalSteps = bars * STEPS_PER_BAR;
  const noteSteps = new Set(notes.map((n) => n.step));

  const dotSize =
    totalSteps <= 16
      ? "size-[6px]"
      : totalSteps <= 32
        ? "size-[5px]"
        : totalSteps <= 64
          ? "size-[4px]"
          : "size-[3px]";

  return (
    <div className="flex gap-px">
      {Array.from({ length: totalSteps }, (_, step) => {
        const isBarBoundary = step > 0 && step % STEPS_PER_BAR === 0;
        const isActive = noteSteps.has(step);
        const isCurrent = currentStep != null && step === currentStep;
        return (
          <div
            key={step}
            className={cn(
              dotSize,
              "rounded-[1px] transition-colors",
              isBarBoundary && "ml-px",
              isActive
                ? getTrackSolidClass(channel as SeqtrackChannel)
                : "bg-foreground/5",
              isCurrent && "ring-1 ring-primary bg-primary/40",
            )}
          />
        );
      })}
    </div>
  );
}

// ── Types ───────────────────────────────────────────────────────

export interface ComposeResultsProps {
  result: CompositionOutput;
  projectBpm: number;
  isPlaying: boolean;
  currentStep: number | null;
  onPreview: () => void;
  onApply: () => void;
  onApplyAndEdit: () => void;
  onRefine: (instruction: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  onReuseDescription?: (description: string) => void;
}

// ── Component ───────────────────────────────────────────────────

export function ComposeResults({
  result,
  projectBpm,
  isPlaying,
  currentStep,
  onPreview,
  onApply,
  onApplyAndEdit,
  onRefine,
  onSuggestionClick,
  onReuseDescription,
}: ComposeResultsProps) {
  const [refineText, setRefineText] = useState("");

  const handleRefine = () => {
    const text = refineText.trim();
    if (!text) return;
    setRefineText("");
    onRefine(text);
  };

  // Filter to tracks that actually have notes
  const activeTracks = result.tracks.filter(
    (t) => t.patterns[0] && t.patterns[0].notes.length > 0,
  );

  const displayBpm = result.bpm ?? projectBpm;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      {/* Description */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground flex-1">{result.description}</p>
        {onReuseDescription && (
          <button
            type="button"
            onClick={() => onReuseDescription(result.description)}
            className="shrink-0 text-[11px] text-muted-foreground/60 hover:text-primary transition-colors"
            title="Use as prompt"
          >
            ↩ Use as prompt
          </button>
        )}
      </div>

      {/* Per-track rows */}
      {activeTracks.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3">
          {activeTracks.map((t) => {
            const ch = t.channel as SeqtrackChannel;
            const trackInfo = SEQTRAK_TRACKS[ch];
            if (!trackInfo) return null;

            const pattern = t.patterns[0];
            const noteCount = pattern?.notes.length ?? 0;
            const bars = pattern?.bars ?? 1;
            const notes = pattern?.notes ?? [];

            return (
              <div key={ch} className="flex items-center gap-3">
                {/* Color dot + track name */}
                <div className="flex items-center gap-2 w-20 shrink-0">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      getTrackSolidClass(ch),
                    )}
                  />
                  <span className="text-xs font-medium truncate">
                    {trackInfo.name}
                  </span>
                </div>

                {/* Mini step row */}
                <div className="flex-1 min-w-0">
                  <MiniStepRow
                    notes={notes}
                    bars={bars}
                    channel={ch}
                    currentStep={currentStep}
                  />
                </div>

                {/* Note count */}
                <span className="text-xs text-muted-foreground w-14 text-right shrink-0 tabular-nums">
                  {noteCount} {noteCount === 1 ? "note" : "notes"}
                </span>

                {/* Sound preset badge with tooltip for reason */}
                {t.soundPreset && (
                  t.reason ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="secondary"
                          className="shrink-0 max-w-[140px] truncate cursor-default"
                        >
                          {t.soundPreset.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t.reason}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="shrink-0 max-w-[140px] truncate"
                    >
                      {t.soundPreset.name}
                    </Badge>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Metadata badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="font-mono tabular-nums">
          {displayBpm} BPM
        </Badge>
        {result.tracks[0]?.patterns[0]?.bars && (
          <Badge variant="outline" className="font-mono tabular-nums">
            {result.tracks[0].patterns[0].bars} {result.tracks[0].patterns[0].bars === 1 ? "bar" : "bars"}
          </Badge>
        )}
      </div>

      {/* Actions: Preview / Apply / Apply & Edit */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="gap-1.5"
        >
          {isPlaying ? (
            <>
              <Square className="size-3" />
              Stop
            </>
          ) : (
            <>
              <Play className="size-3" />
              Preview
            </>
          )}
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onApply}>
          Apply
        </Button>
        <Button size="sm" onClick={onApplyAndEdit} className="gap-1.5">
          Apply &amp; Edit
          <ArrowRight className="size-3" />
        </Button>
      </div>

      {/* Refine section */}
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Refine
        </span>
        <Textarea
          value={refineText}
          onChange={(e) => setRefineText(e.target.value)}
          placeholder="Add more ghost notes, make the bass darker, increase hi-hat density..."
          className="min-h-[60px] text-xs"
          onKeyDown={(e) => {
            if (e.metaKey && e.key === "Enter") handleRefine();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefine}
          disabled={!refineText.trim()}
          className="w-fit gap-1.5"
        >
          <RefreshCw className="size-3" />
          Refine
        </Button>
      </div>

      {/* Suggestion chips */}
      {result.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center mr-1">
            Try next:
          </span>
          {result.suggestions.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              className="inline-flex h-6 items-center rounded-full border border-border bg-muted/50 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
