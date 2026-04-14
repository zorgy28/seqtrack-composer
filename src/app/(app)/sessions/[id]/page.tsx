"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Music, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/providers/project-provider";
import type { RecordingSession, TimelineSelection } from "@/lib/recording/types";
import type { SeqtrackChannel, Pattern } from "@/lib/midi/types";
import dynamic from "next/dynamic";

const TimelineEditor = dynamic(
  () =>
    import("@/components/sessions/timeline-editor").then((m) => ({
      default: m.TimelineEditor,
    })),
  { ssr: false },
);

const ConvertToPatternDialog = dynamic(
  () =>
    import("@/components/sessions/convert-to-pattern-dialog").then((m) => ({
      default: m.ConvertToPatternDialog,
    })),
  { ssr: false },
);

// ── Helpers ──────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Map a MediaRecorder MIME type to a sensible filename extension. */
function mimeTypeToExt(mimeType: string): string {
  if (!mimeType) return "webm";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

// ── Component ────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { updatePattern } = useProject();

  const id = params.id;

  // ── Session data ─────────────────────────────────────────────
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Convert dialog ───────────────────────────────────────────
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertSelection, setConvertSelection] =
    useState<TimelineSelection | null>(null);

  // ── Load session on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { loadRecordingSession, loadRecordingAudio } = await import(
          "@/lib/storage/indexed-db"
        );
        const [sess, audio] = await Promise.all([
          loadRecordingSession(id),
          loadRecordingAudio(id),
        ]);

        if (cancelled) return;

        if (!sess) {
          setError("Session not found");
        } else {
          setSession(sess);
          setAudioBlob(audio);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load session",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Callbacks ────────────────────────────────────────────────

  const handleSessionUpdate = useCallback(
    async (updatedSession: RecordingSession, updatedAudio: Blob | null) => {
      setSession(updatedSession);
      setAudioBlob(updatedAudio);

      // Persist to IndexedDB
      const { saveRecordingSessionWithAudio } = await import(
        "@/lib/storage/indexed-db"
      );
      await saveRecordingSessionWithAudio(updatedSession, updatedAudio);
    },
    [],
  );

  const handleConvertToPattern = useCallback(
    (selection: TimelineSelection) => {
      setConvertSelection(selection);
      setConvertOpen(true);
    },
    [],
  );

  const handleApplyPatterns = useCallback(
    (patterns: Map<SeqtrackChannel, Pattern>) => {
      for (const [channel, pattern] of patterns) {
        updatePattern(channel, 0, pattern);
      }
      setConvertOpen(false);
    },
    [updatePattern],
  );

  const handleBack = useCallback(() => {
    router.push("/sessions");
  }, [router]);

  // Download the recorded audio blob to disk. The blob is the raw output
  // of MediaRecorder — typically WebM/Opus on Chrome/Electron. The file
  // extension is derived from the blob's MIME type so the user gets a
  // valid filename (.webm / .ogg / .wav).
  const handleDownloadAudio = useCallback(() => {
    if (!audioBlob || !session) return;
    const ext = mimeTypeToExt(audioBlob.type);
    const safeName = (session.name || "recording").replace(/[^\w.-]+/g, "_");
    const filename = `${safeName}.${ext}`;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Free the object URL after the download has had time to start
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [audioBlob, session]);

  // ── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  // ── Error / not found state ──────────────────────────────────

  if (error || !session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          {error ?? "Session not found"}
        </p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="size-3 mr-1" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back</span>
        </Button>

        <h1 className="text-sm font-medium truncate">{session.name}</h1>

        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
          {session.bpm} BPM
        </Badge>

        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono shrink-0">
          <Clock className="size-3" />
          {formatDuration(session.durationMs)}
        </span>

        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono shrink-0">
          <Music className="size-3" />
          {session.midiEventCount} events
        </span>

        <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-auto">
          {formatDate(session.createdAt)}
        </span>

        {/* Download audio button — disabled when no audio was captured */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadAudio}
          disabled={!audioBlob}
          title={
            audioBlob
              ? `Download recorded audio (${(audioBlob.size / 1024 / 1024).toFixed(1)} MB, ${audioBlob.type || "webm"})`
              : "No audio captured for this session — enable Audio Monitor before recording to capture audio"
          }
        >
          <Download className="size-3 mr-1" />
          Audio
        </Button>
      </div>

      {/* Timeline Editor */}
      <div className="flex-1 overflow-hidden">
        <TimelineEditor
          session={session}
          audioBlob={audioBlob}
          onSessionUpdate={handleSessionUpdate}
          onConvertToPattern={handleConvertToPattern}
        />
      </div>

      {/* Convert Dialog */}
      {convertSelection && (
        <ConvertToPatternDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          midiEvents={session.midiEvents}
          selection={convertSelection}
          bpm={session.bpm}
          onApply={handleApplyPatterns}
        />
      )}
    </div>
  );
}
