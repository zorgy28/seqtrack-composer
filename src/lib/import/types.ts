import type { SeqtrackChannel } from "@/lib/midi/types";

// ---- Intermediate representation for all import parsers ----------------

export interface ImportedNote {
  pitch: number; // MIDI 0-127
  velocity: number; // 1-127
  time: number; // seconds from start
  duration: number; // seconds
  channel?: number; // SEQTRAK channel hint (1-11)
}

export interface ImportTrackInfo {
  originalChannel: number;      // MIDI channel from file (0-indexed from @tonejs/midi)
  seqtrackChannel: SeqtrackChannel; // Mapped SEQTRAK channel
  name: string;                 // Track name or GM instrument name
  gmProgram: number;            // GM program number (0-127)
  gmFamily: string;             // Instrument family from @tonejs/midi
  noteCount: number;
  pitchRange: [number, number];
  suggestedPresetId: number | null;
  isDrum: boolean;
}

export interface ImportResult {
  notes: ImportedNote[];
  bpm?: number;
  key?: string;
  name?: string;
  channels: number[];
  trackInfos?: ImportTrackInfo[];
}

// ---- Instrument pitch-range presets ------------------------------------

export interface InstrumentPreset {
  name: string;
  midiMin: number;
  midiMax: number;
  defaultChannel: SeqtrackChannel;
}

export const INSTRUMENTS: InstrumentPreset[] = [
  { name: "Piano", midiMin: 21, midiMax: 108, defaultChannel: 9 },
  { name: "Cello", midiMin: 36, midiMax: 81, defaultChannel: 8 },
  { name: "Violin", midiMin: 55, midiMax: 100, defaultChannel: 9 },
  { name: "Viola", midiMin: 48, midiMax: 88, defaultChannel: 9 },
  { name: "Double Bass", midiMin: 28, midiMax: 67, defaultChannel: 8 },
  { name: "Flute", midiMin: 60, midiMax: 96, defaultChannel: 9 },
  { name: "Clarinet", midiMin: 50, midiMax: 94, defaultChannel: 9 },
  { name: "Oboe", midiMin: 58, midiMax: 93, defaultChannel: 9 },
  { name: "Trumpet", midiMin: 54, midiMax: 86, defaultChannel: 9 },
  { name: "Saxophone", midiMin: 46, midiMax: 90, defaultChannel: 9 },
  { name: "French Horn", midiMin: 35, midiMax: 77, defaultChannel: 9 },
  { name: "Tuba", midiMin: 26, midiMax: 65, defaultChannel: 8 },
  { name: "Guitar", midiMin: 40, midiMax: 88, defaultChannel: 9 },
  { name: "Bass Guitar", midiMin: 28, midiMax: 67, defaultChannel: 8 },
];
