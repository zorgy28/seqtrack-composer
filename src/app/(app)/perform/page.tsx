"use client";

import { useHandTracking } from "@/hooks/use-hand-tracking";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import { HandTrackingPanel } from "@/components/perform/hand-tracking-panel";
import { MappingPanel } from "@/components/perform/mapping-panel";
import { OutputMonitor } from "@/components/perform/output-monitor";

export default function PerformPage() {
  const { status, device } = useMidiConnection();
  const {
    isTracking,
    isPaused,
    modelStatus,
    frame,
    ccOutputs,
    mappings,
    config,
    error,
    fps,
    videoRef,
    canvasRef,
    start,
    stop,
    togglePause,
    loadPreset,
    updateMapping,
    addMapping,
    removeMapping,
  } = useHandTracking();

  const handCount = frame?.hands.length ?? 0;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full p-6 space-y-4">
        {/* MIDI connection warning */}
        {status !== "connected" && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            No MIDI device connected. Hand tracking will work for visual feedback,
            but CC values won&apos;t be sent to hardware.
            {device === null && " Connect a SEQTRAK via USB to send CC in real-time."}
          </div>
        )}

        {/* Main layout: camera + mappings side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Camera feed — takes 3/5 on large screens */}
          <div className="lg:col-span-3">
            <HandTrackingPanel
              videoRef={videoRef}
              canvasRef={canvasRef}
              isTracking={isTracking}
              isPaused={isPaused}
              modelStatus={modelStatus}
              fps={fps}
              handCount={handCount}
              error={error}
              mirror={config.mirrorVideo}
              onStart={start}
              onStop={stop}
              onTogglePause={togglePause}
            />
          </div>

          {/* Mapping config — takes 2/5 on large screens */}
          <div className="lg:col-span-2">
            <MappingPanel
              mappings={mappings}
              ccOutputs={ccOutputs}
              onUpdateMapping={updateMapping}
              onAddMapping={addMapping}
              onRemoveMapping={removeMapping}
              onLoadPreset={loadPreset}
            />
          </div>
        </div>

        {/* CC output gauges */}
        <OutputMonitor ccOutputs={ccOutputs} isTracking={isTracking} />
      </div>
    </div>
  );
}
