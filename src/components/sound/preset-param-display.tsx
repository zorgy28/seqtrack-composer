"use client";

// ── Constants ───────────────────────────────────────────────────

export const PARAM_LABELS: Record<number, string> = {
  9: "Osc Type", 10: "Wave", 12: "Timbre", 13: "Shape",
  23: "Filter Cut", 83: "Resonance",
  105: "Attack", 106: "Decay", 29: "Sustain", 26: "Filter Env",
  102: "CycEnv Rise", 103: "CycEnv Fall", 28: "CycEnv Hold", 24: "CycEnv Amt",
  93: "LFO Rate", 94: "LFO Sync",
  5: "Glide",
};

export const PARAM_GROUPS: Array<{ label: string; ccs: number[] }> = [
  { label: "Oscillator", ccs: [9, 10, 12, 13] },
  { label: "Filter", ccs: [23, 83] },
  { label: "Envelope", ccs: [105, 106, 29, 26] },
  { label: "Cycling Env", ccs: [102, 103, 28, 24] },
  { label: "LFO", ccs: [93, 94] },
  { label: "Performance", ccs: [5] },
];

// ── Component ───────────────────────────────────────────────────

export interface PresetParamDisplayProps {
  params: Record<number, number>;
  title: string;
}

export function PresetParamDisplay({ params, title }: PresetParamDisplayProps) {
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-2 overflow-y-auto">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      {PARAM_GROUPS.map((group) => (
        <div key={group.label}>
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
            {group.label}
          </span>
          <div className="flex flex-col gap-1 mt-0.5">
            {group.ccs.map((cc) => {
              const value = params[cc];
              if (value === undefined) return null;
              return (
                <div key={cc} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-20 truncate">
                    {PARAM_LABELS[cc] ?? `CC${cc}`}
                  </span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(value / 127) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
