"""
BPM and key detection using librosa.

Uses tempo estimation and chroma-based key detection
(Krumhansl-Schmuckler algorithm) to analyze audio files.
"""

from __future__ import annotations

import logging

import librosa
import numpy as np

logger = logging.getLogger(__name__)

# Krumhansl-Schmuckler key profiles
# Major and minor profiles for correlation-based key detection
_MAJOR_PROFILE = np.array(
    [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
)
_MINOR_PROFILE = np.array(
    [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
)

_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def _detect_key(y: np.ndarray, sr: int) -> str:
    """Detect musical key using chroma features and Krumhansl-Schmuckler algorithm.

    Computes the mean chroma energy across the entire signal, then correlates
    against major and minor key profiles rotated to every pitch class. The
    rotation with the highest correlation wins.

    Returns:
        Key string like "C major" or "A minor".
    """
    # Compute chroma with CQT for better frequency resolution
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    # Average chroma energy across time
    chroma_mean = np.mean(chroma, axis=1)

    if np.max(chroma_mean) < 1e-8:
        logger.warning("Audio has negligible chroma energy; defaulting to C major")
        return "C major"

    best_corr = -np.inf
    best_key = "C major"

    for shift in range(12):
        # Rotate profile to test each pitch class as tonic
        major_rotated = np.roll(_MAJOR_PROFILE, shift)
        minor_rotated = np.roll(_MINOR_PROFILE, shift)

        corr_major = float(np.corrcoef(chroma_mean, major_rotated)[0, 1])
        corr_minor = float(np.corrcoef(chroma_mean, minor_rotated)[0, 1])

        if corr_major > best_corr:
            best_corr = corr_major
            best_key = f"{_NOTE_NAMES[shift]} major"

        if corr_minor > best_corr:
            best_corr = corr_minor
            best_key = f"{_NOTE_NAMES[shift]} minor"

    return best_key


def _detect_bpm(y: np.ndarray, sr: int) -> float:
    """Detect BPM using librosa's beat tracker.

    Returns the estimated tempo rounded to one decimal place.
    """
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    # librosa may return an array; take the first element
    bpm = float(np.atleast_1d(tempo)[0])
    return round(bpm, 1)


def analyze(audio_path: str) -> dict:
    """Analyze an audio file for BPM, key, and duration.

    Args:
        audio_path: Path to a WAV or other audio file readable by librosa.

    Returns:
        Dictionary with keys ``bpm`` (float), ``key`` (str), ``duration`` (float seconds).

    Raises:
        FileNotFoundError: If *audio_path* does not exist.
        Exception: On any librosa processing error.
    """
    logger.info("Analyzing audio: %s", audio_path)

    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))

    bpm = _detect_bpm(y, sr)
    key = _detect_key(y, sr)

    logger.info("Analysis complete — BPM: %.1f, Key: %s, Duration: %.1fs", bpm, key, duration)

    return {
        "bpm": bpm,
        "key": key,
        "duration": round(duration, 1),
    }
