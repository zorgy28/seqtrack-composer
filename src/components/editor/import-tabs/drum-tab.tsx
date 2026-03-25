"use client";

import { useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { parseDrumTab } from "@/lib/import/drum-tab-parser";
import type { ImportResult } from "@/lib/import/types";

export interface DrumTabProps {
  onResult: (result: ImportResult | null) => void;
  onError: (error: string) => void;
  disabled: boolean;
}

export function DrumTab({ onResult, onError, disabled }: DrumTabProps) {
  const [text, setText] = useState("");

  const handleParse = useCallback((value: string) => {
    setText(value);
    if (!value.trim()) {
      onResult(null);
      return;
    }
    try {
      const result = parseDrumTab(value);
      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to parse drum tab");
    }
  }, [onResult, onError]);

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder={`HH|x-x-x-x-x-x-x-x-|\nSD|----o-------o-----|\nBD|o-------o---------|`}
        value={text}
        onChange={(e) => handleParse(e.target.value)}
        className="min-h-[120px] resize-none font-mono text-xs"
        disabled={disabled}
      />
      <p className="text-[11px] text-muted-foreground">
        Symbols: <span className="font-mono">o/x</span> = hit, <span className="font-mono">O/X</span> = accent, <span className="font-mono">g</span> = ghost, <span className="font-mono">-</span> = rest, <span className="font-mono">|</span> = barline
      </p>
    </div>
  );
}
