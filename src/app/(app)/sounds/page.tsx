"use client";

import { useState, useMemo, useCallback } from "react";
import { useProject } from "@/providers/project-provider";
import { useSoundControl } from "@/hooks/use-sound-control";
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

export default function SoundsPage() {
  const { selectedChannel, setSelectedChannel } = useProject();
  const { selectPreset, setCC, getTrackSound, isConnected } = useSoundControl();
  const [engine, setEngine] = useState<SoundEngine>("awm2");
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSelectPreset = (preset: SoundPreset) => {
    selectPreset(selectedChannel, preset);
  };

  // Scan handler
  const handleScan = useCallback(async () => {
    if (!isConnected) return;
    setIsScanning(true);
    setScanProgress({ current: 0, total: 0, currentName: "" });
    try {
      // We need the device ID — useSoundControl uses useMidiConnection internally
      // Import the midi-connection module to get the device
      const { getOutputs } = await import("@/lib/webmidi/midi-connection");
      const outputs = getOutputs();
      const seqtrack = outputs.find((o) => o.isSeqtrack);
      if (!seqtrack) return;

      const presets = await scanAllPresets(seqtrack.id, (progress) => {
        setScanProgress({
          current: progress.current,
          total: progress.total,
          currentName: progress.currentName,
        });
      });
      saveScannedPresets(presets);
      invalidatePresetCache();
      setScannedPresets(presets);
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
                {/* Scan & Export Buttons */}
                {isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={handleScan}
                    disabled={isScanning}
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
                    ? `${scannedPresets!.length} scanned presets`
                    : `${getAllPresets().length} built-in presets`}
                </span>
                {hasScannedData && (
                  <Badge variant="secondary" className="text-[9px] h-4">Scanned</Badge>
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-1.5 text-sm"
            />

            {/* Category Filter */}
            {!searchQuery && (
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={selectedCategory === "all" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setSelectedCategory(cat)}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-[400px] overflow-auto">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    disabled={!isConnected}
                    className={cn(
                      "text-left px-2 py-1.5 rounded text-xs transition-colors",
                      trackSound.preset?.id === preset.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent/50",
                      !isConnected && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span className="font-medium block truncate">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.category}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
