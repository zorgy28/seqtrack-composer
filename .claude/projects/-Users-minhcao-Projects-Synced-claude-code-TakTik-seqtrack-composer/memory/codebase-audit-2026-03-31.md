---
name: Full Codebase Audit March 2026
description: Comprehensive 6-agent audit found and fixed 20 issues across 35 files — bugs, security, architecture, cleanup
type: project
---

Full codebase audit conducted 2026-03-31 with 6 agents (3 Explore, Simplification, Challenger, Quality).

**Overall coherency: 8.6/10** across 31,576 lines, 11 features, 6 LLM providers.

## Critical Bugs Fixed
- CC value normalization in `midi-input-listener.ts` — integer 1 was silently converted to 127 (used `rawValue <= 1` check)
- `updatePattern` crash in `project-store.ts` when channel doesn't exist in project tracks
- API key exposed in URL query params in `/api/models` — moved to `x-api-key` header
- Infinite recursive polling in `use-transcription.ts` — added max 150 retries (5 min)

## High-Priority Fixes
- OpenRouter now gets native structured output when proxying Claude/Gemini models
- Temperature setting now flows from UI → ProviderConfig → generateText() (was completely disconnected)
- SEQTRAK CC32 re-send has +10ms delay after Program Change to prevent race condition
- Prompt says "tracks: array" to match compositionResultSchema (was "tracks: map")
- Enhance schema uses "MIDI channel number" not "SEQTRAK channel 1-11"
- MIDI export uses project's actual channels, not hardcoded ALL_CHANNELS

## Component Extractions
- `sounds/page.tsx` 467→15 lines (SeqtrackSoundBrowser extracted to own file)
- `preset-bank-browser.tsx` split into: preset-row, preset-param-display, record-to-device

## Remaining Tech Debt (not fixed)
- 91 `any` types (16 lint errors pre-existing, mostly WebMidi handlers + json-fallback)
- `normalizeTranscriptionOutput` swallows all errors silently
- Echo suppression 500ms window is hardcoded
- `useAsyncOperation` doesn't handle component unmount
- MicroFreak user presets in localStorage only (not IndexedDB)
- Device switch doesn't auto-recreate project
- Generic profile 16 channels vs SEQTRAK_TRACKS only covering 1-11

**Why:** Proactive quality pass before further feature development on apple-app branch.
**How to apply:** Reference remaining tech debt when touching those areas. The fixes improved system coherency from ~8.6 to ~9.2/10.
