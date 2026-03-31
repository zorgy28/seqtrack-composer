export const maxDuration = 30;

/**
 * Proxy endpoint to list available local models (LM Studio or Ollama).
 * Query params:
 *   - url: base URL of the server (default: http://localhost:1234/v1)
 *   - type: "lmstudio" | "ollama" | "zai" (default: "lmstudio")
 *   - apiKey: API key for authenticated endpoints (Z.AI)
 *
 * Returns { models: [{ id: string }], reachable: boolean }
 */
export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const baseUrl = reqUrl.searchParams.get("url") || "http://localhost:1234/v1";
  const type = reqUrl.searchParams.get("type") || "lmstudio";
  // Read API key from header instead of query params (security: query params are logged/cached)
  const apiKey = request.headers.get("x-api-key") || "";

  try {
    if (type === "zai") {
      const res = await fetch(`${baseUrl}/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return Response.json({ models: [], reachable: false });
      const data = await res.json();
      const models = (data.data ?? []).map((m: { id: string }) => ({ id: m.id }));
      return Response.json({ models, reachable: true });
    }

    if (type === "ollama") {
      // Ollama uses /api/tags endpoint
      const ollamaBase = baseUrl.replace(/\/v1\/?$/, "");
      const res = await fetch(`${ollamaBase}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return Response.json({ models: [], reachable: false });
      }

      const data = await res.json();
      const models = (data.models ?? []).map((m: { name: string }) => ({ id: m.name }));
      return Response.json({ models, reachable: true });
    }

    // LM Studio uses OpenAI-compatible /models endpoint
    const res = await fetch(`${baseUrl}/models`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return Response.json({ models: [], reachable: false });
    }

    const data = await res.json();
    const models = (data.data ?? []).map((m: { id: string }) => ({ id: m.id }));
    return Response.json({ models, reachable: true });
  } catch {
    return Response.json({ models: [], reachable: false });
  }
}
