import { getModelWithOverride, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { enhanceResultSchema, type EnhanceAction } from "@/lib/ai/enhance-schema";
import { buildEnhanceSystemPrompt, buildEnhanceUserPrompt } from "@/lib/ai/enhance-prompts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project, instruction, action, modelProvider, modelId } = body;

    if (!project || !instruction || !action) {
      return Response.json(
        { error: "project, instruction, and action are required" },
        { status: 400 },
      );
    }

    console.log(
      `[enhance] action=${action} provider=${modelProvider ?? "claude"} instruction="${instruction.slice(0, 50)}"`,
    );

    const output = await generateWithFallback({
      model: getModelWithOverride(modelProvider, modelId),
      schema: enhanceResultSchema,
      system: buildEnhanceSystemPrompt(action as EnhanceAction),
      prompt: buildEnhanceUserPrompt(project, instruction, action as EnhanceAction),
      supportsStructuredOutput: supportsStructuredOutput(modelProvider),
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
