"use client";

import { Badge } from "@/components/ui/badge";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import type { SeqtrackChannel } from "@/lib/midi/types";
import type { PairedNote, TimelineSelection } from "@/lib/recording/types";

interface SelectionInspectorProps {
  selection: TimelineSelection | null;
  notes: PairedNote[];
  bpm: number;
}

function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function getNotesInSelection(
  notes: PairedNote[],
  selection: TimelineSelection,
): PairedNote[] {
  return notes.filter(
    (n) => n.startMs >= selection.startMs && n.startMs < selection.endMs,
  );
}

function getChannelBreakdown(
  notes: PairedNote[],
): { channel: number; name: string; count: number }[] {
  const counts = new Map<number, number>();
  for (const note of notes) {
    counts.set(note.channel, (counts.get(note.channel) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([channel, count]) => {
      const track = SEQTRAK_TRACKS[channel as SeqtrackChannel];
      const name = track?.name ?? `Ch ${channel}`;
      return { channel, name, count };
    });
}

export function SelectionInspector({
  selection,
  notes,
  bpm,
}: SelectionInspectorProps) {
  if (!selection) {
    return (
      <div className="px-3 py-2 border-t">
        <span className="text-[10px] text-muted-foreground">
          Click and drag on the timeline to select a region
        </span>
      </div>
    );
  }

  const durationMs = selection.endMs - selection.startMs;
  const durationSec = durationMs / 1000;
  const beats = (durationMs / 60000) * bpm;
  const selectedNotes = getNotesInSelection(notes, selection);
  const breakdown = getChannelBreakdown(selectedNotes);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t flex-wrap">
      <Badge variant="outline" className="text-[10px] font-mono h-5">
        {formatTime(selection.startMs)} — {formatTime(selection.endMs)}
      </Badge>
      <Badge variant="outline" className="text-[10px] font-mono h-5">
        {durationSec.toFixed(1)}s
      </Badge>
      <Badge variant="outline" className="text-[10px] font-mono h-5">
        {beats.toFixed(1)} beats
      </Badge>
      <Badge variant="secondary" className="text-[10px] font-mono h-5">
        {selectedNotes.length} note{selectedNotes.length !== 1 ? "s" : ""}
      </Badge>

      {breakdown.length > 0 && (
        <>
          <span className="text-[10px] text-muted-foreground">|</span>
          {breakdown.map(({ channel, name, count }) => (
            <Badge
              key={channel}
              variant="outline"
              className="text-[10px] font-mono h-5"
            >
              {name}: {count}
            </Badge>
          ))}
        </>
      )}
    </div>
  );
}
