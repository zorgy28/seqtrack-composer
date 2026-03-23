---
name: SeqTrack Composer Project
description: AI-powered music generator for Yamaha SEQTRAK - Next.js web app with Web MIDI, pattern generation, AI composition, and sound management
type: project
updated: 2026-03-23
---

Python prototype: `docs/seqtrak_composer.py` (1557 lines, reference implementation)

**Why:** User wants to generate rhythms, melodies, and full music sets by prompting, then send them directly to the SEQTRAK via USB-MIDI -- including sound selection and parameter tweaking.

**How to apply:** When working in this project, the core domain is MIDI music generation for a specific hardware device (Yamaha SEQTRAK) with non-standard channel mapping (drums on ch 1-7, not GM ch 10). Sound management uses Bank Select + Program Change with a SEQTRAK-specific quirk (CC32 must be re-sent after PC).

## Tech Stack
- Next.js 16 + React 19
- AI SDK v6 + @ai-sdk/anthropic (direct API key, no Vercel AI Gateway)
- webmidi 3.x (Web MIDI API wrapper)
- midi-writer-js 3.x (MIDI file export)
- shadcn/ui v4 (dark mode) + Tailwind CSS 4
- Zod v4 (schema validation for AI output)
- localStorage for project persistence (no database)

## Architecture

### Pages (src/app/(app)/)
- `/editor` — Step sequencer grid (Phase 4)
- `/compose` — AI composition via Claude (Phase 6)
- `/device` — Web MIDI connection + channel test (Phase 5)
- `/projects` — Project CRUD (Phase 7)
- `/sounds` — Sound browser + CC parameter sliders (Phase S3)

### Key Modules (src/lib/)
- `midi/types.ts` — All TypeScript types (Note, Pattern, Track, Scene, Project, SoundPreset, CCParameter, etc.)
- `midi/constants.ts` — SEQTRAK_TRACKS (11 channels), scales, quantize options, device names
- `midi/pattern-generators.ts` — Algorithmic drum/melody pattern generation (Phase 3)
- `midi/note-utils.ts` — Note name conversion, scale quantize, step timing
- `midi/midi-export.ts` — Export project as .mid file (Phase 7)
- `midi/project-store.ts` — localStorage project CRUD (Phase 7)
- `midi/sound-library.ts` — 2032 presets: drums (ch 1-7), AWM2 synths (ch 8-9), DX/FM (ch 10)
- `midi/cc-map.ts` — 40 CC parameters with metadata (min/max, bipolar, channel scope, category)
- `midi/sysex.ts` — SysEx message builders (parameter change, bulk dump request, DX operator)
- `midi/program-change.ts` — Bank Select + PC with SEQTRAK CC32-resend quirk, project selection
- `webmidi/midi-connection.ts` — Device detection and connection management
- `webmidi/midi-sender.ts` — Note, CC, Program Change, SysEx, Bank Select, pattern playback
- `webmidi/midi-test.ts` — Channel verification
- `ai/prompts.ts` — System prompts for Claude composition
- `ai/schema.ts` — Zod schemas for structured AI output

### Hooks
- `use-midi-connection.ts` — WebMIDI device state
- `use-sound-control.ts` — Track sound state: preset selection, CC values, SysEx sending

### Components
- `editor/step-grid.tsx` — 16-step grid with velocity editing
- `sound/track-params.tsx` — Real-time CC slider panel (quick CCs: cutoff, resonance, attack, decay, reverb, delay, volume, pan + FM CCs on ch 10)
- `layout/app-shell.tsx`, `app-sidebar.tsx`, `app-header.tsx` — App chrome
- `ui/*` — shadcn/ui primitives (badge, button, card, dialog, dropdown-menu, select, separator, slider, tabs, textarea, tooltip)

### Providers
- `project-provider.tsx` — Project + selected channel context

## Phase Status

### Original Phases (1-7) -- All complete
1. Next.js scaffold + dark mode
2. TypeScript types + SEQTRAK constants
3. Pattern engine (algorithmic generators)
4. Step sequencer UI (grid component)
5. Web MIDI connection + channel test
6. AI composition via Claude (structured output)
7. MIDI export + project management (localStorage)

### Sound Management Phases (S1-S3) -- All complete
**S1: Data Layer**
- Sound library with representative presets from 2032 total sounds
- Actual presets coded: ~80+ (Drum: kicks/snares/claps/hats/perc, AWM2: bass/leads/piano/keys/organ/pads/strings/brass/guitar/mallet/bell/rhythmic/SFX, DX: bass/leads/piano/keys/pads/bells/SFX)
- Bank mapping: MSB=63, LSB=0-15 (preset banks), MSB=32-38 (DrumKit by part), MSB=62 (sampler)
- CC map: 40 parameters across categories (control, sound, eq, effect, fm)
- SysEx builders: Parameter Change, Parameter Request, Bulk Dump Request
- Address calculators for all SEQTRAK parameter blocks (system, project, track, sound common, AWM2 elements, DX operators, sampler)

**S2: MIDI Protocol**
- Program Change with SEQTRAK quirk: CC0 -> CC32 -> PC -> CC32 (re-send LSB)
- Project selection: MSB=64, LSB=0, PC=0-7
- midi-sender.ts extended with sendCC, sendProgramChange, sendBankSelect, sendSysEx
- use-sound-control hook: per-track preset + CC value state management

**S3: Sound Browser UI**
- `/sounds` page with engine tabs (Drum / Synth AWM2 / DX FM)
- Search across all presets
- Category filter chips
- Target track selector (changes compatible channels based on engine)
- Current sound display with real-time CC slider panel
- Preset grid (2-3 columns, scrollable, highlights active)
- TrackParams component: getQuickCCs() returns 8-12 sliders per channel (cutoff, resonance, attack, decay, reverb send, delay send, volume, pan; + FM algorithm/mod/freq/feedback on ch 10)

## Key Decisions
- Direct Anthropic API key (no Vercel AI Gateway)
- Both full-project and per-track AI generation modes
- SEQTRAK connected via USB-C to MacBook
- localStorage for project persistence (no database)
- Representative preset subset coded (not all 2032) -- enough for all categories and engines
- SysEx address space fully mapped even though not all parameters are exposed in UI yet
- Dynamic imports in use-sound-control for code splitting (program-change, midi-sender)

## Repository
- **GitHub:** https://github.com/zorgy28/seqtrack-composer
- **Branch:** main
- **Commits:** 2 (initial feature + cleanup)
- **Code:** ~4800 lines across 46 source files
- **README.md:** Full setup instructions, features, channel mapping
- **CLAUDE.md:** Architecture, MIDI specifics, SysEx format, common pitfalls

## SEQTRAK Hardware Facts
- 11 channels: Ch 1-7 drums, Ch 8-9 AWM2 synth, Ch 10 DX/FM, Ch 11 sampler
- Drums are NOT on GM ch 10 -- custom mapping per drum type per channel
- Bank Select LSB must be re-sent after Program Change (device quirk)
- SysEx: Yamaha ID 0x43, Group 7F 1C, Model 0C, no checksum for param change
- MIDI file import via companion app only (firmware V1.1.0+)
- Pattern data injection not possible programmatically -- real-time MIDI or file import only
- FM CCs 116-119 on ch 10 only (algorithm, mod amount, mod freq, feedback)
