import type { ImportResult } from "./types";
import type { SeqtrackChannel, Pattern } from "@/lib/midi/types";
import type { RawMidiEvent } from "@/lib/transcription/types";
import { quantizeEvents, detectBars } from "@/lib/transcription/quantize";
import { createEmptyPattern } from "@/lib/midi/pattern-generators";

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
