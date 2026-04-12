"use client";

import { useState, useRef, useMemo, useCallback, memo, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useProject } from "@/providers/project-provider";
import { useTrack, useUpdatePattern, useSelectedChannel, useProjectMeta, useSetActivePatternAll, useUpdateTrack, useTrackPatternsExcept } from "@/stores/project-store";
import { useSoundControl } from "@/hooks/use-sound-control";
import { SEQTRAK_TRACKS, STEPS_PER_BAR, DRUM_CHANNELS, SYNTH_CHANNELS, getTrackBgActiveClass, getTrackSolidClass } from "@/lib/midi/constants";
import { toggleNoteInPattern } from "@/lib/midi/pattern-generators";
import { getScaleNotes, midiToNoteName } from "@/lib/midi/note-utils";
import type { SeqtrackChannel, Note, Pattern } from "@/lib/midi/types";
import { cn } from "@/lib/utils";
import { SoundPicker } from "./sound-picker";
import { getPresetsForChannel } from "@/lib/midi/sound-library";
import { useDeviceProfile } from "@/providers/device-provider";

// KO II pad labels by MIDI note number
const KO2_PAD_LABELS: Record<number, string> = {
  // Group A — Drums (36-47)
  36: "A. Kick", 37: "A0 Kick2", 38: "FX Clap", 39: "A1 Snr2",
  40: "A2 Snare", 41: "A3 Rim", 42: "A4 Tambo", 43: "A5 HH-C",
  44: "A6 HH-O", 45: "A7 Perc", 46: "A8 Ride", 47: "A9 Ride2",
  // Group B — Bass (48-59)
  48: "B. Bass1", 49: "B0", 50: "B-FX", 51: "B1", 52: "B2", 53: "B3",
  54: "B4", 55: "B5", 56: "B6", 57: "B7", 58: "B8", 59: "B9",
  // Group C — Melody (60-71)
  60: "C. Mel1", 61: "C0", 62: "C-FX", 63: "C1", 64: "C2", 65: "C3",
  66: "C4", 67: "C5", 68: "C6", 69: "C7", 70: "C8", 71: "C9",
  // Group D — User (72-83)
  72: "D. User1", 73: "D0", 74: "D-FX", 75: "D1", 76: "D2", 77: "D3",
  78: "D4", 79: "D5", 80: "D6", 81: "D7", 82: "D8", 83: "D9",
};

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
  const track = useTrack(channel);
  const { selectedChannel, setSelectedChannel } = useSelectedChannel();
  const updateTrack = useUpdateTrack();
  const { getTrackSound } = useSoundControl();
  const { profile } = useDeviceProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const nameRef = useRef<HTMLButtonElement>(null);

  // Use profile track info if available, fall back to SEQTRAK_TRACKS
  const profileTrack = profile.tracks.find(t => t.channel === channel);
  const info = profileTrack
    ? { name: profileTrack.name, type: profileTrack.type, color: profileTrack.color, channel }
    : SEQTRAK_TRACKS[channel];
  const dotColor = getTrackSolidClass(channel);
  const trackColor = getTrackBgActiveClass(channel);
  const currentPreset = getTrackSound(channel).preset;
  const soundDisplayName = useMemo(() => {
    return currentPreset?.name ?? "—";
  }, [currentPreset]);

  const toggleMute = useCallback(() => {
    updateTrack(channel, { muted: !track.muted });
  }, [updateTrack, channel, track.muted]);

  const setVolume = useCallback((vol: number) => {
    updateTrack(channel, { volume: vol });
  }, [updateTrack, channel]);

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

