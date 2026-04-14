export const maxDuration = 30;

/**
 * Proxy endpoint to list available local models (LM Studio or Ollama).
 * Query params:
 *   - url: base URL of the server (e.g. http://localhost:1234 or http://localhost:1234/v1)
 *   - type: "lmstudio" | "ollama" | "zai" (default: "lmstudio")
 * Headers:
 *   - x-api-key: API key for authenticated endpoints (LM Studio, Z.AI)
 *
 * Returns { models: [{ id, displayName?, params?, loaded?, vision?, toolUse? }], reachable: boolean }
 */
export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const type = reqUrl.searchParams.get("type") || "lmstudio";
  const envLmUrl = process.env.LM_STUDIO_URL?.replace(/\/v1\/?$/, "").replace(/\/$/, "");
  const rawUrl = reqUrl.searchParams.get("url")
    || (type === "lmstudio" ? (envLmUrl || "http://192.168.1.125:1235") : "http://localhost:1234");
  const apiKey = request.headers.get("x-api-key")
    || (type === "lmstudio" ? (process.env.LM_STUDIO_API_KEY || "") : "");

  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    if (type === "zai") {
      const res = await fetch(`${rawUrl}/models`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return Response.json({ models: [], reachable: false });
      const data = await res.json();
      const models = (data.data ?? []).map((m: { id: string }) => ({ id: m.id }));
      return Response.json({ models, reachable: true });
    }

    if (type === "ollama") {
      const ollamaBase = rawUrl.replace(/\/v1\/?$/, "");
      const res = await fetch(`${ollamaBase}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return Response.json({ models: [], reachable: false });
      const data = await res.json();
      const models = (data.models ?? []).map((m: { name: string }) => ({ id: m.name }));
      return Response.json({ models, reachable: true });
    }

    // LM Studio: prefer native /api/v1/models (returns ALL downloaded models with metadata),
    // fall back to OpenAI-compat /v1/models (only returns loaded models).
    const base = rawUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");

    // Try native LM Studio v1 API first — returns all downloaded models
    try {
      const res = await fetch(`${base}/api/v1/models`, { headers, signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        type LMModel = {
          key: string;
          display_name?: string;
          params_string?: string;
          loaded_instances?: unknown[];
          capabilities?: { vision?: boolean; trained_for_tool_use?: boolean };
        };
        const models = (data.models ?? []).map((m: LMModel) => ({
          id: m.key,
          displayName: m.display_name,
          params: m.params_string,
          loaded: (m.loaded_instances?.length ?? 0) > 0,
          vision: m.capabilities?.vision,
          toolUse: m.capabilities?.trained_for_tool_use,
        }));
        return Response.json({ models, reachable: true });
      }
    } catch { /* fall through */ }

    // Fallback: OpenAI-compatible /v1/models (loaded models only)
    try {
      const res = await fetch(`${base}/v1/models`, { headers, signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data ?? []).map((m: { id: string }) => ({ id: m.id }));
        return Response.json({ models, reachable: true });
      }
    } catch { /* fall through */ }

    return Response.json({ models: [], reachable: false });
  } catch {
    return Response.json({ models: [], reachable: false });
  }
}
