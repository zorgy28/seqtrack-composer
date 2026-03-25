"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GestureMapping, GestureAxis, CCOutput } from "@/lib/handtracking/types";
import { GESTURE_AXIS_LABELS, HAND_AXIS_KEYS, FACE_AXIS_KEYS } from "@/lib/handtracking/types";
import { SelectGroup, SelectLabel } from "@/components/ui/select";
import { ALL_CHANNELS, SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { getCCsForChannel } from "@/lib/midi/cc-map";
import type { SeqtrackChannel } from "@/lib/midi/types";

interface MappingRowProps {
  mapping: GestureMapping;
  currentOutput: CCOutput | undefined;
  onUpdate: (updates: Partial<GestureMapping>) => void;
  onDelete: () => void;
}


const HAND_OPTIONS: Array<{ value: GestureMapping["hand"]; label: string }> = [
  { value: "Left", label: "Left" },
  { value: "Right", label: "Right" },
  { value: "any", label: "Any" },
];

export function MappingRow({
  mapping,
  currentOutput,
  onUpdate,
  onDelete,
}: MappingRowProps) {
  const channelCCs = getCCsForChannel(mapping.channel);
  const currentCCValue = currentOutput?.ccValue;

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-2 rounded-md bg-muted/30 text-xs">
      {/* Gesture axis */}
      <Select
        value={mapping.axis}
        onValueChange={(value) => onUpdate({ axis: value as GestureAxis })}
      >
        <SelectTrigger size="sm" className="w-[130px] text-xs h-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-[10px] font-semibold">Hand</SelectLabel>
            {HAND_AXIS_KEYS.map((axis) => (
              <SelectItem key={axis} value={axis}>
                {GESTURE_AXIS_LABELS[axis]}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-[10px] font-semibold">Face</SelectLabel>
            {FACE_AXIS_KEYS.map((axis) => (
              <SelectItem key={axis} value={axis}>
                {GESTURE_AXIS_LABELS[axis]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Hand selector */}
      <Select
        value={mapping.hand}
        onValueChange={(value) =>
          onUpdate({ hand: value as GestureMapping["hand"] })
        }
      >
        <SelectTrigger size="sm" className="w-[65px] text-xs h-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HAND_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Channel selector */}
      <Select
        value={String(mapping.channel)}
        onValueChange={(value) =>
          onUpdate({ channel: Number(value) as SeqtrackChannel })
        }
      >
        <SelectTrigger size="sm" className="w-[90px] text-xs h-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_CHANNELS.map((ch) => (
            <SelectItem key={ch} value={String(ch)}>
              {SEQTRAK_TRACKS[ch].name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* CC selector */}
      <Select
        value={String(mapping.cc)}
        onValueChange={(value) => onUpdate({ cc: Number(value) })}
      >
        <SelectTrigger size="sm" className="w-[110px] text-xs h-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {channelCCs.map((param) => (
            <SelectItem key={param.cc} value={String(param.cc)}>
              CC{param.cc} {param.shortName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Current value display */}
      <span className="w-8 text-center font-mono text-muted-foreground tabular-nums">
        {currentCCValue !== undefined ? currentCCValue : "--"}
      </span>

      {/* Enable/disable toggle */}
      <Button
        variant={mapping.enabled ? "default" : "outline"}
        size="xs"
        className="h-6 text-[10px] px-1.5"
        onClick={() => onUpdate({ enabled: !mapping.enabled })}
      >
        {mapping.enabled ? "On" : "Off"}
      </Button>

      {/* Invert toggle */}
      <Button
        variant={mapping.invert ? "secondary" : "outline"}
        size="xs"
        className="h-6 text-[10px] px-1.5"
        onClick={() => onUpdate({ invert: !mapping.invert })}
      >
        Inv
      </Button>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
