import type { EnhanceAction } from "./enhance-schema";
import type { Project, SeqtrackChannel } from "@/lib/midi/types";
import { SEQTRAK_TRACKS } from "@/lib/midi/constants";
import { buildSoundCatalog } from "./transcription-prompts";
import { SEQTRAK_CHANNEL_DOCS, STEP_FORMAT_DOCS, NOTE_FORMAT_DOCS } from "./shared-prompt-blocks";

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

const ENHANCE_INSTRUCTIONS_SYNTH = `## Enhancement Mode — Improve Existing Melodic Pattern

You receive an existing single-channel melodic pattern and improve it musically. Your goal is to EDIT and REFINE, NOT bloat with extra notes.

### What to do:
- **Refine the melody**: improve note choices, add chromatic passing tones, vary intervals
- **Improve rhythm**: adjust note lengths, add syncopation, create rhythmic interest
- **Add velocity dynamics**: humanize with ghost notes (vel 40-55) and accents (vel 110-127)
- **Adjust swing** if it improves the groove (swing field, -100 to 100)
- **Add occasional rests**: silence is musical — remove redundant notes that clutter the phrase
- **Improve phrasing**: create clear musical phrases with beginning, middle, and end
- **Vary across bars**: don't repeat bar 1 identically — evolve the pattern

### Rules — CRITICAL:
- **Keep the same total note count** (±10%). Do NOT double or triple the number of notes.
- **Preserve the core melodic idea** — same key, same general pitch range, same rhythmic feel
- You MAY remove notes that don't serve the phrase — enhancement includes subtraction
- You MAY change pitches to improve the melody (better intervals, smoother voice leading)
- You MAY change durations to improve articulation
- Do NOT add notes on every single step — leave space for the music to breathe
- Return the pattern on Channel 1 only
- Maximum 4 simultaneous notes (paraphonic limit)`;

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

// Inline profile type to avoid Turbopack circular deps
type ProfileLike = {
  id?: string;
  displayName?: string;
  architecture?: string;
  prompts?: { channelDocs: string };
  sounds?: { presets: Array<{ id: number; name: string; category: string; engine: string }> };
};

export function buildEnhanceSystemPrompt(action: EnhanceAction, profile?: ProfileLike): string {
  const deviceName = profile?.displayName ?? "Yamaha SEQTRAK";
  const channelDocs = profile?.prompts?.channelDocs ?? SEQTRAK_CHANNEL_DOCS;
  const isSynth = profile?.architecture === "synth";

  const sections: string[] = [
    `You are an expert music producer and MIDI programmer specializing in the ${deviceName}. You receive an existing project and improve it based on the requested action.`,
    "",
    channelDocs,
    "",
    STEP_FORMAT_DOCS,
    "",
    NOTE_FORMAT_DOCS,
    "",
  ];

  switch (action) {
    case "enhance":
      sections.push(isSynth ? ENHANCE_INSTRUCTIONS_SYNTH : ENHANCE_INSTRUCTIONS);
      break;

    case "sounds":
    case "sound-design":
      if (profile?.id === "microfreak") {
        sections.push(SOUNDS_INSTRUCTIONS_PREFIX + buildSoundCatalog(profile));
        sections.push("");
        sections.push(`## MicroFreak Sound Design — CC Parameters

In addition to recommending a preset, design the sound by returning CC parameter values in the soundDesign field.

Available CC parameters for MicroFreak:
- CC9: Oscillator Type (10=BasicWaves, 21=SuperWave, 32=WaveTable, 42=Harmo, 53=KarplusStr, 64=V.Analog, 74=WaveShaper, 85=TwoOpFM, 95=Formant, 106=Chords, 117=Speech, 127=Modal)
- CC10: Wave (0-127), CC12: Timbre (0-127), CC13: Shape (0-127)
- CC23: Filter Cutoff (0-127), CC83: Resonance (0-127)
- CC105: Attack (0-127), CC106: Decay (0-127), CC29: Sustain (0-127), CC26: Filter Env Amount (0-127, 64=center)
- CC102: CycleEnv Rise (0-127), CC103: CycleEnv Fall (0-127), CC28: CycleEnv Hold (0-127), CC24: CycleEnv Amount (0-127)
- CC93: LFO Rate (0-127), CC94: LFO Rate Sync (0-127)
- CC5: Glide (0-127)

Analyze the pattern's character and design a matching sound:
- Fast patterns → short attack, short decay, low sustain
- Sustained melodies → longer attack, high sustain
- Bass lines → V.Analog or TwoOpFM osc, low cutoff, moderate resonance
- Pads → WaveTable or Chords osc, slow attack, high sustain
- Leads → SuperWave or BasicWaves, open filter
- Evolving textures → add CycleEnv (CC102/103/24) for movement
- Rhythmic wobble → fast CycleEnv rise/fall with high amount

Return soundDesign array with at least CC9, CC23, CC105, CC106, CC29. For evolving sounds, also include CC102, CC103, CC24.`);
      } else {
        sections.push(SOUNDS_INSTRUCTIONS_PREFIX + buildSoundCatalog(profile));
      }
      break;

    case "rearrange":
      if (isSynth) {
        sections.push("## Rearrange Mode\nThis is a single-channel synthesizer. Rearrangement is not applicable — focus on enhancing the existing melodic content on Channel 1.");
      } else {
        sections.push(REARRANGE_INSTRUCTIONS);
      }
      break;

    case "all":
      sections.push(isSynth ? ENHANCE_INSTRUCTIONS_SYNTH : ENHANCE_INSTRUCTIONS);
      sections.push("");
      sections.push(SOUNDS_INSTRUCTIONS_PREFIX + buildSoundCatalog(profile));
      if (!isSynth) {
        sections.push("");
        sections.push(REARRANGE_INSTRUCTIONS);
      }
      break;
  }

  sections.push("");
  sections.push(`## Output Format
Return a JSON object with:
- tracks: array of { channel, patterns, soundPreset?, soundDesign? (array of {cc, value, name}), matrixRouting? (array of {source, destination, amount}), reason? }
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
