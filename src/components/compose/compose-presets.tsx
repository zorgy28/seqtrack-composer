"use client";

import { cn } from "@/lib/utils";

// ── Preset Data ──────────────────────────────────────────────────

const PRESET_CATEGORIES: Record<string, Array<{ label: string; prompt: string }>> = {
  "Full Beats": [
    { label: "Trap beat", prompt: "Trap beat with 808 kick, rapid hi-hat rolls, hard snare on 2&4" },
    { label: "House groove", prompt: "Deep house groove with four-on-the-floor, offbeat hats, warm bass" },
    { label: "DnB breakbeat", prompt: "Drum and bass breakbeat with amen-style snare and fast rides" },
    { label: "Boom bap", prompt: "Hip hop boom bap with swing, dusty feel, syncopated kick" },
    { label: "Techno", prompt: "Driving techno beat with relentless kick, industrial hats, dark bass" },
  ],
  "Melodic": [
    { label: "Ambient pad", prompt: "Ambient pad sequence with long sustained chords on DX channel" },
    { label: "Acid bassline", prompt: "Acid 303-style bass line on Synth 1 with accents and slides" },
    { label: "Lo-fi piano", prompt: "Lo-fi piano chords with jazz 7th voicings on Synth 2" },
    { label: "Chord progression", prompt: "4-chord progression on Synth 1 (I-V-vi-IV) with warm pad sound" },
  ],
  "Full Production": [
    { label: "Full techno", prompt: "Complete techno production: driving kick, hats, dark bass, atmospheric synth, and FX" },
    { label: "Lo-fi hip hop", prompt: "Complete lo-fi hip hop: relaxed drums with swing, jazzy piano, warm sub bass" },
    { label: "Deep house", prompt: "Complete deep house: four-on-the-floor, warm bass, chord stabs, rides, percussion" },
  ],
  "Drums Only": [
    { label: "Basic 4/4", prompt: "Basic four-on-the-floor drum pattern: kick, snare, closed and open hats only" },
    { label: "Breakbeat", prompt: "Breakbeat drum pattern with syncopated kick and snare, no melodic parts" },
    { label: "Trap hats", prompt: "Trap hi-hat pattern with rolls and triplets on channels 4 and 5 only" },
  ],
  "Bass Only": [
    { label: "Sub 808", prompt: "Sub bass 808 pattern on Synth 1 following root notes, long sustained notes" },
    { label: "Walking bass", prompt: "Walking bass line on Synth 1 with chromatic passing tones" },
    { label: "Acid 303", prompt: "Acid 303 bass line on Synth 1 with accents and pitch slides" },
  ],
};

// ── Types ────────────────────────────────────────────────────────

interface ComposePresetsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export function ComposePresets({ onSelect, disabled = false }: ComposePresetsProps) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(PRESET_CATEGORIES).map(([category, presets]) => (
        <div key={category} className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {category}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(preset.prompt)}
                className={cn(
                  "inline-flex h-6 items-center rounded-full border border-border bg-muted/50 px-2.5 text-[10px] text-muted-foreground transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  disabled && "pointer-events-none opacity-50",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
