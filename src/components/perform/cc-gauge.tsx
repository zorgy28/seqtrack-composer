"use client";

import { cn } from "@/lib/utils";

interface CCGaugeProps {
  label: string;
  value: number;
  maxValue: number;
  bipolar: boolean;
  gestureAxis: string;
  active: boolean;
  color?: string;
}

export function CCGauge({
  label,
  value,
  maxValue,
  bipolar,
  gestureAxis,
  active,
  color,
}: CCGaugeProps) {
  // Calculate fill percentage
  const fillPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

  // For bipolar: center is at 50% (value 64 out of 127)
  const centerPercent = 50;
  const bipolarFillStart = bipolar
    ? Math.min(fillPercent, centerPercent)
    : 0;
  const bipolarFillEnd = bipolar
    ? Math.max(fillPercent, centerPercent)
    : fillPercent;
  const bipolarFillHeight = bipolarFillEnd - bipolarFillStart;

  // Map Tailwind color names to CSS bg classes
  const colorClass = color ? `bg-${color}-500` : "bg-primary";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5 transition-opacity duration-200",
        !active && "opacity-30",
      )}
      title={`${gestureAxis} -> ${label}`}
    >
      {/* Numeric value */}
      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
        {value}
      </span>

      {/* Vertical bar */}
      <div className="relative w-[60px] h-[80px] bg-muted rounded-sm overflow-hidden">
        {/* Center line for bipolar */}
        {bipolar && (
          <div className="absolute left-0 right-0 top-1/2 h-px bg-foreground/20" />
        )}

        {/* Fill bar */}
        <div
          className={cn(
            "absolute left-0 right-0 transition-all duration-75 rounded-sm",
            active ? colorClass : "bg-muted-foreground/40",
          )}
          style={{
            bottom: `${bipolarFillStart}%`,
            height: `${bipolarFillHeight}%`,
          }}
        />
      </div>

      {/* CC label */}
      <span className="text-[9px] font-mono text-muted-foreground uppercase truncate w-[60px] text-center">
        {label}
      </span>
    </div>
  );
}
