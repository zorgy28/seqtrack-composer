// ---------------------------------------------------------------------------
// Recording Engine — Orchestrates synchronized MIDI + audio capture
// ---------------------------------------------------------------------------

import type {
  RecordedMidiEvent,
  RecordingConfig,
  RecordingSession,
  RecordingStatus,
} from "./types"
import { startMidiInputRecording } from "./midi-input-recorder"
import type { AudioRecorderHandle } from "./audio-recorder"
import { startAudioRecording } from "./audio-recorder"
import { getInputPort } from "@/lib/webmidi/midi-connection"

// ---------------------------------------------------------------------------
// Engine options
// ---------------------------------------------------------------------------

export interface RecordingEngineOptions {
  onStatusChange?: (status: RecordingStatus) => void
  onMidiEvent?: (event: RecordedMidiEvent) => void
}

// ---------------------------------------------------------------------------
// State machine helpers
// ---------------------------------------------------------------------------

/** Valid state transitions. */
const TRANSITIONS: Record<RecordingStatus, RecordingStatus[]> = {
  idle: ["armed"],
  armed: ["recording", "idle"],
  recording: ["stopping", "idle"],
  stopping: ["complete", "error", "idle"],
  complete: ["armed", "idle"],
  error: ["armed", "idle"],
}

function assertTransition(from: RecordingStatus, to: RecordingStatus): void {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid recording state transition: ${from} → ${to}`)
  }
}

// ---------------------------------------------------------------------------
// RecordingEngine
// ---------------------------------------------------------------------------

export class RecordingEngine {
  // -- State ---------------------------------------------------------------
  private status: RecordingStatus = "idle"
  private config: RecordingConfig | null = null
  private epoch = 0
  private midiEvents: RecordedMidiEvent[] = []
  private stopMidiRecording: (() => void) | null = null
  private audioHandle: AudioRecorderHandle | null = null
  private audioBlob: Blob | null = null

  // -- Callbacks -----------------------------------------------------------
  private readonly onStatusChange?: (status: RecordingStatus) => void
  private readonly onMidiEvent?: (event: RecordedMidiEvent) => void

  constructor(options?: RecordingEngineOptions) {
    this.onStatusChange = options?.onStatusChange
    this.onMidiEvent = options?.onMidiEvent
  }

  // -- Public accessors ----------------------------------------------------

  getStatus(): RecordingStatus {
    return this.status
  }

  getElapsedMs(): number {
    if (this.epoch === 0) return 0
    if (this.status === "recording" || this.status === "stopping") {
      return performance.now() - this.epoch
    }
    // After stop, return the last computed duration (stored on the session)
    // or compute from the last MIDI event timestamp as a fallback.
    if (this.midiEvents.length > 0) {
      return this.midiEvents[this.midiEvents.length - 1].timestamp
    }
    return 0
  }

  getMidiEventCount(): number {
    return this.midiEvents.length
  }

  /**
   * Returns the audio Blob from the last completed recording.
   * The blob is NOT included in the RecordingSession (stored separately in
   * IndexedDB by the caller), but can be retrieved here after `stop()`.
   */
  getAudioBlob(): Blob | null {
    return this.audioBlob
  }

  // -- State machine -------------------------------------------------------

  private transition(to: RecordingStatus): void {
    assertTransition(this.status, to)
    this.status = to
    this.onStatusChange?.(to)
  }

  // -- Arm -----------------------------------------------------------------

  /**
   * Validate that the MIDI input port exists and store the config.
   * Resets any previous recording state.
   */
  async arm(config: RecordingConfig): Promise<void> {
    // Allow re-arming from complete/error without explicit dispose
    if (this.status === "complete" || this.status === "error") {
      this.resetInternal()
    }

    this.transition("armed")

    // Validate MIDI input
    const input = getInputPort(config.midiDeviceId)
    if (!input) {
      this.transition("idle")
      throw new Error(
        `MIDI input port not found for device "${config.midiDeviceId}". ` +
          "Ensure the SEQTRAK is connected and MIDI is initialized.",
      )
    }

    this.config = { ...config }
    this.midiEvents = []
    this.audioBlob = null
  }

  // -- Start ---------------------------------------------------------------

  /**
   * Begin synchronized recording. Sets the epoch timestamp, starts MIDI
   * capture, and optionally starts audio capture if a MediaStream is provided.
   */
  async start(audioStream?: MediaStream): Promise<void> {
    this.transition("recording")

    if (!this.config) {
      this.transition("idle")
      throw new Error("Cannot start recording: not armed (no config).")
    }

    // Set epoch — all MIDI timestamps are relative to this
    this.epoch = performance.now()

    // Start MIDI recording
    this.stopMidiRecording = startMidiInputRecording(
      this.config.midiDeviceId,
      this.epoch,
      this.midiEvents,
      this.onMidiEvent,
    )

    // Start audio recording (optional)
    if (audioStream) {
      try {
        this.audioHandle = startAudioRecording(
          audioStream,
          this.config.audioMimeType,
        )
      } catch (err) {
        // Audio failure should not prevent MIDI-only recording
        console.warn("[RecordingEngine] Audio recording failed to start:", err)
        this.audioHandle = null
      }
    }
  }

  // -- Stop ----------------------------------------------------------------

  /**
   * Stop all capture, assemble the RecordingSession, and return it.
   * The audio blob is stored internally — retrieve via `getAudioBlob()`.
   */
  async stop(): Promise<RecordingSession> {
    this.transition("stopping")

    const durationMs = performance.now() - this.epoch

    // Stop MIDI recording
    if (this.stopMidiRecording) {
      this.stopMidiRecording()
      this.stopMidiRecording = null
    }

    // Stop audio recording
    this.audioBlob = null
    if (this.audioHandle) {
      try {
        this.audioBlob = await this.audioHandle.stop()
      } catch (err) {
        console.warn("[RecordingEngine] Audio stop failed:", err)
      }
      this.audioHandle = null
    }

    // Assemble session with defensive copy of MIDI events
    const session: RecordingSession = {
      id: crypto.randomUUID(),
      projectId: this.config?.projectId ?? "",
      name: this.config?.name ?? `Recording ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      durationMs,
      bpm: this.config?.bpm ?? 120,
      midiEventCount: this.midiEvents.length,
      midiEvents: [...this.midiEvents],

      // Audio metadata (blob stored separately)
      hasAudio: this.audioBlob !== null && this.audioBlob.size > 0,
      audioFormat: this.audioBlob ? this.audioBlob.type || null : null,
      audioBlobSize: this.audioBlob ? this.audioBlob.size : null,
    }

    this.transition("complete")
    return session
  }

  // -- Dispose -------------------------------------------------------------

  /**
   * Clean up all resources without saving. Transitions to idle.
   */
  dispose(): void {
    // Stop MIDI if running
    if (this.stopMidiRecording) {
      this.stopMidiRecording()
      this.stopMidiRecording = null
    }

    // Stop audio if running (fire and forget)
    if (this.audioHandle) {
      try {
        this.audioHandle.stop().catch(() => {})
      } catch {
        /* already stopped */
      }
      this.audioHandle = null
    }

    this.resetInternal()
  }

  // -- Internal reset ------------------------------------------------------

  private resetInternal(): void {
    this.config = null
    this.epoch = 0
    this.midiEvents = []
    this.stopMidiRecording = null
    this.audioHandle = null
    this.audioBlob = null
    this.status = "idle"
  }
}
