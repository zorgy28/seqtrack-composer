"use client";

import { useCallback } from "react";
import type { Project, Pattern } from "@/lib/midi/types";
import { useAsyncOperation, type AsyncStage } from "./use-async-operation";
import { getSettings, buildProviderConfig } from "@/lib/settings";
import { useDeviceProfile } from "@/providers/device-provider";

export type EnhanceAction = "enhance" | "sounds" | "sound-design" | "rearrange" | "all";
export type EnhanceStage = AsyncStage;

export interface EnhanceTrackResult {
  channel: number;
  patterns: Pattern[];
  soundPreset?: { id: number; name: string; category: string };
  soundDesign?: Array<{ cc: number; value: number; name: string }>;
  matrixRouting?: Array<{ source: string; destination: string; amount: number }>;
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
  run: (project: Project, instruction: string, action: EnhanceAction) => Promise<void>;
  reset: () => void;
}

export function useEnhance(): UseEnhanceReturn {
  const { stage, result, error, run: runAsync, reset } = useAsyncOperation<EnhanceResult>();
  const { profile } = useDeviceProfile();

  const run = useCallback(async (
    project: Project,
    instruction: string,
    action: EnhanceAction,
  ) => {
    await runAsync(async () => {
      const settings = getSettings();
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, instruction, action, providerConfig: buildProviderConfig(settings), deviceId: profile.id }),
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
