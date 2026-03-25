"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sparkles, Star, Search, X } from "lucide-react";
import type { SeqtrackChannel, SoundPreset, SoundCategory, SoundEngine } from "@/lib/midi/types";
import { getPresetsForChannel, getCategoriesForEngine } from "@/lib/midi/sound-library";
import { useSoundControl } from "@/hooks/use-sound-control";
import { useProject } from "@/providers/project-provider";
import { recommendSounds, detectGenreFromPattern } from "@/lib/transcription/sound-matcher";
import { cn } from "@/lib/utils";

// ─── Engine mapping ────────────────────────────────────────────

function engineForChannel(channel: SeqtrackChannel): SoundEngine {
  if (channel >= 1 && channel <= 7) return "drum";
  if (channel === 8 || channel === 9) return "awm2";
  if (channel === 10) return "dx";
  return "sampler";
}

// ─── SoundPicker ───────────────────────────────────────────────

interface SoundPickerProps {
  channel: SeqtrackChannel;
  onClose: () => void;
}

export function SoundPicker({ channel, onClose }: SoundPickerProps) {
  const { project } = useProject();
  const { selectPreset, getTrackSound } = useSoundControl();

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  // Detect genre from current project patterns
  const detectedGenre = useMemo(() => detectGenreFromPattern(project), [project]);

  // Get AI suggestion
  const suggestion = useMemo(
    () => recommendSounds(channel, detectedGenre),
    [channel, detectedGenre],
  );

  // Resolve suggested preset object from the library
  const allPresets = useMemo(() => getPresetsForChannel(channel), [channel]);

  const suggestedPreset = useMemo(() => {
    return allPresets.find((p) => p.id === suggestion.primary.id) ?? null;
  }, [allPresets, suggestion.primary.id]);

  // Get categories for this channel's engine
  const engine = engineForChannel(channel);
  const categories = useMemo(() => getCategoriesForEngine(engine), [engine]);

  // Current preset for this track
  const currentPreset = getTrackSound(channel).preset;

  // Filter presets
  const filteredPresets = useMemo(() => {
    return allPresets.filter((p) => {
      if (selectedCategory && selectedCategory !== "All" && p.category !== selectedCategory)
        return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allPresets, selectedCategory, search]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay attaching so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus search on open
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleSelectPreset = useCallback(
    (preset: SoundPreset) => {
      selectPreset(channel, preset);
      onClose();
    },
    [channel, selectPreset, onClose],
  );

  // If no presets available (e.g. sampler with no scanned library)
  if (allPresets.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-96 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden"
      >
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
          No presets available for this channel.
          <br />
          <span className="text-[10px]">Connect SEQTRAK and scan to populate the library.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-96 max-h-[500px] bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col"
    >
      {/* A. AI Suggestion banner */}
      {suggestedPreset && (
        <button
          className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border cursor-pointer hover:bg-primary/10 transition-colors w-full text-left"
          onClick={() => handleSelectPreset(suggestedPreset)}
        >
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">
              Suggested: {suggestion.primary.name}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Best match for {detectedGenre === "default" ? "this pattern" : detectedGenre}
            </div>
          </div>
        </button>
      )}

      {/* B. Category filter (horizontal scroll) */}
      <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-border shrink-0">
        <button
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0",
            selectedCategory === "All"
              ? "bg-primary text-primary-foreground"
              : "bg-accent/50 text-muted-foreground hover:bg-accent",
          )}
          onClick={() => setSelectedCategory("All")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:bg-accent",
            )}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* C. Search input */}
      <div className="px-2 py-1.5 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search sounds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 text-xs bg-background border border-border rounded pl-7 pr-7 outline-none focus:ring-1 focus:ring-primary/50"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* D. Preset list (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={(el) => {
        // Auto-scroll to current preset on open
        if (el && currentPreset) {
          requestAnimationFrame(() => {
            const active = el.querySelector("[data-active-preset]");
            active?.scrollIntoView({ block: "center" });
          });
        }
      }}>
        {filteredPresets.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No matching sounds found.
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isCurrent = currentPreset?.id === preset.id;
            const isSuggested = suggestedPreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                data-active-preset={isCurrent ? "true" : undefined}
                onClick={() => handleSelectPreset(preset)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-1.5 text-xs transition-colors",
                  isCurrent
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent/50 text-foreground",
                )}
              >
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  {isSuggested && <Star className="h-3 w-3 text-primary shrink-0 fill-primary" />}
                  <span className="truncate">{preset.name}</span>
                </span>
                <span className="text-muted-foreground text-[10px] ml-2 shrink-0">
                  {preset.category}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
