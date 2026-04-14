"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
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
import { useSoundControl } from "@/hooks/use-sound-control";
import { useDeviceProfile } from "@/providers/device-provider";
import { SEQTRAK_TRACKS, ALL_CHANNELS, STEPS_PER_BAR, MAX_PATTERNS_PER_TRACK, MAX_BARS, getTrackSolidClass } from "@/lib/midi/constants";
import { importToMultiplePatterns } from "@/lib/import/convert";
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
  const { selectPreset } = useSoundControl();
  const { profile } = useDeviceProfile();
  const deviceChannels = profile.allChannels;

  // ── State ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("sheet");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState("Piano");
  const [targetChannel, setTargetChannel] = useState<SeqtrackChannel>(profile.synthChannels[0] ?? 9);
  const [bars, setBars] = useState(4);
  const [presetSelections, setPresetSelections] = useState<Partial<Record<SeqtrackChannel, number>>>({});
  const [rangeStart, setRangeStart] = useState(0); // 0-based bar index
  const [rangeEnd, setRangeEnd] = useState(8);      // exclusive

  // ── Auto-update range for long files ────────────────────────
  useEffect(() => {
    if (importResult?.totalBars && importResult.totalBars > 8) {
      const maxRange = Math.min(importResult.totalBars, MAX_PATTERNS_PER_TRACK * MAX_BARS);
      setRangeStart(0);
      setRangeEnd(maxRange);
    }
  }, [importResult]);

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
      const isLongFile = importResult.totalBars && importResult.totalBars > 8;

      if (isLongFile) {
        // Multi-pattern import
        const multiPatterns = importToMultiplePatterns(importResult, rangeStart, rangeEnd, project.bpm);

        const updated = { ...project };
        const updatedTracks = { ...updated.tracks };

        for (const { channel, patterns } of multiPatterns) {
          const track = { ...updatedTracks[channel] };
          track.patterns = patterns;
          track.activePattern = 0;
          updatedTracks[channel] = track;
        }

        updated.tracks = updatedTracks;
        setProject({ ...updated, updatedAt: new Date().toISOString() });

        // Apply sound presets
        const { findPresetById } = await import("@/lib/midi/sound-library");
        const { gmDrumKitPresets } = await import("@/lib/import/gm-to-seqtrack");

        // Melodic presets — 80ms spacing lets SEQTRAK process each Bank Select + PC
        for (const { channel, presetId } of multiPatterns) {
          if (!presetId) continue;
          const preset = findPresetById(presetId);
          if (preset) {
            await selectPreset(channel, preset);
            await new Promise(r => setTimeout(r, 80));
          }
        }

        // Drum presets
        const drumInfo = importResult.trackInfos?.find((t) => t.isDrum);
        if (drumInfo) {
          const drumPresets = gmDrumKitPresets(drumInfo.gmProgram);
          for (const [ch, pid] of Object.entries(drumPresets)) {
            const preset = findPresetById(Number(pid));
            if (preset) {
              await selectPreset(Number(ch) as SeqtrackChannel, preset);
              await new Promise(r => setTimeout(r, 80));
            }
          }
        }

        onOpenChange(false);
      } else {
        // Existing short-file import
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

        // Apply sound presets — uses selectPreset which both sends MIDI
        // program changes AND updates the UI sound state
        const { findPresetById } = await import("@/lib/midi/sound-library");
        const { gmDrumKitPresets } = await import("@/lib/import/gm-to-seqtrack");

        // Apply melodic presets (Ch 8-10) — 80ms spacing lets SEQTRAK process each
        for (const { channel, presetId } of patterns) {
          if (!presetId) continue;
          const preset = findPresetById(presetId);
          if (preset) {
            await selectPreset(channel, preset);
            await new Promise(r => setTimeout(r, 80));
          }
        }

        // Apply drum kit presets (Ch 1-7) based on detected GM kit
        const drumInfo = importResult.trackInfos?.find((t) => t.isDrum);
        if (drumInfo) {
          const drumPresets = gmDrumKitPresets(drumInfo.gmProgram);
          for (const [ch, pid] of Object.entries(drumPresets)) {
            const preset = findPresetById(Number(pid));
            if (preset) {
              await selectPreset(Number(ch) as SeqtrackChannel, preset);
              await new Promise(r => setTimeout(r, 80));
            }
          }
        }

        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import patterns");
    } finally {
      setLoading(false);
    }
  }, [importResult, project, bars, rangeStart, rangeEnd, presetSelections, setProject, selectPreset, onOpenChange]);

  // ── Dialog close ───────────────────────────────────────────
  const handleClose = useCallback((nextOpen: boolean) => {
    if (!nextOpen && loading) return;
    if (!nextOpen) {
      setImportResult(null);
      setError(null);
      setPresetSelections({});
      setRangeStart(0);
      setRangeEnd(8);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, loading]);

  const handleForceClose = useCallback(() => {
    setImportResult(null);
    setError(null);
    setLoading(false);
    setPresetSelections({});
    setRangeStart(0);
    setRangeEnd(8);
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
                {deviceChannels.map((ch) => {
                  const profileTrack = profile.tracks.find(t => t.channel === ch);
                  const name = profileTrack?.name ?? SEQTRAK_TRACKS[ch]?.name ?? `Ch ${ch}`;
                  return (
                    <option key={ch} value={ch}>
                      Ch {ch} - {name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Bars selector — short mode vs long mode */}
          {importResult?.totalBars && importResult.totalBars > 8 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This file contains {importResult.totalBars} bars. Select a range to import (max {MAX_PATTERNS_PER_TRACK * MAX_BARS} bars).
              </p>

              {/* Range inputs */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">From bar</label>
                <input
                  type="number"
                  min={1}
                  max={importResult.totalBars}
                  value={rangeStart + 1}
                  onChange={(e) => setRangeStart(Math.max(0, parseInt(e.target.value, 10) - 1))}
                  className="w-16 rounded border border-border bg-muted px-2 py-1 text-xs"
                />
                <label className="text-xs text-muted-foreground">to bar</label>
                <input
                  type="number"
                  min={rangeStart + 2}
                  max={Math.min(importResult.totalBars, rangeStart + MAX_PATTERNS_PER_TRACK * MAX_BARS)}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(parseInt(e.target.value, 10))}
                  className="w-16 rounded border border-border bg-muted px-2 py-1 text-xs"
                />
                <span className="text-xs text-muted-foreground">
                  ({rangeEnd - rangeStart} bars = {Math.ceil((rangeEnd - rangeStart) / MAX_BARS)} patterns)
                </span>
              </div>

              {/* Quick section presets */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => { setRangeStart(0); setRangeEnd(Math.min(8, importResult.totalBars!)); }}
                  className="rounded px-2 py-0.5 text-xs bg-muted hover:bg-accent text-muted-foreground"
                >
                  First 8 bars
                </button>
                {importResult.totalBars > 8 && (
                  <button
                    onClick={() => { setRangeStart(8); setRangeEnd(Math.min(16, importResult.totalBars!)); }}
                    className="rounded px-2 py-0.5 text-xs bg-muted hover:bg-accent text-muted-foreground"
                  >
                    Bars 9-16
                  </button>
                )}
                {importResult.totalBars <= MAX_PATTERNS_PER_TRACK * MAX_BARS && (
                  <button
                    onClick={() => { setRangeStart(0); setRangeEnd(importResult.totalBars!); }}
                    className="rounded px-2 py-0.5 text-xs bg-primary/20 hover:bg-primary/30 text-primary"
                  >
                    Full song
                  </button>
                )}
              </div>
            </div>
          ) : (
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
          )}

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
                    const profileTrack = profile.tracks.find(t => t.channel === ch);
                    const trackName = profileTrack?.name ?? SEQTRAK_TRACKS[ch as SeqtrackChannel]?.name ?? `Ch ${ch}`;
                    const dotColor = getTrackSolidClass(ch as SeqtrackChannel);
                    return (
                      <div key={ch} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("size-2 rounded-full", dotColor)} />
                        <span className="font-medium">{trackName}</span>
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
