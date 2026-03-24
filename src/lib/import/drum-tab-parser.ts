import type { ImportResult, ImportedNote } from "./types";

// ---- Instrument abbreviation -> SEQTRAK channel mapping -----------------

const DRUM_LABEL_MAP: Record<string, number> = {
  // Kick
  bd: 1, k: 1, b: 1, kick: 1, bass: 1,
  // Snare
  sd: 1, s: 2, snare: 2, sn: 2,
  // Clap
  cp: 3, cl: 3, clap: 3,
  // Closed Hi-Hat
  hh: 4, ch: 4, "closed hat": 4, "hi-hat": 4, hihat: 4, hat: 4,
  // Open Hi-Hat
  oh: 5, "open hat": 5, "open hi-hat": 5,
  // Ride / Perc1
  rd: 6, rc: 6, ri: 6, ride: 6,
  sh: 6, shaker: 6, cb: 6, cowbell: 6, tm: 6, tambourine: 6, tamb: 6,
  // Crash / Perc2
  cr: 7, cc: 7, crash: 7,
  t1: 7, t2: 7, ht: 7, lt: 7, mt: 7, tom: 7, toms: 7,
};

// Fix the "sd" typo above — sd should map to Snare (2)
DRUM_LABEL_MAP["sd"] = 2;

// ---- Symbol -> velocity mapping -----------------------------------------

function symbolVelocity(ch: string): number | null {
  switch (ch) {
    case "o":
    case "x":
      return 100;
    case "O":
    case "X":
      return 127;
    case "g":
      return 50;
    case "f":
      return 110;
    case "-":
    case " ":
    case ".":
      return null; // no hit
    default:
      return null;
  }
}

// ---- Public API ---------------------------------------------------------

/**
 * Parse ASCII drum tab notation into an ImportResult.
 *
 * Recognized formats:
 *   BD|o---o---|o---o---|
 *   K |o---o---|
 *   Kick|o---o---|
 *
 * Symbols:
 *   o/x = velocity 100, O/X = 127, g = 50 (ghost), f = 110 (forte)
 *   - / space / . = no hit
 *   | = barline (stripped before parsing)
 *
 * BPM defaults to 120 (1 step = 1/32 second at 120 BPM).
 */
export function parseDrumTab(text: string): ImportResult {
  const bpm = 120;
  const secondsPerStep = 60 / bpm / 4; // 1 sixteenth note

  const notes: ImportedNote[] = [];
  const channels = new Set<number>();

  const lines = text.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Try to split on the first | or : to get label and tab data
    const separatorMatch = line.match(/^([^|:]+)[|:]\s*(.*)/);
    if (!separatorMatch) continue;

    const label = separatorMatch[1].trim().toLowerCase();
    const tabData = separatorMatch[2];

    // Resolve label to SEQTRAK channel
    const channel = DRUM_LABEL_MAP[label];
    if (channel === undefined) continue;

    // Strip barlines from tab data, keeping only hit/rest characters
    const steps = tabData.replace(/[|]/g, "");

    let stepIndex = 0;
    for (const ch of steps) {
      const vel = symbolVelocity(ch);
      if (vel !== null) {
        notes.push({
          pitch: 60, // drums always use pitch 60
          velocity: vel,
          time: stepIndex * secondsPerStep,
          duration: secondsPerStep,
          channel,
        });
        channels.add(channel);
      }
      stepIndex++;
    }
  }

  return {
    notes,
    bpm,
    channels: Array.from(channels).sort((a, b) => a - b),
  };
}
