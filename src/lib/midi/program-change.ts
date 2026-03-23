import type { SoundPreset, SeqtrackChannel } from "./types";
import { getOutputPort } from "@/lib/webmidi/midi-connection";

/**
 * Select a sound on the SEQTRAK via Bank Select + Program Change.
 *
 * CRITICAL SEQTRAK QUIRK: The device requires the Bank Select LSB (CC32)
 * to be re-sent AFTER the Program Change message for the change to take effect.
 * Sequence: CC0 → CC32 → PC → CC32 (again)
 *
 * Source: SEQTRAK Data List V2.00, page 117.
 */
export function selectSound(
  deviceId: string,
  channel: SeqtrackChannel,
  preset: SoundPreset,
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;

  // Step 1: Bank Select MSB (CC0)
  output.sendControlChange(0, preset.bankMSB, { channels: channel });

  // Step 2: Bank Select LSB (CC32)
  output.sendControlChange(32, preset.bankLSB, { channels: channel });

  // Step 3: Program Change
  output.sendProgramChange(preset.programNumber, { channels: channel });

  // Step 4: Re-send Bank Select LSB to trigger the actual change (SEQTRAK quirk)
  output.sendControlChange(32, preset.bankLSB, { channels: channel });
}

/**
 * Select a project on the SEQTRAK (0-7 = Projects 1-8).
 * MSB=64, LSB=0, PC=0-7.
 */
export function selectProject(
  deviceId: string,
  projectNumber: number,
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;

  output.sendControlChange(0, 64, { channels: 1 });
  output.sendControlChange(32, 0, { channels: 1 });
  output.sendProgramChange(projectNumber, { channels: 1 });
  output.sendControlChange(32, 0, { channels: 1 });
}
