"""
MIDI transcription via Basic Pitch.

Wraps the Basic Pitch inference API to extract note events from audio
stems.  Each call processes a single audio file and returns a list of
note-event dicts suitable for downstream processing.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def transcribe_stem(audio_path: str, onset_threshold: float = 0.5, frame_threshold: float = 0.3) -> list[dict[str, Any]]:
    """Transcribe a single audio stem to MIDI note events.

    Uses Basic Pitch's ``predict`` function which runs a lightweight
    neural network (TensorFlow Lite) to detect pitched note events.

    Args:
        audio_path: Path to a WAV (or other librosa-compatible) audio file.
        onset_threshold: Minimum onset posterior probability (0-1).
        frame_threshold: Minimum frame posterior probability (0-1).

    Returns:
        Sorted list of note-event dicts::

            [
                {
                    "pitch": 60,          # MIDI note number
                    "start": 0.0,         # onset in seconds
                    "end": 0.25,          # offset in seconds
                    "velocity": 100,      # 1-127
                    "confidence": 0.92,   # average model confidence
                },
                ...
            ]

    Raises:
        FileNotFoundError: If *audio_path* does not exist.
        Exception: On any Basic Pitch processing error.
    """
    # Import lazily — basic_pitch pulls in TensorFlow which is heavy
    from basic_pitch.inference import predict

    logger.info("Transcribing stem: %s", audio_path)

    model_output, midi_data, note_events = predict(
        audio_path,
        onset_threshold=onset_threshold,
        frame_threshold=frame_threshold,
    )

    events: list[dict[str, Any]] = []

    for note in note_events:
        # note_events from basic_pitch: (start_time, end_time, pitch, amplitude, Optional[pitch_bends])
        start_time = float(note[0])
        end_time = float(note[1])
        pitch = int(note[2])
        # note[3] is amplitude (0-1 float); scale to MIDI velocity 1-127
        amplitude = float(note[3])
        velocity = int(np.clip(round(amplitude * 127), 1, 127))
        confidence = min(1.0, amplitude)  # use amplitude as proxy for confidence

        # Skip extremely short events (likely artifacts)
        if end_time - start_time < 0.01:
            continue

        events.append({
            "pitch": pitch,
            "start": round(start_time, 4),
            "end": round(end_time, 4),
            "velocity": velocity,
            "confidence": round(confidence, 3),
        })

    # Sort by start time, then pitch
    events.sort(key=lambda e: (e["start"], e["pitch"]))

    logger.info("Transcribed %d note events from %s", len(events), audio_path)
    return events
