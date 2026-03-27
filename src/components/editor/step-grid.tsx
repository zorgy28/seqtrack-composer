"use client";

import { useState, useRef, useMemo, useCallback, memo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useProject } from "@/providers/project-provider";
import { useSoundControl } from "@/hooks/use-sound-control";
import { SEQTRAK_TRACKS, STEPS_PER_BAR, DRUM_CHANNELS, SYNTH_CHANNELS, getTrackBgActiveClass, getTrackSolidClass } from "@/lib/midi/constants";
import { toggleNoteInPattern } from "@/lib/midi/pattern-generators";
import { getScaleNotes, midiToNoteName } from "@/lib/midi/note-utils";
import type { SeqtrackChannel, Note, Pattern } from "@/lib/midi/types";
import { cn } from "@/lib/utils";
import { SoundPicker } from "./sound-picker";
import { getPresetsForChannel } from "@/lib/midi/sound-library";

// Stable no-op for StepCell onClick when delegation is used
const noop = () => {};

// ─── StepCell ──────────────────────────────────────────────────

const StepCell = memo(function StepCell({
  active,
  velocity,
  colorClass,
  beat,
  onClick,
  size = "normal",
  tooltip,
  className: extraClass,
}: {
  active: boolean;
  velocity: number;
  colorClass: string;
  beat: boolean;
  onClick: () => void;
  size?: "normal" | "compact";
  tooltip?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md border transition-colors",
        size === "normal" ? "h-8" : "h-5",
        beat ? "border-[var(--seqtrak-pad-border)]" : "border-border/30",
        active
          ? `${colorClass} border-transparent seqtrak-pad-active`
          : "bg-[var(--seqtrak-pad-inactive)] hover:bg-accent/40 seqtrak-pad",
        extraClass,
      )}
      style={active ? { opacity: 0.4 + (velocity / 127) * 0.6 } : undefined}
      title={tooltip ?? (active ? `vel: ${velocity}` : undefined)}
    />
  );
});

// ─── TrackHeader ───────────────────────────────────────────────

const TrackHeader = memo(function TrackHeader({
  channel,
}: {
  channel: SeqtrackChannel;
}) {
  const { project, setProject, selectedChannel, setSelectedChannel } = useProject();
  const { getTrackSound } = useSoundControl();
  const [pickerOpen, setPickerOpen] = useState(false);
  const nameRef = useRef<HTMLButtonElement>(null);

  const track = project.tracks[channel];
  const info = SEQTRAK_TRACKS[channel];
  const dotColor = getTrackSolidClass(channel);
  const trackColor = getTrackBgActiveClass(channel);
  const currentPreset = getTrackSound(channel).preset;
  const soundDisplayName = useMemo(() => {
    if (currentPreset) return currentPreset.name;
    // Show first preset name for this channel as default
    const presets = getPresetsForChannel(channel);
    return presets[0]?.name ?? "—";
  }, [currentPreset, channel]);

  const toggleMute = useCallback(() => {
    const updatedTrack = { ...track, muted: !track.muted };
    const updatedTracks = { ...project.tracks, [channel]: updatedTrack };
    setProject({ ...project, tracks: updatedTracks });
  }, [track, project, channel, setProject]);

  const setVolume = useCallback((vol: number) => {
    const updatedTrack = { ...track, volume: vol };
    const updatedTracks = { ...project.tracks, [channel]: updatedTrack };
    setProject({ ...project, tracks: updatedTracks });
  }, [track, project, channel, setProject]);

  const handleNameClick = useCallback(() => {
    if (selectedChannel === channel) {
      setPickerOpen((prev) => !prev);
    } else {
      setSelectedChannel(channel);
    }
  }, [selectedChannel, channel, setSelectedChannel]);

  return (
    <div className="flex items-center gap-0 relative">
      <button
        ref={nameRef}
        onClick={handleNameClick}
        className={cn(
          "flex items-center gap-2 w-28 shrink-0 px-2 py-0.5 hover:bg-accent/30 rounded-l transition-colors",
          selectedChannel === channel && "bg-accent/30",
        )}
      >
        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotColor)} />
        <div className="flex flex-col items-start min-w-0">
          <span className="text-xs font-mono truncate leading-tight">{info.name}</span>
          <span className={cn(
            "text-[9px] truncate leading-tight max-w-[70px]",
            currentPreset ? "text-muted-foreground" : "text-muted-foreground/50 italic",
          )}>
            {soundDisplayName}
          </span>
        </div>
      </button>

      <button
        onClick={toggleMute}
        className={cn(
          "w-6 h-7 shrink-0 rounded text-[10px] font-bold font-mono text-center transition-colors",
          track.muted
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "text-muted-foreground/30 hover:bg-accent/50 hover:text-muted-foreground",
        )}
        title={track.muted ? "Unmute" : "Mute"}
      >
        M
      </button>

      {/* Volume slider */}
      <div className="w-14 shrink-0 flex items-center px-0.5 group/vol" title={`Volume: ${track.volume}`}>
        <div className="relative w-full h-5 flex items-center">
          <div className="absolute h-1 w-full rounded-full bg-border/50" />
          <div
            className={cn("absolute h-1 rounded-full", trackColor)}
            style={{ width: `${(track.volume / 127) * 100}%`, opacity: track.muted ? 0.3 : 0.7 }}
          />
          <input
            type="range"
            min={0}
            max={127}
            value={track.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute w-full h-5 opacity-0 cursor-pointer"
          />
          <div
            className={cn(
              "absolute h-2.5 w-1.5 rounded-sm border border-border/60 bg-foreground/80 pointer-events-none",
              track.muted && "opacity-30",
            )}
            style={{ left: `calc(${(track.volume / 127) * 100}% - 3px)` }}
          />
        </div>
      </div>

      {/* Sound picker popover */}
      {pickerOpen && (
        <div className="absolute left-0 top-full mt-1 z-50">
          <SoundPicker channel={channel} onClose={() => setPickerOpen(false)} />
        </div>
      )}
    </div>
  );
});

