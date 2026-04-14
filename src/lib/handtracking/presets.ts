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

// ─── Preset 5: Face FX ──────────────────────────────────────────

const faceFxMappings: GestureMapping[] = [
  {
    id: "facefx-jawopen-cutoff",
    name: "Jaw Open → Filter Cutoff",
    hand: "any",
    axis: "jawOpen",
    channel: 8,
    cc: 74,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "facefx-smile-delay",
    name: "Mouth Smile → Delay Send",
    hand: "any",
    axis: "mouthSmile",
    channel: 8,
    cc: 94,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "facefx-brow-reverb",
    name: "Brow Raise → Reverb Send",
    hand: "any",
    axis: "browInnerUp",
    channel: 8,
    cc: 91,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "facefx-cheekpuff-masterfx1",
    name: "Cheek Puff → Master FX1 Param 1",
    hand: "any",
    axis: "cheekPuff",
    channel: 8,
    cc: 102,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
];

export const PRESET_FACE_FX: MappingPreset = {
  id: "face-fx",
  name: "Face FX",
  description:
    "Face-only control: jaw opens the filter, smiling adds delay, eyebrow raise adds reverb, cheek puff triggers master effect.",
  mappings: faceFxMappings,
};

// ─── Preset 6: Full Body FX ────────────────────────────────────

const fullBodyMappings: GestureMapping[] = [
  {
    id: "fullbody-left-palmx-cutoff",
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
    id: "fullbody-right-pinch-resonance",
    name: "Right Pinch → Resonance",
    hand: "Right",
    axis: "pinchThumbIndex",
    channel: 8,
    cc: 71,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "fullbody-jawopen-reverb",
    name: "Jaw Open → Reverb Send",
    hand: "any",
    axis: "jawOpen",
    channel: 8,
    cc: 91,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "fullbody-smile-delay",
    name: "Mouth Smile → Delay Send",
    hand: "any",
    axis: "mouthSmile",
    channel: 8,
    cc: 94,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "fullbody-brow-masterfx1",
    name: "Brow Raise → Master FX1",
    hand: "any",
    axis: "browInnerUp",
    channel: 8,
    cc: 102,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
  {
    id: "fullbody-eyewide-insertfx1",
    name: "Eyes Wide → Insert FX1",
    hand: "any",
    axis: "eyeWide",
    channel: 8,
    cc: 107,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  },
];

export const PRESET_FULL_BODY: MappingPreset = {
  id: "full-body",
  name: "Full Body FX",
  description:
    "Combined hands and face: left hand sweeps filter, right hand pinch controls resonance, facial expressions drive reverb, delay, and effects.",
  mappings: fullBodyMappings,
};

// ─── All SEQTRAK Presets ──────────────────────────────────────

export const SEQTRAK_PRESETS: MappingPreset[] = [
  PRESET_FX_DJ,
  PRESET_FILTER_SWEEP,
  PRESET_DUB_DELAY,
  PRESET_SOUND_SCULPTOR,
  PRESET_FACE_FX,
  PRESET_FULL_BODY,
];

// ─── MicroFreak Presets ───────────────────────────────────────
// All on channel 1 using MicroFreak CC numbers

const mfFilterSweepMappings: GestureMapping[] = [
  { id: "mf-palmx-cutoff", name: "Palm X → Filter Cutoff", hand: "any", axis: "palmX", channel: 1, cc: 23, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-palmy-resonance", name: "Palm Y → Resonance", hand: "any", axis: "palmY", channel: 1, cc: 83, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
];

const mfSoundDesignMappings: GestureMapping[] = [
  { id: "mf-pinch-cutoff", name: "Pinch → Filter Cutoff", hand: "any", axis: "pinchThumbIndex", channel: 1, cc: 23, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-openness-resonance", name: "Hand Open → Resonance", hand: "any", axis: "openness", channel: 1, cc: 83, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-palmy-attack", name: "Palm Y → Attack", hand: "any", axis: "palmY", channel: 1, cc: 105, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-roll-decay", name: "Hand Roll → Decay", hand: "any", axis: "roll", channel: 1, cc: 106, inputRange: [-1, 1], outputRange: [0, 127], invert: false, enabled: true },
];

const mfOscControlMappings: GestureMapping[] = [
  { id: "mf-palmx-wave", name: "Palm X → Wave", hand: "Left", axis: "palmX", channel: 1, cc: 10, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-palmy-timbre", name: "Palm Y → Timbre", hand: "Left", axis: "palmY", channel: 1, cc: 12, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-right-palmx-shape", name: "Right Palm X → Shape", hand: "Right", axis: "palmX", channel: 1, cc: 13, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-right-pinch-cutoff", name: "Right Pinch → Cutoff", hand: "Right", axis: "pinchThumbIndex", channel: 1, cc: 23, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
];

const mfLfoModMappings: GestureMapping[] = [
  { id: "mf-palmx-lfo-rate", name: "Palm X → LFO Rate", hand: "any", axis: "palmX", channel: 1, cc: 24, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-palmy-cutoff", name: "Palm Y → Filter Cutoff", hand: "any", axis: "palmY", channel: 1, cc: 23, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-pinch-spice", name: "Pinch → Spice", hand: "any", axis: "pinchThumbIndex", channel: 1, cc: 3, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
];

const mfFaceSynthMappings: GestureMapping[] = [
  { id: "mf-face-jaw-cutoff", name: "Jaw Open → Cutoff", hand: "any", axis: "jawOpen", channel: 1, cc: 23, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-face-smile-resonance", name: "Smile → Resonance", hand: "any", axis: "mouthSmile", channel: 1, cc: 83, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-face-brow-lfo", name: "Brow → LFO Rate", hand: "any", axis: "browInnerUp", channel: 1, cc: 24, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "mf-face-cheek-glide", name: "Cheek Puff → Glide", hand: "any", axis: "cheekPuff", channel: 1, cc: 51, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
];

export const MICROFREAK_PRESETS: MappingPreset[] = [
  { id: "mf-filter-sweep", name: "Filter Sweep", description: "Simple filter control: horizontal sweeps cutoff, vertical controls resonance.", mappings: mfFilterSweepMappings },
  { id: "mf-sound-design", name: "Sound Sculptor", description: "Shape the MicroFreak tone: pinch for cutoff, hand openness for resonance, height for attack, roll for decay.", mappings: mfSoundDesignMappings },
  { id: "mf-osc-control", name: "Oscillator Control", description: "Two-handed oscillator shaping: left hand controls wave and timbre, right hand controls shape and filter.", mappings: mfOscControlMappings },
  { id: "mf-lfo-mod", name: "LFO Modulation", description: "Modulation performance: horizontal sweeps LFO rate, vertical controls filter, pinch adds Spice randomization.", mappings: mfLfoModMappings },
  { id: "mf-face-synth", name: "Face Synth", description: "Face-only control: jaw opens filter, smile adds resonance, eyebrow controls LFO rate, cheek puff adds glide.", mappings: mfFaceSynthMappings },
];

// ─── Device-aware preset getter ───────────────────────────────

// ─── KO II Presets ────────────────────────────────────────────
// Minimal CC control — the EP-133 has no published CC parameter map.
// Presets focus on volume control (CC7) and mod wheel (CC1).

const ko2VolumeMappings: GestureMapping[] = [
  { id: "ko2-palmy-volume", name: "Palm Y → Volume", hand: "any", axis: "palmY", channel: 1, cc: 7, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
  { id: "ko2-pinch-mod", name: "Pinch → Mod Wheel", hand: "any", axis: "pinchThumbIndex", channel: 1, cc: 1, inputRange: [0, 1], outputRange: [0, 127], invert: false, enabled: true },
];

export const KO2_PRESETS: MappingPreset[] = [
  { id: "ko2-volume", name: "Volume & Mod", description: "Palm height controls volume, pinch controls mod wheel. (EP-133 has limited CC support.)", mappings: ko2VolumeMappings },
];

/** @deprecated Use getPresetsForDevice instead */
export const ALL_PRESETS = SEQTRAK_PRESETS;

/** Get mapping presets appropriate for a device profile */
export function getPresetsForDevice(deviceId?: string): MappingPreset[] {
  if (deviceId === "microfreak") return MICROFREAK_PRESETS;
  if (deviceId === "ko2") return KO2_PRESETS;
  return SEQTRAK_PRESETS;
}
