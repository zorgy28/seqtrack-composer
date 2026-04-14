import type { ImportResult } from "./types";
import type { SeqtrackChannel, Pattern } from "@/lib/midi/types";
import type { RawMidiEvent } from "@/lib/transcription/types";
import { quantizeEvents, detectBars } from "@/lib/transcription/quantize";
import { createEmptyPattern } from "@/lib/midi/pattern-generators";
import { MAX_BARS, MAX_PATTERNS_PER_TRACK } from "@/lib/midi/constants";

/**
 * Convert an ImportResult into one Pattern per SEQTRAK channel.
 *
 * Pipeline per channel:
 *   1. Filter ImportedNote[] to those assigned to this channel
 *   2. Convert to RawMidiEvent[] (seconds-based, for the quantizer)
 *   3. Run quantizeEvents() to snap to the 16-step grid
 *   4. Wrap in a Pattern with the correct bar count
 *
 * @param result           - The output of any import parser
 * @param bpm              - Project BPM (used for time-to-step conversion)
 * @param bars             - Desired pattern length in bars (1-8)
 * @param presetSelections - Optional map of channel → presetId chosen by the user in the mapping UI
 * @returns Array of { channel, pattern, presetId? } for every channel that has notes
 */
export function importToPatterns(
  result: ImportResult,
  bpm: number,
  bars: number,
  presetSelections?: Partial<Record<SeqtrackChannel, number>>,
): Array<{ channel: SeqtrackChannel; pattern: Pattern; presetId?: number }> {
  // Group notes by channel
  const byChannel = new Map<number, typeof result.notes>();

  for (const note of result.notes) {
    const ch = note.channel ?? 9; // default to Synth 2 if no channel hint
    const existing = byChannel.get(ch) ?? [];
    existing.push(note);
    byChannel.set(ch, existing);
  }

  const output: Array<{ channel: SeqtrackChannel; pattern: Pattern; presetId?: number }> = [];

  for (const [ch, importedNotes] of byChannel) {
    // Validate channel range (SEQTRAK uses 1-11)
    if (ch < 1 || ch > 11) continue;

    // Convert ImportedNote[] -> RawMidiEvent[]
    const rawEvents: RawMidiEvent[] = importedNotes.map((n) => ({
      pitch: n.pitch,
      start: n.time,
      end: n.time + n.duration,
      velocity: n.velocity,
      confidence: 1,
    }));

    // Determine bar count — use provided value, or auto-detect
    const detectedBars = detectBars(rawEvents, bpm);
    const effectiveBars = Math.min(bars, Math.max(detectedBars, 1));

    // Quantize to step grid
    const quantizedNotes = quantizeEvents(rawEvents, bpm, effectiveBars);

    if (quantizedNotes.length === 0) continue;

    // Build pattern
    const pattern = createEmptyPattern(`Imported`, effectiveBars);
    const patternWithNotes: Pattern = {
      ...pattern,
      notes: quantizedNotes,
    };

    const seqCh = ch as SeqtrackChannel;
    output.push({
      channel: seqCh,
      pattern: patternWithNotes,
      presetId: presetSelections?.[seqCh],
    });
  }

  // Sort by channel for deterministic output
  output.sort((a, b) => a.channel - b.channel);

  return output;
}

/**
 * Import a range of bars from a MIDI file, splitting into multiple 8-bar patterns.
 * Returns patterns per channel, ready to be assigned to track.patterns[].
 *
 * Pipeline:
 *   1. Clamp range to MAX_PATTERNS_PER_TRACK * MAX_BARS (48 bars max)
 *   2. Split [startBar, endBar) into chunks of MAX_BARS (8)
 *   3. For each chunk: filter notes, offset times, quantize, create Pattern
 *   4. Group by channel; fill empty chunks with empty patterns to keep alignment
 *
 * @param importResult - The output of any import parser
 * @param startBar     - 0-based inclusive start bar
 * @param endBar       - 0-based exclusive end bar
 * @param bpm          - Project BPM (used for time-to-step conversion)
 * @returns Array of { channel, patterns[], presetId? } for every channel with notes
 */
