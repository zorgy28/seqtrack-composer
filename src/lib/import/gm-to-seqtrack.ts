import type { SeqtrackChannel } from "@/lib/midi/types";
import { KNOWN_PRESETS } from "@/lib/midi/sound-data-complete";
import { findPresetByBankPC } from "@/lib/midi/sound-library";

type ProfileLike = { synthChannels?: number[] };

/**
 * GM Program Number (0-127) to best SEQTRAK preset mapping.
 *
 * How it works:
 * 1. GM program → preset name (e.g. "Sub Bass", "String Ensemble")
 * 2. Name → real device address (bankMSB/bankLSB/programNumber) via KNOWN_PRESETS
 * 3. Address → preset in the active sound library (scanned or curated)
 *
 * This avoids two bugs that would otherwise trip us up:
 *  - COMPLETE_PRESETS is generated programmatically; its ID-to-address formula
 *    does NOT match the hand-curated IDs, so lookups like findPresetById(860)
 *    return a positional preset named "Bass 5" instead of "Sub Bass".
 *  - When the user has scanned their device, the scanned library uses
 *    different numeric IDs. Only bank+LSB+PC addresses are stable across
 *    libraries — they are the physical hardware slots.
 */

// ---- Name → device address lookup (built from KNOWN_PRESETS) ------------

const knownByName = new Map<string, { msb: number; lsb: number; pc: number }>();
for (const p of KNOWN_PRESETS) {
  knownByName.set(p.name, { msb: p.bankMSB, lsb: p.bankLSB, pc: p.programNumber });
}

function addrOf(name: string): { msb: number; lsb: number; pc: number } | null {
  return knownByName.get(name) ?? null;
}

// ---- GM Program → target preset name ------------------------------------

/** Map a GM program number to the name of a known SEQTRAK preset. */
function gmProgramToName(program: number): string {
  // Specific bass overrides
  switch (program) {
    case 32: return "Finger Bass";        // Acoustic Bass
    case 33: return "Finger Bass";        // Electric Bass (Finger)
    case 34: return "Moog Bass";          // Electric Bass (Pick)
    case 35: return "Acid Bass";          // Fretless Bass
    case 36: return "Slap Bass";          // Slap Bass 1
    case 37: return "Slap Bass";          // Slap Bass 2
    case 38: return "Sub Bass";           // Synth Bass 1
    case 39: return "Moog Bass";          // Synth Bass 2
    default: break;
  }

  // Family-level mapping by GM program range
  if (program <= 7) return "E.Piano 1";                // Piano
  if (program <= 15) return "Vibraphone";              // Chromatic Percussion
  if (program <= 23) return "Rock Organ";              // Organ
  if (program <= 31) return "Electric Clean";          // Guitar
  if (program <= 39) return "Sub Bass";                // Bass fallback
  if (program <= 47) return "String Ensemble";         // Strings
  if (program <= 55) return "String Ensemble";         // Ensemble
  if (program <= 63) return "Trumpet";                 // Brass
  if (program <= 71) return "Jazzy 1";                 // Reed
  if (program <= 79) return "Jazzy 1";                 // Pipe
  if (program <= 87) return "Warm Pad";                // Synth Lead
  if (program <= 95) return "FM Strings Pad";          // Synth Pad
  if (program <= 103) return "FM Glass Dream";         // Synth Effects
  if (program <= 111) return "Classical Guitar";       // Ethnic
  if (program <= 119) return "Vibraphone";             // Percussive
  return "FM Glass Dream";                             // Sound Effects
}

// ---- Public: GM Program → active-library preset ID ---------------------

/**
 * Map a GM program number (0-127) to a preset ID in the ACTIVE sound library.
 *
 * Resolves a preset name via KNOWN_PRESETS (for its real bank/PC address),
 * then looks up that address in whatever library is active — scanned device
 * presets or the generated curated library. Returns the ID valid for
 * `findPresetById` downstream.
 */
export function gmProgramToPresetId(program: number): number {
  const name = gmProgramToName(program);
  const addr = addrOf(name);
  if (!addr) return 1; // safe fallback: first preset in library
  const active = findPresetByBankPC(addr.msb, addr.lsb, addr.pc);
  return active?.id ?? 1;
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

/** Resolve a kit of (channel → preset name) pairs into active-library IDs. */
function resolveKit(
  kit: Partial<Record<SeqtrackChannel, string>>,
): Partial<Record<SeqtrackChannel, number>> {
  const result: Partial<Record<SeqtrackChannel, number>> = {};
  for (const [chStr, name] of Object.entries(kit)) {
    const ch = Number(chStr) as SeqtrackChannel;
    if (!name) continue;
    const addr = addrOf(name);
    if (!addr) continue;
    const active = findPresetByBankPC(addr.msb, addr.lsb, addr.pc);
    if (active) result[ch] = active.id;
  }
  return result;
}

/**
 * Map a GM drum kit program number to SEQTRAK drum preset IDs for channels 1-7.
 *
 * Kit numbers follow the GM2 convention:
 *   0 = Standard, 8 = Room, 16 = Power, 24 = Electronic, 25 = TR-808, 32 = Jazz
 */
export function gmDrumKitPresets(
  kitProgram: number,
): Partial<Record<SeqtrackChannel, number>> {
  return resolveKit(gmDrumKitNames(kitProgram));
}

function gmDrumKitNames(kitProgram: number): Partial<Record<SeqtrackChannel, string>> {
  switch (kitProgram) {
    case 8: // Room Kit
      return {
        1: "Deep Kick",
        2: "Acoustic Snare",
        3: "808 Clap",
        4: "Closed Hat Tight",
        5: "Open Hat",
        6: "Ride Cymbal",
        7: "Crash Cymbal",
      };
    case 16: // Power Kit
      return {
        1: "909 Kick",
        2: "909 Snare",
        3: "909 Clap",
        4: "909 Closed Hat",
        5: "808 Open Hat",
        6: "Ride Cymbal",
        7: "Crash Cymbal",
      };
    case 24: // Electronic Kit
    case 25: // TR-808
      return {
        1: "808 Kick",
        2: "Trap Snare",
        3: "808 Clap",
        4: "808 Closed Hat",
        5: "808 Open Hat",
        6: "Shaker",
        7: "Crash Cymbal",
      };
    case 32: // Jazz Kit
      return {
        1: "Acoustic Kick",
        2: "Brush Snare",
        3: "Finger Snap",
        4: "Closed Hat Tight",
        5: "Open Hat",
        6: "Ride Cymbal",
        7: "Crash Cymbal",
      };
    case 0: // Standard Kit
    default:
      return {
        1: "Acoustic Kick",
        2: "Tight Snare",
        3: "808 Clap",
        4: "Closed Hat Tight",
        5: "Open Hat",
        6: "Ride Cymbal",
        7: "Crash Cymbal",
      };
  }
}
