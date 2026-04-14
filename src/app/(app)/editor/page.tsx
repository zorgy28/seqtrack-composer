"use client";

import { useState, useCallback } from "react";
import { Sparkles, FileMusic } from "lucide-react";
import { StepGrid } from "@/components/editor/step-grid";
import { useProject } from "@/providers/project-provider";
import { useDeviceProfile } from "@/providers/device-provider";
import { useSoundControl } from "@/hooks/use-sound-control";
import { applyFullPresetToProject, createEmptyProject } from "@/lib/midi/pattern-generators";
import { STYLE_INFO } from "@/lib/midi/constants";
import { useSelectedChannel } from "@/stores/project-store";
import type { FullStyle } from "@/lib/midi/types";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { TrackParams } from "@/components/sound/track-params";

const EnhanceDialog = dynamic(
  () => import("@/components/enhance/enhance-dialog").then((m) => ({ default: m.EnhanceDialog })),
  { ssr: false },
);
const ImportDialog = dynamic(
  () => import("@/components/editor/import-dialog").then((m) => ({ default: m.ImportDialog })),
  { ssr: false },
);

const PRESET_GROUPS: Array<{ label: string; styles: FullStyle[] }> = [
  { label: "Drums", styles: ["basic_4x4", "breakbeat"] },
  { label: "Electronic", styles: ["house", "techno", "trap", "dnb"] },
  { label: "Hip Hop", styles: ["hiphop", "lofi", "triphop"] },
  { label: "World", styles: ["reggae", "bossa_nova", "afrobeat", "latin_salsa"] },
  { label: "Classics", styles: ["blues_shuffle", "funk", "disco", "jazz", "classic_rock"] },
  { label: "Atmospheric", styles: ["ambient"] },
];

export default function EditorPage() {
  // NOTE: top-level subscriptions here re-render the entire page on change.
  // Keep them MINIMAL — push reactive work down into leaf components:
  //  - currentStep → consumed inside PlaybackCursor (step-grid.tsx)
  //  - per-track sound → consumed inside TrackHeader via useTrackSound
  //  - sound design panel → its own self-subscribed component (SoundDesignPanel)
  const { project, setProject } = useProject();
  const { profile } = useDeviceProfile();
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const showGenrePresets = profile.id === "seqtrak"; // genre presets are SEQTRAK-specific (11-channel patterns)

  const handleApplyPreset = useCallback(async (style: FullStyle) => {
    const info = STYLE_INFO[style];
    const updated = await applyFullPresetToProject(project, style, 1);
    setProject({ ...updated, bpm: info.bpm });
  }, [project, setProject]);

  const handleClearAll = useCallback(() => {
    setProject(createEmptyProject(project.name));
  }, [project.name, setProject]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 p-3 border-b border-border">
        {/* Preset groups — only for groovebox devices */}
        {showGenrePresets && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {PRESET_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                {group.label}
              </span>
              {group.styles.map((style) => (
                <Button
                  key={style}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-1.5 font-mono"
                  onClick={() => handleApplyPreset(style)}
                >
                  {STYLE_INFO[style].name}
                </Button>
              ))}
            </div>
          ))}
        </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEnhanceOpen(true)}
            title="Use AI to improve the current pattern"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Enhance
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setImportOpen(true)}
            title="Import from MIDI, sheet music, or notation"
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
            title="Remove all notes from all tracks"
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
            title="Download as Standard MIDI File"
          >
            Export .mid
          </Button>
        </div>
      </div>

      {/* Step Grid */}
      <div className="flex-1 overflow-auto p-3 pb-20">
        <StepGrid />
      </div>

      {/* Sound Design Panel — shown for synth devices */}
      {profile.ui.showSoundDesignPanel && <SoundDesignPanel displayName={profile.displayName} />}

      <EnhanceDialog open={enhanceOpen} onOpenChange={setEnhanceOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

/**
 * Self-subscribed sound design panel. Isolating it here means the EditorPage
 * doesn't need to subscribe to the selected channel / sound control state at
 * the top level, so track/sound changes don't re-render the whole page.
 */
function SoundDesignPanel({ displayName }: { displayName: string }) {
  const { selectedChannel } = useSelectedChannel();
  const { getTrackSound, setCC } = useSoundControl();
  return (
    <div className="border-t border-border bg-card/50">
      <div className="px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Sound Design — {displayName}
        </span>
      </div>
      <TrackParams
        channel={selectedChannel}
        ccValues={getTrackSound(selectedChannel).ccValues}
        onCCChange={(cc, value) => setCC(selectedChannel, cc, value)}
      />
    </div>
  );
}
