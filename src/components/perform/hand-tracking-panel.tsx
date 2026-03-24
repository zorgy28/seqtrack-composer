"use client";

import { Play, Square, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { CameraFeed } from "./camera-feed";
import type { ModelLoadStatus } from "@/lib/handtracking/types";

interface HandTrackingPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isTracking: boolean;
  isPaused: boolean;
  modelStatus: ModelLoadStatus;
  fps: number;
  handCount: number;
  error: string | null;
  mirror: boolean;
  onStart: () => void;
  onStop: () => void;
  onTogglePause: () => void;
}

function ModelStatusIndicator({ status }: { status: ModelLoadStatus }) {
  switch (status) {
    case "idle":
      return <Badge variant="secondary">Idle</Badge>;
    case "loading":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="size-3 animate-spin" />
          Loading
        </Badge>
      );
    case "ready":
      return <Badge variant="default">Ready</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
  }
}

export function HandTrackingPanel({
  videoRef,
  canvasRef,
  isTracking,
  isPaused,
  modelStatus,
  fps,
  handCount,
  error,
  mirror,
  onStart,
  onStop,
  onTogglePause,
}: HandTrackingPanelProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle>Hand Tracking</CardTitle>
          <div className="flex items-center gap-1.5 ml-auto">
            <ModelStatusIndicator status={modelStatus} />
            {isTracking && (
              <>
                <Badge variant="outline" className="font-mono tabular-nums">
                  {fps} FPS
                </Badge>
                <Badge variant="outline" className="font-mono tabular-nums">
                  {handCount} {handCount === 1 ? "hand" : "hands"}
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <CameraFeed
          videoRef={videoRef}
          canvasRef={canvasRef}
          isTracking={isTracking}
          mirror={mirror}
        />

        {error && (
          <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded-md px-2 py-1.5">
            {error}
          </div>
        )}

        {modelStatus === "loading" && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Loading model...
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex items-center gap-2">
          {!isTracking ? (
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs"
              onClick={onStart}
              disabled={modelStatus === "loading"}
            >
              <Play className="size-3 mr-1" />
              Start
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={onStop}
              >
                <Square className="size-3 mr-1" />
                Stop
              </Button>
              <Button
                variant={isPaused ? "default" : "outline"}
                size="sm"
                className={cn("h-7 text-xs")}
                onClick={onTogglePause}
              >
                <Pause className="size-3 mr-1" />
                {isPaused ? "Resume" : "Pause"}
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
