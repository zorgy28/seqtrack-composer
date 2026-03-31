import type { LanguageModel } from "ai";
import type { ProviderConfig } from "@/lib/settings";

// Custom fetch with 5-minute timeout for local LLMs (they can be slow)
const lmStudioFetch: typeof fetch = (url, init) => {
  return fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(300_000), // 5 minutes
  });
};

const ollamaFetch: typeof fetch = (url, init) => {
  return fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(300_000), // 5 minutes
  });
};

/**
 * Create an AI SDK LanguageModel from a ProviderConfig sent by the client.
 * All API keys and URLs come from the config — no process.env reads.
 */
export async function getModelFromConfig(config: ProviderConfig): Promise<LanguageModel> {
  const provider = config.provider || "claude";

  if (provider === "claude") {
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    const anthropic = createAnthropic({ apiKey: config.apiKey || undefined });
    return anthropic(config.modelId || "claude-sonnet-4-6");
  }

  if (provider === "gemini") {
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey || undefined });
    return google(config.modelId || "gemini-2.5-flash");
  }

  if (provider === "openrouter") {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const openrouter = createOpenRouter({ apiKey: config.apiKey || "" });
    return openrouter(config.modelId || "anthropic/claude-sonnet-4.5");
  }

  if (provider === "lm-studio") {
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: config.baseUrl || "http://localhost:1234/v1",
      fetch: lmStudioFetch,
    });
    return lmstudio(config.modelId || "");
  }

  if (provider === "ollama") {
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const ollama = createOpenAICompatible({
      name: "ollama",
      baseURL: (config.baseUrl || "http://localhost:11434") + "/v1",
      fetch: ollamaFetch,
    });
    return ollama(config.modelId || "");
  }

  if (provider === "zai") {
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const zai = createOpenAICompatible({
      name: "zai",
      baseURL: config.baseUrl || "https://api.z.ai/api/coding/paas/v4",
      headers: { Authorization: `Bearer ${config.apiKey || ""}` },
    });
    return zai(config.modelId || "glm-4.7");
  }

  // Fallback: Claude with no explicit key (will use ANTHROPIC_API_KEY env if set)
  const { createAnthropic } = await import("@ai-sdk/anthropic");
  const anthropic = createAnthropic({ apiKey: config.apiKey || undefined });
  return anthropic(config.modelId || "claude-sonnet-4-6");
}

/** Whether the given provider natively supports Zod structured output */
export function supportsStructuredOutput(provider?: string, modelId?: string): boolean {
  if (!provider) return true;
  if (provider === "claude" || provider === "gemini") return true;
  // OpenRouter proxying Claude/Gemini models supports structured output
  if (provider === "openrouter" && modelId) {
    return modelId.startsWith("anthropic/") || modelId.startsWith("google/");
  }
  return false;
}

