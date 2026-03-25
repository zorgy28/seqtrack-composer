"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { RefreshCw } from "lucide-react";

export type LLMProvider = "claude" | "gemini" | "openrouter" | "lm-studio";

export interface ModelSelection {
  provider: LLMProvider;
  model: string;
}

// ── Static model lists ─────────────────────────────────────────

const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-6",         label: "Sonnet 4.6",  desc: "Recommended" },
  { id: "claude-opus-4-6",           label: "Opus 4.6",    desc: "Best quality" },
  { id: "claude-sonnet-4-20250514",  label: "Sonnet 4",    desc: "Previous gen" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5",   desc: "Fastest" },
];

const GEMINI_MODELS = [
  { id: "gemini-2.5-flash",              label: "2.5 Flash",       desc: "Fast + cheap" },
  { id: "gemini-2.5-pro",               label: "2.5 Pro",         desc: "Best reasoning" },
  { id: "gemini-3.1-flash-lite-preview", label: "3.1 Flash Lite",  desc: "Latest preview" },
];

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  claude:       "Claude",
  gemini:       "Gemini",
  openrouter:   "OpenRouter",
  "lm-studio":  "LM Studio",
};

const OR_POPULAR = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4-6",
  "google/gemini-2.5-pro",
  "openai/gpt-4.1",
  "deepseek/deepseek-r1",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwen3-235b-a22b",
  "x-ai/grok-3",
  "openai/gpt-5.4",
  "mistralai/mistral-large",
];

// ── Helpers ──────────────────────────────────────────────────

function shortLabel(provider: LLMProvider, modelId: string): string {
  if (provider === "claude")
    return CLAUDE_MODELS.find((m) => m.id === modelId)?.label ?? modelId.replace("claude-", "");
  if (provider === "gemini")
    return GEMINI_MODELS.find((m) => m.id === modelId)?.label ?? modelId.replace("gemini-", "");
  return modelId.includes("/") ? modelId.split("/")[1] : modelId || "—";
}

// ── OpenRouter inline browser ──────────────────────────────

interface ORModel { id: string; isFree: boolean; contextLength: number; }

