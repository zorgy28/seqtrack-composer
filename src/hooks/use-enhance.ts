"use client";

import { useCallback } from "react";
import type { Project, Pattern } from "@/lib/midi/types";
import { useAsyncOperation, type AsyncStage } from "./use-async-operation";

export type EnhanceAction = "enhance" | "sounds" | "rearrange" | "all";
export type EnhanceStage = AsyncStage;

export interface EnhanceTrackResult {
  channel: number;
  patterns: Pattern[];
  soundPreset?: { id: number; name: string; category: string };
  reason?: string;
}

export interface EnhanceResult {
  tracks: EnhanceTrackResult[];
  bpm?: number;
  description: string;
  suggestions: string[];
}

export interface UseEnhanceReturn {
  stage: EnhanceStage;
  result: EnhanceResult | null;
  error: string | null;
  run: (project: Project, instruction: string, action: EnhanceAction, modelProvider?: string, modelId?: string) => Promise<void>;
  reset: () => void;
}

export function useEnhance(): UseEnhanceReturn {
  const { stage, result, error, run: runAsync, reset } = useAsyncOperation<EnhanceResult>();

  const run = useCallback(async (
    project: Project,
    instruction: string,
    action: EnhanceAction,
    modelProvider?: string,
    modelId?: string,
  ) => {
    await runAsync(async () => {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, instruction, action, modelProvider, modelId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Enhancement failed (${res.status}): ${text}`);
      }

      return res.json() as Promise<EnhanceResult>;
    });
  }, [runAsync]);

  return { stage, result, error, run, reset };
}
