"""
Drum hit classification into SEQTRAK channels 1-7.

Maps Basic Pitch MIDI events from the drums stem into the seven
SEQTRAK drum channels using two strategies:

1. **GM drum note mapping** — if the pitch falls within the General MIDI
   percussion range (35-81), we use the standard mapping.
2. **Pitch-range heuristic** — for non-GM pitches, we classify by
   frequency band.

SEQTRAK Channel Mapping:
  1 = Kick
  2 = Snare
  3 = Clap
  4 = Closed HiHat
  5 = Open HiHat
  6 = Percussion 1 (shakers, rides, cowbell)
  7 = Percussion 2 (crashes, toms)
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# General MIDI drum note → SEQTRAK channel mapping
# Reference: GM Level 1 percussion key map
# ---------------------------------------------------------------------------
_GM_DRUM_MAP: dict[int, int] = {
    # Kick variants
    35: 1,  # Acoustic Bass Drum
    36: 1,  # Bass Drum 1
    # Snare variants
    38: 2,  # Acoustic Snare
    40: 2,  # Electric Snare
    37: 2,  # Side Stick (close enough to snare family)
    # Clap
    39: 3,  # Hand Clap
    # Closed HiHat
    42: 4,  # Closed HiHat
    44: 4,  # Pedal HiHat
    # Open HiHat
    46: 5,  # Open HiHat
    # Toms → Perc2 (channel 7)
    41: 7,  # Low Floor Tom
    43: 7,  # High Floor Tom
    45: 7,  # Low Tom
    47: 7,  # Low-Mid Tom
    48: 7,  # Hi-Mid Tom
    50: 7,  # High Tom
    # Rides / Shakers → Perc1 (channel 6)
    51: 6,  # Ride Cymbal 1
    53: 6,  # Ride Bell
    56: 6,  # Cowbell
    59: 6,  # Ride Cymbal 2
    69: 6,  # Cabasa
    70: 6,  # Maracas
    73: 6,  # Short Guiro
    74: 6,  # Long Guiro
    75: 6,  # Claves
    76: 6,  # Hi Wood Block
    77: 6,  # Low Wood Block
    # Crashes → Perc2 (channel 7)
    49: 7,  # Crash Cymbal 1
    52: 7,  # Chinese Cymbal
    55: 7,  # Splash Cymbal
    57: 7,  # Crash Cymbal 2
    # Tambourine → Perc1
    54: 6,  # Tambourine
}

# GM percussion range
_GM_RANGE_LOW = 35
_GM_RANGE_HIGH = 81


def _classify_by_gm(pitch: int) -> int | None:
    """Return SEQTRAK channel if *pitch* matches a known GM drum note."""
    return _GM_DRUM_MAP.get(pitch)


def _classify_by_range(pitch: int) -> int:
    """Classify a drum hit by MIDI pitch range heuristic.

    This is the fallback when the pitch doesn't match any GM drum note.

    Pitch ranges (approximate):
      < 50       → Kick (ch 1)
      50-59      → Snare (ch 2)
      60-71      → Clap (ch 3) — mid range, short transient
      72-84      → Closed HiHat (ch 4)
      > 84       → Open HiHat (ch 5)

    Remaining ambiguous pitches default to Perc1 (ch 6).
    """
    if pitch < 50:
        return 1  # Kick
    elif pitch < 60:
        return 2  # Snare
    elif pitch < 72:
        return 3  # Clap
    elif pitch < 85:
        return 4  # Closed HiHat
    else:
        return 5  # Open HiHat


def classify_drums(events: list[dict[str, Any]]) -> dict[int, list[dict[str, Any]]]:
    """Classify drum MIDI events into SEQTRAK channels 1-7.

    Each event dict must have at least ``pitch``, ``start``, ``end``,
    ``velocity``.  Events are classified first via GM drum note mapping,
    then by pitch range heuristic.

    Args:
        events: List of note-event dicts from Basic Pitch transcription.

    Returns:
        Dictionary mapping SEQTRAK channel numbers (1-7) to lists of
        note-event dicts.  Every event in the output has an added
        ``channel`` key and its ``pitch`` is overridden to 60 (SEQTRAK
        drum tracks always use C3).
    """
    classified: dict[int, list[dict[str, Any]]] = {ch: [] for ch in range(1, 8)}

    for event in events:
        pitch = event.get("pitch", 60)

        # Try GM mapping first
        channel = _classify_by_gm(pitch)

        # Fall back to pitch-range heuristic
        if channel is None:
            channel = _classify_by_range(pitch)

        # Build output event — pitch is always 60 for SEQTRAK drums
        classified_event = {
            **event,
            "channel": channel,
            "original_pitch": pitch,
            "pitch": 60,  # SEQTRAK drum tracks always use C3
        }
        classified[channel].append(classified_event)

    total = sum(len(v) for v in classified.values())
    breakdown = {ch: len(v) for ch, v in classified.items() if v}
    logger.info(
        "Classified %d drum hits into channels: %s",
        total,
        breakdown,
    )

    return classified
