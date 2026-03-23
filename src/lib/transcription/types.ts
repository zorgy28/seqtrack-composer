import type { SeqtrackChannel, Pattern } from "@/lib/midi/types";

// ---- Pipeline stages ------------------------------------------------

export type TranscriptionStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "separating"
  | "transcribing"
  | "analyzing"
  | "refining"
  | "choosing"
  | "applying"
  | "error";

// ---- Raw MIDI from ML service ---------------------------------------

export interface RawMidiEvent {
  pitch: number; // MIDI note 0-127
  start: number; // seconds
  end: number; // seconds
  velocity: number; // 1-127
  confidence?: number; // 0-1
}

// ---- Stem metadata --------------------------------------------------

export interface StemInfo {
  name: string; // "drums", "bass", "vocals", "other"
  enabled: boolean;
}

// ---- Stem-separated MIDI data ---------------------------------------

export interface StemMidiData {
  /** For drums: pre-classified into SEQTRAK channels (key is channel number as string) */
  drums?: Record<string, RawMidiEvent[]>;
  /** Bass stem: flat list of events */
  bass?: RawMidiEvent[];
  /** Vocal stem: flat list of events */
  vocals?: RawMidiEvent[];
  /** Other/residual stem: flat list of events */
  other?: RawMidiEvent[];
  /** Guitar stem: flat list of events */
  guitar?: RawMidiEvent[];
  /** Piano stem: flat list of events */
  piano?: RawMidiEvent[];
}

// ---- Audio analysis from ML service ---------------------------------

export interface AudioAnalysis {
  bpm: number;
  key: string;
  duration: number;
}

// ---- ML service response types --------------------------------------

export interface MLServiceResult {
  stems: string[];
  midi_events: StemMidiData;
  analysis: AudioAnalysis;
  midi_analysis?: {
    chords: string[];
    structure: string;
    genre: string;
    mood: string;
    suggestions: string[];
  };
}

export interface MLServiceStatus {
  stage: string;
  progress: number;
  result: MLServiceResult | null;
  error?: string;
}

// ---- Sound recommendation -------------------------------------------

export interface SoundRecommendation {
  name: string;
  category: string;
  id: number;
}

// ---- Transcription output -------------------------------------------

export interface TranscriptionTrack {
  channel: SeqtrackChannel;
  patterns: Pattern[];
  soundPreset: SoundRecommendation;
  alternativeSounds: SoundRecommendation[];
}

export interface TranscriptionOption {
  mode: "faithful" | "simplified" | "creative";
  label: string;
  description: string;
  bpm: number;
  key: string;
  tracks: TranscriptionTrack[];
  swing: number;
}

export interface TranscriptionResult {
  options: TranscriptionOption[];
  analysis: {
    detectedGenre: string;
    detectedKey: string;
    detectedBpm: number;
    stemSummary: Record<string, string>;
  };
}
