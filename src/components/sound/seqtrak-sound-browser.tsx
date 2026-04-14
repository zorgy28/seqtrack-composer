"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { useProject } from "@/providers/project-provider";
import { useSoundControl } from "@/hooks/use-sound-control";
import { useMidiConnection } from "@/hooks/use-midi-connection";
import {
  getAllPresets,
  getCategoriesForEngine,
  invalidatePresetCache,
} from "@/lib/midi/sound-library";
import {
  scanAllPresets,
  saveScannedPresets,
  downloadPresetsAsJSON,
  loadScannedPresets,
} from "@/lib/midi/sound-scanner";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { TrackParams } from "@/components/sound/track-params";
import type { SoundPreset, SoundCategory, SoundEngine, SeqtrackChannel } from "@/lib/midi/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const ENGINE_TABS: Array<{ value: SoundEngine; label: string }> = [
  { value: "drum", label: "Drum" },
  { value: "awm2", label: "Synth (AWM2)" },
  { value: "dx", label: "DX (FM)" },
  { value: "sampler", label: "Sampler" },
];

const VISIBLE_LIMIT = 100;

// Memoized preset button to avoid re-rendering all 100 buttons on selection change
const PresetButton = memo(function PresetButton({
  preset,
  isActive,
  isLastPlayed,
  isConnected,
  onPreview,
}: {
  preset: SoundPreset;
  isActive: boolean;
  isLastPlayed: boolean;
  isConnected: boolean;
  onPreview: (preset: SoundPreset) => void;
}) {
  return (
    <button
      onClick={() => onPreview(preset)}
      disabled={!isConnected}
      className={cn(
        "text-left px-2 py-1.5 rounded text-xs transition-colors relative",
        isActive
          ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
          : "hover:bg-accent/50",
        !isConnected && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className="font-medium block truncate pr-4">{preset.name}</span>
      <span className={cn(
        "text-[10px]",
        isActive
          ? "text-primary-foreground/70"
          : "text-muted-foreground",
      )}>
        {preset.category}
      </span>
      {isLastPlayed && (
        <span className="absolute top-1.5 right-1.5 text-[10px]" title="Last played">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </span>
      )}
    </button>
  );
});

export function SeqtrackSoundBrowser() {
  const { selectedChannel, setSelectedChannel } = useProject();
  const { selectPreset, setCC, getTrackSound, isConnected } = useSoundControl();
  const { sendNoteToDevice, device } = useMidiConnection();
  const [engine, setEngine] = useState<SoundEngine>("awm2");
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastPlayedId, setLastPlayedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_LIMIT);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, currentName: "" });
  const [scannedPresets, setScannedPresets] = useState<SoundPreset[] | null>(() =>
    typeof window !== "undefined" ? loadScannedPresets() : null,
  );

  const trackInfo = SEQTRAK_TRACKS[selectedChannel];
  const trackSound = getTrackSound(selectedChannel);

  // Use scanned presets if available, otherwise built-in
  const activePresets = useMemo(() => {
    if (scannedPresets && scannedPresets.length > 100) return scannedPresets;
    return getAllPresets();
  }, [scannedPresets]);

  const categories = useMemo(() => getCategoriesForEngine(engine), [engine]);

  const filteredPresets = useMemo(() => {
    let presets = searchQuery
      ? activePresets.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : activePresets.filter((p) => p.engine === engine);

    if (selectedCategory !== "all" && !searchQuery) {
      presets = presets.filter((p) => p.category === selectedCategory);
    }

    return presets;
  }, [engine, selectedCategory, searchQuery, activePresets]);

  // Reset visible count when filters change
  const visiblePresets = useMemo(() => {
    return filteredPresets.slice(0, visibleCount);
  }, [filteredPresets, visibleCount]);

  const hasMore = filteredPresets.length > visibleCount;

  // Preview sound on click: select preset then send a note
  const handlePreviewSound = useCallback(async (preset: SoundPreset) => {
    if (!device) return;
    await selectPreset(selectedChannel, preset);
    setLastPlayedId(preset.id);
    setTimeout(() => {
      sendNoteToDevice(selectedChannel, 60, 100, 300);
    }, 50);
  }, [device, selectPreset, selectedChannel, sendNoteToDevice]);

  // Scan handler — incremental: only scans slots that don't have real names yet
  const handleScan = useCallback(async () => {
    if (!isConnected) return;
    setIsScanning(true);
    setScanProgress({ current: 0, total: 0, currentName: "" });
    try {
      const { getOutputs } = await import("@/lib/webmidi/midi-connection");
      const outputs = getOutputs();
      const seqtrack = outputs.find((o) => o.isSeqtrack);
      if (!seqtrack) return;

      // Load existing data — build skip set for slots that already have real names
      const existing = loadScannedPresets() ?? [];
      const existingMap = new Map(
        existing.map((p) => [`${p.bankMSB}-${p.bankLSB}-${p.programNumber}`, p])
      );

      // Skip keys: slots that already have real (non-generic) names
      const skipKeys = new Set<string>();
      for (const p of existing) {
        if (!/^(Drum|Synth|DX) \d/.test(p.name)) {
          skipKeys.add(`${p.bankMSB}-${p.bankLSB}-${p.programNumber}`);
        }
      }

      const alreadyScanned = skipKeys.size;
      console.log(`[scan] Skipping ${alreadyScanned} already-scanned slots`);

      const scannedFromDevice = await scanAllPresets(seqtrack.id, (progress) => {
        setScanProgress({
          current: progress.current,
          total: progress.total,
          currentName: progress.currentName,
        });
      }, skipKeys);

      // Merge: new scan results overwrite existing, but keep any existing real names
      // that weren't re-scanned (in case scan was partial)
      const mergedMap = new Map(existingMap);
      for (const p of scannedFromDevice) {
        const key = `${p.bankMSB}-${p.bankLSB}-${p.programNumber}`;
        mergedMap.set(key, p);
      }
      const merged = Array.from(mergedMap.values());

      saveScannedPresets(merged);
      invalidatePresetCache();
      setScannedPresets(merged);

      const newNames = merged.filter(
        (p) => !/^(Drum|Synth|DX) \d/.test(p.name)
      ).length;
      console.log(`[scan] ${newNames} real names (was ${alreadyScanned}), ${merged.length} total`);
    } finally {
      setIsScanning(false);
    }
  }, [isConnected]);

  // Export handler
  const handleExport = useCallback(() => {
    const presets = scannedPresets ?? getAllPresets();
    downloadPresetsAsJSON(presets);
  }, [scannedPresets]);

  // Determine which channels are compatible with current engine
  const compatibleChannels: SeqtrackChannel[] =
    engine === "drum" ? [1, 2, 3, 4, 5, 6, 7] :
    engine === "awm2" ? [8, 9] :
    engine === "dx" ? [10] :
    engine === "sampler" ? [11] : [];

  // Memoize built-in preset count to avoid calling getAllPresets() during render
  const builtInPresetCount = useMemo(() => getAllPresets().length, []);

  const hasScannedData = scannedPresets !== null && scannedPresets.length > 100;
  const scanPercent = scanProgress.total > 0
    ? Math.round((scanProgress.current / scanProgress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-3xl mx-auto w-full p-6 space-y-4">
        {/* Target Track Selector */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sound Browser</CardTitle>
              <div className="flex items-center gap-2">
                {/* Hint to scan if no scanned data */}
                {!hasScannedData && isConnected && (
                  <span className="text-[10px] text-muted-foreground">
                    Scan device to get all sounds
                  </span>
                )}
                {/* Scan & Export Buttons */}
                {isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={handleScan}
                    disabled={isScanning}
                    title="Scan SEQTRAK for preset names via SysEx"
                  >
                    {isScanning
                      ? `Scanning ${scanPercent}%...`
                      : "Scan Device"}
                  </Button>
                )}
                {hasScannedData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={handleExport}
                    title="Export scanned preset data as JSON"
                  >
                    Export JSON
                  </Button>
                )}
              </div>
            </div>
            {/* Scan Progress */}
            {isScanning && (
              <div className="space-y-1 mt-2">
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${scanPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {scanProgress.current}/{scanProgress.total}
                  {scanProgress.currentName && ` — ${scanProgress.currentName}`}
                </p>
              </div>
            )}
            {/* Library Status */}
            {!isScanning && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {hasScannedData
                    ? `${scannedPresets!.length} presets loaded`
                    : `${builtInPresetCount} built-in presets`}
                </span>
                {hasScannedData && (
                  <Badge variant="secondary" className="text-[9px] h-4">
                    {scannedPresets!.length > 2000 ? "Full" : "Scanned"}
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Engine Tabs */}
            <Tabs
              value={engine}
              onValueChange={(v) => {
                setEngine(v as SoundEngine);
                setSelectedCategory("all");
                setVisibleCount(VISIBLE_LIMIT);
              }}
            >
              <TabsList>
                {ENGINE_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Target Channel Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Target:</span>
              <div className="flex gap-1">
                {compatibleChannels.map((ch) => {
                  const info = SEQTRAK_TRACKS[ch];
                  return (
                    <Button
                      key={ch}
                      variant={selectedChannel === ch ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setSelectedChannel(ch)}
                    >
                      {info.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search sounds..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(VISIBLE_LIMIT);
              }}
              className="w-full bg-background border border-input rounded px-3 py-1.5 text-sm"
            />

            {/* Category Filter */}
            {!searchQuery && (
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={selectedCategory === "all" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    setSelectedCategory("all");
                    setVisibleCount(VISIBLE_LIMIT);
                  }}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setVisibleCount(VISIBLE_LIMIT);
                    }}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Sound + CC Controls */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {trackInfo.name} — {trackSound.preset?.name ?? "Default Sound"}
              </CardTitle>
              {!isConnected && (
                <Badge variant="destructive" className="text-[10px]">Not connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <TrackParams
              channel={selectedChannel}
              ccValues={trackSound.ccValues}
              onCCChange={(cc, value) => setCC(selectedChannel, cc, value)}
              disabled={!isConnected}
            />
          </CardContent>
        </Card>

        {/* Preset List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {filteredPresets.length} presets
              {filteredPresets.length > visibleCount && (
                <span className="text-muted-foreground font-normal">
                  {" "}(showing {visibleCount})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredPresets.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {engine === "sampler" && !hasScannedData
                  ? "Sampler presets require a device scan. Connect your SEQTRAK and tap \"Scan Device\"."
                  : "No presets found."}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-[400px] overflow-auto">
                  {visiblePresets.map((preset) => (
                    <PresetButton
                      key={preset.id}
                      preset={preset}
                      isActive={trackSound.preset?.id === preset.id}
                      isLastPlayed={lastPlayedId === preset.id}
                      isConnected={isConnected}
                      onPreview={handlePreviewSound}
                    />
                  ))}
                </div>
                {/* Show More button */}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setVisibleCount((prev) => prev + VISIBLE_LIMIT)}
                    >
                      Show more ({filteredPresets.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
