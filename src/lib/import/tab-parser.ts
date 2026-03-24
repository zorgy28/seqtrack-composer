import type { ImportResult, ImportedNote } from "./types";

// ---- String tunings (MIDI note for open string) -------------------------

const BASS_4_TUNING = [43, 38, 33, 28]; // G2, D2, A1, E1 (high to low)
const BASS_5_TUNING = [43, 38, 33, 28, 23]; // G2, D2, A1, E1, B0
const GUITAR_TUNING = [64, 59, 55, 50, 45, 40]; // e4, B3, G3, D3, A2, E2

// ---- Internal helpers ---------------------------------------------------

interface TabLine {
  tuning: number; // open string MIDI pitch
  positions: string; // the tab characters after the separator
}

/**
 * Parse a single tab line like "G|--3--5--7--|" into its string label
 * and position data. Returns null if the line is not a valid tab line.
 */
function parseTabLine(line: string): { label: string; data: string } | null {
  // Match lines like  "G|---"  "e|---"  "A|---"  or with colon separator
  const match = line.trim().match(/^([A-Ga-g][#b]?)\s*[|:]\s*(.*)/);
  if (!match) return null;
  return { label: match[1], data: match[2] };
}

/**
 * Resolve a string label to its open-string MIDI note, given a tuning array.
 * Guitar/bass tabs label strings from high to low; we match by position.
 */
function resolveStringTuning(
  labels: string[],
  tuning: number[],
): number[] | null {
  if (labels.length !== tuning.length) return null;
  // Just use the tuning in order (high string first = top line first)
  return tuning;
}

/**
 * Extract notes from a set of tab lines with known tunings.
 */
function extractNotes(
  lines: TabLine[],
  bpm: number,
  defaultChannel: number,
): ImportedNote[] {
  const secondsPerStep = 60 / bpm / 4; // 1 sixteenth note
  const notes: ImportedNote[] = [];

  for (const { tuning, positions } of lines) {
    // Strip barlines
    const cleaned = positions.replace(/[|]/g, "");
    let stepIndex = 0;

    let i = 0;
    while (i < cleaned.length) {
      const ch = cleaned[i];

      if (ch === "-" || ch === " " || ch === ".") {
        // Rest / sustain
        stepIndex++;
        i++;
      } else if (ch === "x" || ch === "X") {
        // Muted note — use low velocity, same pitch
        notes.push({
          pitch: tuning, // open string pitch for muted hit
          velocity: 40,
          time: stepIndex * secondsPerStep,
          duration: secondsPerStep,
          channel: defaultChannel,
        });
        stepIndex++;
        i++;
      } else if (ch === "h" || ch === "p" || ch === "/" || ch === "\\") {
        // Hammer-on, pull-off, slide — skip as articulation marker
        i++;
      } else if (/\d/.test(ch)) {
        // Fret number — could be 1 or 2 digits
        let fretStr = ch;
        if (i + 1 < cleaned.length && /\d/.test(cleaned[i + 1])) {
          fretStr += cleaned[i + 1];
          i++;
        }
        const fret = parseInt(fretStr, 10);
        const pitch = tuning + fret;

        if (pitch >= 0 && pitch <= 127) {
          notes.push({
            pitch,
            velocity: 100,
            time: stepIndex * secondsPerStep,
            duration: secondsPerStep,
            channel: defaultChannel,
          });
        }
        stepIndex++;
        i++;
      } else {
        // Unknown character — treat as rest
        stepIndex++;
        i++;
      }
    }
  }

  return notes;
}

/**
 * Auto-detect tuning from the number of tab lines and their labels.
 */
function detectTuning(labels: string[]): number[] | null {
  const count = labels.length;

  if (count === 4) {
    return resolveStringTuning(labels, BASS_4_TUNING);
  }
  if (count === 5) {
    return resolveStringTuning(labels, BASS_5_TUNING);
  }
  if (count === 6) {
    return resolveStringTuning(labels, GUITAR_TUNING);
  }

  return null;
}

// ---- Shared parser logic ------------------------------------------------

function parseTab(
  text: string,
  forcedTuning: number[] | null,
  defaultChannel: number,
): ImportResult {
  const bpm = 120;
  const rawLines = text.split("\n");

  // Collect consecutive tab lines into groups
  const parsed: Array<{ label: string; data: string }> = [];
  for (const line of rawLines) {
    const result = parseTabLine(line);
    if (result) {
      parsed.push(result);
    }
  }

  if (parsed.length === 0) {
    return { notes: [], channels: [] };
  }

  // Determine tuning
  const labels = parsed.map((p) => p.label);
  const tuning = forcedTuning ?? detectTuning(labels);

  if (!tuning || tuning.length !== parsed.length) {
    // Fallback: use detected tuning or empty result
    return { notes: [], channels: [] };
  }

  const tabLines: TabLine[] = parsed.map((p, i) => ({
    tuning: tuning[i],
    positions: p.data,
  }));

  const notes = extractNotes(tabLines, bpm, defaultChannel);
  const channels = notes.length > 0 ? [defaultChannel] : [];

  return {
    notes,
    bpm,
    channels,
  };
}

// ---- Public API ---------------------------------------------------------

/**
 * Parse ASCII bass tablature into an ImportResult.
 *
 * Supports 4-string (standard) and 5-string bass tunings.
 * Default target channel is 8 (Synth 1 — suitable for bass sounds).
 *
 * String tunings (standard, high to low):
 *   4-string: G2(43) D2(38) A1(33) E1(28)
 *   5-string: G2(43) D2(38) A1(33) E1(28) B0(23)
 *
 * MIDI pitch = openStringMidi + fretNumber.
 *
 * Special characters:
 *   h = hammer-on, p = pull-off (articulation, skipped)
 *   / \ = slides (articulation, skipped)
 *   x = muted note (low velocity)
 *   - = rest/sustain
 */
export function parseBassTab(
  text: string,
  targetChannel: number = 8,
): ImportResult {
  // Try to detect string count from the text
  const rawLines = text.split("\n");
  const tabLineCount = rawLines.filter((l) => parseTabLine(l.trim()) !== null).length;

  let tuning: number[];
  if (tabLineCount === 5) {
    tuning = BASS_5_TUNING;
  } else {
    tuning = BASS_4_TUNING;
  }

  return parseTab(text, tuning, targetChannel);
}

/**
 * Parse ASCII guitar tablature into an ImportResult.
 *
 * Standard 6-string tuning (high to low): e4(64) B3(59) G3(55) D3(50) A2(45) E2(40)
 *
 * Default target channel is 9 (Synth 2).
 */
export function parseGuitarTab(
  text: string,
  targetChannel: number = 9,
): ImportResult {
  return parseTab(text, GUITAR_TUNING, targetChannel);
}
