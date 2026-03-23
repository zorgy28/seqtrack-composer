"""
SeqTrack Composer — ML Microservice

FastAPI application for audio transcription: stem separation, MIDI
transcription, drum classification, and audio analysis.

Runs on port 8100 with CORS enabled for localhost:3000 (Next.js dev).
"""

from __future__ import annotations

import logging
import os
import shutil
import threading
import time
import uuid
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transcribe import run_pipeline, set_jobs_store

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TEMP_DIR = "/tmp/seqtrack-ml"
CLEANUP_INTERVAL_SECONDS = 300  # Check every 5 minutes
JOB_TTL_SECONDS = 1800  # 30 minutes

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SeqTrack ML Service",
    description="Audio transcription microservice for SeqTrack Composer",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------
jobs: dict[str, dict[str, Any]] = {}
set_jobs_store(jobs)


class UrlRequest(BaseModel):
    url: str


# ---------------------------------------------------------------------------
# Background cleanup thread
# ---------------------------------------------------------------------------

def _cleanup_loop() -> None:
    """Periodically remove expired jobs and their temp files."""
    while True:
        time.sleep(CLEANUP_INTERVAL_SECONDS)
        now = time.time()
        expired = [
            jid
            for jid, job in jobs.items()
            if now - job.get("created_at", now) > JOB_TTL_SECONDS
        ]
        for jid in expired:
            job = jobs.pop(jid, None)
            if job:
                work_dir = job.get("work_dir")
                if work_dir and os.path.isdir(work_dir):
                    try:
                        shutil.rmtree(work_dir)
                        logger.info("Cleaned up expired job %s", jid)
                    except OSError as exc:
                        logger.warning("Failed to clean up %s: %s", work_dir, exc)


_cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
_cleanup_thread.start()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_job() -> tuple[str, str]:
    """Create a new job with a unique ID and working directory."""
    job_id = uuid.uuid4().hex[:12]
    work_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(work_dir, exist_ok=True)

    jobs[job_id] = {
        "stage": "pending",
        "progress": 0,
        "result": None,
        "error": None,
        "created_at": time.time(),
        "work_dir": work_dir,
    }
    return job_id, work_dir


def _start_pipeline(job_id: str, work_dir: str, **kwargs: Any) -> None:
    """Launch the transcription pipeline in a background thread."""
    thread = threading.Thread(
        target=run_pipeline,
        kwargs={"job_id": job_id, "work_dir": work_dir, **kwargs},
        daemon=True,
    )
    thread.start()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "seqtrack-ml"}


@app.post("/transcribe")
async def transcribe_upload(file: UploadFile = File(None)):
    """Start a transcription job from an uploaded audio file.

    Accepts a multipart file upload. Returns a job ID for polling.
    """
    if file is None or file.filename is None:
        raise HTTPException(status_code=400, detail="No file uploaded. Use multipart form with 'file' field, or POST JSON with 'url'.")

    job_id, work_dir = _create_job()

    # Save uploaded file
    ext = os.path.splitext(file.filename)[1] or ".wav"
    saved_path = os.path.join(work_dir, f"upload{ext}")

    try:
        contents = await file.read()
        with open(saved_path, "wb") as f:
            f.write(contents)
    except Exception as exc:
        jobs.pop(job_id, None)
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {exc}")

    logger.info("Job %s: file upload saved to %s", job_id, saved_path)
    _start_pipeline(job_id, work_dir, file_path=saved_path)

    return {"job_id": job_id}


@app.post("/transcribe/url")
async def transcribe_url(body: UrlRequest):
    """Start a transcription job from a YouTube/SoundCloud URL.

    Accepts JSON ``{"url": "..."}``. Returns a job ID for polling.
    """
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    job_id, work_dir = _create_job()
    logger.info("Job %s: URL transcription for %s", job_id, url)
    _start_pipeline(job_id, work_dir, url=url)

    return {"job_id": job_id}


@app.get("/status/{job_id}")
async def job_status(job_id: str):
    """Poll job progress.

    Returns stage, progress percentage, and result (when done).
    """
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    response: dict[str, Any] = {
        "job_id": job_id,
        "stage": job["stage"],
        "progress": job["progress"],
        "result": job.get("result"),
    }

    if job["stage"] == "error":
        response["error"] = job.get("error", "Unknown error")

    return response
