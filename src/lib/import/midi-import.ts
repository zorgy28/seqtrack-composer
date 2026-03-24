import { Midi } from "@tonejs/midi";
import type { ImportResult, ImportedNote } from "./types";

/**
 * Parse a Standard MIDI File (.mid / .smf) from an ArrayBuffer.
 *
 * Drum tracks (GM channel 10 = index 9) are mapped to SEQTRAK channels 1-7
 * using the GM drum note mapping. Melodic tracks are assigned to channels
 * 8-11 round-robin based on track index.
 */
export function parseMidiFile(arrayBuffer: ArrayBuffer): ImportResult {
  const midi = new Midi(arrayBuffer);
  const notes: ImportedNote[] = [];
  const channels = new Set<number>();

  for (const track of midi.tracks) {
    // Tone.js Midi uses 0-indexed channels; GM drums = channel index 9
    const isDrum = track.channel === 9;

    for (const note of track.notes) {
      if (isDrum) {
        // Map GM drum notes to SEQTRAK channels 1-7
        const ch = gmDrumToSeqtrack(note.midi);
        notes.push({
          pitch: 60, // drums always use pitch 60 on SEQTRAK
          velocity: Math.round(note.velocity * 127),
          time: note.time,
          duration: note.duration,
          channel: ch,
        });
        channels.add(ch);
      } else {
        // Melodic: assign to ch 8-11 based on track index
        const trackIndex = midi.tracks.indexOf(track);
        const ch = Math.min(11, 8 + (trackIndex % 4)) as number;
        notes.push({
          pitch: note.midi,
          velocity: Math.round(note.velocity * 127),
          time: note.time,
          duration: note.duration,
          channel: ch,
        });
        channels.add(ch);
      }
    }
  }

  return {
    notes,
    bpm: midi.header.tempos[0]?.bpm,
    name: midi.name || undefined,
    channels: Array.from(channels).sort((a, b) => a - b),
  };
}

// ---- GM drum note -> SEQTRAK channel mapping ----------------------------

/**
 * Map a General MIDI drum note number to a SEQTRAK channel (1-7).
 *
 * Grouping follows GM percussion map conventions:
 *   35-36 Kick         -> ch 1
 *   37-38,40 Snare/Rim -> ch 2
 *   39 Clap            -> ch 3
 *   42,44 Closed HH    -> ch 4
 *   46 Open HH         -> ch 5
 *   51,53,59 Ride       -> ch 6
 *   49,52,55,57 Crash   -> ch 7
 *   41-50 Toms          -> ch 7
 *   other              -> ch 6 (Perc1)
 */
function gmDrumToSeqtrack(gmNote: number): number {
  // Kick drums
  if (gmNote === 35 || gmNote === 36) return 1;
  // Snare / Side Stick
  if (gmNote === 38 || gmNote === 40) return 2;
  if (gmNote === 37) return 2; // Side Stick -> Snare
  // Clap
  if (gmNote === 39) return 3;
  // Closed Hi-Hat
  if (gmNote === 42 || gmNote === 44) return 4;
  // Open Hi-Hat
  if (gmNote === 46) return 5;
  // Toms -> Perc2
  if (gmNote >= 41 && gmNote <= 50) return 7;
  // Ride -> Perc1
  if (gmNote === 51 || gmNote === 53 || gmNote === 59) return 6;
  // Crash -> Perc2
  if (gmNote === 49 || gmNote === 52 || gmNote === 55 || gmNote === 57) return 7;
  // Other percussion -> Perc1
  if (gmNote === 54 || gmNote === 56 || gmNote >= 69) return 6;
  // Default fallback
  return 6;
}
