---
name: SeqTrack Composer File Structure
description: Complete file tree and module responsibilities as of Phase S3 completion
type: reference
updated: 2026-03-23
---

## Source Tree (src/)

```
src/
  app/
    (app)/
      compose/page.tsx       — AI composition page (prompt -> Claude -> patterns)
      device/page.tsx        — MIDI device connection + channel test
      editor/page.tsx        — Step sequencer grid editor
      projects/page.tsx      — Project CRUD (localStorage)
      sounds/page.tsx        — Sound browser + CC sliders (Phase S3)
      layout.tsx             — App layout with sidebar
    api/
      compose/route.ts       — Server-side AI endpoint (Anthropic SDK)
    layout.tsx               — Root layout
    page.tsx                 — Landing/home
    globals.css              — Tailwind + custom styles
  components/
    editor/
      step-grid.tsx          — 16-step grid with velocity editing
    sound/
      track-params.tsx       — CC slider panel (quick params per channel)
    layout/
      app-shell.tsx          — Main app wrapper
      app-sidebar.tsx        — Navigation sidebar
      app-header.tsx         — Top header bar
    ui/                      — shadcn/ui primitives (badge, button, card, dialog,
                               dropdown-menu, select, separator, slider, tabs,
                               textarea, tooltip)
  hooks/
    use-midi-connection.ts   — WebMIDI device state management
    use-sound-control.ts     — Per-track preset + CC value state, SysEx
  lib/
    midi/
      types.ts               — All domain types
      constants.ts           — SEQTRAK tracks, scales, quantize, device names
      pattern-generators.ts  — Algorithmic drum/melody pattern generation
      note-utils.ts          — Note names, scale quantize, step timing
      midi-export.ts         — .mid file export via midi-writer-js
      project-store.ts       — localStorage CRUD for projects
      sound-library.ts       — 2032 preset catalog (representative subset coded)
      cc-map.ts              — 40 CC params with metadata + channel filtering
      sysex.ts               — SysEx builders (param change/request, bulk dump)
      program-change.ts      — Bank Select + PC with SEQTRAK quirk
    webmidi/
      midi-connection.ts     — Device detection, connect/disconnect
      midi-sender.ts         — Note/CC/PC/SysEx/BankSelect/pattern playback
      midi-test.ts           — Channel verification utilities
    ai/
      prompts.ts             — System prompts for AI composition
      schema.ts              — Zod schemas for structured AI output
    utils.ts                 — cn() and general utilities
  providers/
    project-provider.tsx     — React context for project + selected channel
  types/
    midi-writer-js.d.ts      — Type declarations for midi-writer-js
```

## Config Files (root)
- `package.json` — Next.js 16, React 19, AI SDK v6, webmidi 3, Zod 4, shadcn 4
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `components.json` — shadcn/ui config
- `.env.local` — ANTHROPIC_API_KEY
- `README.md` — Project overview, setup, features, channel mapping
- `CLAUDE.md` — Architecture, MIDI specifics, SysEx format, common pitfalls
- `.gitignore` — Excludes .env*, node_modules, .next
