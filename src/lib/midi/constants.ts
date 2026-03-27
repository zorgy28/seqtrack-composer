import type { SeqtrackChannel, SeqtrackTrackInfo, DrumStyle, FullStyle } from "./types";

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

export const FULL_STYLES: FullStyle[] = [
  "basic_4x4", "breakbeat", "trap", "house", "techno", "dnb", "hiphop",
  "blues_shuffle", "funk", "reggae", "bossa_nova", "afrobeat", "disco",
  "triphop", "lofi", "latin_salsa", "ambient", "classic_rock", "jazz",
];

export const STYLE_INFO: Record<FullStyle, { name: string; bpm: number; description: string; category: string }> = {
  basic_4x4: { name: "Basic 4/4", bpm: 120, description: "Standard four-on-the-floor beat", category: "Drums Only" },
  breakbeat: { name: "Breakbeat", bpm: 130, description: "Syncopated break pattern", category: "Drums Only" },
  trap: { name: "Trap", bpm: 140, description: "808 kick with rapid hi-hats", category: "Electronic" },
  house: { name: "House", bpm: 124, description: "Four-on-the-floor with offbeat hats", category: "Electronic" },
  techno: { name: "Techno", bpm: 130, description: "Driving mechanical rhythm", category: "Electronic" },
  dnb: { name: "Drum & Bass", bpm: 174, description: "Fast breakbeat with heavy bass", category: "Electronic" },
  hiphop: { name: "Hip Hop", bpm: 90, description: "Boom bap groove", category: "Hip Hop" },
  blues_shuffle: { name: "Blues Shuffle", bpm: 75, description: "12-bar shuffle with walking bass", category: "Classics" },
  funk: { name: "Funk", bpm: 110, description: "Syncopated groove with ghost notes", category: "Classics" },
  reggae: { name: "Reggae", bpm: 80, description: "One-drop with dub bass and skank organ", category: "World" },
  bossa_nova: { name: "Bossa Nova", bpm: 130, description: "Brazilian rhythm with nylon guitar", category: "World" },
  afrobeat: { name: "Afrobeat", bpm: 115, description: "Polyrhythmic with horn melodies", category: "World" },
  disco: { name: "Disco", bpm: 120, description: "Four-on-the-floor with octave bass", category: "Classics" },
  triphop: { name: "Trip-Hop", bpm: 85, description: "Sparse breakbeat with dark sub bass", category: "Atmospheric" },
  lofi: { name: "Lo-fi", bpm: 78, description: "Lazy drums with jazzy piano chords", category: "Hip Hop" },
  latin_salsa: { name: "Latin Salsa", bpm: 180, description: "Clave-synced with piano montuno", category: "World" },
  ambient: { name: "Ambient", bpm: 70, description: "Minimal percussion with evolving pads", category: "Atmospheric" },
  classic_rock: { name: "Classic Rock", bpm: 130, description: "Driving beat with power bass and organ", category: "Classics" },
  jazz: { name: "Jazz", bpm: 120, description: "Swing ride pattern with walking bass", category: "Classics" },
};

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

// ─── Track color helpers ────────────────────────────────────────
// Full class name literals are required so Tailwind can statically scan them.

const TRACK_BG: Record<SeqtrackChannel, string> = {
  1: "bg-red-500/20", 2: "bg-yellow-500/20", 3: "bg-fuchsia-500/20",
  4: "bg-cyan-500/20", 5: "bg-blue-500/20", 6: "bg-green-500/20",
  7: "bg-slate-500/20", 8: "bg-purple-500/20", 9: "bg-teal-500/20",
  10: "bg-amber-500/20", 11: "bg-emerald-500/20",
};

const TRACK_BG_ACTIVE: Record<SeqtrackChannel, string> = {
  1: "bg-red-600", 2: "bg-yellow-600", 3: "bg-fuchsia-600",
  4: "bg-cyan-600", 5: "bg-blue-600", 6: "bg-green-600",
  7: "bg-slate-600", 8: "bg-purple-600", 9: "bg-teal-600",
  10: "bg-amber-600", 11: "bg-emerald-600",
};

const TRACK_SOLID: Record<SeqtrackChannel, string> = {
  1: "bg-red-500", 2: "bg-yellow-500", 3: "bg-fuchsia-500",
  4: "bg-cyan-500", 5: "bg-blue-500", 6: "bg-green-500",
  7: "bg-slate-500", 8: "bg-purple-500", 9: "bg-teal-500",
  10: "bg-amber-500", 11: "bg-emerald-500",
};

export function getTrackBgClass(channel: SeqtrackChannel): string {
  return TRACK_BG[channel] ?? "bg-zinc-500/20";
}

export function getTrackBgActiveClass(channel: SeqtrackChannel): string {
  return TRACK_BG_ACTIVE[channel] ?? "bg-zinc-600";
}

export function getTrackSolidClass(channel: SeqtrackChannel): string {
  return TRACK_SOLID[channel] ?? "bg-zinc-500";
}
