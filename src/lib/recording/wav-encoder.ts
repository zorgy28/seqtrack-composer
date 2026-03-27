// ---------------------------------------------------------------------------
// WAV Encoder — Minimal PCM 16-bit WAV file builder
// ---------------------------------------------------------------------------

/**
 * Encode raw Float32 audio channel data into a standard WAV file blob.
 *
 * @param channelData - Array of Float32Array buffers (one per channel).
 *                      Mono = 1 element, stereo = 2 elements.
 * @param sampleRate  - Sample rate in Hz (e.g. 44100, 48000).
 * @returns A `Blob` with MIME type `audio/wav`.
 */
export function encodeWav(
  channelData: Float32Array[],
  sampleRate: number,
): Blob {
  const numChannels = channelData.length
  const numSamples = channelData[0]?.length ?? 0
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numSamples * blockAlign
  const headerSize = 44
  const fileSize = headerSize + dataSize - 8 // RIFF size excludes "RIFF" + size field

  // -- Header (44 bytes) ---------------------------------------------------
  const header = new ArrayBuffer(headerSize)
  const view = new DataView(header)

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF")
  view.setUint32(4, fileSize, true)
  writeString(view, 8, "WAVE")

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true) // Sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true) // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // "data" sub-chunk
  writeString(view, 36, "data")
  view.setUint32(40, dataSize, true)

  // -- PCM data (interleaved 16-bit samples) -------------------------------
  const pcm = new ArrayBuffer(dataSize)
  const pcmView = new DataView(pcm)
  let offset = 0

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      // Clamp float to [-1, 1] then scale to Int16 range
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      pcmView.setInt16(offset, int16, true)
      offset += bytesPerSample
    }
  }

  return new Blob([header, pcm], { type: "audio/wav" })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write an ASCII string into a DataView at the given byte offset. */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
