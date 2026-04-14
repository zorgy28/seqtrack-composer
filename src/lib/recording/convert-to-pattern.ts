// ---------------------------------------------------------------------------
// Convert to Pattern — Turn a recorded MIDI selection into step-sequencer
// patterns mapped to SEQTRAK channels.
// ---------------------------------------------------------------------------

import type {
  RecordedMidiEvent,
  ConvertToPatternOptions,
  PairedNote,
} from "./types";
import type { SeqtrackChannel, Pattern } from "@/lib/midi/types";
import type { RawMidiEvent } from "@/lib/transcription/types";
import { detectBars, quantizeEvents } from "@/lib/transcription/quantize";
import { createEmptyPattern } from "@/lib/midi/pattern-generators";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { pairMidiNotes } from "./session-editor";

/**
 * Convert a selection of recorded MIDI events into step-sequencer Patterns
 * for the SEQTRAK.
 *
 * Steps:
 * 1. Filter events to the selection range [startMs, endMs].
 * 2. Pair noteon/noteoff events into PairedNote objects.
 * 3. Group by MIDI channel.
 * 4. Map each MIDI channel to a SeqtrackChannel via the provided channelMap.
 * 5. Convert PairedNote[] to RawMidiEvent[] (seconds-based).
 * 6. Detect bar count (or use the explicit value from options).
 * 7. Quantize each channel's events to the step grid.
 * 8. Return a Map of SeqtrackChannel to Pattern.
 */
export function convertSelectionToPatterns(
  midiEvents: RecordedMidiEvent[],
  options: ConvertToPatternOptions,
): Map<SeqtrackChannel, Pattern> {
  const { startMs, endMs, bpm, bars: requestedBars, channelMap } = options;

  // ---- 1. Filter to selection range ------------------------------------
  const filtered = midiEvents.filter(
    (e) => e.timestamp >= startMs && e.timestamp <= endMs,
  );

  // ---- 2. Pair noteon/noteoff → PairedNote -----------------------------
  const pairedNotes = pairMidiNotes(filtered);

  if (pairedNotes.length === 0) {
    return new Map();
  }

  // ---- 3. Group by MIDI channel ----------------------------------------
  const byChannel = new Map<number, PairedNote[]>();

  for (const note of pairedNotes) {
    const group = byChannel.get(note.channel);
    if (group) {
      group.push(note);
    } else {
      byChannel.set(note.channel, [note]);
    }
  }

  // ---- 4 + 5 + 6 + 7 + 8. Per-channel conversion ----------------------
  const result = new Map<SeqtrackChannel, Pattern>();

  for (const [midiChannel, notes] of byChannel) {
    // 4. Map to SeqtrackChannel — skip channels without a mapping.
    const seqtrackChannel = channelMap.get(midiChannel);
    if (seqtrackChannel === undefined) continue;

    // 5. Convert PairedNote[] → RawMidiEvent[] (seconds relative to selection start).
    const rawEvents: RawMidiEvent[] = notes.map((pn) => ({
      pitch: pn.pitch,
      start: (pn.startMs - startMs) / 1000,
      end: (pn.endMs - startMs) / 1000,
      velocity: pn.velocity,
      confidence: 1,
    }));

    // 6. Determine bar count.
    const bars = requestedBars > 0 ? requestedBars : detectBars(rawEvents, bpm);

    // 7. Quantize to step grid.
    const quantizedNotes = quantizeEvents(rawEvents, bpm, bars);

    // 8. Build Pattern.
    const trackInfo = SEQTRAK_TRACKS[seqtrackChannel];
    const channelName = trackInfo?.name ?? `Channel ${seqtrackChannel}`;
    const pattern = createEmptyPattern(channelName, bars);

    // If this SeqtrackChannel already has a pattern (multiple MIDI channels
    // mapped to the same target), merge the notes.
    const existing = result.get(seqtrackChannel);
    if (existing) {
      result.set(seqtrackChannel, {
        ...existing,
        bars: Math.max(existing.bars, bars),
        notes: [...existing.notes, ...quantizedNotes],
      });
    } else {
      result.set(seqtrackChannel, {
        ...pattern,
        notes: quantizedNotes,
      });
    }
  }

  return result;
}
