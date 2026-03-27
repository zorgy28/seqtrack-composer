"use client";

import { memo } from "react";
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
  "Full Production": [
    { label: "Full techno", prompt: "Complete techno production: driving kick, hats, dark bass, atmospheric synth, and FX" },
    { label: "Lo-fi hip hop", prompt: "Complete lo-fi hip hop: relaxed drums with swing, jazzy piano, warm sub bass" },
    { label: "Deep house", prompt: "Complete deep house: four-on-the-floor, warm bass, chord stabs, rides, percussion" },
    { label: "Funk groove", prompt: "Complete funk production at 110 BPM: syncopated kick and snare with ghost notes, slap bass on Synth 1, clavinet riff on Synth 2, brass stabs on DX, 16th hi-hats" },
    { label: "Reggae one-drop", prompt: "Complete reggae production at 80 BPM: one-drop kick on beat 3, rim click, offbeat hi-hats, deep dub bass on Synth 1, skank organ chords on offbeats on Synth 2, dub siren FX on DX" },
    { label: "Bossa nova", prompt: "Complete bossa nova production at 130 BPM: bass drum on 1 and 3, cross-stick rim pattern, shaker 16ths, syncopated finger bass on Synth 1, nylon guitar arpeggios on Synth 2, vibraphone chords on DX" },
    { label: "Afrobeat", prompt: "Complete afrobeat production at 115 BPM: polyrhythmic kick pattern, snare on 2 and 4, shaker and congas, driving Moog bass on Synth 1, horn call-and-response on Synth 2, organ comping on DX" },
  ],
  "World & Latin": [
    { label: "Reggae dub", prompt: "Reggae dub at 80 BPM: one-drop kick on beat 3, rim on 3, offbeat closed hats, deep sub bass with root-fifth movement on Synth 1, sparse dubby melodica on Synth 2, echo FX on DX" },
    { label: "Bossa nova", prompt: "Bossa nova at 130 BPM: syncopated bass drum following clave, rim click pattern, soft shaker, walking finger bass on Synth 1, nylon guitar arpeggio on Synth 2, warm vibraphone chords on DX" },
    { label: "Afrobeat", prompt: "Afrobeat at 115 BPM: four-on-floor kick with ghost notes, cross-stick, shaker polyrhythm, congas, driving bass line on Synth 1, trumpet call-response on Synth 2, organ comp on DX" },
    { label: "Latin salsa", prompt: "Latin salsa at 180 BPM: kick following clave, timbale-style snare, clave on perc, conga patterns, tumbao bass on Synth 1, piano montuno pattern on Synth 2, trumpet section on DX" },
  ],
  "Classics": [
    { label: "Blues shuffle", prompt: "Blues shuffle at 75 BPM: shuffle kick-hat pattern with triplet feel, snare on 2 and 4, walking bass with chromatic passing tones on Synth 1, pentatonic guitar licks on Synth 2, Rhodes comping on DX" },
    { label: "Funk groove", prompt: "Funk groove at 110 BPM: syncopated kick, ghost-note snare, 16th hi-hats with accents, slap bass on Synth 1, clavinet riff on Synth 2, brass stabs on DX" },
    { label: "Disco", prompt: "Disco at 120 BPM: four-on-the-floor kick, open hat on offbeats, clap on 2 and 4, octave bass groove on Synth 1, string stab chords on Synth 2, brass pad on DX" },
    { label: "Jazz combo", prompt: "Jazz combo at 120 BPM: ride cymbal swing pattern, kick on 1 and 3, brush snare, walking quarter-note bass on Synth 1, guide tone melody on Synth 2, Rhodes chord voicings on DX" },
    { label: "Classic rock", prompt: "Classic rock at 130 BPM: driving kick on 1 and 3, snare on 2 and 4, crash on downbeat, 8th-note hats, root-fifth power bass on Synth 1, power riff on Synth 2, Hammond organ on DX" },
  ],
  "Atmospheric": [
    { label: "Trip-hop", prompt: "Trip-hop at 85 BPM: sparse slow kick, vinyl-crackle snare, minimal hats, dark sub bass with long notes on Synth 1, sparse haunting melody on Synth 2, glassy FM pad on DX" },
    { label: "Lo-fi chill", prompt: "Lo-fi chill at 78 BPM: muted kick with swing, soft snare with ghost notes, dusty hats, warm muted bass on Synth 1, jazzy piano with 7th chords on Synth 2, warm FM pad on DX" },
    { label: "Ambient", prompt: "Ambient at 70 BPM: minimal percussion — soft kick every 4 beats, gentle ride taps, drone bass with long sustained notes on Synth 1, sparse evolving arpeggios on Synth 2, evolving FM pad with slow movement on DX" },
  ],
  "Melodic": [
    { label: "Ambient pad", prompt: "Ambient pad sequence with long sustained chords on DX channel" },
    { label: "Acid bassline", prompt: "Acid 303-style bass line on Synth 1 with accents and slides" },
    { label: "Lo-fi piano", prompt: "Lo-fi piano chords with jazz 7th voicings on Synth 2" },
    { label: "Chord progression", prompt: "4-chord progression on Synth 1 (I-V-vi-IV) with warm pad sound" },
    { label: "Reggae skank", prompt: "Reggae skank organ pattern on Synth 2: offbeat chord stabs on every upbeat, using minor 7th voicings" },
    { label: "Jazz voicings", prompt: "Jazz chord voicings on DX: rootless ii-V-I progression with 7ths and 9ths, Rhodes sound" },
    { label: "Blues licks", prompt: "Blues pentatonic guitar licks on Synth 2: call-and-response phrases using minor pentatonic scale with bends" },
    { label: "Disco strings", prompt: "Disco string arrangement on Synth 2: sustained chord pads with rising fills, lush string ensemble sound" },
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
    { label: "Dub bass", prompt: "Deep dub bass on Synth 1 at 80 BPM: root and fifth with long sustained notes, heavy sub frequencies, sparse pattern with space" },
    { label: "Funk slap", prompt: "Funk slap bass on Synth 1 at 110 BPM: syncopated 16th note pattern with ghost notes, octave jumps, thumb and pop articulation feel" },
    { label: "Jazz walking", prompt: "Jazz walking bass on Synth 1 at 120 BPM: quarter-note walking line with chromatic approach tones, following ii-V-I changes" },
    { label: "Tumbao bass", prompt: "Latin tumbao bass on Synth 1 at 180 BPM: syncopated pattern following 3-2 clave, anticipated downbeats, root-fifth movement" },
  ],
};

// ── Types ────────────────────────────────────────────────────────

interface ComposePresetsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export const ComposePresets = memo(function ComposePresets({ onSelect, disabled = false }: ComposePresetsProps) {
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
});
