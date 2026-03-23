import type { EnhanceAction } from "./enhance-schema";
import type { Project, SeqtrackChannel } from "@/lib/midi/types";
import { SEQTRAK_TRACKS, STEPS_PER_BAR } from "@/lib/midi/constants";
import { buildSoundCatalog } from "./transcription-prompts";

// ---- System prompt builder -----------------------------------------------

const CHANNEL_MAPPING = `## SEQTRAK Channel Mapping (CRITICAL — each instrument has its OWN MIDI channel)
- Channel 1: KICK (drum, pitch=60)
- Channel 2: SNARE (drum, pitch=60)
- Channel 3: CLAP (drum, pitch=60)
- Channel 4: HAT 1 — closed hi-hat (drum, pitch=60)
- Channel 5: HAT 2 — open hi-hat (drum, pitch=60)
- Channel 6: PERC 1 (drum, pitch=60)
- Channel 7: PERC 2 (drum, pitch=60)
- Channel 8: SYNTH 1 — AWM2 synth (melodic, real MIDI notes)
- Channel 9: SYNTH 2 — AWM2 synth (melodic, real MIDI notes)
- Channel 10: DX — FM synthesis (melodic, real MIDI notes)
- Channel 11: SAMPLER (melodic or percussive)`;

const STEP_FORMAT = `## Step Sequencer Format
- Each pattern has 1-8 bars
- Each bar has ${STEPS_PER_BAR} steps (16th notes)
- Step 0 = beat 1, step 4 = beat 2, step 8 = beat 3, step 12 = beat 4
- For 2 bars: steps 0-31. For 4 bars: steps 0-63. Max 128 steps (8 bars).

## Note Format
Each note has:
- pitch: MIDI note number 0-127. For drums (ch 1-7), ALWAYS use 60. For melodic (ch 8-11), use real notes.
- velocity: 1-127. Ghost notes ~40-60, normal 80-100, accents 110-127.
- step: 0-based position in the pattern
- duration: length in steps. 1=16th, 2=8th, 4=quarter, 8=half, 16=whole
- probability: 0-100. Use 100 for solid hits, 50-70 for ghost notes/fills.`;

const ENHANCE_INSTRUCTIONS = `## Enhancement Mode — Improve Existing Patterns

You receive existing patterns and improve them musically. Your goal is to enhance, NOT replace.

### What to do:
- Add **ghost notes** (velocity 40-60) on offbeat 16th-note positions for groove
- Add **fills** on the last 2-4 steps of the final bar (e.g., snare rolls, tom fills)
- Apply **velocity humanization**: vary hits by ±10-20 from the base velocity
- Introduce **swing** via subtle timing offsets (adjust the swing field, -100 to 100)
- Add genre-appropriate **embellishments** (e.g., open hats on upbeats, percussion accents)
- Enrich melodic parts with **passing tones**, **octave doublings**, or **call-and-response** phrases

### Rules:
- **Preserve the core groove** — the original kick/snare/hat pattern must remain recognizable
- Keep every note from the original unless it conflicts with a clear improvement
- Only ADD notes; do not remove original notes unless absolutely necessary
- If a track has no notes, leave it empty (don't invent parts that weren't there)
- Return ALL tracks that had notes, even if unchanged`;

const SOUNDS_INSTRUCTIONS_PREFIX = `## Sound Selection Mode — Choose Optimal Presets

Analyze each track's rhythmic character, note density, pitch range, and overall musical style.
Pick the most appropriate sound preset from the library for each channel.

### Guidelines:
- Match the sound to the musical content (e.g., busy 16th-note patterns → crisp, short sounds)
- Consider the overall mix balance — don't pick sounds that will clash
- For drums: match attack/decay to the pattern density (sparse → boomy, dense → tight)
- For melodic: match timbre to the note range and style (bass lines → bass presets, pads → pad presets)
- Explain your choice in the 'reason' field for each track
- Use exact preset IDs from the library below

`;

