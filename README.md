# SeqTrack Composer

AI-powered music composition, transcription, and performance tool for the **Yamaha SEQTRAK** groovebox. Compose from text prompts, transcribe songs from audio/URLs, enhance patterns with AI, edit in a piano-roll sequencer, and send everything to hardware over USB in real-time.

---

## Features

### Composition Studio (`/compose`)
Full composition workspace with parameters (bars/BPM/key/scale/swing), 20+ categorized presets (Full Beats, Melodic, Full Production, Drums Only, Bass Only), sound-aware AI generation with preset recommendations, iterative refinement, generation history, device preview before applying, and direct "Apply & Edit" bridge to the editor.

### Audio Transcription (`Transcribe` button)
Upload audio files or paste YouTube/SoundCloud URLs. AI pipeline: HTDemucs v4 6-stem separation → Basic Pitch MIDI transcription → MIDI-LLaMA analysis → 3-option generation (Faithful/Simplified/Creative) with sound recommendations. Runs on M3 Ultra GPU via Python ML microservice.

### AI Enhance (`Enhance` button in editor)
Improve existing patterns: add ghost notes, fills, swing, humanization. AI-powered sound selection from the 2032+ preset library. Track rearrangement optimization. Quick presets for common enhancements.

### Piano-Roll Editor (`/editor`)
11-track step sequencer. Drum channels (1-7): single-row click-to-toggle. Melodic channels (8-11): expandable piano-roll with scale-aware note grid and harmony suggestions (consonant/dissonant indicators on hover). Per-track volume sliders, mute buttons, and inline sound picker with AI genre-based recommendations.

### Real-Time Playback
Looped playback with animated step cursor across all tracks. Real-time mute/unmute, live pattern edits (add/remove notes while playing), and per-track volume control — all take effect immediately without restarting.

### Sound System
99 built-in presets + SysEx scanner for full 2032+ device library. Inline sound picker in editor. Sound preview on click in Sound Browser. Genre-aware AI suggestions based on pattern analysis. Dynamic sound catalog injected into all AI prompts.

### LM Studio Integration
Switchable LLM provider: Claude API or local LM Studio. Runtime model selection via UI dropdown. JSON fallback with normalization for local models.

### Device Connection
Auto-detect SEQTRAK via Web MIDI API. SysEx enabled for deep parameter control and sound scanning. Per-channel connectivity test.

### MIDI Export
Download any project as Standard MIDI File (.mid, Type 1) with all 11 tracks.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, webpack) |
| AI | AI SDK v6 + @ai-sdk/anthropic + @ai-sdk/openai-compatible |
| ML Pipeline | Python FastAPI, Demucs v4, Basic Pitch, librosa, yt-dlp |
| UI | shadcn/ui, Tailwind CSS 4, Lucide icons |
| MIDI I/O | WebMidi.js 3 (with SysEx) |
| MIDI Export | midi-writer-js |
| Validation | Zod 4 |
| Language | TypeScript 5, React 19, Python 3.11 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+ (for ML service)
- Chrome or Edge (Web MIDI support)
- Yamaha SEQTRAK via USB-C (optional)
- yt-dlp (`brew install yt-dlp`) for URL extraction

### Setup

```bash
npm install
cp .env.local.example .env.local  # Add your API keys
```

`.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
ML_SERVICE_URL=http://localhost:8200
LLM_PROVIDER=claude
LM_STUDIO_URL=http://169.254.48.100:1235/v1
LM_STUDIO_API_KEY=sk-lm-...
LM_STUDIO_MODEL=minimax/minimax-m2.5
```

### Start Services

```bash
# Terminal 1: ML service (M3 Ultra GPU)
cd ml-service && pip install -r requirements.txt && ./start.sh

# Terminal 2: Next.js
npm run dev
```

Open http://localhost:3000 in Chrome.

---

## Pages

| Route | Purpose |
|-------|---------|
| `/compose` | AI composition studio — prompts, presets, parameters, preview, refine |
| `/editor` | Piano-roll step sequencer — visual editing, playback, enhance, sound picker |
| `/sounds` | Sound browser — 2032+ presets, SysEx scanner, preview, CC controls |
| `/device` | MIDI connection — port selection, per-channel test |
| `/projects` | Project manager — save, load, export |

---

## SEQTRAK Channel Mapping

| Channel | Track | Type | Engine |
|---------|-------|------|--------|
| 1 | Kick | Drum | AWM2 Drum |
| 2 | Snare | Drum | AWM2 Drum |
| 3 | Clap | Drum | AWM2 Drum |
| 4 | Hat 1 (Closed) | Drum | AWM2 Drum |
| 5 | Hat 2 (Open) | Drum | AWM2 Drum |
| 6 | Perc 1 | Drum | AWM2 Drum |
| 7 | Perc 2 | Drum | AWM2 Drum |
| 8 | Synth 1 | Melodic | AWM2 Synth |
| 9 | Synth 2 | Melodic | AWM2 Synth |
| 10 | DX | Melodic | FM Synthesis |
| 11 | Sampler | Melodic/Perc | Sampler |

---

## License

Private project. All rights reserved.
