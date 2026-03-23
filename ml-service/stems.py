"""
Demucs v4 stem separation with MPS (Metal) GPU acceleration.

Loads the Demucs HTDemucs model once at module level and provides
a ``separate()`` function that splits an audio file into stems.

Default model is ``htdemucs_6s`` which produces 6 stems:
drums, bass, other, vocals, guitar, piano.

Alternatively, ``"htdemucs_ft"`` can be used for higher quality 4-stem
separation (drums, bass, other, vocals) at the cost of longer processing.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
import torch

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Device selection — prefer MPS (Apple Silicon GPU), fall back to CPU
# ---------------------------------------------------------------------------
if torch.backends.mps.is_available():
    _DEVICE = torch.device("mps")
    logger.info("Using MPS (Metal) GPU for Demucs")
elif torch.cuda.is_available():
    _DEVICE = torch.device("cuda")
    logger.info("Using CUDA GPU for Demucs")
else:
    _DEVICE = torch.device("cpu")
    logger.info("Using CPU for Demucs (no GPU detected)")

# ---------------------------------------------------------------------------
# Singleton model loading
# ---------------------------------------------------------------------------
_models: dict[str, Any] = {}
_STEM_NAMES = ["drums", "bass", "other", "vocals", "guitar", "piano"]


def _load_model(model: str = "htdemucs_6s"):
    """Load a Demucs model once and cache it at module level."""
    if model in _models:
        return _models[model]

    from demucs.pretrained import get_model

    logger.info("Loading Demucs %s model...", model)
    m = get_model(model)
    m.to(_DEVICE)
    # Set model to inference mode
    m.train(False)
    _models[model] = m
    logger.info("Demucs model %s loaded on %s", model, _DEVICE)
    return m


def separate(
    audio_path: str,
    output_dir: str | None = None,
    model: str = "htdemucs_6s",
) -> dict[str, str]:
    """Separate an audio file into stems using Demucs.

    Args:
        audio_path: Path to the input audio file (WAV recommended).
        output_dir: Directory to write stem WAV files. Defaults to a
            ``stems/`` subdirectory next to *audio_path*.
        model: Demucs model name. Defaults to ``"htdemucs_6s"`` (6-stem).
            Use ``"htdemucs_ft"`` for higher quality 4-stem separation.

    Returns:
        Dict mapping stem name to output file path::

            {
                "drums":  "/tmp/seqtrack-ml/.../stems/drums.wav",
                "bass":   "/tmp/seqtrack-ml/.../stems/bass.wav",
                "other":  "/tmp/seqtrack-ml/.../stems/other.wav",
                "vocals": "/tmp/seqtrack-ml/.../stems/vocals.wav",
                "guitar": "/tmp/seqtrack-ml/.../stems/guitar.wav",
                "piano":  "/tmp/seqtrack-ml/.../stems/piano.wav",
            }

    Raises:
        FileNotFoundError: If *audio_path* does not exist.
        RuntimeError: On any Demucs processing error.
    """
    from demucs.apply import apply_model
    import torchaudio

    audio_path_obj = Path(audio_path)
    if not audio_path_obj.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    if output_dir is None:
        output_dir = str(audio_path_obj.parent / "stems")
    os.makedirs(output_dir, exist_ok=True)

    loaded_model = _load_model(model)

    logger.info("Loading audio for separation: %s", audio_path)
    try:
        waveform, sample_rate = torchaudio.load(audio_path)
    except Exception as exc:
        # Fallback: load with soundfile if torchaudio backend fails
        logger.warning("torchaudio.load failed (%s), falling back to soundfile", exc)
        data, sample_rate = sf.read(audio_path, dtype="float32")
        if data.ndim == 1:
            data = data[:, None]  # mono → (samples, 1)
        waveform = torch.from_numpy(data.T)  # (channels, samples)

    # Resample to model's sample rate if needed
    if sample_rate != loaded_model.samplerate:
        logger.info("Resampling from %d to %d Hz", sample_rate, loaded_model.samplerate)
        resampler = torchaudio.transforms.Resample(
            orig_freq=sample_rate, new_freq=loaded_model.samplerate
        )
        waveform = resampler(waveform)

    # Ensure stereo (Demucs expects 2 channels)
    if waveform.shape[0] == 1:
        waveform = waveform.repeat(2, 1)
    elif waveform.shape[0] > 2:
        waveform = waveform[:2, :]

    # Add batch dimension: (channels, samples) -> (1, channels, samples)
    waveform = waveform.unsqueeze(0).to(_DEVICE)

    logger.info("Running Demucs separation on %s...", _DEVICE)
    with torch.no_grad():
        sources = apply_model(loaded_model, waveform, device=_DEVICE)

    # sources shape: (1, num_sources, channels, samples)
    sources = sources.squeeze(0).cpu().numpy()

    # Use the model's own source list to handle both 4-stem and 6-stem models
    stem_names = loaded_model.sources if hasattr(loaded_model, "sources") else _STEM_NAMES

    stem_paths: dict[str, str] = {}
    for idx, stem_name in enumerate(stem_names):
        stem_audio = sources[idx]  # (channels, samples)

        # Transpose to (samples, channels) for soundfile
        stem_audio_t = stem_audio.T

        out_path = os.path.join(output_dir, f"{stem_name}.wav")
        sf.write(out_path, stem_audio_t, loaded_model.samplerate, subtype="PCM_16")
        stem_paths[stem_name] = out_path
        logger.info("Wrote stem: %s", out_path)

    return stem_paths
