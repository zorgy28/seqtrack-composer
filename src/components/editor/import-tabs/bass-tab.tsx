"use client";

import { useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseBassTab, parseGuitarTab } from "@/lib/import/tab-parser";
import type { ImportResult } from "@/lib/import/types";

export interface BassTabProps {
  onResult: (result: ImportResult | null) => void;
  onError: (error: string) => void;
  targetChannel: number;
  disabled: boolean;
}

export function BassTab({ onResult, onError, targetChannel, disabled }: BassTabProps) {
  const [text, setText] = useState("");
  const [tabType, setTabType] = useState<"bass" | "guitar">("bass");

  const handleParse = useCallback((value: string, type: "bass" | "guitar" = tabType) => {
    setText(value);
    if (!value.trim()) {
      onResult(null);
      return;
    }
    try {
      const result = type === "bass"
        ? parseBassTab(value, targetChannel)
        : parseGuitarTab(value, targetChannel);
      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to parse tab");
    }
  }, [tabType, targetChannel, onResult, onError]);

  return (
    <div className="flex flex-col gap-3">
      {/* Bass / Guitar toggle */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            setTabType("bass");
            if (text.trim()) handleParse(text, "bass");
          }}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            tabType === "bass"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
          disabled={disabled}
        >
          Bass (4-string)
        </button>
        <button
          type="button"
          onClick={() => {
            setTabType("guitar");
            if (text.trim()) handleParse(text, "guitar");
          }}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            tabType === "guitar"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
          disabled={disabled}
        >
          Guitar (6-string)
        </button>
      </div>

      <Textarea
        placeholder={
          tabType === "bass"
            ? `G|-------|\nD|---2-0-|\nA|-3-----|\nE|-------|`
            : `e|-------0---|\nB|-----0-----|\nG|---0-------|\nD|-----------|\nA|-----------|\nE|-3---------|`
        }
        value={text}
        onChange={(e) => handleParse(e.target.value)}
        className="min-h-[120px] resize-none font-mono text-xs"
        disabled={disabled}
      />
      <p className="text-[11px] text-muted-foreground">
        Fret numbers on each string line. <span className="font-mono">-</span> = rest, <span className="font-mono">x</span> = muted, <span className="font-mono">h</span> = hammer-on, <span className="font-mono">p</span> = pull-off
      </p>
    </div>
  );
}
