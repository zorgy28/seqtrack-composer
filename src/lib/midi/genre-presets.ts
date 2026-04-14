import type { FullStyle } from "./types";

// ─── Types ─────────────────────────────────────────────────────

interface DrumHit {
  step: number;
  vel: number;
}

interface MelodicNote {
  step: number;
  pitch: number;
  vel: number;
  dur: number;
}

export interface GenrePresetConfig {
  bpm: number;
  swing: number;
  bars: number;
  drums: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, DrumHit[]>>;
  bass: { notes: MelodicNote[]; presetId: number };   // Ch 8 — AWM2
  melody: { notes: MelodicNote[]; presetId: number };  // Ch 9 — AWM2
  pad: { notes: MelodicNote[]; presetId: number };     // Ch 10 — DX engine
}

// ─── Preset IDs (verified against sound-data-complete.ts) ──────
// AWM2 (Ch 8, 9): Sub Bass=860, Finger Bass=863, Slap Bass=864, Moog Bass=865
//   E.Piano 1=1135, Jazzy 1=1216, Rock Organ=1217, Classical Guitar=1643
//   Electric Clean=1644, Warm Pad=1290, String Ensemble=1441, Trumpet=1517
//   Vibraphone=1775
// DX (Ch 10): FM Lo-Fi Bass=1933, FM Dark Bass=1934, Legend EP=1964
//   FM Glass Dream=1977, FM Strings Pad=1978, FM 5th Atmosphere=1976
//   Buzz Siren=2031, Crystal EP=1966

// ─── Genre Preset Definitions ──────────────────────────────────

