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
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Parallel / serial stem transcription helpers
# ---------------------------------------------------------------------------

def _transcribe_single_stem_timed(stem_name: str, audio_path: str) -> tuple[str, list[dict[str, Any]], float]:
    """Transcribe a single stem and return (name, events, elapsed_seconds)."""
    from midi_transcribe import transcribe_stem
    start = time.monotonic()
    try:
        events = transcribe_stem(audio_path)
    except Exception as exc:
        logger.error("[transcribe] stem %s failed: %s", stem_name, exc)
        events = []
    elapsed = time.monotonic() - start
    logger.info("[transcribe] stem %s took %.2fs (%d events)", stem_name, elapsed, len(events))
    return stem_name, events, elapsed


def transcribe_stems_parallel(
    stems: dict[str, str],
    max_workers: int = 6,
) -> dict[str, list[dict[str, Any]]]:
    """Transcribe all stems in parallel via ThreadPoolExecutor.

    Basic Pitch's TFLite interpreter is not thread-safe, so the actual
    predict() call is serialized via _BASIC_PITCH_LOCK in midi_transcribe.
    The parallelism wins come from audio I/O + postprocessing overlap.
    Realistic speedup: ~1.4-1.6x across 6 stems.
    """
    results: dict[str, list[dict[str, Any]]] = {}
    total_start = time.monotonic()

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_name = {
            executor.submit(_transcribe_single_stem_timed, name, path): name
            for name, path in stems.items()
        }
        for future in as_completed(future_to_name):
            try:
                name, events, _ = future.result()
                results[name] = events
            except Exception as exc:
                name = future_to_name[future]
                logger.error("[transcribe] stem %s raised: %s", name, exc)
                results[name] = []

    total = time.monotonic() - total_start
    logger.info("[transcribe] parallel total %.2fs for %d stems", total, len(stems))
    return results


def transcribe_stems_serial(
    stems: dict[str, str],
) -> dict[str, list[dict[str, Any]]]:
    """Serial fallback for transcription (set SEQTRACK_TRANSCRIBE_SERIAL=1)."""
    results: dict[str, list[dict[str, Any]]] = {}
    total_start = time.monotonic()
    for name, path in stems.items():
        _, events, _ = _transcribe_single_stem_timed(name, path)
        results[name] = events
    total = time.monotonic() - total_start
    logger.info("[transcribe] serial total %.2fs for %d stems", total, len(stems))
    return results

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
        # Stage 3: MIDI transcription (parallel across stems by default)
        # ---------------------------------------------------------------
        _update(job_id, stage="transcribing", progress=45)

        from drum_classify import classify_drums

        # Build dict of stem_name -> path for the ALL stems we want to transcribe
        stems_to_transcribe: dict[str, str] = {}
        for stem_name in ["drums", "bass", "vocals", "other", "guitar", "piano"]:
            if stem_name in stem_paths:
                stems_to_transcribe[stem_name] = stem_paths[stem_name]

        # Pick runner based on env var (serial fallback for debugging)
        use_serial = os.environ.get("SEQTRACK_TRANSCRIBE_SERIAL", "").lower() in ("1", "true", "yes")
        runner = transcribe_stems_serial if use_serial else transcribe_stems_parallel
        logger.info("[transcribe] using %s runner for %d stems", "serial" if use_serial else "parallel", len(stems_to_transcribe))

        raw_stem_events = runner(stems_to_transcribe)

        midi_events: dict[str, Any] = {}

        # Classify drums into SEQTRAK channels 1-7
        if "drums" in raw_stem_events:
            drum_notes = raw_stem_events["drums"]
            midi_events["drums"] = {
                str(ch): events for ch, events in classify_drums(drum_notes).items()
            }

        # Melodic stems: pass through as-is (all 5 non-drum stems from htdemucs_6s)
        for stem_name in ["bass", "vocals", "other", "guitar", "piano"]:
            midi_events[stem_name] = raw_stem_events.get(stem_name, [])

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
