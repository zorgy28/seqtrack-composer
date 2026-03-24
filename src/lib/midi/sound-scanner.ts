import type { SoundPreset, SoundCategory, SoundEngine, SeqtrackChannel } from "./types";
import { getOutputPort, getInputPort } from "@/lib/webmidi/midi-connection";
import { sendBankSelect, sendProgramChange } from "@/lib/webmidi/midi-sender";
import { buildParameterRequest, addrSoundName, channelToPart } from "./sysex";

export interface ScanProgress {
  current: number;
  total: number;
  currentName: string;
  engine: string;
  channel: number;
}

// ─── Scan Configuration ──────────────────────────────────────────

interface ScanConfig {
  engine: SoundEngine;
  channel: SeqtrackChannel;
  bankMSB: number;
  lsbRange: [number, number]; // inclusive
  categories: Record<string, SoundCategory>; // name pattern -> category
}

const DRUM_CATEGORIES: Record<string, SoundCategory> = {
  "kick": "Kick", "bd": "Kick", "bass drum": "Kick",
  "snare": "Snare", "sd": "Snare", "rim": "Rim",
  "clap": "Clap", "cp": "Clap", "snap": "Snap",
  "hat": "Closed HiHat", "hh": "Closed HiHat",
  "open": "Open HiHat", "oh": "Open HiHat",
  "shaker": "Shaker", "tamb": "Shaker", "ride": "Ride",
  "crash": "Crash", "cymbal": "Crash",
  "tom": "Tom", "conga": "Conga", "bongo": "Conga",
  "bell": "Bell", "cowbell": "Bell",
};

const SYNTH_CATEGORIES: Record<string, SoundCategory> = {
  "bass": "Bass", "sub": "Bass",
  "lead": "Synth Lead", "saw": "Synth Lead", "square": "Synth Lead",
  "piano": "Piano", "grand": "Piano",
  "ep": "Keyboard", "organ": "Organ",
  "pad": "Pad", "string": "Strings", "brass": "Brass",
  "guitar": "Guitar", "mallet": "Mallet", "bell": "Bell",
  "arp": "Rhythmic", "sfx": "SFX",
};

const DX_CATEGORIES: Record<string, SoundCategory> = {
  "bass": "Bass", "lead": "Synth Lead",
  "piano": "Piano", "ep": "Keyboard",
  "pad": "Pad", "bell": "Bell", "sfx": "SFX",
};

const SCAN_CONFIGS: ScanConfig[] = [
  {
    engine: "drum",
    channel: 1, // Use kick channel for drum scanning
    bankMSB: 63,
    lsbRange: [0, 5],
    categories: DRUM_CATEGORIES,
  },
  {
    engine: "awm2",
    channel: 8, // Synth 1 for AWM2 scanning
    bankMSB: 63,
    lsbRange: [6, 14],
    categories: SYNTH_CATEGORIES,
  },
  {
    engine: "dx",
    channel: 10, // DX channel
    bankMSB: 63,
    lsbRange: [15, 15],
    categories: DX_CATEGORIES,
  },
];

// ─── SysEx Response Constants ────────────────────────────────────

const YAMAHA_ID = 0x43;
const PARAM_CHANGE = 0x10;
const GROUP_HI = 0x7f;
const GROUP_LO = 0x1c;
const MODEL_ID = 0x0c;

// ─── Core Scanner ────────────────────────────────────────────────

/**
 * Scan all SEQTRAK preset names via SysEx.
 *
 * For each engine, iterates bank LSB (0-15) x PC (0-127),
 * sends a program change, then requests the sound name via SysEx.
 *
 * This takes ~3-5 minutes for all 2048 slots.
 */
