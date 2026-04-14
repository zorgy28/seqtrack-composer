"use client";

import { useState } from "react";
import { useProject } from "@/providers/project-provider";
import { useTransport } from "@/providers/transport-provider";
import { BPM_MIN, BPM_MAX } from "@/lib/midi/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import { TranscribeDialog } from "@/components/compose/transcribe-dialog";
import { Logo } from "@/components/ui/logo";

export function AppHeader() {
  const { project, updateBpm } = useProject();
  const { recordState } = useTransport();
  const [transcribeOpen, setTranscribeOpen] = useState(false);

  return (
    <>
      <header className="relative flex items-center gap-4 px-4 h-12 border-b border-border shrink-0">
        {/* Orange accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />

        <span className="text-sm font-medium truncate max-w-[200px]">
          {project.name}
        </span>

        {recordState === "recording" && (
          <span className="size-2 rounded-full bg-red-500 animate-pulse" />
        )}

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">BPM</label>
          <input
            type="number"
            min={BPM_MIN}
            max={BPM_MAX}
            value={project.bpm}
            onChange={(e) => updateBpm(Math.max(BPM_MIN, Math.min(BPM_MAX, Number(e.target.value))))}
            className="w-14 h-7 bg-background border border-input rounded px-1.5 text-sm font-mono text-center"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs font-mono">
            {project.scaleRoot} {project.scaleName}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setTranscribeOpen(true)}
        >
          <Music className="w-4 h-4 mr-1.5" />
          Transcribe
        </Button>

        <div className="flex-1" />

        <Logo size="sm" />
      </header>

      <TranscribeDialog
        open={transcribeOpen}
        onOpenChange={setTranscribeOpen}
      />
    </>
  );
}