function OpenRouterBrowser({
  apiKey,
  currentModel,
  onChange,
  disabled,
}: {
  apiKey: string;
  currentModel: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [models, setModels] = useState<ORModel[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = apiKey ? `?key=${encodeURIComponent(apiKey)}` : "";
    fetch(`/api/openrouter-models${params}`)
      .then((r) => r.ok ? r.json() : { models: [] })
      .then((d) => { if (!cancelled) setModels(d.models ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiKey]);

  const filtered = query
    ? models.filter((m) => m.id.toLowerCase().includes(query.toLowerCase()))
    : models;

  const showList = open && (filtered.length > 0 || loading);

  return (
    <div className="relative">
      {/* Search / current model input */}
      <div className="flex gap-1">
        <input
          ref={inputRef}
          type="text"
          value={query || currentModel}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
          placeholder="Search or type model ID…"
          className={cn(
            "h-7 flex-1 rounded-lg border border-input bg-transparent px-2 text-xs",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
            "dark:bg-input/30",
            disabled && "pointer-events-none opacity-50"
          )}
        />
        {loading && <RefreshCw className="size-3 animate-spin self-center text-muted-foreground" />}
      </div>

      {/* Popular picks (shown when not searching) */}
      {!query && !open && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {OR_POPULAR.slice(0, 6).map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] transition-colors",
                currentModel === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              {id.split("/")[1]}
            </button>
          ))}
          {models.length > 0 && (
            <button
              type="button"
              onClick={() => { setQuery(""); setOpen(true); inputRef.current?.focus(); }}
              className="rounded-md border border-dashed border-input px-2 py-0.5 text-[10px] text-muted-foreground hover:border-foreground/30"
            >
              + {models.length} more
            </button>
          )}
        </div>
      )}

      {/* Dropdown list */}
      {showList && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-input bg-popover shadow-md">
          {loading && models.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Loading models…</p>
          ) : (
            <>
              {filtered.slice(0, 80).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={() => { onChange(m.id); setQuery(""); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors",
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
              {filtered.length > 80 && (
                <p className="px-3 py-1.5 text-[10px] text-muted-foreground/60">
                  {filtered.length - 80} more — refine search
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

interface ModelSelectorProps {
  value: ModelSelection;
  onChange: (selection: ModelSelection) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [lmModels, setLmModels] = useState<{ id: string }[]>([]);
  const [lmReachable, setLmReachable] = useState<boolean | null>(null); // null = loading
  const settings = getSettings();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then((r) => r.ok ? r.json() : { models: [], reachable: false })
      .then((d) => {
        if (!cancelled) {
          setLmModels(d.models ?? []);
          setLmReachable(d.reachable ?? false);
        }
      })
      .catch(() => { if (!cancelled) setLmReachable(false); });
    return () => { cancelled = true; };
  }, []);

  function selectProvider(p: LLMProvider) {
    if (p === value.provider) return;
    switch (p) {
      case "claude":
        onChange({ provider: p, model: settings.claudeModel || "claude-sonnet-4-6" });
        break;
      case "gemini":
        onChange({ provider: p, model: settings.geminiModel || "gemini-2.5-flash" });
        break;
      case "openrouter":
        onChange({ provider: p, model: settings.openrouterModel || "anthropic/claude-sonnet-4.5" });
        break;
      case "lm-studio":
        onChange({ provider: p, model: lmModels[0]?.id ?? settings.lmStudioModel ?? "" });
        break;
    }
  }

  function lmSubLabel(): string {
    if (lmReachable === null) return "…";
    if (!lmReachable) return "offline";
    if (lmModels.length === 0) return "no model";
    return shortLabel("lm-studio", value.model) || "Local GPU";
  }

  const providers: LLMProvider[] = ["claude", "gemini", "openrouter", "lm-studio"];
  const lmDisabled = lmReachable === false || (lmReachable === true && lmModels.length === 0);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">AI Model</label>

      {/* Provider tabs */}
      <div className="flex gap-1">
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled || (p === "lm-studio" && !!lmDisabled)}
            onClick={() => selectProvider(p)}
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
              value.provider === p
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              (disabled || (p === "lm-studio" && !!lmDisabled)) && "pointer-events-none opacity-40"
            )}
          >
            <div>{PROVIDER_LABELS[p]}</div>
            <div className="text-[10px] opacity-60 truncate max-w-[60px]">
              {p === value.provider
                ? (p === "lm-studio" ? lmSubLabel() : shortLabel(p, value.model))
                : p === "claude" ? "Sonnet 4.6"
                : p === "gemini" ? "2.5 Flash"
                : p === "lm-studio" ? lmSubLabel()
                : (settings.openrouterModel.split("/")[1] ?? "model")}
            </div>
          </button>
        ))}
      </div>

      {/* ── Claude sub-picker ── */}
      {value.provider === "claude" && (
        <div className="flex flex-wrap gap-1">
          {CLAUDE_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ provider: "claude", model: m.id })}
              title={m.desc}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                value.model === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Gemini sub-picker ── */}
      {value.provider === "gemini" && (
        <div className="flex flex-wrap gap-1">
          {GEMINI_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ provider: "gemini", model: m.id })}
              title={m.desc}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                value.model === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* ── OpenRouter browser ── */}
      {value.provider === "openrouter" && (
        <OpenRouterBrowser
          apiKey={settings.openrouterApiKey}
          currentModel={value.model}
          onChange={(id) => onChange({ provider: "openrouter", model: id })}
          disabled={disabled}
        />
      )}

      {/* ── LM Studio model select ── */}
      {value.provider === "lm-studio" && lmModels.length > 0 && (
        <select
          value={value.model}
          onChange={(e) => onChange({ provider: "lm-studio", model: e.target.value })}
          disabled={disabled}
          className={cn(
            "h-7 rounded-lg border border-input bg-transparent px-2 text-xs",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
            "dark:bg-input/30",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {lmModels.map((m) => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      )}

      {/* ── LM Studio reachable but no model ── */}
      {value.provider === "lm-studio" && lmReachable && lmModels.length === 0 && (
        <p className="text-[11px] text-amber-500/80">
          LM Studio is running but no model is loaded. Load a model in LM Studio first.
        </p>
      )}

      {/* ── LM Studio offline ── */}
      {value.provider === "lm-studio" && lmReachable === false && (
        <p className="text-[11px] text-muted-foreground/60">
          LM Studio not reachable. Check the URL in Settings → AI & Models.
        </p>
      )}
    </div>
  );
}
