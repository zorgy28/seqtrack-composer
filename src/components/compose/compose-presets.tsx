"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

// ── Preset Data ──────────────────────────────────────────────────

const SEQTRAK_PRESETS: Record<string, Array<{ label: string; prompt: string }>> = {
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

const MICROFREAK_PRESETS: Record<string, Array<{ label: string; prompt: string }>> = {
  "Sequences": [
    { label: "Acid arp", prompt: "Fast 16th-note acid arpeggio in A minor with rising and falling motion, staccato notes with velocity accents" },
    { label: "Berlin sequence", prompt: "Hypnotic Berlin-school sequence in C minor, steady 16th notes with gradual pitch transposition over 4 bars" },
    { label: "Generative", prompt: "Evolving generative sequence in D dorian, varied note lengths (1-4 steps) and velocity, semi-random feel" },
    { label: "Euclidean", prompt: "Euclidean rhythm pattern: 7 notes distributed across 16 steps in E minor, uniform velocity" },
  ],
  "Bass Lines": [
    { label: "Mono bass", prompt: "Deep mono bass line in E minor, 8th notes with occasional 16th-note runs, slides between root and fifth" },
    { label: "Acid bass", prompt: "303-style acid bass line with accented 16th notes, filter sweep feel via velocity variation" },
    { label: "Sub drone", prompt: "Sustained sub bass drone on root note, whole notes with subtle pitch drift over 4 bars" },
    { label: "Funk bass", prompt: "Syncopated funk bass in G mixolydian, 16th-note ghost notes with octave jumps" },
  ],
  "Melodies": [
    { label: "Lead melody", prompt: "Expressive lead melody in A minor pentatonic, varied velocity and note lengths, call-and-response phrasing" },
    { label: "Ambient line", prompt: "Sparse ambient melody with wide intervals (5ths and octaves), long sustained notes, minimal movement" },
    { label: "Arp pattern", prompt: "Ascending/descending broken chord arpeggio across 2 octaves in C major, steady 16th notes" },
    { label: "Modal melody", prompt: "Dorian mode melody in D, 8th notes with jazz phrasing, chromatic passing tones" },
  ],
  "Pads & Chords": [
    { label: "Paraphonic pad", prompt: "4-voice paraphonic chord pad, whole-note sustains, minor 7th voicings moving through ii-V-I" },
    { label: "Stab chords", prompt: "Short staccato chord stabs on offbeats (steps 2,6,10,14), 2-3 note voicings, funk feel" },
    { label: "Ambient wash", prompt: "Slowly evolving 2-note intervals, half-note durations, wide voicing spread across octaves" },
  ],
  "Experimental": [
    { label: "Noise rhythm", prompt: "Percussive noise-based rhythm pattern using extreme velocity contrasts, 16th-note grid, industrial feel" },
    { label: "Glitch sequence", prompt: "Glitchy micro-tonal sequence with rapid pitch changes, very short durations (1 step), random-feeling" },
    { label: "Polyrhythm", prompt: "Polyrhythmic pattern: overlay of 3-note and 4-note groupings creating shifting accents over 2 bars" },
  ],
  "Sound Design": [
    { label: "Acid bass", prompt: "Acid bass line with V.Analog oscillator, low filter cutoff around 40-50 with high resonance 90-100, short plucky envelope (zero attack, short decay 30, zero sustain), add some filter envelope modulation" },
    { label: "Warm pad", prompt: "Warm evolving pad: WaveTable oscillator with slow attack 70, full sustain 110, moderate filter cutoff 90, gentle LFO modulation on filter, low resonance" },
    { label: "Bright lead", prompt: "Bright cutting lead melody: SuperWave oscillator, open filter cutoff 110, moderate resonance 40, zero attack, medium decay 64, good sustain 90, slight glide between notes" },
    { label: "Pluck arp", prompt: "Plucky arpeggio sequence: KarplusStr oscillator, medium filter cutoff 80, short decay 25, zero sustain, no glide — crisp and percussive" },
    { label: "Dark drone", prompt: "Dark ambient drone: Modal oscillator, very low filter cutoff 30, moderate resonance 50, full sustain, slow LFO rate on filter for movement" },
    { label: "Percussive", prompt: "Percussive rhythmic pattern: Formant oscillator, open filter, zero attack, very short decay 15, zero sustain — drum-like synth hits" },
    { label: "FM bass", prompt: "FM synthesis bass: TwoOpFM oscillator, low-mid filter cutoff 60, slight resonance 30, zero attack, medium decay 50, moderate sustain 70" },
    { label: "Vocal texture", prompt: "Vocal-like texture: Speech oscillator, medium filter cutoff 75, moderate resonance 50, slow attack 40, high sustain 100, gentle LFO on timbre" },
    { label: "Evolving pad", prompt: "Evolving pad with WaveTable oscillator, moderate filter cutoff 80, slow cycling envelope (rise=80, fall=90, amount=60) creating gentle movement on timbre, slow LFO rate 30, high sustain" },
    { label: "Rhythmic pulse", prompt: "Rhythmic pulsing sound: V.Analog oscillator, cycling envelope with fast rise=10 and fall=30, high amount=100 on cutoff, moderate resonance for squelch" },
    { label: "Breathing drone", prompt: "Breathing ambient drone: Modal oscillator, very low cutoff 30, cycling envelope (rise=50, fall=60, amount=70) for slow undulation, LFO rate 15 on shape" },
  ],
};

const KO2_PRESETS: Record<string, Array<{ label: string; prompt: string }>> = {
  "Full Beats": [
    { label: "Boom bap", prompt: "Boom bap beat: kick on note 36, snare on 38, closed hat on 42 from Group A, sub bass on note 48 from Group B, lo-fi melody on notes 60-65 from Group C" },
    { label: "Trap", prompt: "Trap beat: 808 kick on 36, clap on 39, rapid hi-hat rolls on 42/44 from Group A, sustained sub bass on 48 from Group B, dark melody on 60-67 from Group C" },
    { label: "House", prompt: "House groove: four-on-floor kick on 36, clap on 39, offbeat hat on 42 from Group A, bouncy bass on 48-50 from Group B, chord stabs on 60-64 from Group C" },
    { label: "Lo-fi", prompt: "Lo-fi beat with swing: muted kick on 36, soft snare on 38, dusty hat on 42 from Group A, warm bass on 48 from Group B, jazzy keys on 60-67 from Group C" },
  ],
  "Drums (Group A)": [
    { label: "Basic beat", prompt: "Simple drum beat: kick on 36 (steps 0,8), snare on 38 (steps 4,12), closed hat on 42 (every step), all from Group A notes 36-47" },
    { label: "Breakbeat", prompt: "Breakbeat pattern: syncopated kick on 36, snare on 38 with ghost notes, fast hat on 42, all Group A notes 36-47" },
    { label: "Percussion", prompt: "Percussion pattern using all Group A pads (36-47): layered timbales, congas, and shakers" },
  ],
  "Bass (Group B)": [
    { label: "Sub bass", prompt: "Sub bass on Group B (notes 48-59): root on 48, sustained whole notes following chord roots" },
    { label: "Funky bass", prompt: "Syncopated funk bass on Group B (48-55): octave jumps between 48 and 60, 16th-note ghost notes" },
    { label: "Walking bass", prompt: "Walking bass on Group B (48-59): quarter notes stepping through chord tones with chromatic approach" },
  ],
  "Melody (Group C)": [
    { label: "Simple melody", prompt: "Simple melody on Group C (notes 60-71): pentatonic scale, varied rhythm with rests, 8th and quarter notes" },
    { label: "Chord stabs", prompt: "Chord stabs on Group C (60-67): short staccato hits on offbeats, stack 2-3 notes for chords" },
    { label: "Arp pattern", prompt: "Arpeggio pattern on Group C (60-71): ascending notes through a triad, steady 16th rhythm" },
  ],
  "FX (Group D)": [
    { label: "Risers", prompt: "Rising FX hits on Group D (72-83): ascending pitch sequence building tension over 2 bars" },
    { label: "Transitions", prompt: "Transition effects on Group D (72-77): crash on 72 at bar start, reverse sweep on 74 before bar end" },
  ],
};

const GENERIC_PRESETS: Record<string, Array<{ label: string; prompt: string }>> = {
  "Full Production": [
    { label: "Pop beat", prompt: "Pop production: drums on channel 10 (kick/snare/hat), bass on channel 1, piano chords on channel 2, string pad on channel 3" },
    { label: "Jazz combo", prompt: "Jazz combo: swing drums on channel 10, walking bass on channel 1, piano comp on channel 2, sax melody on channel 3" },
    { label: "Rock band", prompt: "Rock band: driving drums on channel 10, power bass on channel 1, rhythm guitar on channel 2, lead guitar on channel 3" },
    { label: "Electronic", prompt: "Electronic production: programmed drums on channel 10, synth bass on channel 1, pad chords on channel 2, lead melody on channel 3" },
  ],
  "Drums (Ch 10)": [
    { label: "Basic 4/4", prompt: "Basic 4/4 drum pattern on channel 10: kick (note 36) on 1&3, snare (38) on 2&4, closed hat (42) on all 8ths" },
    { label: "Shuffle", prompt: "Shuffle drum pattern on channel 10: kick on 36, snare on 38 with ghost notes, shuffle hat on 42" },
    { label: "Bossa nova", prompt: "Bossa nova drums on channel 10: kick on 36, rim click on 37 following clave, brush on 42" },
  ],
  "Bass (Ch 1)": [
    { label: "Walking bass", prompt: "Walking bass on channel 1: quarter notes following chord tones with chromatic passing tones" },
    { label: "Pop bass", prompt: "Pop bass on channel 1: root-fifth movement, 8th notes, following chord changes" },
  ],
  "Melodic": [
    { label: "Piano chords", prompt: "Piano chord progression on channel 2: whole-note voicings, I-V-vi-IV progression" },
    { label: "String pad", prompt: "String pad on channel 3: sustained whole-note chords, lush voicings with smooth voice leading" },
    { label: "Lead melody", prompt: "Lead melody on channel 4: expressive 8th-note melody, pentatonic scale, varied dynamics" },
  ],
};

const DEVICE_PRESETS: Record<string, Record<string, Array<{ label: string; prompt: string }>>> = {
  seqtrak:    SEQTRAK_PRESETS,
  microfreak: MICROFREAK_PRESETS,
  ko2:        KO2_PRESETS,
  generic:    GENERIC_PRESETS,
};

// ── Types ────────────────────────────────────────────────────────

interface ComposePresetsProps {
  deviceId: string;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export const ComposePresets = memo(function ComposePresets({ deviceId, onSelect, disabled = false }: ComposePresetsProps) {
  const categories = DEVICE_PRESETS[deviceId] ?? DEVICE_PRESETS.seqtrak;

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(categories).map(([category, presets]) => (
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
