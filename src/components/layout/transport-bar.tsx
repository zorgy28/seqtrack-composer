"use client";

import { Play, Square, SkipBack, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransport } from "@/providers/transport-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { Button } from "@/components/ui/button";

export function TransportBar() {
  const { isPlaying, currentStep, totalSteps, play, stop, seek, recordState, recordingElapsedMs, armRecord, startRecord, stopRecord } = useTransport();
  const { device } = useMidiConnection();

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-t border-border bg-card/50 shrink-0">
      {/* Record button */}
      <Button
        size="icon-xs"
        variant="ghost"
        className={cn(
          "h-6 w-6",
          recordState === "armed" && "animate-pulse",
          recordState === "recording" && "bg-red-600 hover:bg-red-700 text-white",
        )}
        onClick={
          recordState === "recording"
            ? stopRecord
            : recordState === "armed"
              ? () => startRecord()
              : recordState === "idle" || recordState === "complete" || recordState === "error"
                ? armRecord
                : undefined
        }
        disabled={!device || recordState === "stopping"}
      >
        <Circle
          className={cn(
            "size-3",
            (recordState === "idle" || recordState === "complete" || recordState === "error") && "text-red-500",
            recordState === "armed" && "text-red-500 fill-red-500",
            recordState === "recording" && "fill-white text-white",
          )}
        />
      </Button>

      {/* Play / Stop */}
      <Button
        size="icon-xs"
        variant={isPlaying ? "destructive" : "default"}
        className="h-6 w-6"
        onClick={isPlaying ? stop : play}
        disabled={!device && !isPlaying}
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

      {/* Step position / Recording timer */}
      {recordState === "recording" ? (
        <>
          <span className="text-[10px] font-mono text-red-500 font-bold">REC</span>
          <span className="text-[10px] font-mono text-red-400">
            {formatRecordingTime(recordingElapsedMs)}
          </span>
        </>
      ) : isPlaying && currentStep !== null ? (
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

function formatRecordingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
