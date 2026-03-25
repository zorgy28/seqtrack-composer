"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizes = {
    sm: { width: 120, height: 28, fontSize: 11, iconSize: 14 },
    md: { width: 160, height: 34, fontSize: 14, iconSize: 18 },
    lg: { width: 220, height: 44, fontSize: 18, iconSize: 24 },
  };
  const s = sizes[size];

  return (
    <svg
      width={s.width}
      height={s.height}
      viewBox={`0 0 ${s.width} ${s.height}`}
      className={cn("shrink-0", className)}
    >
      {/* Black rounded rectangle background (fabric label style) */}
      <rect
        x="0" y="0"
        width={s.width} height={s.height}
        rx={s.height / 4}
        fill="#1a1a1a"
      />

      {/* Subtle border for depth */}
      <rect
        x="0.5" y="0.5"
        width={s.width - 1} height={s.height - 1}
        rx={s.height / 4}
        fill="none"
        stroke="#333"
        strokeWidth="1"
      />

      {/* Waveform icon (original, not Yamaha's mark) */}
      <g transform={`translate(${s.height * 0.4}, ${s.height / 2})`}>
        {/* Simple audio waveform / tuning fork shape */}
        <line x1={-s.iconSize/4} y1={-s.iconSize/3} x2={-s.iconSize/4} y2={s.iconSize/3} stroke="#F26B1D" strokeWidth="2" strokeLinecap="round" />
        <line x1={0} y1={-s.iconSize/2} x2={0} y2={s.iconSize/2} stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1={s.iconSize/4} y1={-s.iconSize/3} x2={s.iconSize/4} y2={s.iconSize/3} stroke="#F26B1D" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* "SEQTRAK-AI" text */}
      <text
        x={s.height * 0.85}
        y={s.height / 2 + 1}
        fill="white"
        fontSize={s.fontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        letterSpacing="0.08em"
        dominantBaseline="central"
      >
        SEQTRAK-AI
      </text>
    </svg>
  );
}
