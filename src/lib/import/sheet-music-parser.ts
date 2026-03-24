import type { ImportResult } from "./types";

/**
 * Parse sheet music from PDF, image, or MusicXML files.
 * Sends to server-side API for Docling extraction and/or AI vision transcription.
 */
export async function parseSheetMusic(
  file: File,
  options?: {
    instrument?: string;
    targetChannel?: number;
    modelProvider?: string;
    modelId?: string;
  },
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.instrument) formData.append("instrument", options.instrument);
  if (options?.targetChannel)
    formData.append("targetChannel", String(options.targetChannel));
  if (options?.modelProvider)
    formData.append("modelProvider", options.modelProvider);
  if (options?.modelId) formData.append("modelId", options.modelId);

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
