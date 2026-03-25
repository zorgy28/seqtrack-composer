"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportResult } from "@/lib/import/types";

const SHEET_ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".musicxml", ".xml"];

export interface SheetTabProps {
  onResult: (result: ImportResult) => void;
  onError: (error: string) => void;
  disabled: boolean;
  instrument: string;
  targetChannel: number;
}

export function SheetTab({ onResult, onError, disabled, instrument, targetChannel }: SheetTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    try {
      const { parseSheetMusic } = await import("@/lib/import/sheet-music-parser");
      const result = await parseSheetMusic(file, {
        instrument,
        targetChannel,
      });
      onResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to parse sheet music");
    }
  }, [instrument, targetChannel, onResult, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
          "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
          isDragOver && "border-primary bg-primary/5 text-foreground",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="size-7" />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragOver ? "Drop to import" : "Drag sheet music, PDF, or photo here"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, PNG, JPG, MusicXML
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={SHEET_ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
        disabled={disabled}
      />
    </div>
  );
}
