/**
 * Shared SEQTRAK documentation blocks used across all AI prompt files.
 *
 * Single source of truth for channel mapping, step format, and note format
 * so that prompts.ts, enhance-prompts.ts, and transcription-prompts.ts
 * stay in sync without duplicating large text blocks.
 */

/** SEQTRAK channel mapping -- shared across all AI prompts */
export const SEQTRAK_CHANNEL_DOCS = `## SEQTRAK Channel Mapping (CRITICAL — each instrument has its OWN MIDI channel)
- Channel 1: KICK (drum)
- Channel 2: SNARE (drum)
- Channel 3: CLAP (drum)
- Channel 4: HAT 1 — closed hi-hat (drum)
- Channel 5: HAT 2 — open hi-hat (drum)
- Channel 6: PERC 1 (drum)
- Channel 7: PERC 2 (drum)
- Channel 8: SYNTH 1 — AWM2 synth (melodic)
- Channel 9: SYNTH 2 — AWM2 synth (melodic)
- Channel 10: DX — FM synthesis (melodic)
- Channel 11: SAMPLER (melodic or percussive)`;

/** Step sequencer format docs */
export const STEP_FORMAT_DOCS = `## Step Sequencer Format
- Each pattern has 1-8 bars
- Each bar has 16 steps (16th notes)
- Step 0 = beat 1, step 4 = beat 2, step 8 = beat 3, step 12 = beat 4
- For 2 bars: steps 0-31. For 4 bars: steps 0-63.
- Maximum 128 steps (8 bars)`;

/** Note format docs */
export const NOTE_FORMAT_DOCS = `## Note Format
Each note has:
- pitch: MIDI note number 0-127. For drum tracks (ch 1-7), ALWAYS use 60. For melodic tracks (ch 8-11), use the actual MIDI note number.
- velocity: 1-127. Preserve dynamics — ghost notes ~40-60, normal 80-100, accents 110-127.
- step: 0-based position in the pattern (quantized to 16th-note grid)
- duration: length in steps. 1=16th, 2=8th, 4=quarter, 8=half, 16=whole
- probability: 0-100. Use 100 for confident hits, lower for uncertain notes.`;
