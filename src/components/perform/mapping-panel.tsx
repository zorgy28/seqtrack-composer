"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { MappingRow } from "./mapping-row";
import { MappingPresetSelector } from "./mapping-preset-selector";
import type {
  GestureMapping,
  CCOutput,
  MappingPreset,
} from "@/lib/handtracking/types";

interface MappingPanelProps {
  mappings: GestureMapping[];
  ccOutputs: CCOutput[];
  onUpdateMapping: (id: string, updates: Partial<GestureMapping>) => void;
  onAddMapping: (mapping: GestureMapping) => void;
  onRemoveMapping: (id: string) => void;
  onLoadPreset: (preset: MappingPreset) => void;
  onReorderMappings: (reordered: GestureMapping[]) => void;
  currentPresetId?: string;
}

function createDefaultMapping(): GestureMapping {
  return {
    id: `mapping-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "New Mapping",
    hand: "any",
    axis: "palmX",
    channel: 8,
    cc: 74,
    inputRange: [0, 1],
    outputRange: [0, 127],
    invert: false,
    enabled: true,
  };
}

export function MappingPanel({
  mappings,
  ccOutputs,
  onUpdateMapping,
  onAddMapping,
  onRemoveMapping,
  onLoadPreset,
  onReorderMappings,
  currentPresetId,
}: MappingPanelProps) {
  // ── Drag-and-drop state ──────────────────────────────────────
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const handleDrop = () => {
    if (dragIndex === null || dropTarget === null || dragIndex === dropTarget) {
      setDragIndex(null);
      setDropTarget(null);
      return;
    }
    const reordered = [...mappings];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropTarget, 0, moved);
    onReorderMappings(reordered);
    setDragIndex(null);
    setDropTarget(null);
  };

  // ── Grouped rendering helpers ────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, GestureMapping[]> = {};
    const ungrouped: GestureMapping[] = [];

    for (const m of mappings) {
      if (m.group) {
        if (!groups[m.group]) groups[m.group] = [];
        groups[m.group].push(m);
      } else {
        ungrouped.push(m);
      }
    }

    return { groups, ungrouped };
  }, [mappings]);

  // Get the flat index of a mapping in the original mappings array
  const flatIndex = (mapping: GestureMapping) =>
    mappings.findIndex((m) => m.id === mapping.id);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Mappings</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Preset selector */}
        <MappingPresetSelector
          onLoadPreset={onLoadPreset}
          currentPresetId={currentPresetId}
        />

        {/* Mapping rows */}
        <div className="space-y-1.5">
          {mappings.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              No mappings configured. Load a preset or add one manually.
            </div>
          )}

          {/* Grouped sections */}
          {Object.entries(grouped.groups).map(([groupName, groupMappings]) => (
            <div key={groupName} className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="seqtrak-section-label text-primary">{groupName}</span>
                <Badge variant="secondary" className="text-[9px] h-4">{groupMappings.length}</Badge>
              </div>
              <div className="pl-2 space-y-1">
                {groupMappings.map((mapping) => {
                  const output = ccOutputs.find(
                    (o) => o.mapping.id === mapping.id,
                  );
                  const idx = flatIndex(mapping);
                  return (
                    <MappingRow
                      key={mapping.id}
                      mapping={mapping}
                      currentOutput={output}
                      onUpdate={(updates) => onUpdateMapping(mapping.id, updates)}
                      onDelete={() => onRemoveMapping(mapping.id)}
                      index={idx}
                      onDragStart={setDragIndex}
                      onDragOver={setDropTarget}
                      onDrop={handleDrop}
                      isDragTarget={dropTarget === idx}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Ungrouped at bottom */}
          {grouped.ungrouped.map((mapping) => {
            const output = ccOutputs.find(
              (o) => o.mapping.id === mapping.id,
            );
            const idx = flatIndex(mapping);
            return (
              <MappingRow
                key={mapping.id}
                mapping={mapping}
                currentOutput={output}
                onUpdate={(updates) => onUpdateMapping(mapping.id, updates)}
                onDelete={() => onRemoveMapping(mapping.id)}
                index={idx}
                onDragStart={setDragIndex}
                onDragOver={setDropTarget}
                onDrop={handleDrop}
                isDragTarget={dropTarget === idx}
              />
            );
          })}
        </div>

        {/* Add mapping button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => onAddMapping(createDefaultMapping())}
        >
          <Plus className="size-3 mr-1" />
          Add Mapping
        </Button>
      </CardContent>
    </Card>
  );
}
