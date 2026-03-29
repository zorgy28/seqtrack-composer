"use client";

import { useState, useCallback, useRef } from "react";
import type { CompositionOutput } from "@/lib/ai/schema";
import { useAsyncOperation, type AsyncStage } from "./use-async-operation";
import { getSettings, buildProviderConfig } from "@/lib/settings";
import { useDeviceProfile } from "@/providers/device-provider";

export type ComposeStage = AsyncStage;

const MAX_HISTORY = 20;
const LS_KEY = "seqtrack-compose-history";

type HistoryEntry = { params: ComposeParams; result: CompositionOutput; timestamp: number };

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(history));
  } catch {
    // Storage full — silently fail
  }
}

export interface ComposeParams {
  prompt: string;
  bpm: number;
  scaleRoot: string;
  scaleName: string;
  bars: number;
  swing: number;
}

export interface UseComposeReturn {
  stage: ComposeStage;
  result: CompositionOutput | null;
  error: string | null;
  history: HistoryEntry[];
  generate: (params: ComposeParams) => Promise<void>;
  refine: (instruction: string) => Promise<void>;
  reset: () => void;
  restoreFromHistory: (index: number) => void;
  clearHistory: () => void;
}

export function useCompose(): UseComposeReturn {
  const { stage, result, error, run, setResult, reset: resetAsync } = useAsyncOperation<CompositionOutput>();
  const { profile } = useDeviceProfile();
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const lastParamsRef = useRef<ComposeParams | null>(null);

  const addToHistory = useCallback((params: ComposeParams, data: CompositionOutput) => {
    setHistory(prev => {
      const next = [{ params, result: data, timestamp: Date.now() }, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const generate = useCallback(async (params: ComposeParams) => {
    lastParamsRef.current = params;

    await run(async () => {
      const settings = getSettings();
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: params.prompt,
          bpm: params.bpm,
          scaleRoot: params.scaleRoot,
          scaleName: params.scaleName,
          bars: params.bars,
          swing: params.swing,
          providerConfig: buildProviderConfig(settings),
          deviceId: profile.id,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Generation failed (${res.status}): ${text}`);
      }

      const data = await res.json() as CompositionOutput;
      addToHistory(params, data);
      return data;
    });
  }, [run, addToHistory, profile.id]);

  const refine = useCallback(async (instruction: string) => {
    if (!result || !lastParamsRef.current) return;

    const params = lastParamsRef.current;

    await run(async () => {
      const settings = getSettings();
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: params.prompt,
          bpm: params.bpm,
          scaleRoot: params.scaleRoot,
          scaleName: params.scaleName,
          bars: params.bars,
          swing: params.swing,
          providerConfig: buildProviderConfig(settings),
          deviceId: profile.id,
          previousResult: result,
          refinementInstruction: instruction,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Refinement failed (${res.status}): ${text}`);
      }

      const data = await res.json() as CompositionOutput;
      addToHistory(params, data);
      return data;
    });
  }, [result, run, addToHistory]);

  const reset = useCallback(() => {
    resetAsync();
  }, [resetAsync]);

  const restoreFromHistory = useCallback((index: number) => {
    const entry = history[index];
    if (!entry) return;
    setResult(entry.result);
    lastParamsRef.current = entry.params;
  }, [history, setResult]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
  }, []);

  return { stage, result, error, history, generate, refine, reset, restoreFromHistory, clearHistory };
}
