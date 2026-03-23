"use client";

import { useState, useCallback } from "react";
import type { Project, Pattern } from "@/lib/midi/types";

export type EnhanceAction = "enhance" | "sounds" | "rearrange" | "all";
export type EnhanceStage = "idle" | "loading" | "preview" | "error";

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
  const [stage, setStage] = useState<EnhanceStage>("idle");
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (
    project: Project,
    instruction: string,
    action: EnhanceAction,
    modelProvider?: string,
    modelId?: string,
  ) => {
    setStage("loading");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, instruction, action, modelProvider, modelId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Enhancement failed (${res.status}): ${text}`);
      }

      const data = await res.json() as EnhanceResult;
      setResult(data);
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStage("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setResult(null);
    setError(null);
  }, []);

  return { stage, result, error, run, reset };
}
