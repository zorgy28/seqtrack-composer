"use client";

import { useCallback, useState, useMemo } from "react";
import {
  FileMusic,
  Drum,
  Guitar,
  Music,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProject } from "@/providers/project-provider";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { SEQTRAK_TRACKS, ALL_CHANNELS, STEPS_PER_BAR, getTrackSolidClass } from "@/lib/midi/constants";
import type { SeqtrackChannel } from "@/lib/midi/types";
import type { ImportResult } from "@/lib/import/types";
import { INSTRUMENTS } from "@/lib/import/types";
import { SheetTab, MidiTab, DrumTab, BassTab, NotesTab } from "./import-tabs";

// ── Constants ────────────────────────────────────────────────────

const TABS = [
  { id: "sheet", label: "Sheet/PDF", icon: FileMusic },
  { id: "midi", label: "MIDI", icon: Music },
  { id: "drumtab", label: "Drum Tab", icon: Drum },
  { id: "basstab", label: "Bass Tab", icon: Guitar },
  { id: "notes", label: "Notes", icon: Music },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BAR_OPTIONS = [
  { value: 1, label: "1", steps: "16" },
  { value: 2, label: "2", steps: "32" },
  { value: 4, label: "4", steps: "64" },
  { value: 8, label: "8", steps: "128" },
];

const INSTRUMENT_OPTIONS = INSTRUMENTS.map((i) => i.name);

// ── Component ────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { project, setProject } = useProject();
  const { device } = useMidiConnection();

  // ── State ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("sheet");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState("Piano");
  const [targetChannel, setTargetChannel] = useState<SeqtrackChannel>(9);
  const [bars, setBars] = useState(4);
  const [presetSelections, setPresetSelections] = useState<Partial<Record<SeqtrackChannel, number>>>({});

  // ── Instrument -> channel auto-selection ────────────────────
  const handleInstrumentChange = useCallback((name: string) => {
    setInstrument(name);
    const preset = INSTRUMENTS.find((i) => i.name === name);
    if (preset) {
      setTargetChannel(preset.defaultChannel);
    }
  }, []);

  // ── Tab result/error callbacks ─────────────────────────────
  const handleResult = useCallback((result: ImportResult | null) => {
    setError(null);
    setImportResult(result);
    setLoading(false);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setLoading(false);
  }, []);

  // ── Preview data ────────────────────────────────────────────
  const previewData = useMemo(() => {
    if (!importResult) return null;

    const channelCounts = new Map<number, number>();
    for (const note of importResult.notes) {
      const ch = note.channel ?? targetChannel;
      channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
    }

    const totalSteps = bars * STEPS_PER_BAR;
    const bpm = importResult.bpm ?? project.bpm;
    const secondsPerStep = 60 / bpm / 4;
    const stepsToShow = Math.min(totalSteps, 32);
    const stepHits = new Set<number>();

    for (const note of importResult.notes) {
      const step = Math.round(note.time / secondsPerStep);
      if (step >= 0 && step < stepsToShow) {
        stepHits.add(step);
      }
    }

    return {
      channelCounts,
      stepHits,
      stepsToShow,
      totalNotes: importResult.notes.length,
      detectedBpm: importResult.bpm,
      detectedKey: importResult.key,
      name: importResult.name,
    };
  }, [importResult, targetChannel, bars, project.bpm]);

  // ── Import apply handler ───────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!importResult) return;

    setLoading(true);
    try {
      const { importToPatterns } = await import("@/lib/import/convert");
      // Use detected BPM from MIDI file, fall back to project BPM
      const effectiveBpm = importResult.bpm ?? project.bpm;
      const patterns = importToPatterns(importResult, effectiveBpm, bars, presetSelections);

      const updated = { ...project, bpm: effectiveBpm };
      const updatedTracks = { ...updated.tracks };

      for (const { channel, pattern, presetId } of patterns) {
        const track = { ...updatedTracks[channel] };
        track.patterns = [...track.patterns];
        track.patterns[track.activePattern] = pattern;
        // Store selected preset on the track for sound assignment
        if (presetId) {
          (track as Record<string, unknown>).selectedPresetId = presetId;
        }
        updatedTracks[channel] = track;
      }

      updated.tracks = updatedTracks;
      setProject({ ...updated, updatedAt: new Date().toISOString() });

      // Send program changes to SEQTRAK so imported sounds take effect
      if (device) {
        const { selectSound } = await import("@/lib/midi/program-change");
        const { findPresetById } = await import("@/lib/midi/sound-library");
        const { gmDrumKitPresets } = await import("@/lib/import/gm-to-seqtrack");

        // Apply melodic presets
        for (const { channel, presetId } of patterns) {
          if (!presetId) continue;
          const preset = findPresetById(presetId);
          if (preset) {
            selectSound(device.id, channel, preset);
          }
        }

        // Apply drum kit presets based on detected GM kit
        const drumInfo = importResult.trackInfos?.find((t) => t.isDrum);
        if (drumInfo) {
          const drumPresets = gmDrumKitPresets(drumInfo.gmProgram);
          for (const [ch, pid] of Object.entries(drumPresets)) {
            const preset = findPresetById(pid);
            if (preset) {
              selectSound(device.id, Number(ch) as SeqtrackChannel, preset);
            }
          }
        }
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import patterns");
    } finally {
      setLoading(false);
    }
  }, [importResult, project, bars, presetSelections, setProject, onOpenChange]);

  // ── Dialog close ───────────────────────────────────────────
  const handleClose = useCallback((nextOpen: boolean) => {
    if (!nextOpen && loading) return;
    if (!nextOpen) {
      setImportResult(null);
      setError(null);
      setPresetSelections({});
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, loading]);

  const handleForceClose = useCallback(() => {
    setImportResult(null);
    setError(null);
    setLoading(false);
    setPresetSelections({});
    onOpenChange(false);
  }, [onOpenChange]);

  // ── Tab change ─────────────────────────────────────────────
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setImportResult(null);
    setError(null);
    setPresetSelections({});
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileMusic className="size-4 text-primary" />
              <DialogTitle>Import</DialogTitle>
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
            Import sheet music, MIDI files, drum tabs, bass tabs, or note sequences into your project.
          </DialogDescription>
        </DialogHeader>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border -mx-4 px-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30",
                )}
              >
                <Icon className="size-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-[180px]">
          {activeTab === "sheet" && (
            <SheetTab
              onResult={handleResult}
              onError={handleError}
              disabled={loading}
              instrument={instrument}
              targetChannel={targetChannel}
            />
          )}

          {activeTab === "midi" && (
            <MidiTab
              onResult={handleResult}
              onError={handleError}
              disabled={loading}
              importResult={importResult}
              onPresetSelectionsChange={setPresetSelections}
            />
          )}

          {activeTab === "drumtab" && (
            <DrumTab
              onResult={handleResult}
              onError={handleError}
              disabled={loading}
            />
          )}

          {activeTab === "basstab" && (
            <BassTab
              onResult={handleResult}
              onError={handleError}
              targetChannel={targetChannel}
              disabled={loading}
            />
          )}

          {activeTab === "notes" && (
            <NotesTab
              onResult={handleResult}
              onError={handleError}
              instrument={instrument}
              targetChannel={targetChannel}
              disabled={loading}
            />
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 mt-3">
              <AlertCircle className="size-4 mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Common controls */}
        <div className="flex flex-col gap-3 border-t border-border pt-3 -mx-4 px-4">
          {/* Instrument + Target Channel row */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-muted-foreground">Instrument</label>
              <select
                value={instrument}
                onChange={(e) => handleInstrumentChange(e.target.value)}
                className="flex h-7 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {INSTRUMENT_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-muted-foreground">Target channel</label>
              <select
                value={targetChannel}
                onChange={(e) => setTargetChannel(parseInt(e.target.value, 10) as SeqtrackChannel)}
                className="flex h-7 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {ALL_CHANNELS.map((ch) => {
                  const info = SEQTRAK_TRACKS[ch];
                  return (
                    <option key={ch} value={ch}>
                      Ch {ch} - {info.name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Bars selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Bars</label>
            <div className="flex gap-1.5">
              {BAR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBars(opt.value)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    bars === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  <div>{opt.label} bar{opt.value > 1 ? "s" : ""}</div>
                  <div className="text-[10px] opacity-60">{opt.steps} steps</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview section */}
          {previewData && previewData.totalNotes > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {previewData.totalNotes} note{previewData.totalNotes !== 1 ? "s" : ""}
                </Badge>
                {previewData.detectedBpm && (
                  <Badge variant="outline">{Math.round(previewData.detectedBpm)} BPM</Badge>
                )}
                {previewData.detectedKey && (
                  <Badge variant="outline">{previewData.detectedKey}</Badge>
                )}
                {previewData.name && (
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {previewData.name}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Array.from(previewData.channelCounts.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([ch, count]) => {
                    const info = SEQTRAK_TRACKS[ch as SeqtrackChannel];
                    if (!info) return null;
                    const dotColor = getTrackSolidClass(ch as SeqtrackChannel);
                    return (
                      <div key={ch} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("size-2 rounded-full", dotColor)} />
                        <span className="font-medium">{info.name}</span>
                        <span className="opacity-60">{count}</span>
                      </div>
                    );
                  })}
              </div>

              <div className="flex gap-px flex-wrap">
                {Array.from({ length: previewData.stepsToShow }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "size-2 rounded-sm transition-colors",
                      previewData.stepHits.has(i)
                        ? "bg-primary"
                        : i % 4 === 0
                          ? "bg-muted-foreground/20"
                          : "bg-muted-foreground/10",
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!importResult || importResult.notes.length === 0 || loading}
              onClick={handleImport}
              className="gap-1.5"
            >
              <FileMusic className="size-3" data-icon="inline-start" />
              Import to Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