const ROW_HEIGHT = 20; // h-5 = 20px
const VISIBLE_COUNT = 14; // 280px / 20px
const BUFFER = 2; // extra rows above and below

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
  const { profile } = useDeviceProfile();
  const isKo2 = profile.id === "ko2";

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

  // Precompute harmony hints for all step-pitch combos (O(1) lookup in render loop)
  const harmonyHintMap = useMemo(() => {
    const map = new Map<string, "root" | "chord" | "scale" | null>();
    for (const pitch of scaleNotes) {
      for (let step = 0; step < pattern.bars * 16; step++) {
        map.set(`${step}-${pitch}`, getHarmonyHint(pitch, ensembleAtStep.get(step)));
      }
    }
    return map;
  }, [scaleNotes, pattern.bars, ensembleAtStep]);

  // Virtual scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalRows = displayNotes.length;

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIdx = Math.min(totalRows, Math.floor(scrollTop / ROW_HEIGHT) + VISIBLE_COUNT + BUFFER);

  const topSpacerHeight = startIdx * ROW_HEIGHT;
  const bottomSpacerHeight = (totalRows - endIdx) * ROW_HEIGHT;

  const visibleRows = displayNotes.slice(startIdx, endIdx);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  // Sync scroll state if displayNotes changes (e.g. octave shift)
  useEffect(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, [displayNotes]);

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-step]');
    if (!target) return;
    const step = Number(target.dataset.step);
    const pitch = Number(target.dataset.pitch);
    onToggle(step, pitch);
  }, [onToggle]);

  return (
    <div
      ref={scrollRef}
      className="max-h-[280px] overflow-y-auto ml-[calc(6rem+1.5rem+3.5rem)] mr-0"
      onClick={handleGridClick}
      onScroll={handleScroll}
    >
      {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}
      {visibleRows.map((pitch) => {
        const isC = pitch % 12 === 0;
        return (
          <div
            key={pitch}
            className={cn(
              "flex items-center gap-0",
              isC && "border-t border-border/40",
            )}
          >
            <div className={cn(
              "text-[10px] font-mono text-right pr-1 text-muted-foreground shrink-0",
              isKo2 ? "w-16" : "w-10",
            )}>
              {isKo2 ? (KO2_PAD_LABELS[pitch] ?? midiToNoteName(pitch)) : midiToNoteName(pitch)}
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
                  const hint = harmonyHintMap.get(key) ?? null;
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
      {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
    </div>
  );
});

// ─── DrumTrackRow ──────────────────────────────────────────────

const DrumTrackRow = memo(function DrumTrackRow({
  channel,
}: {
  channel: SeqtrackChannel;
}) {
  const track = useTrack(channel);
  const updatePattern = useUpdatePattern();
  const { selectedChannel } = useSelectedChannel();
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
  const track = useTrack(channel);
  const updatePattern = useUpdatePattern();
  const { selectedChannel, setSelectedChannel } = useSelectedChannel();
  const meta = useProjectMeta();
  const otherPatterns = useTrackPatternsExcept(channel);
  const { profile } = useDeviceProfile();
  const profileTrack = profile.tracks.find(t => t.channel === channel);
  const info = profileTrack
    ? { name: profileTrack.name, type: profileTrack.type, color: profileTrack.color, channel }
    : SEQTRAK_TRACKS[channel];
  const pattern = track.patterns[track.activePattern];
  const totalSteps = pattern.bars * STEPS_PER_BAR;
  const colorClass = getTrackBgActiveClass(channel);

  // Build ensemble: notes playing on OTHER channels at each step (shallow-stable via selector)
  const ensembleAtStep = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const entry of Object.values(otherPatterns)) {
      if (!entry || entry.muted) continue;
      for (const note of entry.notes) {
        const arr = map.get(note.step) ?? [];
        arr.push(note.pitch);
        map.set(note.step, arr);
      }
    }
    return map;
  }, [otherPatterns]);
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
    () => getScaleNotes(meta.scaleRoot, meta.scaleName, octaveStart, octaveStart + 2),
    [meta.scaleRoot, meta.scaleName, octaveStart],
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

// ─── PatternNavigator ─────────────────────────────────────────

const PatternNavigator = memo(function PatternNavigator({
  project,
}: {
  project: { tracks: Record<SeqtrackChannel, { patterns: Pattern[]; activePattern: number }> };
}) {
  const setActivePatternAll = useSetActivePatternAll();

  const maxPatterns = Math.max(
    ...Object.values(project.tracks).map((t) => t?.patterns.length ?? 1),
  );

  if (maxPatterns <= 1) return null;

  // Determine bar range labels by accumulating bars from the reference track (ch 1)
  const refTrack = project.tracks[1 as SeqtrackChannel];
  const barRanges: Array<{ start: number; end: number }> = [];
  let barAccum = 0;
  for (let i = 0; i < maxPatterns; i++) {
    const bars = refTrack?.patterns[i]?.bars ?? 1;
    barRanges.push({ start: barAccum + 1, end: barAccum + bars });
    barAccum += bars;
  }

  // Use the first track that has an activePattern as the current index
  const activeIndex = refTrack?.activePattern ?? 0;

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
      <span className="text-xs text-muted-foreground mr-1">Patterns:</span>
      {Array.from({ length: maxPatterns }, (_, i) => {
        const range = barRanges[i];
        const label = range.start === range.end
          ? `P${i + 1} (${range.start})`
          : `P${i + 1} (${range.start}-${range.end})`;
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            onClick={() => setActivePatternAll(i)}
            className={cn(
              "px-2 py-0.5 rounded text-xs font-mono transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
});

// ─── StepGrid (public export) ──────────────────────────────────

export function StepGrid({ currentStep }: { currentStep?: number | null }) {
  const { project } = useProject();
  const { profile } = useDeviceProfile();
  const drumChannels = profile.drumChannels.length > 0 ? profile.drumChannels : DRUM_CHANNELS;
  const synthChannels = profile.synthChannels.length > 0 ? profile.synthChannels : SYNTH_CHANNELS;
  const firstChannel = profile.allChannels[0] ?? 1;
  const refTrack = useTrack(firstChannel as SeqtrackChannel);
  // Use first track's pattern bars as reference
  const refPattern = refTrack.patterns[refTrack.activePattern];
  const totalSteps = refPattern.bars * STEPS_PER_BAR;

  return (
    <div className="space-y-0" style={{ contain: "layout style" }}>
      {/* Pattern navigator — only visible when multi-pattern */}
      <PatternNavigator project={project} />

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

      {/* Drum section — only for devices with drum channels */}
      {profile.ui.showDrumGrid && drumChannels.length > 0 && (
        <>
          <div className="seqtrak-section-label px-2 py-1.5">
            Drums
          </div>
          {drumChannels.map((ch) => (
            <DrumTrackRow key={ch} channel={ch} />
          ))}
        </>
      )}

      {/* Synth / melodic section */}
      <div className="seqtrak-section-label px-2 py-1.5 mt-2">
        {profile.architecture === "synth" ? profile.displayName : "Synths"}
      </div>
      {synthChannels.map((ch) => (
        <MelodicTrackRow key={ch} channel={ch} />
      ))}
    </div>
  );
}
