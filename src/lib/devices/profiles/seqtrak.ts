/**
 * Yamaha SEQTRAK device profile.
 *
 * Uses lazy getters for sounds and CC params to avoid module initialization
 * order issues with Turbopack (sound-library and cc-map have complex dep trees).
 */

import type { DeviceProfile } from "../types";

// Lazy loaders — avoid importing sound-library/cc-map at module evaluation time
let _ccParams: import("@/lib/midi/types").CCParameter[] | null = null;
function getCCParams() {
  if (!_ccParams) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _ccParams = require("@/lib/midi/cc-map").CC_PARAMS;
  }
  return _ccParams!;
}

export const seqtrackProfile: DeviceProfile = {
  id: "seqtrak",
  displayName: "Yamaha SEQTRAK",
  architecture: "groovebox",
  usbNames: ["SEQTRAK", "seqtrak", "Yamaha SEQTRAK"],

  tracks: [
    { name: "Kick",    type: "drum",    color: "red",     channel: 1,  defaultPitch: 60, polyphony: 1 },
    { name: "Snare",   type: "drum",    color: "yellow",  channel: 2,  defaultPitch: 60, polyphony: 1 },
    { name: "Clap",    type: "drum",    color: "fuchsia", channel: 3,  defaultPitch: 60, polyphony: 1 },
    { name: "Hat 1",   type: "drum",    color: "cyan",    channel: 4,  defaultPitch: 60, polyphony: 1 },
    { name: "Hat 2",   type: "drum",    color: "blue",    channel: 5,  defaultPitch: 60, polyphony: 1 },
    { name: "Perc 1",  type: "drum",    color: "green",   channel: 6,  defaultPitch: 60, polyphony: 1 },
    { name: "Perc 2",  type: "drum",    color: "slate",   channel: 7,  defaultPitch: 60, polyphony: 1 },
    { name: "Synth 1", type: "synth",   color: "purple",  channel: 8,  polyphony: 128 },
    { name: "Synth 2", type: "synth",   color: "teal",    channel: 9,  polyphony: 128 },
    { name: "DX",      type: "fm",      color: "amber",   channel: 10, polyphony: 128 },
    { name: "Sampler", type: "sampler", color: "emerald", channel: 11, polyphony: 128 },
  ],

  allChannels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  drumChannels: [1, 2, 3, 4, 5, 6, 7],
  synthChannels: [8, 9, 10, 11],

  maxPatternsPerTrack: 6,
  maxBars: 8,
  stepsPerBar: 16,
  maxSteps: 128,

  programChange: {
    sendSequence: (output, channel, bankMSB, bankLSB, program) => {
      // SEQTRAK quirk: must re-send CC32 after PC for sound change to take effect.
      // Add 10ms delay before the second CC32 to ensure the device processes the PC first.
      output.sendControlChange(0, bankMSB, { channels: channel });
      output.sendControlChange(32, bankLSB, { channels: channel });
      output.sendProgramChange(program, { channels: channel });
      output.sendControlChange(32, bankLSB, { channels: channel, time: `+10` });
    },
  },

  sysex: {
    manufacturerId: [0x43],
    buildParameterChange: (address, data) => {
      return [0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x0c, ...address, ...data, 0xf7];
    },
    buildParameterRequest: (address) => {
      return [0xf0, 0x43, 0x30, 0x7f, 0x1c, 0x0c, ...address, 0xf7];
    },
  },

  get ccParams() {
    return getCCParams();
  },

  sounds: {
    get presets() {
      // Lazy: avoid importing sound-library at module evaluation time
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/midi/sound-library").ALL_PRESETS;
    },
    getPresetsForTrack: (trackIndex) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPresetsByEngine, getAllPresets } = require("@/lib/midi/sound-library");
      if (trackIndex <= 6) return getPresetsByEngine("drum");
      if (trackIndex <= 8) return getPresetsByEngine("awm2");
      if (trackIndex === 9) return getPresetsByEngine("dx");
      if (trackIndex === 10) return getAllPresets().filter((p: { engine: string }) => p.engine === "sampler");
      return [];
    },
    searchPresets: (query: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@/lib/midi/sound-library").searchPresets(query);
    },
  },

  prompts: {
    channelDocs: `## SEQTRAK Channel Mapping (CRITICAL — each instrument has its OWN MIDI channel)
- Channel 1: KICK (drum)
- Channel 2: SNARE (drum)
- Channel 3: CLAP (drum)
- Channel 4: HAT 1 — closed hi-hat (drum)
- Channel 5: HAT 2 — open hi-hat (drum)
- Channel 6: PERC 1 (drum)
- Channel 7: PERC 2 (drum)
- Channel 8: SYNTH 1 — AWM2 synth (melodic)
- Channel 9: SYNTH 2 — AWM2 synth (melodic)
- Channel 10: DX — FM synthesis (melodic)
- Channel 11: SAMPLER (melodic or percussive)`,
    genreInstructions: null,
    compositionRules: `## Rules
1. ALWAYS use the correct channel numbers (1-11) as documented above
2. For drum tracks (ch 1-7), pitch MUST be 60 — the SEQTRAK ignores other pitches for drums
3. For melodic tracks (ch 8-11), use real MIDI note numbers within the selected scale
4. Velocity must be 1-127 (never 0)
5. Drum channels are monophonic — only one note per step
6. Duration for drums should typically be 1 step (16th note)`,
    channelRange: [1, 11],
    supportsMultiTrack: true,
  },

  panicChannels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],

  ui: {
    showDrumGrid: true,
    showPianoRoll: true,
    showSoundDesignPanel: false,
    showMultiTrackArrangement: true,
    engineTabs: [
      { value: "drum", label: "Drum" },
      { value: "awm2", label: "Synth (AWM2)" },
      { value: "dx", label: "DX (FM)" },
      { value: "sampler", label: "Sampler" },
    ],
  },
};
