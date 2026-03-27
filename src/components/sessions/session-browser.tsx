"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SessionCard } from "./session-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecordingSessionMeta } from "@/lib/recording/types";

type SortBy = "date" | "duration" | "name";

export function SessionBrowser() {
  const router = useRouter();
  const [sessions, setSessions] = useState<RecordingSessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("date");

  const loadSessions = useCallback(async () => {
    try {
      const { listRecordingSessions } = await import(
        "@/lib/storage/indexed-db"
      );
      const list = await listRecordingSessions();
      setSessions(list);
    } catch {
      // IndexedDB unavailable — leave empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDelete = async (id: string) => {
    const { deleteRecordingSession } = await import(
      "@/lib/storage/indexed-db"
    );
    await deleteRecordingSession(id);
    await loadSessions();
  };

  const handleOpen = (id: string) => {
    router.push(`/sessions/${id}`);
  };

  const sorted = [...sessions].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "duration":
        return b.durationMs - a.durationMs;
      case "name":
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sessions</CardTitle>
            <div className="flex gap-1">
              {(["date", "duration", "name"] as const).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant="ghost"
                  className={`h-7 text-xs ${sortBy === key ? "bg-muted" : ""}`}
                  onClick={() => setSortBy(key)}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recorded sessions yet. Use the record button in the transport
              bar to capture a performance.
            </p>
          ) : (
            <div className="space-y-2">
              {sorted.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
