import type { CCParameter } from "./types";

/**
 * Complete MIDI CC parameter table for the Yamaha SEQTRAK.
 * Source: SEQTRAK Data List V2.00, pages 111-114.
 */
export const CC_PARAMS: CCParameter[] = [
  // ─── Standard Sound CCs ────────────────────────────────────────
  { cc: 7,  name: "Volume",              shortName: "VOL",  min: 0, max: 127, defaultValue: 100, bipolar: false, channels: "all",   category: "control" },
  { cc: 10, name: "Pan",                 shortName: "PAN",  min: 0, max: 127, defaultValue: 64,  bipolar: true,  channels: "all",   category: "control" },
  { cc: 11, name: "Expression",          shortName: "EXP",  min: 0, max: 127, defaultValue: 127, bipolar: false, channels: "all",   category: "control" },
  { cc: 5,  name: "Portamento Time",     shortName: "PORT", min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "synth", category: "control" },
  { cc: 64, name: "Sustain (Damper)",     shortName: "SUS",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all",   category: "control" },
  { cc: 65, name: "Portamento Switch",   shortName: "PRT",  min: 0, max: 1,   defaultValue: 0,   bipolar: false, channels: "synth", category: "control" },
  { cc: 66, name: "Sostenuto",           shortName: "SOS",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all",   category: "control" },

  // ─── Sound Shaping CCs (bipolar around 64) ────────────────────
  { cc: 74, name: "Filter Cutoff",       shortName: "CUT",  min: 0, max: 127, defaultValue: 64,  bipolar: true,  channels: "all",   category: "sound" },
  { cc: 71, name: "Filter Resonance",    shortName: "RES",  min: 0, max: 127, defaultValue: 64,  bipolar: true,  channels: "all",   category: "sound" },
  { cc: 73, name: "EG Attack Time",      shortName: "ATK",  min: 0, max: 127, defaultValue: 64,  bipolar: true,  channels: "all",   category: "sound" },
  { cc: 75, name: "EG Decay/Release",    shortName: "DEC",  min: 0, max: 127, defaultValue: 64,  bipolar: true,  channels: "all",   category: "sound" },

  // ─── EQ CCs ────────────────────────────────────────────────────
  { cc: 20, name: "EQ High Gain",        shortName: "EQH",  min: 40, max: 88, defaultValue: 64,  bipolar: true,  channels: "all",   category: "eq" },
  { cc: 21, name: "EQ Low Gain",         shortName: "EQL",  min: 40, max: 88, defaultValue: 64,  bipolar: true,  channels: "all",   category: "eq" },

  // ─── SEQTRAK-specific CCs ─────────────────────────────────────
  { cc: 23, name: "Mute",                shortName: "MUT",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all",   category: "control" },
  { cc: 25, name: "Drum Pitch",          shortName: "PIT",  min: 40, max: 88, defaultValue: 64,  bipolar: true,  channels: "drum",  category: "sound" },
  { cc: 26, name: "Mono/Poly/Chord",     shortName: "M/P",  min: 0, max: 2,   defaultValue: 1,   bipolar: false, channels: "synth", category: "control" },

  // ─── Arpeggiator CCs ──────────────────────────────────────────
  { cc: 27, name: "Arp Template",        shortName: "ARP",  min: 0, max: 15,  defaultValue: 0,   bipolar: false, channels: "synth", category: "control" },
  { cc: 28, name: "Arp Gate",            shortName: "AGT",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "synth", category: "control" },
  { cc: 29, name: "Arp Speed",           shortName: "ASP",  min: 0, max: 9,   defaultValue: 3,   bipolar: false, channels: "synth", category: "control" },

  // ─── Effects Send CCs ─────────────────────────────────────────
  { cc: 91, name: "Reverb Send",         shortName: "REV",  min: 0, max: 127, defaultValue: 40,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 94, name: "Delay Send",          shortName: "DLY",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "all",   category: "effect" },

  // ─── Master Effect CCs ────────────────────────────────────────
  { cc: 102, name: "Master FX1 Param 1", shortName: "MF1a", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 103, name: "Master FX1 Param 2", shortName: "MF1b", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 104, name: "Master FX1 Param 3", shortName: "MF1c", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 105, name: "Master FX2 Param 1", shortName: "MF2a", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 106, name: "Master FX3 Param 1", shortName: "MF3a", min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 107, name: "Insert FX Param 1",  shortName: "IF1",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 108, name: "Insert FX Param 2",  shortName: "IF2",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 109, name: "Insert FX Param 3",  shortName: "IF3",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 110, name: "Reverb Param 1",     shortName: "RV1",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 111, name: "Reverb Param 2",     shortName: "RV2",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 112, name: "Reverb Param 3",     shortName: "RV3",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 113, name: "Delay Param 1",      shortName: "DL1",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 114, name: "Delay Param 2",      shortName: "DL2",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },
  { cc: 115, name: "Delay Param 3",      shortName: "DL3",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "all",   category: "effect" },

  // ─── FM/DX-specific CCs (Channel 10 only) ─────────────────────
  { cc: 116, name: "FM Algorithm",       shortName: "ALG",  min: 0, max: 11,  defaultValue: 0,   bipolar: false, channels: "dx",    category: "fm" },
  { cc: 117, name: "FM Mod Amount",      shortName: "MOD",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "dx",    category: "fm" },
  { cc: 118, name: "FM Mod Frequency",   shortName: "FRQ",  min: 0, max: 127, defaultValue: 64,  bipolar: false, channels: "dx",    category: "fm" },
  { cc: 119, name: "FM Mod Feedback",    shortName: "FBK",  min: 0, max: 127, defaultValue: 0,   bipolar: false, channels: "dx",    category: "fm" },
];

/** Get CC parameters applicable to a specific channel */
export function getCCsForChannel(channel: number): CCParameter[] {
  return CC_PARAMS.filter((p) => {
    if (p.channels === "all") return true;
    if (p.channels === "drum") return channel >= 1 && channel <= 7;
    if (p.channels === "synth") return channel >= 8 && channel <= 11;
    if (p.channels === "dx") return channel === 10;
    if (Array.isArray(p.channels)) return (p.channels as number[]).includes(channel);
    return false;
  });
}

/** Get the most useful CCs for quick sound shaping (UI knob panel) */
export function getQuickCCs(channel: number): CCParameter[] {
  const primary = [74, 71, 73, 75, 91, 94, 7, 10]; // cutoff, res, atk, dec, rev, dly, vol, pan
  const fmExtra = [116, 117, 118, 119];
  const drumExtra = [25]; // drum pitch

  const ccs = getCCsForChannel(channel);
  const ids = new Set(primary);
  if (channel === 10) fmExtra.forEach((cc) => ids.add(cc));
  if (channel >= 1 && channel <= 7) drumExtra.forEach((cc) => ids.add(cc));

  return ccs.filter((p) => ids.has(p.cc));
}
