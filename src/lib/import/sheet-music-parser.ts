import type { ImportResult } from "./types";
import { getSettings, buildProviderConfig, buildDoclingConfig } from "@/lib/settings";

/**
 * Parse sheet music from PDF, image, or MusicXML files.
 * Sends to server-side API for Docling extraction and/or AI vision transcription.
 */
export async function parseSheetMusic(
  file: File,
  options?: {
    instrument?: string;
    targetChannel?: number;
  },
): Promise<ImportResult> {
  const settings = getSettings();
  const pc = buildProviderConfig(settings);
  const dc = buildDoclingConfig(settings);

  const formData = new FormData();
  formData.append("file", file);
  if (options?.instrument) formData.append("instrument", options.instrument);
  if (options?.targetChannel)
    formData.append("targetChannel", String(options.targetChannel));
  formData.append("provider", pc.provider);
  if (pc.modelId) formData.append("modelId", pc.modelId);
  if (pc.apiKey) formData.append("apiKey", pc.apiKey);
  if (pc.baseUrl) formData.append("baseUrl", pc.baseUrl);
  if (dc.url) formData.append("doclingUrl", dc.url);
  if (dc.apiKey) formData.append("doclingApiKey", dc.apiKey);

  const res = await fetch("/api/import-sheet", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sheet music import failed: ${text}`);
  }

  return res.json() as Promise<ImportResult>;
}
