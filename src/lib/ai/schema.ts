import { z } from "zod";

export const noteSchema = z.object({
  pitch: z.number().describe("MIDI note 0-127. Use 60 for drums."),
  velocity: z.number().describe("Velocity 1-127"),
  step: z.number().describe("Step position 0-based"),
  duration: z.number().describe("Duration in steps"),
  probability: z.number().describe("Probability 0-100"),
});

export const patternSchema = z.object({
  name: z.string(),
  bars: z.number().describe("Number of bars 1-8"),
  notes: z.array(noteSchema),
  swing: z.number().describe("Swing amount -100 to 100"),
});

const soundDesignParamSchema = z.object({
  cc: z.number().describe("MIDI CC number (e.g., 9 for Oscillator Type, 23 for Filter Cutoff)"),
  value: z.number().describe("Value 0-127"),
  name: z.string().describe("Parameter name (e.g., 'Oscillator Type', 'Filter Cutoff')"),
});

const matrixSlotSchema = z.object({
  source: z.string().describe("Modulation source: LFO, Env, CycleEnv, Press (aftertouch), Key (keyboard tracking)"),
  destination: z.string().describe("Modulation destination: Pitch, Wave, Timbre, Shape, Cutoff, Resonance, etc."),
  amount: z.number().describe("Modulation amount -100 to +100 (negative inverts)"),
});

const trackEntrySchema = z.object({
  channel: z.number().describe("MIDI channel 1-11"),
  patterns: z.array(patternSchema),
  soundPreset: z.object({
    id: z.number(),
    name: z.string(),
    category: z.string(),
  }).optional().describe("Recommended sound preset"),
  soundDesign: z.array(soundDesignParamSchema).optional().describe(
    "CC parameters for sound design. For MicroFreak: oscillator type, filter, envelope, LFO settings.",
  ),
  matrixRouting: z.array(matrixSlotSchema).optional().describe(
    "Modulation matrix routing for MicroFreak. Source→Destination with amount. Applied manually on hardware.",
  ),
  reason: z.string().optional().describe("Why this sound was chosen"),
});

export const compositionResultSchema = z.object({
  tracks: z.array(trackEntrySchema).describe(
    "Array of track entries with channel and patterns. Only include channels that have notes.",
  ),
  bpm: z.number().optional().describe("Suggested BPM"),
  description: z.string().describe("Brief description of what was generated"),
  suggestions: z.array(z.string()).describe("2-3 follow-up suggestions"),
});

export type CompositionOutput = z.infer<typeof compositionResultSchema>;
