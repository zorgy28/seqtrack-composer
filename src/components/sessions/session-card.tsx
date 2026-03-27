"use client";

import { Trash2, Play, Clock, Music, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RecordingSessionMeta } from "@/lib/recording/types";

interface SessionCardProps {
  session: RecordingSessionMeta;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function SessionCard({ session, onOpen, onDelete }: SessionCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">
            {session.name}
          </span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono">
              {session.bpm} BPM
            </Badge>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Clock className="size-3" />
              {formatDuration(session.durationMs)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Music className="size-3" />
              {session.midiEventCount}
            </span>
            {session.hasAudio && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <Volume2 className="size-3" />
                Audio
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatRelativeTime(session.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-1 ml-3 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onOpen(session.id)}
          >
            <Play className="size-3 mr-1" />
            Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive"
            onClick={() => onDelete(session.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
