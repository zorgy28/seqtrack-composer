import { pollMLStatus } from "@/lib/transcription/ml-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const data = await pollMLStatus(jobId);
    return Response.json(data);
  } catch (err) {
    console.error("Transcription status error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Status check failed" },
      { status: 502 },
    );
  }
}
