import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getSettings } from "@/lib/settings";

export type LLMProvider = "claude" | "gemini" | "openrouter" | "lmstudio";

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
 * Return the configured AI SDK model based on settings store.
 */
export function getModel(): LanguageModel {
  const settings = getSettings();
  const provider = settings.llmProvider;

  if (provider === "claude") {
    return anthropic(settings.claudeModel || "claude-sonnet-4-6");
  }

  if (provider === "gemini") {
    return google(settings.geminiModel || "gemini-2.5-flash");
    // Note: @ai-sdk/google reads GOOGLE_GENERATIVE_AI_API_KEY from env
    // or we can pass apiKey in settings
  }

  if (provider === "openrouter") {
    const openrouter = createOpenRouter({
      apiKey: settings.openrouterApiKey || process.env.OPENROUTER_API_KEY || "",
    });
    return openrouter(settings.openrouterModel || "anthropic/claude-sonnet-4.5");
  }

  if (provider === "lm-studio") {
    return createLMStudioProvider()(settings.lmStudioModel || "minimax/minimax-m2.5");
  }

  return anthropic("claude-sonnet-4-6");
}

/**
 * Get a model with runtime override (from request body).
 */
export function getModelWithOverride(
  provider?: string,
  modelId?: string,
): LanguageModel {
  const settings = getSettings();
  const effectiveProvider = provider || settings.llmProvider;

  if (effectiveProvider === "claude" && modelId) {
    return anthropic(modelId);
  }

  if (effectiveProvider === "gemini" && modelId) {
    return google(modelId);
  }

  if (effectiveProvider === "openrouter" && modelId) {
    const openrouter = createOpenRouter({
      apiKey: settings.openrouterApiKey || process.env.OPENROUTER_API_KEY || "",
    });
    return openrouter(modelId);
  }

  if (effectiveProvider === "lm-studio" && modelId) {
    return createLMStudioProvider()(modelId);
  }

  return getModel();
}

/** Whether the given provider natively supports Zod structured output */
export function supportsStructuredOutput(provider?: string): boolean {
  const p = provider || getSettings().llmProvider;
  // Claude, Gemini, and most OpenRouter models support structured output
  return p === "claude" || p === "gemini";
  // OpenRouter and LM Studio use the JSON fallback
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
