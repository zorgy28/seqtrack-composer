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
const BULK_REQUEST = 0x20; // 2n where n=0
const PARAM_REQUEST = 0x30; // 3n where n=0

// ─── Parameter Address Constants ────────────────────────────────

/** System parameters */
export const ADDR_SYSTEM = [0x00, 0x00, 0x00] as const;

/** Project common parameters */
export const ADDR_PROJECT_COMMON = [0x30, 0x40, 0x00] as const;
export const ADDR_SEND_REVERB = [0x30, 0x41, 0x00] as const;
export const ADDR_SEND_DELAY = [0x30, 0x42, 0x00] as const;
export const ADDR_MASTER_EQ = [0x30, 0x47, 0x00] as const;

/** Track parameters (p = part number 0-10) */
export function addrTrackGeneral(part: number): [number, number, number] {
  return [0x30, 0x50 + part, 0x00];
}

/** Sound Common parameters (p = part number 0-10) */
export function addrSoundName(part: number): [number, number, number] {
  return [0x31, 0x00 + part, 0x00];
}

export function addrSoundCommon(part: number): [number, number, number] {
  return [0x31, 0x10 + part, 0x00];
}

export function addrSoundInsertionA(part: number): [number, number, number] {
  return [0x31, 0x20 + part, 0x00];
}

export function addrSoundInsertionB(part: number): [number, number, number] {
  return [0x31, 0x30 + part, 0x00];
}

export function addrSoundLFO(part: number): [number, number, number] {
  return [0x31, 0x40 + part, 0x00];
}

/** AWM2 Element parameters (e = element 0-7, p = part 0-10) */
export function addrAWMOscillator(element: number, part: number): [number, number, number] {
  return [0x41, (element << 4) | part, 0x00];
}

export function addrAWMFilter(element: number, part: number): [number, number, number] {
  return [0x42, (element << 4) | part, 0x00];
}

/** DX Common parameters */
export const ADDR_DX_COMMON = [0x48, 0x09, 0x00] as const;

/** DX Operator parameters (o = operator 0-3) */
export function addrDXOperator(operator: number): [number, number, number] {
  return [0x49, (operator << 4) | 0x09, 0x00];
}

/** Sampler parameters (e = element 0-6) */
export function addrSampler(element: number): [number, number, number] {
  return [0x50, (element << 4) | 0x0a, 0x00];
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

/**
 * Build a Bulk Dump Request SysEx message.
 *
 * Object types:
 *   "project"  → 11 00 00
 *   "sound"    → 11 02 nn (nn = part number 0-10)
 *   "sampler"  → 11 04 00
 */
export function buildBulkDumpRequest(
  objectType: "project" | "sound" | "sampler",
  partNumber = 0,
): number[] {
  let address: [number, number, number];

  switch (objectType) {
    case "project":
      address = [0x11, 0x00, 0x00];
      break;
    case "sound":
      address = [0x11, 0x02, partNumber & 0x7f];
      break;
    case "sampler":
      address = [0x11, 0x04, 0x00];
      break;
  }

  return [
    SYSEX_START,
    YAMAHA_ID,
    BULK_REQUEST,
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

/** Set a single Sound Common parameter */
export function buildSoundCommonParam(
  channel: number,
  offset: number,
  value: number,
): number[] {
  const part = channelToPart(channel);
  const addr = addrSoundCommon(part);
  return buildParameterChange(
    [addr[0], addr[1], addr[2] + offset],
    [value & 0x7f],
  );
}

/** Set DX Algorithm (0-11) */
export function buildDXAlgorithm(algorithm: number): number[] {
  return buildParameterChange(ADDR_DX_COMMON, [algorithm & 0x0f]);
}

/** Set DX Operator parameter */
export function buildDXOperatorParam(
  operator: number,
  offset: number,
  value: number,
): number[] {
  const addr = addrDXOperator(operator);
  return buildParameterChange(
    [addr[0], addr[1], addr[2] + offset],
    [value & 0x7f],
  );
}
