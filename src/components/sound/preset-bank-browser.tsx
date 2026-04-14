"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { useSoundControl } from "@/hooks/use-sound-control";
import { useProject } from "@/providers/project-provider";
import {
  MICROFREAK_PRESETS,
  MF_BANK_LABELS,
  MF_BANK_INFO,
  MF_SLOTS_PER_BANK,
  type MFBank,
} from "@/lib/midi/microfreak-presets";
import { loadUserPresets, deleteUserPreset } from "@/lib/midi/microfreak-user-presets";
import type { SoundPreset, SoundCategory, SeqtrackChannel, MicroFreakUserPreset } from "@/lib/midi/types";
import { cn } from "@/lib/utils";
import { Loader2, Download, Trash2, User } from "lucide-react";

import { PresetRow } from "@/components/sound/preset-row";
import { PresetParamDisplay } from "@/components/sound/preset-param-display";
import { RecordToDevice, type RecordState } from "@/components/sound/record-to-device";

// ── Types ───────────────────────────────────────────────────────

interface PresetReadResult {
  presetIndex: number;
  params: Record<number, number>;
}

// ── Constants ───────────────────────────────────────────────────

// Build a lookup map for factory presets by ID (faster than .find())
const FACTORY_BY_ID = new Map<number, SoundPreset>();
for (const p of MICROFREAK_PRESETS) FACTORY_BY_ID.set(p.id, p);

const ALL_CATEGORIES: SoundCategory[] = [
  "Bass", "Pad", "Synth Lead", "Keyboard", "Bell", "Strings",
  "Rhythmic", "SFX",
];

// ── Helpers ─────────────────────────────────────────────────────

function isUserPreset(p: SoundPreset | null): p is MicroFreakUserPreset {
  return !!p && "isUserPreset" in p && (p as MicroFreakUserPreset).isUserPreset === true;
}

/** Build the full 128-slot array for a bank, merging factory + user presets. */
function buildBankSlots(bank: MFBank, userPresets: Record<number, MicroFreakUserPreset>): (SoundPreset | null)[] {
  const info = MF_BANK_INFO[bank];
  return Array.from({ length: MF_SLOTS_PER_BANK }, (_, i) => {
    const id = info.startId + i;
    const factory = FACTORY_BY_ID.get(id);
    if (factory) return factory;
    return userPresets[id] ?? null;
  });
}

// ── Main Component ──────────────────────────────────────────────

