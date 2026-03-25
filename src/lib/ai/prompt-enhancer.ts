import { z } from "zod";

export const enhancedPromptSchema = z.object({
  enhancedPrompt: z.string(),
});

export function buildEnhancerSystemPrompt(): string {
  return `You are a music production expert for the Yamaha SEQTRAK groovebox.
Given a brief music description and production parameters, expand it into a detailed, specific prompt for a MIDI pattern generator.

Include: style details, rhythm specifics, channel roles (drums ch1-7, synth ch8-9, DX ch10, sampler ch11), tempo feel, musical character, effects, and textural elements.
Be concrete and production-specific, not generic.
Keep it under 200 words.

Return JSON: { "enhancedPrompt": "..." }`;
}

export function buildEnhancerUserPrompt(req: {
  prompt: string;
  bpm?: number;
  scaleRoot?: string;
  scaleName?: string;
  bars?: number;
}): string {
  const parts = [`Original description: "${req.prompt}"`];
  if (req.bpm)       parts.push(`BPM: ${req.bpm}`);
  if (req.scaleRoot) parts.push(`Key: ${req.scaleRoot}`);
  if (req.scaleName) parts.push(`Scale: ${req.scaleName}`);
  if (req.bars)      parts.push(`Bars: ${req.bars}`);
  return parts.join("\n");
}
