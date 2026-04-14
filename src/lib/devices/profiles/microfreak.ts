/**
 * Arturia MicroFreak device profile.
 *
 * Single-timbral mono/paraphonic synthesizer (up to 4-voice paraphony).
 * CC values sourced from MicroFreak MIDI Implementation Chart.
 * Note: CC numbers may vary by firmware version — verify against your device.
 */

import type { DeviceProfile } from "../types";
import type { CCParameter } from "@/lib/midi/types";

const MICROFREAK_CCS: CCParameter[] = [
  // ─── Oscillator ───────────────────────────────────────────────
  // CC9 oscillator type values: 10=BasicWaves, 21=SuperWave, 32=WaveTable, 42=Harmo,
  // 53=KarplusStr, 64=V.Analog, 74=WaveShaper, 85=TwoOpFM, 95=Formant, 106=Chords, 117=Speech, 127=Modal
  { cc: 9,   name: "Oscillator Type",     shortName: "OSC",  min: 10, max: 127, defaultValue: 10,  bipolar: false, channels: "all", category: "sound" },
  { cc: 10,  name: "Wave",                shortName: "WAVE", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "sound" },
  { cc: 12,  name: "Timbre",              shortName: "TMBR", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "sound" },
  { cc: 13,  name: "Shape",               shortName: "SHPE", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "sound" },

  // ─── Filter ───────────────────────────────────────────────────
  { cc: 23,  name: "Filter Cutoff",       shortName: "CUT",  min: 0, max: 127, defaultValue: 127, bipolar: false, channels: "all", category: "sound" },
  { cc: 83,  name: "Filter Resonance",    shortName: "RES",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "sound" },

  // ─── Envelope ─────────────────────────────────────────────────
  { cc: 105, name: "Attack",              shortName: "ATK",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "sound" },
  { cc: 106, name: "Decay",               shortName: "DCY",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "sound" },
  { cc: 29,  name: "Sustain",             shortName: "SUS",  min: 0, max: 127, defaultValue: 100, bipolar: false, channels: "all", category: "sound" },
  { cc: 26,  name: "Filter Env Amount",   shortName: "FENV", min: 0, max: 127, defaultValue: 64,  bipolar: true,  channels: "all", category: "sound" },

  // ─── Cycling Envelope ─────────────────────────────────────────
  { cc: 102, name: "CycleEnv Rise",       shortName: "RISE", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "modulation" },
  { cc: 103, name: "CycleEnv Fall",       shortName: "FALL", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "modulation" },
  { cc: 28,  name: "CycleEnv Hold",       shortName: "HOLD", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "modulation" },
  { cc: 24,  name: "CycleEnv Amount",     shortName: "CAMT", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "modulation" },

  // ─── LFO ──────────────────────────────────────────────────────
  { cc: 93,  name: "LFO Rate",            shortName: "RATE", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "sound" },
  { cc: 94,  name: "LFO Rate Sync",       shortName: "RSYN", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "sound" },
  { cc: 107, name: "LFO Shape",           shortName: "LSHP", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "sound" },

  // ─── Arp/Seq ──────────────────────────────────────────────────
  { cc: 91,  name: "Arp/Seq Rate",        shortName: "ARAT", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "control" },
  { cc: 92,  name: "Arp/Seq Rate Sync",   shortName: "ASYN", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "control" },

  // ─── Performance ──────────────────────────────────────────────
  { cc: 5,   name: "Glide",               shortName: "GLD",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },
  { cc: 2,   name: "Spice",               shortName: "SPC",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },
  { cc: 42,  name: "Dice",                shortName: "DCE",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },
  { cc: 64,  name: "Hold",                shortName: "HLD",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },

  // ─── Standard ─────────────────────────────────────────────────
  { cc: 7,   name: "Volume",              shortName: "VOL",  min: 0, max: 127, defaultValue: 100, bipolar: false, channels: "all", category: "control" },
  { cc: 1,   name: "Mod Wheel",           shortName: "MOD",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },
];

