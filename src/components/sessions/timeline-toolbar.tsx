"use client";

import { ZoomIn, ZoomOut, Scissors, Trash2, Grid3X3, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TimelineSelection } from "@/lib/recording/types";

interface TimelineToolbarProps {
  pixelsPerSecond: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selection: TimelineSelection | null;
  onTrim: () => void;
  onDeleteSection: () => void;
  onConvertToPattern: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  bpm: number;
}

function formatSelectionDuration(selection: TimelineSelection): string {
  const durationMs = selection.endMs - selection.startMs;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function TimelineToolbar({
  pixelsPerSecond,
  onZoomIn,
  onZoomOut,
  selection,
  onTrim,
  onDeleteSection,
  onConvertToPattern,
  snapEnabled,
  onToggleSnap,
}: TimelineToolbarProps) {
  const hasSelection = selection !== null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/30">
      {/* Zoom controls */}
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onZoomOut}>
        <ZoomOut className="size-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onZoomIn}>
        <ZoomIn className="size-3.5" />
      </Button>
      <span className="text-[10px] text-muted-foreground font-mono min-w-[42px] text-center">
        {Math.round(pixelsPerSecond)}px/s
      </span>

      <Separator orientation="vertical" className="h-4" />

      {/* Snap toggle */}
      <Button
        size="sm"
        variant="ghost"
        className={`h-7 w-7 p-0 ${snapEnabled ? "bg-primary/15 text-primary" : ""}`}
        onClick={onToggleSnap}
      >
        <Grid3X3 className="size-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-4" />

      {/* Selection info + actions */}
      {hasSelection ? (
        <Badge variant="secondary" className="text-[10px] font-mono h-5">
          Selected: {formatSelectionDuration(selection)}
        </Badge>
      ) : (
        <span className="text-[10px] text-muted-foreground">No selection</span>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        disabled={!hasSelection}
        onClick={onTrim}
      >
        <Scissors className="size-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-destructive"
        disabled={!hasSelection}
        onClick={onDeleteSection}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <Button
        size="sm"
        variant="default"
        className="h-7 text-xs ml-auto"
        disabled={!hasSelection}
        onClick={onConvertToPattern}
      >
        <Music className="size-3 mr-1" />
        Convert to Pattern
      </Button>
    </div>
  );
}
