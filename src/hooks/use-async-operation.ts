"use client";

import { useState, useCallback } from "react";

export type AsyncStage = "idle" | "loading" | "preview" | "error";

export interface UseAsyncOperationReturn<T> {
  stage: AsyncStage;
  result: T | null;
  error: string | null;
  run: (fn: () => Promise<T>) => Promise<void>;
  setResult: (result: T) => void;
  reset: () => void;
}

export function useAsyncOperation<T>(): UseAsyncOperationReturn<T> {
  const [stage, setStage] = useState<AsyncStage>("idle");
  const [result, setResultState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<T>) => {
    setStage("loading");
    setError(null);
    try {
      const data = await fn();
      setResultState(data);
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStage("error");
    }
  }, []);

  const setResult = useCallback((data: T) => {
    setResultState(data);
    setStage("preview");
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setResultState(null);
    setError(null);
  }, []);

  return { stage, result, error, run, setResult, reset };
}
