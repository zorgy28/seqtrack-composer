import type { ImportResult, ImportedNote } from "./types";
import { INSTRUMENTS } from "./types";
import { noteNameToMidi } from "@/lib/midi/note-utils";

// ---- Duration fractions -> step counts ----------------------------------

const DURATION_MAP: Record<string, number> = {
  "1": 16, // whole note = 16 steps
  "2": 8, // half note = 8 steps
  "4": 4, // quarter note = 4 steps
  "8": 2, // eighth note = 2 steps
  "16": 1, // sixteenth note = 1 step
  "32": 0.5, // 32nd note (rounds to 1 step minimum)
};

// ---- Helpers ------------------------------------------------------------

/**
 * Try to match a note token like "C4", "F#3/8", "Bb5/4".
 * Returns pitch + duration in steps, or null if not a valid note.
 */
function parseNoteToken(
  token: string,
): { pitch: number; durationSteps: number } | null {
  // Split on "/" for duration suffix: "C4/8" -> ["C4", "8"]
  const parts = token.split("/");
  const notePart = parts[0];
  const durationPart = parts[1];

  // Attempt to parse the note name
  let pitch: number;
  try {
    pitch = noteNameToMidi(notePart);
  } catch {
    return null;
  }

  // Resolve duration
  let durationSteps = 1; // default: 1 sixteenth note
  if (durationPart && DURATION_MAP[durationPart] !== undefined) {
    durationSteps = Math.max(1, Math.round(DURATION_MAP[durationPart]));
  }

  return { pitch, durationSteps };
}

/**
 * Auto-detect an instrument name from a set of MIDI pitches.
 * Returns the best matching instrument name, or undefined.
 */
function detectInstrument(
  pitches: number[],
): { name: string; channel: number } | undefined {
  if (pitches.length === 0) return undefined;

  const minPitch = Math.min(...pitches);
  const maxPitch = Math.max(...pitches);

  // Score each instrument by how well the pitch range fits
  let bestMatch: { name: string; channel: number; score: number } | undefined;

  for (const inst of INSTRUMENTS) {
    // Check if all pitches fall within the instrument range
    if (minPitch >= inst.midiMin && maxPitch <= inst.midiMax) {
      // Tighter range = better match
      const rangeSize = inst.midiMax - inst.midiMin;
      const score = 1 / (rangeSize + 1); // smaller range = higher score
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { name: inst.name, channel: inst.defaultChannel, score };
      }
    }
  }

  if (bestMatch) {
    return { name: bestMatch.name, channel: bestMatch.channel };
  }

  return undefined;
}

/**
 * Look up an instrument by name (case-insensitive) and return its
 * default SEQTRAK channel.
 */
function channelForInstrument(name: string): number | undefined {
  const lower = name.toLowerCase();
  const match = INSTRUMENTS.find((i) => i.name.toLowerCase() === lower);
  return match?.defaultChannel;
}

// ---- Public API ---------------------------------------------------------

/**
 * Parse text notation for any melodic instrument into an ImportResult.
 *
 * Three supported formats:
 *
 * **Format 1** — Simple note names:
 *   `C4 D4 E4 F4 | G4 A4 B4 C5`
 *   Each note = 1 step, `|` = barline, spaces separate notes.
 *   Supports sharps/flats: C#4, Bb3, F#5.
 *
 * **Format 2** — Notes with duration:
 *   `C4/4 D4/8 E4/8 F4/2`
 *   /4 = quarter (4 steps), /8 = eighth (2 steps), /16 = 1 step,
 *   /2 = half (8 steps), /1 = whole (16 steps).
 *
 * **Format 3** — Rests:
 *   `C4 - E4 - G4` or `C4 r E4 r G4`
 *   `-` or `r` = rest (skip 1 step).
 *
 * @param text - The notation text to parse
 * @param instrument - Optional instrument name for channel assignment
 * @param targetChannel - Optional explicit SEQTRAK channel (1-11)
 */
export function parseNotation(
  text: string,
  instrument?: string,
  targetChannel?: number,
): ImportResult {
  const bpm = 120;
  const secondsPerStep = 60 / bpm / 4; // 1 sixteenth note

  const notes: ImportedNote[] = [];
  const pitches: number[] = [];

  // Tokenize: split on whitespace, treating | as a token too
  const tokens = text
    .split(/\s+/)
    .filter((t) => t.length > 0);

  let currentStep = 0;

  for (const token of tokens) {
    // Barline — just skip (position is already tracked by step)
    if (token === "|") {
      continue;
    }

    // Rest
    if (token === "-" || token.toLowerCase() === "r") {
      currentStep += 1;
      continue;
    }

    // Try to parse as a note (possibly with duration suffix)
    const parsed = parseNoteToken(token);
    if (parsed) {
      pitches.push(parsed.pitch);
      notes.push({
        pitch: parsed.pitch,
        velocity: 100,
        time: currentStep * secondsPerStep,
        duration: parsed.durationSteps * secondsPerStep,
      });
      currentStep += parsed.durationSteps;
    }
    // If token can't be parsed, skip it silently
  }

  // Determine target channel
  let channel: number | undefined = targetChannel;

  if (channel === undefined && instrument) {
    channel = channelForInstrument(instrument);
  }

  if (channel === undefined) {
    // Auto-detect from pitch range
    const detected = detectInstrument(pitches);
    channel = detected?.channel ?? 9; // default to Synth 2
  }

  // Assign channel to all notes
  for (const note of notes) {
    note.channel = channel;
  }

  const channels = notes.length > 0 ? [channel] : [];

  return {
    notes,
    bpm,
    channels,
  };
}