// ─── OctaveSelector ────────────────────────────────────────────

function OctaveSelector({
  octaveStart,
  onShiftUp,
  onShiftDown,
  label,
}: {
  octaveStart: number;
  onShiftUp: () => void;
  onShiftDown: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-0.5 ml-2">
      <button
        onClick={onShiftUp}
        disabled={octaveStart >= 6}
        className="p-0.5 rounded hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Shift octave up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <span className="text-[9px] font-mono text-muted-foreground min-w-[40px] text-center">
        {label}
      </span>
      <button
        onClick={onShiftDown}
        disabled={octaveStart <= 0}
        className="p-0.5 rounded hover:bg-accent/50 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Shift octave down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Harmony helpers ──────────────────────────────────────────

/** Intervals that sound consonant (in semitones from any note) */
const CONSONANT_INTERVALS = new Set([0, 3, 4, 5, 7, 8, 9, 12]);

/**
 * Score how well a pitch fits with the notes playing at a given step
 * across all other channels. Higher = better fit.
 * Returns: "root" | "chord" | "scale" | null
 */
function getHarmonyHint(
  pitch: number,
  stepEnsemble: number[] | undefined,
): "root" | "chord" | "scale" | null {
  if (!stepEnsemble || stepEnsemble.length === 0) return "scale";

  const pitchClass = pitch % 12;
  let isConsonant = true;

  for (const other of stepEnsemble) {
    const otherClass = other % 12;
    if (pitchClass === otherClass) return "root"; // unison/octave

    const interval = (pitchClass - otherClass + 12) % 12;
    if (!CONSONANT_INTERVALS.has(interval)) {
      isConsonant = false;
    }
  }

  return isConsonant ? "chord" : null;
}

// ─── PianoRollGrid ─────────────────────────────────────────────

const PianoRollGrid = memo(function PianoRollGrid({
  scaleNotes,
  pattern,
  totalSteps,
  colorClass,
  onToggle,
  ensembleAtStep,
}: {
  scaleNotes: number[];
  pattern: Pattern;
  totalSteps: number;
  colorClass: string;
  onToggle: (step: number, pitch: number) => void;
  /** Map of step → array of MIDI pitches playing on OTHER channels at that step */
  ensembleAtStep: Map<number, number[]>;
}) {
  // Build note lookup: "step-pitch" → Note
  const noteMap = useMemo(() => {
    const map = new Map<string, Note>();
    for (const note of pattern.notes) {
      map.set(`${note.step}-${note.pitch}`, note);
    }
    return map;
  }, [pattern.notes]);

  // Reverse for display: highest note at top
  const displayNotes = useMemo(
    () => [...scaleNotes].reverse(),
    [scaleNotes],
  );

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-step]');
    if (!target) return;
    const step = Number(target.dataset.step);
    const pitch = Number(target.dataset.pitch);
    onToggle(step, pitch);
  }, [onToggle]);

  return (
    <div
      className="max-h-[280px] overflow-y-auto ml-[calc(6rem+1.5rem+3.5rem)] mr-0"
      onClick={handleGridClick}
    >
      {displayNotes.map((pitch) => {
        const isC = pitch % 12 === 0;
        return (
          <div
            key={pitch}
            className={cn(
              "flex items-center gap-0",
              isC && "border-t border-border/40",
            )}
          >
            <div className="w-10 text-[10px] font-mono text-right pr-1 text-muted-foreground shrink-0">
              {midiToNoteName(pitch)}
            </div>
            <div className="flex gap-px flex-1 pr-2">
              {Array.from({ length: totalSteps }, (_, step) => {
                const key = `${step}-${pitch}`;
                const note = noteMap.get(key);
                const isBeat = step % 4 === 0;

                // Harmony suggestion for empty cells
                let tooltip: string;
                let suggestionClass = "";

                if (note) {
                  tooltip = `${midiToNoteName(pitch)} v${note.velocity}`;
                } else {
                  const hint = getHarmonyHint(pitch, ensembleAtStep.get(step));
                  const noteName = midiToNoteName(pitch);
                  if (hint === "root") {
                    tooltip = `${noteName} — doubles existing note (unison)`;
                    suggestionClass = "bg-primary/8";
                  } else if (hint === "chord") {
                    tooltip = `${noteName} — fits chord (consonant)`;
                    suggestionClass = "bg-green-500/6";
                  } else if (hint === "scale") {
                    tooltip = `${noteName} — in scale`;
                  } else {
                    tooltip = `${noteName} — dissonant (tension)`;
                  }
                }

                return (
                  <div key={step} data-step={step} data-pitch={pitch} className="contents">
                    <StepCell
                      active={!!note}
                      velocity={note?.velocity ?? 0}
                      colorClass={colorClass}
                      beat={isBeat}
                      onClick={noop}
                      size="compact"
                      tooltip={tooltip}
                      className={!note ? suggestionClass : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ─── DrumTrackRow ──────────────────────────────────────────────

const DrumTrackRow = memo(function DrumTrackRow({
  channel,
}: {
  channel: SeqtrackChannel;
}) {
  const { project, updatePattern, selectedChannel } = useProject();
  const track = project.tracks[channel];
  const pattern = track.patterns[track.activePattern];
  const totalSteps = pattern.bars * STEPS_PER_BAR;
  const colorClass = getTrackBgActiveClass(channel);
  const defaultPitch = 60;

  // Build step lookup
  const stepNotes = useMemo(() => {
    const map = new Map<number, Note>();
    for (const note of pattern.notes) {
      map.set(note.step, note);
    }
    return map;
  }, [pattern.notes]);

  const handleToggle = useCallback((step: number) => {
    const updated = toggleNoteInPattern(pattern, step, defaultPitch);
    updatePattern(channel, track.activePattern, updated);
  }, [pattern, channel, track.activePattern, updatePattern]);

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-step]');
    if (!target) return;
    const step = Number(target.dataset.step);
    handleToggle(step);
  }, [handleToggle]);

  return (
    <div
      className={cn(
        "flex items-center gap-0 group",
        selectedChannel === channel && "bg-accent/20",
      )}
    >
      <TrackHeader channel={channel} />

      <div className="flex gap-px flex-1 pr-2" onClick={handleGridClick}>
        {Array.from({ length: totalSteps }, (_, step) => {
          const note = stepNotes.get(step);
          const isBeat = step % 4 === 0;
          return (
            <div key={step} data-step={step} className="contents">
              <StepCell
                active={!!note}
                velocity={note?.velocity ?? 0}
                colorClass={colorClass}
                beat={isBeat}
                onClick={noop}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── MelodicTrackRow ───────────────────────────────────────────

const MelodicTrackRow = memo(function MelodicTrackRow({
  channel,
}: {
  channel: SeqtrackChannel;
}) {
  const { project, updatePattern, selectedChannel, setSelectedChannel } = useProject();
  const track = project.tracks[channel];
  const info = SEQTRAK_TRACKS[channel];
  const pattern = track.patterns[track.activePattern];
  const totalSteps = pattern.bars * STEPS_PER_BAR;
  const colorClass = getTrackBgActiveClass(channel);

  // Build ensemble: what notes are playing on OTHER channels at each step
  const ensembleAtStep = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const ch of [...DRUM_CHANNELS, ...SYNTH_CHANNELS] as SeqtrackChannel[]) {
      if (ch === channel) continue; // skip self
      const t = project.tracks[ch];
      if (t.muted) continue;
      const p = t.patterns[t.activePattern];
      for (const note of p.notes) {
        const arr = map.get(note.step) ?? [];
        arr.push(note.pitch);
        map.set(note.step, arr);
      }
    }
    return map;
  }, [project.tracks, channel]);
  const isExpanded = selectedChannel === channel;

  const [octaveStart, setOctaveStart] = useState(() => {
    // Auto-detect: center around existing notes, default 3
    const notes = pattern.notes;
    if (notes.length > 0) {
      const sorted = notes.map((n) => n.pitch).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return Math.max(0, Math.min(6, Math.floor(median / 12) - 1));
    }
    return 3;
  });

  const scaleNotes = useMemo(
    () => getScaleNotes(project.scaleRoot, project.scaleName, octaveStart, octaveStart + 2),
    [project.scaleRoot, project.scaleName, octaveStart],
  );

  const octaveLabel = `C${octaveStart}-C${octaveStart + 2}`;

  // Build step lookup for summary row (any note at step)
  const summaryNotes = useMemo(() => {
    const map = new Map<number, Note>();
    for (const note of pattern.notes) {
      const existing = map.get(note.step);
      if (!existing || note.velocity > existing.velocity) {
        map.set(note.step, note);
      }
    }
    return map;
  }, [pattern.notes]);

  // Build tooltip map: step → "C3 D#3 G3" (all note names at that step)
  const stepTooltips = useMemo(() => {
    const map = new Map<number, string>();
    const grouped = new Map<number, Note[]>();
    for (const note of pattern.notes) {
      const arr = grouped.get(note.step) ?? [];
      arr.push(note);
      grouped.set(note.step, arr);
    }
    for (const [step, notes] of grouped) {
      const names = notes
        .sort((a, b) => b.pitch - a.pitch)
        .map((n) => `${midiToNoteName(n.pitch)} v${n.velocity}`)
        .join(", ");
      map.set(step, `${info.name}: ${names} — click to expand`);
    }
    return map;
  }, [pattern.notes, info.name]);

  const handleToggle = useCallback((step: number, pitch: number) => {
    const updated = toggleNoteInPattern(pattern, step, pitch);
    updatePattern(channel, track.activePattern, updated);
  }, [pattern, channel, track.activePattern, updatePattern]);

  const handleSelectChannel = useCallback(() => {
    setSelectedChannel(channel);
  }, [setSelectedChannel, channel]);

  // Collapsed view: summary row showing "any note at step" with note name tooltips
  if (!isExpanded) {
    return (
      <div
        className={cn(
          "flex items-center gap-0 group",
          selectedChannel === channel && "bg-accent/20",
        )}
      >
        <TrackHeader channel={channel} />

        <div className="flex gap-px flex-1 pr-2" onClick={handleSelectChannel}>
          {Array.from({ length: totalSteps }, (_, step) => {
            const note = summaryNotes.get(step);
            const isBeat = step % 4 === 0;
            return (
              <StepCell
                key={step}
                active={!!note}
                velocity={note?.velocity ?? 0}
                colorClass={colorClass}
                beat={isBeat}
                onClick={noop}
                tooltip={stepTooltips.get(step)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded view: header + octave selector + piano roll
  return (
    <div className={cn("bg-accent/20")}>
      <div className="flex items-center gap-0 group">
        <TrackHeader channel={channel} />

        <OctaveSelector
          octaveStart={octaveStart}
          onShiftUp={() => setOctaveStart((o) => Math.min(6, o + 1))}
          onShiftDown={() => setOctaveStart((o) => Math.max(0, o - 1))}
          label={octaveLabel}
        />

        <div className="flex-1" />
      </div>

      <PianoRollGrid
        scaleNotes={scaleNotes}
        pattern={pattern}
        totalSteps={totalSteps}
        colorClass={colorClass}
        onToggle={handleToggle}
        ensembleAtStep={ensembleAtStep}
      />
    </div>
  );
});

// ─── PlaybackCursor ────────────────────────────────────────────
// Isolated component: only re-renders when currentStep changes.
// Uses GPU-composited CSS transform instead of per-step class toggling.

const PlaybackCursor = memo(function PlaybackCursor({
  currentStep,
  totalSteps,
}: {
  currentStep: number | null | undefined;
  totalSteps: number;
}) {
  if (currentStep == null || currentStep < 0) return null;

  // percentage offset: each step occupies 1/totalSteps of the grid,
  // plus a tiny gap correction for the 1px gaps between cells
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-10 will-change-transform"
      style={{
        left: `${percent}%`,
        width: `${100 / totalSteps}%`,
        transform: "translateZ(0)", // force GPU layer
      }}
    >
      <div className="h-full bg-primary/25 rounded-sm" />
    </div>
  );
});

// ─── BeatNumbersHeader ─────────────────────────────────────────
// Static beat labels — no dependency on currentStep.

const BeatNumbersHeader = memo(function BeatNumbersHeader({
  totalSteps,
}: {
  totalSteps: number;
}) {
  return (
    <div className="flex gap-px flex-1 pr-2">
      {Array.from({ length: totalSteps }, (_, step) => (
        <div
          key={step}
          className={cn(
            "h-5 w-full text-center text-[9px] font-mono",
            step % 4 === 0
              ? "text-muted-foreground"
              : "text-muted-foreground/30",
          )}
        >
          {step % 4 === 0 ? step / 4 + 1 : ""}
        </div>
      ))}
    </div>
  );
});

// ─── StepGrid (public export) ──────────────────────────────────

export function StepGrid({ currentStep }: { currentStep?: number | null }) {
  const { project } = useProject();
  // Use first track's pattern bars as reference
  const refPattern = project.tracks[1].patterns[project.tracks[1].activePattern];
  const totalSteps = refPattern.bars * STEPS_PER_BAR;

  return (
    <div className="space-y-0" style={{ contain: "layout style" }}>
      {/* Beat numbers header with GPU-composited cursor overlay */}
      <div className="flex items-center gap-0">
        <div className="w-24 shrink-0" />
        <div className="w-6 shrink-0" />
        <div className="w-14 shrink-0" />
        <div className="relative flex gap-px flex-1 pr-2">
          <PlaybackCursor currentStep={currentStep} totalSteps={totalSteps} />
          <BeatNumbersHeader totalSteps={totalSteps} />
        </div>
      </div>

      {/* Drum section */}
      <div className="seqtrak-section-label px-2 py-1.5">
        Drums
      </div>
      {DRUM_CHANNELS.map((ch) => (
        <DrumTrackRow key={ch} channel={ch} />
      ))}

      {/* Synth section */}
      <div className="seqtrak-section-label px-2 py-1.5 mt-2">
        Synths
      </div>
      {SYNTH_CHANNELS.map((ch) => (
        <MelodicTrackRow key={ch} channel={ch} />
      ))}
    </div>
  );
}
