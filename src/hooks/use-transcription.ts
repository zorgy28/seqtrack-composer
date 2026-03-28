"use client";

import { useState, useCallback, useRef } from "react";
import type { TranscriptionStage } from "@/components/compose/transcribe-progress";
import type { StemInfo } from "@/components/compose/stem-preview";
import type { TranscriptionOption } from "@/components/compose/option-card";
import type { SeqtrackChannel } from "@/lib/midi/types";
import type {
  MLServiceStatus,
  StemMidiData,
  AudioAnalysis,
  TranscriptionResult,
} from "@/lib/transcription/types";
import {
  getHistory,
  addToHistory,
  getEntryById,
  type TranscriptionHistoryEntry,
} from "@/lib/transcription/history";
import { getSettings, buildProviderConfig } from "@/lib/settings";

export interface AudioAnalysisInfo {
  bpm: number;
  key: string;
  genre: string;
}

export interface UseTranscriptionReturn {
  stage: TranscriptionStage | null;
  progress: number;
  stems: StemInfo[];
  enabledStems: string[];
  options: TranscriptionOption[];
  rawOptions: TranscriptionResult["options"];
  analysis: AudioAnalysisInfo | null;
  error: string | null;
  isUrlSource: boolean;
  bars: number;
  setBars: (bars: number) => void;
  startFromFile: (file: File) => void;
  startFromUrl: (url: string) => void;
  toggleStem: (stemName: string) => void;
  applyOption: (index: number) => void;
  reset: () => void;
  history: TranscriptionHistoryEntry[];
  reprocessFromHistory: (entryId: string) => void;
}

const POLL_INTERVAL_MS = 2000;

/**
 * Transform the Claude AI transcription result into the component-level
 * TranscriptionOption format expected by OptionCard / OptionPicker.
 */
function transformOptions(
  result: TranscriptionResult,
): TranscriptionOption[] {
  return result.options.map((opt) => {
    const tracks: Partial<
      Record<
        SeqtrackChannel,
        {
          notes: { pitch: number; velocity: number; step: number; duration: number; probability: number }[];
          bars: number;
          sound: { id: number; name: string; category: string };
          alternatives: { id: number; name: string; category: string }[];
        }
      >
    > = {};

    for (const t of opt.tracks) {
      const ch = t.channel as SeqtrackChannel;
      // Flatten all patterns' notes into a single notes array for the option card display.
      // Use the first pattern's bars count as representative.
      const allNotes = t.patterns.flatMap((p) => p.notes);
      const bars = t.patterns[0]?.bars ?? 1;

      tracks[ch] = {
        notes: allNotes,
        bars,
        sound: {
          id: t.soundPreset.id,
          name: t.soundPreset.name,
          category: t.soundPreset.category,
        },
        alternatives: t.alternativeSounds.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
        })),
      };
    }

    return {
      mode: opt.mode,
      label: opt.label,
      description: opt.description,
      bpm: opt.bpm,
      key: opt.key,
      tracks,
    };
  });
}

