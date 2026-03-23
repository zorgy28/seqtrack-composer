import type { SeqtrackChannel, ChannelTestResult } from "@/lib/midi/types";
import { ALL_CHANNELS, SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { sendNote } from "./midi-sender";

const TEST_NOTE = 60; // C3
const TEST_VELOCITY = 100;
const TEST_DURATION_MS = 200;
const DELAY_BETWEEN_CHANNELS_MS = 300;

/**
 * Run a per-channel test sequence.
 * Sends a test note on each of the 11 SEQTRAK channels sequentially.
 * Calls onProgress after each channel for live UI updates.
 */
export async function runConnectionTest(
  deviceId: string,
  onProgress: (result: ChannelTestResult) => void,
): Promise<ChannelTestResult[]> {
  const results: ChannelTestResult[] = [];

  for (const channel of ALL_CHANNELS) {
    const trackInfo = SEQTRAK_TRACKS[channel];

    // Signal testing state
    onProgress({
      channel,
      trackName: trackInfo.name,
      status: "testing",
      timestamp: null,
    });

    // Small delay for UI to update
    await sleep(50);

    try {
      sendNote(deviceId, channel, TEST_NOTE, TEST_VELOCITY, TEST_DURATION_MS);

      const result: ChannelTestResult = {
        channel,
        trackName: trackInfo.name,
        status: "sent",
        timestamp: Date.now(),
      };

      results.push(result);
      onProgress(result);
    } catch {
      const result: ChannelTestResult = {
        channel,
        trackName: trackInfo.name,
        status: "error",
        timestamp: Date.now(),
      };

      results.push(result);
      onProgress(result);
    }

    // Wait between channels so sounds don't overlap
    await sleep(DELAY_BETWEEN_CHANNELS_MS);
  }

  return results;
}

/**
 * Test a single channel.
 */
export function testSingleChannel(
  deviceId: string,
  channel: SeqtrackChannel,
): ChannelTestResult {
  try {
    sendNote(deviceId, channel, TEST_NOTE, TEST_VELOCITY, TEST_DURATION_MS);
    return {
      channel,
      trackName: SEQTRAK_TRACKS[channel].name,
      status: "sent",
      timestamp: Date.now(),
    };
  } catch {
    return {
      channel,
      trackName: SEQTRAK_TRACKS[channel].name,
      status: "error",
      timestamp: Date.now(),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
