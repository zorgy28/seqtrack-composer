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
  { cc: 30,  name: "Filter Env Amount",   shortName: "FENV", min: 0, max: 127, defaultValue: 0,   bipolar: true,  channels: "all", category: "sound" },

  // ─── LFO ──────────────────────────────────────────────────────
  { cc: 24,  name: "LFO Rate",            shortName: "RATE", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all", category: "sound" },
  { cc: 107, name: "LFO Shape",           shortName: "LSHP", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "sound" },

  // ─── Performance ──────────────────────────────────────────────
  { cc: 51,  name: "Glide",               shortName: "GLD",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },
  { cc: 3,   name: "Spice",               shortName: "SPC",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },
  { cc: 42,  name: "Dice",                shortName: "DCE",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },

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
    channelDocs: `## MicroFreak — Single Voice Synthesizer
- Channel 1: MicroFreak (mono/paraphonic synth, up to 4-note paraphony)
- This is a SINGLE-VOICE instrument — generate ONE melodic line
- Paraphonic mode: up to 4 notes can share the same filter/amp envelope
- No drums — this is a melodic synthesizer only`,
    genreInstructions: null,
    compositionRules: `## Rules for MicroFreak Composition
1. Generate patterns on Channel 1 ONLY
2. Use real MIDI note numbers (no pitch=60 drum mode)
3. Maximum 4 simultaneous notes in paraphonic mode
4. Focus on melodic lines, arpeggios, sequences, and bass lines
5. Velocity sensitivity is available (1-127)
6. Duration matters — the MicroFreak responds to note length
7. Consider suggesting CC automation for filter sweeps and sound design`,
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
