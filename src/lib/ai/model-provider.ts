import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type LLMProvider = "claude" | "lmstudio";

/**
 * Return the configured AI SDK model based on environment variables.
 * LLM_PROVIDER: "claude" (default) | "lmstudio"
 */
export function getModel(): LanguageModel {
  const provider = process.env.LLM_PROVIDER || "claude";

  if (provider === "lmstudio") {
    const lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: process.env.LM_STUDIO_URL || "http://169.254.48.100:1235/v1",
      headers: {
        Authorization: `Bearer ${process.env.LM_STUDIO_API_KEY || ""}`,
      },
    });
    return lmstudio(process.env.LM_STUDIO_MODEL || "minimax/minimax-m2.5");
  }

  return anthropic("claude-sonnet-4-20250514");
}

/**
 * Get a model with runtime override (from request body).
 * Falls back to env-based config if no override provided.
 */
export function getModelWithOverride(
  provider?: string,
  modelId?: string,
): LanguageModel {
  const effectiveProvider = provider || process.env.LLM_PROVIDER || "claude";

  if (effectiveProvider === "lmstudio" && modelId) {
    const lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: process.env.LM_STUDIO_URL || "http://169.254.48.100:1235/v1",
      headers: {
        Authorization: `Bearer ${process.env.LM_STUDIO_API_KEY || ""}`,
      },
    });
    return lmstudio(modelId);
  }

  return getModel();
}

/** Whether the given provider natively supports Zod structured output */
export function supportsStructuredOutput(provider?: string): boolean {
  const p = provider || process.env.LLM_PROVIDER || "claude";
  return p === "claude";
}
