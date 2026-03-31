/**
 * Arturia MicroFreak SysEx protocol implementation.
 *
 * Based on reverse-engineered protocol from:
 * https://github.com/francoisgeorgy/microfreak-reverse
 *
 * SysEx message format:
 *   F0 00 20 6B 07 01 <seq#> <length> <command> [data...] F7
 *
 * Manufacturer ID: 00 20 6B (Arturia)
 * Device ID: 07 (MicroFreak)
 * Protocol: 01
 *
 * Preset numbering: 0-indexed, 2-byte (bank, preset-in-bank)
 *   Bank 0 = presets 0-127 (Bank A / Factory)
 *   Bank 1 = presets 128-255 (Bank B / User)
 */

import { getInputPort, getOutputPort } from "@/lib/webmidi/midi-connection";

// ─── Constants ──────────────────────────────────────────────────

const SYSEX_START = 0xf0;
const SYSEX_END = 0xf7;
const ARTURIA_ID = [0x00, 0x20, 0x6b];
const DEVICE_ID = 0x07;
const PROTOCOL = 0x01;

// Commands
const CMD_DATA = 0x16;         // Non-final data packet (more to follow)
const CMD_DATA_FINAL = 0x17;   // Final data packet
const CMD_DATA_REQUEST = 0x18; // Request next data packet
const CMD_START_DUMP = 0x19;   // Start preset dump request

// Timing
const RESPONSE_TIMEOUT_MS = 3000;
const PACKET_TIMEOUT_MS = 1000;

// ─── Types ──────────────────────────────────────────────────────

export interface MicroFreakPresetDump {
  /** 0-based preset index (0-255) */
  presetIndex: number;
  /** Bank number: 0=A, 1=B */
  bank: number;
  /** Slot within bank (0-127) */
  slot: number;
  /** Raw data bytes collected from all packets */
  rawData: Uint8Array;
  /** Parsed parameter values (CC number → value 0-127) */
  params: Record<number, number>;
}

/** Mapping of known parameter offsets in the SysEx dump to CC numbers */
const PARAM_OFFSETS: Array<{ offset: number; cc: number; name: string }> = [
  // These offsets are approximate and based on reverse-engineering.
  // The MicroFreak dump encodes values in 15-bit signed format.
  // We extract the most useful parameters by byte position.
  { offset: 14, cc: 9,   name: "Oscillator Type" },
  { offset: 17, cc: 10,  name: "Wave" },
  { offset: 20, cc: 12,  name: "Timbre" },
  { offset: 23, cc: 13,  name: "Shape" },
  { offset: 26, cc: 23,  name: "Filter Cutoff" },
  { offset: 29, cc: 83,  name: "Filter Resonance" },
  { offset: 32, cc: 105, name: "Attack" },
  { offset: 35, cc: 106, name: "Decay" },
  { offset: 38, cc: 29,  name: "Sustain" },
  { offset: 41, cc: 26,  name: "Filter Env Amount" },
  { offset: 44, cc: 93,  name: "LFO Rate" },
  { offset: 47, cc: 107, name: "LFO Shape" },
  { offset: 50, cc: 5,   name: "Glide" },
];

// ─── SysEx Message Builders ─────────────────────────────────────

let _seqNum = 0;
function nextSeq(): number {
  _seqNum = (_seqNum + 1) & 0x7f; // Keep in 7-bit range
  return _seqNum;
}

/**
 * Build SysEx message to start a preset dump.
 * The device responds with the first data packet.
 */
export function buildStartDumpRequest(presetIndex: number): number[] {
  const bank = Math.floor(presetIndex / 128); // 0-3 for banks A-D (512 slots)
  const slot = presetIndex % 128;
  const seq = nextSeq();

  return [
    SYSEX_START,
    ...ARTURIA_ID,
    DEVICE_ID,
    PROTOCOL,
    seq,
    0x01,            // length byte
    CMD_START_DUMP,
    bank,
    slot,
    0x01,            // read mode
    SYSEX_END,
  ];
}

/**
 * Build SysEx message to request the next data packet.
 */
export function buildDataRequest(): number[] {
  const seq = nextSeq();
  return [
    SYSEX_START,
    ...ARTURIA_ID,
    DEVICE_ID,
    PROTOCOL,
    seq,
    0x01,
    CMD_DATA_REQUEST,
    0x00,
    SYSEX_END,
  ];
}

// ─── Response Parser ────────────────────────────────────────────

interface SysExPacket {
  command: number;
  data: number[];
  seqNum: number;
}

/**
 * Parse an incoming SysEx message from the MicroFreak.
 * Returns null if the message is not a MicroFreak response.
 */