export const GENRE_PRESETS: Record<FullStyle, GenrePresetConfig> = {

  // ═══════════════════════════════════════════════════════════════
  // EXISTING DRUM STYLES — now with bass, melody, and pad
  // ═══════════════════════════════════════════════════════════════

  basic_4x4: {
    bpm: 120, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 100 }, { step: 4, vel: 100 }, { step: 8, vel: 100 }, { step: 12, vel: 100 }],
      2: [{ step: 4, vel: 100 }, { step: 12, vel: 100 }],
      4: [{ step: 0, vel: 90 }, { step: 2, vel: 90 }, { step: 4, vel: 90 }, { step: 6, vel: 90 },
           { step: 8, vel: 90 }, { step: 10, vel: 90 }, { step: 12, vel: 90 }, { step: 14, vel: 90 }],
      5: [{ step: 2, vel: 70 }, { step: 6, vel: 70 }, { step: 10, vel: 70 }, { step: 14, vel: 70 }],
    },
    bass: {
      notes: [
        { step: 0, pitch: 36, vel: 100, dur: 2 }, { step: 4, pitch: 36, vel: 90, dur: 2 },
        { step: 8, pitch: 36, vel: 100, dur: 2 }, { step: 12, pitch: 43, vel: 90, dur: 2 },
      ],
      presetId: 865, // Moog Bass
    },
    melody: {
      notes: [
        { step: 0, pitch: 60, vel: 80, dur: 2 }, { step: 4, pitch: 64, vel: 75, dur: 2 },
        { step: 8, pitch: 67, vel: 80, dur: 2 }, { step: 12, pitch: 64, vel: 75, dur: 2 },
      ],
      presetId: 1644, // Electric Clean
    },
    pad: {
      notes: [
        { step: 0, pitch: 60, vel: 50, dur: 16 }, { step: 0, pitch: 64, vel: 50, dur: 16 },
        { step: 0, pitch: 67, vel: 50, dur: 16 },
      ],
      presetId: 1978, // FM Strings Pad
    },
  },

  breakbeat: {
    bpm: 130, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 110 }, { step: 6, vel: 90 }, { step: 10, vel: 100 }],
      2: [{ step: 4, vel: 100 }, { step: 12, vel: 100 }],
      4: [{ step: 0, vel: 90 }, { step: 2, vel: 90 }, { step: 4, vel: 90 }, { step: 6, vel: 90 },
           { step: 8, vel: 90 }, { step: 10, vel: 90 }, { step: 12, vel: 90 }, { step: 14, vel: 90 }],
      3: [{ step: 14, vel: 80 }],
    },
    bass: {
      notes: [
        { step: 0, pitch: 36, vel: 100, dur: 3 }, { step: 6, pitch: 39, vel: 90, dur: 2 },
        { step: 10, pitch: 41, vel: 95, dur: 2 }, { step: 14, pitch: 43, vel: 80, dur: 2 },
      ],
      presetId: 865, // Moog Bass
    },
    melody: {
      notes: [
        { step: 0, pitch: 67, vel: 80, dur: 2 }, { step: 4, pitch: 72, vel: 75, dur: 1 },
        { step: 6, pitch: 70, vel: 70, dur: 2 }, { step: 12, pitch: 65, vel: 80, dur: 3 },
      ],
      presetId: 1644, // Electric Clean
    },
    pad: {
      notes: [
        { step: 0, pitch: 60, vel: 45, dur: 8 }, { step: 0, pitch: 63, vel: 45, dur: 8 },
        { step: 0, pitch: 67, vel: 45, dur: 8 },
        { step: 8, pitch: 60, vel: 45, dur: 8 }, { step: 8, pitch: 65, vel: 45, dur: 8 },
        { step: 8, pitch: 67, vel: 45, dur: 8 },
      ],
      presetId: 1976, // FM 5th Atmosphere
    },
  },

  trap: {
    bpm: 140, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 120 }, { step: 7, vel: 100 }, { step: 8, vel: 110 }],
      2: [{ step: 4, vel: 100 }, { step: 12, vel: 100 }],
      4: [{ step: 0, vel: 60 }, { step: 1, vel: 55 }, { step: 2, vel: 60 }, { step: 3, vel: 55 },
           { step: 4, vel: 60 }, { step: 5, vel: 55 }, { step: 6, vel: 60 }, { step: 7, vel: 55 },
           { step: 8, vel: 60 }, { step: 9, vel: 55 }, { step: 10, vel: 60 }, { step: 11, vel: 55 },
           { step: 12, vel: 60 }, { step: 13, vel: 55 }, { step: 14, vel: 60 }, { step: 15, vel: 55 }],
      5: [{ step: 4, vel: 90 }, { step: 12, vel: 90 }],
      3: [{ step: 4, vel: 85 }, { step: 12, vel: 85 }],
    },
    bass: {
      notes: [
        { step: 0, pitch: 36, vel: 120, dur: 4 }, { step: 7, pitch: 36, vel: 100, dur: 1 },
        { step: 8, pitch: 36, vel: 110, dur: 4 },
      ],
      presetId: 860, // Sub Bass — deep 808
    },
    melody: {
      notes: [
        { step: 0, pitch: 72, vel: 70, dur: 2 }, { step: 4, pitch: 70, vel: 65, dur: 2 },
        { step: 8, pitch: 67, vel: 75, dur: 2 }, { step: 12, pitch: 65, vel: 60, dur: 4 },
      ],
      presetId: 1135, // E.Piano 1
    },
    pad: {
      notes: [
        { step: 0, pitch: 60, vel: 40, dur: 16 }, { step: 0, pitch: 63, vel: 40, dur: 16 },
        { step: 0, pitch: 67, vel: 40, dur: 16 },
      ],
      presetId: 1977, // FM Glass Dream
    },
  },

  house: {
    bpm: 124, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 110 }, { step: 4, vel: 110 }, { step: 8, vel: 110 }, { step: 12, vel: 110 }],
      3: [{ step: 4, vel: 100 }, { step: 12, vel: 100 }],
      4: [{ step: 2, vel: 90 }, { step: 6, vel: 90 }, { step: 10, vel: 90 }, { step: 14, vel: 90 }],
      6: [{ step: 0, vel: 70 }, { step: 8, vel: 70 }],
    },
    bass: {
      notes: [
        { step: 0, pitch: 36, vel: 100, dur: 1 }, { step: 2, pitch: 48, vel: 80, dur: 1 },
        { step: 4, pitch: 36, vel: 100, dur: 1 }, { step: 6, pitch: 48, vel: 80, dur: 1 },
        { step: 8, pitch: 36, vel: 100, dur: 1 }, { step: 10, pitch: 48, vel: 80, dur: 1 },
        { step: 12, pitch: 36, vel: 100, dur: 1 }, { step: 14, pitch: 48, vel: 80, dur: 1 },
      ],
      presetId: 865, // Moog Bass
    },
    melody: {
      notes: [
        { step: 2, pitch: 72, vel: 75, dur: 1 }, { step: 6, pitch: 74, vel: 70, dur: 1 },
        { step: 10, pitch: 72, vel: 75, dur: 1 }, { step: 14, pitch: 67, vel: 70, dur: 1 },
      ],
      presetId: 1135, // E.Piano 1
    },
    pad: {
      notes: [
        { step: 0, pitch: 60, vel: 50, dur: 16 }, { step: 0, pitch: 64, vel: 50, dur: 16 },
        { step: 0, pitch: 67, vel: 50, dur: 16 },
      ],
      presetId: 1978, // FM Strings Pad
    },
  },

  techno: {
    bpm: 130, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 120 }, { step: 4, vel: 120 }, { step: 8, vel: 120 }, { step: 12, vel: 120 }],
      2: [{ step: 4, vel: 100 }, { step: 12, vel: 100 }],
      4: [{ step: 0, vel: 90 }, { step: 2, vel: 90 }, { step: 4, vel: 90 }, { step: 6, vel: 90 },
           { step: 8, vel: 90 }, { step: 10, vel: 90 }, { step: 12, vel: 90 }, { step: 14, vel: 90 }],
      5: [{ step: 6, vel: 80 }, { step: 14, vel: 80 }],
      6: [{ step: 3, vel: 60 }, { step: 7, vel: 60 }, { step: 11, vel: 60 }, { step: 15, vel: 60 }],
    },
    bass: {
      notes: [
        { step: 0, pitch: 36, vel: 110, dur: 2 }, { step: 4, pitch: 36, vel: 100, dur: 2 },
        { step: 8, pitch: 36, vel: 110, dur: 2 }, { step: 12, pitch: 36, vel: 100, dur: 2 },
      ],
      presetId: 860, // Sub Bass
    },
    melody: {
      notes: [
        { step: 0, pitch: 60, vel: 70, dur: 1 }, { step: 3, pitch: 63, vel: 65, dur: 1 },
        { step: 6, pitch: 60, vel: 70, dur: 1 }, { step: 8, pitch: 67, vel: 75, dur: 1 },
        { step: 11, pitch: 63, vel: 65, dur: 1 }, { step: 14, pitch: 60, vel: 70, dur: 1 },
      ],
      presetId: 1644, // Electric Clean — sterile, metallic
    },
    pad: {
      notes: [
        { step: 0, pitch: 60, vel: 40, dur: 16 }, { step: 0, pitch: 63, vel: 40, dur: 16 },
      ],
      presetId: 1976, // FM 5th Atmosphere
    },
  },

  dnb: {
    bpm: 174, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 120 }, { step: 10, vel: 100 }],
      2: [{ step: 4, vel: 110 }, { step: 12, vel: 110 }, { step: 14, vel: 70 }],
      4: [{ step: 0, vel: 90 }, { step: 2, vel: 90 }, { step: 4, vel: 90 }, { step: 6, vel: 90 },
           { step: 8, vel: 90 }, { step: 10, vel: 90 }, { step: 12, vel: 90 }, { step: 14, vel: 90 }],
      3: [{ step: 4, vel: 90 }],
    },
    bass: {
      notes: [
        { step: 0, pitch: 36, vel: 120, dur: 4 }, { step: 6, pitch: 36, vel: 90, dur: 2 },
        { step: 10, pitch: 43, vel: 100, dur: 2 }, { step: 14, pitch: 41, vel: 80, dur: 2 },
      ],
      presetId: 860, // Sub Bass — deep reese
    },
    melody: {
      notes: [
        { step: 0, pitch: 72, vel: 70, dur: 3 }, { step: 8, pitch: 67, vel: 65, dur: 4 },
      ],
      presetId: 1135, // E.Piano 1
    },
    pad: {
      notes: [
        { step: 0, pitch: 60, vel: 45, dur: 16 }, { step: 0, pitch: 63, vel: 45, dur: 16 },
        { step: 0, pitch: 67, vel: 45, dur: 16 },
      ],
      presetId: 1976, // FM 5th Atmosphere
    },
  },

  hiphop: {
    bpm: 90, swing: 10, bars: 1,
    drums: {
      1: [{ step: 0, vel: 110 }, { step: 5, vel: 90 }, { step: 8, vel: 100 }, { step: 13, vel: 85 }],
      2: [{ step: 4, vel: 100 }, { step: 12, vel: 100 }],
      4: [{ step: 0, vel: 90 }, { step: 2, vel: 90 }, { step: 4, vel: 90 }, { step: 6, vel: 90 },
           { step: 8, vel: 90 }, { step: 10, vel: 90 }, { step: 12, vel: 90 }, { step: 14, vel: 90 }],
      5: [{ step: 6, vel: 70 }, { step: 14, vel: 70 }],
    },
    bass: {
      notes: [
        { step: 0, pitch: 36, vel: 100, dur: 3 }, { step: 5, pitch: 36, vel: 85, dur: 2 },
        { step: 8, pitch: 41, vel: 95, dur: 3 }, { step: 13, pitch: 43, vel: 80, dur: 2 },
      ],
      presetId: 860, // Sub Bass
    },
    melody: {
      notes: [
        { step: 0, pitch: 67, vel: 75, dur: 2 }, { step: 4, pitch: 65, vel: 70, dur: 2 },
        { step: 8, pitch: 63, vel: 80, dur: 2 }, { step: 12, pitch: 60, vel: 70, dur: 4 },
      ],
      presetId: 1135, // E.Piano 1
    },
    pad: {
      notes: [
        { step: 0, pitch: 60, vel: 40, dur: 16 }, { step: 0, pitch: 63, vel: 40, dur: 16 },
        { step: 0, pitch: 67, vel: 40, dur: 16 },
      ],
      presetId: 1977, // FM Glass Dream
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // NEW GENRES
  // ═══════════════════════════════════════════════════════════════

  // ─── Blues Shuffle ─────────────────────────────────────────────
  // Triplet shuffle feel, walking bass in Bb, pentatonic melody
  blues_shuffle: {
    bpm: 75, swing: 30, bars: 2,
    drums: {
      1: [{ step: 0, vel: 100 }, { step: 8, vel: 90 }],  // Kick on 1 & 3
      2: [{ step: 4, vel: 90 }, { step: 12, vel: 95 }],   // Snare on 2 & 4
      4: [{ step: 0, vel: 80 }, { step: 3, vel: 60 }, { step: 4, vel: 80 }, { step: 7, vel: 60 },
           { step: 8, vel: 80 }, { step: 11, vel: 60 }, { step: 12, vel: 80 }, { step: 15, vel: 60 }], // Shuffle hats
      6: [{ step: 0, vel: 50 }, { step: 4, vel: 50 }, { step: 8, vel: 50 }, { step: 12, vel: 50 }], // Light ride/tambourine
    },
    bass: {
      // Walking bass in Bb: Bb2-D3-F3-G3 (quarter notes), bar 2: Ab3-G3-F3-E3 approach
      notes: [
        { step: 0, pitch: 46, vel: 100, dur: 4 },  // Bb2
        { step: 4, pitch: 50, vel: 90, dur: 4 },   // D3
        { step: 8, pitch: 53, vel: 95, dur: 4 },   // F3
        { step: 12, pitch: 55, vel: 85, dur: 4 },  // G3
        // Bar 2 — chromatic approach
        { step: 16, pitch: 56, vel: 90, dur: 4 },  // Ab3
        { step: 20, pitch: 55, vel: 85, dur: 4 },  // G3
        { step: 24, pitch: 53, vel: 95, dur: 4 },  // F3
        { step: 28, pitch: 52, vel: 80, dur: 4 },  // E3 (chromatic approach to Eb)
      ],
      presetId: 863, // Finger Bass
    },
    melody: {
      // Bb pentatonic licks: Bb4-Db5-Eb5-F5-Ab5
      notes: [
        { step: 0, pitch: 70, vel: 80, dur: 3 },   // Bb4
        { step: 4, pitch: 73, vel: 75, dur: 2 },   // Db5
        { step: 8, pitch: 75, vel: 85, dur: 3 },   // Eb5
        { step: 12, pitch: 73, vel: 70, dur: 4 },  // Db5 — held
        // Bar 2 — descending response
        { step: 16, pitch: 77, vel: 80, dur: 2 },  // F5
        { step: 20, pitch: 75, vel: 75, dur: 2 },  // Eb5
        { step: 24, pitch: 73, vel: 70, dur: 3 },  // Db5
        { step: 28, pitch: 70, vel: 85, dur: 4 },  // Bb4 — resolve
      ],
      presetId: 1643, // Classical Guitar — clean blues tone
    },
    pad: {
      // E.Piano comp — Bb7 chord (Bb-D-F-Ab)
      notes: [
        { step: 0, pitch: 58, vel: 55, dur: 16 },  // Bb3
        { step: 0, pitch: 62, vel: 55, dur: 16 },  // D4
        { step: 0, pitch: 65, vel: 55, dur: 16 },  // F4
        { step: 0, pitch: 68, vel: 50, dur: 16 },  // Ab4
        // Bar 2 — Eb7
        { step: 16, pitch: 63, vel: 55, dur: 16 }, // Eb4
        { step: 16, pitch: 67, vel: 55, dur: 16 }, // G4
        { step: 16, pitch: 70, vel: 55, dur: 16 }, // Bb4
        { step: 16, pitch: 73, vel: 50, dur: 16 }, // Db5
      ],
      presetId: 1964, // Legend EP — classic blues keys
    },
  },

  // ─── Funk ──────────────────────────────────────────────────────
  // Syncopated 16th feel, ghost snares, slap bass, clavinet
  funk: {
    bpm: 110, swing: 5, bars: 1,
    drums: {
      1: [{ step: 0, vel: 110 }, { step: 3, vel: 80 }, { step: 7, vel: 90 }, { step: 9, vel: 85 }], // Syncopated kick
      2: [{ step: 4, vel: 100 }, { step: 12, vel: 100 },
           { step: 2, vel: 40 }, { step: 6, vel: 35 }, { step: 10, vel: 40 }, { step: 14, vel: 35 }], // Ghost notes
      4: [{ step: 0, vel: 90 }, { step: 1, vel: 50 }, { step: 2, vel: 90 }, { step: 3, vel: 50 },
           { step: 4, vel: 90 }, { step: 5, vel: 50 }, { step: 6, vel: 90 }, { step: 7, vel: 50 },
           { step: 8, vel: 90 }, { step: 9, vel: 50 }, { step: 10, vel: 90 }, { step: 11, vel: 50 },
           { step: 12, vel: 90 }, { step: 13, vel: 50 }, { step: 14, vel: 90 }, { step: 15, vel: 50 }], // Tight 16th hats
      3: [{ step: 4, vel: 80 }, { step: 12, vel: 80 }], // Clap accent
    },
    bass: {
      // Slap bass — octave jumps, syncopated
      notes: [
        { step: 0, pitch: 36, vel: 110, dur: 1 },  // E2 slap
        { step: 1, pitch: 48, vel: 80, dur: 1 },   // E3 pop
        { step: 3, pitch: 36, vel: 100, dur: 1 },  // E2
        { step: 5, pitch: 48, vel: 85, dur: 1 },   // E3 pop
        { step: 7, pitch: 41, vel: 100, dur: 1 },  // A2
        { step: 9, pitch: 53, vel: 80, dur: 1 },   // A3 pop
        { step: 11, pitch: 43, vel: 90, dur: 1 },  // B2
        { step: 14, pitch: 36, vel: 100, dur: 2 }, // E2 — resolve
      ],
      presetId: 864, // Slap Bass
    },
    melody: {
      // Clavinet riff — rhythmic and percussive
      notes: [
        { step: 0, pitch: 64, vel: 90, dur: 1 },   // E4
        { step: 2, pitch: 67, vel: 80, dur: 1 },   // G4
        { step: 3, pitch: 64, vel: 70, dur: 1 },   // E4
        { step: 6, pitch: 69, vel: 85, dur: 1 },   // A4
        { step: 7, pitch: 67, vel: 75, dur: 1 },   // G4
        { step: 10, pitch: 71, vel: 80, dur: 1 },  // B4
        { step: 12, pitch: 72, vel: 90, dur: 2 },  // C5
        { step: 15, pitch: 69, vel: 70, dur: 1 },  // A4
      ],
      presetId: 1135, // E.Piano 1 — clavinet-style
    },
    pad: {
      // Brass stab on the "and" of 1
      notes: [
        { step: 2, pitch: 64, vel: 80, dur: 1 }, // E4
        { step: 2, pitch: 67, vel: 80, dur: 1 }, // G4
        { step: 2, pitch: 71, vel: 80, dur: 1 }, // B4
        { step: 10, pitch: 64, vel: 75, dur: 1 },
        { step: 10, pitch: 67, vel: 75, dur: 1 },
        { step: 10, pitch: 71, vel: 75, dur: 1 },
      ],
      presetId: 1966, // Crystal EP — bright stab
    },
  },

  // ─── Reggae ────────────────────────────────────────────────────
  // ONE-DROP: kick ONLY on beat 3, offbeat everything, dub bass
  reggae: {
    bpm: 80, swing: 5, bars: 1,
    drums: {
      1: [{ step: 8, vel: 100 }],  // ONE-DROP — kick on beat 3 only
      2: [{ step: 8, vel: 90 }],   // Cross-stick on beat 3 with kick
      4: [{ step: 2, vel: 75 }, { step: 6, vel: 75 }, { step: 10, vel: 75 }, { step: 14, vel: 75 }], // Offbeat hats
      6: [{ step: 0, vel: 60 }, { step: 4, vel: 60 }, { step: 8, vel: 60 }, { step: 12, vel: 60 }], // Shaker quarters
    },
    bass: {
      // Dub bass — root + 5th, heavy and round
      notes: [
        { step: 0, pitch: 43, vel: 100, dur: 3 },  // G2
        { step: 6, pitch: 43, vel: 80, dur: 2 },   // G2
        { step: 10, pitch: 50, vel: 90, dur: 2 },  // D3 (5th)
        { step: 14, pitch: 48, vel: 85, dur: 2 },  // C3 (4th — approach)
      ],
      presetId: 860, // Sub Bass — deep dub
    },
    melody: {
      // Skank organ — offbeat chords (G minor: G-Bb-D)
      notes: [
        { step: 2, pitch: 67, vel: 70, dur: 1 },  // G4
        { step: 2, pitch: 70, vel: 70, dur: 1 },  // Bb4
        { step: 2, pitch: 74, vel: 70, dur: 1 },  // D5
        { step: 6, pitch: 67, vel: 65, dur: 1 },
        { step: 6, pitch: 70, vel: 65, dur: 1 },
        { step: 6, pitch: 74, vel: 65, dur: 1 },
        { step: 10, pitch: 67, vel: 70, dur: 1 },
        { step: 10, pitch: 70, vel: 70, dur: 1 },
        { step: 10, pitch: 74, vel: 70, dur: 1 },
        { step: 14, pitch: 67, vel: 65, dur: 1 },
        { step: 14, pitch: 70, vel: 65, dur: 1 },
        { step: 14, pitch: 74, vel: 65, dur: 1 },
      ],
      presetId: 1217, // Rock Organ — skank
    },
    pad: {
      // Dub siren — single sustained note with bends implied
      notes: [
        { step: 0, pitch: 67, vel: 45, dur: 16 },  // G4 sustained
      ],
      presetId: 2031, // Buzz Siren
    },
  },

  // ─── Bossa Nova ────────────────────────────────────────────────
  // Syncopated clave, soft brushes, walking bass, nylon guitar
  bossa_nova: {
    bpm: 130, swing: 0, bars: 2,
    drums: {
      1: [{ step: 0, vel: 70 }, { step: 10, vel: 60 }],  // Soft kick
      // Bar 2
      3: [{ step: 0, vel: 75 }, { step: 3, vel: 65 }, { step: 6, vel: 75 }, { step: 10, vel: 65 }, { step: 12, vel: 70 },
           // Bar 2 — son clave complement
           { step: 16, vel: 75 }, { step: 20, vel: 70 }, { step: 24, vel: 75 }, { step: 27, vel: 65 }, { step: 30, vel: 70 }],
      4: [{ step: 0, vel: 60 }, { step: 2, vel: 55 }, { step: 4, vel: 60 }, { step: 6, vel: 55 },
           { step: 8, vel: 60 }, { step: 10, vel: 55 }, { step: 12, vel: 60 }, { step: 14, vel: 55 }],
      6: [{ step: 2, vel: 50 }, { step: 6, vel: 50 }, { step: 10, vel: 50 }, { step: 14, vel: 50 }], // Shaker offbeats
    },
    bass: {
      // Bossa bass: root-5th-3rd motion in C major
      notes: [
        { step: 0, pitch: 48, vel: 85, dur: 4 },   // C3
        { step: 6, pitch: 52, vel: 75, dur: 2 },   // E3
        { step: 10, pitch: 55, vel: 80, dur: 2 },  // G3
        { step: 14, pitch: 53, vel: 70, dur: 2 },  // F3
        // Bar 2
        { step: 16, pitch: 50, vel: 85, dur: 4 },  // D3
        { step: 22, pitch: 53, vel: 75, dur: 2 },  // F3
        { step: 26, pitch: 55, vel: 80, dur: 2 },  // G3
        { step: 30, pitch: 47, vel: 70, dur: 2 },  // B2 (leading tone)
      ],
      presetId: 863, // Finger Bass — warm nylon tone
    },
    melody: {
      // Nylon guitar arpeggios — Cmaj7 shapes
      notes: [
        { step: 0, pitch: 64, vel: 70, dur: 2 },  // E4
        { step: 3, pitch: 67, vel: 65, dur: 2 },  // G4
        { step: 6, pitch: 71, vel: 70, dur: 2 },  // B4
        { step: 10, pitch: 72, vel: 65, dur: 2 }, // C5
        { step: 14, pitch: 71, vel: 60, dur: 2 }, // B4
        // Bar 2 — Dm7 arpeggio
        { step: 16, pitch: 62, vel: 70, dur: 2 }, // D4
        { step: 19, pitch: 65, vel: 65, dur: 2 }, // F4
        { step: 22, pitch: 69, vel: 70, dur: 2 }, // A4
        { step: 26, pitch: 72, vel: 65, dur: 2 }, // C5
        { step: 30, pitch: 69, vel: 60, dur: 2 }, // A4
      ],
      presetId: 1643, // Classical Guitar — nylon
    },
    pad: {
      // Vibraphone — sustained chord tones
      notes: [
        { step: 0, pitch: 72, vel: 50, dur: 16 },  // C5
        { step: 0, pitch: 76, vel: 50, dur: 16 },  // E5
        { step: 16, pitch: 74, vel: 50, dur: 16 }, // D5
        { step: 16, pitch: 77, vel: 50, dur: 16 }, // F5
      ],
      presetId: 1964, // Legend EP — vibes feel
    },
  },

  // ─── Afrobeat ──────────────────────────────────────────────────
  // Polyrhythmic percussion, driving bass, horn call-response
  afrobeat: {
    bpm: 115, swing: 0, bars: 2,
    drums: {
      1: [{ step: 0, vel: 100 }, { step: 6, vel: 80 }, { step: 10, vel: 90 },
           // Bar 2
           { step: 16, vel: 100 }, { step: 22, vel: 80 }, { step: 26, vel: 90 }],
      2: [{ step: 4, vel: 90 }, { step: 12, vel: 95 },
           { step: 20, vel: 90 }, { step: 28, vel: 95 }],
      4: [{ step: 0, vel: 80 }, { step: 2, vel: 80 }, { step: 4, vel: 80 }, { step: 6, vel: 80 },
           { step: 8, vel: 80 }, { step: 10, vel: 80 }, { step: 12, vel: 80 }, { step: 14, vel: 80 }], // Driving 8ths
      // Polyrhythmic perc layers — 3-over-4 feel
      6: [{ step: 0, vel: 75 }, { step: 3, vel: 65 }, { step: 6, vel: 70 }, { step: 9, vel: 65 },
           { step: 12, vel: 75 }, { step: 15, vel: 65 },
           { step: 16, vel: 75 }, { step: 19, vel: 65 }, { step: 22, vel: 70 }, { step: 25, vel: 65 },
           { step: 28, vel: 75 }, { step: 31, vel: 65 }],
      7: [{ step: 2, vel: 60 }, { step: 5, vel: 55 }, { step: 8, vel: 60 }, { step: 11, vel: 55 },
           { step: 14, vel: 60 },
           { step: 18, vel: 60 }, { step: 21, vel: 55 }, { step: 24, vel: 60 }, { step: 27, vel: 55 },
           { step: 30, vel: 60 }],
    },
    bass: {
      // Driving bass locked to kick pattern
      notes: [
        { step: 0, pitch: 43, vel: 100, dur: 3 },  // G2
        { step: 6, pitch: 43, vel: 85, dur: 2 },   // G2
        { step: 10, pitch: 48, vel: 95, dur: 2 },  // C3
        { step: 14, pitch: 45, vel: 80, dur: 2 },  // A2
        // Bar 2
        { step: 16, pitch: 43, vel: 100, dur: 3 }, // G2
        { step: 22, pitch: 47, vel: 85, dur: 2 },  // B2
        { step: 26, pitch: 48, vel: 95, dur: 2 },  // C3
        { step: 30, pitch: 45, vel: 80, dur: 2 },  // A2
      ],
      presetId: 865, // Moog Bass — punchy and round
    },
    melody: {
      // Horn call-response: call in bar 1, response in bar 2
      notes: [
        // Call — ascending
        { step: 0, pitch: 67, vel: 90, dur: 2 },   // G4
        { step: 4, pitch: 72, vel: 85, dur: 3 },   // C5
        { step: 8, pitch: 74, vel: 90, dur: 4 },   // D5 — held
        // Response — descending
        { step: 16, pitch: 76, vel: 90, dur: 2 },  // E5
        { step: 20, pitch: 74, vel: 85, dur: 2 },  // D5
        { step: 24, pitch: 72, vel: 80, dur: 3 },  // C5
        { step: 28, pitch: 67, vel: 90, dur: 4 },  // G4 — resolve
      ],
      presetId: 1517, // Trumpet
    },
    pad: {
      // Organ comp — sustained chords
      notes: [
        { step: 0, pitch: 60, vel: 55, dur: 16 },  // C4
        { step: 0, pitch: 64, vel: 55, dur: 16 },  // E4
        { step: 0, pitch: 67, vel: 55, dur: 16 },  // G4
        { step: 16, pitch: 60, vel: 55, dur: 16 }, // Am (relative minor)
        { step: 16, pitch: 64, vel: 55, dur: 16 },
        { step: 16, pitch: 69, vel: 55, dur: 16 }, // A4
      ],
      presetId: 1978, // FM Strings Pad
    },
  },

  // ─── Disco ─────────────────────────────────────────────────────
  // Four-on-the-floor, open hat offbeats, octave bass, string stabs
  disco: {
    bpm: 120, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 110 }, { step: 4, vel: 110 }, { step: 8, vel: 110 }, { step: 12, vel: 110 }], // Four on floor
      2: [{ step: 4, vel: 90 }, { step: 12, vel: 95 }],
      3: [{ step: 4, vel: 85 }, { step: 12, vel: 85 }], // Clap on 2 & 4
      5: [{ step: 2, vel: 85 }, { step: 6, vel: 85 }, { step: 10, vel: 85 }, { step: 14, vel: 85 }], // Open hat offbeats
      4: [{ step: 0, vel: 70 }, { step: 4, vel: 70 }, { step: 8, vel: 70 }, { step: 12, vel: 70 }], // Closed hat on beats
    },
    bass: {
      // Octave bass groove — root + octave on 8ths
      notes: [
        { step: 0, pitch: 36, vel: 100, dur: 1 },  // C2
        { step: 2, pitch: 48, vel: 80, dur: 1 },   // C3
        { step: 4, pitch: 36, vel: 100, dur: 1 },  // C2
        { step: 6, pitch: 48, vel: 80, dur: 1 },   // C3
        { step: 8, pitch: 41, vel: 100, dur: 1 },  // F2
        { step: 10, pitch: 53, vel: 80, dur: 1 },  // F3
        { step: 12, pitch: 43, vel: 100, dur: 1 }, // G2
        { step: 14, pitch: 55, vel: 80, dur: 1 },  // G3
      ],
      presetId: 865, // Moog Bass
    },
    melody: {
      // String stabs — rhythmic hits
      notes: [
        { step: 0, pitch: 72, vel: 85, dur: 2 },  // C5
        { step: 0, pitch: 76, vel: 85, dur: 2 },  // E5
        { step: 0, pitch: 79, vel: 85, dur: 2 },  // G5
        { step: 6, pitch: 72, vel: 75, dur: 1 },
        { step: 6, pitch: 76, vel: 75, dur: 1 },
        { step: 6, pitch: 79, vel: 75, dur: 1 },
        { step: 10, pitch: 72, vel: 80, dur: 2 },
        { step: 10, pitch: 77, vel: 80, dur: 2 }, // F5
        { step: 10, pitch: 81, vel: 80, dur: 2 }, // A5
      ],
      presetId: 1441, // String Ensemble
    },
    pad: {
      // Brass pad sustain
      notes: [
        { step: 0, pitch: 60, vel: 50, dur: 8 },  // C4
        { step: 0, pitch: 64, vel: 50, dur: 8 },  // E4
        { step: 0, pitch: 67, vel: 50, dur: 8 },  // G4
        { step: 8, pitch: 60, vel: 50, dur: 8 },  // F chord
        { step: 8, pitch: 65, vel: 50, dur: 8 },  // F4
        { step: 8, pitch: 69, vel: 50, dur: 8 },  // A4
      ],
      presetId: 1978, // FM Strings Pad
    },
  },

  // ─── Trip-Hop ──────────────────────────────────────────────────
  // Sparse breakbeat, dark sub bass, minimal dark melody
  triphop: {
    bpm: 85, swing: 15, bars: 2,
    drums: {
      1: [{ step: 0, vel: 100 }, { step: 7, vel: 80 },
           { step: 16, vel: 100 }, { step: 23, vel: 75 }],  // Sparse kick
      2: [{ step: 4, vel: 85 }, { step: 12, vel: 90 },
           { step: 20, vel: 85 }, { step: 28, vel: 90 }],
      4: [{ step: 0, vel: 60 }, { step: 4, vel: 55 }, { step: 8, vel: 60 }, { step: 12, vel: 55 },
           { step: 14, vel: 50 }],
      3: [{ step: 12, vel: 60 }, { step: 28, vel: 65 }], // Sparse clap
    },
    bass: {
      // Dark sub — long sustained notes
      notes: [
        { step: 0, pitch: 36, vel: 110, dur: 8 },   // C2 — long
        { step: 12, pitch: 34, vel: 90, dur: 4 },   // Bb1
        // Bar 2
        { step: 16, pitch: 36, vel: 110, dur: 8 },  // C2
        { step: 28, pitch: 31, vel: 95, dur: 4 },   // G1
      ],
      presetId: 860, // Sub Bass
    },
    melody: {
      // Sparse, dark — minor 2nds and tritones
      notes: [
        { step: 4, pitch: 72, vel: 55, dur: 4 },   // C5
        { step: 12, pitch: 70, vel: 50, dur: 3 },  // Bb4
        // Bar 2 — haunting reply
        { step: 20, pitch: 73, vel: 55, dur: 4 },  // Db5
        { step: 28, pitch: 67, vel: 50, dur: 4 },  // G4
      ],
      presetId: 1290, // Warm Pad — dark texture
    },
    pad: {
      // Dark evolving FM pad
      notes: [
        { step: 0, pitch: 60, vel: 35, dur: 32 },  // C4 — full 2-bar sustain
        { step: 0, pitch: 63, vel: 35, dur: 32 },  // Eb4
      ],
      presetId: 1977, // FM Glass Dream
    },
  },

  // ─── Lo-fi ─────────────────────────────────────────────────────
  // Lazy drums, muted bass, jazzy piano 7th chords
  lofi: {
    bpm: 78, swing: 20, bars: 2,
    drums: {
      1: [{ step: 0, vel: 80 }, { step: 7, vel: 65 },
           { step: 16, vel: 80 }, { step: 23, vel: 60 }],  // Lazy kick
      2: [{ step: 4, vel: 60 }, { step: 12, vel: 65 },
           { step: 20, vel: 60 }, { step: 28, vel: 65 }],  // Soft snare
      4: [{ step: 0, vel: 55 }, { step: 2, vel: 50 }, { step: 4, vel: 55 }, { step: 6, vel: 50 },
           { step: 8, vel: 55 }, { step: 10, vel: 50 }, { step: 12, vel: 55 }, { step: 14, vel: 50 }],
      5: [{ step: 6, vel: 45 }, { step: 14, vel: 40 }], // Lazy open hat
    },
    bass: {
      // Muted jazz bass — chord tones with short duration
      notes: [
        { step: 0, pitch: 48, vel: 75, dur: 3 },   // C3
        { step: 6, pitch: 52, vel: 65, dur: 2 },   // E3
        { step: 10, pitch: 55, vel: 70, dur: 2 },  // G3
        { step: 14, pitch: 53, vel: 60, dur: 2 },  // F3
        // Bar 2
        { step: 16, pitch: 50, vel: 75, dur: 3 },  // D3
        { step: 22, pitch: 53, vel: 65, dur: 2 },  // F3
        { step: 26, pitch: 57, vel: 70, dur: 2 },  // A3
        { step: 30, pitch: 55, vel: 60, dur: 2 },  // G3
      ],
      presetId: 863, // Finger Bass
    },
    melody: {
      // Jazzy piano — maj7/min7 voicings
      notes: [
        // Cmaj7: E-G-B-C
        { step: 0, pitch: 64, vel: 60, dur: 6 },  // E4
        { step: 0, pitch: 67, vel: 55, dur: 6 },  // G4
        { step: 0, pitch: 71, vel: 60, dur: 6 },  // B4
        // Am7: C-E-G
        { step: 8, pitch: 60, vel: 55, dur: 6 },  // C4
        { step: 8, pitch: 64, vel: 55, dur: 6 },  // E4
        { step: 8, pitch: 67, vel: 50, dur: 6 },  // G4
        // Bar 2: Dm7: F-A-C
        { step: 16, pitch: 65, vel: 60, dur: 6 }, // F4
        { step: 16, pitch: 69, vel: 55, dur: 6 }, // A4
        { step: 16, pitch: 72, vel: 60, dur: 6 }, // C5
        // G7: B-D-F
        { step: 24, pitch: 59, vel: 55, dur: 6 }, // B3
        { step: 24, pitch: 62, vel: 55, dur: 6 }, // D4
        { step: 24, pitch: 65, vel: 50, dur: 6 }, // F4
      ],
      presetId: 1135, // E.Piano 1
    },
    pad: {
      // Warm FM pad — sustained texture
      notes: [
        { step: 0, pitch: 60, vel: 30, dur: 32 },  // C4
        { step: 0, pitch: 64, vel: 30, dur: 32 },  // E4
        { step: 0, pitch: 67, vel: 30, dur: 32 },  // G4
      ],
      presetId: 1977, // FM Glass Dream
    },
  },

  // ─── Latin Salsa ───────────────────────────────────────────────
  // Clave-synced, tumbao bass, piano montuno
  latin_salsa: {
    bpm: 180, swing: 0, bars: 2,
    drums: {
      1: [{ step: 0, vel: 90 }, { step: 6, vel: 75 }, { step: 12, vel: 80 },
           { step: 16, vel: 90 }, { step: 22, vel: 75 }, { step: 28, vel: 80 }], // Clave-synced kick
      2: [{ step: 4, vel: 80 }, { step: 12, vel: 85 },
           { step: 20, vel: 80 }, { step: 28, vel: 85 }],
      // Son clave: 3-2
      3: [{ step: 0, vel: 90 }, { step: 3, vel: 85 }, { step: 6, vel: 90 },
           { step: 20, vel: 85 }, { step: 24, vel: 90 }],
      4: [{ step: 0, vel: 70 }, { step: 2, vel: 65 }, { step: 4, vel: 70 }, { step: 6, vel: 65 },
           { step: 8, vel: 70 }, { step: 10, vel: 65 }, { step: 12, vel: 70 }, { step: 14, vel: 65 }],
      // Conga pattern
      6: [{ step: 0, vel: 80 }, { step: 3, vel: 60 }, { step: 4, vel: 75 }, { step: 7, vel: 55 },
           { step: 8, vel: 80 }, { step: 11, vel: 60 }, { step: 12, vel: 75 }, { step: 15, vel: 55 },
           { step: 16, vel: 80 }, { step: 19, vel: 60 }, { step: 20, vel: 75 }, { step: 23, vel: 55 },
           { step: 24, vel: 80 }, { step: 27, vel: 60 }, { step: 28, vel: 75 }, { step: 31, vel: 55 }],
      7: [{ step: 2, vel: 55 }, { step: 6, vel: 55 }, { step: 10, vel: 55 }, { step: 14, vel: 55 }], // Timbale
    },
    bass: {
      // Tumbao — anticipated beat 4 (step 14 instead of 12)
      notes: [
        { step: 0, pitch: 48, vel: 95, dur: 2 },   // C3
        { step: 6, pitch: 48, vel: 80, dur: 2 },   // C3
        { step: 10, pitch: 55, vel: 90, dur: 2 },  // G3
        { step: 14, pitch: 53, vel: 85, dur: 2 },  // F3 — anticipation!
        // Bar 2
        { step: 16, pitch: 50, vel: 95, dur: 2 },  // D3
        { step: 22, pitch: 50, vel: 80, dur: 2 },  // D3
        { step: 26, pitch: 55, vel: 90, dur: 2 },  // G3
        { step: 30, pitch: 47, vel: 85, dur: 2 },  // B2 — leading tone
      ],
      presetId: 863, // Finger Bass
    },
    melody: {
      // Piano montuno — rhythmic arpeggiated pattern
      notes: [
        // Cmaj montuno
        { step: 0, pitch: 60, vel: 80, dur: 1 },  // C4
        { step: 2, pitch: 64, vel: 75, dur: 1 },  // E4
        { step: 3, pitch: 67, vel: 70, dur: 1 },  // G4
        { step: 6, pitch: 72, vel: 80, dur: 1 },  // C5
        { step: 7, pitch: 67, vel: 70, dur: 1 },  // G4
        { step: 10, pitch: 64, vel: 75, dur: 1 }, // E4
        { step: 11, pitch: 60, vel: 70, dur: 1 }, // C4
        { step: 14, pitch: 64, vel: 80, dur: 1 }, // E4
        // Bar 2 — G7 montuno
        { step: 16, pitch: 59, vel: 80, dur: 1 }, // B3
        { step: 18, pitch: 62, vel: 75, dur: 1 }, // D4
        { step: 19, pitch: 65, vel: 70, dur: 1 }, // F4
        { step: 22, pitch: 67, vel: 80, dur: 1 }, // G4
        { step: 23, pitch: 65, vel: 70, dur: 1 }, // F4
        { step: 26, pitch: 62, vel: 75, dur: 1 }, // D4
        { step: 27, pitch: 59, vel: 70, dur: 1 }, // B3
        { step: 30, pitch: 62, vel: 80, dur: 1 }, // D4
      ],
      presetId: 1135, // E.Piano 1
    },
    pad: {
      // Horn section hits
      notes: [
        { step: 0, pitch: 72, vel: 70, dur: 3 },   // C5
        { step: 0, pitch: 76, vel: 70, dur: 3 },   // E5
        { step: 8, pitch: 74, vel: 65, dur: 2 },   // D5
        { step: 8, pitch: 77, vel: 65, dur: 2 },   // F5
        { step: 16, pitch: 72, vel: 70, dur: 3 },
        { step: 16, pitch: 76, vel: 70, dur: 3 },
        { step: 24, pitch: 71, vel: 65, dur: 2 },  // B4
        { step: 24, pitch: 74, vel: 65, dur: 2 },  // D5
      ],
      presetId: 1966, // Crystal EP — bright horn-like
    },
  },

  // ─── Ambient ───────────────────────────────────────────────────
  // Minimal percussion, drone bass, sparse arpeggios, evolving pad
  ambient: {
    bpm: 70, swing: 0, bars: 4,
    drums: {
      1: [{ step: 0, vel: 50 }],  // Single soft kick — once every 4 bars
      6: [{ step: 0, vel: 35 }, { step: 16, vel: 30 }, { step: 32, vel: 35 }, { step: 48, vel: 30 }], // Soft perc every bar
      7: [{ step: 8, vel: 25 }, { step: 24, vel: 25 }, { step: 40, vel: 25 }, { step: 56, vel: 25 }], // Delicate texture
    },
    bass: {
      // Drone bass — whole-note sustain
      notes: [
        { step: 0, pitch: 36, vel: 60, dur: 16 },   // C2 — bar 1
        { step: 16, pitch: 36, vel: 55, dur: 16 },  // C2 — bar 2
        { step: 32, pitch: 34, vel: 60, dur: 16 },  // Bb1 — bar 3
        { step: 48, pitch: 36, vel: 55, dur: 16 },  // C2 — bar 4
      ],
      presetId: 860, // Sub Bass — deep drone
    },
    melody: {
      // Sparse arpeggios — one per bar
      notes: [
        { step: 4, pitch: 72, vel: 40, dur: 6 },   // C5
        { step: 20, pitch: 76, vel: 35, dur: 6 },  // E5
        { step: 36, pitch: 79, vel: 40, dur: 6 },  // G5
        { step: 52, pitch: 74, vel: 35, dur: 8 },  // D5
      ],
      presetId: 1775, // Vibraphone — crystalline
    },
    pad: {
      // Evolving FM pad — full 4-bar sustain
      notes: [
        { step: 0, pitch: 60, vel: 35, dur: 64 },  // C4
        { step: 0, pitch: 64, vel: 30, dur: 64 },  // E4
        { step: 0, pitch: 67, vel: 35, dur: 64 },  // G4
      ],
      presetId: 1978, // FM Strings Pad
    },
  },

  // ─── Classic Rock ──────────────────────────────────────────────
  // Driving kick/snare, power bass root+5th, guitar riff, organ pad
  classic_rock: {
    bpm: 130, swing: 0, bars: 1,
    drums: {
      1: [{ step: 0, vel: 110 }, { step: 4, vel: 110 }, { step: 8, vel: 110 }, { step: 12, vel: 110 }], // Driving kick
      2: [{ step: 4, vel: 110 }, { step: 12, vel: 110 }],  // Heavy snare
      4: [{ step: 0, vel: 85 }, { step: 2, vel: 85 }, { step: 4, vel: 85 }, { step: 6, vel: 85 },
           { step: 8, vel: 85 }, { step: 10, vel: 85 }, { step: 12, vel: 85 }, { step: 14, vel: 85 }], // 8th hats
      5: [{ step: 0, vel: 90 }], // Crash on 1
      3: [{ step: 4, vel: 75 }, { step: 12, vel: 75 }], // Clap accent
    },
    bass: {
      // Power bass — root + 5th, driving 8ths
      notes: [
        { step: 0, pitch: 40, vel: 110, dur: 2 },  // E2
        { step: 2, pitch: 40, vel: 90, dur: 2 },   // E2
        { step: 4, pitch: 40, vel: 100, dur: 2 },  // E2
        { step: 6, pitch: 47, vel: 90, dur: 2 },   // B2
        { step: 8, pitch: 45, vel: 100, dur: 2 },  // A2
        { step: 10, pitch: 45, vel: 85, dur: 2 },  // A2
        { step: 12, pitch: 47, vel: 100, dur: 2 }, // B2
        { step: 14, pitch: 47, vel: 85, dur: 2 },  // B2
      ],
      presetId: 865, // Moog Bass — thick rock tone
    },
    melody: {
      // Guitar power riff — E minor pentatonic
      notes: [
        { step: 0, pitch: 64, vel: 100, dur: 2 },  // E4
        { step: 2, pitch: 67, vel: 90, dur: 1 },   // G4
        { step: 4, pitch: 69, vel: 95, dur: 2 },   // A4
        { step: 6, pitch: 67, vel: 85, dur: 1 },   // G4
        { step: 8, pitch: 64, vel: 100, dur: 2 },  // E4
        { step: 12, pitch: 71, vel: 95, dur: 3 },  // B4
        { step: 15, pitch: 69, vel: 80, dur: 1 },  // A4
      ],
      presetId: 1644, // Electric Clean
    },
    pad: {
      // Hammond organ — sustained power chord
      notes: [
        { step: 0, pitch: 64, vel: 60, dur: 16 },  // E4
        { step: 0, pitch: 67, vel: 60, dur: 16 },  // G4
        { step: 0, pitch: 71, vel: 60, dur: 16 },  // B4
      ],
      presetId: 1964, // Legend EP — organ-like
    },
  },

  // ─── Jazz ──────────────────────────────────────────────────────
  // Ride cymbal pattern, kick 1&3, walking bass, Rhodes comp
  jazz: {
    bpm: 120, swing: 25, bars: 2,
    drums: {
      1: [{ step: 0, vel: 75 }, { step: 8, vel: 70 },
           { step: 16, vel: 75 }, { step: 24, vel: 70 }],  // Kick on 1 & 3
      2: [{ step: 8, vel: 40 }, { step: 14, vel: 35 },
           { step: 24, vel: 40 }, { step: 30, vel: 35 }],  // Cross-stick ghost notes
      // Ride pattern: spang-a-lang (quarters + swing 8ths)
      4: [{ step: 0, vel: 80 }, { step: 3, vel: 55 }, { step: 4, vel: 75 },
           { step: 6, vel: 55 }, { step: 8, vel: 80 }, { step: 10, vel: 50 },
           { step: 12, vel: 75 }, { step: 13, vel: 55 }],
      5: [{ step: 4, vel: 60 }, { step: 12, vel: 55 }], // Soft hi-hat on 2 & 4
    },
    bass: {
      // Walking bass — quarter notes through ii-V-I in C
      notes: [
        // Bar 1: Dm7
        { step: 0, pitch: 50, vel: 85, dur: 4 },   // D3
        { step: 4, pitch: 53, vel: 80, dur: 4 },   // F3
        { step: 8, pitch: 57, vel: 85, dur: 4 },   // A3
        { step: 12, pitch: 55, vel: 75, dur: 4 },  // G3 (chromatic approach)
        // Bar 2: G7 → Cmaj7
        { step: 16, pitch: 55, vel: 85, dur: 4 },  // G3
        { step: 20, pitch: 57, vel: 80, dur: 4 },  // A3
        { step: 24, pitch: 59, vel: 85, dur: 4 },  // B3
        { step: 28, pitch: 48, vel: 80, dur: 4 },  // C3 (resolve)
      ],
      presetId: 863, // Finger Bass — upright jazz bass
    },
    melody: {
      // Rhodes comp — rootless voicings
      notes: [
        // Dm9: E-A-C-F
        { step: 0, pitch: 64, vel: 60, dur: 6 },  // E4
        { step: 0, pitch: 69, vel: 55, dur: 6 },  // A4
        { step: 0, pitch: 72, vel: 60, dur: 6 },  // C5
        // On "and" of 2 — rhythmic push
        { step: 6, pitch: 64, vel: 50, dur: 2 },  // E4
        { step: 6, pitch: 69, vel: 50, dur: 2 },  // A4
        // G13: F-A-B-E
        { step: 16, pitch: 65, vel: 60, dur: 6 }, // F4
        { step: 16, pitch: 69, vel: 55, dur: 6 }, // A4
        { step: 16, pitch: 71, vel: 60, dur: 6 }, // B4
        // Cmaj9: E-G-B-D
        { step: 24, pitch: 64, vel: 60, dur: 8 }, // E4
        { step: 24, pitch: 67, vel: 55, dur: 8 }, // G4
        { step: 24, pitch: 71, vel: 60, dur: 8 }, // B4
        { step: 24, pitch: 74, vel: 55, dur: 8 }, // D5
      ],
      presetId: 1135, // E.Piano 1 — Rhodes
    },
    pad: {
      // Guide tone melody on DX — 3rds and 7ths
      notes: [
        { step: 0, pitch: 65, vel: 40, dur: 16 },  // F4 (Dm7 3rd)
        { step: 0, pitch: 72, vel: 40, dur: 16 },  // C5 (Dm7 7th)
        { step: 16, pitch: 65, vel: 40, dur: 8 },  // F4 (G7 7th)
        { step: 16, pitch: 71, vel: 40, dur: 8 },  // B4 (G7 3rd)
        { step: 24, pitch: 64, vel: 40, dur: 8 },  // E4 (Cmaj7 3rd)
        { step: 24, pitch: 71, vel: 40, dur: 8 },  // B4 (Cmaj7 7th)
      ],
      presetId: 1964, // Legend EP
    },
  },
};
