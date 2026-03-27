// ---------------------------------------------------------------------------
// Performance Recording — Type Definitions
// ---------------------------------------------------------------------------

import type { SeqtrackChannel } from "@/lib/midi/types";

// ---------------------------------------------------------------------------
// Recorded MIDI events (discriminated union)
// ---------------------------------------------------------------------------

interface RecordedMidiEventBase {
  /** Milliseconds since session epoch (performance.now() - epoch) */
  timestamp: number;
  /** MIDI channel 1-16 */
  channel: number;
}

export interface RecordedNoteOn extends RecordedMidiEventBase {
  type: "noteon";
  pitch: number;
  velocity: number;
}

export interface RecordedNoteOff extends RecordedMidiEventBase {
  type: "noteoff";
  pitch: number;
  velocity: number;
}

export interface RecordedControlChange extends RecordedMidiEventBase {
  type: "cc";
  controller: number;
  value: number;
}

export interface RecordedProgramChange extends RecordedMidiEventBase {
  type: "pc";
  program: number;
}

export interface RecordedPitchBend extends RecordedMidiEventBase {
  type: "pitchbend";
  value: number;
}

export type RecordedMidiEvent =
  | RecordedNoteOn
  | RecordedNoteOff
  | RecordedControlChange
  | RecordedProgramChange
  | RecordedPitchBend;

// ---------------------------------------------------------------------------
// Recording status state machine
// ---------------------------------------------------------------------------

export type RecordingStatus =
  | "idle"
  | "armed"
  | "recording"
  | "stopping"
  | "complete"
  | "error";

// ---------------------------------------------------------------------------
// Recording session
// ---------------------------------------------------------------------------

/** Lightweight metadata — safe to load for list views without fetching audio blobs. */
export interface RecordingSessionMeta {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  durationMs: number;
  bpm: number;
  midiEventCount: number;
  hasAudio: boolean;
  audioFormat: string | null;
  audioBlobSize: number | null;
}

/** Full session including MIDI events (audio blob stored separately). */
export interface RecordingSession extends RecordingSessionMeta {
  midiEvents: RecordedMidiEvent[];
}

// ---------------------------------------------------------------------------
// Recording engine configuration
// ---------------------------------------------------------------------------

export interface RecordingConfig {
  midiDeviceId: string;
  audioDeviceId?: string;
  projectId: string;
  bpm: number;
  name?: string;
  audioMimeType?: string;
}

// ---------------------------------------------------------------------------
// Timeline editing
// ---------------------------------------------------------------------------

export interface TimelineSelection {
  startMs: number;
  endMs: number;
}

export interface SessionMarker {
  id: string;
  timestamp: number;
  label: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Convert-to-pattern options
// ---------------------------------------------------------------------------

export interface ConvertToPatternOptions {
  startMs: number;
  endMs: number;
  bpm: number;
  bars: number;
  quantizeGrid: string;
  channelMap: Map<number, SeqtrackChannel>;
}

// ---------------------------------------------------------------------------
// Paired note (computed from noteon + noteoff for visualization / conversion)
// ---------------------------------------------------------------------------

export interface PairedNote {
  channel: number;
  pitch: number;
  velocity: number;
  startMs: number;
  endMs: number;
}