function parseSysExResponse(data: Uint8Array | number[]): SysExPacket | null {
  const bytes = data instanceof Uint8Array ? Array.from(data) : data;

  // Minimum length: F0 + 3 mfr + device + protocol + seq + len + cmd + F7 = 10
  if (bytes.length < 10) return null;
  if (bytes[0] !== SYSEX_START) return null;
  if (bytes[1] !== ARTURIA_ID[0] || bytes[2] !== ARTURIA_ID[1] || bytes[3] !== ARTURIA_ID[2]) return null;
  if (bytes[4] !== DEVICE_ID) return null;
  if (bytes[5] !== PROTOCOL) return null;

  const seqNum = bytes[6];
  // bytes[7] is data length
  const command = bytes[8];
  const payload = bytes.slice(9, bytes.length - 1); // Strip F7

  return { command, data: payload, seqNum };
}

/**
 * Decode a 15-bit signed value from 3 bytes (MSB, LSB, msb).
 * Returns a value in 0-127 range (scaled from 0-32768).
 */
function decode15bit(msb: number, lsb: number, msbBit: number): number {
  const raw = (msb << 8) + (msbBit << 7) + lsb;
  // Scale from 0-32768 to 0-127
  return Math.round((raw / 32768) * 127);
}

/**
 * Extract known parameters from raw preset dump data.
 */
function extractParams(rawData: Uint8Array): Record<number, number> {
  const params: Record<number, number> = {};

  for (const { offset, cc } of PARAM_OFFSETS) {
    if (offset + 2 < rawData.length) {
      const value = decode15bit(rawData[offset], rawData[offset + 1], rawData[offset + 2]);
      params[cc] = Math.max(0, Math.min(127, value));
    }
  }

  return params;
}

// ─── Preset Read Function ───────────────────────────────────────

/**
 * Read a preset from the connected MicroFreak device via SysEx.
 *
 * @param deviceId - The MIDI output device ID
 * @param presetIndex - 0-based preset index (0-255)
 * @returns Parsed preset data, or null if read fails/times out
 */
export async function readPresetFromDevice(
  deviceId: string,
  presetIndex: number,
): Promise<MicroFreakPresetDump | null> {
  const output = getOutputPort(deviceId);
  const input = getInputPort(deviceId);
  if (!output || !input) return null;

  return new Promise((resolve) => {
    const collectedData: number[] = [];
    let resolved = false;
    let packetTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (packetTimer) clearTimeout(packetTimer);
      try {
        input.removeListener("sysex", sysexHandler);
      } catch { /* already removed */ }
    };

    const finish = (success: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup();

      if (!success || collectedData.length === 0) {
        resolve(null);
        return;
      }

      const rawData = new Uint8Array(collectedData);
      const bank = presetIndex > 127 ? 1 : 0;
      const slot = presetIndex % 128;

      resolve({
        presetIndex,
        bank,
        slot,
        rawData,
        params: extractParams(rawData),
      });
    };

    // Reset packet timer for each incoming packet
    const resetPacketTimer = () => {
      if (packetTimer) clearTimeout(packetTimer);
      packetTimer = setTimeout(() => finish(collectedData.length > 0), PACKET_TIMEOUT_MS);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sysexHandler = (event: any) => {
      // WebMidi.js v3 provides raw data in event.message.data or event.data
      const rawBytes = event.message?.data ?? event.data ?? event.rawData;
      if (!rawBytes) return;

      const packet = parseSysExResponse(rawBytes);
      if (!packet) return;

      if (packet.command === CMD_DATA || packet.command === CMD_DATA_FINAL) {
        collectedData.push(...packet.data);

        if (packet.command === CMD_DATA_FINAL) {
          // All data received
          finish(true);
        } else {
          // More data available — request next packet
          resetPacketTimer();
          output.send(buildDataRequest());
        }
      }
    };

    // Listen for SysEx responses
    input.addListener("sysex", sysexHandler);

    // Set overall timeout
    setTimeout(() => finish(collectedData.length > 0), RESPONSE_TIMEOUT_MS);

    // Send the start dump request
    output.send(buildStartDumpRequest(presetIndex));

    // Start packet timer
    resetPacketTimer();
  });
}

// ─── Parameter Label Helpers ────────────────────────────────────

const OSC_TYPES: Record<number, string> = {
  10: "BasicWaves", 21: "SuperWave", 32: "WaveTable", 42: "Harmo",
  53: "KarplusStr", 64: "V.Analog", 74: "WaveShaper", 85: "TwoOpFM",
  95: "Formant", 106: "Chords", 117: "Speech", 127: "Modal",
};

/**
 * Get a human-readable label for an oscillator type value.
 */
export function getOscTypeName(value: number): string {
  // Find the closest known type
  let closest = "Unknown";
  let minDist = Infinity;
  for (const [v, name] of Object.entries(OSC_TYPES)) {
    const dist = Math.abs(Number(v) - value);
    if (dist < minDist) {
      minDist = dist;
      closest = name;
    }
  }
  return closest;
}

/**
 * Get all known parameter definitions for display.
 */
export function getParamDefinitions(): Array<{ cc: number; name: string }> {
  return PARAM_OFFSETS.map(({ cc, name }) => ({ cc, name }));
}
