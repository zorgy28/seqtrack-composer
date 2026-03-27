import MidiWriter from "midi-writer-js";
import type { Project } from "./types";
import { ALL_CHANNELS, SEQTRAK_TRACKS, TICKS_PER_STEP, STEPS_PER_BAR } from "./constants";

/**
 * Shared builder — constructs a MidiWriter.Writer from the project.
 * Called by both exportProjectToMidi and exportProjectToDataUri.
 */
function buildMidiWriter(
  project: Project,
  exportAllPatterns: boolean,
): MidiWriter.Writer {
  const tracks: MidiWriter.Track[] = [];

  for (const ch of ALL_CHANNELS) {
    const track = project.tracks[ch];
    const info = SEQTRAK_TRACKS[ch];
    const midiTrack = new MidiWriter.Track();

    midiTrack.addTrackName(info.name);

    // Set tempo on the first track
    if (ch === 1) {
      midiTrack.setTempo(project.bpm);
      midiTrack.setTimeSignature(4, 4);
    }

    if (track.muted) {
      tracks.push(midiTrack);
      continue;
    }

    // Collect patterns to export
    const patternsToExport = exportAllPatterns
      ? track.patterns.filter((p) => p.notes.length > 0)
      : track.patterns[track.activePattern]?.notes.length
        ? [track.patterns[track.activePattern]]
        : [];

    if (patternsToExport.length === 0) {
      tracks.push(midiTrack);
      continue;
    }

    // Build events with absolute tick positions
    let stepOffset = 0;

    for (const pattern of patternsToExport) {
      for (const note of pattern.notes) {
        const startTick = (stepOffset + note.step) * TICKS_PER_STEP;

        // midi-writer-js uses tick-based timing with 'T' prefix
        midiTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [note.pitch],
            velocity: note.velocity,
            startTick,
            duration: `T${note.duration * TICKS_PER_STEP}`,
            channel: ch,
          }),
        );
      }
      stepOffset += pattern.bars * STEPS_PER_BAR;
    }

    tracks.push(midiTrack);
  }

  return new MidiWriter.Writer(tracks);
}

/**
 * Export project to a Standard MIDI File (Type 1).
 * Ported from seqtrak_composer.py export_midi() lines 378-451.
 *
 * Each SEQTRAK track is exported on its corresponding MIDI channel (1-11).
 * Returns a Uint8Array of the .mid file.
 */
export function exportProjectToMidi(
  project: Project,
  exportAllPatterns = false,
): Uint8Array {
  return buildMidiWriter(project, exportAllPatterns).buildFile();
}

/**
 * Generate a data URI for the MIDI file (for client-side download).
 */
export function exportProjectToDataUri(
  project: Project,
  exportAllPatterns = false,
): string {
  return buildMidiWriter(project, exportAllPatterns).dataUri();
}

/**
 * Trigger a .mid file download in the browser.
 */
export function downloadMidi(project: Project, exportAllPatterns = false) {
  const dataUri = exportProjectToDataUri(project, exportAllPatterns);
  const fileName = `${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.mid`;

  const link = document.createElement("a");
  link.href = dataUri;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
