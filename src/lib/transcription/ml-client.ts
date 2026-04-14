import type { MLServiceStatus } from "./types";

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:8200";

/** Default timeout for HTTP requests (30 seconds). */
const REQUEST_TIMEOUT_MS = 30_000;

/** Upload timeout — file uploads may take longer (120 seconds). */
const UPLOAD_TIMEOUT_MS = 120_000;

// ---- Helpers --------------------------------------------------------

function abortAfter(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(
      `ML service ${context} failed (${res.status}): ${body}`,
    );
  }
}

// ---- Public API -----------------------------------------------------

/**
 * Start a transcription job on the ML service.
 *
 * Accepts either a `File` (multipart upload) or a `url` string (JSON body).
 * Returns the `jobId` used to poll for status.
 */
export async function startMLTranscription(input: {
  file?: File;
  url?: string;
}): Promise<{ jobId: string }> {
  if (!input.file && !input.url) {
    throw new Error("startMLTranscription requires either a file or a url");
  }

  let res: Response;

  if (input.file) {
    const form = new FormData();
    form.append("file", input.file);

    res = await fetch(`${ML_SERVICE_URL}/transcribe`, {
      method: "POST",
      body: form,
      signal: abortAfter(UPLOAD_TIMEOUT_MS),
    });
  } else {
    res = await fetch(`${ML_SERVICE_URL}/transcribe/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.url }),
      signal: abortAfter(REQUEST_TIMEOUT_MS),
    });
  }

  await assertOk(res, "POST /transcribe");

  const data = (await res.json()) as { jobId?: string; job_id?: string };
  const jobId = data.jobId ?? data.job_id;

  if (!jobId) {
    throw new Error("ML service did not return a jobId");
  }

  return { jobId };
}

/**
 * Poll the ML service for the current status of a transcription job.
 */
export async function pollMLStatus(jobId: string): Promise<MLServiceStatus> {
  const res = await fetch(`${ML_SERVICE_URL}/status/${jobId}`, {
    signal: abortAfter(REQUEST_TIMEOUT_MS),
  });

  await assertOk(res, `GET /status/${jobId}`);

  return (await res.json()) as MLServiceStatus;
}

/**
 * Check whether the ML service is reachable and healthy.
 * Returns `true` if the service responds with a 2xx, `false` otherwise.
 */
export async function checkMLHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: abortAfter(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
