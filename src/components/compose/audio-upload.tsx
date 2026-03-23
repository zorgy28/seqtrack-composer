"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
];
const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".flac", ".ogg"];
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const URL_PATTERNS = [
  /youtube\.com/i,
  /youtu\.be/i,
  /soundcloud\.com/i,
];

const BAR_OPTIONS = [
  { value: 1, label: "1 bar", steps: "16 steps" },
  { value: 2, label: "2 bars", steps: "32 steps" },
  { value: 4, label: "4 bars", steps: "64 steps" },
  { value: 8, label: "8 bars", steps: "128 steps" },
];

import { ModelSelector, type ModelSelection } from "./model-selector";

interface AudioUploadProps {
  onFileSelect: (file: File) => void;
  onUrlSubmit: (url: string) => void;
  bars?: number;
  onBarsChange?: (bars: number) => void;
  modelSelection?: ModelSelection;
  onModelChange?: (selection: ModelSelection) => void;
  disabled?: boolean;
}

export function AudioUpload({
  onFileSelect,
  onUrlSubmit,
  bars = 4,
  onBarsChange,
  modelSelection,
  onModelChange,
  disabled = false,
}: AudioUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
      return "Unsupported file format. Use MP3, WAV, FLAC, or OGG.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect, validateFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset the input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const handleUrlSubmit = useCallback(() => {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      const parsed = new URL(trimmed);
      const isValid = URL_PATTERNS.some((p) => p.test(parsed.hostname));
      if (!isValid) {
        setError("Enter a YouTube or SoundCloud URL.");
        return;
      }
      onUrlSubmit(trimmed);
      setUrl("");
    } catch {
      setError("Enter a valid URL.");
    }
  }, [url, onUrlSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleUrlSubmit();
      }
    },
    [handleUrlSubmit]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
          "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
          isDragOver && "border-primary bg-primary/5 text-foreground",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Upload className="size-8" />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragOver ? "Drop to transcribe" : "Drop audio file here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            MP3, WAV, FLAC, OGG &mdash; max {MAX_SIZE_MB}MB
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Separator */}
      <div className="relative flex items-center">
        <Separator className="flex-1" />
        <span className="px-3 text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      {/* URL input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            placeholder="Paste YouTube or SoundCloud link"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              "flex h-8 w-full rounded-lg border border-input bg-transparent py-2 pl-8 pr-3 text-sm transition-colors",
              "placeholder:text-muted-foreground outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-input/30 dark:hover:bg-input/50"
            )}
          />
        </div>
        <Button
          variant="outline"
          disabled={disabled || !url.trim()}
          onClick={handleUrlSubmit}
        >
          Transcribe
        </Button>
      </div>

      {/* Pattern length selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Pattern length</label>
        <div className="flex gap-1.5">
          {BAR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onBarsChange?.(opt.value)}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                bars === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <div>{opt.label}</div>
              <div className="text-[10px] opacity-60">{opt.steps}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Model selector */}
      {modelSelection && onModelChange && (
        <ModelSelector
          value={modelSelection}
          onChange={onModelChange}
          disabled={disabled}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
