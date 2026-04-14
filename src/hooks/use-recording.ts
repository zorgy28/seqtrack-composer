"use client";

import { useTransport } from "@/providers/transport-provider";
import { useAudioMonitor } from "@/hooks/use-audio-monitor";

export function useRecording() {
  const {
    recordState,
    recordingElapsedMs,
    recordingMidiCount,
    armRecord,
    startRecord,
    stopRecord,
    discardRecord,
  } = useTransport();

  const { getStream, isCapturing, startCapture } = useAudioMonitor();

  const startRecordingWithAudio = async () => {
    // Ensure audio is capturing before starting record
    if (!isCapturing) {
      await startCapture();
    }
    const stream = getStream();
    await startRecord(stream ?? undefined);
  };

  return {
    recordState,
    recordingElapsedMs,
    recordingMidiCount,
    armRecord,
    startRecording: startRecordingWithAudio,
    stopRecording: stopRecord,
    discardRecording: discardRecord,
  };
}
