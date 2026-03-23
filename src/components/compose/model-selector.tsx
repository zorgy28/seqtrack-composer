"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type LLMProvider = "claude" | "lmstudio";

export interface ModelSelection {
  provider: LLMProvider;
  model: string;
}

interface ModelSelectorProps {
  value: ModelSelection;
  onChange: (selection: ModelSelection) => void;
  disabled?: boolean;
}

interface LMStudioModel {
  id: string;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [lmModels, setLmModels] = useState<LMStudioModel[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch LM Studio models on mount
  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          setLmModels(data.models ?? []);
        }
      } catch {
        // LM Studio not reachable — that's fine
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">AI Model</label>
      <div className="flex gap-1.5">
        {/* Claude option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ provider: "claude", model: "claude-sonnet-4" })}
          className={cn(
            "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
            value.provider === "claude"
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <div>Claude</div>
          <div className="text-[10px] opacity-60">Sonnet 4</div>
        </button>

        {/* LM Studio option */}
        <button
          type="button"
          disabled={disabled || lmModels.length === 0}
          onClick={() => {
            if (value.provider === "lmstudio") return;
            onChange({ provider: "lmstudio", model: lmModels[0]?.id ?? "" });
          }}
          className={cn(
            "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
            value.provider === "lmstudio"
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            (disabled || lmModels.length === 0) && "pointer-events-none opacity-50"
          )}
        >
          <div>LM Studio</div>
          <div className="text-[10px] opacity-60">
            {loading ? "Loading..." : lmModels.length === 0 ? "Not available" : "Local GPU"}
          </div>
        </button>
      </div>

      {/* Model dropdown for LM Studio */}
      {value.provider === "lmstudio" && lmModels.length > 0 && (
        <select
          value={value.model}
          onChange={(e) => onChange({ provider: "lmstudio", model: e.target.value })}
          disabled={disabled}
          className={cn(
            "h-8 rounded-lg border border-input bg-transparent px-2 text-xs",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
            "dark:bg-input/30"
          )}
        >
          {lmModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
