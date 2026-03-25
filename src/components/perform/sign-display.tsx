"use client";

import { HAND_SIGN_LABELS } from "@/lib/handtracking/types";
import type { HandState } from "@/lib/handtracking/types";

interface SignDisplayProps {
  hands: HandState[];
}

export function SignDisplay({ hands }: SignDisplayProps) {
  const activeSigns = hands.filter((h) => h.sign !== "none");
  if (activeSigns.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {activeSigns.map((hand, i) => {
        const { label, emoji } = HAND_SIGN_LABELS[hand.sign];
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium"
            title={`${hand.handedness} hand: ${label}`}
          >
            <span>{emoji}</span>
            <span className="text-muted-foreground">{hand.handedness[0]}</span>
          </span>
        );
      })}
    </div>
  );
}
