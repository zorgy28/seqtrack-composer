export const maxDuration = 300; // 5 minutes for local LLM

import { getModelWithOverride, supportsStructuredOutput } from "@/lib/ai/model-provider";
import { generateWithFallback } from "@/lib/ai/json-fallback";
import { transcriptionResultSchema } from "@/lib/ai/transcription-schema";
import {
  getTranscriptionSystemPrompt,
  buildTranscriptionPrompt,
} from "@/lib/ai/transcription-prompts";
import {
  startMLTranscription,
} from "@/lib/transcription/ml-client";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    // ---- File upload → forward to ML service ----
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return Response.json(
          { error: "No file provided in form data" },
          { status: 400 },
        );
      }

      const { jobId } = await startMLTranscription({ file });
      return Response.json({ jobId });
    }

    // ---- JSON body ----
    const body = await request.json();

    // URL submission → forward to ML service
    if (body.url) {
      if (typeof body.url !== "string") {
        return Response.json(
          { error: "url must be a string" },
          { status: 400 },
        );
      }

      const { jobId } = await startMLTranscription({ url: body.url });
      return Response.json({ jobId });
    }

    // Claude refinement step
    if (body.action === "refine") {
      const { midiEvents, analysis, enabledStems, bars, midiAnalysis, modelProvider, modelId } = body;

      if (!midiEvents || !analysis || !enabledStems) {
        return Response.json(
          { error: "refine action requires midiEvents, analysis, and enabledStems" },
          { status: 400 },
        );
      }

      console.log(`[transcribe/refine] provider=${modelProvider ?? "claude"} model=${modelId ?? "default"} bars=${bars ?? 4}`);

      const output = await generateWithFallback({
        model: getModelWithOverride(modelProvider, modelId),
        schema: transcriptionResultSchema,
        system: getTranscriptionSystemPrompt(),
        prompt: buildTranscriptionPrompt({
          midiEvents,
          analysis,
          enabledStems,
          bars: bars ?? 4,
          midiAnalysis,
        }),
        supportsStructuredOutput: supportsStructuredOutput(modelProvider),
      });

      return Response.json(output);
    }

    return Response.json(
      { error: "Invalid request: provide a file, url, or action" },
      { status: 400 },
    );
  } catch (err) {
    console.error("Transcription API error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 },
    );
  }
}
