"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NOTE_NAMES, SCALE_NAMES, BPM_MIN, BPM_MAX } from "@/lib/midi/constants";
import {
  getSettings,
  updateSettings,
  resetSettings,
  exportSettings,
  importSettings,
  getStorageUsage,
  type AppSettings,
  type PlaybackMode,
  type LlmProvider,
  type StepGridSize,
  type StemModel,
} from "@/lib/settings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// Small reusable sub-components
// ---------------------------------------------------------------------------

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-muted-foreground">{children}</span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(partial: Partial<AppSettings>) {
    const next = updateSettings(partial);
    setSettings(next);
  }

  // ---- Storage helpers ----
  const storage = getStorageUsage();
  const usagePct = Math.min((storage.used / storage.limit) * 100, 100);

  function clearKey(pattern: string, label: string) {
    if (!window.confirm(`Clear all ${label}? This cannot be undone.`)) return;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes(pattern)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    setSettings(getSettings()); // refresh
  }

  function handleExport() {
    const json = exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seqtrack-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = importSettings(reader.result as string);
        setSettings(next);
      } catch {
        alert("Invalid settings file.");
      }
    };
    reader.readAsText(file);
    // reset so the same file can be re-imported
    e.target.value = "";
  }

  function handleClearAll() {
    if (!window.confirm("Clear ALL application data? This cannot be undone.")) return;
    localStorage.clear();
    resetSettings();
    setSettings(getSettings());
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold tracking-tight">Settings</h1>

      {/* ----------------------------------------------------------------- */}
      {/* 1. Audio & MIDI                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Audio & MIDI</CardTitle>
          <CardDescription>Playback routing and monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playback mode */}
          <div className="space-y-1.5">
            <FieldLabel>Playback Mode</FieldLabel>
            <div className="flex gap-2">
              {(["device", "internal", "both"] as PlaybackMode[]).map((m) => (
                <ToggleButton
                  key={m}
                  active={settings.playbackMode === m}
                  label={m.charAt(0).toUpperCase() + m.slice(1)}
                  onClick={() => handleChange({ playbackMode: m })}
                />
              ))}
            </div>
          </div>

          {/* Auto-monitor */}
          <div className="flex items-center justify-between">
            <FieldLabel>Auto-Monitor Input</FieldLabel>
            <ToggleButton
              active={settings.autoMonitor}
              label={settings.autoMonitor ? "On" : "Off"}
              onClick={() => handleChange({ autoMonitor: !settings.autoMonitor })}
            />
          </div>

          {/* Monitor volume */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel>Monitor Volume</FieldLabel>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.monitorVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.monitorVolume}
              onChange={(e) => handleChange({ monitorVolume: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 2. AI & Models                                                     */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>AI & Models</CardTitle>
          <CardDescription>LLM provider and generation parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider toggle */}
          <div className="space-y-1.5">
            <FieldLabel>Provider</FieldLabel>
            <div className="flex gap-2">
              {(["claude", "lm-studio"] as LlmProvider[]).map((p) => (
                <ToggleButton
                  key={p}
                  active={settings.llmProvider === p}
                  label={p === "claude" ? "Claude" : "LM Studio"}
                  onClick={() => handleChange({ llmProvider: p })}
                />
              ))}
            </div>
          </div>

          {/* LM Studio URL */}
          <div className="space-y-1.5">
            <FieldLabel>LM Studio URL</FieldLabel>
            <input
              type="text"
              value={settings.lmStudioUrl}
              onChange={(e) => handleChange({ lmStudioUrl: e.target.value })}
              placeholder="http://localhost:1234/v1"
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* LM Studio model */}
          <div className="space-y-1.5">
            <FieldLabel>LM Studio Model</FieldLabel>
            <input
              type="text"
              value={settings.lmStudioModel}
              onChange={(e) => handleChange({ lmStudioModel: e.target.value })}
              placeholder="model-name"
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel>Temperature</FieldLabel>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.temperature * 100)}
              onChange={(e) =>
                handleChange({ temperature: Number(e.target.value) / 100 })
              }
              className="w-full accent-primary"
            />
          </div>

          {/* Max tokens */}
          <div className="space-y-1.5">
            <FieldLabel>Max Tokens</FieldLabel>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) =>
                handleChange({ maxTokens: Math.max(256, Number(e.target.value)) })
              }
              min={256}
              max={65536}
              step={256}
              className="w-32 rounded-lg border border-input bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Composition Defaults                                            */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Composition Defaults</CardTitle>
          <CardDescription>Default values for new compositions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* BPM */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel>Default BPM</FieldLabel>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.defaultBpm}
              </span>
            </div>
            <input
              type="range"
              min={BPM_MIN}
              max={BPM_MAX}
              value={settings.defaultBpm}
              onChange={(e) => handleChange({ defaultBpm: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Key */}
          <div className="space-y-1.5">
            <FieldLabel>Default Key</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_NAMES.map((note) => (
                <ToggleButton
                  key={note}
                  active={settings.defaultKey === note}
                  label={note}
                  onClick={() => handleChange({ defaultKey: note })}
                />
              ))}
            </div>
          </div>

          {/* Scale */}
          <div className="space-y-1.5">
            <FieldLabel>Default Scale</FieldLabel>
            <select
              value={settings.defaultScale}
              onChange={(e) => handleChange({ defaultScale: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SCALE_NAMES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Bars */}
          <div className="space-y-1.5">
            <FieldLabel>Default Bars</FieldLabel>
            <div className="flex gap-2">
              {[1, 2, 4, 8].map((n) => (
                <ToggleButton
                  key={n}
                  active={settings.defaultBars === n}
                  label={String(n)}
                  onClick={() => handleChange({ defaultBars: n })}
                />
              ))}
            </div>
          </div>

          {/* Swing */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel>Default Swing</FieldLabel>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.defaultSwing}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.defaultSwing}
              onChange={(e) => handleChange({ defaultSwing: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Auto-melodic */}
          <div className="flex items-center justify-between">
            <FieldLabel>Auto-Melodic Generation</FieldLabel>
            <ToggleButton
              active={settings.autoMelodic}
              label={settings.autoMelodic ? "On" : "Off"}
              onClick={() => handleChange({ autoMelodic: !settings.autoMelodic })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Editor                                                          */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Editor</CardTitle>
          <CardDescription>Step grid and piano roll preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Octave range */}
          <div className="space-y-1.5">
            <FieldLabel>Piano Roll Octaves</FieldLabel>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <ToggleButton
                  key={n}
                  active={settings.pianoRollOctaves === n}
                  label={String(n)}
                  onClick={() => handleChange({ pianoRollOctaves: n })}
                />
              ))}
            </div>
          </div>

          {/* Harmony hints */}
          <div className="flex items-center justify-between">
            <FieldLabel>Show Harmony Hints</FieldLabel>
            <ToggleButton
              active={settings.showHarmonyHints}
              label={settings.showHarmonyHints ? "On" : "Off"}
              onClick={() =>
                handleChange({ showHarmonyHints: !settings.showHarmonyHints })
              }
            />
          </div>

          {/* Auto-play on apply */}
          <div className="flex items-center justify-between">
            <FieldLabel>Auto-Play on Apply</FieldLabel>
            <ToggleButton
              active={settings.autoPlayOnApply}
              label={settings.autoPlayOnApply ? "On" : "Off"}
              onClick={() =>
                handleChange({ autoPlayOnApply: !settings.autoPlayOnApply })
              }
            />
          </div>

          {/* Grid size */}
          <div className="space-y-1.5">
            <FieldLabel>Step Grid Size</FieldLabel>
            <div className="flex gap-2">
              {(["compact", "normal", "large"] as StepGridSize[]).map((s) => (
                <ToggleButton
                  key={s}
                  active={settings.stepGridSize === s}
                  label={s.charAt(0).toUpperCase() + s.slice(1)}
                  onClick={() => handleChange({ stepGridSize: s })}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Transcription / ML                                              */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription</CardTitle>
          <CardDescription>Audio analysis and stem separation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ML Service URL */}
          <div className="space-y-1.5">
            <FieldLabel>ML Service URL</FieldLabel>
            <input
              type="text"
              value={settings.mlServiceUrl}
              onChange={(e) => handleChange({ mlServiceUrl: e.target.value })}
              placeholder="http://localhost:8200"
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Stem model */}
          <div className="space-y-1.5">
            <FieldLabel>Default Stem Model</FieldLabel>
            <div className="flex gap-2">
              {(["htdemucs", "htdemucs_6s", "mdx_extra"] as StemModel[]).map(
                (m) => (
                  <ToggleButton
                    key={m}
                    active={settings.defaultStemModel === m}
                    label={m}
                    onClick={() => handleChange({ defaultStemModel: m })}
                  />
                )
              )}
            </div>
          </div>

          {/* Auto-detect BPM */}
          <div className="flex items-center justify-between">
            <FieldLabel>Auto-Detect BPM</FieldLabel>
            <ToggleButton
              active={settings.autoDetectBpm}
              label={settings.autoDetectBpm ? "On" : "Off"}
              onClick={() =>
                handleChange({ autoDetectBpm: !settings.autoDetectBpm })
              }
            />
          </div>

          {/* Max history */}
          <div className="space-y-1.5">
            <FieldLabel>Max History Items</FieldLabel>
            <input
              type="number"
              value={settings.maxHistory}
              onChange={(e) =>
                handleChange({ maxHistory: Math.max(1, Number(e.target.value)) })
              }
              min={1}
              max={100}
              className="w-24 rounded-lg border border-input bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* 6. Storage & Data                                                  */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Storage & Data</CardTitle>
          <CardDescription>
            Manage locally stored data ({formatBytes(storage.used)} of{" "}
            {formatBytes(storage.limit)} used)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Usage bar */}
          <div className="space-y-1.5">
            <FieldLabel>Usage</FieldLabel>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  usagePct > 90 ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatBytes(storage.used)}</span>
              <span>{formatBytes(storage.limit)}</span>
            </div>
          </div>

          {/* Clear buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearKey("history", "history")}
            >
              Clear History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearKey("preset", "presets")}
            >
              Clear Presets
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
            >
              Clear All Data
            </Button>
          </div>

          {/* Export / Import */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export Settings
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              Import Settings
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={onFileSelected}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
