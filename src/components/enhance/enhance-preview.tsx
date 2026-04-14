"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEQTRAK_TRACKS, STEPS_PER_BAR, getTrackSolidClass } from "@/lib/midi/constants";
import type { SeqtrackChannel } from "@/lib/midi/types";
import type { EnhanceResult } from "@/hooks/use-enhance";

// ── Mini Step Grid ───────────────────────────────────────────────

function MiniStepGrid({ notes, bars, channel }: {
  notes: { step: number }[];
  bars: number;
  channel: number;
}) {
  const totalSteps = bars * STEPS_PER_BAR;
  const noteSteps = new Set(notes.map((n) => n.step));

  const dotSize =
    totalSteps <= 16 ? "size-[6px]" :
    totalSteps <= 32 ? "size-[5px]" :
    totalSteps <= 64 ? "size-[4px]" :
    "size-[3px]";

  return (
    <div className="flex gap-px">
      {Array.from({ length: totalSteps }, (_, step) => {
        const isBarBoundary = step > 0 && step % STEPS_PER_BAR === 0;
        return (
          <div
            key={step}
            className={cn(
              dotSize,
              "rounded-[1px]",
              isBarBoundary && "ml-px",
              noteSteps.has(step)
                ? getTrackSolidClass(channel as SeqtrackChannel)
                : "bg-foreground/5",
            )}
          />
        );
      })}
    </div>
  );
}

// ── Enhance Preview ──────────────────────────────────────────────

interface EnhancePreviewProps {
  result: EnhanceResult;
  onApply: () => void;
  onTryAgain: () => void;
  onSuggestion: (suggestion: string) => void;
}

export function EnhancePreview({
  result,
  onApply,
  onTryAgain,
  onSuggestion,
}: EnhancePreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Description */}
      <p className="text-sm text-muted-foreground">{result.description}</p>

      {/* Per-channel results */}
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        {result.tracks.map((t) => {
          const ch = t.channel as SeqtrackChannel;
          const trackInfo = SEQTRAK_TRACKS[ch];
          if (!trackInfo) return null;

          const noteCount = t.patterns.reduce(
            (sum, p) => sum + p.notes.length, 0,
          );
          const bars = t.patterns[0]?.bars ?? 1;
          const notes = t.patterns.flatMap((p) => p.notes);

          return (
            <div key={ch} className="flex items-center gap-3">
              {/* Colored dot + track name */}
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

              {/* Mini grid */}
              <div className="flex-1 min-w-0">
                <MiniStepGrid notes={notes} bars={bars} channel={ch} />
              </div>

              {/* Note count */}
              <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                {noteCount} {noteCount === 1 ? "note" : "notes"}
              </span>

              {/* Sound preset badge */}
              {t.soundPreset && (
                <Badge variant="secondary" className="shrink-0 max-w-[140px] truncate">
                  {t.soundPreset.name}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Reasons (if any tracks have them) */}
      {result.tracks.some((t) => t.reason) && (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {result.tracks
            .filter((t) => t.reason)
            .map((t) => {
              const trackInfo = SEQTRAK_TRACKS[t.channel as SeqtrackChannel];
              return (
                <p key={t.channel}>
                  <span className="font-medium text-foreground/70">
                    {trackInfo?.name}:
                  </span>{" "}
                  {t.reason}
                </p>
              );
            })}
        </div>
      )}

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
              onClick={() => onSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onTryAgain}>
          Try Again
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={onApply}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
