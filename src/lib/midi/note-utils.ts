import { NOTE_NAMES, FLAT_TO_SHARP, SCALES } from "./constants";

/**
 * Convert note name like 'C4', 'F#3', 'Bb5' to MIDI note number.
 * Ported from seqtrak_composer.py lines 111-140.
 */
export function noteNameToMidi(name: string): number {
  name = name.trim();
  if (!name) throw new Error("Empty note name");

  // Handle flats → sharps
  for (const [flat, sharp] of Object.entries(FLAT_TO_SHARP)) {
    if (name.includes(flat)) {
      name = name.replace(flat, sharp);
      break;
    }
  }

  // Parse note and octave
  let notePart: string;
  let octavePart: string;

  if (name.length >= 2 && name[1] === "#") {
    notePart = name.slice(0, 2).toUpperCase();
    octavePart = name.slice(2);
  } else {
    notePart = name[0].toUpperCase();
    octavePart = name.slice(1);
  }

  const noteIndex = NOTE_NAMES.indexOf(notePart as (typeof NOTE_NAMES)[number]);
  if (noteIndex === -1) throw new Error(`Unknown note: ${notePart}`);

  const octave = parseInt(octavePart, 10);
  if (isNaN(octave)) throw new Error(`Invalid octave in '${name}'`);

  return (octave + 1) * 12 + noteIndex;
}

/**
 * Convert MIDI note number to note name like 'C4'.
 * Ported from seqtrak_composer.py lines 143-147.
 */
export function midiToNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const note = NOTE_NAMES[midiNote % 12];
  return `${note}${octave}`;
}

/**
 * Generate all MIDI notes in a scale within the given octave range.
 * Ported from seqtrak_composer.py lines 150-165.
 */
export function getScaleNotes(
  root: string,
  scaleName: string,
  octaveStart = 2,
  octaveEnd = 6,
): number[] {
  const intervals = SCALES[scaleName];
  if (!intervals) throw new Error(`Unknown scale: ${scaleName}`);

  // Normalize root to sharp notation
  let normalizedRoot = root;
  for (const [flat, sharp] of Object.entries(FLAT_TO_SHARP)) {
    if (normalizedRoot.includes(flat)) {
      normalizedRoot = normalizedRoot.replace(flat, sharp);
      break;
    }
  }

  const rootIndex = NOTE_NAMES.indexOf(
    normalizedRoot.toUpperCase() as (typeof NOTE_NAMES)[number],
  );
  if (rootIndex === -1) throw new Error(`Unknown root note: ${root}`);

  const notes = new Set<number>();

  for (let octave = octaveStart; octave <= octaveEnd; octave++) {
    for (const interval of intervals) {
      const midiNote = (octave + 1) * 12 + rootIndex + interval;
      if (midiNote >= 0 && midiNote <= 127) {
        notes.add(midiNote);
      }
    }
  }

  return Array.from(notes).sort((a, b) => a - b);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate step duration in milliseconds given BPM.
 * One step = one 16th note.
 */
export function stepDurationMs(bpm: number): number {
  return (60_000 / bpm) / 4; // quarter note / 4 = 16th note
}
