"use client";

import { useState } from "react";
import { useProject } from "@/providers/project-provider";
import type { SeqtrackChannel, Pattern, Note } from "@/lib/midi/types";
import type { CompositionOutput } from "@/lib/ai/schema";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const STYLE_PRESETS = [
  "Dark techno beat",
  "Lo-fi hip hop groove",
  "Deep house rhythm",
  "Ambient pad texture",
  "DnB breakbeat",
  "Trap beat with hi-hat rolls",
  "Funky disco groove",
  "Minimal techno loop",
];

export default function ComposePage() {
  const { project, setProject } = useProject();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompositionOutput | null>(null);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async (text?: string) => {
    const actualPrompt = text ?? prompt;
    if (!actualPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: actualPrompt,
          bpm: project.bpm,
          scaleRoot: project.scaleRoot,
          scaleName: project.scaleName,
          bars: 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }

      const data: CompositionOutput = await res.json();
      setResult(data);

      if (data.bpm && data.bpm !== project.bpm) {
        setProject({ ...project, bpm: data.bpm });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    const updatedTracks = { ...project.tracks };

    for (const trackEntry of result.tracks) {
      const ch = trackEntry.channel as SeqtrackChannel;
      if (ch < 1 || ch > 11) continue;

      const track = { ...updatedTracks[ch] };
      const patterns = [...track.patterns];

      if (trackEntry.patterns.length > 0) {
        const genPattern = trackEntry.patterns[0];
        const pattern: Pattern = {
          name: genPattern.name,
          bars: genPattern.bars,
          swing: genPattern.swing,
          notes: genPattern.notes.map((n): Note => ({
            pitch: n.pitch,
            velocity: n.velocity,
            step: n.step,
            duration: n.duration,
            probability: n.probability,
          })),
        };
        patterns[track.activePattern] = pattern;
      }

      track.patterns = patterns;
      updatedTracks[ch] = track;
    }

    setProject({
      ...project,
      tracks: updatedTracks,
      bpm: result.bpm ?? project.bpm,
      updatedAt: new Date().toISOString(),
    });
    setApplied(true);
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Describe the music you want... e.g., 'dark techno beat at 130 BPM with driving bassline'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleGenerate()}
                disabled={loading || !prompt.trim()}
                className="font-mono"
              >
                {loading ? "Generating..." : "Generate"}
              </Button>
              <span className="text-xs text-muted-foreground">Cmd+Enter</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Quick Presets
          </span>
          <div className="flex gap-2 flex-wrap">
            {STYLE_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={loading}
                onClick={() => {
                  setPrompt(preset);
                  handleGenerate(preset);
                }}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Generated Pattern</CardTitle>
                <Button onClick={handleApply} disabled={applied} size="sm">
                  {applied ? "Applied" : "Apply to Project"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{result.description}</p>

              {result.bpm && (
                <Badge variant="outline" className="font-mono">
                  {result.bpm} BPM
                </Badge>
              )}

              <Separator />

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-mono">
                  Generated tracks:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {result.tracks.map((t) => {
                    const info = SEQTRAK_TRACKS[t.channel as SeqtrackChannel];
                    const noteCount = t.patterns[0]?.notes.length ?? 0;
                    return (
                      <Badge key={t.channel} variant="secondary" className="text-xs font-mono">
                        {info?.name ?? `Ch ${t.channel}`} ({noteCount} notes)
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {result.suggestions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      Suggestions:
                    </span>
                    {result.suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="block text-xs text-left text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                          setPrompt(s);
                          handleGenerate(s);
                        }}
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
