import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type LLMProvider = "claude" | "lmstudio";

// Custom fetch with 5-minute timeout for local LLMs (they can be slow)
const lmStudioFetch: typeof fetch = (url, init) => {
  return fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(300_000), // 5 minutes
  });
};

function createLMStudioProvider() {
  return createOpenAICompatible({
    name: "lmstudio",
    baseURL: process.env.LM_STUDIO_URL || "http://169.254.48.100:1235/v1",
    headers: {
      Authorization: `Bearer ${process.env.LM_STUDIO_API_KEY || ""}`,
    },
    fetch: lmStudioFetch,
  });
}

/**
 * Return the configured AI SDK model based on environment variables.
 */
export function getModel(): LanguageModel {
  const provider = process.env.LLM_PROVIDER || "claude";

  if (provider === "lmstudio") {
    return createLMStudioProvider()(process.env.LM_STUDIO_MODEL || "minimax/minimax-m2.5");
  }

  return anthropic("claude-sonnet-4-20250514");
}

/**
 * Get a model with runtime override (from request body).
 */
export function getModelWithOverride(
  provider?: string,
  modelId?: string,
): LanguageModel {
  const effectiveProvider = provider || process.env.LLM_PROVIDER || "claude";

  if (effectiveProvider === "lmstudio" && modelId) {
    return createLMStudioProvider()(modelId);
  }

  return getModel();
}

/** Whether the given provider natively supports Zod structured output */
export function supportsStructuredOutput(provider?: string): boolean {
  const p = provider || process.env.LLM_PROVIDER || "claude";
  return p === "claude";
}

/**
 * Get recommended inference parameters for local LM Studio models.
 * These optimize for structured JSON output quality and speed.
 */
export function getLMStudioInferenceParams(): Record<string, unknown> {
  return {
    temperature: 0.3,        // Lower = more consistent JSON structure
    max_tokens: 8192,        // Enough for full multi-track patterns
    top_p: 0.9,
    repetition_penalty: 1.05, // Prevent repetitive patterns
  };
}
