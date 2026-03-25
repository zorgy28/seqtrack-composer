"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  className?: string;
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
}

function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onValueChange,
}: SliderProps) {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;
  const percent = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex w-full touch-none items-center select-none", className)} data-slot="slider">
      <div className="relative h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full pointer-events-none transition-colors seqtrak-knob",
          disabled && "opacity-50",
        )}
        style={{ left: `calc(${percent}% - 7px)` }}
      />
    </div>
  );
}

export { Slider }
