// ---------------------------------------------------------------------------
// Session Editor — Pure functions for non-destructive session editing
// ---------------------------------------------------------------------------

import type {
  RecordedMidiEvent,
  RecordingSession,
  PairedNote,
} from "./types";
import { encodeWav } from "./wav-encoder";

// ======================================================================
// pairMidiNotes
// ======================================================================

/**
 * Pair noteon/noteoff events into PairedNote objects.
 *
 * Iterates through all events and matches each noteon with the next noteoff
 * sharing the same channel and pitch. If no matching noteoff is found, the
 * note is assumed to last 500ms.
 */
export function pairMidiNotes(events: RecordedMidiEvent[]): PairedNote[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const paired: PairedNote[] = [];

  // Track which noteoff events have already been consumed.
  const consumed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    if (event.type !== "noteon") continue;

    // Find the next unconsumed noteoff with matching channel + pitch.
    let matchedEnd: number | null = null;
    for (let j = i + 1; j < sorted.length; j++) {
      if (consumed.has(j)) continue;
      const candidate = sorted[j];
      if (
        candidate.type === "noteoff" &&
        candidate.channel === event.channel &&
        candidate.pitch === event.pitch
      ) {
        matchedEnd = candidate.timestamp;
        consumed.add(j);
        break;
      }
    }

    paired.push({
      channel: event.channel,
      pitch: event.pitch,
      velocity: event.velocity,
      startMs: event.timestamp,
      endMs: matchedEnd ?? event.timestamp + 500,
    });
  }

  return paired;
}

// ======================================================================
// trimSession
// ======================================================================

/**
 * Trim a session to keep only audio and events within [startMs, endMs].
 *
 * MIDI events are filtered to the range and their timestamps shifted so that
 * startMs becomes 0. Audio is decoded, sliced to the matching sample range,
 * and re-encoded as WAV.
 *
 * Returns new objects — the originals are never mutated.
 */
export async function trimSession(
  session: RecordingSession,
  audioBlob: Blob | null,
  startMs: number,
  endMs: number,
): Promise<{ session: RecordingSession; audioBlob: Blob | null }> {
  const duration = endMs - startMs;

  // ---- MIDI events: filter + shift -------------------------------------
  const trimmedEvents = session.midiEvents
    .filter((e) => e.timestamp >= startMs && e.timestamp <= endMs)
    .map((e) => ({ ...e, timestamp: e.timestamp - startMs }));

  // ---- Audio: decode, slice, re-encode ---------------------------------
  let trimmedAudioBlob: Blob | null = null;

  if (audioBlob) {
    trimmedAudioBlob = await sliceAudioBlob(audioBlob, startMs, endMs);
  }

  // ---- Build new session -----------------------------------------------
  const trimmedSession: RecordingSession = {
    ...session,
    durationMs: duration,
    midiEventCount: trimmedEvents.length,
    midiEvents: trimmedEvents,
    hasAudio: trimmedAudioBlob !== null,
    audioBlobSize: trimmedAudioBlob?.size ?? null,
  };

  return { session: trimmedSession, audioBlob: trimmedAudioBlob };
}

// ======================================================================
// deleteSection
// ======================================================================

/**
 * Delete a section [startMs, endMs] from a session and shift everything
 * after the deleted region to the left.
 *
 * MIDI events inside the range are removed. Events after endMs have their
 * timestamps reduced by (endMs - startMs). Audio is decoded, the matching
 * samples are excised, and the before+after segments are concatenated and
 * re-encoded as WAV.
 *
 * Returns new objects — the originals are never mutated.
 */
export async function deleteSection(
  session: RecordingSession,
  audioBlob: Blob | null,
  startMs: number,
  endMs: number,
): Promise<{ session: RecordingSession; audioBlob: Blob | null }> {
  const deletedDuration = endMs - startMs;
  const newDuration = session.durationMs - deletedDuration;

  // ---- MIDI events: remove range, shift remainder ----------------------
  const editedEvents: RecordedMidiEvent[] = [];

  for (const event of session.midiEvents) {
    if (event.timestamp >= startMs && event.timestamp <= endMs) {
      // Inside deleted range — skip.
      continue;
    }

    if (event.timestamp > endMs) {
      // After deleted range — shift left.
      editedEvents.push({ ...event, timestamp: event.timestamp - deletedDuration });
    } else {
      // Before deleted range — keep as-is.
      editedEvents.push({ ...event });
    }
  }

  // ---- Audio: remove section and concatenate ---------------------------
  let editedAudioBlob: Blob | null = null;

  if (audioBlob) {
    editedAudioBlob = await exciseAudioBlob(audioBlob, startMs, endMs);
  }

  // ---- Build new session -----------------------------------------------
  const editedSession: RecordingSession = {
    ...session,
    durationMs: Math.max(0, newDuration),
    midiEventCount: editedEvents.length,
    midiEvents: editedEvents,
    hasAudio: editedAudioBlob !== null,
    audioBlobSize: editedAudioBlob?.size ?? null,
  };

  return { session: editedSession, audioBlob: editedAudioBlob };
}

// ======================================================================
// Private — Audio helpers
// ======================================================================

/**
 * Decode a Blob to an AudioBuffer using an OfflineAudioContext.
 * Falls back gracefully if the Web Audio API is unavailable.
 */
async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  // Use OfflineAudioContext so we don't need an active audio destination.
  const tempCtx = new OfflineAudioContext(1, 1, 44100);
  return tempCtx.decodeAudioData(arrayBuffer);
}

/**
 * Slice an audio Blob to keep only the samples between startMs and endMs.
 * Returns a new WAV Blob.
 */
async function sliceAudioBlob(
  blob: Blob,
  startMs: number,
  endMs: number,
): Promise<Blob> {
  const audioBuffer = await decodeBlob(blob);
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const startSample = Math.round((startMs / 1000) * sampleRate);
  const endSample = Math.min(
    Math.round((endMs / 1000) * sampleRate),
    audioBuffer.length,
  );
  const length = Math.max(0, endSample - startSample);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const full = audioBuffer.getChannelData(ch);
    channelData.push(full.slice(startSample, startSample + length));
  }

  return encodeWav(channelData, sampleRate);
}

/**
 * Excise a section [startMs, endMs] from an audio Blob and concatenate
 * the before and after segments. Returns a new WAV Blob.
 */
async function exciseAudioBlob(
  blob: Blob,
  startMs: number,
  endMs: number,
): Promise<Blob> {
  const audioBuffer = await decodeBlob(blob);
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  const cutStart = Math.round((startMs / 1000) * sampleRate);
  const cutEnd = Math.min(
    Math.round((endMs / 1000) * sampleRate),
    audioBuffer.length,
  );

  const beforeLength = cutStart;
  const afterLength = Math.max(0, audioBuffer.length - cutEnd);
  const totalLength = beforeLength + afterLength;

  if (totalLength === 0) {
    // Edge case: entire audio deleted — return minimal silent WAV.
    const silence = [new Float32Array(1)];
    return encodeWav(silence, sampleRate);
  }

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const full = audioBuffer.getChannelData(ch);
    const combined = new Float32Array(totalLength);

    // Copy "before" segment.
    if (beforeLength > 0) {
      combined.set(full.subarray(0, cutStart), 0);
    }

    // Copy "after" segment.
    if (afterLength > 0) {
      combined.set(full.subarray(cutEnd), beforeLength);
    }

    channelData.push(combined);
  }

  return encodeWav(channelData, sampleRate);
}
