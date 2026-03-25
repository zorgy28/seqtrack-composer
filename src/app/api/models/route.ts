export const maxDuration = 30;

/**
 * Proxy endpoint to list available LM Studio models.
 * Returns { models: [{ id: string }], reachable: boolean }
 * - reachable: false → server not running / network error
 * - reachable: true, models: [] → server running but no model loaded
 */
export async function GET() {
  const lmUrl = process.env.LM_STUDIO_URL || "http://169.254.48.100:1235/v1";
  const lmKey = process.env.LM_STUDIO_API_KEY || "";

  try {
    const res = await fetch(`${lmUrl}/models`, {
      headers: lmKey ? { Authorization: `Bearer ${lmKey}` } : {},
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
