"use client";

import { useCallback, useRef, useState } from "react";
import { Music, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AudioUpload } from "./audio-upload";
import { TranscribeProgress } from "./transcribe-progress";
import { StemPreview } from "./stem-preview";
import { OptionPicker } from "./option-picker";
import { useTranscription } from "@/hooks/use-transcription";
import { useProject } from "@/providers/project-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { getSettings, updateSettings } from "@/lib/settings";
import type { ModelSelection, LLMProvider } from "./model-selector";

type WizardStep = "upload" | "processing" | "choose";

function getWizardStep(
  stage: ReturnType<typeof useTranscription>["stage"],
  optionsCount: number
): WizardStep {
  if (!stage) return "upload";
  if (stage === "complete" || optionsCount > 0) return "choose";
  return "processing";
}

interface TranscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TranscribeDialog({ open, onOpenChange }: TranscribeDialogProps) {
  const {
    stage,
    progress,
    stems,
    options,
    rawOptions,
    analysis,
    error,
    isUrlSource,
    startFromFile,
    startFromUrl,
    toggleStem,
    applyOption,
    reset,
    bars,
    setBars,
    history,
    reprocessFromHistory,
  } = useTranscription();

  const { loadTranscription } = useProject();
  const { device } = useMidiConnection();
  const cancelPreviewRef = useRef<(() => void)[]>([]);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);

  // Model selector state derived from settings
  const [modelSelection, setModelSelection] = useState<ModelSelection>(() => {
    const s = getSettings();
    const provider = s.llmProvider as LLMProvider;
    const model = (() => {
      switch (s.llmProvider) {
        case "gemini":     return s.geminiModel || "gemini-2.5-flash";
        case "openrouter": return s.openrouterModel || "anthropic/claude-sonnet-4.5";
        case "lm-studio":  return s.lmStudioModel || "";
        case "ollama":     return s.ollamaModel || "";
        default:           return s.claudeModel || "claude-sonnet-4-6";
      }
    })();
    return { provider, model };
  });
  const handleModelChange = useCallback((sel: ModelSelection) => {
    setModelSelection(sel);
    const partial: Record<string, string> = { llmProvider: sel.provider };
    switch (sel.provider) {
      case "claude":      partial.claudeModel = sel.model; break;
      case "gemini":      partial.geminiModel = sel.model; break;
      case "openrouter":  partial.openrouterModel = sel.model; break;
      case "lm-studio":   partial.lmStudioModel = sel.model; break;
    }
    updateSettings(partial);
  }, []);
  const wizardStep = getWizardStep(stage, options.length);
  const isProcessing = wizardStep === "processing";

  const handlePreview = useCallback(
    async (index: number) => {
      // If same card is playing, stop it
      if (previewingIndex === index) {
        cancelPreviewRef.current.forEach((c) => c());
        cancelPreviewRef.current = [];
        setPreviewingIndex(null);
        setCurrentStep(null);
        return;
      }

      // Stop any current preview
      cancelPreviewRef.current.forEach((cancel) => cancel());
      cancelPreviewRef.current = [];

      if (!device) return;

      const raw = rawOptions[index];
      if (!raw) return;

      const { playPatternLoopedWithCursor } = await import("@/lib/webmidi/midi-sender");

      const allTracks = raw.tracks
        .filter(t => t.patterns[0] && t.patterns[0].notes.length > 0)
        .map(t => ({ pattern: t.patterns[0], channel: t.channel }));

      setPreviewingIndex(index);
      const control = playPatternLoopedWithCursor(
        device.id,
        allTracks,
        raw.bpm,
        (step) => setCurrentStep(step),
      );
      const cancel = control.cancel;
      cancelPreviewRef.current = [cancel];
    },
    [device, rawOptions, previewingIndex],
  );

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      // Prevent closing while processing — user must wait or use X button
      if (!nextOpen && isProcessing) return;
      if (!nextOpen) {
        reset();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset, isProcessing]
  );

  const handleForceClose = useCallback(() => {
    cancelPreviewRef.current.forEach((c) => c());
    cancelPreviewRef.current = [];
    setPreviewingIndex(null);
    setCurrentStep(null);
    reset();
    onOpenChange(false);
  }, [onOpenChange, reset]);

  const handleApply = useCallback(
    (index: number) => {
      cancelPreviewRef.current.forEach((c) => c());
      cancelPreviewRef.current = [];
      setPreviewingIndex(null);
      setCurrentStep(null);

      const raw = rawOptions[index];
      if (raw) {
        loadTranscription(raw);
      }
      applyOption(index);
      reset();
      onOpenChange(false);
    },
    [rawOptions, loadTranscription, applyOption, reset, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="size-4 text-primary" />
              <DialogTitle>Transcribe Audio</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleForceClose}
            >
              <X />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <DialogDescription>
            {wizardStep === "upload" &&
              "Upload an audio file or paste a link to transcribe it into SEQTRAK patterns."}
            {wizardStep === "processing" &&
              "Analyzing your audio and generating MIDI patterns... Do not close this window."}
            {wizardStep === "choose" &&
              "Review the generated arrangements and pick the one you like."}
          </DialogDescription>
        </DialogHeader>

        {/* Step content */}
        <div className="min-h-[200px]">
          {/* Step 1: Upload */}
          {wizardStep === "upload" && (
            <>
              <AudioUpload
                onFileSelect={startFromFile}
                onUrlSubmit={startFromUrl}
                bars={bars}
                onBarsChange={setBars}
                modelSelection={modelSelection}
                onModelChange={handleModelChange}
              />
              {history.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Recent Transcriptions</h4>
                  {history.slice(0, 5).map((entry) => (
                    <div key={entry.id}
                      className="flex items-center justify-between rounded-lg border border-input px-3 py-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate max-w-[300px]">{entry.source.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.analysis.bpm} BPM &middot; {entry.analysis.key} &middot; {entry.bars} bars &middot; {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reprocessFromHistory(entry.id)}
                      >
                        Re-process
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: Processing */}
          {wizardStep === "processing" && stage && (
            <div className="flex flex-col gap-4">
              <TranscribeProgress
                stage={stage}
                progress={progress}
                isUrlSource={isUrlSource}
              />
              {stems.length > 0 && (
                <StemPreview stems={stems} onToggle={toggleStem} />
              )}
              {error && (
                <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="w-fit"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Choose */}
          {wizardStep === "choose" && options.length > 0 && (
            <OptionPicker
              options={options}
              detectedGenre={analysis?.genre}
              detectedKey={analysis?.key}
              detectedBpm={analysis?.bpm}
              onPreview={handlePreview}
              onApply={handleApply}
              previewingIndex={previewingIndex}
              currentStep={currentStep}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
