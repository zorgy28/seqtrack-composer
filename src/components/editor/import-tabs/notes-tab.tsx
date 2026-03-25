"use client";

import { useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { parseNotation } from "@/lib/import/notation-parser";
import type { ImportResult } from "@/lib/import/types";

export interface NotesTabProps {
  onResult: (result: ImportResult | null) => void;
  onError: (error: string) => void;
  instrument: string;
  targetChannel: number;
  disabled: boolean;
}

export function NotesTab({ onResult, onError, instrument, targetChannel, disabled }: NotesTabProps) {
  const [text, setText] = useState("");

  const handleParse = useCallback((value: string) => {
    setText(value);
    if (!value.trim()) {
      onResult(null);
      return;
    }
    try {
      const result = parseNotation(value, instrument, targetChannel);
      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to parse notation");
    }
  }, [instrument, targetChannel, onResult, onError]);

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="C4 E4 G4 C5 | G4 E4 C4"
        value={text}
        onChange={(e) => handleParse(e.target.value)}
        className="min-h-[100px] resize-none font-mono text-xs"
        disabled={disabled}
      />
      <p className="text-[11px] text-muted-foreground">
        Note names with optional duration: <span className="font-mono">C4/4</span> = quarter, <span className="font-mono">D4/8</span> = eighth, <span className="font-mono">E4/16</span> = sixteenth. Separate bars with <span className="font-mono">|</span>. Use <span className="font-mono">-</span> or <span className="font-mono">r</span> for rests.
      </p>
    </div>
  );
}
