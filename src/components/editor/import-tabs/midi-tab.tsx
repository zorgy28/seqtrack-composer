"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportResult, ImportTrackInfo } from "@/lib/import/types";
import type { SeqtrackChannel, SoundPreset } from "@/lib/midi/types";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { getPresetsForChannel, findPresetById } from "@/lib/midi/sound-library";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MIDI_ACCEPTED_EXTENSIONS = [".mid", ".midi"];

export interface MidiTabProps {
  onResult: (result: ImportResult) => void;
  onError: (error: string) => void;
  disabled: boolean;
  /** The parsed ImportResult — passed back for rendering the mapping table */
  importResult?: ImportResult | null;
  /** Called when the user changes preset selections in the mapping table */
  onPresetSelectionsChange?: (selections: Partial<Record<SeqtrackChannel, number>>) => void;
}

export function MidiTab({
  onResult,
  onError,
  disabled,
  importResult,
  onPresetSelectionsChange,
}: MidiTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Local state for preset selections, initialized from trackInfos
  const [selections, setSelections] = useState<Partial<Record<SeqtrackChannel, number>>>({});

  const handleFile = useCallback(async (file: File) => {
    try {
      const { parseMidiFile } = await import("@/lib/import/midi-import");
      const buffer = await file.arrayBuffer();
      const result = await parseMidiFile(buffer);

      // Initialize selections from suggested presets
      const initial: Partial<Record<SeqtrackChannel, number>> = {};
      if (result.trackInfos) {
        for (const track of result.trackInfos) {
          if (!track.isDrum && track.suggestedPresetId != null) {
            initial[track.seqtrackChannel] = track.suggestedPresetId;
          }
        }
      }
      setSelections(initial);
      onPresetSelectionsChange?.(initial);

      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to parse MIDI file");
    }
  }, [onResult, onError, onPresetSelectionsChange]);

  const handlePresetChange = useCallback((channel: SeqtrackChannel, presetId: number) => {
    setSelections((prev) => {
      const next = { ...prev, [channel]: presetId };
      onPresetSelectionsChange?.(next);
      return next;
    });
  }, [onPresetSelectionsChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const trackInfos = importResult?.trackInfos;

  return (
    <div className="flex flex-col gap-3">
      {/* File drop zone */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 transition-colors",
          trackInfos ? "py-4" : "py-8",
          "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
          isDragOver && "border-primary bg-primary/5 text-foreground",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className={trackInfos ? "size-5" : "size-7"} />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragOver ? "Drop to import" : trackInfos ? "Drop another MIDI file to replace" : "Drop MIDI file here or click to browse"}
          </p>
          {!trackInfos && (
            <p className="mt-1 text-xs text-muted-foreground">
              Standard MIDI File (.mid)
            </p>
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={MIDI_ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
        disabled={disabled}
      />

      {/* Track mapping table */}
      {trackInfos && trackInfos.length > 0 && (
        <TrackMappingTable
          trackInfos={trackInfos}
          selections={selections}
          onPresetChange={handlePresetChange}
        />
      )}
    </div>
  );
}

// ── Track Mapping Table ──────────────────────────────────────────────

interface TrackMappingTableProps {
  trackInfos: ImportTrackInfo[];
  selections: Partial<Record<SeqtrackChannel, number>>;
  onPresetChange: (channel: SeqtrackChannel, presetId: number) => void;
}

function TrackMappingTable({ trackInfos, selections, onPresetChange }: TrackMappingTableProps) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">Track Mapping</h4>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">MIDI Track</th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Channel</th>
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Notes</th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">SEQTRAK Sound</th>
            </tr>
          </thead>
          <tbody>
            {trackInfos.map((track, i) => (
              <TrackRow
                key={`${track.seqtrackChannel}-${i}`}
                track={track}
                selectedPresetId={selections[track.seqtrackChannel] ?? track.suggestedPresetId ?? undefined}
                onPresetChange={onPresetChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Track Row ────────────────────────────────────────────────────────

interface TrackRowProps {
  track: ImportTrackInfo;
  selectedPresetId?: number;
  onPresetChange: (channel: SeqtrackChannel, presetId: number) => void;
}

function TrackRow({ track, selectedPresetId, onPresetChange }: TrackRowProps) {
  const channelInfo = SEQTRAK_TRACKS[track.seqtrackChannel];
  const channelLabel = track.isDrum ? "Ch 1-7" : `Ch ${track.seqtrackChannel}`;

  // Build preset options for melodic channels
  const presetOptions = useMemo(() => {
    if (track.isDrum) return [];
    return getPresetsForChannel(track.seqtrackChannel);
  }, [track.isDrum, track.seqtrackChannel]);

  // Group presets by category for the dropdown
  const groupedPresets = useMemo(() => {
    if (presetOptions.length === 0) return new Map<string, SoundPreset[]>();
    const groups = new Map<string, SoundPreset[]>();
    for (const p of presetOptions) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return groups;
  }, [presetOptions]);

  const selectedPreset = selectedPresetId != null ? findPresetById(selectedPresetId) : null;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-2 py-1.5 font-medium truncate max-w-[140px]" title={track.name}>
        {track.name}
      </td>
      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
        {channelLabel}
        {!track.isDrum && (
          <span className="ml-1 text-muted-foreground/60">{channelInfo?.name}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
        {track.noteCount.toLocaleString()}
      </td>
      <td className="px-2 py-1.5">
        {track.isDrum ? (
          <span className="text-muted-foreground italic">Auto-mapped</span>
        ) : (
          <Select
            value={selectedPresetId != null ? String(selectedPresetId) : ""}
            onValueChange={(val) => val && onPresetChange(track.seqtrackChannel, parseInt(val, 10))}
          >
            <SelectTrigger size="sm" className="h-6 min-w-0 w-full text-xs">
              <SelectValue>
                {selectedPreset?.name ?? "Select sound..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {Array.from(groupedPresets.entries()).map(([category, presets]) => (
                <SelectGroup key={category}>
                  <SelectLabel>{category}</SelectLabel>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={String(preset.id)}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
    </tr>
  );
}
