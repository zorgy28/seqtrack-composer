"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Mic,
  MicOff,
  Activity,
  BarChart3,
  SignalHigh,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAudioMonitor } from "@/hooks/use-audio-monitor";
import { getSettings, updateSettings } from "@/lib/settings";

interface AudioMonitorProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Waveform Canvas — oscilloscope visualization
// ---------------------------------------------------------------------------

const WaveformCanvas = memo(function WaveformCanvas({
  getAnalyser,
}: {
  getAnalyser: () => AnalyserNode | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  // Pre-allocate typed array to avoid GC pressure (~30 allocs/sec eliminated)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw(timestamp: number) {
      // 30fps cap: skip frame if less than ~33ms elapsed
      if (timestamp - lastFrameRef.current < 33) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = timestamp;

      const analyser = getAnalyser();
      if (!analyser || !canvas || !ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.fftSize;
      // Reuse buffer if size matches, otherwise allocate once
      if (!dataRef.current || dataRef.current.length !== bufferLength) {
        dataRef.current = new Uint8Array(bufferLength);
      }
      const data = dataRef.current;
      analyser.getByteTimeDomainData(data);

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "rgba(10, 10, 15, 1)";
      ctx.fillRect(0, 0, w, h);

      // Draw center line
      ctx.strokeStyle = "rgba(34, 197, 94, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Draw waveform
      ctx.strokeStyle = "rgb(34, 197, 94)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = data[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [getAnalyser]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = 60 * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      }
    });

    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md"
      style={{ height: 60 }}
    />
  );
});

// ---------------------------------------------------------------------------
// Spectrum Canvas — frequency bar visualization (log-scale x-axis)
// ---------------------------------------------------------------------------

const SpectrumCanvas = memo(function SpectrumCanvas({
  getAnalyser,
}: {
  getAnalyser: () => AnalyserNode | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  // Pre-allocate typed array to avoid GC pressure (~30 allocs/sec eliminated)
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw(timestamp: number) {
      // 30fps cap: skip frame if less than ~33ms elapsed
      if (timestamp - lastFrameRef.current < 33) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = timestamp;

      const analyser = getAnalyser();
      if (!analyser || !canvas || !ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const binCount = analyser.frequencyBinCount;
      // Reuse buffer if size matches, otherwise allocate once
      if (!dataRef.current || dataRef.current.length !== binCount) {
        dataRef.current = new Uint8Array(binCount);
      }
      const data = dataRef.current;
      analyser.getByteFrequencyData(data);

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "rgba(10, 10, 15, 1)";
      ctx.fillRect(0, 0, w, h);

      // Number of visual bars
      const barCount = 64;
      const barWidth = w / barCount - 1;
      const nyquist = analyser.context.sampleRate / 2;

      // Log-scale mapping: map each bar to a frequency range
      const minFreq = 20;
      const maxFreq = Math.min(nyquist, 20000);
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency range (log-scale)
        const freqLow = Math.pow(10, logMin + (i / barCount) * (logMax - logMin));
        const freqHigh = Math.pow(
          10,
          logMin + ((i + 1) / barCount) * (logMax - logMin),
        );

        // Map frequency to bin index
        const binLow = Math.floor((freqLow / nyquist) * data.length);
        const binHigh = Math.min(
          Math.ceil((freqHigh / nyquist) * data.length),
          data.length - 1,
        );

        // Average the bins in this range
        let sum = 0;
        let count = 0;
        for (let b = binLow; b <= binHigh; b++) {
          sum += data[b];
          count++;
        }
        const avg = count > 0 ? sum / count : 0;

        const barHeight = (avg / 255) * h;
        const x = i * (barWidth + 1);

        // Gradient from cyan to purple based on frequency
        const t = i / barCount;
        const r = Math.round(34 + t * 134);    // 34 -> 168
        const g = Math.round(211 - t * 130);    // 211 -> 81
        const b_ = Math.round(238 + t * (130 - 238) * -0.2); // stay blueish

        ctx.fillStyle = `rgb(${r}, ${g}, ${b_})`;
        ctx.fillRect(x, h - barHeight, barWidth, barHeight);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [getAnalyser]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = 60 * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      }
    });

    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-md"
      style={{ height: 60 }}
    />
  );
});

