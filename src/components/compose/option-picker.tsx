"use client";

import { OptionCard, type TranscriptionOption } from "./option-card";

interface OptionPickerProps {
  options: TranscriptionOption[];
  detectedGenre?: string;
  detectedKey?: string;
  detectedBpm?: number;
  onPreview: (index: number) => void;
  onApply: (index: number) => void;
  previewingIndex?: number | null;
  currentStep?: number | null;
}

export function OptionPicker({
  options,
  detectedGenre,
  detectedKey,
  detectedBpm,
  onPreview,
  onApply,
  previewingIndex,
  currentStep,
}: OptionPickerProps) {
  const subtitle = [detectedGenre, detectedKey, detectedBpm ? `${detectedBpm} BPM` : null]
    .filter(Boolean)
    .join(" \u2014 ");

  return (
    <div className="flex flex-col gap-4">
      {/* Heading */}
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-medium">Choose an Arrangement</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {options.map((option, index) => (
          <OptionCard
            key={index}
            option={option}
            onPreview={() => onPreview(index)}
            onApply={() => onApply(index)}
            currentStep={previewingIndex === index ? currentStep : null}
            isPlaying={previewingIndex === index}
          />
        ))}
      </div>
    </div>
  );
}