export function useTranscription(): UseTranscriptionReturn {
  const [stage, setStage] = useState<TranscriptionStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [stems, setStems] = useState<StemInfo[]>([]);
  const [options, setOptions] = useState<TranscriptionOption[]>([]);
  const [rawOptions, setRawOptions] = useState<TranscriptionResult["options"]>([]);
  const [analysis, setAnalysis] = useState<AudioAnalysisInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUrlSource, setIsUrlSource] = useState(false);
  const [bars, setBars] = useState(4);
  const [history, setHistory] = useState<TranscriptionHistoryEntry[]>(() =>
    typeof window !== "undefined" ? getHistory() : []
  );

  const sourceNameRef = useRef<string>("");

  const enabledStems = stems.filter((s) => s.enabled).map((s) => s.name);

  // Store ML results between pipeline stages
  const mlResultRef = useRef<{
    midiEvents: StemMidiData;
    analysis: AudioAnalysis;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ---- Polling ----

  const poll = useCallback(
    async (jobId: string): Promise<MLServiceStatus["result"]> => {
      const res = await fetch(`/api/transcribe/status/${jobId}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Status check failed (${res.status}): ${text}`);
      }

      const data: MLServiceStatus = await res.json();

      setProgress(data.progress);

      // Map ML service stage strings to our TranscriptionStage values
      const stageMap: Record<string, TranscriptionStage> = {
        extracting: "extracting",
        separating: "separating",
        transcribing: "transcribing",
        analyzing: "analyzing",
      };

      const mappedStage = stageMap[data.stage];
      if (mappedStage) setStage(mappedStage);

      if (data.stage === "done" && data.result) {
        return data.result;
      }

      if (data.stage === "error") {
        throw new Error(data.error ?? "ML service returned an error");
      }

      // Continue polling
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      return poll(jobId);
    },
    [],
  );

  // ---- Refine with Claude ----

  const refineWithClaude = useCallback(
    async (
      midiEvents: StemMidiData,
      audioAnalysis: AudioAnalysis,
      activeStems: string[],
    ): Promise<TranscriptionResult> => {
      setStage("generating");
      setProgress(90);

      const settings = getSettings();
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refine",
          midiEvents,
          analysis: audioAnalysis,
          enabledStems: activeStems,
          bars,
          providerConfig: buildProviderConfig(settings),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        throw new Error(`Refinement failed (${res.status}): ${text}`);
      }

      return res.json() as Promise<TranscriptionResult>;
    },
    [bars],
  );

  // ---- Main pipeline ----

  const runPipeline = useCallback(
    async (submitFn: () => Promise<Response>) => {
      // Cancel any in-flight work
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setError(null);
      setProgress(0);
      setStems([]);
      setOptions([]);
      setAnalysis(null);
      mlResultRef.current = null;

      try {
        // 1. Submit to ML service via our API route
        const submitRes = await submitFn();
        if (!submitRes.ok) {
          const text = await submitRes.text().catch(() => "(no body)");
          throw new Error(`Upload failed (${submitRes.status}): ${text}`);
        }

        const { jobId } = (await submitRes.json()) as { jobId: string };

        // 2. Poll until ML service is done
        const mlResult = await poll(jobId);

        if (!mlResult) {
          throw new Error("ML service returned no result");
        }

        // 3. Store ML results and build stem info
        mlResultRef.current = {
          midiEvents: mlResult.midi_events,
          analysis: mlResult.analysis,
        };

        const stemInfos: StemInfo[] = mlResult.stems.map((name) => ({
          name,
          enabled: true,
        }));
        setStems(stemInfos);

        // 4. Refine with Claude
        const activeStems = mlResult.stems;
        const claudeResult = await refineWithClaude(
          mlResult.midi_events,
          mlResult.analysis,
          activeStems,
        );

        // 5. Transform and set results
        const transformedOptions = transformOptions(claudeResult);
        setOptions(transformedOptions);
        setRawOptions(claudeResult.options);

        setAnalysis(
          claudeResult.analysis
            ? {
                genre: claudeResult.analysis.detectedGenre,
                key: claudeResult.analysis.detectedKey,
                bpm: claudeResult.analysis.detectedBpm,
              }
            : null,
        );
        setProgress(100);
        setStage("complete");

        // Save to history
        if (mlResultRef.current) {
          addToHistory({
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            source: { type: isUrlSource ? "url" : "file", name: sourceNameRef.current, url: isUrlSource ? sourceNameRef.current : undefined },
            bars,
            analysis: { bpm: claudeResult.analysis.detectedBpm, key: claudeResult.analysis.detectedKey, genre: claudeResult.analysis.detectedGenre },
            mlResult: { stems: mlResult.stems, midi_events: mlResult.midi_events, analysis: mlResult.analysis },
            options: claudeResult.options,
            appliedOptionIndex: null,
          });
          setHistory(getHistory());
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStage("error");
      }
    },
    [poll, refineWithClaude, bars, isUrlSource],
  );

  // ---- Public API ----

  const startFromFile = useCallback(
    (file: File) => {
      setIsUrlSource(false);
      sourceNameRef.current = file.name;
      setStage("separating");
      void runPipeline(async () => {
        const formData = new FormData();
        formData.append("file", file);
        return fetch("/api/transcribe", { method: "POST", body: formData });
      });
    },
    [runPipeline],
  );

  const startFromUrl = useCallback(
    (url: string) => {
      setIsUrlSource(true);
      sourceNameRef.current = url;
      setStage("extracting");
      void runPipeline(async () => {
        return fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      });
    },
    [runPipeline],
  );

  const toggleStem = useCallback((stemName: string) => {
    setStems((prev) =>
      prev.map((s) =>
        s.name === stemName ? { ...s, enabled: !s.enabled } : s,
      ),
    );
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const applyOption = useCallback((_index: number) => {
    // The parent component (TranscribeDialog) reads options[index]
    // and calls ProjectProvider.loadTranscription(option) to load
    // the selected arrangement into the project. We just signal
    // that the pipeline is complete from the hook's perspective.
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage(null);
    setProgress(0);
    setStems([]);
    setOptions([]);
    setRawOptions([]);
    setAnalysis(null);
    setError(null);
    setIsUrlSource(false);
    mlResultRef.current = null;
    setHistory(getHistory());
  }, []);

  const reprocessFromHistory = useCallback(
    async (entryId: string) => {
      const entry = getEntryById(entryId);
      if (!entry) return;

      // Load the ML result and go directly to Claude refinement
      // Uses CURRENT bars and model settings (not the saved ones)
      mlResultRef.current = { midiEvents: entry.mlResult.midi_events, analysis: entry.mlResult.analysis };
      sourceNameRef.current = entry.source.name;
      setIsUrlSource(entry.source.type === "url");

      const activeStems = entry.mlResult.stems;
      setStems(activeStems.map((name) => ({ name, enabled: true })));

      try {
        const claudeResult = await refineWithClaude(entry.mlResult.midi_events, entry.mlResult.analysis, activeStems);
        const transformedOptions = transformOptions(claudeResult);
        setOptions(transformedOptions);
        setRawOptions(claudeResult.options);
        setAnalysis({ genre: claudeResult.analysis.detectedGenre, key: claudeResult.analysis.detectedKey, bpm: claudeResult.analysis.detectedBpm });
        setProgress(100);
        setStage("complete");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStage("error");
      }
    },
    [refineWithClaude],
  );

  return {
    stage,
    progress,
    stems,
    enabledStems,
    options,
    rawOptions,
    analysis,
    error,
    isUrlSource,
    bars,
    setBars,
    startFromFile,
    startFromUrl,
    toggleStem,
    applyOption,
    reset,
    history,
    reprocessFromHistory,
  };
}
