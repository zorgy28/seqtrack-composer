// ---------------------------------------------------------------------------
// MIDI Input Recorder — Captures all MIDI events from the SEQTRAK input port
// ---------------------------------------------------------------------------

import type { RecordedMidiEvent } from "./types"
import { getInputPort } from "@/lib/webmidi/midi-connection"

/**
 * Attach WebMidi.js listeners to the SEQTRAK input port for comprehensive
 * MIDI recording. Events are timestamped relative to the provided epoch.
 * Returns a cleanup function that removes all listeners.
 *
 * @param deviceId - The output device ID (input is resolved by name match)
 * @param epoch    - `performance.now()` value at session start
 * @param events   - Mutable array to push recorded events into
 * @param onEvent  - Optional callback fired for each recorded event
 */
export function startMidiInputRecording(
  deviceId: string,
  epoch: number,
  events: RecordedMidiEvent[],
  onEvent?: (event: RecordedMidiEvent) => void,
): () => void {
  const input = getInputPort(deviceId)
  if (!input) return () => {}

  /** Compute milliseconds since the recording epoch. */
  const ts = () => performance.now() - epoch

  /**
   * WebMidi.js v3 normalizes CC/PC values to 0-1 range.
   * Convert back to raw 7-bit MIDI (0-127).
   */
  const to7bit = (raw: number | undefined, fallback = 0): number => {
    const v = raw ?? fallback
    return typeof v === "number" && v <= 1 ? Math.round(v * 127) : v
  }

  /** Only record events on SEQTRAK channels 1-11. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ch = (event: any): number | null => {
    const channel: number = event.message?.channel ?? event.channel
    return channel >= 1 && channel <= 11 ? channel : null
  }

  /** Push event into the buffer and notify the callback. */
  const record = (event: RecordedMidiEvent) => {
    events.push(event)
    onEvent?.(event)
  }

  // --- Listeners -----------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteOnHandler = (event: any) => {
    const channel = ch(event)
    if (channel === null) return
    const pitch = event.note?.number ?? event.dataBytes?.[0] ?? 0
    const velocity = to7bit(event.rawValue ?? event.value)
    record({ type: "noteon", timestamp: ts(), channel, pitch, velocity })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteOffHandler = (event: any) => {
    const channel = ch(event)
    if (channel === null) return
    const pitch = event.note?.number ?? event.dataBytes?.[0] ?? 0
    const velocity = to7bit(event.rawValue ?? event.value)
    record({ type: "noteoff", timestamp: ts(), channel, pitch, velocity })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ccHandler = (event: any) => {
    const channel = ch(event)
    if (channel === null) return
    const controller = event.controller?.number ?? 0
    const value = to7bit(event.rawValue ?? event.value)
    record({ type: "cc", timestamp: ts(), channel, controller, value })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pcHandler = (event: any) => {
    const channel = ch(event)
    if (channel === null) return
    const program = to7bit(event.rawValue ?? event.value)
    record({ type: "pc", timestamp: ts(), channel, program })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pitchBendHandler = (event: any) => {
    const channel = ch(event)
    if (channel === null) return
    // Keep raw float value (-1 to 1) — no 7-bit conversion
    const value: number = event.value ?? 0
    record({ type: "pitchbend", timestamp: ts(), channel, value })
  }

  input.addListener("noteon", noteOnHandler)
  input.addListener("noteoff", noteOffHandler)
  input.addListener("controlchange", ccHandler)
  input.addListener("programchange", pcHandler)
  input.addListener("pitchbend", pitchBendHandler)

  // --- Cleanup -------------------------------------------------------------

  return () => {
    try {
      input.removeListener("noteon", noteOnHandler)
      input.removeListener("noteoff", noteOffHandler)
      input.removeListener("controlchange", ccHandler)
      input.removeListener("programchange", pcHandler)
      input.removeListener("pitchbend", pitchBendHandler)
    } catch {
      /* listeners already removed */
    }
  }
}