export const microfreakProfile: DeviceProfile = {
  id: "microfreak",
  displayName: "Arturia MicroFreak",
  architecture: "synth",
  usbNames: ["Arturia MicroFreak", "MicroFreak"],

  tracks: [
    { name: "MicroFreak", type: "mono-synth", color: "orange", channel: 1, polyphony: 4 },
  ],

  allChannels: [1],
  drumChannels: [],
  synthChannels: [1],

  maxPatternsPerTrack: 6,
  maxBars: 4,       // 64 steps max / 16 steps per bar
  stepsPerBar: 16,
  maxSteps: 64,

  programChange: {
    sendSequence: (output, channel, bankMSB, _bankLSB, program) => {
      // Standard: Bank Select MSB then Program Change
      output.sendControlChange(0, bankMSB, { channels: channel });
      output.sendProgramChange(program, { channels: channel });
    },
  },

  sysex: {
    manufacturerId: [0x00, 0x20, 0x6b],
    // MicroFreak SysEx is poorly documented by Arturia — no parameter editing support
  },

  ccParams: MICROFREAK_CCS,

  sounds: {
    get presets() {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/midi/microfreak-presets").MICROFREAK_PRESETS;
    },
    getPresetsForTrack: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/midi/microfreak-presets").MICROFREAK_PRESETS;
    },
    searchPresets: (query: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const presets = require("@/lib/midi/microfreak-presets").MICROFREAK_PRESETS;
      const q = query.toLowerCase();
      return presets.filter((p: { name: string }) => p.name.toLowerCase().includes(q));
    },
  },

  prompts: {
    channelDocs: `## MicroFreak — Single Voice Melodic Synthesizer
- Channel 1: MicroFreak (mono/paraphonic synth, up to 4-note paraphony)
- This is a MELODIC synthesizer — NOT a drum machine
- Generate patterns with REAL pitched notes across octaves (e.g., C3=48, E3=52, G3=55, C4=60, E4=64, G4=67, C5=72)
- Paraphonic mode: up to 4 notes can share the same filter/amp envelope
- Pitch range: typically C2 (36) to C6 (96), sweet spot C3-C5 (48-72)
- This is a SINGLE-VOICE instrument — generate ONE track on channel 1`,
    genreInstructions: null,
    compositionRules: `## Rules for MicroFreak Composition (CRITICAL)
1. Generate patterns on Channel 1 ONLY
2. NEVER use pitch 60 for all notes — this is NOT a drum machine. Use varied melodic pitches from the requested scale (e.g., for C minor: C3=48, Eb3=51, G3=55, Bb3=58, C4=60, Eb4=63, G4=67)
3. ALWAYS fill ALL requested bars. If 2 bars requested, generate notes across steps 0-31. If 4 bars requested, fill steps 0-63.
CRITICAL: Maximum 4 bars (64 steps). NEVER generate more than 64 steps. If the user requests 8 bars, use 4 bars instead.
4. Maximum 4 simultaneous notes in paraphonic mode (for chords/pads). For mono lines, use 1 note at a time.
5. Use varied note durations: short staccato (1 step), legato (2-4 steps), sustained (4-8 steps)
6. Include velocity variation for expressiveness (ghost notes ~50, normal 90-100, accents 120+)
7. Create MUSICAL phrases with rests, contour, and rhythmic interest — not just a row of identical notes
8. For arpeggios: use ascending/descending pitch movement across 1-2 octaves
9. For bass lines: stay in C2-C4 range (36-60) with root/fifth movement
10. For pads/chords: stack 2-4 notes at the same step for paraphonic voicings

## Sound Design via CC Parameters
When composing for MicroFreak, ALSO design the sound by returning CC values in the soundDesign field.

Available CC parameters:
- CC9: Oscillator Type (10=BasicWaves, 21=SuperWave, 32=WaveTable, 42=Harmo, 53=KarplusStr, 64=V.Analog, 74=WaveShaper, 85=TwoOpFM, 95=Formant, 106=Chords, 117=Speech, 127=Modal)
- CC10: Wave (0-127) — waveform selection within the oscillator type
- CC12: Timbre (0-127) — tonal character control
- CC13: Shape (0-127) — waveform shape modifier
- CC23: Filter Cutoff (0-127, default 127) — lower values = darker sound
- CC83: Filter Resonance (0-127, default 0) — higher values = more peaked/squelchy
- CC105: Attack (0-127, default 0) — amplitude envelope attack time
- CC106: Decay (0-127, default 64) — amplitude envelope decay time
- CC29: Sustain (0-127, default 100) — amplitude envelope sustain level
- CC26: Filter Env Amount (0-127, center 64 = zero) — filter envelope modulation depth
- CC93: LFO Rate (0-127) — LFO speed (free-running)
- CC94: LFO Rate Sync (0-127) — LFO speed (tempo-synced)
- CC5: Glide (0-127, default 0) — portamento time between notes

## Cycling Envelope (Additional Modulator)
The Cycling Envelope is a looping envelope that acts as a complex second LFO:
- CC102: CycleEnv Rise (0-127) — attack/rise time
- CC103: CycleEnv Fall (0-127) — decay/fall time
- CC28: CycleEnv Hold (0-127) — hold time between rise and fall
- CC24: CycleEnv Amount (0-127) — modulation depth

Use the Cycling Envelope for evolving textures and movement:
- Slow rise + fast fall → rhythmic pulsing effect
- Equal rise/fall → triangle LFO-like smooth modulation
- Fast rise + slow fall → reverse envelope swells
- High amount with fast rate → aggressive wobble

## Modulation Matrix (5×7 Patch Bay)
The MicroFreak's patch bay is a 5×7 routing matrix. ALWAYS include matrixRouting in your output.

5 Sources: LFO, Env (amplitude envelope), CycleEnv (cycling envelope), Press (aftertouch/key pressure), Key (keyboard tracking — higher notes = higher value)

7 Destinations (first 4 fixed, last 3 assignable):
- Pitch — detune/vibrato effect
- Wave — waveform morphing
- Timbre — tonal character modulation
- Shape — waveform shape modulation
- Cutoff — filter frequency modulation (most common)
- Assign1 — user-assignable to ANY parameter (e.g., Resonance, Osc Type, Arp Rate, Glide, or even another modulation amount)
- Assign2 — user-assignable
- Assign3 — user-assignable

Amount: -100 to +100. Negative values invert the modulation (e.g., LFO→Pitch at -10 = downward vibrato).

Return matrixRouting as array of { source, destination, amount }.
For assignable destinations, use "Assign1:Resonance" format to indicate what the user should assign it to.
The app sends source CC parameters automatically AND displays routing as setup instructions.

Matrix recipes by sound type:
- Acid bass: [CycleEnv→Cutoff: +70, Env→Cutoff: +80, LFO→Pitch: +5, Key→Assign1:Resonance: +30]
- Evolving pad: [CycleEnv→Timbre: +60, LFO→Wave: +40, Key→Cutoff: +30, Press→Shape: +25]
- Rhythmic pulse: [CycleEnv→Cutoff: +100, LFO→Shape: +20, CycleEnv→Assign1:Resonance: +40]
- Breathing drone: [CycleEnv→Shape: +70, LFO→Cutoff: +30, Press→Pitch: +10, Key→Timbre: -20]
- Bright lead: [Env→Cutoff: +60, LFO→Pitch: +8, Press→Timbre: +50, Key→Cutoff: +25]
- Pluck arp: [Env→Cutoff: +90, Key→Cutoff: +40, LFO→Assign1:Arp Rate: +30]
- Self-generating: [CycleEnv→Wave: +80, LFO→Timbre: +60, CycleEnv→Assign1:LFO Rate: +40, LFO→Assign2:CycleEnv Amount: +50]

Sound design recipes (CC values):
- Acid bass: CC9=64 (V.Analog), CC23=45, CC83=100, CC105=0, CC106=28, CC29=0, CC26=92, CC5=8
- Warm pad: CC9=32 (WaveTable), CC23=90, CC83=10, CC105=70, CC106=80, CC29=110, CC26=40
- Evolving pad: CC9=32 (WaveTable), CC23=80, CC102=80, CC103=90, CC24=60, CC93=30
- Rhythmic pulse: CC9=64 (V.Analog), CC23=50, CC83=70, CC102=10, CC103=30, CC24=100
- Bright lead: CC9=21 (SuperWave), CC23=110, CC83=40, CC105=0, CC106=64, CC29=90, CC5=12
- Pluck arp: CC9=53 (KarplusStr), CC23=80, CC83=20, CC105=0, CC106=25, CC29=0
- Breathing drone: CC9=127 (Modal), CC23=30, CC102=50, CC103=60, CC24=70, CC93=15
- Percussive: CC9=95 (Formant), CC23=100, CC105=0, CC106=15, CC29=0

ALWAYS include soundDesign (CC params) + matrixRouting (source→destination routing). Include at least 2-4 matrix slots per sound. For evolving sounds, also include CC102/CC103/CC24 (cycling envelope source CCs).`,
    channelRange: [1, 1],
    supportsMultiTrack: false,
  },

  panicChannels: [1],

  ui: {
    showDrumGrid: false,
    showPianoRoll: true,
    showSoundDesignPanel: true,
    showMultiTrackArrangement: false,
    engineTabs: [
      { value: "synth", label: "Presets" },
    ],
  },
};
