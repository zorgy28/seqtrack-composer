"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { MicroFreakUserPreset } from "@/lib/midi/types";
import type { RecordSession, RecordState } from "@/lib/midi/microfreak-record";
export type { RecordState } from "@/lib/midi/microfreak-record";
import type { Pattern } from "@/lib/midi/types";
import { saveUserPreset } from "@/lib/midi/microfreak-user-presets";
import { generatePresetName, inferCategory } from "@/lib/midi/preset-name-generator";
import { STEPS_PER_BAR } from "@/lib/midi/constants";
import { cn } from "@/lib/utils";
import { Loader2, Circle, Square, Play } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────

export interface RecordToDeviceProps {
  deviceId: string;
  isConnected: boolean;
  recordTargetSlot: number;
  selectionLabel: string;
  currentPattern: Pattern;
  patternBars: number;
  patternNoteCount: number;
  bpm: number;
  capturedParams: Record<number, number> | null;
  setCapturedParams: (params: Record<number, number> | null) => void;
  setReadResult: (result: { presetIndex: number; params: Record<number, number> } | null) => void;
  /** True when recording to an existing preset slot (vs an empty slot) */
  isExistingPreset: boolean;
  onPresetSaved: (preset: MicroFreakUserPreset) => void;
  onRecordStateChange?: (state: RecordState) => void;
}

// ── Component ───────────────────────────────────────────────────

