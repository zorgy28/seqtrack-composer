"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { RefreshCw } from "lucide-react";

export type LLMProvider = "claude" | "gemini" | "openrouter" | "lm-studio" | "ollama" | "zai";

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
  ollama:       "Ollama",
  zai:          "Z.AI",
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

const LOCAL_PROVIDERS: LLMProvider[] = ["lm-studio", "ollama", "zai"];

function isLocalProvider(p: LLMProvider): boolean {
  return LOCAL_PROVIDERS.includes(p);
}

// ── Per-provider local state ────────────────────────────────────

interface LocalProviderState {
  models: { id: string }[];
  reachable: boolean | null; // null = loading
}

const INITIAL_LOCAL_STATE: Record<string, LocalProviderState> = {
  "lm-studio": { models: [], reachable: null },
  "ollama":    { models: [], reachable: null },
  "zai":       { models: [], reachable: null },
};

// ── Helpers ──────────────────────────────────────────────────

function shortLabel(provider: LLMProvider, modelId: string): string {
  if (provider === "claude")
    return CLAUDE_MODELS.find((m) => m.id === modelId)?.label ?? modelId.replace("claude-", "");
  if (provider === "gemini")
    return GEMINI_MODELS.find((m) => m.id === modelId)?.label ?? modelId.replace("gemini-", "");
  if (provider === "zai")
    return modelId || "glm-4.7";
  if (provider === "ollama")
    return modelId ? modelId.replace(/:latest$/, "") : "—";
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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/openrouter-models", {
      headers: apiKey ? { "x-api-key": apiKey } : {},
    })
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
  const [localState, setLocalState] = useState<Record<string, LocalProviderState>>(
    () => ({ ...INITIAL_LOCAL_STATE }),
  );
  const settings = getSettings();

  // Fetch models for all local providers in parallel on mount and when URLs/keys change
  const fetchLocalProviders = useCallback(() => {
    const configs: Array<{ key: string; url: string; type: string; apiKey?: string }> = [
      { key: "lm-studio", url: settings.lmStudioUrl || "http://localhost:1234/v1", type: "lmstudio" },
      { key: "ollama",    url: settings.ollamaUrl || "http://localhost:11434",       type: "ollama" },
      { key: "zai",       url: settings.zaiUrl || "https://api.z.ai/api/coding/paas/v4", type: "zai", apiKey: settings.zaiApiKey },
    ];

    for (const cfg of configs) {
      fetch(`/api/models?url=${encodeURIComponent(cfg.url)}&type=${cfg.type}`, {
        headers: cfg.apiKey ? { "x-api-key": cfg.apiKey } : {},
      })
        .then((r) => r.ok ? r.json() : { models: [], reachable: false })
        .then((d) => {
          setLocalState((prev) => ({
            ...prev,
            [cfg.key]: { models: d.models ?? [], reachable: d.reachable ?? false },
          }));
        })
        .catch(() => {
          setLocalState((prev) => ({
            ...prev,
            [cfg.key]: { models: [], reachable: false },
          }));
        });
    }
  }, [settings.lmStudioUrl, settings.ollamaUrl, settings.zaiUrl, settings.zaiApiKey]);

  useEffect(() => {
    fetchLocalProviders();
  }, [fetchLocalProviders]);

  function localSubLabel(p: LLMProvider): string {
    const state = localState[p];
    if (!state) return "—";
    if (state.reachable === null) return "…";
    if (!state.reachable) return "offline";
    if (state.models.length === 0) return "no model";
    // When this is the active provider, show the selected model
    if (p === value.provider) return shortLabel(p, value.model);
    // When not active, show stored model or first available
    if (p === "ollama") {
      const stored = settings.ollamaModel;
      return stored ? shortLabel(p, stored) : shortLabel(p, state.models[0]?.id ?? "");
    }
    if (p === "zai") {
      const stored = settings.zaiModel;
      return stored ? shortLabel(p, stored) : "glm-4.7";
    }
    // lm-studio
    const stored = settings.lmStudioModel;
    return stored ? shortLabel(p, stored) : shortLabel(p, state.models[0]?.id ?? "");
  }

  function isLocalDisabled(p: LLMProvider): boolean {
    const state = localState[p];
    if (!state) return true;
    return state.reachable === false || (state.reachable === true && state.models.length === 0);
  }

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
      case "lm-studio": {
        const lmState = localState["lm-studio"];
        onChange({ provider: p, model: lmState.models[0]?.id ?? settings.lmStudioModel ?? "" });
        break;
      }
      case "ollama": {
        const ollamaState = localState["ollama"];
        onChange({ provider: p, model: settings.ollamaModel || ollamaState.models[0]?.id || "" });
        break;
      }
      case "zai": {
        const zaiState = localState["zai"];
        onChange({ provider: p, model: settings.zaiModel || zaiState.models[0]?.id || "glm-4.7" });
        break;
      }
    }
  }

  function subLabel(p: LLMProvider): string {
    if (p === value.provider) {
      if (isLocalProvider(p)) return localSubLabel(p);
      return shortLabel(p, value.model);
    }
    // Not selected — show static or local sub-label
    if (p === "claude") return "Sonnet 4.6";
    if (p === "gemini") return "2.5 Flash";
    if (isLocalProvider(p)) return localSubLabel(p);
    // openrouter
    return settings.openrouterModel.split("/")[1] ?? "model";
  }

  const providers: LLMProvider[] = ["claude", "gemini", "openrouter", "lm-studio", "ollama", "zai"];

  const selectClass = cn(
    "h-7 rounded-lg border border-input bg-transparent px-2 text-xs",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
    "dark:bg-input/30",
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">AI Model</label>

      {/* Provider tabs */}
      <div className="flex gap-1">
        {providers.map((p) => {
          const isDisabled = disabled || (isLocalProvider(p) && isLocalDisabled(p));
          return (
            <button
              key={p}
              type="button"
              disabled={isDisabled}
              onClick={() => selectProvider(p)}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                value.provider === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                isDisabled && "pointer-events-none opacity-40"
              )}
            >
              <div>{PROVIDER_LABELS[p]}</div>
              <div className="text-[10px] opacity-60 truncate max-w-[60px]">
                {subLabel(p)}
              </div>
            </button>
          );
        })}
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
      {value.provider === "lm-studio" && localState["lm-studio"].models.length > 0 && (
        <select
          value={value.model}
          onChange={(e) => onChange({ provider: "lm-studio", model: e.target.value })}
          disabled={disabled}
          className={cn(selectClass, disabled && "pointer-events-none opacity-50")}
        >
          {localState["lm-studio"].models.map((m) => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      )}
      {value.provider === "lm-studio" && localState["lm-studio"].reachable === true && localState["lm-studio"].models.length === 0 && (
        <p className="text-[11px] text-amber-500/80">
          LM Studio is running but no model is loaded. Load a model in LM Studio first.
        </p>
      )}
      {value.provider === "lm-studio" && localState["lm-studio"].reachable === false && (
        <p className="text-[11px] text-muted-foreground/60">
          LM Studio not reachable. Check the URL in Settings → AI & Models.
        </p>
      )}

      {/* ── Ollama model select ── */}
      {value.provider === "ollama" && localState["ollama"].models.length > 0 && (
        <select
          value={value.model}
          onChange={(e) => onChange({ provider: "ollama", model: e.target.value })}
          disabled={disabled}
          className={cn(selectClass, disabled && "pointer-events-none opacity-50")}
        >
          {localState["ollama"].models.map((m) => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      )}
      {value.provider === "ollama" && localState["ollama"].reachable === true && localState["ollama"].models.length === 0 && (
        <p className="text-[11px] text-amber-500/80">
          Ollama is running but no models are pulled. Run <code className="text-[10px]">ollama pull &lt;model&gt;</code> first.
        </p>
      )}
      {value.provider === "ollama" && localState["ollama"].reachable === false && (
        <p className="text-[11px] text-muted-foreground/60">
          Ollama not reachable at {settings.ollamaUrl || "http://localhost:11434"}. Is it running?
        </p>
      )}

      {/* ── Z.AI model select ── */}
      {value.provider === "zai" && localState["zai"].models.length > 0 && (
        <select
          value={value.model}
          onChange={(e) => onChange({ provider: "zai", model: e.target.value })}
          disabled={disabled}
          className={cn(selectClass, disabled && "pointer-events-none opacity-50")}
        >
          {localState["zai"].models.map((m) => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      )}
      {value.provider === "zai" && localState["zai"].reachable === true && localState["zai"].models.length === 0 && (
        <p className="text-[11px] text-amber-500/80">
          Z.AI is reachable but returned no models. Check your API key in Settings.
        </p>
      )}
      {value.provider === "zai" && localState["zai"].reachable === false && (
        <p className="text-[11px] text-muted-foreground/60">
          Z.AI not reachable. Check your API key and endpoint in Settings → AI & Models.
        </p>
      )}
    </div>
  );
}