export function importToMultiplePatterns(
  importResult: ImportResult,
  startBar: number,
  endBar: number,
  bpm: number,
): { channel: SeqtrackChannel; patterns: Pattern[]; presetId?: number }[] {
  // ---- 1. Clamp range --------------------------------------------------

  const maxBarsTotal = MAX_PATTERNS_PER_TRACK * MAX_BARS; // 48
  endBar = Math.min(endBar, startBar + maxBarsTotal);

  const secondsPerBar = (60 / bpm) * 4; // 4 beats per bar (4/4 time)

  // ---- 2. Compute chunk boundaries -------------------------------------

  interface Chunk {
    startBar: number; // 0-based absolute bar
    endBar: number;   // 0-based exclusive absolute bar
    bars: number;     // number of bars in this chunk
  }

  const chunks: Chunk[] = [];
  let cursor = startBar;
  while (cursor < endBar) {
    const chunkBars = Math.min(MAX_BARS, endBar - cursor);
    chunks.push({ startBar: cursor, endBar: cursor + chunkBars, bars: chunkBars });
    cursor += chunkBars;
  }

  if (chunks.length === 0) return [];

  // ---- 3. Group notes by channel (once) --------------------------------

  const byChannel = new Map<number, typeof importResult.notes>();
  for (const note of importResult.notes) {
    const ch = note.channel ?? 9;
    if (ch < 1 || ch > 11) continue;
    const existing = byChannel.get(ch) ?? [];
    existing.push(note);
    byChannel.set(ch, existing);
  }

  // Collect all channels that appear
  const allChannels = Array.from(byChannel.keys()).sort((a, b) => a - b);
  if (allChannels.length === 0) return [];

  // ---- 4. For each chunk, build patterns per channel -------------------

  // channelPatterns[ch] = Pattern[] (one per chunk)
  const channelPatterns = new Map<number, Pattern[]>();
  for (const ch of allChannels) {
    channelPatterns.set(ch, []);
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const chunkStartTime = chunk.startBar * secondsPerBar;
    const chunkEndTime = chunk.endBar * secondsPerBar;

    for (const ch of allChannels) {
      const channelNotes = byChannel.get(ch) ?? [];

      // Filter notes whose start time falls within [chunkStartTime, chunkEndTime)
      const chunkNotes = channelNotes.filter(
        (n) => n.time >= chunkStartTime && n.time < chunkEndTime,
      );

      if (chunkNotes.length === 0) {
        // Empty pattern to keep all tracks aligned
        channelPatterns.get(ch)!.push(
          createEmptyPattern(`Imported ${ci + 1}`, chunk.bars),
        );
        continue;
      }

      // Offset note times so they're relative to chunk start
      const rawEvents: RawMidiEvent[] = chunkNotes.map((n) => ({
        pitch: n.pitch,
        start: n.time - chunkStartTime,
        end: n.time + n.duration - chunkStartTime,
        velocity: n.velocity,
        confidence: 1,
      }));

      // Quantize to step grid
      const quantizedNotes = quantizeEvents(rawEvents, bpm, chunk.bars);

      // Build pattern
      const pattern = createEmptyPattern(`Imported ${ci + 1}`, chunk.bars);
      channelPatterns.get(ch)!.push({
        ...pattern,
        notes: quantizedNotes,
      });
    }
  }

  // ---- 5. Determine preset IDs from trackInfos -------------------------

  const presetByChannel = new Map<number, number>();
  if (importResult.trackInfos) {
    for (const info of importResult.trackInfos) {
      if (info.suggestedPresetId != null && !presetByChannel.has(info.seqtrackChannel)) {
        presetByChannel.set(info.seqtrackChannel, info.suggestedPresetId);
      }
    }
  }

  // ---- 6. Build output -------------------------------------------------

  const output: { channel: SeqtrackChannel; patterns: Pattern[]; presetId?: number }[] = [];

  for (const ch of allChannels) {
    const patterns = channelPatterns.get(ch)!;
    // Only include channels that have at least one non-empty pattern
    const hasNotes = patterns.some((p) => p.notes.length > 0);
    if (!hasNotes) continue;

    output.push({
      channel: ch as SeqtrackChannel,
      patterns,
      presetId: presetByChannel.get(ch),
    });
  }

  // Sort by channel for deterministic output
  output.sort((a, b) => a.channel - b.channel);

  return output;
}