export async function scanAllPresets(
  deviceId: string,
  onProgress: (progress: ScanProgress) => void,
  /** Set of "bankMSB-bankLSB-programNumber" keys to skip (already scanned with real names) */
  skipKeys?: Set<string>,
): Promise<SoundPreset[]> {
  const presets: SoundPreset[] = [];

  const totalSlots = SCAN_CONFIGS.reduce(
    (sum, c) => sum + (c.lsbRange[1] - c.lsbRange[0] + 1) * 128, 0,
  );
  let scanned = 0;
  let globalId = 1;

  for (const config of SCAN_CONFIGS) {
    const part = channelToPart(config.channel);

    for (let lsb = config.lsbRange[0]; lsb <= config.lsbRange[1]; lsb++) {
      for (let pc = 0; pc < 128; pc++) {
        scanned++;

        // Skip if already scanned with a real name
        const slotKey = `${config.bankMSB}-${lsb}-${pc}`;
        if (skipKeys?.has(slotKey)) {
          onProgress({ current: scanned, total: totalSlots, currentName: "(cached)", engine: config.engine, channel: config.channel });
          globalId++;
          continue;
        }

        // Send bank select + program change
        sendBankSelect(deviceId, config.channel, config.bankMSB, lsb);
        sendProgramChange(deviceId, config.channel, pc);

        // Re-send CC32 after PC (SEQTRAK quirk)
        const output = getOutputPort(deviceId);
        if (output) {
          output.sendControlChange(32, lsb, { channels: config.channel });
        }

        // Wait for device to load the sound
        await sleep(80);

        // Request sound name via SysEx
        const nameAddr = addrSoundName(part);
        const request = buildParameterRequest(nameAddr);

        // Send and listen for response
        const name = await requestSoundName(deviceId, request, part);

        // Log first few results for debugging
        if (scanned <= 5 || (name && name.trim())) {
          console.log(`[scan] LSB=${lsb} PC=${pc} → "${name ?? "(no response)"}"`);
        }

        if (name && name.trim() && !isEmptyName(name)) {
          const category = classifyByName(name, config.categories, config.engine);

          presets.push({
            id: globalId,
            name: name.trim(),
            category,
            engine: config.engine,
            bankMSB: config.bankMSB,
            bankLSB: lsb,
            programNumber: pc,
          });

          onProgress({
            current: scanned,
            total: totalSlots,
            currentName: name.trim(),
            engine: config.engine,
            channel: config.channel,
          });
        } else {
          // Still report progress even for empty slots
          onProgress({
            current: scanned,
            total: totalSlots,
            currentName: "",
            engine: config.engine,
            channel: config.channel,
          });
        }

        globalId++;
      }
    }
  }

  return presets;
}

// ─── SysEx Response Handling ─────────────────────────────────────

/**
 * Send a SysEx parameter request and listen for the response.
 * The SEQTRAK replies with a Parameter Change message containing the
 * sound name as ASCII bytes in the data portion.
 */
async function requestSoundName(
  deviceId: string,
  sysexRequest: number[],
  part: number,
): Promise<string | null> {
  const output = getOutputPort(deviceId);
  const input = getInputPort(deviceId);
  if (!output) return null;

  // If no input port, we can't receive the response
  if (!input) return null;

  return new Promise<string | null>((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 500);

    // Expected response address for sound name: [0x31, 0x00 + part, 0x00]
    const expectedAddrHi = 0x31;
    const expectedAddrMid = 0x00 + part;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (event: any) => {
      // WebMidi.js sysex event data is a Uint8Array including F0 and F7
      const data: number[] = Array.from(event.message?.data ?? event.data ?? []);

      // Validate this is a Yamaha SEQTRAK parameter change response
      if (
        data.length >= 10 &&
        data[0] === 0xf0 &&
        data[1] === YAMAHA_ID &&
        data[2] === PARAM_CHANGE &&
        data[3] === GROUP_HI &&
        data[4] === GROUP_LO &&
        data[5] === MODEL_ID &&
        data[6] === expectedAddrHi &&
        data[7] === expectedAddrMid
      ) {
        // Extract name bytes (after header + 3-byte address, before F7)
        const nameBytes = data.slice(9, data.length - 1);
        const name = nameBytes
          .filter((b) => b >= 0x20 && b <= 0x7e) // printable ASCII only
          .map((b) => String.fromCharCode(b))
          .join("");

        cleanup();
        clearTimeout(timeout);
        resolve(name || null);
      }
    };

    // WebMidi.js uses addListener for sysex events
    input.addListener("sysex", handler);

    function cleanup() {
      try {
        input.removeListener("sysex", handler);
      } catch {
        // Listener may already be removed
      }
    }

    // Send the request
    output.send(sysexRequest);
  });
}

// ─── Classification Helpers ──────────────────────────────────────

function classifyByName(
  name: string,
  patterns: Record<string, SoundCategory>,
  engine: SoundEngine,
): SoundCategory {
  const lower = name.toLowerCase();
  for (const [pattern, category] of Object.entries(patterns)) {
    if (lower.includes(pattern)) return category;
  }
  // Default by engine
  if (engine === "drum") return "SFX";
  if (engine === "dx") return "SFX";
  return "SFX";
}

