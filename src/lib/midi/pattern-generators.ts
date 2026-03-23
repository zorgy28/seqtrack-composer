import type {
  Note,
  Pattern,
  Track,
  Project,
  Scene,
  SeqtrackChannel,
  DrumStyle,
} from "./types";
import {
  ALL_CHANNELS,
  STEPS_PER_BAR,
  DEFAULT_BPM,
} from "./constants";

// ─── Factory Functions ──────────────────────────────────────────

export function createNote(overrides: Partial<Note> = {}): Note {
  return {
    pitch: 60,
    velocity: 100,
    step: 0,
    duration: 1,
    probability: 100,
    ...overrides,
  };
}

export function createEmptyPattern(
  name = "Pattern 1",
  bars = 1,
): Pattern {
  return { name, bars, notes: [], swing: 0 };
}

export function createTrack(channel: SeqtrackChannel): Track {
  return {
    channel,
    patterns: [createEmptyPattern()],
    activePattern: 0,
    muted: false,
    volume: 100,
    pan: 64,
  };
}

export function createEmptyProject(name = "Untitled Project"): Project {
  const tracks = {} as Record<SeqtrackChannel, Track>;
  for (const ch of ALL_CHANNELS) {
    tracks[ch] = createTrack(ch);
  }

  return {
    id: crypto.randomUUID(),
    name,
    bpm: DEFAULT_BPM,
    tracks,
    scenes: [],
    scaleRoot: "C",
    scaleName: "chromatic",
    quantize: "1/16",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createScene(name = "Scene 1"): Scene {
  return {
    name,
    patternIndices: {},
    mutes: {},
    repeats: 1,
  };
}

// ─── Pattern Manipulation ───────────────────────────────────────

export function addNoteToPattern(
  pattern: Pattern,
  note: Note,
): Pattern {
  const totalSteps = pattern.bars * STEPS_PER_BAR;
  if (note.step < 0 || note.step >= totalSteps) {
    throw new Error(`Step ${note.step} out of range (0-${totalSteps - 1})`);
  }
  return { ...pattern, notes: [...pattern.notes, note] };
}

export function removeNoteFromPattern(
  pattern: Pattern,
  step: number,
  pitch?: number,
): Pattern {
  return {
    ...pattern,
    notes: pattern.notes.filter(
      (n) => !(n.step === step && (pitch === undefined || n.pitch === pitch)),
    ),
  };
}

export function toggleNoteInPattern(
  pattern: Pattern,
  step: number,
  pitch: number,
  velocity = 100,
): Pattern {
  const existing = pattern.notes.find(
    (n) => n.step === step && n.pitch === pitch,
  );
  if (existing) {
    return removeNoteFromPattern(pattern, step, pitch);
  }
  return addNoteToPattern(pattern, createNote({ pitch, step, velocity }));
}

export function clearPattern(pattern: Pattern): Pattern {
  return { ...pattern, notes: [] };
}

export function getStepGrid(
  pattern: Pattern,
): Map<number, Note[]> {
  const grid = new Map<number, Note[]>();
  for (const note of pattern.notes) {
    const existing = grid.get(note.step) ?? [];
    existing.push(note);
    grid.set(note.step, existing);
  }
  return grid;
}

// ─── Euclidean Rhythm Generator ─────────────────────────────────
// Ported from seqtrak_composer.py lines 591-606

export function generateEuclideanRhythm(
  steps: number,
  pulses: number,
  rotation = 0,
): number[] {
  const effectivePulses = Math.min(pulses, steps);
  if (effectivePulses === 0) return [];

  const pattern: number[] = [];
  let bucket = 0;

  for (let i = 0; i < steps; i++) {
    bucket += effectivePulses;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push((i + rotation) % steps);
    }
  }

  return pattern.sort((a, b) => a - b);
}

// ─── Drum Pattern Generator ─────────────────────────────────────
// Ported from seqtrak_composer.py lines 609-669

export function generateDrumPattern(
  style: DrumStyle,
  bars = 1,
): Record<number, Array<{ step: number; velocity: number }>> {
  const total = bars * STEPS_PER_BAR;
  const patterns: Record<number, Array<{ step: number; velocity: number }>> = {};
  for (let ch = 1; ch <= 7; ch++) patterns[ch] = [];

  function add(ch: number, steps: number[], vel = 100) {
    for (const s of steps) {
      for (let bar = 0; bar < bars; bar++) {
        const step = s + bar * STEPS_PER_BAR;
        if (step < total) {
          patterns[ch].push({ step, velocity: vel });
        }
      }
    }
  }

  switch (style) {
    case "basic_4x4":
      add(1, [0, 4, 8, 12]); // Kick on every beat
      add(2, [4, 12]); // Snare on 2 & 4
      add(4, [0, 2, 4, 6, 8, 10, 12, 14]); // Hat on every 8th
      add(5, [2, 6, 10, 14], 70); // Open hat offbeats
      break;

    case "breakbeat":
      add(1, [0, 6, 10]); // Syncopated kick
      add(2, [4, 12]); // Snare on 2 & 4
      add(4, [0, 2, 4, 6, 8, 10, 12, 14]); // Closed hat
      add(3, [14], 80); // Clap pickup
      break;

    case "trap":
      add(1, [0, 7, 8]); // 808 kick
      add(2, [4, 12]); // Snare
      add(4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 60); // Fast hats
      add(5, [4, 12], 90); // Open hat on snare
      add(3, [4, 12], 85); // Clap with snare
      break;

    case "house":
      add(1, [0, 4, 8, 12]); // Four on the floor
      add(3, [4, 12]); // Clap on 2 & 4
      add(4, [2, 6, 10, 14]); // Offbeat hats
      add(6, [0, 8], 70); // Percussion
      break;

    case "techno":
      add(1, [0, 4, 8, 12]); // Four on the floor
      add(2, [4, 12]); // Snare
      add(4, [0, 2, 4, 6, 8, 10, 12, 14]); // Closed hat
      add(5, [6, 14], 80); // Open hat
      add(6, [3, 7, 11, 15], 60); // Ride/perc
      break;

    case "dnb":
      add(1, [0, 10]); // Kick
      add(2, [4, 12, 14]); // Snare with ghost
      add(4, [0, 2, 4, 6, 8, 10, 12, 14]); // Fast hats
      add(3, [4]); // Clap accent
      break;

    case "hiphop":
      add(1, [0, 5, 8, 13]); // Boom bap kick
      add(2, [4, 12]); // Snare
      add(4, [0, 2, 4, 6, 8, 10, 12, 14]); // Hats
      add(5, [6, 14], 70); // Open hat
      break;
  }

  return patterns;
}

/**
 * Convert drum pattern output to a partial Project tracks structure.
 * Each channel gets notes added to its active pattern.
 */
export function applyDrumPatternToProject(
  project: Project,
  style: DrumStyle,
  bars = 1,
): Project {
  const rawPattern = generateDrumPattern(style, bars);
  const updatedTracks = { ...project.tracks };

  for (const [chStr, hits] of Object.entries(rawPattern)) {
    const ch = parseInt(chStr) as SeqtrackChannel;
    if (hits.length === 0) continue;

    const track = { ...updatedTracks[ch] };
    const patterns = [...track.patterns];
    const pattern = {
      ...patterns[track.activePattern],
      bars,
      notes: hits.map((h) =>
        createNote({ pitch: 60, step: h.step, velocity: h.velocity }),
      ),
    };
    patterns[track.activePattern] = pattern;
    track.patterns = patterns;
    updatedTracks[ch] = track;
  }

  return { ...project, tracks: updatedTracks, updatedAt: new Date().toISOString() };
}
