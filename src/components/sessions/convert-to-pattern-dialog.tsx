"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  SEQTRAK_TRACKS,
  ALL_CHANNELS,
  getTrackSolidClass,
} from "@/lib/midi/constants";
import type { RecordedMidiEvent, TimelineSelection } from "@/lib/recording/types";
import type { SeqtrackChannel, Pattern } from "@/lib/midi/types";

// ── Constants ────────────────────────────────────────────────────

const GRID_OPTIONS = [
  { value: "1/32", label: "1/32" },
  { value: "1/16", label: "1/16" },
  { value: "1/8", label: "1/8" },
  { value: "1/4", label: "1/4" },
] as const;

const BAR_OPTIONS = [1, 2, 4, 8] as const;

// ── Props ────────────────────────────────────────────────────────

interface ConvertToPatternDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  midiEvents: RecordedMidiEvent[];
  selection: TimelineSelection;
  bpm: number;
  onApply: (patterns: Map<SeqtrackChannel, Pattern>) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Auto-detect the number of bars from selection duration + BPM, clamped 1-8. */
function detectBars(selectionMs: number, bpm: number): number {
  const selectionSec = selectionMs / 1000;
  const barDurationSec = (60 / bpm) * 4;
  const bars = Math.ceil(selectionSec / barDurationSec);
  return Math.max(1, Math.min(8, bars)) as 1 | 2 | 4 | 8;
}

/** Snap to the nearest valid bar option. */
function snapToBars(n: number): number {
  const sorted = [...BAR_OPTIONS];
  let best = sorted[0];
  let bestDist = Math.abs(n - best);
  for (const opt of sorted) {
    const dist = Math.abs(n - opt);
    if (dist < bestDist) {
      best = opt;
      bestDist = dist;
    }
  }
  return best;
}

interface ChannelInfo {
  midiChannel: number;
  noteCount: number;
  target: SeqtrackChannel;
}

// ── Component ────────────────────────────────────────────────────

