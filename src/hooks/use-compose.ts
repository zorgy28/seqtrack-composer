"use client";

import { useState, useCallback, useRef } from "react";
import type { CompositionOutput } from "@/lib/ai/schema";
import { useAsyncOperation, type AsyncStage } from "./use-async-operation";

export type ComposeStage = AsyncStage;

const MAX_HISTORY = 5;

export interface ComposeParams {
  prompt: string;
  bpm: number;
  scaleRoot: string;
  scaleName: string;
  bars: number;
  swing: number;
  modelProvider?: string;
  modelId?: string;
}

export interface UseComposeReturn {
  stage: ComposeStage;
  result: CompositionOutput | null;
  error: string | null;
  history: Array<{ params: ComposeParams; result: CompositionOutput; timestamp: number }>;
  generate: (params: ComposeParams) => Promise<void>;
  refine: (instruction: string) => Promise<void>;
  reset: () => void;
  restoreFromHistory: (index: number) => void;
}

export function useCompose(): UseComposeReturn {
  const { stage, result, error, run, setResult, reset: resetAsync } = useAsyncOperation<CompositionOutput>();
  const [history, setHistory] = useState<Array<{ params: ComposeParams; result: CompositionOutput; timestamp: number }>>([]);
  const lastParamsRef = useRef<ComposeParams | null>(null);

  const generate = useCallback(async (params: ComposeParams) => {
    lastParamsRef.current = params;

    await run(async () => {
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
          modelProvider: params.modelProvider,
          modelId: params.modelId,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Generation failed (${res.status}): ${text}`);
      }

      const data = await res.json() as CompositionOutput;
      setHistory(prev => [{ params, result: data, timestamp: Date.now() }, ...prev].slice(0, MAX_HISTORY));
      return data;
    });
  }, [run]);

  const refine = useCallback(async (instruction: string) => {
    if (!result || !lastParamsRef.current) return;

    const params = lastParamsRef.current;

    await run(async () => {
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
          modelProvider: params.modelProvider,
          modelId: params.modelId,
          previousResult: result,
          refinementInstruction: instruction,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Refinement failed (${res.status}): ${text}`);
      }

      const data = await res.json() as CompositionOutput;
      setHistory(prev => [{ params, result: data, timestamp: Date.now() }, ...prev].slice(0, MAX_HISTORY));
      return data;
    });
  }, [result, run]);

  const reset = useCallback(() => {
    resetAsync();
  }, [resetAsync]);

  const restoreFromHistory = useCallback((index: number) => {
    const entry = history[index];
    if (!entry) return;
    setResult(entry.result);
    lastParamsRef.current = entry.params;
  }, [history, setResult]);

  return { stage, result, error, history, generate, refine, reset, restoreFromHistory };
}
