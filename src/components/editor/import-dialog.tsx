"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import {
  FileMusic,
  Upload,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProject } from "@/providers/project-provider";
import { SEQTRAK_TRACKS, ALL_CHANNELS, STEPS_PER_BAR } from "@/lib/midi/constants";
import type { SeqtrackChannel } from "@/lib/midi/types";
import type { ImportResult } from "@/lib/import/types";
import { INSTRUMENTS } from "@/lib/import/types";
import { parseDrumTab } from "@/lib/import/drum-tab-parser";
import { parseBassTab, parseGuitarTab } from "@/lib/import/tab-parser";
import { parseNotation } from "@/lib/import/notation-parser";

// ── Constants ────────────────────────────────────────────────────

const TABS = [
  { id: "sheet", label: "Sheet/PDF", icon: FileMusic },
  { id: "midi", label: "MIDI", icon: Music },
  { id: "drumtab", label: "Drum Tab", icon: Drum },
  { id: "basstab", label: "Bass Tab", icon: Guitar },
  { id: "notes", label: "Notes", icon: Music },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SHEET_ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".musicxml", ".xml"];
const MIDI_ACCEPTED_EXTENSIONS = [".mid", ".midi"];

const BAR_OPTIONS = [
  { value: 1, label: "1", steps: "16" },
  { value: 2, label: "2", steps: "32" },
  { value: 4, label: "4", steps: "64" },
  { value: 8, label: "8", steps: "128" },
];

const INSTRUMENT_OPTIONS = INSTRUMENTS.map((i) => i.name);

const TRACK_BG_DOT: Record<string, string> = {
  red: "bg-red-500", yellow: "bg-yellow-500", fuchsia: "bg-fuchsia-500",
  cyan: "bg-cyan-500", blue: "bg-blue-500", green: "bg-green-500",
  slate: "bg-slate-400", purple: "bg-purple-500", teal: "bg-teal-500",
  amber: "bg-amber-500", emerald: "bg-emerald-500",
};

