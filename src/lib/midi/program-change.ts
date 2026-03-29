import type { SoundPreset, SeqtrackChannel } from "./types";

// Use inline shape to avoid circular dependency with @/lib/devices/types
type ProfileLike = { programChange: { sendSequence: (output: any, channel: number, bankMSB: number, bankLSB: number, program: number) => void } };
import { getOutputPort } from "@/lib/webmidi/midi-connection";

/**
 * Select a sound on the connected device via Bank Select + Program Change.
 *
 * When a ProfileLike is provided, uses its programChange.sendSequence strategy.
 * Otherwise falls back to the SEQTRAK quirk (CC0 → CC32 → PC → CC32 re-send).
 *
 * SEQTRAK quirk source: SEQTRAK Data List V2.00, page 117.
 */
export function selectSound(
  deviceId: string,
  channel: SeqtrackChannel,
  preset: SoundPreset,
  profile?: ProfileLike,
): void {
  const output = getOutputPort(deviceId);
  if (!output) return;

  if (profile) {
    profile.programChange.sendSequence(output, channel, preset.bankMSB, preset.bankLSB, preset.programNumber);
    return;
  }

  // SEQTRAK default: CC0 → CC32 → PC → CC32 (re-send quirk)
  output.sendControlChange(0, preset.bankMSB, { channels: channel });
  output.sendControlChange(32, preset.bankLSB, { channels: channel });
  output.sendProgramChange(preset.programNumber, { channels: channel });
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
