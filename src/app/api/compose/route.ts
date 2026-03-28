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
            previousResult, refinementInstruction } = body;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const config: ProviderConfig = providerConfig ?? { provider: "claude" };

    console.log(`[compose] provider=${config.provider} bars=${bars ?? 1} refine=${!!previousResult}`);

    const output = await generateWithFallback({
      model: await getModelFromConfig(config),
      schema: compositionResultSchema,
      system: buildCompositionSystemPrompt(),
      prompt: buildUserPrompt({ prompt, bpm, scaleRoot, scaleName, bars, swing,
                                previousResult, refinementInstruction }),
      supportsStructuredOutput: supportsStructuredOutput(config.provider),
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
