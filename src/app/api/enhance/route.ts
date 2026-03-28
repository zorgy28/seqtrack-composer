export const maxDuration = 300; // 5 minutes for local LLM

import { getModelFromConfig, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { enhanceResultSchema, type EnhanceAction } from "@/lib/ai/enhance-schema";
import { buildEnhanceSystemPrompt, buildEnhanceUserPrompt } from "@/lib/ai/enhance-prompts";
import type { ProviderConfig } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { providerConfig, project, instruction, action } = body;

    if (!project || !instruction || !action) {
      return Response.json(
        { error: "project, instruction, and action are required" },
        { status: 400 },
      );
    }

    const config: ProviderConfig = providerConfig ?? { provider: "claude" };

    console.log(
      `[enhance] action=${action} provider=${config.provider} instruction="${instruction.slice(0, 50)}"`,
    );

    const output = await generateWithFallback({
      model: await getModelFromConfig(config),
      schema: enhanceResultSchema,
      system: buildEnhanceSystemPrompt(action as EnhanceAction),
      prompt: buildEnhanceUserPrompt(project, instruction, action as EnhanceAction),
      supportsStructuredOutput: supportsStructuredOutput(config.provider),
    });

    return Response.json(output);
  } catch (err) {
    console.error("Enhance error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Enhancement failed" },
      { status: 500 },
    );
  }
}
