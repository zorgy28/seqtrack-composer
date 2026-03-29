// ─── Hardware Types ─────────────────────────────────────────────

export type TrackType = "drum" | "synth" | "fm" | "sampler" | "mono-synth";

/** MIDI channel number. Widened from union type for multi-device support. */
export type SeqtrackChannel = number;

export interface SeqtrackTrackInfo {
  name: string;
  type: TrackType;
  color: string;
  channel: SeqtrackChannel;
}

// ─── Core Data Models ───────────────────────────────────────────

export interface Note {
  pitch: number; // MIDI note 0-127
  velocity: number; // 1-127
  step: number; // 0-based step position
  duration: number; // duration in steps (1 = 1/16th note)
  probability: number; // 0-100
}

export interface Pattern {
  name: string;
  bars: number; // 1-8
  notes: Note[];
  swing: number; // -100 to +100
}

export interface Track {
  channel: SeqtrackChannel;
  patterns: Pattern[];
  activePattern: number;
  muted: boolean;
  volume: number; // 0-127
  pan: number; // 0-127 (64 = center)
}

export interface Scene {
  name: string;
  patternIndices: Partial<Record<SeqtrackChannel, number>>;
  mutes: Partial<Record<SeqtrackChannel, boolean>>;
  repeats: number;
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  tracks: Record<SeqtrackChannel, Track>;
  scenes: Scene[];
  scaleRoot: string;
  scaleName: string;
  quantize: string;
  createdAt: string;
  updatedAt: string;
  /** Which device profile this project was created for (undefined = legacy SEQTRAK) */
  deviceId?: string;
}

// ─── AI Composition Types ───────────────────────────────────────

export type DrumStyle =
  | "basic_4x4"
  | "breakbeat"
  | "trap"
  | "house"
  | "techno"
  | "dnb"
  | "hiphop";

export type FullStyle =
  | DrumStyle
  | "blues_shuffle"
  | "funk"
  | "reggae"
  | "bossa_nova"
  | "afrobeat"
  | "disco"
  | "triphop"
  | "lofi"
  | "latin_salsa"
  | "ambient"
  | "classic_rock"
  | "jazz";

export interface CompositionRequest {
  prompt: string;
  bpm?: number;
  scaleRoot?: string;
  scaleName?: string;
  bars?: number;
  tracks?: SeqtrackChannel[];
}

export interface CompositionResult {
  tracks: Partial<Record<SeqtrackChannel, { patterns: Pattern[] }>>;
  description: string;
  suggestions: string[];
}

// ─── MIDI Connection Types ──────────────────────────────────────

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "unsupported";

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  isSeqtrack: boolean;
  /** Detected device profile ID (undefined for unrecognized devices) */
  detectedDeviceId?: string;
}

export interface MidiConnectionState {
  status: ConnectionStatus;
  device: MidiDevice | null;
  outputs: MidiDevice[];
  inputs: MidiDevice[];
  error: string | null;
}

export interface ChannelTestResult {
  channel: SeqtrackChannel;
  trackName: string;
  status: "idle" | "testing" | "sent" | "error";
  timestamp: number | null;
}

// ─── Sound Management Types ─────────────────────────────────────

export type SoundEngine = "drum" | "awm2" | "dx" | "sampler";

export type SoundCategory =
  | "Kick" | "Snare" | "Rim" | "Clap" | "Snap"
  | "Closed HiHat" | "Open HiHat" | "Shaker" | "Ride" | "Crash"
  | "Tom" | "Bell" | "Conga" | "World" | "SFX"
  | "Bass" | "Synth Lead" | "Piano" | "Keyboard" | "Organ"
  | "Pad" | "Strings" | "Brass" | "Woodwind" | "Guitar"
  | "Mallet" | "Rhythmic"
  | "Vocal" | "Loop" | "One-Shot" | "Texture" | "Noise";

export interface SoundPreset {
  id: number;           // Global ID (1-2032 for sounds, 1-392 for sampler)
  name: string;         // Display name
  category: SoundCategory;
  engine: SoundEngine;
  bankMSB: number;      // CC0 value for Bank Select
  bankLSB: number;      // CC32 value for Bank Select
  programNumber: number; // Program Change value
}

export interface CCParameter {
  cc: number;
  name: string;
  shortName: string;    // 3-5 char label for knobs
  min: number;
  max: number;
  defaultValue: number;
  bipolar: boolean;     // true if 64 = center/zero
  channels: "all" | "drum" | "synth" | "dx" | SeqtrackChannel[];
  category: "sound" | "effect" | "control" | "fm" | "eq";
}

export interface TrackSoundState {
  preset: SoundPreset | null;
  ccValues: Record<number, number>; // CC number → current value
}
