"use client";

import { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isTracking: boolean;
  mirror: boolean;
  className?: string;
}

export function CameraFeed({
  videoRef,
  canvasRef,
  isTracking,
  mirror,
  className,
}: CameraFeedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync canvas drawing buffer size with its CSS display size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasRef]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video bg-muted rounded-md overflow-hidden",
        className,
      )}
    >
      {/* Video and canvas are always rendered so refs are available before start() */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          !isTracking && "hidden",
        )}
        style={{ transform: mirror ? "scaleX(-1)" : undefined }}
      />
      {/* Canvas uses CSS mirror only — drawing code passes mirror=false */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 w-full h-full pointer-events-none",
          !isTracking && "hidden",
        )}
        style={{ transform: mirror ? "scaleX(-1)" : undefined }}
      />

      {!isTracking && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/80">
          <Camera className="size-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Start tracking to begin
          </span>
        </div>
      )}
    </div>
  );
}
