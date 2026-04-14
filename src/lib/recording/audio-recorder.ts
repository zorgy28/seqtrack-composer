// ---------------------------------------------------------------------------
// Audio Recorder — MediaRecorder wrapper for capturing SEQTRAK audio
// ---------------------------------------------------------------------------

export type RecordingState = "inactive" | "recording" | "paused"

export interface AudioRecorderHandle {
  /** Stop recording and return the final audio blob. */
  stop: () => Promise<Blob>
  /** Pause recording (keeps the stream alive). */
  pause: () => void
  /** Resume a paused recording. */
  resume: () => void
  /** Current state of the underlying MediaRecorder. */
  getState: () => RecordingState
}

/** Ordered list of preferred MIME types for audio recording. */
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
]

/**
 * Resolve the best supported MIME type.
 * If the caller supplies one that the browser supports, use it.
 * Otherwise fall through the preferred list.
 */
function resolveMimeType(requested?: string): string {
  if (requested && MediaRecorder.isTypeSupported(requested)) {
    return requested
  }
  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  // Last resort — let the browser pick
  return ""
}

/**
 * Start recording audio from a MediaStream.
 *
 * @param stream   - Raw MediaStream (e.g. from `startAudioCapture().stream`)
 * @param mimeType - Optional MIME type override; auto-detected if omitted
 * @returns Handle with stop/pause/resume/getState
 */
export function startAudioRecording(
  stream: MediaStream,
  mimeType?: string,
): AudioRecorderHandle {
  const resolvedMime = resolveMimeType(mimeType)

  const recorder = new MediaRecorder(stream, {
    ...(resolvedMime ? { mimeType: resolvedMime } : {}),
  })

  const chunks: Blob[] = []

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  // Start recording with 1-second timeslices
  recorder.start(1000)

  const stop = (): Promise<Blob> =>
    new Promise<Blob>((resolve, reject) => {
      if (recorder.state === "inactive") {
        // Already stopped — return whatever we have
        resolve(new Blob(chunks, { type: recorder.mimeType || resolvedMime }))
        return
      }

      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: recorder.mimeType || resolvedMime }))
      }

      recorder.onerror = (event) => {
        reject(
          new Error(
            `MediaRecorder error: ${(event as ErrorEvent).message ?? "unknown"}`,
          ),
        )
      }

      recorder.stop()
    })

  const pause = () => {
    if (recorder.state === "recording") {
      recorder.pause()
    }
  }

  const resume = () => {
    if (recorder.state === "paused") {
      recorder.resume()
    }
  }

  const getState = (): RecordingState =>
    recorder.state as RecordingState

  return { stop, pause, resume, getState }
}
