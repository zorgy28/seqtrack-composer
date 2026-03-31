"use client";

import { memo } from "react";
import type { SoundPreset, MicroFreakUserPreset } from "@/lib/midi/types";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

function isUserPreset(p: SoundPreset | null): p is MicroFreakUserPreset {
  return !!p && "isUserPreset" in p && (p as MicroFreakUserPreset).isUserPreset === true;
}

export interface PresetRowProps {
  preset: SoundPreset | null;
  slotId: number;
  isSelected: boolean;
  isConnected: boolean;
  onSelect: (preset: SoundPreset) => void;
  onSelectEmpty: (slotId: number) => void;
}

export const PresetRow = memo(function PresetRow({
  preset,
  slotId,
  isSelected,
  isConnected,
  onSelect,
  onSelectEmpty,
}: PresetRowProps) {
  if (!preset) {
    return (
      <button
        onClick={() => onSelectEmpty(slotId)}
        disabled={!isConnected}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded transition-colors",
          isSelected
            ? "bg-muted/30 border border-dashed border-muted-foreground/30"
            : "hover:bg-muted/20",
          !isConnected && "opacity-30 cursor-not-allowed",
        )}
      >
        <span className="w-8 text-right tabular-nums text-muted-foreground/40">#{slotId}</span>
        <span className="italic text-muted-foreground/40">Empty</span>
      </button>
    );
  }

  const isUser = isUserPreset(preset);

  return (
    <button
      onClick={() => onSelect(preset)}
      disabled={!isConnected}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded transition-colors",
        isSelected
          ? "bg-primary/15 text-primary border border-primary/30"
          : "hover:bg-muted/50",
        !isConnected && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className={cn("w-8 text-right tabular-nums shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}>
        #{preset.id}
      </span>
      {isUser && <User className="w-3 h-3 shrink-0 text-orange-400" />}
      <span className="font-medium truncate flex-1">{preset.name}</span>
      <span className={cn(
        "text-[10px] shrink-0",
        isSelected ? "text-primary/70" : "text-muted-foreground/60",
      )}>
        {preset.category}
      </span>
    </button>
  );
});
