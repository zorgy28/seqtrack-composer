"use client";

import { Play, Square, SkipBack } from "lucide-react";
import { useTransport } from "@/providers/transport-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { Button } from "@/components/ui/button";

export function TransportBar() {
  const { isPlaying, currentStep, totalSteps, play, stop, seek } = useTransport();
  const { device } = useMidiConnection();

  if (!device) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-t border-border bg-card/50 shrink-0">
      {/* Play / Stop */}
      <Button
        size="icon-xs"
        variant={isPlaying ? "destructive" : "default"}
        className="h-6 w-6"
        onClick={isPlaying ? stop : play}
      >
        {isPlaying ? <Square className="size-3" /> : <Play className="size-3" />}
      </Button>

      {/* Rewind */}
      {isPlaying && (
        <Button
          size="icon-xs"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => seek(0)}
        >
          <SkipBack className="size-3" />
        </Button>
      )}

      {/* Step position */}
      {isPlaying && currentStep !== null ? (
        <>
          <span className="text-[10px] font-mono text-muted-foreground w-10">
            {Math.floor(currentStep / 16) + 1}:{(currentStep % 16) + 1}
          </span>
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStep}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1 accent-primary cursor-pointer max-w-64"
          />
          <span className="text-[10px] font-mono text-muted-foreground/50">
            {totalSteps}
          </span>
        </>
      ) : (
        <span className="text-[10px] text-muted-foreground">
          Stopped
        </span>
      )}
    </div>
  );
}