function isEmptyName(name: string): boolean {
  return (
    name.trim() === "" ||
    name === "----------" ||
    /^[\s\0]+$/.test(name)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Full Library Generator ─────────────────────────────────────

/**
 * Generate a complete preset library by enumerating all Bank/PC combinations.
 * Overlays known preset names from the built-in library.
 * No device connection needed — instant.
 */
export function generateAllPresets(knownPresets: SoundPreset[]): SoundPreset[] {
  const presets: SoundPreset[] = [];
  let id = 1;

  // Build lookup for known presets
  const knownMap = new Map<string, SoundPreset>();
  for (const p of knownPresets) {
    knownMap.set(`${p.bankMSB}-${p.bankLSB}-${p.programNumber}`, p);
  }

  // Drums: bankMSB=63, LSB 0-5, PC 0-127
  for (let lsb = 0; lsb <= 5; lsb++) {
    for (let pc = 0; pc < 128; pc++) {
      const key = `63-${lsb}-${pc}`;
      const known = knownMap.get(key);
      if (known) {
        presets.push({ ...known, id: id++ });
      } else {
        presets.push({
          id: id++,
          name: `Drum ${String(lsb).padStart(2, "0")}-${String(pc).padStart(3, "0")}`,
          category: inferDrumCategory(lsb, pc),
          engine: "drum",
          bankMSB: 63, bankLSB: lsb, programNumber: pc,
        });
      }
    }
  }

  // AWM2 Synth: LSB 6-14
  for (let lsb = 6; lsb <= 14; lsb++) {
    for (let pc = 0; pc < 128; pc++) {
      const key = `63-${lsb}-${pc}`;
      const known = knownMap.get(key);
      if (known) {
        presets.push({ ...known, id: id++ });
      } else {
        presets.push({
          id: id++,
          name: `Synth ${String(lsb).padStart(2, "0")}-${String(pc).padStart(3, "0")}`,
          category: inferSynthCategory(lsb),
          engine: "awm2",
          bankMSB: 63, bankLSB: lsb, programNumber: pc,
        });
      }
    }
  }

  // DX: LSB 15
  for (let pc = 0; pc < 128; pc++) {
    const key = `63-15-${pc}`;
    const known = knownMap.get(key);
    if (known) {
      presets.push({ ...known, id: id++ });
    } else {
      presets.push({
        id: id++,
        name: `DX ${String(pc).padStart(3, "0")}`,
        category: inferDXCategory(pc),
        engine: "dx",
        bankMSB: 63, bankLSB: 15, programNumber: pc,
      });
    }
  }

  return presets;
}

function inferDrumCategory(lsb: number, pc: number): SoundCategory {
  // Based on existing preset positions in the built-in library:
  if (lsb === 0 && pc < 120) return "Kick";
  if ((lsb === 0 && pc >= 120) || (lsb === 1 && pc < 120)) return "Snare";
  if ((lsb === 1 && pc >= 120) || (lsb === 2 && pc < 60)) return "Clap";
  if (lsb === 2 && pc >= 60 && pc < 128) return "Closed HiHat";
  if (lsb === 3 && pc < 80) return "Closed HiHat";
  if (lsb === 3 && pc >= 80) return "Open HiHat";
  if (lsb === 4) return "Shaker";  // Perc1 range
  if (lsb === 5) return "Crash";   // Perc2 range
  return "Tom";
}

function inferSynthCategory(lsb: number): SoundCategory {
  if (lsb === 6 || lsb === 7) return "Bass";
  if (lsb === 8) return "Piano";
  if (lsb === 9) return "Keyboard";
  if (lsb === 10) return "Pad";
  if (lsb === 11) return "Strings";
  if (lsb === 12) return "Guitar";
  if (lsb === 13) return "Mallet";
  if (lsb === 14) return "Bell";
  return "SFX";
}

function inferDXCategory(pc: number): SoundCategory {
  if (pc < 15) return "Bass";
  if (pc < 30) return "Synth Lead";
  if (pc < 50) return "Piano";
  if (pc < 60) return "Pad";
  if (pc < 95) return "Keyboard";
  if (pc < 110) return "Bell";
  return "SFX";
}

// ─── Storage Helpers ─────────────────────────────────────────────

const STORAGE_KEY = "seqtrack-complete-presets";

/**
 * Save scanned presets to localStorage.
 */
export function saveScannedPresets(presets: SoundPreset[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

/**
 * Load previously scanned presets from localStorage.
 */
export function loadScannedPresets(): SoundPreset[] | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as SoundPreset[];
  } catch {
    return null;
  }
}

/**
 * Clear scanned presets from localStorage.
 */
export function clearScannedPresets(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Download presets as a JSON file for backup/sharing.
 */
export function downloadPresetsAsJSON(presets: SoundPreset[]): void {
  const blob = new Blob([JSON.stringify(presets, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "seqtrak-sound-library.json";
  a.click();
  URL.revokeObjectURL(url);
}
