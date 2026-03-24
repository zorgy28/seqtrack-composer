/**
 * SEQTRAK USB audio capture and monitoring via Web Audio API.
 *
 * This module provides low-level functions for:
 * - Enumerating audio input devices
 * - Auto-detecting the SEQTRAK USB audio interface
 * - Capturing audio from a device into a Web Audio graph
 * - Enabling/disabling speaker monitoring
 * - Reading frequency, waveform, and RMS level data for visualization
 */

/**
 * List available audio input devices.
 * Returns devices that can be used with getUserMedia.
 */
export async function listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === "audioinput");
}

/**
 * Find the SEQTRAK audio input device by name.
 * Looks for "seqtrak" or "yamaha" in the device label (case-insensitive).
 */
export async function findSeqtrackAudioInput(): Promise<MediaDeviceInfo | null> {
  const inputs = await listAudioInputDevices();
  return (
    inputs.find(
      (d) =>
        d.label.toLowerCase().includes("seqtrak") ||
        d.label.toLowerCase().includes("yamaha"),
    ) ?? null
  );
}

export interface AudioMonitorState {
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  gainNode: GainNode;
  stream: MediaStream;
  isMonitoring: boolean;
}

/**
 * Start capturing audio from a specific device.
 * Returns the audio processing graph — connect gainNode to audioContext.destination to hear it.
 */
export async function startAudioCapture(
  deviceId?: string,
): Promise<AudioMonitorState> {
  const constraints: MediaStreamConstraints = {
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      // Disable all processing — we want the raw SEQTRAK audio, not mic processing
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      // Request stereo if available
      channelCount: 2,
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  const audioContext = new AudioContext({
    latencyHint: "interactive",
    sampleRate: 44100,
  });

  const source = audioContext.createMediaStreamSource(stream);

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1.0;

  // Audio graph: source -> analyser -> gainNode -> (destination if monitoring)
  source.connect(analyser);
  analyser.connect(gainNode);
  // Don't connect to destination yet — user must enable monitoring

  return { audioContext, source, analyser, gainNode, stream, isMonitoring: false };
}

/**
 * Enable monitoring — routes audio to speakers.
 */
export function enableMonitoring(state: AudioMonitorState): void {
  state.gainNode.connect(state.audioContext.destination);
  state.isMonitoring = true;
}

/**
 * Disable monitoring — stops audio to speakers but keeps capture active for visualization.
 */
export function disableMonitoring(state: AudioMonitorState): void {
  try {
    state.gainNode.disconnect(state.audioContext.destination);
  } catch {
    // Already disconnected — ignore
  }
  state.isMonitoring = false;
}

/**
 * Get frequency spectrum data (for bar visualization).
 * Returns Uint8Array of frequency bin magnitudes (0-255).
 */
export function getFrequencyData(analyser: AnalyserNode): Uint8Array {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

/**
 * Get waveform data (for oscilloscope visualization).
 * Returns Uint8Array of time-domain samples (0-255, center at 128).
 */
export function getWaveformData(analyser: AnalyserNode): Uint8Array {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  return data;
}

/**
 * Get RMS level (for VU meter). Returns 0-1.
 */
export function getRMSLevel(analyser: AnalyserNode): number {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

/**
 * Convert a linear 0-1 RMS level to dBFS.
 * Returns -Infinity for silence, 0 for full scale.
 */
export function rmsToDb(rms: number): number {
  if (rms <= 0) return -Infinity;
  return 20 * Math.log10(rms);
}

/**
 * Stop all capture and release resources.
 */
export function stopAudioCapture(state: AudioMonitorState): void {
  disableMonitoring(state);
  state.source.disconnect();
  state.analyser.disconnect();
  state.gainNode.disconnect();
  state.stream.getTracks().forEach((t) => t.stop());
  state.audioContext.close();
}
