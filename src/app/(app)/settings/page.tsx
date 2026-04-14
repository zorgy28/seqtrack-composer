"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, RefreshCw } from "lucide-react";
import { NOTE_NAMES, SCALE_NAMES, BPM_MIN, BPM_MAX } from "@/lib/midi/constants";
import {
  getSettings,
  updateSettings,
  resetSettings,
  exportSettings,
  importSettings,
  getStorageUsage,
  restoreSettingsIfNeeded,
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
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
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

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{children}</span>
      {hint && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LM Studio Model Selector (fetches available models)
// ---------------------------------------------------------------------------

type LMModel = {
  id: string;
  displayName?: string;
  params?: string;
  loaded?: boolean;
  vision?: boolean;
  toolUse?: boolean;
};

function LMStudioModelSelector({
  url,
  apiKey,
  currentModel,
  onChange,
}: {
  url: string;
  apiKey: string;
  currentModel: string;
  onChange: (model: string) => void;
}) {
  const [models, setModels] = useState<LMModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [reachable, setReachable] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ url, type: "lmstudio" });
      const res = await fetch(`/api/models?${params}`, {
        headers: apiKey ? { "x-api-key": apiKey } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setModels(data.models ?? []);
        setReachable(data.reachable !== false);
      }
    } catch {
      setReachable(false);
    } finally {
      setLoading(false);
    }
  }, [url, apiKey]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <FieldLabel hint="Select from models available in LM Studio (loaded or downloaded).">
          LM Studio Model
        </FieldLabel>
        <button
          type="button"
          onClick={fetchModels}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh model list"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading models...</p>
      ) : !reachable ? (
        <>
          <p className="text-[10px] text-destructive/80">Cannot reach LM Studio at {url}. Make sure it is running and the server is enabled.</p>
          <input
            type="text"
            value={currentModel}
            onChange={(e) => onChange(e.target.value)}
            placeholder="model-name"
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </>
      ) : models.length > 0 ? (
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-2 transition-colors",
                currentModel === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">{m.displayName || m.id}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.params && <span className="text-[10px] text-muted-foreground/60">{m.params}</span>}
                  {m.loaded && <span className="text-[10px] text-green-500">loaded</span>}
                  {m.vision && <span className="text-[10px] text-blue-400" title="Vision capable">V</span>}
                  {m.toolUse && <span className="text-[10px] text-amber-400" title="Tool use">T</span>}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground/50 block truncate">{m.id}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground/60">No models found. Load a model in LM Studio and click refresh.</p>
          <input
            type="text"
            value={currentModel}
            onChange={(e) => onChange(e.target.value)}
            placeholder="model-name"
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ollama Model Selector (fetches available models)
// ---------------------------------------------------------------------------

function OllamaModelSelector({
  url,
  value,
  onChange,
}: {
  url: string;
  value: string;
  onChange: (model: string) => void;
}) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);

  const fetchModels = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/models?url=${encodeURIComponent(url)}&type=ollama`);
      if (res.ok) {
        const data = await res.json();
        setModels((data.models ?? []).map((m: { id: string }) => m.id));
        setReachable(data.reachable ?? false);
      } else {
        setReachable(false);
      }
    } catch {
      setReachable(false);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <FieldLabel hint="Select from models available in Ollama. Pull models with `ollama pull <model>`.">
          Ollama Model
        </FieldLabel>
        {reachable !== null && (
          <span className={cn("size-2 rounded-full", reachable ? "bg-green-500" : "bg-red-500")} title={reachable ? "Connected" : "Unreachable"} />
        )}
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading models...</p>
      ) : models.length > 0 ? (
        <div className="flex flex-col gap-1">
          {models.map((m) => (
            <button
              key={m}
              onClick={() => onChange(m)}
              className={cn(
                "w-full text-left rounded-lg border px-3 py-1.5 text-xs transition-colors",
                value === m
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground/60">No models found. Make sure Ollama is running and has models pulled.</p>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="model-name"
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </>
      )}
    </div>
  );
}

function ZaiModelSelector({
  apiKey,
  url,
  value,
  onChange,
}: {
  apiKey: string;
  url: string;
  value: string;
  onChange: (model: string) => void;
}) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reachable, setReachable] = useState<boolean | null>(null);

  const fetchModels = useCallback(async () => {
    if (!apiKey) { setReachable(null); setModels([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/models?url=${encodeURIComponent(url)}&type=zai&apiKey=${encodeURIComponent(apiKey)}`);
      if (res.ok) {
        const data = await res.json();
        setModels((data.models ?? []).map((m: { id: string }) => m.id));
        setReachable(data.reachable ?? false);
      } else {
        setReachable(false);
      }
    } catch {
      setReachable(false);
    } finally {
      setLoading(false);
    }
  }, [apiKey, url]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <FieldLabel hint="GLM models from Z.AI. Enter your API key above to see available models.">
          Z.AI Model
        </FieldLabel>
        {reachable !== null && (
          <span className={cn("size-2 rounded-full", reachable ? "bg-green-500" : "bg-red-500")} title={reachable ? "Connected" : "Unreachable"} />
        )}
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading models...</p>
      ) : models.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {models.map((m) => (
            <button
              key={m}
              onClick={() => onChange(m)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                value === m
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="glm-5"
          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// OpenRouter Model Browser
// ---------------------------------------------------------------------------

interface ORModel { id: string; name: string; contextLength: number; isFree: boolean; }

function OpenRouterModelSelector({
  apiKey,
  currentModel,
  onChange,
}: {
  apiKey: string;
  currentModel: string;
  onChange: (model: string) => void;
}) {
  const [models, setModels] = useState<ORModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState(false);

  const fetchModels = useCallback(async (key: string) => {
    if (!key) return;
    setLoading(true);
    setFetched(false);
    try {
      const res = await fetch("/api/openrouter-models", {
        headers: { "x-api-key": key },
      });
      if (res.ok) {
        const data = await res.json();
        setModels(data.models ?? []);
        setFetched(true);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // Auto-fetch when key is present (or use env key)
  useEffect(() => {
    fetchModels(apiKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = query
    ? models.filter((m) => m.id.toLowerCase().includes(query.toLowerCase()) || m.name.toLowerCase().includes(query.toLowerCase()))
    : models;

  const POPULAR = [
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-opus-4-6",
    "google/gemini-2.5-pro",
    "openai/gpt-4.1",
    "deepseek/deepseek-r1",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen3-235b-a22b",
    "mistralai/mistral-large",
    "x-ai/grok-3",
    "openai/gpt-5.4",
  ];

  return (
    <div className="space-y-3">
      {/* Search + refresh */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fetched ? `Search ${models.length} models…` : "Search models…"}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchModels(apiKey)}
          disabled={loading || !apiKey}
          title="Refresh model list"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Popular picks */}
      {!query && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">Popular</p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR.map((id) => (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  currentModel === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {id.split("/")[1]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live model list */}
      {fetched && filtered.length > 0 && (
        <div className="space-y-1">
          {query && (
            <p className="text-[10px] text-muted-foreground/60">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-input space-y-px">
            {filtered.slice(0, 100).map((m) => (
              <button
                key={m.id}
                onClick={() => onChange(m.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors text-left",
                  currentModel === m.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="font-mono truncate">{m.id}</span>
                <span className="shrink-0 ml-2 text-[10px] opacity-50">
                  {m.isFree ? "free" : m.contextLength > 0 ? `${Math.round(m.contextLength / 1000)}k` : ""}
                </span>
              </button>
            ))}
            {filtered.length > 100 && (
              <p className="px-3 py-1.5 text-[10px] text-muted-foreground/60">
                {filtered.length - 100} more — refine your search
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manual fallback */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground/60">Or type any model ID</p>
        <input
          type="text"
          value={currentModel}
          onChange={(e) => onChange(e.target.value)}
          placeholder="provider/model-name"
          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(partial: Partial<AppSettings>) {
    const next = updateSettings(partial);
    setSettings(next);
    // Show "Saved" indicator for 2 seconds
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveCounterRef.current += 1;
    setSavedAt(saveCounterRef.current);
    saveTimerRef.current = setTimeout(() => setSavedAt(null), 2000);
  }

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // Restore settings from Electron prefs on first launch (empty localStorage)
  useEffect(() => {
    restoreSettingsIfNeeded().then((restored) => {
      setSettings(restored);
    });
  }, []);

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-300",
            savedAt ? "opacity-100" : "opacity-0"
          )}
        >
          <Check className="size-3 text-green-500" />
          Saved
        </span>
      </div>

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
          <p className="text-xs text-zinc-500">API keys are stored locally on your device and never sent to our servers.</p>

          {/* Provider toggle */}
          <div className="space-y-1.5">
            <FieldLabel hint="Choose your AI provider. Claude uses the Anthropic API key from .env.local. Others need their own key.">Provider</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(["claude", "gemini", "openrouter", "lm-studio", "ollama", "zai"] as LlmProvider[]).map((p) => (
                <ToggleButton
                  key={p}
                  active={settings.llmProvider === p}
                  label={{ claude: "Claude", gemini: "Gemini", openrouter: "OpenRouter", "lm-studio": "LM Studio", ollama: "Ollama", zai: "Z.AI" }[p]}
                  onClick={() => handleChange({ llmProvider: p })}
                  title={{ claude: "Anthropic Claude -- cloud API", gemini: "Google Gemini -- cloud API", openrouter: "OpenRouter -- multi-provider gateway", "lm-studio": "LM Studio -- local models", ollama: "Ollama -- local models", zai: "Z.AI GLM -- cloud API" }[p]}
                />
              ))}
            </div>
          </div>

          {/* ---- Claude ---- */}
          {settings.llmProvider === "claude" && (
            <>
            <div className="space-y-1.5">
              <FieldLabel hint="Get your key at console.anthropic.com">Claude API Key</FieldLabel>
              <input
                type="password"
                value={settings.claudeApiKey}
                onChange={(e) => handleChange({ claudeApiKey: e.target.value })}
                placeholder="sk-ant-... (leave blank to use .env.local key)"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel hint="Sonnet 4.6 recommended — best balance of speed and quality for music generation.">Claude Model</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "claude-opus-4-6", label: "Opus 4.6", desc: "Most capable, deep reasoning" },
                  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", desc: "Recommended — fast + high quality" },
                  { id: "claude-sonnet-4-20250514", label: "Sonnet 4", desc: "Previous gen, proven reliable" },
                  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", desc: "Fastest, most affordable" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleChange({ claudeModel: m.id })}
                    className={cn(
                      "flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors",
                      settings.claudeModel === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:border-foreground/30"
                    )}
                  >
                    <span className="text-xs font-medium">{m.label}</span>
                    <span className="text-[10px] opacity-60">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            </>
          )}

          {/* ---- Gemini ---- */}
          {settings.llmProvider === "gemini" && (
            <>
              <div className="space-y-1.5">
                <FieldLabel hint="Get yours at ai.google.dev">Gemini API Key</FieldLabel>
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) => handleChange({ geminiApiKey: e.target.value })}
                  placeholder="AIza..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel hint="Select the Gemini model for composition.">Gemini Model</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "gemini-2.5-pro", label: "2.5 Pro", desc: "Best reasoning, 1M context" },
                    { id: "gemini-2.5-flash", label: "2.5 Flash", desc: "Fast + cheap, 1M context" },
                    { id: "gemini-2.5-flash-lite", label: "2.5 Flash-Lite", desc: "Cost-optimized, high throughput" },
                    { id: "gemini-3.1-pro-preview", label: "3.1 Pro Preview", desc: "Latest flagship (preview)" },
                    { id: "gemini-3-flash-preview", label: "3 Flash Preview", desc: "Pro-level at Flash speed" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleChange({ geminiModel: m.id })}
                      className={cn(
                        "flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors",
                        settings.geminiModel === m.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:border-foreground/30"
                      )}
                    >
                      <span className="text-xs font-medium">{m.label}</span>
                      <span className="text-[10px] opacity-60">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ---- OpenRouter ---- */}
          {settings.llmProvider === "openrouter" && (
            <>
              <div className="space-y-1.5">
                <FieldLabel hint="Get yours at openrouter.ai/keys. The key from .env.local is used by default if this is empty.">OpenRouter API Key</FieldLabel>
                <input
                  type="password"
                  value={settings.openrouterApiKey}
                  onChange={(e) => handleChange({ openrouterApiKey: e.target.value })}
                  placeholder="sk-or-… (leave blank to use .env.local key)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel hint="Search all available models or pick from popular choices. Model list is fetched live from OpenRouter.">OpenRouter Model</FieldLabel>
                <OpenRouterModelSelector
                  apiKey={settings.openrouterApiKey}
                  currentModel={settings.openrouterModel}
                  onChange={(model) => handleChange({ openrouterModel: model })}
                />
              </div>
            </>
          )}

          {/* ---- LM Studio ---- */}
          {settings.llmProvider === "lm-studio" && (
            <>
              <div className="space-y-1.5">
                <FieldLabel hint="Base URL of your LM Studio server (e.g. http://localhost:1234 or http://192.168.1.x:1234).">LM Studio URL</FieldLabel>
                <input
                  type="text"
                  value={settings.lmStudioUrl}
                  onChange={(e) => handleChange({ lmStudioUrl: e.target.value })}
                  placeholder="http://localhost:1234"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel hint="Required if authentication is enabled in LM Studio. Leave blank if disabled.">API Key</FieldLabel>
                <input
                  type="password"
                  value={settings.lmStudioApiKey}
                  onChange={(e) => handleChange({ lmStudioApiKey: e.target.value })}
                  placeholder="lms-… (leave blank if auth is disabled)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <LMStudioModelSelector
                url={settings.lmStudioUrl}
                apiKey={settings.lmStudioApiKey}
                currentModel={settings.lmStudioModel}
                onChange={(model) => handleChange({ lmStudioModel: model })}
              />
            </>
          )}

          {/* ---- Ollama ---- */}
          {settings.llmProvider === "ollama" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <FieldLabel>Ollama Server URL</FieldLabel>
                <input
                  type="text"
                  value={settings.ollamaUrl}
                  onChange={(e) => handleChange({ ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Install Ollama at{" "}
                  <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    ollama.com
                  </a>
                </p>
              </div>

              <OllamaModelSelector
                url={settings.ollamaUrl}
                value={settings.ollamaModel}
                onChange={(model) => handleChange({ ollamaModel: model })}
              />
            </div>
          )}

          {/* ---- Z.AI ---- */}
          {settings.llmProvider === "zai" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <FieldLabel>API Key</FieldLabel>
                <input
                  type="password"
                  value={settings.zaiApiKey}
                  onChange={(e) => handleChange({ zaiApiKey: e.target.value })}
                  placeholder="API key from z.ai"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Get your key at{" "}
                  <a href="https://z.ai/manage-apikey/apikey-list" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    z.ai/manage-apikey
                  </a>
                </p>
              </div>

              <div className="space-y-1.5">
                <FieldLabel hint="Use the Coding endpoint for subscription plans, or the general endpoint for pay-per-use.">Endpoint</FieldLabel>
                <div className="flex gap-1">
                  {[
                    { url: "https://api.z.ai/api/coding/paas/v4", label: "Coding Plan" },
                    { url: "https://api.z.ai/api/paas/v4", label: "General API" },
                  ].map((ep) => (
                    <button
                      key={ep.url}
                      onClick={() => handleChange({ zaiUrl: ep.url })}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                        (settings.zaiUrl || "https://api.z.ai/api/coding/paas/v4") === ep.url
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:border-foreground/30"
                      )}
                    >
                      {ep.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Model</FieldLabel>
                <ZaiModelSelector
                  apiKey={settings.zaiApiKey}
                  url={settings.zaiUrl || "https://api.z.ai/api/coding/paas/v4"}
                  value={settings.zaiModel}
                  onChange={(model) => handleChange({ zaiModel: model })}
                />
              </div>
            </div>
          )}

          {/* ---- Shared: Temperature ---- */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel hint="Lower = more consistent patterns. Higher = more creative/random.">Temperature</FieldLabel>
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

          {/* ---- Shared: Max tokens ---- */}
          <div className="space-y-1.5">
            <FieldLabel hint="Maximum response length. 8192 is enough for full multi-track patterns.">Max Tokens</FieldLabel>
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

          {/* Docling (PDF Import) */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground/80">Docling (PDF Import)</h4>
            <div className="space-y-1.5">
              <FieldLabel>Docling Server URL</FieldLabel>
              <input
                type="text"
                value={settings.doclingUrl}
                onChange={(e) => handleChange({ doclingUrl: e.target.value })}
                placeholder="https://your-docling-server/v1/convert/file"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Docling API Key</FieldLabel>
              <input
                type="password"
                value={settings.doclingApiKey}
                onChange={(e) => handleChange({ doclingApiKey: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {!settings.doclingUrl && (
              <div className="rounded-lg border border-input bg-muted/30 p-3 text-[10px] text-muted-foreground space-y-1">
                <p>Docling converts PDF sheet music to text for better import accuracy.</p>
                <p>Install locally: <code className="text-foreground/80">pip install docling-serve &amp;&amp; docling-serve run</code></p>
                <p>
                  More info:{" "}
                  <a href="https://github.com/docling-project/docling" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    github.com/docling-project/docling
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Stem model */}
          <div className="space-y-1.5">
            <FieldLabel hint="The Demucs model used for separating audio into stems (drums, bass, vocals, etc.)">Default Stem Model</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "htdemucs", label: "HTDemucs", desc: "4 stems, fastest" },
                { id: "htdemucs_6s", label: "HTDemucs 6s", desc: "6 stems (+ guitar, piano)" },
                { id: "htdemucs_ft", label: "HTDemucs FT", desc: "4 stems, best quality (4x slower)" },
              ] as Array<{ id: StemModel; label: string; desc: string }>).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleChange({ defaultStemModel: m.id })}
                  className={cn(
                    "flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors",
                    settings.defaultStemModel === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  <span className="text-xs font-medium">{m.label}</span>
                  <span className="text-[10px] opacity-60">{m.desc}</span>
                </button>
              ))}
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
              title="Permanently delete all saved data"
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
