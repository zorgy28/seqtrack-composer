# CLAUDE.md — SeqTrack Composer

Instructions for Claude Code when working in this project.

## Project Overview

SeqTrack Composer is a Next.js web app that generates MIDI patterns for the Yamaha SEQTRAK groovebox using AI (Claude via AI SDK). Users describe music in natural language, get step-sequencer patterns, edit them visually, and send MIDI directly to the SEQTRAK over USB.

No database. All project state lives in localStorage. The only server-side logic is the `/api/compose` route that calls Claude for pattern generation.

## Architecture

- **Next.js 16 App Router** with an `(app)` route group for the main layout
- **AppShell** (`src/components/layout/app-shell.tsx`) wraps all `(app)` routes with `ProjectProvider` + `TooltipProvider` + sidebar/header
- **ProjectProvider** (`src/providers/project-provider.tsx`) is React context holding the active `Project` object and selected channel — all state mutations go through this
- **Pure functions** in `src/lib/midi/` for pattern manipulation (no side effects, no device I/O)
- **WebMidi.js** in `src/lib/webmidi/` for all device communication (SysEx enabled)
- **AI SDK v6** with `@ai-sdk/anthropic` and Zod-validated structured output for composition

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/lib/midi/` | Domain logic: types, constants, pattern generators, MIDI export, SysEx builders, CC map, sound library, program change |
| `src/lib/webmidi/` | Device I/O: connection management, note/CC/SysEx sending, pattern playback |
| `src/lib/ai/` | AI composition: system prompt, user prompt builder, Zod output schema |
| `src/components/` | UI components (editor, layout, sound browser, shadcn primitives) |
| `src/hooks/` | `useMidiConnection` (device state), `useSoundControl` (sound selection + CC) |
| `src/providers/` | `ProjectProvider` (React context for project state) |
| `src/app/api/compose/` | POST route for AI pattern generation |

## MIDI Specifics — CRITICAL

### Channel Mapping (NOT General MIDI)

The SEQTRAK uses channels 1-11 where **each drum has its OWN channel**. This is NOT GM where all drums go on channel 10.

- Channels 1-7: Individual drum instruments (Kick, Snare, Clap, Hat1, Hat2, Perc1, Perc2)
- Channel 8: Synth 1 (AWM2)
- Channel 9: Synth 2 (AWM2)
- Channel 10: DX (FM synthesis)
- Channel 11: Sampler

Drum tracks always use pitch 60 (C3). Melodic tracks use real MIDI note numbers within the selected scale.

### Sound Selection Quirk

The SEQTRAK requires CC32 (Bank Select LSB) to be **re-sent AFTER the Program Change** for the sound change to actually take effect. The correct sequence is:

```
CC0 (Bank MSB) → CC32 (Bank LSB) → Program Change → CC32 (Bank LSB again)
```

This is implemented in `src/lib/midi/program-change.ts`. Do not change this order.

### SysEx Format

Yamaha SEQTRAK SysEx parameter change messages:

```
F0 43 10 7F 1C 0C [addr_hi] [addr_mid] [addr_lo] [data...] F7
```

- `F0` = SysEx start
- `43` = Yamaha manufacturer ID
- `10` = Parameter Change (device 0)
- `7F 1C` = Group Number (SEQTRAK family)
- `0C` = Model ID (SEQTRAK)
- 3-byte address + data bytes (all 7-bit)
- No checksum needed for parameter change messages

All SysEx builders are in `src/lib/midi/sysex.ts`.

### Step Sequencer Format

- 16 steps per bar (16th notes at the current BPM)
- 1-8 bars per pattern (max 128 steps)
- Step 0 = beat 1, step 4 = beat 2, step 8 = beat 3, step 12 = beat 4
- Notes have: pitch, velocity (1-127), step (0-based), duration (in steps), probability (0-100)

## Build Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
```

## Environment Variables

Only one required:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Stored in `.env.local`. **Never commit this file.**

## Patterns and Conventions

- All pattern manipulation functions are **pure** — they return new objects, never mutate
- `createNote()`, `createEmptyPattern()`, `createTrack()`, `createEmptyProject()` are factory functions in `pattern-generators.ts`
- `toggleNoteInPattern()` is the core step-grid interaction (add or remove a note at a step+pitch)
- Channel type is `SeqtrackChannel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11` — always use this, never raw numbers
- WebMidi.js uses 1-indexed channels (matching SEQTRAK's 1-11), so no off-by-one conversion needed for channel numbers
- Part numbers for SysEx are 0-indexed: `channelToPart(channel) = channel - 1`

## AI Composition

- System prompt is in `src/lib/ai/prompts.ts` — contains genre conventions, channel mapping, and output format rules
- Output is Zod-validated via `src/lib/ai/schema.ts` (`compositionResultSchema`)
- The API route (`src/app/api/compose/route.ts`) uses `generateText` with `Output.object()` for structured output
- Model: `claude-sonnet-4-20250514` via `@ai-sdk/anthropic`

## Sound Library

- 2032+ sound presets defined in `src/lib/midi/sound-library.ts`
- CC parameter table in `src/lib/midi/cc-map.ts` (30+ parameters from SEQTRAK Data List V2.00)
- `getCCsForChannel()` filters CCs by channel type (drum/synth/dx/all)
- `getQuickCCs()` returns the most useful knob parameters for the UI

## Common Pitfalls

1. **Do not use GM channel 10 for drums** — SEQTRAK drums are channels 1-7
2. **Do not skip the CC32 re-send after Program Change** — sounds will not change on the device
3. **Do not mutate pattern/project objects** — always return new objects from manipulation functions
4. **WebMidi.js must be dynamically imported** — it accesses `navigator` and cannot run server-side
5. **SysEx must be enabled** — `WebMidi.enable({ sysex: true })` is required for parameter control
6. **All MIDI data values are 7-bit** (0-127) — mask with `& 0x7F` when building raw messages
