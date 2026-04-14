"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Play, Pause, Square, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineToolbar } from "./timeline-toolbar";
import { TimelineWaveform } from "./timeline-waveform";
import { TimelineMidiOverlay } from "./timeline-midi-overlay";
import { SelectionInspector } from "./selection-inspector";
import { pairMidiNotes } from "@/lib/recording/session-editor";
import { trimSession, deleteSection } from "@/lib/recording/session-editor";
import { SessionPlayer } from "@/lib/recording/session-player";
import type {
  RecordingSession,
  PairedNote,
  TimelineSelection,
} from "@/lib/recording/types";
import { useMidiConnection } from "@/hooks/use-midi-connection";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TimelineEditorProps {
  session: RecordingSession;
  audioBlob: Blob | null;
  onSessionUpdate: (session: RecordingSession, audioBlob: Blob | null) => void;
  onConvertToPattern: (selection: TimelineSelection) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_ZOOM = 10;
const MAX_ZOOM = 200;
const TIMELINE_HEIGHT = 160;

function formatPlayhead(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

/**
 * Compute the pitch range (min/max) from paired notes.
 * Returns a sensible default when there are no notes.
 */
function computePitchRange(notes: PairedNote[]): { min: number; max: number } {
  if (notes.length === 0) return { min: 48, max: 72 };
  let min = 127;
  let max = 0;
  for (const n of notes) {
    if (n.pitch < min) min = n.pitch;
    if (n.pitch > max) max = n.pitch;
  }
  // Add a small margin so edge notes are not clipped.
  return { min: Math.max(0, min - 2), max: Math.min(127, max + 2) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimelineEditor({
  session,
  audioBlob,
  onSessionUpdate,
  onConvertToPattern,
}: TimelineEditorProps) {
  // ---- MIDI device --------------------------------------------------------
  const { device } = useMidiConnection();

  // ---- State --------------------------------------------------------------
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [scrollOffsetMs, setScrollOffsetMs] = useState(0);
  const [selection, setSelection] = useState<TimelineSelection | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);

  // ---- Refs ---------------------------------------------------------------
  const playerRef = useRef<SessionPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<number | null>(null);

  // ---- Derived ------------------------------------------------------------
  const pairedNotes = useMemo(
    () => pairMidiNotes(session.midiEvents),
    [session.midiEvents],
  );

  const pitchRange = useMemo(() => computePitchRange(pairedNotes), [pairedNotes]);
  const durationMs = session.durationMs;
  const timelineWidth = (durationMs / 1000) * pixelsPerSecond;

  // ---- Player init --------------------------------------------------------
  useEffect(() => {
    const player = new SessionPlayer((ms) => {
      setPlayheadMs(ms);
    });
    playerRef.current = player;

    return () => {
      player.stop();
    };
  }, []);

  // Load audio when blob changes.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !audioBlob) return;

    let cancelled = false;
    player.loadAudio(audioBlob).then((buffer) => {
      if (!cancelled) setAudioBuffer(buffer);
    });

    return () => {
      cancelled = true;
    };
  }, [audioBlob]);

  // Push MIDI events to the player when session changes.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.setMidiEvents(session.midiEvents, device?.id ?? null);
  }, [session.midiEvents, device]);

  // Sync isPlaying state when playback ends.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const id = setInterval(() => {
      if (isPlaying && !player.isPlaying) {
        setIsPlaying(false);
        setPlayheadMs(0);
      }
    }, 200);

    return () => clearInterval(id);
  }, [isPlaying]);

  // ---- Zoom ---------------------------------------------------------------
  const handleZoomIn = useCallback(() => {
    setPixelsPerSecond((prev) => Math.min(MAX_ZOOM, prev * 1.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPixelsPerSecond((prev) => Math.max(MIN_ZOOM, prev / 1.5));
  }, []);

  // ---- Playback -----------------------------------------------------------
  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (player.isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, []);

  const handleStop = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.stop();
    setIsPlaying(false);
    setPlayheadMs(0);
  }, []);

  const handleRewind = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.seek(0);
    setPlayheadMs(0);
  }, []);

  // ---- Mouse selection on the timeline ------------------------------------
  const xToTimeMs = useCallback(
    (clientX: number): number => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left + container.scrollLeft;
      return (x / pixelsPerSecond) * 1000 + scrollOffsetMs;
    },
    [pixelsPerSecond, scrollOffsetMs],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only primary button.
      if (e.button !== 0) return;
      const timeMs = xToTimeMs(e.clientX);
      dragStartRef.current = timeMs;
      setSelection(null);
    },
    [xToTimeMs],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragStartRef.current === null) return;
      const currentMs = xToTimeMs(e.clientX);
      const start = Math.max(0, Math.min(dragStartRef.current, currentMs));
      const end = Math.min(durationMs, Math.max(dragStartRef.current, currentMs));
      setSelection({ startMs: start, endMs: end });
    },
    [xToTimeMs, durationMs],
  );

  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  // ---- Scroll sync --------------------------------------------------------
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const offsetMs = (container.scrollLeft / pixelsPerSecond) * 1000;
    setScrollOffsetMs(offsetMs);
  }, [pixelsPerSecond]);

  // ---- Editing actions ----------------------------------------------------
  const handleTrim = useCallback(async () => {
    if (!selection) return;
    const result = await trimSession(
      session,
      audioBlob,
      selection.startMs,
      selection.endMs,
    );
    setSelection(null);
    setPlayheadMs(0);
    onSessionUpdate(result.session, result.audioBlob);
  }, [session, audioBlob, selection, onSessionUpdate]);

  const handleDeleteSection = useCallback(async () => {
    if (!selection) return;
    const result = await deleteSection(
      session,
      audioBlob,
      selection.startMs,
      selection.endMs,
    );
    setSelection(null);
    setPlayheadMs(0);
    onSessionUpdate(result.session, result.audioBlob);
  }, [session, audioBlob, selection, onSessionUpdate]);

  const handleConvertToPattern = useCallback(() => {
    if (!selection) return;
    onConvertToPattern(selection);
  }, [selection, onConvertToPattern]);

  // ---- Render -------------------------------------------------------------
  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <TimelineToolbar
        pixelsPerSecond={pixelsPerSecond}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        selection={selection}
        onTrim={handleTrim}
        onDeleteSection={handleDeleteSection}
        onConvertToPattern={handleConvertToPattern}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled((v) => !v)}
        bpm={session.bpm}
      />

      {/* Playback controls */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleStop}
        >
          <Square className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleRewind}
        >
          <SkipBack className="size-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground font-mono ml-2">
          {formatPlayhead(playheadMs)} / {formatPlayhead(durationMs)}
        </span>
      </div>

      {/* Timeline container */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto"
        style={{ height: TIMELINE_HEIGHT }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onScroll={handleScroll}
      >
        <div
          className="relative"
          style={{ width: timelineWidth, height: TIMELINE_HEIGHT }}
        >
          {/* Waveform layer */}
          <TimelineWaveform
            audioBuffer={audioBuffer}
            pixelsPerSecond={pixelsPerSecond}
            scrollOffsetMs={scrollOffsetMs}
            selection={selection}
            playheadMs={playheadMs}
            height={TIMELINE_HEIGHT}
          />

          {/* MIDI overlay layer */}
          <TimelineMidiOverlay
            notes={pairedNotes}
            pixelsPerSecond={pixelsPerSecond}
            scrollOffsetMs={scrollOffsetMs}
            durationMs={durationMs}
            height={TIMELINE_HEIGHT}
            pitchRange={pitchRange}
          />

          {/* Selection overlay */}
          {selection && (
            <div
              className="absolute top-0 bottom-0 bg-primary/10 border-l border-r border-primary/40 pointer-events-none"
              style={{
                left: (selection.startMs / 1000) * pixelsPerSecond,
                width:
                  ((selection.endMs - selection.startMs) / 1000) *
                  pixelsPerSecond,
              }}
            />
          )}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-10"
            style={{
              left: (playheadMs / 1000) * pixelsPerSecond,
            }}
          />
        </div>
      </div>

      {/* Selection inspector */}
      <SelectionInspector
        selection={selection}
        notes={pairedNotes}
        bpm={session.bpm}
      />
    </div>
  );
}
