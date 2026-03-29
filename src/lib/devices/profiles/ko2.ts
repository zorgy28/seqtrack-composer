/**
 * Teenage Engineering EP-133 KO II device profile.
 *
 * Sample-based groovebox with 12 pads x 4 groups = 48 sounds.
 * Single MIDI channel, sounds differentiated by note number.
 * Groups: A (36-47 drums), B (48-59 bass), C (60-71 melody), D (72-83 user).
 * Minimal CC documentation — internal parameters not CC-controllable.
 */

import type { DeviceProfile } from "../types";
import type { CCParameter } from "@/lib/midi/types";

const KO2_CCS: CCParameter[] = [
  // Only documented CCs — the EP-133 has no published CC parameter map
  { cc: 7,  name: "Volume",    shortName: "VOL", min: 0, max: 127, defaultValue: 100, bipolar: false, channels: "all", category: "control" },
  { cc: 1,  name: "Mod Wheel", shortName: "MOD", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all", category: "control" },
];

export const ko2Profile: DeviceProfile = {
  id: "ko2",
  displayName: "Teenage Engineering KO II",
  architecture: "groovebox",
  usbNames: ["EP-133", "KO II", "KO-II", "teenage engineering"],

  // Single track — the KO II uses one MIDI channel with note ranges for groups:
  // Group A (drums): 36-47, Group B (bass): 48-59, Group C (melody): 60-71, Group D: 72-83
  tracks: [
    { name: "KO II",  type: "synth",  color: "orange", channel: 1, defaultPitch: 60, polyphony: 16 },
  ],

  allChannels: [1],
  drumChannels: [],    // no separate drum grid — drums are note ranges on channel 1
  synthChannels: [1],  // single channel handles all groups via pitch

  maxPatternsPerTrack: 6,
  maxBars: 8,
  stepsPerBar: 16,
  maxSteps: 128,

  programChange: {
    sendSequence: (_output, _channel, _bankMSB, _bankLSB, _program) => {
      // Program Change removed in FW 2.0.2 — no-op
    },
  },

  sysex: null, // SysEx is for sample transfer only (reverse-engineered, not for CC)

  ccParams: KO2_CCS,

  sounds: {
    get presets() {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/midi/ko2-presets").KO2_PRESETS;
    },
    getPresetsForTrack: () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/midi/ko2-presets").KO2_PRESETS; // all presets available on single track
    },
    searchPresets: (query: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { KO2_PRESETS } = require("@/lib/midi/ko2-presets");
      const q = query.toLowerCase();
      return KO2_PRESETS.filter((p: { name: string }) => p.name.toLowerCase().includes(q));
    },
  },

  prompts: {
    channelDocs: `## EP-133 KO II — Sample-Based Groovebox
- ALL sounds are on Channel 1 — differentiate by MIDI note number
- Group A (notes 36-47): Drums — kick, snare, hats, percussion (12 pads)
- Group B (notes 48-59): Bass — bass sounds and low-frequency samples
- Group C (notes 60-71): Melody — synths, keys, pads, melodic samples
- Group D (notes 72-83): User — any sound, loops, FX
- The device has 12 velocity-sensitive pads per group
- Polyphony: 16 mono / 12 stereo voices
- This is a SAMPLER — all sounds are sample-based, no synthesis engine`,
    genreInstructions: null,
    compositionRules: `## Rules for KO II Composition
1. ALL notes go to Channel 1 — use note numbers to select pads/groups
2. Drums: use notes 36-47 (Group A pads). Default: 36=kick, 40=snare, 43=closed HH, 44=open HH, 38=clap
3. Bass: use notes 48-59 (Group B pads). Root note on 48 (C3), melodic range across the octave
4. Melody: use notes 60-71 (Group C pads). Root on 60 (C4), can play chromatically
5. Velocity is important (1-127) — the pads are velocity-sensitive
6. Duration matters for sustaining sounds (oneshot samples play full length regardless)
7. Maximum 16 simultaneous voices — keep polyphony in mind
8. Pattern can be up to 8 bars (128 steps)`,
    channelRange: [1, 1],
    supportsMultiTrack: false,
  },

  panicChannels: [1],

  ui: {
    showDrumGrid: false,  // drums are note ranges on the same channel, not separate tracks
    showPianoRoll: true,
    showSoundDesignPanel: false, // no CC parameters to control
    showMultiTrackArrangement: false,
    engineTabs: [
      { value: "drum", label: "Drums" },
      { value: "bass", label: "Bass" },
      { value: "melodic", label: "Melodic" },
    ],
  },
};
