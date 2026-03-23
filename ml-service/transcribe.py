"""
Pipeline orchestrator for audio-to-MIDI transcription.

Coordinates the full pipeline:
  1. Audio extraction (yt-dlp for URLs, or use uploaded file)
  2. Stem separation (Demucs htdemucs_6s — 6 stems)
  3. MIDI transcription (Basic Pitch)
  4. Drum classification (SEQTRAK channels 1-7)
  5. Audio analysis (BPM + key detection)
  6. MIDI analysis via LM Studio (chord/structure/genre detection)

Updates job status at each stage so the frontend can poll progress.
"""

from __future__ import annotations

import logging
import os
import subprocess
import traceback
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Job state — shared dict reference passed from main.py
# ---------------------------------------------------------------------------
_jobs: dict[str, dict[str, Any]] = {}


def set_jobs_store(jobs: dict[str, dict[str, Any]]) -> None:
    """Inject the shared jobs dictionary from the FastAPI app."""
    global _jobs
    _jobs = jobs


def _update(job_id: str, **kwargs: Any) -> None:
    """Update fields on a job record."""
    if job_id in _jobs:
        _jobs[job_id].update(kwargs)


# ---------------------------------------------------------------------------
# Step 1 — Audio extraction via yt-dlp
# ---------------------------------------------------------------------------

def _extract_audio(url: str, output_dir: str) -> str:
    """Download audio from a URL using yt-dlp and convert to WAV.

    Returns:
        Path to the extracted WAV file.

    Raises:
        RuntimeError: If yt-dlp fails.
    """
    output_template = os.path.join(output_dir, "source.%(ext)s")
    output_wav = os.path.join(output_dir, "source.wav")

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--extract-audio",
        "--audio-format", "wav",
        "--audio-quality", "0",
        "--output", output_template,
        "--no-cache-dir",
        "--quiet",
        url,
    ]

    logger.info("Extracting audio from URL: %s", url)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    if result.returncode != 0:
        raise RuntimeError(
            f"yt-dlp failed (exit {result.returncode}): {result.stderr.strip()}"
        )

    # yt-dlp may produce the file with a slightly different name; find it
    if os.path.exists(output_wav):
        return output_wav

    # Look for any WAV file in the output directory
    for f in os.listdir(output_dir):
        if f.endswith(".wav"):
            return os.path.join(output_dir, f)

    raise RuntimeError("yt-dlp completed but no WAV file was produced")


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_pipeline(
    job_id: str,
    work_dir: str,
    file_path: str | None = None,
    url: str | None = None,
) -> None:
    """Execute the full transcription pipeline for a job.

    Exactly one of *file_path* or *url* must be provided.  Progress
    updates are written to the shared jobs dict so the ``/status``
    endpoint can report them.

    This function is designed to run in a background thread.
    """
    try:
        # ---------------------------------------------------------------
        # Stage 1: Obtain audio
        # ---------------------------------------------------------------
        _update(job_id, stage="extracting", progress=5)

        if url:
            audio_path = _extract_audio(url, work_dir)
        elif file_path:
            audio_path = file_path
        else:
            raise ValueError("Either file_path or url must be provided")

        _update(job_id, progress=10)

        # ---------------------------------------------------------------
        # Stage 2: Stem separation (htdemucs_6s — 6 stems)
        # ---------------------------------------------------------------
        _update(job_id, stage="separating", progress=15)

        from stems import separate

        stems_dir = os.path.join(work_dir, "stems")
        stem_paths = separate(audio_path, output_dir=stems_dir)
        _update(job_id, progress=40)

        # ---------------------------------------------------------------
        # Stage 3: MIDI transcription
        # ---------------------------------------------------------------
        _update(job_id, stage="transcribing", progress=45)

        from midi_transcribe import transcribe_stem
        from drum_classify import classify_drums

        midi_events: dict[str, Any] = {}

        # Transcribe drums and classify into SEQTRAK channels
        if "drums" in stem_paths:
            drum_notes = transcribe_stem(stem_paths["drums"])
            midi_events["drums"] = classify_drums(drum_notes)
            # Convert channel keys to strings for JSON serialization
            midi_events["drums"] = {
                str(ch): events for ch, events in midi_events["drums"].items()
            }
        _update(job_id, progress=55)

        # Transcribe melodic stems (all 5 non-drum stems from htdemucs_6s)
        for stem_name in ["bass", "vocals", "other", "guitar", "piano"]:
            if stem_name in stem_paths:
                midi_events[stem_name] = transcribe_stem(stem_paths[stem_name])
            else:
                midi_events[stem_name] = []
        _update(job_id, progress=70)

        # ---------------------------------------------------------------
        # Stage 4: Audio analysis (BPM + key)
        # ---------------------------------------------------------------
        _update(job_id, stage="analyzing", progress=75)

        from audio_analysis import analyze

        analysis = analyze(audio_path)
        _update(job_id, progress=85)

        # ---------------------------------------------------------------
        # Stage 5: MIDI analysis via LM Studio
        # ---------------------------------------------------------------
        _update(job_id, stage="midi_analysis", progress=88)

        from midi_analysis import analyze_midi

        midi_analysis_result = analyze_midi(
            midi_events,
            bpm=analysis.get("bpm", 120.0),
            key=analysis.get("key", "C major"),
        )
        _update(job_id, progress=95)

        # ---------------------------------------------------------------
        # Done
        # ---------------------------------------------------------------
        result = {
            "stems": list(stem_paths.keys()),
            "midi_events": midi_events,
            "analysis": analysis,
            "midi_analysis": midi_analysis_result,
        }

        _update(job_id, stage="done", progress=100, result=result)
        logger.info("Pipeline complete for job %s", job_id)

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("Pipeline failed for job %s: %s", job_id, error_msg)
        logger.debug(traceback.format_exc())
        _update(job_id, stage="error", progress=0, error=error_msg)
