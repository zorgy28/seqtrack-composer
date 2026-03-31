export const maxDuration = 30;

/**
 * Proxy endpoint to list available OpenRouter models.
 * Uses OPENROUTER_API_KEY from env, or falls back to the key
 * stored in settings passed via query param (for client-side keys).
 */
export async function GET(request: Request) {
  const clientKey =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  const apiKey = clientKey || process.env.OPENROUTER_API_KEY || "";

  if (!apiKey) {
    return Response.json({ models: [] });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return Response.json({ models: [] });

    const data = await res.json();

    interface ORModel { id: string; name?: string; context_length?: number; }

    // Filter to text/chat models, exclude embeddings
    const models = (data.data ?? [])
      .filter((m: ORModel) => m.id && !m.id.includes(":embed") && !m.id.includes("/embed"))
      .map((m: ORModel) => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length ?? 0,
        isFree: m.id.endsWith(":free"),
      }))
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

    return Response.json({ models });
  } catch {
    return Response.json({ models: [] });
  }
}
