"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MappingPreset } from "@/lib/handtracking/types";
import { ALL_PRESETS } from "@/lib/handtracking/presets";

interface MappingPresetSelectorProps {
  onLoadPreset: (preset: MappingPreset) => void;
  currentPresetId?: string;
}

export function MappingPresetSelector({
  onLoadPreset,
  currentPresetId,
}: MappingPresetSelectorProps) {
  return (
    <Select
      value={currentPresetId ?? undefined}
      onValueChange={(value) => {
        const preset = ALL_PRESETS.find((p) => p.id === value);
        if (preset) onLoadPreset(preset);
      }}
    >
      <SelectTrigger size="sm" className="w-full text-xs">
        <SelectValue placeholder="Load a preset..." />
      </SelectTrigger>
      <SelectContent>
        {ALL_PRESETS.map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            <div className="flex flex-col">
              <span className="font-medium">{preset.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {preset.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
