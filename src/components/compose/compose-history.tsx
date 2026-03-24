"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────

interface ComposeHistoryProps {
  history: Array<{
    params: { prompt: string };
    result: { description: string; tracks: unknown[] };
    timestamp: number;
  }>;
  onRestore: (index: number) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Component ────────────────────────────────────────────────────

export function ComposeHistory({ history, onRestore }: ComposeHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={cn(
            "size-3 transition-transform",
            !expanded && "-rotate-90",
          )}
        />
        <span className="font-medium">
          Recent ({history.length})
        </span>
      </button>

      {/* History list */}
      {expanded && (
        <div className="flex flex-col gap-0.5 pl-1">
          {history.map((entry, index) => {
            const trackCount = entry.result.tracks.length;
            return (
              <div
                key={entry.timestamp}
                className="group flex items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
              >
                {/* Connector */}
                <span className="text-muted-foreground/40 select-none">
                  {index === history.length - 1 ? "\u2514" : "\u251C"}
                </span>

                {/* Prompt + meta */}
                <span className="flex-1 truncate text-muted-foreground">
                  &ldquo;{truncate(entry.params.prompt, 40)}&rdquo;
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground/60">
                  {trackCount} {trackCount === 1 ? "track" : "tracks"}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground/60">
                  {relativeTime(entry.timestamp)}
                </span>

                {/* Restore button */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(index);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <RotateCcw className="size-3" />
                  <span className="sr-only">Restore</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
