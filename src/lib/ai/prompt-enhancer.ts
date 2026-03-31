import { z } from "zod";

export const enhancedPromptSchema = z.object({
  enhancedPrompt: z.string(),
});

// Inline type to avoid circular deps
interface EnhancerProfile {
  id: string;
  displayName: string;
  prompts: { channelDocs: string };
}

let _cachedSeqtrackPrompt: string | null = null;

export function buildEnhancerSystemPrompt(profile?: EnhancerProfile): string {
  // SEQTRAK default (cached)
  if (!profile || profile.id === "seqtrak") {
    if (_cachedSeqtrackPrompt) return _cachedSeqtrackPrompt;
    _cachedSeqtrackPrompt = `You are a music production expert for the Yamaha SEQTRAK groovebox.
Given a brief music description and production parameters, expand it into a detailed, specific prompt for a MIDI pattern generator.

Include: style details, rhythm specifics, channel roles (drums ch1-7, synth ch8-9, DX ch10, sampler ch11), tempo feel, musical character, effects, and textural elements.
Be concrete and production-specific, not generic.
Keep it under 200 words.

Return JSON: { "enhancedPrompt": "..." }`;
    return _cachedSeqtrackPrompt;
  }

  // Device-specific prompt
  const isMicroFreak = profile.id === "microfreak";
  const soundDesignHint = isMicroFreak
    ? `\nInclude sound design details: oscillator type (BasicWaves/SuperWave/WaveTable/V.Analog/KarplusStr/Harmo/WaveShaper/TwoOpFM/Formant/Chords/Speech/Modal), filter character (bright/dark/resonant/open), envelope shape (plucky/sustained/swelling/percussive), and any LFO modulation or glide.`
    : "";

  return `You are a music production expert for the ${profile.displayName}.
Given a brief music description and production parameters, expand it into a detailed, specific prompt for a MIDI pattern generator targeting this device.

${profile.prompts.channelDocs}

Include: style details, rhythm specifics, specific channel/note assignments appropriate for this device, tempo feel, musical character, and textural elements.${soundDesignHint}
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
  deviceName?: string;
}): string {
  const parts = [`Original description: "${req.prompt}"`];
  if (req.deviceName) parts.push(`Target device: ${req.deviceName}`);
  if (req.bpm)       parts.push(`BPM: ${req.bpm}`);
  if (req.scaleRoot) parts.push(`Key: ${req.scaleRoot}`);
  if (req.scaleName) parts.push(`Scale: ${req.scaleName}`);
  if (req.bars)      parts.push(`Bars: ${req.bars}`);
  return parts.join("\n");
}
