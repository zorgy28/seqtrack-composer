"use client";

import { cn } from "@/lib/utils";
import { NOTE_NAMES, SCALE_NAMES, BPM_MIN, BPM_MAX } from "@/lib/midi/constants";
import { ModelSelector, type ModelSelection, type LLMProvider } from "./model-selector";

// ── Constants ────────────────────────────────────────────────────

const BAR_OPTIONS = [1, 2, 4, 8] as const;

// ── Types ────────────────────────────────────────────────────────

interface ComposeParamsProps {
  bars: number;
  onBarsChange: (bars: number) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  scaleRoot: string;
  onScaleRootChange: (root: string) => void;
  scaleName: string;
  onScaleNameChange: (name: string) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
  modelProvider: string;
  modelId: string;
  onModelChange: (provider: string, modelId: string) => void;
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Format scale name for display: "pentatonic_minor" → "Pentatonic Minor" */
function formatScaleName(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Component ────────────────────────────────────────────────────

export function ComposeParams({
  bars,
  onBarsChange,
  bpm,
  onBpmChange,
  scaleRoot,
  onScaleRootChange,
  scaleName,
  onScaleNameChange,
  swing,
  onSwingChange,
  modelProvider,
  modelId,
  onModelChange,
  disabled = false,
}: ComposeParamsProps) {
  const selectClass = cn(
    "h-7 rounded-lg border border-input bg-transparent px-1.5 text-xs",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
    "dark:bg-input/30 dark:hover:bg-input/50",
    disabled && "pointer-events-none opacity-50",
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Bars */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Bars
        </label>
        <div className="flex gap-1">
          {BAR_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              disabled={disabled}
              onClick={() => onBarsChange(b)}
              className={cn(
                "h-7 w-8 rounded-lg border text-xs font-medium transition-colors",
                bars === b
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* BPM */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          BPM
        </label>
        <input
          type="number"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onBpmChange(Math.min(BPM_MAX, Math.max(BPM_MIN, v)));
          }}
          disabled={disabled}
          className={cn(
            "h-7 w-14 rounded-lg border border-input bg-transparent px-1.5 text-center text-xs tabular-nums",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
            "dark:bg-input/30 dark:hover:bg-input/50",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            disabled && "pointer-events-none opacity-50",
          )}
        />
      </div>

      {/* Key — root + scale */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Key
        </label>
        <div className="flex gap-1">
          <select
            value={scaleRoot}
            onChange={(e) => onScaleRootChange(e.target.value)}
            disabled={disabled}
            className={selectClass}
          >
            {NOTE_NAMES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
          <select
            value={scaleName}
            onChange={(e) => onScaleNameChange(e.target.value)}
            disabled={disabled}
            className={selectClass}
          >
            {SCALE_NAMES.map((name) => (
              <option key={name} value={name}>
                {formatScaleName(name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swing */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Swing{" "}
          <span className="tabular-nums text-foreground/60">{swing}%</span>
        </label>
        <div className="flex h-7 items-center">
          <input
            type="range"
            min={0}
            max={100}
            value={swing}
            onChange={(e) => onSwingChange(parseInt(e.target.value, 10))}
            disabled={disabled}
            className={cn(
              "h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-input accent-primary",
              disabled && "pointer-events-none opacity-50",
            )}
          />
        </div>
      </div>

      {/* Model selector */}
      <div className="flex flex-col gap-1">
        <ModelSelector
          value={{ provider: modelProvider as LLMProvider, model: modelId }}
          onChange={(sel: ModelSelection) => onModelChange(sel.provider, sel.model)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
