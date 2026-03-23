import { z } from "zod";
import { patternSchema } from "./schema";

const soundRecommendationSchema = z.object({
  name: z.string().describe("Sound preset name from SEQTRAK library"),
  category: z.string().describe("Sound category"),
  id: z.number().describe("Preset ID from sound library"),
});

const transcriptionTrackSchema = z.object({
  channel: z.number().min(1).max(11).describe("SEQTRAK channel 1-11"),
  patterns: z.array(patternSchema),
  soundPreset: soundRecommendationSchema.describe("Recommended sound preset"),
  alternativeSounds: z
    .array(soundRecommendationSchema)
    .max(3)
    .describe("Alternative presets"),
});

const transcriptionOptionSchema = z.object({
  mode: z.enum(["faithful", "simplified", "creative"]),
  label: z.string().describe("Display name like 'Faithful Transcription'"),
  description: z.string().describe("Brief description of this arrangement"),
  bpm: z.number(),
  key: z.string(),
  tracks: z
    .array(transcriptionTrackSchema)
    .describe("Tracks with patterns and sound recommendations"),
  swing: z.number().describe("Global swing -100 to 100"),
});

export const transcriptionResultSchema = z.object({
  options: z
    .array(transcriptionOptionSchema)
    .min(3)
    .max(3)
    .describe("Exactly 3 arrangement options"),
  analysis: z.object({
    detectedGenre: z.string(),
    detectedKey: z.string(),
    detectedBpm: z.number(),
    stemSummary: z
      .record(z.string(), z.string())
      .describe("Stem name -> description of content"),
  }),
});

export type TranscriptionAIResult = z.infer<typeof transcriptionResultSchema>;