// ---------------------------------------------------------------------------
// Level Meter — horizontal bar with green/yellow/red gradient and dB readout
// ---------------------------------------------------------------------------

const LevelMeter = memo(function LevelMeter({ level }: { level: number }) {
  // Convert to dB for display
  const db = level > 0 ? 20 * Math.log10(level) : -Infinity;
  const dbLabel = db === -Infinity ? "-inf" : `${db.toFixed(0)} dB`;

  // Map level to a 0-100 percentage for the bar width
  // Use a dB-scale mapping for better visual response
  // -60dB = 0%, 0dB = 100%
  const dbClamped = Math.max(-60, Math.min(0, db));
  const percent = ((dbClamped + 60) / 60) * 100;

  // Color based on level
  let barColor = "bg-green-500";
  if (percent > 85) barColor = "bg-red-500";
  else if (percent > 70) barColor = "bg-yellow-500";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-10 shrink-0">Level</span>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-75", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-16 text-right shrink-0">
        {dbLabel}
      </span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// AudioMonitor — collapsible panel
// ---------------------------------------------------------------------------

export function AudioMonitor({ className }: AudioMonitorProps) {
  const {
    isCapturing,
    isMonitoring,
    level,
    devices,
    selectedDeviceId,
    error,
    startCapture,
    stopCapture,
    toggleMonitoring,
    setVolume,
    getAnalyser,
  } = useAudioMonitor();

  const [expanded, setExpanded] = useState(false);
  const [volume, setVolumeState] = useState(100);

  // Visualization toggles — hydrated from settings, persisted on change.
  // When a toggle flips OFF, the corresponding canvas component unmounts
  // entirely, which cancels its rAF loop via useEffect cleanup. This is
  // the fix for the playback lag — those 30fps rAF loops were running
  // constantly and competing with the MIDI tick handler.
  const [showWaveform, setShowWaveform] = useState(() => getSettings().showWaveform);
  const [showSpectrum, setShowSpectrum] = useState(() => getSettings().showSpectrum);
  const [showLevelMeter, setShowLevelMeter] = useState(() => getSettings().showLevelMeter);

  const toggleWaveform = useCallback(() => {
    setShowWaveform((v) => {
      const next = !v;
      updateSettings({ showWaveform: next });
      return next;
    });
  }, []);

  const toggleSpectrum = useCallback(() => {
    setShowSpectrum((v) => {
      const next = !v;
      updateSettings({ showSpectrum: next });
      return next;
    });
  }, []);

  const toggleLevelMeter = useCallback(() => {
    setShowLevelMeter((v) => {
      const next = !v;
      updateSettings({ showLevelMeter: next });
      return next;
    });
  }, []);

  // Auto-start capture + monitoring when expanding (saves 3 clicks)
  const handleExpand = useCallback(async () => {
    setExpanded(true);
    if (!isCapturing) {
      await startCapture(selectedDeviceId ?? undefined);
      // Enable speaker monitoring by default
      toggleMonitoring();
    }
  }, [isCapturing, startCapture, selectedDeviceId, toggleMonitoring]);

  const handleVolumeChange = useCallback(
    (values: number[]) => {
      const v = values[0];
      setVolumeState(v);
      setVolume(v / 100);
    },
    [setVolume],
  );

  const handleToggleCapture = useCallback(async () => {
    if (isCapturing) {
      stopCapture();
    } else {
      await startCapture(selectedDeviceId ?? undefined);
    }
  }, [isCapturing, stopCapture, startCapture, selectedDeviceId]);

  const handleDeviceChange = useCallback(
    async (value: string | null) => {
      if (!value) return;
      // Stop current capture and restart with new device
      if (isCapturing) {
        stopCapture();
      }
      await startCapture(value);
    },
    [isCapturing, stopCapture, startCapture],
  );

  // Collapsed view — thin bar
  if (!expanded) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 border-t border-border bg-muted/30 cursor-pointer select-none",
          className,
        )}
        onClick={handleExpand}
      >
        <Volume2 className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">
          Audio Monitor
        </span>

        {/* Inline mini level bar */}
        <div className="flex-1 max-w-48 h-1.5 bg-muted rounded-full overflow-hidden">
          {isCapturing && (
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-75"
              style={{
                width: `${Math.min(100, ((Math.max(-60, level > 0 ? 20 * Math.log10(level) : -60) + 60) / 60) * 100)}%`,
              }}
            />
          )}
        </div>

        {isCapturing && (
          <span className="text-[10px] text-green-500 font-mono">LIVE</span>
        )}

        <div className="flex-1" />

        {isCapturing && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              toggleMonitoring();
            }}
          >
            {isMonitoring ? (
              <Volume2 className="size-3" />
            ) : (
              <VolumeX className="size-3" />
            )}
          </Button>
        )}

        <ChevronUp className="size-3 text-muted-foreground" />
      </div>
    );
  }

  // Expanded view
  return (
    <div
      className={cn(
        "border-t border-border bg-background flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Volume2 className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Audio Monitor</span>

        {isCapturing && (
          <span className="text-[10px] text-green-500 font-mono font-semibold tracking-wider">
            LIVE
          </span>
        )}

        {/* Device selector */}
        {devices.length > 0 && (
          <Select
            value={selectedDeviceId ?? undefined}
            onValueChange={handleDeviceChange}
          >
            <SelectTrigger size="sm" className="ml-2 max-w-48 text-xs">
              <SelectValue placeholder="Select device..." />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Audio Input ${d.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        {/* Capture toggle */}
        <Button
          variant={isCapturing ? "destructive" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={handleToggleCapture}
        >
          {isCapturing ? (
            <>
              <MicOff className="size-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Mic className="size-3 mr-1" />
              Capture
            </>
          )}
        </Button>

        {/* Monitor toggle */}
        {isCapturing && (
          <Button
            variant={isMonitoring ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={toggleMonitoring}
          >
            {isMonitoring ? (
              <>
                <Volume2 className="size-3 mr-1" />
                Monitor
              </>
            ) : (
              <>
                <VolumeX className="size-3 mr-1" />
                Muted
              </>
            )}
          </Button>
        )}

        {/* Volume slider */}
        {isCapturing && (
          <div className="flex items-center gap-2 w-28">
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
            <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
              {volume}%
            </span>
          </div>
        )}

        {/* Visualization toggles */}
        {isCapturing && (
          <div className="flex items-center gap-0.5 mr-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(
                "h-6 w-6",
                showWaveform ? "text-primary" : "text-muted-foreground/40",
              )}
              onClick={toggleWaveform}
              title={showWaveform ? "Hide waveform" : "Show waveform"}
            >
              <Activity className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(
                "h-6 w-6",
                showSpectrum ? "text-primary" : "text-muted-foreground/40",
              )}
              onClick={toggleSpectrum}
              title={showSpectrum ? "Hide spectrum" : "Show spectrum"}
            >
              <BarChart3 className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(
                "h-6 w-6",
                showLevelMeter ? "text-primary" : "text-muted-foreground/40",
              )}
              onClick={toggleLevelMeter}
              title={showLevelMeter ? "Hide level meter" : "Show level meter"}
            >
              <SignalHigh className="size-3" />
            </Button>
          </div>
        )}

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setExpanded(false)}
        >
          <ChevronDown className="size-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-2">
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
            {error}
          </div>
        )}

        {!isCapturing && !error && (
          <div className="text-xs text-muted-foreground text-center py-4">
            {devices.some(
              (d) =>
                d.label.toLowerCase().includes("seqtrak") ||
                d.label.toLowerCase().includes("yamaha"),
            )
              ? 'Click "Capture" to start monitoring SEQTRAK audio'
              : "Connect SEQTRAK via USB to enable audio monitoring"}
          </div>
        )}

        {isCapturing && (
          <>
            {/* Waveform — unmounted entirely when disabled, stops rAF loop */}
            {showWaveform && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Waveform
                </span>
                <WaveformCanvas getAnalyser={getAnalyser} />
              </div>
            )}

            {/* Spectrum — unmounted entirely when disabled, stops rAF loop */}
            {showSpectrum && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Spectrum
                </span>
                <SpectrumCanvas getAnalyser={getAnalyser} />
              </div>
            )}

            {/* Level meter */}
            {showLevelMeter && <LevelMeter level={level} />}

            {!showWaveform && !showSpectrum && !showLevelMeter && (
              <div className="text-[10px] text-muted-foreground/60 text-center py-2">
                Visualizations hidden — use toggles in header to show.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