export function PresetBankBrowser() {
  const { device } = useMidiConnection();
  const { selectPreset, sendSysExMessage } = useSoundControl();
  const { project } = useProject();
  const isConnected = !!device;

  const [bank, setBank] = useState<MFBank>("A");
  const [selectedPreset, setSelectedPreset] = useState<SoundPreset | null>(null);
  const [selectedEmptySlot, setSelectedEmptySlot] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<SoundCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [readResult, setReadResult] = useState<PresetReadResult | null>(null);
  const [isReading, setIsReading] = useState(false);

  // User presets from localStorage
  const [userPresets, setUserPresets] = useState<Record<number, MicroFreakUserPreset>>({});

  useEffect(() => {
    setUserPresets(loadUserPresets());
  }, []);

  // Captured params (shared with RecordToDevice)
  const [capturedParams, setCapturedParams] = useState<Record<number, number> | null>(null);

  // Track record state from RecordToDevice child
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const handleRecordStateChange = useCallback((state: RecordState) => {
    setRecordState(state);
  }, []);

  // Build full slot grid for current bank
  const bankSlots = useMemo(() => buildBankSlots(bank, userPresets), [bank, userPresets]);

  // Get only non-null presets for filtering
  const bankPresets = useMemo(() => bankSlots.filter((p): p is SoundPreset => p !== null), [bankSlots]);

  // Apply filters — show all 128 slots when no filter, or filtered presets when filter active
  const filteredSlots = useMemo(() => {
    if (categoryFilter === "all" && !search.trim()) return bankSlots;
    // When filtering, only show matching presets (no empty slots)
    let result = bankPresets;
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [bankSlots, bankPresets, categoryFilter, search]);

  const isFiltering = categoryFilter !== "all" || search.trim().length > 0;

  // Select and load preset on device, then play a test note
  const handleSelectPreset = useCallback((preset: SoundPreset) => {
    setSelectedPreset(preset);
    setSelectedEmptySlot(null);
    setReadResult(null);
    setCapturedParams(null);

    // Auto-show params for user presets
    if (isUserPreset(preset)) {
      setReadResult({ presetIndex: preset.id - 1, params: preset.params });
    }

    if (device) {
      void selectPreset(1 as Parameters<typeof selectPreset>[0], preset);
      setTimeout(async () => {
        const { sendNote } = await import("@/lib/webmidi/midi-sender");
        sendNote(device.id, 1 as Parameters<typeof sendNote>[1], 60, 100, 300);
      }, 50);
    }
  }, [device, selectPreset]);

  // Select an empty slot (for recording target)
  const handleSelectEmpty = useCallback((slotId: number) => {
    setSelectedPreset(null);
    setSelectedEmptySlot(slotId);
    setReadResult(null);
    setCapturedParams(null);
  }, []);

  // Read preset parameters from device via SysEx
  const handleReadFromDevice = useCallback(async () => {
    if (!device || isReading) return;
    const targetIndex = selectedPreset ? selectedPreset.id - 1 : selectedEmptySlot ? selectedEmptySlot - 1 : null;
    if (targetIndex === null) return;

    setIsReading(true);
    setReadResult(null);

    try {
      const { readPresetFromDevice } = await import("@/lib/midi/microfreak-sysex");
      const result = await readPresetFromDevice(device.id, targetIndex);
      if (result) {
        setReadResult({ presetIndex: result.presetIndex, params: result.params });
      }
    } catch (err) {
      console.error("SysEx read failed:", err);
    } finally {
      setIsReading(false);
    }
  }, [selectedPreset, selectedEmptySlot, device, isReading]);

  // Send a CC directly to tweak a parameter
  const handleTweakParam = useCallback(async (cc: number, value: number) => {
    if (!device) return;
    const { sendCC } = await import("@/lib/webmidi/midi-sender");
    sendCC(device.id, 1 as Parameters<typeof sendCC>[1], cc, value);
  }, [device]);

  // Get the MicroFreak pattern from the current project (channel 1)
  const microfreakTrack = project.tracks[1 as SeqtrackChannel];
  const currentPattern = microfreakTrack?.patterns[microfreakTrack.activePattern] ?? null;
  const patternNoteCount = currentPattern?.notes.length ?? 0;
  const patternBars = currentPattern?.bars ?? 0;
  const hasPattern = !!currentPattern && patternNoteCount > 0;

  // The target slot for recording (works for both selected presets and empty slots)
  const recordTargetSlot = selectedPreset?.id ?? selectedEmptySlot ?? null;

  // Delete a user preset
  const handleDeleteUserPreset = useCallback((slotId: number) => {
    deleteUserPreset(slotId);
    setUserPresets(loadUserPresets());
    setSelectedPreset(null);
    setSelectedEmptySlot(slotId);
    setReadResult(null);
  }, []);

  // Callback when RecordToDevice saves a preset
  const handlePresetSaved = useCallback((newPreset: MicroFreakUserPreset) => {
    setUserPresets(loadUserPresets());
    setSelectedPreset(newPreset);
    setSelectedEmptySlot(null);
    setReadResult({ presetIndex: newPreset.id - 1, params: newPreset.params });
  }, []);

  // Whether we have a selected target (preset or empty slot)
  const hasSelection = !!selectedPreset || !!selectedEmptySlot;
  const selectionLabel = selectedPreset
    ? `#${selectedPreset.id} ${selectedPreset.name}`
    : selectedEmptySlot
      ? `#${selectedEmptySlot} (Empty Slot)`
      : "";

  return (
    <div className="flex flex-col h-full gap-3 p-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">MicroFreak Presets</h2>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full",
          isConnected ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground",
        )}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Bank selector + search */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {MF_BANK_LABELS.map((b) => {
            const info = MF_BANK_INFO[b];
            return (
              <button
                key={b}
                onClick={() => { setBank(b); setSelectedPreset(null); setSelectedEmptySlot(null); setReadResult(null); }}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  bank === b
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:border-foreground/30",
                )}
              >
                {b} <span className="text-[10px] opacity-60">({info.label})</span>
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presets..."
          className={cn(
            "h-7 flex-1 max-w-48 rounded-lg border border-input bg-transparent px-2 text-xs",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
            "dark:bg-input/30",
          )}
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
            categoryFilter === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:border-foreground/30",
          )}
        >
          All ({bankPresets.length})
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const count = bankPresets.filter((p) => p.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                categoryFilter === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30",
              )}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Main content: preset list + detail panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Preset list */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border">
          {filteredSlots.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">
              {search ? "No presets match your search" : "No presets in this bank"}
            </p>
          ) : (
            <div className="flex flex-col py-1">
              {filteredSlots.map((slot, i) => {
                // For filtered view, slot is a SoundPreset; for full view it may be null
                const preset = slot as SoundPreset | null;
                const slotId = preset?.id ?? (MF_BANK_INFO[bank].startId + i);
                return (
                  <PresetRow
                    key={slotId}
                    preset={preset}
                    slotId={slotId}
                    isSelected={
                      (selectedPreset?.id === slotId) ||
                      (selectedEmptySlot === slotId)
                    }
                    isConnected={isConnected}
                    onSelect={handleSelectPreset}
                    onSelectEmpty={handleSelectEmpty}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {hasSelection ? (
            <>
              {/* Preset / slot info */}
              <div className="rounded-lg border border-border p-3">
                {selectedPreset ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      {isUserPreset(selectedPreset) && (
                        <User className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      )}
                      <h3 className="font-semibold text-sm truncate">{selectedPreset.name}</h3>
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                      <span>Slot #{selectedPreset.id} — {selectedPreset.category}</span>
                      <span>Bank {MF_BANK_LABELS[selectedPreset.bankMSB] ?? "?"} / PC {selectedPreset.programNumber}</span>
                      {isUserPreset(selectedPreset) && selectedPreset.sourceDescription && (
                        <span className="text-orange-400/70">{selectedPreset.sourceDescription}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-sm text-muted-foreground">Empty Slot #{selectedEmptySlot}</h3>
                    <div className="mt-1 text-xs text-muted-foreground/60">
                      <span>Bank {bank} / PC {((selectedEmptySlot! - 1) % 128)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Read from device button */}
              <button
                onClick={handleReadFromDevice}
                disabled={!isConnected || isReading}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-xs font-medium transition-colors",
                  "hover:border-foreground/30 hover:bg-muted/50",
                  (!isConnected || isReading) && "opacity-50 cursor-not-allowed",
                )}
              >
                {isReading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Reading SysEx...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    Read from Device
                  </>
                )}
              </button>

              {/* Delete user preset */}
              {selectedPreset && isUserPreset(selectedPreset) && recordState === "idle" && (
                <button
                  onClick={() => handleDeleteUserPreset(selectedPreset.id)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400/70 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Saved Preset
                </button>
              )}

              {/* Parameter display */}
              {readResult && (
                <PresetParamDisplay
                  params={readResult.params}
                  title={selectedPreset && isUserPreset(selectedPreset) ? "Saved Parameters" : "Device Parameters"}
                />
              )}

              {/* No read result yet */}
              {!readResult && !isReading && recordState === "idle" && (
                <p className="text-[11px] text-muted-foreground/50 text-center px-2">
                  Click &quot;Read from Device&quot; to load the current parameter values via SysEx
                </p>
              )}

              {/* ── Record to Device ── */}
              {hasPattern && recordTargetSlot && currentPattern && device && (
                <RecordToDevice
                  deviceId={device.id}
                  isConnected={isConnected}
                  recordTargetSlot={recordTargetSlot}
                  selectionLabel={selectionLabel}
                  currentPattern={currentPattern}
                  patternBars={patternBars}
                  patternNoteCount={patternNoteCount}
                  bpm={project.bpm}
                  capturedParams={capturedParams}
                  setCapturedParams={setCapturedParams}
                  isExistingPreset={!!selectedPreset}
                  setReadResult={setReadResult}
                  onPresetSaved={handlePresetSaved}
                  onRecordStateChange={handleRecordStateChange}
                />
              )}

              {!hasPattern && (
                <p className="text-[11px] text-muted-foreground/40 text-center px-2">
                  Compose a pattern first to enable recording to the device
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
              Select a preset or empty slot
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
