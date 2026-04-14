import type { SeqtrackChannel, ChannelTestResult } from "@/lib/midi/types";
import { ALL_CHANNELS, SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { sendNote } from "./midi-sender";

const TEST_VELOCITY = 100;
const TEST_DURATION_MS = 200;
const DELAY_BETWEEN_CHANNELS_MS = 300;

// Inline profile type to avoid Turbopack circular deps
type ProfileLike = { tracks?: Array<{ name: string; channel: number; defaultPitch?: number }> };

/**
 * Run a per-track test sequence.
 * When a profile is provided, tests each profile track with its defaultPitch.
 * Otherwise falls back to SEQTRAK channels with note C3.
 */
export async function runConnectionTest(
  deviceId: string,
  onProgress: (result: ChannelTestResult) => void,
  profile?: ProfileLike,
): Promise<ChannelTestResult[]> {
  const results: ChannelTestResult[] = [];

  if (profile?.tracks) {
    for (const track of profile.tracks) {
      const pitch = track.defaultPitch ?? 60;

      onProgress({
        channel: track.channel,
        trackName: track.name,
        status: "testing",
        timestamp: null,
      });

      await sleep(50);

      try {
        sendNote(deviceId, track.channel, pitch, TEST_VELOCITY, TEST_DURATION_MS);
        const result: ChannelTestResult = {
          channel: track.channel,
          trackName: track.name,
          status: "sent",
          timestamp: Date.now(),
        };
        results.push(result);
        onProgress(result);
      } catch {
        const result: ChannelTestResult = {
          channel: track.channel,
          trackName: track.name,
          status: "error",
          timestamp: Date.now(),
        };
        results.push(result);
        onProgress(result);
      }

      await sleep(DELAY_BETWEEN_CHANNELS_MS);
    }
  } else {
    // SEQTRAK fallback
    for (const channel of ALL_CHANNELS) {
      const trackInfo = SEQTRAK_TRACKS[channel];

      onProgress({
        channel,
        trackName: trackInfo.name,
        status: "testing",
        timestamp: null,
      });

      await sleep(50);

      try {
        sendNote(deviceId, channel, 60, TEST_VELOCITY, TEST_DURATION_MS);
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

      await sleep(DELAY_BETWEEN_CHANNELS_MS);
    }
  }

  return results;
}

/**
 * Test a single channel/track.
 * When a profile is provided, uses the track's defaultPitch.
 */
export function testSingleChannel(
  deviceId: string,
  channel: SeqtrackChannel,
  profile?: ProfileLike,
): ChannelTestResult {
  const track = profile?.tracks?.find(t => t.channel === channel);
  const pitch = track?.defaultPitch ?? 60;
  const trackName = track?.name ?? SEQTRAK_TRACKS[channel]?.name ?? `Ch ${channel}`;

  try {
    sendNote(deviceId, channel, pitch, TEST_VELOCITY, TEST_DURATION_MS);
    return {
      channel,
      trackName,
      status: "sent",
      timestamp: Date.now(),
    };
  } catch {
    return {
      channel,
      trackName,
      status: "error",
      timestamp: Date.now(),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
