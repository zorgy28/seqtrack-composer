import type { SeqtrackChannel } from "@/lib/midi/types";
import type { ImportResult, ImportedNote, ImportTrackInfo } from "./types";
import { gmProgramToPresetId, gmFamilyToChannel } from "./gm-to-seqtrack";

/**
 * Parse a Standard MIDI File (.mid / .smf) from an ArrayBuffer.
 *
 * Drum tracks (GM channel 10 = index 9) are mapped to SEQTRAK channels 1-7
 * using the GM drum note mapping. Melodic tracks are assigned to channels
 * 8-11 using instrument-aware logic (bass → Ch 8, lead → Ch 9, etc.).
 */
export async function parseMidiFile(arrayBuffer: ArrayBuffer): Promise<ImportResult> {
  const { Midi } = await import("@tonejs/midi");
  const midi = new Midi(arrayBuffer);

  // ---- 1. Gather per-track metadata ------------------------------------

  interface TrackMeta {
    trackIndex: number;
    isDrum: boolean;
    gmProgram: number;
    gmFamily: string;
    name: string;
    noteCount: number;
    pitchMin: number;
    pitchMax: number;
    preferredChannel: SeqtrackChannel;
    originalChannel: number; // 0-indexed from @tonejs/midi
  }

  const trackMetas: TrackMeta[] = [];

  for (let i = 0; i < midi.tracks.length; i++) {
    const track = midi.tracks[i];
    if (track.notes.length === 0) continue;

    const isDrum = track.channel === 9; // @tonejs/midi uses 0-indexed; GM drums = 9
    const gmProgram = track.instrument?.number ?? 0;
    const gmFamily = track.instrument?.family ?? "";
    const name = track.name || track.instrument?.name || `Track ${i + 1}`;

    let pitchMin = 127;
    let pitchMax = 0;
    for (const note of track.notes) {
      if (note.midi < pitchMin) pitchMin = note.midi;
      if (note.midi > pitchMax) pitchMax = note.midi;
    }

    const preferredChannel: SeqtrackChannel = isDrum
      ? 1 // placeholder — drums use per-note mapping
      : gmFamilyToChannel(gmFamily, gmProgram);

    trackMetas.push({
      trackIndex: i,
      isDrum,
      gmProgram,
      gmFamily,
      name,
      noteCount: track.notes.length,
      pitchMin,
      pitchMax,
      preferredChannel,
      originalChannel: track.channel,
    });
  }

  // ---- 2. Assign SEQTRAK channels (melodic tracks) ---------------------

  const melodicTracks = trackMetas.filter((t) => !t.isDrum);
  const channelAssignment = new Map<number, SeqtrackChannel>(); // trackIndex → channel

  // Sort melodic tracks: bass first, then by note count descending
  const sorted = [...melodicTracks].sort((a, b) => {
    const aIsBass = a.preferredChannel === 8 ? 0 : 1;
    const bIsBass = b.preferredChannel === 8 ? 0 : 1;
    if (aIsBass !== bIsBass) return aIsBass - bIsBass;
    return b.noteCount - a.noteCount;
  });

  // Available melodic channels: Ch 8 (bass/AWM2), Ch 9 (lead/AWM2), Ch 10 (DX/FM)
  // Ch 11 (Sampler) is excluded — it has no built-in sounds, only user samples.
  // When more than 3 melodic tracks exist, overflow shares Ch 9 (lead channel).
  const melodicSlots: SeqtrackChannel[] = [8, 9, 10];
  const usedChannels = new Set<SeqtrackChannel>();

  for (const meta of sorted) {
    let assigned: SeqtrackChannel;

    if (meta.preferredChannel === 8 && !usedChannels.has(8)) {
      // Bass always gets Ch 8 if available
      assigned = 8;
    } else if (meta.preferredChannel === 10 && !usedChannels.has(10)) {
      // Pads/strings prefer Ch 10
      assigned = 10;
    } else {
      // Find first available slot from [8, 9, 10]
      const available = melodicSlots.find((ch) => !usedChannels.has(ch));
      // Overflow: share Ch 9 (lead) — multiple instruments can layer on same channel
      assigned = available ?? 9;
    }

    usedChannels.add(assigned);
    channelAssignment.set(meta.trackIndex, assigned);
    meta.preferredChannel = assigned; // update for trackInfo output
  }

  // ---- 3. Build notes + trackInfos ------------------------------------

  const notes: ImportedNote[] = [];
  const channels = new Set<number>();
  const trackInfos: ImportTrackInfo[] = [];

  for (const meta of trackMetas) {
    const track = midi.tracks[meta.trackIndex];

    if (meta.isDrum) {
      // Drum notes: map per-note to SEQTRAK channels 1-7
      for (const note of track.notes) {
        const ch = gmDrumToSeqtrack(note.midi);
        notes.push({
          pitch: 60, // drums always use pitch 60 on SEQTRAK
          velocity: Math.round(note.velocity * 127),
          time: note.time,
          duration: note.duration,
          channel: ch,
        });
        channels.add(ch);
      }

      trackInfos.push({
        originalChannel: meta.originalChannel,
        seqtrackChannel: 1 as SeqtrackChannel, // representative; drums span 1-7
        name: meta.name,
        gmProgram: meta.gmProgram,
        gmFamily: meta.gmFamily,
        noteCount: meta.noteCount,
        pitchRange: [meta.pitchMin, meta.pitchMax],
        suggestedPresetId: null, // drums use per-channel auto-mapping
        isDrum: true,
      });
    } else {
      const ch = channelAssignment.get(meta.trackIndex) ?? 11;
      for (const note of track.notes) {
        notes.push({
          pitch: note.midi,
          velocity: Math.round(note.velocity * 127),
          time: note.time,
          duration: note.duration,
          channel: ch,
        });
        channels.add(ch);
      }

      trackInfos.push({
        originalChannel: meta.originalChannel,
        seqtrackChannel: ch as SeqtrackChannel,
        name: meta.name,
        gmProgram: meta.gmProgram,
        gmFamily: meta.gmFamily,
        noteCount: meta.noteCount,
        pitchRange: [meta.pitchMin, meta.pitchMax],
        suggestedPresetId: gmProgramToPresetId(meta.gmProgram),
        isDrum: false,
      });
    }
  }

  return {
    notes,
    bpm: midi.header.tempos[0]?.bpm,
    name: midi.name || undefined,
    channels: Array.from(channels).sort((a, b) => a - b),
    trackInfos,
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
