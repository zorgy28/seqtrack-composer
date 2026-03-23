import type { SeqtrackChannel, SeqtrackTrackInfo, DrumStyle } from "./types";

export const SEQTRAK_TRACKS: Record<SeqtrackChannel, SeqtrackTrackInfo> = {
  1: { name: "Kick", type: "drum", color: "red", channel: 1 },
  2: { name: "Snare", type: "drum", color: "yellow", channel: 2 },
  3: { name: "Clap", type: "drum", color: "fuchsia", channel: 3 },
  4: { name: "Hat 1", type: "drum", color: "cyan", channel: 4 },
  5: { name: "Hat 2", type: "drum", color: "blue", channel: 5 },
  6: { name: "Perc 1", type: "drum", color: "green", channel: 6 },
  7: { name: "Perc 2", type: "drum", color: "slate", channel: 7 },
  8: { name: "Synth 1", type: "synth", color: "purple", channel: 8 },
  9: { name: "Synth 2", type: "synth", color: "teal", channel: 9 },
  10: { name: "DX", type: "fm", color: "amber", channel: 10 },
  11: { name: "Sampler", type: "sampler", color: "emerald", channel: 11 },
};

export const ALL_CHANNELS: SeqtrackChannel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const DRUM_CHANNELS: SeqtrackChannel[] = [1, 2, 3, 4, 5, 6, 7];
export const SYNTH_CHANNELS: SeqtrackChannel[] = [8, 9, 10, 11];

export const MAX_PATTERNS_PER_TRACK = 6;
export const MAX_BARS = 8;
export const STEPS_PER_BAR = 16;
export const MAX_STEPS = MAX_BARS * STEPS_PER_BAR; // 128
export const MAX_SCENES = 16;
export const BPM_MIN = 5;
export const BPM_MAX = 300;
export const DEFAULT_BPM = 120;
export const TICKS_PER_BEAT = 480;
export const TICKS_PER_STEP = TICKS_PER_BEAT / 4; // 16th note = 120 ticks

export const SCALES: Record<string, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  whole_tone: [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
};

export const SCALE_NAMES = Object.keys(SCALES);

export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export const FLAT_TO_SHARP: Record<string, string> = {
  Bb: "A#", Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#",
  bb: "A#", db: "C#", eb: "D#", gb: "F#", ab: "G#",
};

export const DRUM_STYLES: DrumStyle[] = [
  "basic_4x4", "breakbeat", "trap", "house", "techno", "dnb", "hiphop",
];

export const QUANTIZE_OPTIONS: Record<string, number> = {
  "1/32": TICKS_PER_BEAT / 8,
  "1/16T": TICKS_PER_BEAT / 6,
  "1/16": TICKS_PER_BEAT / 4,
  "1/8T": TICKS_PER_BEAT / 3,
  "1/8": TICKS_PER_BEAT / 2,
  off: 1,
};

// Device detection
export const SEQTRAK_DEVICE_NAMES = ["SEQTRAK", "seqtrak", "Yamaha SEQTRAK"];
export const YAMAHA_SYSEX_ID = 0x43;
