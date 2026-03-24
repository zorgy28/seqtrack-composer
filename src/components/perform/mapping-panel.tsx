"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  currentPresetId,
}: MappingPanelProps) {
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
          {mappings.map((mapping) => {
            const output = ccOutputs.find(
              (o) => o.mapping.id === mapping.id,
            );
            return (
              <MappingRow
                key={mapping.id}
                mapping={mapping}
                currentOutput={output}
                onUpdate={(updates) => onUpdateMapping(mapping.id, updates)}
                onDelete={() => onRemoveMapping(mapping.id)}
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
