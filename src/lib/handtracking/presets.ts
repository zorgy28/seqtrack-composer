/**
 * Built-in gesture-to-CC mapping presets for hand tracking.
 *
 * Each preset provides a curated set of gesture mappings
 * designed for a specific performance style.
 */

import type { GestureMapping, MappingPreset } from "./types";

// ─── Preset 1: FX DJ ──────────────────────────────────────────

const fxDjMappings: GestureMapping[] = [
  {
    id: "fxdj-left-palmx-cutoff",
    name: "Left Palm X → Filter Cutoff",
    hand: "Left",
    axis: "palmX",
    channel: 8,
    cc: 74,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "fxdj-left-palmy-reverb",
    name: "Left Palm Y → Reverb Send",
    hand: "Left",
    axis: "palmY",
    channel: 8,
    cc: 91,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "fxdj-right-palmx-delay",
    name: "Right Palm X → Delay Send",
    hand: "Right",
    axis: "palmX",
    channel: 8,
    cc: 94,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "fxdj-right-pinch-masterfx1",
    name: "Right Pinch → Master FX1 Param 1",
    hand: "Right",
    axis: "pinchThumbIndex",
    channel: 8,
    cc: 102,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
];

export const PRESET_FX_DJ: MappingPreset = {
  id: "fx-dj",
  name: "FX DJ",
  description:
    "Two-handed DJ-style control: left hand shapes filter and reverb, right hand controls delay and master effect.",
  mappings: fxDjMappings,
};

// ─── Preset 2: Filter Sweep ───────────────────────────────────

const filterSweepMappings: GestureMapping[] = [
  {
    id: "filtersweep-any-palmx-cutoff",
    name: "Palm X → Filter Cutoff",
    hand: "any",
    axis: "palmX",
    channel: 8,
    cc: 74,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "filtersweep-any-palmy-resonance",
    name: "Palm Y → Resonance",
    hand: "any",
    axis: "palmY",
    channel: 8,
    cc: 71,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
];

export const PRESET_FILTER_SWEEP: MappingPreset = {
  id: "filter-sweep",
  name: "Filter Sweep",
  description:
    "Simple one-hand filter control: horizontal movement sweeps cutoff, vertical controls resonance.",
  mappings: filterSweepMappings,
};

// ─── Preset 3: Dub Delay ──────────────────────────────────────

const dubDelayMappings: GestureMapping[] = [
  {
    id: "dubdelay-left-palmy-delay",
    name: "Left Palm Y → Delay Send",
    hand: "Left",
    axis: "palmY",
    channel: 8,
    cc: 94,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "dubdelay-left-pinch-delayparam1",
    name: "Left Pinch → Delay Param 1",
    hand: "Left",
    axis: "pinchThumbIndex",
    channel: 8,
    cc: 113,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "dubdelay-right-palmy-reverb",
    name: "Right Palm Y → Reverb Send",
    hand: "Right",
    axis: "palmY",
    channel: 8,
    cc: 91,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
];

export const PRESET_DUB_DELAY: MappingPreset = {
  id: "dub-delay",
  name: "Dub Delay",
  description:
    "Dub-style performance: left hand controls delay send and feedback, right hand adds reverb wash.",
  mappings: dubDelayMappings,
};

// ─── Preset 4: Sound Sculptor ──────────────────────────────────

const soundSculptorMappings: GestureMapping[] = [
  {
    id: "sculptor-any-pinch-cutoff",
    name: "Pinch → Filter Cutoff",
    hand: "any",
    axis: "pinchThumbIndex",
    channel: 8,
    cc: 74,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "sculptor-any-openness-resonance",
    name: "Hand Openness → Resonance",
    hand: "any",
    axis: "openness",
    channel: 8,
    cc: 71,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "sculptor-any-palmy-attack",
    name: "Palm Y → Attack",
    hand: "any",
    axis: "palmY",
    channel: 8,
    cc: 73,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "sculptor-any-roll-decay",
    name: "Hand Roll → Decay",
    hand: "any",
    axis: "roll",
    channel: 8,
    cc: 75,
    inputRange: [-1, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
];

export const PRESET_SOUND_SCULPTOR: MappingPreset = {
  id: "sound-sculptor",
  name: "Sound Sculptor",
  description:
    "Shape synth tone with natural gestures: pinch for cutoff, open/close hand for resonance, height for attack, wrist roll for decay.",
  mappings: soundSculptorMappings,
};

// ─── All Presets ───────────────────────────────────────────────

export const ALL_PRESETS: MappingPreset[] = [
  PRESET_FX_DJ,
  PRESET_FILTER_SWEEP,
  PRESET_DUB_DELAY,
  PRESET_SOUND_SCULPTOR,
];
