// ---------------------------------------------------------------------------
// Session Player — Playback engine for recorded sessions
// ---------------------------------------------------------------------------

import type { RecordedMidiEvent, RecordedNoteOn } from "./types";
import { sendNote } from "@/lib/webmidi/midi-sender";
import type { SeqtrackChannel } from "@/lib/midi/types";

/**
 * Playback engine that synchronizes audio and MIDI from a recorded session.
 *
 * Audio is played through the Web Audio API (AudioContext + AudioBufferSourceNode).
 * MIDI events are scheduled via setTimeout with a 500ms lookahead window and
 * re-scheduled as playback advances.
 *
 * Progress is reported via requestAnimationFrame for smooth UI updates.
 */
export class SessionPlayer {
  // ---- Audio state -------------------------------------------------------
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  // ---- MIDI state --------------------------------------------------------
  private midiEvents: RecordedMidiEvent[] = [];
  private midiDeviceId: string | null = null;
  private midiTimeouts: ReturnType<typeof setTimeout>[] = [];
  private nextMidiIndex = 0;

  // ---- Playback state ----------------------------------------------------
  private _isPlaying = false;
  private playStartTime = 0; // audioContext.currentTime when play() was called
  private startOffsetMs = 0; // offset from seek / resume
  private _currentTimeMs = 0;
  private rafId: number | null = null;

  // ---- Lookahead ---------------------------------------------------------
  private static readonly LOOKAHEAD_MS = 500;
  private lookaheadTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- Callback ----------------------------------------------------------
  private onProgress: (ms: number) => void;

  constructor(onProgress: (ms: number) => void) {
    this.onProgress = onProgress;
  }

  // ======================================================================
  // Public API
  // ======================================================================

  /** Decode an audio Blob into an AudioBuffer ready for playback. */
  async loadAudio(blob: Blob): Promise<AudioBuffer> {
    this.ensureAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  /** Provide the MIDI event list and optional device for note output. */
  setMidiEvents(events: RecordedMidiEvent[], deviceId: string | null): void {
    this.midiEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    this.midiDeviceId = deviceId;
  }

  /** Begin (or resume) playback from an optional starting position. */
  play(startMs?: number): void {
    if (this._isPlaying) return;

    this.ensureAudioContext();
    const ctx = this.audioContext!;

    // Resume a suspended context (browser autoplay policy).
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    if (startMs !== undefined) {
      this.startOffsetMs = startMs;
    }

    this._isPlaying = true;
    this.playStartTime = ctx.currentTime;

    // ---- Audio -----------------------------------------------------------
    this.startAudioSource(this.startOffsetMs);

    // ---- MIDI scheduling -------------------------------------------------
    this.resetMidiIndex(this.startOffsetMs);
    this.scheduleMidiLookahead();

    // ---- Progress loop ---------------------------------------------------
    this.startProgressLoop();
  }

  /** Pause playback (keeps position). */
  pause(): void {
    if (!this._isPlaying) return;

    // Snapshot current position before stopping.
    this._currentTimeMs = this.computeCurrentTimeMs();
    this.startOffsetMs = this._currentTimeMs;

    this._isPlaying = false;
    this.stopAudioSource();
    this.clearMidiSchedule();
    this.stopProgressLoop();

    if (this.audioContext) {
      void this.audioContext.suspend();
    }
  }

  /** Stop playback and reset to the beginning. */
  stop(): void {
    this._isPlaying = false;
    this.startOffsetMs = 0;
    this._currentTimeMs = 0;

    this.stopAudioSource();
    this.clearMidiSchedule();
    this.stopProgressLoop();

    this.onProgress(0);
  }

  /** Jump to a specific position (works while playing or paused). */
  seek(ms: number): void {
    const wasPlaying = this._isPlaying;

    // Tear down current playback state.
    this.stopAudioSource();
    this.clearMidiSchedule();
    this.stopProgressLoop();
    this._isPlaying = false;

    this.startOffsetMs = Math.max(0, Math.min(ms, this.duration));
    this._currentTimeMs = this.startOffsetMs;
    this.onProgress(this._currentTimeMs);

    if (wasPlaying) {
      this.play(this.startOffsetMs);
    }
  }

  /** Current playback position in milliseconds. */
  get currentTimeMs(): number {
    if (this._isPlaying) {
      return this.computeCurrentTimeMs();
    }
    return this._currentTimeMs;
  }

  /** Whether the player is actively playing. */
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  /** Total duration in milliseconds (from audio buffer, or last MIDI event). */
  get duration(): number {
    const audioDuration = this.audioBuffer
      ? this.audioBuffer.duration * 1000
      : 0;
    const midiDuration =
      this.midiEvents.length > 0
        ? this.midiEvents[this.midiEvents.length - 1].timestamp
        : 0;
    return Math.max(audioDuration, midiDuration);
  }

  // ======================================================================
  // Private — Audio
  // ======================================================================

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  private startAudioSource(offsetMs: number): void {
    if (!this.audioContext || !this.audioBuffer) return;

    this.stopAudioSource();

    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.audioContext.destination);

    const offsetSeconds = offsetMs / 1000;
    source.start(0, offsetSeconds);

    source.onended = () => {
      if (this._isPlaying) {
        this.stop();
      }
    };

    this.sourceNode = source;
  }

