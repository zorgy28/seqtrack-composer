export const maxDuration = 60;

import { getModelWithOverride, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { enhancedPromptSchema, buildEnhancerSystemPrompt, buildEnhancerUserPrompt } from "@/lib/ai/prompt-enhancer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, bpm, scaleRoot, scaleName, bars, modelProvider, modelId } = body;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const output = await generateWithFallback({
      model: getModelWithOverride(modelProvider, modelId),
      schema: enhancedPromptSchema,
      system: buildEnhancerSystemPrompt(),
      prompt: buildEnhancerUserPrompt({ prompt, bpm, scaleRoot, scaleName, bars }),
      supportsStructuredOutput: supportsStructuredOutput(modelProvider),
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
