"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SeqtrackChannel } from "@/lib/midi/types";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import type { SoundRecommendation as SoundRec } from "./option-card";

const CHANNEL_BADGE_COLORS: Record<number, string> = {
  1: "bg-red-500/20 text-red-400",
  2: "bg-yellow-500/20 text-yellow-400",
  3: "bg-fuchsia-500/20 text-fuchsia-400",
  4: "bg-cyan-500/20 text-cyan-400",
  5: "bg-blue-500/20 text-blue-400",
  6: "bg-green-500/20 text-green-400",
  7: "bg-slate-500/20 text-slate-400",
  8: "bg-purple-500/20 text-purple-400",
  9: "bg-teal-500/20 text-teal-400",
  10: "bg-amber-500/20 text-amber-400",
  11: "bg-emerald-500/20 text-emerald-400",
};

interface SoundRecommendationProps {
  channel: SeqtrackChannel;
  soundPreset: SoundRec;
  alternatives: SoundRec[];
  onSelect: (id: number) => void;
}

export function SoundRecommendation({
  channel,
  soundPreset,
  alternatives,
  onSelect,
}: SoundRecommendationProps) {
  const trackInfo = SEQTRAK_TRACKS[channel];
  const badgeColor = CHANNEL_BADGE_COLORS[channel] ?? "bg-muted text-muted-foreground";

  // All options: current + alternatives (deduplicated)
  const allOptions = [soundPreset, ...alternatives.filter((a) => a.id !== soundPreset.id)];

  return (
    <div className="flex items-center gap-2">
      {/* Channel badge */}
      <span
        className={cn(
          "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium",
          badgeColor
        )}
      >
        {trackInfo.name}
      </span>

      {/* Sound select */}
      {allOptions.length > 1 ? (
        <Select
          value={soundPreset.id}
          onValueChange={(val) => onSelect(val as number)}
        >
          <SelectTrigger size="sm" className="h-6 min-w-0 flex-1 text-xs">
            <SelectValue>{soundPreset.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allOptions.map((sound) => (
              <SelectItem key={sound.id} value={sound.id}>
                {sound.name}
                <span className="ml-1 text-muted-foreground">({sound.category})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="truncate text-xs text-foreground/80">{soundPreset.name}</span>
      )}
    </div>
  );
}
