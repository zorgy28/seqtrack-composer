"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MappingPreset } from "@/lib/handtracking/types";
import { getPresetsForDevice } from "@/lib/handtracking/presets";
import { useDeviceProfile } from "@/providers/device-provider";

interface MappingPresetSelectorProps {
  onLoadPreset: (preset: MappingPreset) => void;
  currentPresetId?: string;
}

export function MappingPresetSelector({
  onLoadPreset,
  currentPresetId,
}: MappingPresetSelectorProps) {
  const { profile } = useDeviceProfile();
  const presets = getPresetsForDevice(profile.id);

  return (
    <Select
      value={currentPresetId ?? undefined}
      onValueChange={(value) => {
        const preset = presets.find((p) => p.id === value);
        if (preset) onLoadPreset(preset);
      }}
    >
      <SelectTrigger size="sm" className="w-full text-xs">
        <SelectValue placeholder="Load a preset..." />
      </SelectTrigger>
      <SelectContent>
        {presets.map((preset) => (
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
