export const maxDuration = 60;

import { getModelFromConfig, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { enhancedPromptSchema, buildEnhancerSystemPrompt, buildEnhancerUserPrompt } from "@/lib/ai/prompt-enhancer";
import type { ProviderConfig } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { providerConfig, prompt, bpm, scaleRoot, scaleName, bars } = body;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const config: ProviderConfig = providerConfig ?? { provider: "claude" };

    const output = await generateWithFallback({
      model: await getModelFromConfig(config),
      schema: enhancedPromptSchema,
      system: buildEnhancerSystemPrompt(),
      prompt: buildEnhancerUserPrompt({ prompt, bpm, scaleRoot, scaleName, bars }),
      supportsStructuredOutput: supportsStructuredOutput(config.provider),
    });

    return Response.json(output);
  } catch (err) {
    console.error("Enhance-prompt error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Enhancement failed" },
      { status: 500 },
    );
  }
}
