import { getModel, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { compositionResultSchema } from "@/lib/ai/schema";
import { COMPOSITION_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, bpm, scaleRoot, scaleName, bars } = body;

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    const output = await generateWithFallback({
      model: getModel(),
      schema: compositionResultSchema,
      system: COMPOSITION_SYSTEM_PROMPT,
      prompt: buildUserPrompt({ prompt, bpm, scaleRoot, scaleName, bars }),
      supportsStructuredOutput: supportsStructuredOutput(),
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