  private stopAudioSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
      } catch {
        // Already stopped — ignore.
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  // ======================================================================
  // Private — MIDI scheduling
  // ======================================================================

  /** Find the first event index at or after the given ms offset. */
  private resetMidiIndex(fromMs: number): void {
    this.nextMidiIndex = 0;
    for (let i = 0; i < this.midiEvents.length; i++) {
      if (this.midiEvents[i].timestamp >= fromMs) {
        this.nextMidiIndex = i;
        return;
      }
    }
    this.nextMidiIndex = this.midiEvents.length;
  }

  /**
   * Schedule MIDI events within the lookahead window.
   * Re-runs itself periodically while playing.
   */
  private scheduleMidiLookahead(): void {
    if (!this._isPlaying || !this.midiDeviceId) return;

    const nowMs = this.computeCurrentTimeMs();
    const windowEnd = nowMs + SessionPlayer.LOOKAHEAD_MS;

    while (this.nextMidiIndex < this.midiEvents.length) {
      const event = this.midiEvents[this.nextMidiIndex];
      if (event.timestamp > windowEnd) break;

      const delayMs = Math.max(0, event.timestamp - nowMs);
      this.scheduleMidiEvent(event, delayMs);
      this.nextMidiIndex++;
    }

    // Re-run lookahead at half the window interval for overlap.
    this.lookaheadTimer = setTimeout(
      () => this.scheduleMidiLookahead(),
      SessionPlayer.LOOKAHEAD_MS / 2,
    );
  }

  private scheduleMidiEvent(event: RecordedMidiEvent, delayMs: number): void {
    if (event.type !== "noteon" || !this.midiDeviceId) return;

    const noteOn = event as RecordedNoteOn;

    // Find matching noteoff to compute duration.
    const durationMs = this.findNoteDuration(noteOn);

    const timeout = setTimeout(() => {
      if (!this._isPlaying || !this.midiDeviceId) return;
      sendNote(
        this.midiDeviceId,
        noteOn.channel as SeqtrackChannel,
        noteOn.pitch,
        noteOn.velocity,
        durationMs,
      );
    }, delayMs);

    this.midiTimeouts.push(timeout);
  }

  /** Find the duration (ms) of a note-on by locating its matching note-off. */
  private findNoteDuration(noteOn: RecordedNoteOn): number {
    for (let i = this.nextMidiIndex; i < this.midiEvents.length; i++) {
      const e = this.midiEvents[i];
      if (
        e.type === "noteoff" &&
        e.channel === noteOn.channel &&
        e.pitch === noteOn.pitch &&
        e.timestamp > noteOn.timestamp
      ) {
        return e.timestamp - noteOn.timestamp;
      }
    }
    // No matching noteoff — use 500ms default.
    return 500;
  }

  private clearMidiSchedule(): void {
    for (const t of this.midiTimeouts) {
      clearTimeout(t);
    }
    this.midiTimeouts = [];

    if (this.lookaheadTimer !== null) {
      clearTimeout(this.lookaheadTimer);
      this.lookaheadTimer = null;
    }
  }

  // ======================================================================
  // Private — Progress
  // ======================================================================

  private computeCurrentTimeMs(): number {
    if (!this.audioContext) return this.startOffsetMs;
    return (
      (this.audioContext.currentTime - this.playStartTime) * 1000 +
      this.startOffsetMs
    );
  }

  private startProgressLoop(): void {
    const update = () => {
      if (!this._isPlaying) return;
      this._currentTimeMs = this.computeCurrentTimeMs();
      this.onProgress(this._currentTimeMs);
      this.rafId = requestAnimationFrame(update);
    };
    this.rafId = requestAnimationFrame(update);
  }

  private stopProgressLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
