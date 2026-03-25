/**
 * Proxy endpoint to list available OpenRouter models.
 * Uses OPENROUTER_API_KEY from env, or falls back to the key
 * stored in settings passed via query param (for client-side keys).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientKey = searchParams.get("key") || "";
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

    // Filter to text/chat models, exclude embeddings
    const models = (data.data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.id && !m.id.includes(":embed") && !m.id.includes("/embed"))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({
        id: m.id as string,
        name: (m.name || m.id) as string,
        contextLength: (m.context_length ?? 0) as number,
        isFree: (m.id as string).endsWith(":free"),
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.id.localeCompare(b.id));

    return Response.json({ models });
  } catch {
    return Response.json({ models: [] });
  }
}
