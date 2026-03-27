import type { SeqtrackChannel } from "@/lib/midi/types";

/**
 * GM Program Number (0-127) to best SEQTRAK preset ID mapping.
 *
 * Preset IDs reference the SEQTRAK sound library (sound-data-complete.ts).
 * The mapping groups GM families to the closest available SEQTRAK sound.
 */

// ---- GM Program → SEQTRAK Preset ID ------------------------------------

/** Map a GM program number (0-127) to the best matching SEQTRAK preset ID. */
export function gmProgramToPresetId(program: number): number {
  // Specific overrides for programs with close SEQTRAK equivalents
  switch (program) {
    case 33: return 863;  // Electric Bass (Finger) → Finger Bass
    case 34: return 865;  // Electric Bass (Pick) → Moog Bass
    case 35: return 861;  // Fretless Bass → Acid Bass
    case 36: return 864;  // Slap Bass 1 → Slap Bass
    case 37: return 864;  // Slap Bass 2 → Slap Bass
    case 38: return 860;  // Synth Bass 1 → Sub Bass
    case 39: return 865;  // Synth Bass 2 → Moog Bass
    default: break;
  }

  // Family-level mapping by GM program range
  if (program <= 7) return 1135;    // Piano → E.Piano 1
  if (program <= 15) return 1775;   // Chromatic Percussion → Vibraphone
  if (program <= 23) return 1217;   // Organ → Rock Organ
  if (program <= 31) return 1644;   // Guitar → Electric Clean
  if (program <= 39) return 860;    // Bass → Sub Bass (fallback)
  if (program <= 47) return 1441;   // Strings → String Ensemble
  if (program <= 55) return 1441;   // Ensemble → String Ensemble
  if (program <= 63) return 1517;   // Brass → Trumpet
  if (program <= 71) return 1216;   // Reed → Jazzy 1
  if (program <= 79) return 1216;   // Pipe → Jazzy 1
  if (program <= 87) return 1290;   // Synth Lead → Warm Pad
  if (program <= 95) return 1978;   // Synth Pad → FM Strings Pad
  if (program <= 103) return 1977;  // Synth Effects → FM Glass Dream
  if (program <= 111) return 1643;  // Ethnic → Classical Guitar
  if (program <= 119) return 1775;  // Percussive → Vibraphone
  return 1977;                      // Sound Effects → FM Glass Dream
}

// ---- GM Family → SEQTRAK Channel ---------------------------------------

/** GM instrument families as reported by @tonejs/midi */
const BASS_FAMILIES = new Set(["bass"]);
const PAD_FAMILIES = new Set(["synth pad", "ensemble", "strings"]);

/**
 * Map a GM instrument family + program to the preferred SEQTRAK channel.
 *
 * - Bass (GM 32-39) → always Ch 8
 * - Pads / Strings / Ensembles → Ch 10 (DX, FM synthesis — good for pads)
 * - Everything else → Ch 9 (AWM2 lead/keys)
 *
 * The caller handles overflow when multiple tracks compete for the same channel.
 */
export function gmFamilyToChannel(family: string, program: number): SeqtrackChannel {
  const f = family.toLowerCase();

  // Bass always goes to Ch 8
  if (BASS_FAMILIES.has(f) || (program >= 32 && program <= 39)) return 8;

  // Synth Pad / Ensemble / Strings → Ch 10 (DX)
  if (PAD_FAMILIES.has(f) || (program >= 88 && program <= 103)) return 10;

  // Synth Lead (GM 80-87) → Ch 9
  // Default melodic → Ch 9
  return 9;
}

// ---- GM Drum Kit → SEQTRAK drum preset IDs (Ch 1-7) --------------------

/**
 * Map a GM drum kit program number to SEQTRAK drum preset IDs for channels 1-7.
 *
 * Kit numbers follow the GM2 convention:
 *   0 = Standard, 8 = Room, 16 = Power, 24 = Electronic, 25 = TR-808, 32 = Jazz
 */
export function gmDrumKitPresets(
  kitProgram: number,
): Partial<Record<SeqtrackChannel, number>> {
  switch (kitProgram) {
    case 8: // Room Kit
      return {
        1: 3,   // Deep Kick
        2: 121, // Acoustic Snare
        3: 241, // 808 Clap
        4: 361, // Closed Hat Tight
        5: 441, // Open Hat
        6: 563, // Ride Cymbal
        7: 681, // Crash Cymbal
      };
    case 16: // Power Kit
      return {
        1: 5,   // 909 Kick
        2: 124, // 909 Snare
        3: 242, // 909 Clap
        4: 363, // 909 Closed Hat
        5: 442, // 808 Open Hat
        6: 563, // Ride Cymbal
        7: 681, // Crash Cymbal
      };
    case 24: // Electronic Kit
    case 25: // TR-808
      return {
        1: 4,   // 808 Kick
        2: 125, // Trap Snare
        3: 241, // 808 Clap
        4: 362, // 808 Closed Hat
        5: 442, // 808 Open Hat
        6: 561, // Shaker
        7: 681, // Crash Cymbal
      };
    case 32: // Jazz Kit
      return {
        1: 1,   // Acoustic Kick
        2: 126, // Brush Snare
        3: 243, // Finger Snap
        4: 361, // Closed Hat Tight
        5: 441, // Open Hat
        6: 563, // Ride Cymbal
        7: 681, // Crash Cymbal
      };
    case 0:  // Standard Kit
    default:
      return {
        1: 1,   // Acoustic Kick
        2: 122, // Tight Snare
        3: 241, // 808 Clap
        4: 361, // Closed Hat Tight
        5: 441, // Open Hat
        6: 563, // Ride Cymbal
        7: 681, // Crash Cymbal
      };
  }
}
