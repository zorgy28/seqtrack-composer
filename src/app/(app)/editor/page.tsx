"use client";

import { useState, useCallback } from "react";
import { Sparkles, FileMusic } from "lucide-react";
import { StepGrid } from "@/components/editor/step-grid";
import { useProject } from "@/providers/project-provider";
import { useTransport } from "@/providers/transport-provider";
import { applyDrumPatternToProject, createEmptyProject } from "@/lib/midi/pattern-generators";
import { DRUM_STYLES } from "@/lib/midi/constants";
import type { DrumStyle } from "@/lib/midi/types";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const EnhanceDialog = dynamic(
  () => import("@/components/enhance/enhance-dialog").then((m) => ({ default: m.EnhanceDialog })),
  { ssr: false },
);
const ImportDialog = dynamic(
  () => import("@/components/editor/import-dialog").then((m) => ({ default: m.ImportDialog })),
  { ssr: false },
);

export default function EditorPage() {
  const { project, setProject } = useProject();
  const { currentStep } = useTransport();
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleGenerateDrum = useCallback((style: DrumStyle) => {
    const updated = applyDrumPatternToProject(project, style, 1);
    setProject(updated);
  }, [project, setProject]);

  const handleClearAll = useCallback(() => {
    setProject(createEmptyProject(project.name));
  }, [project.name, setProject]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
        <span className="text-sm font-medium">Presets:</span>
        <div className="flex gap-1 flex-wrap">
          {DRUM_STYLES.map((style) => (
            <Button
              key={style}
              variant="outline"
              size="sm"
              className="h-7 text-xs font-mono"
              onClick={() => handleGenerateDrum(style)}
            >
              {style.replace("_", " ")}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setEnhanceOpen(true)}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          Enhance
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setImportOpen(true)}
        >
          <FileMusic className="w-3 h-3 mr-1" />
          Import
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleClearAll}
        >
          Clear
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={async () => {
            const { downloadMidi } = await import("@/lib/midi/midi-export");
            downloadMidi(project);
          }}
        >
          Export .mid
        </Button>
      </div>

      {/* Step Grid */}
      <div className="flex-1 overflow-auto p-3 pb-20">
        <StepGrid currentStep={currentStep} />
      </div>

      <EnhanceDialog open={enhanceOpen} onOpenChange={setEnhanceOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
