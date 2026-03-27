/**
 * Yamaha SEQTRAK SysEx message builders.
 * Source: SEQTRAK Data List V2.00.
 *
 * SysEx format:
 *   F0 43 1n 7F 1C 0C [addr_hi] [addr_mid] [addr_lo] [data...] F7
 *
 * Where:
 *   F0 = SysEx start
 *   43 = Yamaha manufacturer ID
 *   1n = Parameter Change (n = device number, typically 0)
 *   7F 1C = Group Number (SEQTRAK family)
 *   0C = Model ID (SEQTRAK)
 *   addr = 3-byte parameter address
 *   data = 7-bit parameter values
 *   F7 = SysEx end
 *
 * No checksum needed for Parameter Change messages.
 */

const SYSEX_START = 0xf0;
const SYSEX_END = 0xf7;
const YAMAHA_ID = 0x43;
const GROUP_HI = 0x7f;
const GROUP_LO = 0x1c;
const MODEL_ID = 0x0c;

// Message type prefixes (combined with device number 0)
const PARAM_CHANGE = 0x10; // 1n where n=0
const PARAM_REQUEST = 0x30; // 3n where n=0

// ─── Parameter Address Constants ────────────────────────────────

/** Sound Common parameters (p = part number 0-10) */
export function addrSoundName(part: number): [number, number, number] {
  return [0x31, 0x00 + part, 0x00];
}

export function addrSoundCommon(part: number): [number, number, number] {
  return [0x31, 0x10 + part, 0x00];
}

// ─── Message Builders ───────────────────────────────────────────

/**
 * Build a Parameter Change SysEx message.
 * No checksum needed.
 */
export function buildParameterChange(
  address: readonly [number, number, number],
  data: number[],
): number[] {
  return [
    SYSEX_START,
    YAMAHA_ID,
    PARAM_CHANGE,
    GROUP_HI,
    GROUP_LO,
    MODEL_ID,
    ...address,
    ...data,
    SYSEX_END,
  ];
}

/**
 * Build a Parameter Request SysEx message.
 */
export function buildParameterRequest(
  address: readonly [number, number, number],
): number[] {
  return [
    SYSEX_START,
    YAMAHA_ID,
    PARAM_REQUEST,
    GROUP_HI,
    GROUP_LO,
    MODEL_ID,
    ...address,
    SYSEX_END,
  ];
}

// ─── Convenience Functions ──────────────────────────────────────

/** Channel (1-11) to part number (0-10) */
export function channelToPart(channel: number): number {
  return channel - 1;
}
