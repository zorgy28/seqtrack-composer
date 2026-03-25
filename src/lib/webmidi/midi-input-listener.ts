import type { SeqtrackChannel } from "@/lib/midi/types";
import { getInputPort } from "./midi-connection";

type SoundChangeCallback = (
  channel: SeqtrackChannel,
  bankMSB: number,
  bankLSB: number,
  programNumber: number,
) => void;

/**
 * Listen for incoming sound changes from the SEQTRAK.
 * Correlates Bank Select (CC0 + CC32) with Program Change events.
 * Returns a cleanup function.
 */
export function listenForSoundChanges(
  deviceId: string,
  onSoundChange: SoundChangeCallback,
): () => void {
  const input = getInputPort(deviceId);
  if (!input) return () => {};

  // Track pending Bank Select per channel
  const bankState: Record<number, { msb: number; lsb: number }> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ccHandler = (event: any) => {
    const channel = event.message?.channel ?? event.channel;
    const cc = event.controller?.number ?? 0;
    // WebMidi.js v3 normalizes values to 0-1 for CC
    const rawValue = event.rawValue ?? event.value ?? 0;
    const value = typeof rawValue === "number" && rawValue <= 1 ? Math.round(rawValue * 127) : rawValue;

    if (!bankState[channel]) bankState[channel] = { msb: 0, lsb: 0 };

    if (cc === 0) {
      bankState[channel].msb = value;
    } else if (cc === 32) {
      bankState[channel].lsb = value;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pcHandler = (event: any) => {
    const channel = event.message?.channel ?? event.channel;
    const rawValue = event.rawValue ?? event.value ?? 0;
    const pc = typeof rawValue === "number" && rawValue <= 1 ? Math.round(rawValue * 127) : rawValue;

    const msb = bankState[channel]?.msb ?? 0;
    const lsb = bankState[channel]?.lsb ?? 0;

    // Validate channel is in SEQTRAK range 1-11
    if (channel >= 1 && channel <= 11) {
      onSoundChange(channel as SeqtrackChannel, msb, lsb, pc);
    }
  };

  input.addListener("controlchange", ccHandler);
  input.addListener("programchange", pcHandler);

  return () => {
    try {
      input.removeListener("controlchange", ccHandler);
      input.removeListener("programchange", pcHandler);
    } catch { /* already removed */ }
  };
}
