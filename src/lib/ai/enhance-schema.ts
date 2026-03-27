import { z } from "zod";
import { noteSchema, patternSchema } from "./schema";

// Re-export for convenience — callers may need note/pattern schemas too
export { noteSchema, patternSchema };

const soundRecommendationSchema = z.object({
  id: z.number().describe("Preset ID from SEQTRAK sound library"),
  name: z.string().describe("Preset name"),
  category: z.string().describe("Sound category"),
});

const enhanceTrackSchema = z.object({
  channel: z.number().describe("SEQTRAK channel 1-11"),
  patterns: z.array(patternSchema),
  soundPreset: soundRecommendationSchema.optional().describe("Recommended sound preset for this channel"),
  reason: z.string().optional().describe("Why this sound was chosen"),
});

export const enhanceResultSchema = z.object({
  tracks: z.array(enhanceTrackSchema).describe("Enhanced tracks"),
  bpm: z.number().optional().describe("Suggested BPM change"),
  description: z.string().describe("What was changed and why"),
  suggestions: z.array(z.string()).describe("2-3 follow-up suggestions"),
});

export type EnhanceResult = z.infer<typeof enhanceResultSchema>;
export type EnhanceAction = "enhance" | "sounds" | "rearrange" | "all";
