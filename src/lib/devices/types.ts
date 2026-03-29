/**
 * Device abstraction types for multi-device MIDI support.
 *
 * A DeviceProfile encapsulates all device-specific behavior as static data.
 * Adding a new device = creating a new profile file implementing this interface.
 */

import type { SoundPreset, CCParameter } from "@/lib/midi/types";

// ─── Device Identifiers ────────────────────────────────────────

export type DeviceId = "seqtrak" | "microfreak" | "ko2" | "generic";

/** Architecture category — determines UI layout and AI prompt strategy */
export type DeviceArchitecture = "groovebox" | "synth" | "generic";

// ─── Track Definition ──────────────────────────────────────────

export type DeviceTrackType = "drum" | "synth" | "fm" | "sampler" | "mono-synth";

export interface DeviceTrack {
  name: string;
  type: DeviceTrackType;
  color: string;
  channel: number;           // MIDI channel (1-16)
  defaultPitch?: number;     // e.g. 60 for SEQTRAK drum tracks
  polyphony: number;         // 1 = mono, 4 = paraphonic, 128 = full poly
}

// ─── Program Change Strategy ───────────────────────────────────

export interface ProgramChangeStrategy {
  /**
   * Send the message sequence to select a sound on this device.
   * SEQTRAK requires CC32 re-send; MicroFreak uses standard CC0+PC.
   */
  sendSequence: (
    output: { sendControlChange: Function; sendProgramChange: Function },
    channel: number,
    bankMSB: number,
    bankLSB: number,
    program: number,
  ) => void;
}

// ─── SysEx Configuration ───────────────────────────────────────

export interface SysExConfig {
  manufacturerId: number[];  // e.g. [0x43] Yamaha, [0x00, 0x20, 0x6B] Arturia
  buildParameterChange?: (address: number[], data: number[]) => number[];
  buildParameterRequest?: (address: number[]) => number[];
}

// ─── Sound Library ─────────────────────────────────────────────

export interface DeviceSoundLibrary {
  presets: SoundPreset[];
  getPresetsForTrack: (trackIndex: number) => SoundPreset[];
  searchPresets: (query: string) => SoundPreset[];
}

// ─── AI Prompt Configuration ───────────────────────────────────

export interface DevicePromptConfig {
  /** System prompt block describing channel layout */
  channelDocs: string;
  /** Genre-specific arrangement instructions (null for synths) */
  genreInstructions: string | null;
  /** Device-specific composition rules */
  compositionRules: string;
  /** Valid channel range for schema validation */
  channelRange: [number, number];
  /** Whether multi-track composition is supported */
  supportsMultiTrack: boolean;
}

// ─── UI Configuration ──────────────────────────────────────────

export interface DeviceUIConfig {
  showDrumGrid: boolean;
  showPianoRoll: boolean;
  showSoundDesignPanel: boolean;
  showMultiTrackArrangement: boolean;
  engineTabs: Array<{ value: string; label: string }>;
}

// ─── Complete Device Profile ───────────────────────────────────

export interface DeviceProfile {
  id: DeviceId;
  displayName: string;
  architecture: DeviceArchitecture;

  /** USB MIDI name patterns for auto-detection (case-insensitive substring match) */
  usbNames: string[];

  /** Track layout */
  tracks: DeviceTrack[];
  allChannels: number[];
  drumChannels: number[];
  synthChannels: number[];

  /** Sequencer constraints */
  maxPatternsPerTrack: number;
  maxBars: number;
  stepsPerBar: number;
  maxSteps: number;

  /** MIDI behavior */
  programChange: ProgramChangeStrategy;
  sysex: SysExConfig | null;

  /** CC parameters for this device */
  ccParams: CCParameter[];

  /** Sound library */
  sounds: DeviceSoundLibrary;

  /** AI prompt configuration */
  prompts: DevicePromptConfig;

  /** Channels to send All Notes Off to during panic */
  panicChannels: number[];

  /** UI layout hints */
  ui: DeviceUIConfig;
}
