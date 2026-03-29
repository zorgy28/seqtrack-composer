"use client";

import type { SeqtrackChannel } from "@/lib/midi/types";
import { getQuickCCs } from "@/lib/midi/cc-map";
import { Slider } from "@/components/ui/slider";
import { useDeviceProfile } from "@/providers/device-provider";

interface TrackParamsProps {
  channel: SeqtrackChannel;
  ccValues: Record<number, number>;
  onCCChange: (cc: number, value: number) => void;
  disabled?: boolean;
}

export function TrackParams({ channel, ccValues, onCCChange, disabled }: TrackParamsProps) {
  const { profile } = useDeviceProfile();
  const ccs = getQuickCCs(channel, profile);

  if (ccs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3">
      {ccs.map((param) => {
        const currentValue = ccValues[param.cc] ?? param.defaultValue;
        return (
          <div key={param.cc} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {param.shortName}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {currentValue}
              </span>
            </div>
            <Slider
              value={[currentValue]}
              min={param.min}
              max={param.max}
              step={1}
              disabled={disabled}
              onValueChange={(val) => onCCChange(param.cc, Array.isArray(val) ? val[0] : val)}
              className="h-2"
            />
          </div>
        );
      })}
    </div>
  );
}
