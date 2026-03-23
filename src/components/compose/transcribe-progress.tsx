"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TranscriptionStage =
  | "extracting"
  | "separating"
  | "transcribing"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

interface StageInfo {
  id: TranscriptionStage;
  label: string;
  urlOnly?: boolean;
}

const STAGES: StageInfo[] = [
  { id: "extracting", label: "Extracting Audio", urlOnly: true },
  { id: "separating", label: "Separating Stems" },
  { id: "transcribing", label: "Transcribing to MIDI" },
  { id: "analyzing", label: "Analyzing Audio" },
  { id: "generating", label: "Generating Options" },
];

interface TranscribeProgressProps {
  stage: TranscriptionStage;
  progress: number;
  isUrlSource?: boolean;
}

function getStageIndex(stage: TranscriptionStage): number {
  if (stage === "complete") return STAGES.length;
  if (stage === "error") return -1;
  return STAGES.findIndex((s) => s.id === stage);
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export function TranscribeProgress({
  stage,
  progress,
  isUrlSource = false,
}: TranscribeProgressProps) {
  const currentIndex = getStageIndex(stage);
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const stageStartRef = useRef<Record<string, number>>({});

  // Track elapsed time per stage
  useEffect(() => {
    if (stage === "complete" || stage === "error") return;

    const stageId = stage;
    if (!stageStartRef.current[stageId]) {
      stageStartRef.current[stageId] = Date.now();
    }

    const interval = setInterval(() => {
      const start = stageStartRef.current[stageId];
      if (start) {
        setElapsed((prev) => ({
          ...prev,
          [stageId]: Date.now() - start,
        }));
      }
    }, 250);

    return () => clearInterval(interval);
  }, [stage]);

  // When stage advances, freeze the elapsed time for completed stages
  useEffect(() => {
    STAGES.forEach((s, i) => {
      if (i < currentIndex && stageStartRef.current[s.id] && !elapsed[s.id]) {
        setElapsed((prev) => ({
          ...prev,
          [s.id]: Date.now() - stageStartRef.current[s.id],
        }));
      }
    });
  }, [currentIndex, elapsed]);

  const visibleStages = STAGES.filter(
    (s) => !s.urlOnly || isUrlSource
  );

  return (
    <div className="flex flex-col gap-1 py-2">
      {visibleStages.map((stageInfo) => {
        const stageIdx = STAGES.findIndex((s) => s.id === stageInfo.id);
        const isActive = stageIdx === currentIndex;
        const isComplete = stageIdx < currentIndex;
        const isPending = stageIdx > currentIndex;

        return (
          <div
            key={stageInfo.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              isActive && "bg-muted/50"
            )}
          >
            {/* Icon */}
            <div className="flex size-5 shrink-0 items-center justify-center">
              {isComplete ? (
                <Check className="size-4 text-green-500" />
              ) : isActive ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Circle className="size-4 text-muted-foreground/40" />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "flex-1 text-sm",
                isActive && "font-medium text-foreground",
                isComplete && "text-muted-foreground",
                isPending && "text-muted-foreground/50"
              )}
            >
              {stageInfo.label}
            </span>

            {/* Progress / Elapsed */}
            <span className="text-xs text-muted-foreground tabular-nums">
              {isActive && stageInfo.id === "separating" && progress > 0 && (
                <>{Math.round(progress)}%</>
              )}
              {isActive && elapsed[stageInfo.id] && (
                <> {formatElapsed(elapsed[stageInfo.id])}</>
              )}
              {isComplete && elapsed[stageInfo.id] && (
                <>{formatElapsed(elapsed[stageInfo.id])}</>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
