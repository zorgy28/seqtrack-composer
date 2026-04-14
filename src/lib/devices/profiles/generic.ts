/**
 * Generic MIDI device profile.
 *
 * 16-channel GM-compatible fallback for unrecognized devices.
 * Channel 10 = drums (GM convention), all others = melodic.
 */

import type { DeviceProfile } from "../types";
import type { CCParameter } from "@/lib/midi/types";

const CHANNEL_COLORS = [
  "red", "yellow", "fuchsia", "cyan", "blue", "green", "slate", "purple",
  "teal", "amber", "emerald", "rose", "indigo", "lime", "orange", "pink",
];

/** Standard GM CCs that work with any MIDI device */
const GENERIC_CCS: CCParameter[] = [
  { cc: 7,  name: "Volume",          shortName: "VOL", min: 0, max: 127, defaultValue: 100, bipolar: false, channels: "all",  category: "control" },
  { cc: 10, name: "Pan",             shortName: "PAN", min: 0, max: 127, defaultValue: 64,  bipolar: true,  channels: "all",  category: "control" },
  { cc: 11, name: "Expression",      shortName: "EXP", min: 0, max: 127, defaultValue: 127, bipolar: false, channels: "all",  category: "control" },
  { cc: 1,  name: "Mod Wheel",       shortName: "MOD", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all",  category: "control" },
  { cc: 64, name: "Sustain Pedal",   shortName: "SUS", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all",  category: "control" },
  { cc: 74, name: "Filter Cutoff",   shortName: "CUT", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",  category: "sound" },
  { cc: 71, name: "Resonance",       shortName: "RES", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",  category: "sound" },
  { cc: 73, name: "Attack Time",     shortName: "ATK", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",  category: "sound" },
  { cc: 75, name: "Decay Time",      shortName: "DEC", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",  category: "sound" },
  { cc: 91, name: "Reverb Send",     shortName: "REV", min: 0, max: 127, defaultValue: 40,  bipolar: false, channels: "all",  category: "effect" },
  { cc: 93, name: "Chorus Send",     shortName: "CHR", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all",  category: "effect" },
];

export const genericProfile: DeviceProfile = {
  id: "generic",
  displayName: "Generic MIDI",
  architecture: "generic",
  usbNames: [], // never auto-detects; used as fallback

  tracks: Array.from({ length: 16 }, (_, i) => ({
    name: `Ch ${i + 1}`,
    type: (i === 9 ? "drum" : "synth") as "drum" | "synth",
    color: CHANNEL_COLORS[i],
    channel: i + 1,
    defaultPitch: i === 9 ? 60 : undefined,
    polyphony: 128,
  })),

  allChannels: Array.from({ length: 16 }, (_, i) => i + 1),
  drumChannels: [10], // GM standard
  synthChannels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16],

  maxPatternsPerTrack: 6,
  maxBars: 8,
  stepsPerBar: 16,
  maxSteps: 128,

  programChange: {
    sendSequence: (output, channel, bankMSB, bankLSB, program) => {
      // Standard GM: CC0 + CC32 + PC
      output.sendControlChange(0, bankMSB, { channels: channel });
      output.sendControlChange(32, bankLSB, { channels: channel });
      output.sendProgramChange(program, { channels: channel });
    },
  },

  sysex: null, // no SysEx for generic devices

  ccParams: GENERIC_CCS,

  sounds: {
    presets: [],
    getPresetsForTrack: () => [],
    searchPresets: () => [],
  },

  prompts: {
    channelDocs: `## Generic MIDI Device
- 16 MIDI channels available (1-16)
- Channel 10 is typically drums (GM standard)
- No device-specific channel assignments
- Use standard GM program numbers for sound selection`,
    genreInstructions: null,
    compositionRules: `## Rules for Generic MIDI
1. Use channels 1-16
2. Channel 10 is drums (GM convention), use pitch 60 for drum hits
3. Other channels are melodic — use real MIDI note numbers
4. Standard Bank Select (CC0 + CC32) + Program Change for sounds
5. Velocity must be 1-127`,
    channelRange: [1, 16],
    supportsMultiTrack: true,
  },

  panicChannels: Array.from({ length: 16 }, (_, i) => i + 1),

  ui: {
    showDrumGrid: true,
    showPianoRoll: true,
    showSoundDesignPanel: false,
    showMultiTrackArrangement: true,
    engineTabs: [],
  },
};