// ── Component ────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { project, setProject } = useProject();

  // ── State ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("sheet");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState("Piano");
  const [targetChannel, setTargetChannel] = useState<SeqtrackChannel>(9);
  const [bars, setBars] = useState(4);
  const [tabType, setTabType] = useState<"bass" | "guitar">("bass");

  // Text inputs for tab/notation modes
  const [drumTabText, setDrumTabText] = useState("");
  const [bassTabText, setBassTabText] = useState("");
  const [notesText, setNotesText] = useState("");

  // File input refs
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);

  // Drop zone state
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Instrument -> channel auto-selection ────────────────────
  const handleInstrumentChange = useCallback((name: string) => {
    setInstrument(name);
    const preset = INSTRUMENTS.find((i) => i.name === name);
    if (preset) {
      setTargetChannel(preset.defaultChannel);
    }
  }, []);

  // ── Preview data ────────────────────────────────────────────
  const previewData = useMemo(() => {
    if (!importResult) return null;

    // Count notes per channel
    const channelCounts = new Map<number, number>();
    for (const note of importResult.notes) {
      const ch = note.channel ?? targetChannel;
      channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
    }

    // Build mini step dots (first 32 steps)
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

  // ── File handlers ──────────────────────────────────────────

  const handleSheetFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setImportResult(null);

    try {
      const { parseSheetMusic } = await import("@/lib/import/sheet-music-parser");
      const result = await parseSheetMusic(file, {
        instrument,
        targetChannel,
      });
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse sheet music");
    } finally {
      setLoading(false);
    }
  }, [instrument, targetChannel]);

  const handleMidiFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    setImportResult(null);

    try {
      const { parseMidiFile } = await import("@/lib/import/midi-import");
      const buffer = await file.arrayBuffer();
      const result = parseMidiFile(buffer);
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse MIDI file");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Text parse handlers ────────────────────────────────────

  const handleDrumTabParse = useCallback((text: string) => {
    setDrumTabText(text);
    setError(null);
    if (!text.trim()) {
      setImportResult(null);
      return;
    }
    try {
      const result = parseDrumTab(text);
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse drum tab");
    }
  }, []);

  const handleBassTabParse = useCallback((text: string) => {
    setBassTabText(text);
    setError(null);
    if (!text.trim()) {
      setImportResult(null);
      return;
    }
    try {
      const result = tabType === "bass"
        ? parseBassTab(text, targetChannel)
        : parseGuitarTab(text, targetChannel);
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse tab");
    }
  }, [tabType, targetChannel]);

  const handleNotesParse = useCallback((text: string) => {
    setNotesText(text);
    setError(null);
    if (!text.trim()) {
      setImportResult(null);
      return;
    }
    try {
      const result = parseNotation(text, instrument, targetChannel);
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse notation");
    }
  }, [instrument, targetChannel]);

  // ── Drag & drop helpers ────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleSheetDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSheetFile(file);
  }, [handleSheetFile]);

  const handleMidiDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleMidiFile(file);
  }, [handleMidiFile]);

  // ── Import apply handler ───────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!importResult) return;

    setLoading(true);
    try {
      const { importToPatterns } = await import("@/lib/import/convert");
      const patterns = importToPatterns(importResult, project.bpm, bars);

      const updated = { ...project };
      const updatedTracks = { ...updated.tracks };

      for (const { channel, pattern } of patterns) {
        const track = { ...updatedTracks[channel] };
        track.patterns = [...track.patterns];
        track.patterns[track.activePattern] = pattern;
        updatedTracks[channel] = track;
      }

      updated.tracks = updatedTracks;
      setProject({ ...updated, updatedAt: new Date().toISOString() });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import patterns");
    } finally {
      setLoading(false);
    }
  }, [importResult, project, bars, setProject, onOpenChange]);

  // ── Dialog close ───────────────────────────────────────────

  const handleClose = useCallback((nextOpen: boolean) => {
    if (!nextOpen && loading) return;
    if (!nextOpen) {
      setImportResult(null);
      setError(null);
      setDrumTabText("");
      setBassTabText("");
      setNotesText("");
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, loading]);

  const handleForceClose = useCallback(() => {
    setImportResult(null);
    setError(null);
    setLoading(false);
    setDrumTabText("");
    setBassTabText("");
    setNotesText("");
    onOpenChange(false);
  }, [onOpenChange]);

  // ── Tab change ─────────────────────────────────────────────

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setImportResult(null);
    setError(null);
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
          {/* ── Sheet/PDF tab ──────────────────────────────── */}
          {activeTab === "sheet" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => sheetInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleSheetDrop}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
                  "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
                  isDragOver && "border-primary bg-primary/5 text-foreground",
                  loading && "pointer-events-none opacity-50",
                )}
              >
                <Upload className="size-7" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isDragOver ? "Drop to import" : "Drag sheet music, PDF, or photo here"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, PNG, JPG, MusicXML
                  </p>
                </div>
              </button>
              <input
                ref={sheetInputRef}
                type="file"
                accept={SHEET_ACCEPTED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSheetFile(file);
                  e.target.value = "";
                }}
                disabled={loading}
              />
            </div>
          )}

          {/* ── MIDI tab ──────────────────────────────────── */}
          {activeTab === "midi" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => midiInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleMidiDrop}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
                  "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
                  isDragOver && "border-primary bg-primary/5 text-foreground",
                  loading && "pointer-events-none opacity-50",
                )}
              >
                <Upload className="size-7" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isDragOver ? "Drop to import" : "Drop MIDI file here or click to browse"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Standard MIDI File (.mid)
                  </p>
                </div>
              </button>
              <input
                ref={midiInputRef}
                type="file"
                accept={MIDI_ACCEPTED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleMidiFile(file);
                  e.target.value = "";
                }}
                disabled={loading}
              />
            </div>
          )}

          {/* ── Drum Tab tab ──────────────────────────────── */}
          {activeTab === "drumtab" && (
            <div className="flex flex-col gap-3">
              <Textarea
                placeholder={`HH|x-x-x-x-x-x-x-x-|\nSD|----o-------o-----|\nBD|o-------o---------|`}
                value={drumTabText}
                onChange={(e) => handleDrumTabParse(e.target.value)}
                className="min-h-[120px] resize-none font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Symbols: <span className="font-mono">o/x</span> = hit, <span className="font-mono">O/X</span> = accent, <span className="font-mono">g</span> = ghost, <span className="font-mono">-</span> = rest, <span className="font-mono">|</span> = barline
              </p>
            </div>
          )}

          {/* ── Bass/Guitar Tab tab ───────────────────────── */}
          {activeTab === "basstab" && (
            <div className="flex flex-col gap-3">
              {/* Bass / Guitar toggle */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTabType("bass");
                    if (bassTabText.trim()) handleBassTabParse(bassTabText);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    tabType === "bass"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  Bass (4-string)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTabType("guitar");
                    if (bassTabText.trim()) handleBassTabParse(bassTabText);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    tabType === "guitar"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  Guitar (6-string)
                </button>
              </div>

              <Textarea
                placeholder={
                  tabType === "bass"
                    ? `G|-------|\nD|---2-0-|\nA|-3-----|\nE|-------|`
                    : `e|-------0---|\nB|-----0-----|\nG|---0-------|\nD|-----------|\nA|-----------|\nE|-3---------|`
                }
                value={bassTabText}
                onChange={(e) => handleBassTabParse(e.target.value)}
                className="min-h-[120px] resize-none font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Fret numbers on each string line. <span className="font-mono">-</span> = rest, <span className="font-mono">x</span> = muted, <span className="font-mono">h</span> = hammer-on, <span className="font-mono">p</span> = pull-off
              </p>
            </div>
          )}

          {/* ── Notes tab ─────────────────────────────────── */}
          {activeTab === "notes" && (
            <div className="flex flex-col gap-3">
              <Textarea
                placeholder="C4 E4 G4 C5 | G4 E4 C4"
                value={notesText}
                onChange={(e) => handleNotesParse(e.target.value)}
                className="min-h-[100px] resize-none font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Note names with optional duration: <span className="font-mono">C4/4</span> = quarter, <span className="font-mono">D4/8</span> = eighth, <span className="font-mono">E4/16</span> = sixteenth. Separate bars with <span className="font-mono">|</span>. Use <span className="font-mono">-</span> or <span className="font-mono">r</span> for rests.
              </p>
            </div>
          )}

          {/* ── Loading state ─────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </div>
          )}

          {/* ── Error state ───────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 mt-3">
              <AlertCircle className="size-4 mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* ── Common controls ───────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-border pt-3 -mx-4 px-4">
          {/* Instrument + Target Channel row */}
          <div className="flex gap-3">
            {/* Instrument dropdown */}
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

            {/* Target channel dropdown */}
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
              {/* Header info */}
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

              {/* Per-channel note counts */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Array.from(previewData.channelCounts.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([ch, count]) => {
                    const info = SEQTRAK_TRACKS[ch as SeqtrackChannel];
                    if (!info) return null;
                    const dotColor = TRACK_BG_DOT[info.color] ?? "bg-gray-500";
                    return (
                      <div key={ch} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("size-2 rounded-full", dotColor)} />
                        <span className="font-medium">{info.name}</span>
                        <span className="opacity-60">{count}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Mini step dots */}
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
