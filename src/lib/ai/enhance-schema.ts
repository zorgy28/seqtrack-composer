import { z } from "zod";
import { noteSchema, patternSchema } from "./schema";

// Re-export for convenience — callers may need note/pattern schemas too
export { noteSchema, patternSchema };

const soundRecommendationSchema = z.object({
  id: z.number().describe("Preset ID from SEQTRAK sound library"),
  name: z.string().describe("Preset name"),
  category: z.string().describe("Sound category"),
});

const soundDesignParamSchema = z.object({
  cc: z.number().describe("MIDI CC number"),
  value: z.number().describe("Value 0-127"),
  name: z.string().describe("Parameter name"),
});

const matrixSlotSchema = z.object({
  source: z.string().describe("Modulation source: LFO, Env, CycleEnv, Press, Key"),
  destination: z.string().describe("Modulation destination: Pitch, Wave, Timbre, Shape, Cutoff, etc."),
  amount: z.number().describe("Modulation amount -100 to +100"),
});

const enhanceTrackSchema = z.object({
  channel: z.number().describe("MIDI channel number"),
  patterns: z.array(patternSchema),
  soundPreset: soundRecommendationSchema.optional().describe("Recommended sound preset for this channel"),
  soundDesign: z.array(soundDesignParamSchema).optional().describe(
    "CC parameters for sound design (oscillator, filter, envelope, LFO).",
  ),
  matrixRouting: z.array(matrixSlotSchema).optional().describe(
    "Modulation matrix routing. Applied manually on hardware.",
  ),
  reason: z.string().optional().describe("Why this sound was chosen"),
});

export const enhanceResultSchema = z.object({
  tracks: z.array(enhanceTrackSchema).describe("Enhanced tracks"),
  bpm: z.number().optional().describe("Suggested BPM change"),
  description: z.string().describe("What was changed and why"),
  suggestions: z.array(z.string()).describe("2-3 follow-up suggestions"),
});

export type EnhanceResult = z.infer<typeof enhanceResultSchema>;
export type EnhanceAction = "enhance" | "sounds" | "sound-design" | "rearrange" | "all";