export function RecordToDevice({
  deviceId,
  isConnected,
  recordTargetSlot,
  selectionLabel,
  currentPattern,
  patternBars,
  patternNoteCount,
  bpm,
  capturedParams,
  setCapturedParams,
  isExistingPreset,
  setReadResult,
  onPresetSaved,
  onRecordStateChange,
}: RecordToDeviceProps) {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [recordStep, setRecordStep] = useState(0);
  const [recordTotalSteps, setRecordTotalSteps] = useState(0);
  const recordSessionRef = useRef<RecordSession | null>(null);

  const [isCapturingParams, setIsCapturingParams] = useState(false);
  const [presetName, setPresetName] = useState("");

  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Notify parent of record state changes
  useEffect(() => {
    onRecordStateChange?.(recordState);
  }, [recordState, onRecordStateChange]);

  // Start the record-to-device flow -- capture params, generate name, then wait for user
  const handleRecordToSlot = useCallback(async () => {
    if (!isConnected || !recordTargetSlot || !currentPattern) return;

    setRecordState("waiting");
    setRecordStep(0);
    setCountdown(0);
    setIsCapturingParams(true);

    // Auto-capture current device parameters via SysEx
    try {
      const { readPresetFromDevice } = await import("@/lib/midi/microfreak-sysex");
      const dump = await readPresetFromDevice(deviceId, recordTargetSlot - 1);
      if (dump) {
        setCapturedParams(dump.params);
        setReadResult({ presetIndex: dump.presetIndex, params: dump.params });
        // Auto-generate name from params + pattern
        setPresetName(generatePresetName(currentPattern, bpm, dump.params));
      } else {
        setCapturedParams(null);
        setPresetName(generatePresetName(currentPattern, bpm));
      }
    } catch {
      setCapturedParams(null);
      setPresetName(generatePresetName(currentPattern, bpm));
    } finally {
      setIsCapturingParams(false);
    }
  }, [isConnected, recordTargetSlot, currentPattern, bpm, deviceId, setCapturedParams, setReadResult]);

  // Begin automatic countdown -> auto-start recording
  const handleArmAndRecord = useCallback(async () => {
    if (!isConnected || !currentPattern || !recordTargetSlot) return;

    // Send captured CCs to device before recording (ensures sound is set)
    if (capturedParams) {
      const { sendCC } = await import("@/lib/webmidi/midi-sender");
      for (const [ccStr, value] of Object.entries(capturedParams)) {
        sendCC(deviceId, 1 as Parameters<typeof sendCC>[1], Number(ccStr), value);
      }
      // Small delay for device to process CCs
      await new Promise((r) => setTimeout(r, 80));
    }

    // 3-second countdown, then auto-start
    setCountdown(3);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;

          // Trigger recording
          setRecordState("recording");
          import("@/lib/midi/microfreak-record").then(({ recordPatternToDevice }) => {
            const totalSteps = currentPattern.bars * STEPS_PER_BAR;
            setRecordTotalSteps(totalSteps);

            const session = recordPatternToDevice(
              deviceId,
              currentPattern,
              bpm,
              1, // MicroFreak channel
              (step, total) => {
                setRecordStep(step);
                setRecordTotalSteps(total);
              },
              () => {
                setRecordState("done");
                recordSessionRef.current = null;

                // Save user preset to localStorage
                if (recordTargetSlot && currentPattern) {
                  const newPreset: MicroFreakUserPreset = {
                    id: recordTargetSlot,
                    name: presetName || `Preset ${recordTargetSlot}`,
                    category: capturedParams
                      ? inferCategory(capturedParams, currentPattern)
                      : "Keyboard",
                    engine: "awm2",
                    bankMSB: Math.floor((recordTargetSlot - 1) / 128),
                    bankLSB: 0,
                    programNumber: (recordTargetSlot - 1) % 128,
                    params: capturedParams ?? {},
                    savedAt: new Date().toISOString(),
                    sourceDescription: `${currentPattern.bars} bar${currentPattern.bars !== 1 ? "s" : ""}, ${currentPattern.notes.length} notes, ${bpm} BPM`,
                    isUserPreset: true,
                  };
                  saveUserPreset(recordTargetSlot, newPreset);
                  onPresetSaved(newPreset);
                }
              },
            );
            recordSessionRef.current = session;
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isConnected, currentPattern, bpm, capturedParams, presetName, recordTargetSlot, deviceId, onPresetSaved]);

  // Cancel recording or countdown
  const handleCancelRecord = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    recordSessionRef.current?.cancel();
    recordSessionRef.current = null;
    setRecordState("idle");
    setRecordStep(0);
    setCountdown(0);
    setCapturedParams(null);
    setIsCapturingParams(false);
  }, [setCapturedParams]);

  return (
    <>
      {/* ── Record to Device ── */}
      {recordState === "idle" && (
        <div className="rounded-lg border border-red-500/20 p-3 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <Circle className="w-3 h-3 fill-red-500 text-red-500" />
            Record to {isExistingPreset ? "This Slot" : `Slot #${recordTargetSlot}`}
          </h4>
          <div className="text-[11px] text-muted-foreground flex flex-col gap-0.5">
            <span>Target: {selectionLabel}</span>
            <span>Pattern: {patternBars} bar{patternBars !== 1 ? "s" : ""}, {patternNoteCount} notes @ {bpm} BPM</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Captures current sound parameters + records the pattern sequence.
          </p>
          <button
            onClick={handleRecordToSlot}
            disabled={!isConnected || isCapturingParams}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs font-medium transition-colors",
              "text-red-400 hover:bg-red-500/25 hover:border-red-500/50",
              (!isConnected || isCapturingParams) && "opacity-50 cursor-not-allowed",
            )}
          >
            {isCapturingParams ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Reading parameters...
              </>
            ) : (
              <>
                <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                Record to #{recordTargetSlot}
              </>
            )}
          </button>
        </div>
      )}

      {/* Waiting: show name editor + press Record on device, then start */}
      {recordState === "waiting" && !isCapturingParams && countdown === 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <Circle className="w-3 h-3 fill-red-500 text-red-500" />
            Prepare to Record
          </h4>

          {/* Preset name editor */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Preset Name</label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={16}
              placeholder="Preset name..."
              className={cn(
                "h-7 rounded-lg border border-input bg-transparent px-2 text-xs font-medium",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
                "dark:bg-input/30",
              )}
            />
            <span className="text-[10px] text-muted-foreground/40 text-right">{presetName.length}/16</span>
          </div>

          {/* Captured params summary */}
          {capturedParams && (
            <div className="text-[10px] text-muted-foreground/60 bg-muted/20 rounded p-1.5">
              {Object.keys(capturedParams).length} parameters captured
            </div>
          )}

          <div className="text-[11px] text-muted-foreground flex flex-col gap-1 bg-muted/30 rounded p-2">
            <span>Press <strong className="text-foreground">Record</strong> on MicroFreak now.</span>
            <span className="text-[10px] text-muted-foreground/60">
              Sound parameters will be sent, then the pattern recorded.
            </span>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleArmAndRecord}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Play className="w-3 h-3" />
              Record is Armed — Start
            </button>
            <button
              onClick={handleCancelRecord}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Countdown */}
      {recordState === "waiting" && countdown > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex flex-col items-center gap-2">
          <span className="text-3xl font-bold tabular-nums text-red-400">{countdown}</span>
          <span className="text-[11px] text-muted-foreground">Recording starts automatically...</span>
          <button
            onClick={handleCancelRecord}
            className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Recording: progress */}
      {recordState === "recording" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
            Recording to #{recordTargetSlot}...
          </h4>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-100"
              style={{ width: `${recordTotalSteps > 0 ? (recordStep / recordTotalSteps) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            Step {recordStep + 1} / {recordTotalSteps}
          </span>
          <button
            onClick={handleCancelRecord}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        </div>
      )}

      {/* Done */}
      {recordState === "done" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-green-400">
            Preset &quot;{presetName}&quot; saved to #{recordTargetSlot}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {capturedParams && <span>{Object.keys(capturedParams).length} parameters + sequence recorded. </span>}
            Hold <strong>Preset</strong> on MicroFreak to save permanently on device.
          </p>
          <button
            onClick={() => { setRecordState("idle"); setCapturedParams(null); }}
            className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </>
  );
}
