export const maxDuration = 300; // 5 minutes for local LLM

import { getModelFromConfig, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { compositionResultSchema } from "@/lib/ai/schema";
import { buildCompositionSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import type { ProviderConfig } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { providerConfig, prompt, bpm, scaleRoot, scaleName, bars, swing,
            previousResult, refinementInstruction, deviceId } = body;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    // Validate numeric inputs
    if (bpm != null && (typeof bpm !== "number" || bpm < 5 || bpm > 300)) {
      return Response.json({ error: "bpm must be a number between 5 and 300" }, { status: 400 });
    }
    if (swing != null && (typeof swing !== "number" || swing < -100 || swing > 100)) {
      return Response.json({ error: "swing must be a number between -100 and 100" }, { status: 400 });
    }

    const config: ProviderConfig = providerConfig ?? { provider: "claude" };

    // Lazy import to avoid pulling the entire device/sound-library chain at module init
    let profile;
    if (deviceId) {
      const { getDeviceProfile } = await import("@/lib/devices/registry");
      profile = getDeviceProfile(deviceId);
    }

    // Clamp bars to device max
    const maxBars = profile?.maxBars ?? 8;
    const clampedBars = bars ? Math.min(bars, maxBars) : bars;

    console.log(`[compose] provider=${config.provider} device=${deviceId ?? "seqtrak"} bars=${clampedBars ?? 1} refine=${!!previousResult}`);

    const output = await generateWithFallback({
      model: await getModelFromConfig(config),
      schema: compositionResultSchema,
      system: buildCompositionSystemPrompt(profile),
      prompt: buildUserPrompt({ prompt, bpm, scaleRoot, scaleName, bars: clampedBars, swing,
                                previousResult, refinementInstruction }),
      supportsStructuredOutput: supportsStructuredOutput(config.provider, config.modelId),
      temperature: config.temperature,
    });

    return Response.json(output);
  } catch (err) {
    console.error("Composition error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
