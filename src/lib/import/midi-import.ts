import type { SeqtrackChannel } from "@/lib/midi/types";
import type { ImportResult, ImportedNote, ImportTrackInfo } from "./types";
import { gmProgramToPresetId, gmFamilyToChannel } from "./gm-to-seqtrack";

// Inline type to avoid Turbopack circular deps
type ProfileLike = { id?: string; drumChannels?: number[]; synthChannels?: number[]; architecture?: string };

/**
 * Parse a Standard MIDI File (.mid / .smf) from an ArrayBuffer.
 *
 * Drum tracks (GM channel 10 = index 9) are mapped to SEQTRAK channels 1-7
 * using the GM drum note mapping. Melodic tracks are assigned to channels
 * 8-11 using instrument-aware logic (bass → Ch 8, lead → Ch 9, etc.).
 */
export async function parseMidiFile(arrayBuffer: ArrayBuffer, profile?: ProfileLike): Promise<ImportResult> {
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
      ? (profile?.drumChannels?.[0] ?? 1) // placeholder — drums use per-note mapping
      : gmFamilyToChannel(gmFamily, gmProgram, profile);

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
  const synthChs = profile?.synthChannels ?? [8, 9, 10];
  const bassCh = synthChs[0] ?? 8;

  const sorted = [...melodicTracks].sort((a, b) => {
    const aIsBass = a.preferredChannel === bassCh ? 0 : 1;
    const bIsBass = b.preferredChannel === bassCh ? 0 : 1;
    if (aIsBass !== bIsBass) return aIsBass - bIsBass;
    return b.noteCount - a.noteCount;
  });

  // Available melodic channels from profile (SEQTRAK: [8,9,10], MicroFreak: [1])
  // For single-channel synths, all tracks merge to that one channel.
  const melodicSlots: SeqtrackChannel[] = synthChs.length > 1
    ? synthChs.slice(0, -1) as SeqtrackChannel[] // exclude last (sampler on SEQTRAK)
    : synthChs as SeqtrackChannel[];
  const overflowCh = melodicSlots[Math.min(1, melodicSlots.length - 1)] ?? melodicSlots[0];
  const usedChannels = new Set<SeqtrackChannel>();

  for (const meta of sorted) {
    let assigned: SeqtrackChannel;

    if (meta.preferredChannel === bassCh && !usedChannels.has(bassCh)) {
      assigned = bassCh;
    } else {
      const available = melodicSlots.find((ch) => !usedChannels.has(ch));
      assigned = available ?? overflowCh;
    }

    usedChannels.add(assigned);
    channelAssignment.set(meta.trackIndex, assigned);
    meta.preferredChannel = assigned;
  }

  // ---- 3. Build notes + trackInfos ------------------------------------

  const notes: ImportedNote[] = [];
  const channels = new Set<number>();
  const trackInfos: ImportTrackInfo[] = [];

  for (const meta of trackMetas) {
    const track = midi.tracks[meta.trackIndex];

    if (meta.isDrum) {
      const hasDrumChannels = (profile?.drumChannels?.length ?? 7) > 0;
      const isSingleChannelGroovebox = profile?.architecture === "groovebox" && !hasDrumChannels;

      if (hasDrumChannels) {
        // SEQTRAK: map per-note to device drum channels (1-7)
        for (const note of track.notes) {
          const ch = gmDrumToSeqtrack(note.midi);
          notes.push({
            pitch: 60,
            velocity: Math.round(note.velocity * 127),
            time: note.time,
            duration: note.duration,
            channel: ch,
          });
          channels.add(ch);
        }

        trackInfos.push({
          originalChannel: meta.originalChannel,
          seqtrackChannel: (profile?.drumChannels?.[0] ?? 1) as SeqtrackChannel,
          name: meta.name,
          gmProgram: meta.gmProgram,
          gmFamily: meta.gmFamily,
          noteCount: meta.noteCount,
          pitchRange: [meta.pitchMin, meta.pitchMax],
          suggestedPresetId: null,
          isDrum: true,
        });
      } else if (isSingleChannelGroovebox) {
        // KO II: keep drum notes as pitched on channel 1 (GM drums 36-47 = Group A range)
        const targetCh = (profile?.synthChannels?.[0] ?? 1) as SeqtrackChannel;
        for (const note of track.notes) {
          // Clamp GM drum notes to Group A range (36-47) for KO II pad mapping
          const pitch = Math.max(36, Math.min(47, note.midi));
          notes.push({
            pitch,
            velocity: Math.round(note.velocity * 127),
            time: note.time,
            duration: note.duration,
            channel: targetCh,
          });
          channels.add(targetCh);
        }

        trackInfos.push({
          originalChannel: meta.originalChannel,
          seqtrackChannel: targetCh,
          name: meta.name,
          gmProgram: meta.gmProgram,
          gmFamily: meta.gmFamily,
          noteCount: meta.noteCount,
          pitchRange: [36, 47],
          suggestedPresetId: null,
          isDrum: true,
        });
      }
      // else: skip drum tracks for synth-only devices (MicroFreak)
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

  // ---- 4. Compute total bar count from note end times ------------------

  const bpm = midi.header.tempos[0]?.bpm ?? 120;
  const secondsPerBar = (60 / bpm) * 4; // 4 beats per bar in 4/4 time
  const maxEndTime = notes.reduce(
    (max, n) => Math.max(max, n.time + n.duration),
    0,
  );
  const totalBars = Math.max(1, Math.ceil(maxEndTime / secondsPerBar));

  return {
    notes,
    bpm,
    name: midi.name || undefined,
    channels: Array.from(channels).sort((a, b) => a - b),
    trackInfos,
    totalBars,
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