export function ConvertToPatternDialog({
  open,
  onOpenChange,
  midiEvents,
  selection,
  bpm,
  onApply,
}: ConvertToPatternDialogProps) {
  const selectionMs = selection.endMs - selection.startMs;

  // ── State ───────────────────────────────────────────────────
  const [quantizeGrid, setQuantizeGrid] = useState("1/16");
  const [bars, setBars] = useState(() =>
    snapToBars(detectBars(selectionMs, bpm)),
  );
  const [converting, setConverting] = useState(false);

  // ── Detect channels in selection ─────────────────────────────
  const detectedChannels = useMemo(() => {
    const counts = new Map<number, number>();
    for (const event of midiEvents) {
      if (
        event.type === "noteon" &&
        event.timestamp >= selection.startMs &&
        event.timestamp <= selection.endMs
      ) {
        counts.set(event.channel, (counts.get(event.channel) ?? 0) + 1);
      }
    }
    const result: ChannelInfo[] = [];
    for (const [midiChannel, noteCount] of counts) {
      // Default mapping: same channel if 1-11, otherwise first available
      const target: SeqtrackChannel =
        midiChannel >= 1 && midiChannel <= 11
          ? (midiChannel as SeqtrackChannel)
          : 1;
      result.push({ midiChannel, noteCount, target });
    }
    result.sort((a, b) => a.midiChannel - b.midiChannel);
    return result;
  }, [midiEvents, selection.startMs, selection.endMs]);

  // ── Channel mapping state ────────────────────────────────────
  const [channelMappings, setChannelMappings] = useState<
    Map<number, SeqtrackChannel>
  >(() => {
    const m = new Map<number, SeqtrackChannel>();
    for (const ch of detectedChannels) {
      m.set(ch.midiChannel, ch.target);
    }
    return m;
  });

  // Reset mappings when detected channels change (new selection)
  useMemo(() => {
    const m = new Map<number, SeqtrackChannel>();
    for (const ch of detectedChannels) {
      m.set(ch.midiChannel, ch.target);
    }
    setChannelMappings(m);
    setBars(snapToBars(detectBars(selectionMs, bpm)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedChannels]);

  const handleMappingChange = useCallback(
    (midiChannel: number, target: SeqtrackChannel) => {
      setChannelMappings((prev) => {
        const next = new Map(prev);
        next.set(midiChannel, target);
        return next;
      });
    },
    [],
  );

  // ── Summary stats ──────────────────────────────────────────
  const totalNotes = detectedChannels.reduce(
    (sum, ch) => sum + ch.noteCount,
    0,
  );
  const uniqueTargets = new Set(channelMappings.values()).size;

  // ── Apply handler ──────────────────────────────────────────
  const handleApply = useCallback(async () => {
    setConverting(true);
    try {
      const { convertSelectionToPatterns } = await import(
        "@/lib/recording/convert-to-pattern"
      );
      const patterns = convertSelectionToPatterns(midiEvents, {
        startMs: selection.startMs,
        endMs: selection.endMs,
        bpm,
        bars,
        quantizeGrid,
        channelMap: channelMappings,
      });
      onApply(patterns);
      onOpenChange(false);
    } finally {
      setConverting(false);
    }
  }, [
    midiEvents,
    selection,
    bpm,
    bars,
    quantizeGrid,
    channelMappings,
    onApply,
    onOpenChange,
  ]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert to Pattern</DialogTitle>
          <DialogDescription>
            Map the recorded MIDI data to SEQTRAK step-sequencer patterns.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* BPM + Grid + Bars row */}
          <div className="flex gap-3 items-end">
            {/* BPM (read-only) */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">BPM</span>
              <Badge variant="outline" className="font-mono text-xs">
                {bpm}
              </Badge>
            </div>

            {/* Grid Resolution */}
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-muted-foreground">
                Grid Resolution
              </span>
              <Select
                value={quantizeGrid}
                onValueChange={(v) => { if (v) setQuantizeGrid(v); }}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRID_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Bars */}
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-muted-foreground">Bars</span>
              <Select
                value={String(bars)}
                onValueChange={(v) => setBars(Number(v))}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAR_OPTIONS.map((b) => (
                    <SelectItem key={b} value={String(b)}>
                      {b} bar{b > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Channel Mapping */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Channel Mapping
            </span>
            {detectedChannels.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No notes found in the selected range.
              </p>
            ) : (
              <div className="space-y-2">
                {detectedChannels.map((ch) => {
                  const target = channelMappings.get(ch.midiChannel) ?? 1;
                  const dotColor = getTrackSolidClass(target);

                  return (
                    <div
                      key={ch.midiChannel}
                      className="flex items-center gap-3"
                    >
                      {/* Source */}
                      <div className="flex items-center gap-1.5 min-w-[100px]">
                        <span className="text-xs font-mono text-muted-foreground">
                          MIDI Ch {ch.midiChannel}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono"
                        >
                          {ch.noteCount}
                        </Badge>
                      </div>

                      {/* Arrow */}
                      <span className="text-muted-foreground text-xs">
                        &rarr;
                      </span>

                      {/* Target channel select */}
                      <div className="flex items-center gap-1.5 flex-1">
                        <span
                          className={cn(
                            "size-2.5 rounded-full shrink-0",
                            dotColor,
                          )}
                        />
                        <Select
                          value={String(target)}
                          onValueChange={(v) =>
                            handleMappingChange(
                              ch.midiChannel,
                              Number(v) as SeqtrackChannel,
                            )
                          }
                        >
                          <SelectTrigger size="sm" className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_CHANNELS.map((seqCh) => {
                              const info = SEQTRAK_TRACKS[seqCh];
                              return (
                                <SelectItem
                                  key={seqCh}
                                  value={String(seqCh)}
                                >
                                  Ch {seqCh} - {info.name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Summary */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span>
              {totalNotes} note{totalNotes !== 1 ? "s" : ""}
            </span>
            <span>&middot;</span>
            <span>
              {detectedChannels.length} channel
              {detectedChannels.length !== 1 ? "s" : ""}
            </span>
            <span>&middot;</span>
            <span>
              {uniqueTargets} pattern{uniqueTargets !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={converting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={
              converting || detectedChannels.length === 0 || totalNotes === 0
            }
          >
            {converting ? "Converting..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
