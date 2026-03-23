"""
MIDI analysis via LM Studio (MIDI-LLaMA or any music-capable local LLM).
Analyzes transcribed MIDI events to detect chord progressions, song structure,
genre, mood, and arrangement suggestions.
"""
import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

LM_STUDIO_URL = os.environ.get("LM_STUDIO_URL", "http://169.254.48.100:1235/v1/chat/completions")
LM_STUDIO_KEY = os.environ.get("LM_STUDIO_API_KEY", "sk-lm-nqKASJlJ:B4wkvxUCNaqJU6wFvnoL")
LM_STUDIO_MODEL = os.environ.get("LM_STUDIO_MODEL", "minimax/minimax-m2.5")


def format_midi_summary(midi_events: dict, bpm: float, key: str) -> str:
    """Format MIDI events into a concise text summary for the LLM."""
    lines = [f"BPM: {bpm}", f"Key: {key}", ""]

    for stem_name, events in midi_events.items():
        if isinstance(events, dict):  # drums (pre-classified)
            total = sum(len(v) for v in events.values() if isinstance(v, list))
            lines.append(f"Drums: {total} hits across {len([v for v in events.values() if isinstance(v, list) and len(v) > 0])} channels")
        elif isinstance(events, list):
            if len(events) == 0:
                continue
            pitches = [e.get("pitch", 60) for e in events]
            lines.append(f"{stem_name}: {len(events)} notes, pitch range {min(pitches)}-{max(pitches)}")

    return "\n".join(lines)


def analyze_midi(midi_events: dict, bpm: float, key: str) -> dict:
    """Analyze MIDI data using LM Studio for chord/structure/genre detection.

    Returns dict with keys: chords, structure, genre, mood, suggestions.
    Returns empty/default dict on failure (non-blocking).
    """
    try:
        summary = format_midi_summary(midi_events, bpm, key)

        response = requests.post(
            LM_STUDIO_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {LM_STUDIO_KEY}",
            },
            json={
                "model": LM_STUDIO_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a music theory expert. Analyze MIDI transcription data and respond with JSON containing: chords (array of chord symbols), structure (verse/chorus/bridge sections), genre (string), mood (string), suggestions (array of arrangement tips for a groovebox)."
                    },
                    {
                        "role": "user",
                        "content": f"Analyze this transcribed MIDI data:\n\n{summary}\n\nRespond with JSON only."
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 1000,
            },
            timeout=30,
        )

        if response.status_code != 200:
            logger.warning("LM Studio returned %d: %s", response.status_code, response.text[:200])
            return _default_analysis()

        content = response.json()["choices"][0]["message"]["content"]

        # Try to parse JSON from response
        try:
            # Handle markdown code fences
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            return json.loads(content)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse LM Studio response as JSON")
            return _default_analysis()

    except requests.exceptions.RequestException as e:
        logger.warning("LM Studio not reachable: %s", e)
        return _default_analysis()
    except Exception as e:
        logger.warning("MIDI analysis failed: %s", e)
        return _default_analysis()


def _default_analysis() -> dict:
    return {
        "chords": [],
        "structure": "unknown",
        "genre": "unknown",
        "mood": "unknown",
        "suggestions": [],
    }
