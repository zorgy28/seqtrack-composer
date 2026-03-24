import { getModelWithOverride, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { compositionResultSchema } from "@/lib/ai/schema";
import { buildCompositionSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, bpm, scaleRoot, scaleName, bars, swing,
            modelProvider, modelId,
            previousResult, refinementInstruction } = body;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    console.log(`[compose] provider=${modelProvider ?? "claude"} bars=${bars ?? 1} refine=${!!previousResult}`);

    const output = await generateWithFallback({
      model: getModelWithOverride(modelProvider, modelId),
      schema: compositionResultSchema,
      system: buildCompositionSystemPrompt(),
      prompt: buildUserPrompt({ prompt, bpm, scaleRoot, scaleName, bars, swing,
                                previousResult, refinementInstruction }),
      supportsStructuredOutput: supportsStructuredOutput(modelProvider),
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
