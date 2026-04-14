import type { LanguageModel } from "ai";
import type { ProviderConfig } from "@/lib/settings";

// Custom fetch with 10-minute timeout for local LLMs (large models can be very slow)
const lmStudioFetch: typeof fetch = (url, init) => {
  return fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(600_000), // 10 minutes
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
    const lmApiKey = config.apiKey || process.env.LM_STUDIO_API_KEY || "";
    const lmBaseUrl = config.baseUrl || process.env.LM_STUDIO_URL || "http://192.168.1.125:1235/v1";
    const lmModel = config.modelId || process.env.LM_STUDIO_MODEL || "";

    // Ensure the requested model is loaded in LM Studio before inference.
    // The OpenAI-compat endpoint uses whatever is loaded — it doesn't auto-load.
    // Check first to avoid creating duplicate instances (each load creates a new one).
    if (lmModel) {
      const nativeBase = lmBaseUrl.replace(/\/v1\/?$/, "");
      const authHeaders: Record<string, string> = {};
      if (lmApiKey) authHeaders.Authorization = `Bearer ${lmApiKey}`;
      try {
        // Check if model is already loaded via OpenAI-compat endpoint
        const listRes = await fetch(`${lmBaseUrl}/models`, {
          headers: authHeaders,
          signal: AbortSignal.timeout(5000),
        });
        const listData = listRes.ok ? await listRes.json() : { data: [] };
        const loadedIds = (listData.data ?? []).map((m: { id: string }) => m.id);
        const isLoaded = loadedIds.includes(lmModel);

        if (!isLoaded) {
          console.log(`[lm-studio] Model ${lmModel} not loaded (loaded: ${loadedIds.join(", ")}), loading...`);
          const loadRes = await fetch(`${nativeBase}/api/v1/models/load`, {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ model: lmModel }),
            signal: AbortSignal.timeout(120_000),
          });
          if (loadRes.ok) {
            console.log(`[lm-studio] Model ${lmModel} loaded successfully`);
          } else {
            const err = await loadRes.text().catch(() => "");
            console.warn(`[lm-studio] Model load failed (${loadRes.status}): ${err.slice(0, 200)}`);
          }
        } else {
          console.log(`[lm-studio] Model ${lmModel} already loaded`);
        }
      } catch (e) {
        console.warn(`[lm-studio] Could not check/load model ${lmModel}:`, e instanceof Error ? e.message : e);
      }
    }

    const lmstudio = createOpenAICompatible({
      name: "lmstudio",
      baseURL: lmBaseUrl,
      headers: lmApiKey ? { Authorization: `Bearer ${lmApiKey}` } : {},
      fetch: lmStudioFetch,
    });
    return lmstudio(lmModel);
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

