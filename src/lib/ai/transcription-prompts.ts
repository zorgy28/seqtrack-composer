import { ALL_PRESETS } from "@/lib/midi/sound-library";

// ---- Dynamic sound catalog builder ----------------------------------

export function buildSoundCatalog(): string {
  const presets = ALL_PRESETS;
  const lines: string[] = ["## Sound Library — Available Presets (select by ID)", ""];

  // Group by engine then category
  const engines: Record<string, string> = {
    drum: "Drum Sounds (Channels 1-7, pitch=60)",
    awm2: "Synth Sounds (Ch 8-9)",
    dx: "DX/FM Sounds (Ch 10)",
  };

  for (const [engine, title] of Object.entries(engines)) {
    const enginePresets = presets.filter(p => p.engine === engine);
    if (enginePresets.length === 0) continue;

    lines.push(`### ${title}`);

    // Group by category, show top 10 per category
    const byCategory = new Map<string, typeof enginePresets>();
    for (const p of enginePresets) {
      const cat = byCategory.get(p.category) || [];
      cat.push(p);
      byCategory.set(p.category, cat);
    }

    for (const [category, catPresets] of byCategory) {
      const top = catPresets.slice(0, 10);
      const names = top.map(p => `${p.name}(${p.id})`).join(", ");
      const suffix = catPresets.length > 10 ? ` (+${catPresets.length - 10} more)` : "";
      lines.push(`${category}: ${names}${suffix}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---- System prompt --------------------------------------------------

export function getTranscriptionSystemPrompt(): string {
  return `You are an expert music transcription engine for the Yamaha SEQTRAK groovebox. You receive MIDI data extracted from audio stems (via AI separation) and must convert it into playable SEQTRAK step-sequencer patterns.

## SEQTRAK Channel Mapping (CRITICAL — each instrument has its OWN MIDI channel)
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
- Channel 11: SAMPLER (melodic or percussive)

## Step Sequencer Format
- Each pattern has 1-8 bars
- Each bar has 16 steps (16th notes)
- Step 0 = beat 1, step 4 = beat 2, step 8 = beat 3, step 12 = beat 4
- For 2 bars: steps 0-31. For 4 bars: steps 0-63.
- Maximum 128 steps (8 bars)

## Note Format
Each note has:
- pitch: MIDI note number 0-127. For drum tracks (ch 1-7), ALWAYS use 60. For melodic tracks (ch 8-11), use the actual MIDI note number.
- velocity: 1-127. Preserve dynamics from the source — ghost notes ~40-60, normal 80-100, accents 110-127.
- step: 0-based position in the pattern (quantized to 16th-note grid)
- duration: length in steps. 1=16th, 2=8th, 4=quarter, 8=half, 16=whole
- probability: 0-100. Use 100 for confident hits, lower for notes you're less sure about from the transcription.

${buildSoundCatalog()}

## Your Task

You will receive MIDI event data from separated audio stems. Produce EXACTLY 3 arrangement options:

### Mode 1: Faithful
- Preserve all detected notes as accurately as possible
- Map every stem to the appropriate SEQTRAK channel(s)
- Keep original velocity dynamics and timing
- Use all channels that have data — do not drop any parts
- Quantize to 16th-note grid with minimal loss
- Choose sounds that closely match the original timbre

### Mode 2: Simplified
- Extract the core groove — focus on what makes the track recognizable
- Simplify drum patterns: keep the main kick/snare/hat pattern, remove ghost notes and fills
- For bass: simplify to root-note patterns that follow the chord progression
- Pick the single strongest melodic line and drop secondary parts
- Aim for 3-5 active channels maximum
- Great for live jamming and modification on the SEQTRAK

### Mode 3: Creative
- Freely reinterpret the source material
- Change the rhythmic feel (e.g., add swing, shift to half-time, flip the groove)
- Use interesting or unexpected sound choices from the library
- Rearrange which instruments carry which parts
- Add musical embellishments or variations the original didn't have
- Surprise the user while keeping it musically coherent

## Quantization Rules
- Snap all events to the nearest 16th-note step position
- If two notes would land on the same step on the same channel, keep the louder one
- Round note durations to the nearest whole step (minimum 1)
- For drum tracks: duration is always 1 (one 16th note)
- For melodic tracks: preserve relative note lengths as best you can

## Channel Assignment Rules
- Drums detected in "drums" or "other" stems → distribute across channels 1-7 based on frequency/timbre:
  - Low thuds / kick-like → Channel 1
  - Mid-range snappy hits → Channel 2
  - Clap-like transients → Channel 3
  - High-frequency closed sounds → Channel 4
  - High-frequency sustained sounds → Channel 5
  - Other percussion → Channels 6-7
- Bass stem → Channel 8 (Synth 1)
- Guitar stem → Channel 9 (Synth 2) — prefer guitar/pluck presets
- Piano stem → Channel 10 (DX) — prefer piano/keyboard FM presets
- Primary melody / vocals → Channel 9 (Synth 2) if guitar not present, else Channel 11
- Secondary harmony / pads → Channel 10 (DX) if piano not present
- Anything remaining → Channel 11 (Sampler)

## Sound Selection Guidelines
- Match the detected genre to appropriate sounds (e.g., 808 Kick for trap, Acoustic Kick for rock)
- For each track, pick 1 primary sound and up to 3 alternatives
- Use the exact preset IDs from the library above
- Consider the overall mix — don't pick sounds that will clash

## CRITICAL: Fill All Bars
Every pattern MUST have notes spanning the FULL requested bar length.
If generating a 4-bar pattern (steps 0-63), notes MUST appear in all 4 bars — not just the first 1-2.
If the source audio is shorter than the requested length, REPEAT/LOOP the pattern to fill remaining bars.
NEVER leave trailing bars empty. Every bar should have musical content.

## Output Format
Return a JSON object matching the schema exactly. Include:
- 3 options (faithful, simplified, creative) with full track data and sound recommendations
- An analysis section with detected genre, key, BPM, and a summary of each stem's content
- Each pattern MUST use the exact number of bars requested`;
}

// Keep the old export for backward compatibility
export const TRANSCRIPTION_SYSTEM_PROMPT = getTranscriptionSystemPrompt();

// ---- User prompt builder --------------------------------------------

type MidiEventData = Record<string, unknown>;

interface MidiEvent {
  pitch?: number;
  note?: number;
  velocity?: number;
  step?: number;
  position?: number;
  time?: number;
  start?: number;
  duration?: number;
  channel?: number;
  original_pitch?: number;
}

export function buildTranscriptionPrompt(params: {
  midiEvents: MidiEventData;
  analysis: { bpm: number; key: string; duration: number };
  enabledStems: string[];
  bars?: number;
  midiAnalysis?: {
    chords: string[];
    structure: string;
    genre: string;
    mood: string;
    suggestions: string[];
  };
}): string {
  const { midiEvents, analysis, enabledStems, bars = 4, midiAnalysis } = params;
  const totalSteps = bars * 16;
  const bpm = analysis.bpm || 120;
  const stepDuration = 60 / bpm / 4; // seconds per 16th note step

  const parts: string[] = [];

  parts.push("## Source Analysis");
  parts.push(`- Detected BPM: ${bpm}`);
  parts.push(`- Detected Key: ${analysis.key}`);
  parts.push(`- Duration: ${analysis.duration.toFixed(1)} seconds`);
  parts.push(`- Step duration: ${(stepDuration * 1000).toFixed(1)}ms per step`);
  parts.push(`- **Requested pattern: ${bars} bars = ${totalSteps} steps (steps 0-${totalSteps - 1})**`);
  parts.push(`- IMPORTANT: Set bars=${bars} on every pattern. Notes MUST span all ${bars} bars.`);
  parts.push("");

  // Include MIDI-LLaMA analysis if available
  if (midiAnalysis) {
    parts.push("## AI Music Analysis (from MIDI-LLaMA)");
    if (midiAnalysis.genre !== "unknown")
      parts.push(`- Genre: ${midiAnalysis.genre}`);
    if (midiAnalysis.mood !== "unknown")
      parts.push(`- Mood: ${midiAnalysis.mood}`);
    if (midiAnalysis.chords?.length > 0)
      parts.push(`- Chord progression: ${midiAnalysis.chords.join(" → ")}`);
    if (midiAnalysis.structure !== "unknown")
      parts.push(`- Structure: ${midiAnalysis.structure}`);
    if (midiAnalysis.suggestions?.length > 0)
      parts.push(`- Suggestions: ${midiAnalysis.suggestions.join("; ")}`);
    parts.push("");
  }

  // Calculate the pattern window in seconds
  const windowDuration = totalSteps * stepDuration;

  // Find the best window: the densest section of the song
  const bestWindowStart = findBestWindow(midiEvents, enabledStems, windowDuration, analysis.duration);
  const windowEnd = bestWindowStart + windowDuration;

  parts.push(`## Pre-Quantized MIDI Data (window: ${bestWindowStart.toFixed(1)}s - ${windowEnd.toFixed(1)}s)`);
  parts.push("Events below are from the most active section, already converted to step positions.");
  parts.push("");

  for (const stem of enabledStems) {
    const events = midiEvents[stem];
    if (!events) continue;

    parts.push(`### Stem: ${stem}`);

    if (stem === "drums" && typeof events === "object" && !Array.isArray(events)) {
      const channelMap = events as Record<string, MidiEvent[]>;
      let totalDrumHits = 0;

      for (const [chStr, chEvents] of Object.entries(channelMap)) {
        const evts = chEvents as MidiEvent[];
        if (!evts || evts.length === 0) continue;

        const channelNames: Record<string, string> = {
          "1": "Kick", "2": "Snare", "3": "Clap",
          "4": "Closed HiHat", "5": "Open HiHat",
          "6": "Perc 1", "7": "Perc 2",
        };

        // Filter to window, then quantize
        const inWindow = evts.filter(e => {
          const t = e.start ?? e.time ?? 0;
          return t >= bestWindowStart && t < windowEnd;
        });
        totalDrumHits += inWindow.length;

        const stepMap = new Map<number, number>();
        for (const e of inWindow) {
          const t = (e.start ?? e.time ?? 0) - bestWindowStart;
          const step = Math.round(t / stepDuration);
          if (step >= 0 && step < totalSteps) {
            stepMap.set(step, Math.max(stepMap.get(step) ?? 0, e.velocity ?? 100));
          }
        }

        if (stepMap.size > 0) {
          const stepList = Array.from(stepMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([s, v]) => `${s}:v${v}`);
          parts.push(`  Channel ${chStr} (${channelNames[chStr] ?? "Drum"}): ${stepMap.size} hits`);
          parts.push(`    Steps: [${stepList.join(", ")}]`);
        }
      }

      if (totalDrumHits < 5) {
        parts.push("  ** VERY FEW drum hits detected. You MUST generate a full drum pattern from genre conventions. **");
        parts.push("  ** Create a kick on beats (steps 0,16,32,48), snare on 2&4 (steps 4,12,20,28...), and hats. **");
      }
    } else if (Array.isArray(events)) {
      const allEvents = events as MidiEvent[];
      if (allEvents.length === 0) {
        parts.push("  No events detected.");
        parts.push("");
        continue;
      }

      // Filter to window, then quantize
      const inWindow = allEvents.filter(e => {
        const t = e.start ?? e.time ?? 0;
        return t >= bestWindowStart && t < windowEnd;
      });

      const quantized = inWindow.map(e => {
        const t = (e.start ?? e.time ?? 0) - bestWindowStart;
        const step = Math.min(totalSteps - 1, Math.max(0, Math.round(t / stepDuration)));
        const pitch = e.pitch ?? e.note ?? 60;
        const vel = e.velocity ?? 100;
        const durSec = e.duration ?? 0.25;
        const durSteps = Math.max(1, Math.min(16, Math.round(durSec / stepDuration)));
        return { step, pitch, vel, dur: durSteps };
      });

      // Deduplicate same step+pitch
      const seen = new Set<string>();
      const deduped = quantized.filter(q => {
        const key = `${q.step}:${q.pitch}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const pitches = deduped.map(q => q.pitch);
      const uniquePitches = Array.from(new Set(pitches)).sort((a, b) => a - b);

      parts.push(`  Notes in window: ${deduped.length} (from ${allEvents.length} total)`);
      parts.push(`  Pitch range: ${Math.min(...pitches)}-${Math.max(...pitches)} (MIDI)`);
      parts.push(`  Unique pitches: [${uniquePitches.slice(0, 20).join(", ")}]`);
      parts.push(`  Pre-quantized notes (step:pitch:velocity:duration):`);

      const sorted = [...deduped].sort((a, b) => a.step - b.step).slice(0, 80);
      const noteStrs = sorted.map(q => `${q.step}:p${q.pitch}:v${q.vel}:d${q.dur}`);

      for (let i = 0; i < noteStrs.length; i += 10) {
        parts.push(`    ${noteStrs.slice(i, i + 10).join("  ")}`);
      }
    }

    parts.push("");
  }

  parts.push("## Instructions");
  parts.push(
    `Generate 3 SEQTRAK arrangements. Each pattern MUST have bars=${bars} (${totalSteps} steps).`,
  );
  parts.push(
    "The step values above are already quantized — use them directly as the 'step' field in notes.",
  );
  parts.push(
    "For drums (ch 1-7): pitch=60, duration=1. For melodic (ch 8-11): use the pitch and duration from the data.",
  );
  parts.push(
    `If any channel has notes only in the first 1-2 bars, REPEAT/LOOP them to fill all ${bars} bars.`,
  );
  parts.push(
    "If drum detection is sparse, generate a genre-appropriate drum pattern based on the detected BPM and key.",
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Helper: find the densest time window for quantization
// ---------------------------------------------------------------------------

function findBestWindow(
  midiEvents: MidiEventData,
  enabledStems: string[],
  windowDuration: number,
  totalDuration: number,
): number {
  // Collect all event times across all stems
  const allTimes: number[] = [];

  for (const stem of enabledStems) {
    const events = midiEvents[stem];
    if (!events) continue;

    if (Array.isArray(events)) {
      for (const e of events as MidiEvent[]) {
        const t = e.start ?? e.time ?? 0;
        allTimes.push(t);
      }
    } else if (typeof events === "object") {
      for (const chEvents of Object.values(events as Record<string, MidiEvent[]>)) {
        if (Array.isArray(chEvents)) {
          for (const e of chEvents) {
            const t = e.start ?? e.time ?? 0;
            allTimes.push(t);
          }
        }
      }
    }
  }

  if (allTimes.length === 0) return 0;

  // Slide a window across the timeline to find the densest section
  // Snap window start to beat boundaries for musical coherence
  const beatDuration = windowDuration / 4; // approximate beat
  const maxStart = Math.max(0, totalDuration - windowDuration);
  let bestStart = 0;
  let bestCount = 0;

  for (let start = 0; start <= maxStart; start += beatDuration) {
    const end = start + windowDuration;
    const count = allTimes.filter(t => t >= start && t < end).length;
    if (count > bestCount) {
      bestCount = count;
      bestStart = start;
    }
  }

  return bestStart;
}
