import type { SeqtrackChannel } from "@/lib/midi/types";
import { COMPLETE_PRESETS } from "@/lib/midi/sound-data-complete";
import { findPresetByBankPC } from "@/lib/midi/sound-library";

type ProfileLike = { synthChannels?: number[] };

/**
 * GM Program Number (0-127) to best SEQTRAK preset mapping.
 *
 * The mapping is expressed as physical device addresses (bankMSB, bankLSB,
 * programNumber) derived from the curated library. At runtime we resolve
 * the address to whichever library is currently active (scanned or curated)
 * so the correct preset is picked even when the user has scanned their
 * device and the numeric IDs have been rewritten.
 */

// ---- Internal: curated preset ID → bank/PC address ---------------------

/** Cache: curated preset ID → device address. Built lazily on first use. */
let _curatedAddrMap: Map<number, { msb: number; lsb: number; pc: number }> | null = null;

function getCuratedAddr(id: number): { msb: number; lsb: number; pc: number } | null {
  if (!_curatedAddrMap) {
    _curatedAddrMap = new Map();
    for (const p of COMPLETE_PRESETS) {
      _curatedAddrMap.set(p.id, { msb: p.bankMSB, lsb: p.bankLSB, pc: p.programNumber });
    }
  }
  return _curatedAddrMap.get(id) ?? null;
}

// ---- GM Program → curated preset ID (same logic as before) ------------

function gmProgramToCuratedId(program: number): number {
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

// ---- Public: GM Program → active-library preset ID ---------------------

/**
 * Map a GM program number (0-127) to a preset ID in the ACTIVE sound library.
 *
 * Uses the curated library to pick a desired bank/PC address, then resolves
 * that address against whatever library is active (scanned or curated) so
 * the returned ID is valid for `findPresetById` downstream.
 */
export function gmProgramToPresetId(program: number): number {
  const curatedId = gmProgramToCuratedId(program);
  const addr = getCuratedAddr(curatedId);
  if (!addr) return curatedId;
  // Resolve against the active library — scanned presets have different
  // numeric IDs even though the bank/PC addresses are identical.
  const activePreset = findPresetByBankPC(addr.msb, addr.lsb, addr.pc);
  return activePreset?.id ?? curatedId;
}

// ---- GM Family → SEQTRAK Channel ---------------------------------------

/** GM instrument families as reported by @tonejs/midi */
const BASS_FAMILIES = new Set(["bass"]);
const PAD_FAMILIES = new Set(["synth pad", "ensemble", "strings"]);

/**
 * Map a GM instrument family + program to the preferred channel.
 *
 * When a ProfileLike is provided, maps to that device's channels.
 * For single-channel synths (MicroFreak), always returns channel 1.
 * For SEQTRAK: Bass → Ch 8, Pads → Ch 10, Lead → Ch 9.
 *
 * The caller handles overflow when multiple tracks compete for the same channel.
 */
export function gmFamilyToChannel(family: string, program: number, profile?: ProfileLike): SeqtrackChannel {
  // Single-channel devices: everything goes to the one channel
  if (profile?.synthChannels && profile.synthChannels.length === 1) {
    return profile.synthChannels[0];
  }

  const f = family.toLowerCase();
  const synthChs = profile?.synthChannels ?? [8, 9, 10, 11];

  // Bass always goes to first synth channel
  if (BASS_FAMILIES.has(f) || (program >= 32 && program <= 39)) return synthChs[0] ?? 8;

  // Synth Pad / Ensemble / Strings → last synth channel (DX on SEQTRAK)
  if (PAD_FAMILIES.has(f) || (program >= 88 && program <= 103)) return synthChs[synthChs.length - 1] ?? 10;

  // Default melodic → second synth channel
  return synthChs[1] ?? synthChs[0] ?? 9;
}

// ---- GM Drum Kit → SEQTRAK drum preset IDs (Ch 1-7) --------------------

/** Resolve a curated-library drum kit mapping against the active library. */
function resolveKit(
  kit: Partial<Record<SeqtrackChannel, number>>,
): Partial<Record<SeqtrackChannel, number>> {
  const result: Partial<Record<SeqtrackChannel, number>> = {};
  for (const [chStr, curatedId] of Object.entries(kit)) {
    const ch = Number(chStr) as SeqtrackChannel;
    if (curatedId == null) continue;
    const addr = getCuratedAddr(curatedId);
    if (!addr) {
      result[ch] = curatedId;
      continue;
    }
    const active = findPresetByBankPC(addr.msb, addr.lsb, addr.pc);
    result[ch] = active?.id ?? curatedId;
  }
  return result;
}

/**
 * Map a GM drum kit program number to SEQTRAK drum preset IDs for channels 1-7.
 *
 * Kit numbers follow the GM2 convention:
 *   0 = Standard, 8 = Room, 16 = Power, 24 = Electronic, 25 = TR-808, 32 = Jazz
 *
 * Returned IDs are resolved against the active library (scanned or curated).
 */
export function gmDrumKitPresets(
  kitProgram: number,
): Partial<Record<SeqtrackChannel, number>> {
  return resolveKit(gmDrumKitCurated(kitProgram));
}

function gmDrumKitCurated(
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
