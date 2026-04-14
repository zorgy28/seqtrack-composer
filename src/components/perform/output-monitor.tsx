"use client";

import { CCGauge } from "./cc-gauge";
import { CC_PARAMS } from "@/lib/midi/cc-map";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { GESTURE_AXIS_LABELS } from "@/lib/handtracking/types";
import type { CCOutput } from "@/lib/handtracking/types";
import type { CCParameter, SeqtrackChannel } from "@/lib/midi/types";
import { useDeviceProfile } from "@/providers/device-provider";

const CC_PARAMS_MAP: Map<number, CCParameter> = new Map(
  CC_PARAMS.map((p) => [p.cc, p]),
);

interface OutputMonitorProps {
  ccOutputs: CCOutput[];
  isTracking: boolean;
}

export function OutputMonitor({ ccOutputs, isTracking }: OutputMonitorProps) {
  const { profile } = useDeviceProfile();

  if (ccOutputs.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-3">
        {isTracking
          ? "No active CC outputs"
          : "Start tracking to see CC outputs"}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ccOutputs.map((output) => {
        const ccParam = CC_PARAMS_MAP.get(output.mapping.cc)
          ?? profile.ccParams.find(p => p.cc === output.mapping.cc);
        const profileTrack = profile.tracks.find(t => t.channel === output.mapping.channel);
        const track = profileTrack
          ?? SEQTRAK_TRACKS[output.mapping.channel as SeqtrackChannel];
        const axisLabel =
          GESTURE_AXIS_LABELS[output.mapping.axis] ?? output.mapping.axis;

        return (
          <CCGauge
            key={output.mapping.id}
            label={ccParam?.shortName ?? `CC${output.mapping.cc}`}
            value={output.ccValue}
            maxValue={ccParam?.max ?? 127}
            bipolar={ccParam?.bipolar ?? false}
            gestureAxis={axisLabel}
            active={output.mapping.enabled && isTracking}
            color={track?.color}
          />
        );
      })}
    </div>
  );
}
