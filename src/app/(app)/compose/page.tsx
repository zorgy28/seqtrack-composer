"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { useProject } from "@/providers/project-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { useSoundControl } from "@/hooks/use-sound-control";
import { useCompose } from "@/hooks/use-compose";
import { getAllPresets } from "@/lib/midi/sound-library";
import type { SeqtrackChannel } from "@/lib/midi/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { ComposeParams as ComposeParamsPanel } from "@/components/compose/compose-params";
import { ComposePresets } from "@/components/compose/compose-presets";
import { ComposeResults } from "@/components/compose/compose-results";
import { ComposeHistory } from "@/components/compose/compose-history";

export default function ComposePage() {
  const router = useRouter();
  const { project, setProject, updateBpm } = useProject();
  const { device } = useMidiConnection();
  const { selectPreset } = useSoundControl();
  const {
    stage,
    result,
    error,
    history,
    generate,
    refine,
    reset,
    restoreFromHistory,
    clearHistory,
  } = useCompose();

  const [prompt, setPrompt] = useState("");
  const [bars, setBars] = useState(2);
  const [swing, setSwing] = useState(0);
  const [modelProvider, setModelProvider] = useState<string>(() => getSettings().llmProvider);
  const [modelId, setModelId] = useState(() => {
    const s = getSettings();
    switch (s.llmProvider) {
      case "gemini":     return s.geminiModel     || "gemini-2.5-flash";
      case "openrouter": return s.openrouterModel || "anthropic/claude-sonnet-4.5";
      case "lm-studio":  return s.lmStudioModel   || "";
      default:           return s.claudeModel     || "claude-sonnet-4-6";
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const cancelPreviewRef = useRef<(() => void) | null>(null);

  // ── Stop Preview ────────────────────────────────────────────────

  const stopPreview = useCallback(() => {
    if (cancelPreviewRef.current) {
      cancelPreviewRef.current();
      cancelPreviewRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(null);
  }, []);

  // ── Enhance Prompt ──────────────────────────────────────────────

  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          bpm: project.bpm,
          scaleRoot: project.scaleRoot,
          scaleName: project.scaleName,
          bars,
          modelProvider,
          modelId,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { enhancedPrompt?: string };
        if (data.enhancedPrompt) setPrompt(data.enhancedPrompt);
      }
    } catch {
      // silently fail — user keeps original prompt
    } finally {
      setIsEnhancing(false);
    }
  }, [prompt, project.bpm, project.scaleRoot, project.scaleName, bars, modelProvider, modelId, isEnhancing]);

  // ── Generate ────────────────────────────────────────────────────

  const handleGenerate = useCallback(
    (overridePrompt?: string) => {
      const p = overridePrompt ?? prompt;
      if (!p.trim()) return;

      stopPreview();
      generate({
        prompt: p,
        bpm: project.bpm,
        scaleRoot: project.scaleRoot,
        scaleName: project.scaleName,
        bars,
        swing,
        modelProvider,
        modelId,
      });
    },
    [prompt, project.bpm, project.scaleRoot, project.scaleName, bars, swing, modelProvider, modelId, stopPreview, generate],
  );

  // ── Preview (toggle play/stop) ─────────────────────────────────

  const handlePreview = useCallback(async () => {
    if (isPlaying) {
      stopPreview();
      return;
    }
    if (!device || !result) return;

    const { playPatternLoopedWithCursor } = await import(
      "@/lib/webmidi/midi-sender"
    );
    const tracks = result.tracks
      .filter((t) => t.patterns[0]?.notes.length > 0)
      .map((t) => ({
        pattern: t.patterns[0],
        channel: t.channel as SeqtrackChannel,
      }));

    if (tracks.length === 0) return;

    setIsPlaying(true);
    const cancel = playPatternLoopedWithCursor(
      device.id,
      tracks,
      result.bpm ?? project.bpm,
      (step) => setCurrentStep(step),
    );
    cancelPreviewRef.current = cancel;
  }, [isPlaying, device, result, project.bpm, stopPreview]);

  // ── Apply ──────────────────────────────────────────────────────

  const handleApply = useCallback(() => {
    if (!result) return;
    stopPreview();

    const updatedTracks = { ...project.tracks };

    for (const t of result.tracks) {
      const ch = t.channel as SeqtrackChannel;
      const existing = { ...updatedTracks[ch] };

      if (t.patterns[0]) {
        existing.patterns = [...existing.patterns];
        existing.patterns[existing.activePattern] = {
          ...t.patterns[0],
          swing: t.patterns[0].swing ?? swing,
        };
      }

      updatedTracks[ch] = existing;

      // Apply sound preset to the device if connected
      if (t.soundPreset) {
        const full = getAllPresets().find((p) => p.id === t.soundPreset!.id);
        if (full) void selectPreset(ch, full);
      }
    }

    const updated = {
      ...project,
      tracks: updatedTracks,
      bpm: result.bpm ?? project.bpm,
      updatedAt: new Date().toISOString(),
    };
    setProject(updated);
  }, [result, project, swing, stopPreview, setProject, selectPreset]);

  // ── Apply & Edit ──────────────────────────────────────────────

  const handleApplyAndEdit = useCallback(() => {
    handleApply();
    router.push("/editor");
  }, [handleApply, router]);

  // ── Scale changes ─────────────────────────────────────────────

  const handleScaleRootChange = useCallback(
    (root: string) => {
      setProject({ ...project, scaleRoot: root });
    },
    [project, setProject],
  );

  const handleScaleNameChange = useCallback(
    (name: string) => {
      setProject({ ...project, scaleName: name });
    },
    [project, setProject],
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full p-4">
        {/* Parameters */}
        <ComposeParamsPanel
          bars={bars}
          onBarsChange={setBars}
          bpm={project.bpm}
          onBpmChange={updateBpm}
          scaleRoot={project.scaleRoot}
          onScaleRootChange={handleScaleRootChange}
          scaleName={project.scaleName}
          onScaleNameChange={handleScaleNameChange}
          swing={swing}
          onSwingChange={setSwing}
          modelProvider={modelProvider}
          modelId={modelId}
          onModelChange={(p, m) => {
            setModelProvider(p);
            setModelId(m);
          }}
          disabled={stage === "loading"}
        />

        {/* Presets */}
        <ComposePresets
          onSelect={(p) => {
            setPrompt((prev) => prev.trim() ? `${prev.trim()}, ${p}` : p);
          }}
          disabled={stage === "loading"}
        />

        {/* Prompt input */}
        <div className="flex flex-col gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your music... (e.g., 'dark techno with driving bass and industrial hats')"
            className="min-h-[80px] font-mono text-sm"
            onKeyDown={(e) => {
              if (e.metaKey && e.key === "Enter") handleGenerate();
            }}
            disabled={stage === "loading"}
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleGenerate()}
              disabled={stage === "loading" || !prompt.trim()}
            >
              {stage === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || stage === "loading" || !prompt.trim()}
              title="Expand your prompt into a detailed production description"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enhancing…
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Enhance
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">Cmd+Enter</span>
          </div>
        </div>

        {/* Error */}
        {stage === "error" && error && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Results */}
        {stage === "preview" && result && (
          <ComposeResults
            result={result}
            projectBpm={project.bpm}
            isPlaying={isPlaying}
            currentStep={currentStep}
            onPreview={handlePreview}
            onApply={handleApply}
            onApplyAndEdit={handleApplyAndEdit}
            onRefine={(instruction) => {
              stopPreview();
              refine(instruction);
            }}
            onSuggestionClick={(s) => {
              stopPreview();
              refine(s);
            }}
            onReuseDescription={(desc) => setPrompt(desc)}
          />
        )}

        {/* History */}
        {history.length > 0 && (
          <ComposeHistory
            history={history}
            onRestore={(i) => {
              stopPreview();
              restoreFromHistory(i);
            }}
            onUsePrompt={(p) => setPrompt(p)}
            onClear={clearHistory}
          />
        )}
      </div>
    </div>
  );
}