const REARRANGE_INSTRUCTIONS = `## Rearrange Mode — Optimize the Arrangement

Restructure the project for maximum musical impact on the SEQTRAK hardware.

### What to do:
- Move parts to the most appropriate channels based on their content:
  - Bass melodies → Channel 8 (Synth 1, AWM2 — best bass engine)
  - Lead melodies → Channel 9 (Synth 2, AWM2 — good for leads)
  - Pads / textures → Channel 10 (DX/FM — great for evolving sounds)
  - One-shots / FX → Channel 11 (Sampler)
- Redistribute drum hits if they're on wrong channels (e.g., hi-hat on kick channel)
- Ensure low-frequency content is on ch1 (Kick) and ch8 (bass synth)
- Ensure high-frequency rhythmic content is on ch4/ch5 (hats)
- Consolidate sparse parts: if two channels have very few notes, merge them
- Split dense parts: if one channel is overloaded, spread across channels

### Rules:
- Preserve all musical content — rearranging means MOVING, not deleting
- Drum channels (1-7) always use pitch=60
- Melodic channels (8-11) use real MIDI note numbers
- Keep the total note count approximately the same`;

export function buildEnhanceSystemPrompt(action: EnhanceAction): string {
  const sections: string[] = [
    "You are an expert music producer and MIDI programmer specializing in the Yamaha SEQTRAK groovebox. You receive an existing project and improve it based on the requested action.",
    "",
    CHANNEL_MAPPING,
    "",
    STEP_FORMAT,
    "",
  ];

  switch (action) {
    case "enhance":
      sections.push(ENHANCE_INSTRUCTIONS);
      break;

    case "sounds":
      sections.push(SOUNDS_INSTRUCTIONS_PREFIX + buildSoundCatalog());
      break;

    case "rearrange":
      sections.push(REARRANGE_INSTRUCTIONS);
      break;

    case "all":
      sections.push(ENHANCE_INSTRUCTIONS);
      sections.push("");
      sections.push(SOUNDS_INSTRUCTIONS_PREFIX + buildSoundCatalog());
      sections.push("");
      sections.push(REARRANGE_INSTRUCTIONS);
      break;
  }

  sections.push("");
  sections.push(`## Output Format
Return a JSON object with:
- tracks: array of { channel, patterns, soundPreset? (with id, name, category), reason? }
- bpm: suggested BPM change (optional, omit if unchanged)
- description: what you changed and why (1-3 sentences)
- suggestions: 2-3 follow-up ideas for further improvement`);

  return sections.join("\n");
}

// ---- User prompt builder -------------------------------------------------

export function buildEnhanceUserPrompt(
  project: Project,
  instruction: string,
  action: EnhanceAction,
): string {
  const parts: string[] = [];

  // Header
  parts.push(`Current Project: "${project.name}" at ${project.bpm} BPM, key ${project.scaleRoot} ${project.scaleName}`);
  parts.push("");

  // Serialize each track that has notes
  const channels = Object.keys(project.tracks)
    .map(Number)
    .sort((a, b) => a - b) as SeqtrackChannel[];

  for (const ch of channels) {
    const track = project.tracks[ch];
    if (!track) continue;

    // Get the active pattern (or first pattern)
    const pattern = track.patterns[track.activePattern] ?? track.patterns[0];
    if (!pattern || pattern.notes.length === 0) continue;

    const info = SEQTRAK_TRACKS[ch];
    const trackType = ch <= 7 ? "drum" : "synth";

    parts.push(`Channel ${ch} (${info.name}, ${trackType}): ${pattern.notes.length} notes, ${pattern.bars} bar${pattern.bars > 1 ? "s" : ""}${pattern.swing !== 0 ? `, swing=${pattern.swing}` : ""}`);

    if (trackType === "drum") {
      // Compact drum format: step:velocity
      const sorted = [...pattern.notes].sort((a, b) => a.step - b.step);
      const stepStrings = sorted.map(n => `${n.step}:v${n.velocity}${n.probability < 100 ? `:p${n.probability}` : ""}`);
      parts.push(`  Steps: ${stepStrings.join("  ")}`);
    } else {
      // Melodic format: step:pitch:velocity:duration
      const sorted = [...pattern.notes].sort((a, b) => a.step - b.step);
      const noteStrings = sorted.map(n =>
        `${n.step}:p${n.pitch}:v${n.velocity}:d${n.duration}${n.probability < 100 ? `:prob${n.probability}` : ""}`,
      );
      // Wrap at ~8 notes per line for readability
      const lines: string[] = [];
      for (let i = 0; i < noteStrings.length; i += 8) {
        lines.push(`  ${noteStrings.slice(i, i + 8).join("  ")}`);
      }
      parts.push(`  Notes: ${sorted.length}`);
      parts.push(lines.join("\n"));
    }

    parts.push("");
  }

  // Instruction and action
  parts.push(`User instruction: "${instruction}"`);
  parts.push(`Action: ${action}`);

  return parts.join("\n");
}
