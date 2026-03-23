"use client";

import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StemInfo {
  name: string;
  enabled: boolean;
}

const STEM_COLORS: Record<string, { active: string; muted: string }> = {
  drums: {
    active: "bg-red-500/20 text-red-400 border-red-500/40",
    muted: "bg-transparent text-muted-foreground border-border",
  },
  bass: {
    active: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    muted: "bg-transparent text-muted-foreground border-border",
  },
  vocals: {
    active: "bg-teal-500/20 text-teal-400 border-teal-500/40",
    muted: "bg-transparent text-muted-foreground border-border",
  },
  guitar: {
    active: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    muted: "bg-transparent text-muted-foreground border-border",
  },
  piano: {
    active: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    muted: "bg-transparent text-muted-foreground border-border",
  },
  other: {
    active: "bg-slate-500/20 text-slate-400 border-slate-500/40",
    muted: "bg-transparent text-muted-foreground border-border",
  },
};

function getStemColor(name: string, enabled: boolean) {
  const key = name.toLowerCase();
  const colors = STEM_COLORS[key] ?? STEM_COLORS.other;
  return enabled ? colors.active : colors.muted;
}

interface StemPreviewProps {
  stems: StemInfo[];
  onToggle: (stemName: string) => void;
}

export function StemPreview({ stems, onToggle }: StemPreviewProps) {
  if (stems.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">Detected Stems</p>
      <div className="flex flex-wrap gap-2">
        {stems.map((stem) => (
          <button
            key={stem.name}
            type="button"
            onClick={() => onToggle(stem.name)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              getStemColor(stem.name, stem.enabled)
            )}
          >
            <Music className="size-3" />
            <span className="capitalize">{stem.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
