import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import type { ZodType } from "zod";

/**
 * Generate structured output from an LLM, with fallback for models
 * that don't support native structured output (e.g., local LM Studio models).
 */
export async function generateWithFallback<T>(options: {
  model: LanguageModel;
  schema: ZodType<T>;
  system: string;
  prompt: string;
  supportsStructuredOutput: boolean;
  maxOutputTokens?: number;
}): Promise<T> {
  const { model, schema, system, prompt, supportsStructuredOutput: structured, maxOutputTokens = 16384 } = options;

  if (structured) {
    // Use native structured output (Claude supports this)
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      system,
      prompt,
      maxOutputTokens,
    });
    if (!output) throw new Error("No output generated");
    return output;
  }

  // Fallback: ask for JSON in the prompt, parse manually
  const jsonInstruction = "\n\nIMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation, just the JSON object. The JSON must be parseable by JSON.parse().";
  const thinkingDisable = "\n\nDo NOT use <think> tags or internal reasoning. Respond directly with the JSON.";

  const { text } = await generateText({
    model,
    system: system + jsonInstruction + thinkingDisable,
    prompt,
    maxOutputTokens,
  });

  return extractAndValidateJSON(text, schema);
}

/**
 * Extract JSON from a text response and validate against a Zod schema.
 * Tries multiple extraction strategies.
 */
function extractAndValidateJSON<T>(text: string, schema: ZodType<T>): T {
  // Strip Qwen3-style <think>...</think> blocks that precede the actual JSON
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  // Use cleaned text for all extraction strategies
  const effectiveText = cleaned || text;

  const extractors = [
    // Strategy 1: Trim whitespace and parse
    () => JSON.parse(effectiveText.trim()),
    // Strategy 2: Extract from ```json ... ``` code fence
    () => {
      const match = effectiveText.match(/```json\s*([\s\S]*?)\s*```/);
      if (!match) throw new Error("No JSON code fence found");
      return JSON.parse(match[1]);
    },
    // Strategy 3: Extract from ``` ... ``` code fence
    () => {
      const match = effectiveText.match(/```\s*([\s\S]*?)\s*```/);
      if (!match) throw new Error("No code fence found");
      return JSON.parse(match[1]);
    },
    // Strategy 4: Find first { ... } block (greedy)
    () => {
      const start = effectiveText.indexOf("{");
      const end = effectiveText.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found");
      return JSON.parse(effectiveText.slice(start, end + 1));
    },
  ];

  let lastZodError = "";

  for (const extractor of extractors) {
    let parsed: unknown;
    try {
      parsed = extractor();
    } catch {
      continue;
    }

    // 1. Try strict validation
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    if ("error" in result) {
      lastZodError = result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    }

    // 2. Try normalizing (handles different field names, missing fields, etc.)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const coerced = tryCoerceToSchema(parsed as Record<string, unknown>, schema);
      if (coerced) return coerced;
    }
  }

  const hint = lastZodError
    ? `Schema validation failed: ${lastZodError}`
    : "Could not parse JSON from response";

  throw new Error(
    `${hint}. Response starts with: "${effectiveText.slice(0, 300)}..."`
  );
}

/**
 * Attempt to coerce a parsed JSON object to match the transcription schema.
 * Handles common LLM output variations like different field names,
 * missing optional fields, or restructured output.
 */
function tryCoerceToSchema<T>(parsed: Record<string, unknown>, schema: ZodType<T>): T | null {
  // Try direct validation first
  const direct = schema.safeParse(parsed);
  if (direct.success) return direct.data;

  // Fix common issue: tracks as object-map instead of array
  // e.g., { "1": {...}, "2": {...} } → [{ channel: 1, ...}, { channel: 2, ...}]
  const fixed = normalizeCommonIssues(parsed);
  const fixedResult = schema.safeParse(fixed);
  if (fixedResult.success) return fixedResult.data;

  // Try transcription-specific normalization
  const normalized = normalizeTranscriptionOutput(fixed);
  if (normalized) {
    const result = schema.safeParse(normalized);
    if (result.success) return result.data;
  }

  // If the model wrapped everything in an extra layer
  for (const key of Object.keys(parsed)) {
    const inner = parsed[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const innerFixed = normalizeCommonIssues(inner as Record<string, unknown>);
      const result = schema.safeParse(innerFixed);
      if (result.success) return result.data;

      const innerNorm = normalizeTranscriptionOutput(innerFixed);
      if (innerNorm) {
        const r2 = schema.safeParse(innerNorm);
        if (r2.success) return r2.data;
      }
    }
  }

  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Fix common LLM output issues before schema-specific normalization.
 * Handles: tracks as object-map → array, missing fields, etc.
 */
function normalizeCommonIssues(parsed: Record<string, unknown>): Record<string, unknown> {
  const result = { ...parsed };

  // Convert tracks from object-map to array
  // { tracks: { "1": {patterns:...}, "8": {patterns:...} } }
  // → { tracks: [{ channel: 1, patterns:... }, { channel: 8, patterns:... }] }
  if (result.tracks && typeof result.tracks === "object" && !Array.isArray(result.tracks)) {
    const tracksObj = result.tracks as Record<string, any>;
    const tracksArray: any[] = [];

    for (const [key, value] of Object.entries(tracksObj)) {
      if (value && typeof value === "object") {
        const channelNum = parseInt(key, 10);
        const track = value as Record<string, any>;

        // Deep-fix: coerce string numbers to actual numbers in soundPreset
        if (track.soundPreset && typeof track.soundPreset === "object") {
          if (typeof track.soundPreset.id === "string") {
            track.soundPreset.id = Number(track.soundPreset.id) || 0;
          }
        }

        // Ensure patterns is an array
        if (track.patterns && !Array.isArray(track.patterns)) {
          track.patterns = [track.patterns];
        }
        if (!track.patterns) {
          track.patterns = [];
        }

        // Deep-fix: coerce note fields to numbers
        if (Array.isArray(track.patterns)) {
          for (const p of track.patterns) {
            if (p && typeof p === "object") {
              if (typeof p.bars === "string") p.bars = Number(p.bars) || 1;
              if (typeof p.swing === "string") p.swing = Number(p.swing) || 0;
              if (Array.isArray(p.notes)) {
                for (const n of p.notes) {
                  if (typeof n.pitch === "string") n.pitch = Number(n.pitch);
                  if (typeof n.velocity === "string") n.velocity = Number(n.velocity);
                  if (typeof n.step === "string") n.step = Number(n.step);
                  if (typeof n.duration === "string") n.duration = Number(n.duration);
                  if (typeof n.probability === "string") n.probability = Number(n.probability);
                }
              }
            }
          }
        }

        if (!isNaN(channelNum)) {
          tracksArray.push({ channel: channelNum, ...track });
        } else {
          tracksArray.push(track);
        }
      }
    }

    if (tracksArray.length > 0) {
      result.tracks = tracksArray;
    }
  }

  // Ensure suggestions is an array
  if (result.suggestions && !Array.isArray(result.suggestions)) {
    result.suggestions = [String(result.suggestions)];
  }
  if (!result.suggestions) {
    result.suggestions = [];
  }

  // Ensure description exists
  if (!result.description && result.desc) {
    result.description = result.desc;
  }
  if (!result.description) {
    result.description = "";
  }

  return result;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Normalize LLM output to match the expected transcription schema.
 * Local models often use slightly different field names or structures.
 */
function normalizeTranscriptionOutput(raw: Record<string, unknown>): Record<string, unknown> | null {
  try {
    const options = (raw.options ?? raw.arrangements ?? raw.variants) as any[];
    if (!Array.isArray(options) || options.length === 0) return null;

    // Extract analysis from wherever the model put it
    const rawAnalysis = (raw.analysis ?? raw.source_analysis ?? {}) as any;

    const analysis = {
      detectedGenre: rawAnalysis.detectedGenre ?? rawAnalysis.detected_genre ?? rawAnalysis.genre ?? "unknown",
      detectedKey: rawAnalysis.detectedKey ?? rawAnalysis.detected_key ?? rawAnalysis.key ?? "unknown",
      detectedBpm: Number(rawAnalysis.detectedBpm ?? rawAnalysis.detected_bpm ?? rawAnalysis.bpm ?? 120),
      stemSummary: rawAnalysis.stemSummary ?? rawAnalysis.stem_summary ?? {},
    };

    // Ensure stemSummary is Record<string, string>
    if (typeof analysis.stemSummary !== "object") {
      analysis.stemSummary = {};
    }

    const normalizedOptions = options.slice(0, 3).map((opt: any, idx: number) => {
      const modes = ["faithful", "simplified", "creative"] as const;
      const mode = opt.mode ?? opt.style ?? opt.type ?? modes[idx] ?? "faithful";
      const normalizedMode = modes.includes(mode) ? mode : modes[idx] ?? "faithful";

      // Normalize tracks
      const rawTracks = (opt.tracks ?? []) as any[];
      const tracks = rawTracks.map((t: any) => {
        const patterns = (t.patterns ?? [t.pattern]).filter(Boolean).map((p: any) => ({
          name: p.name ?? "Pattern 1",
          bars: Number(p.bars ?? 4),
          notes: (p.notes ?? []).map((n: any) => ({
            pitch: Number(n.pitch ?? 60),
            velocity: Number(n.velocity ?? 100),
            step: Number(n.step ?? 0),
            duration: Number(n.duration ?? 1),
            probability: Number(n.probability ?? 100),
          })),
          swing: Number(p.swing ?? 0),
        }));

        const sound = t.soundPreset ?? t.sound_preset ?? t.sound ?? { name: "Default", category: "Bass", id: 1 };

        return {
          channel: Number(t.channel ?? 1),
          patterns: patterns.length > 0 ? patterns : [{ name: "Pattern 1", bars: 4, notes: [], swing: 0 }],
          soundPreset: {
            name: String(sound.name ?? "Default"),
            category: String(sound.category ?? "Bass"),
            id: Number(sound.id ?? sound.presetId ?? sound.preset_id ?? 1),
          },
          alternativeSounds: ((t.alternativeSounds ?? t.alternative_sounds ?? t.alternatives ?? []) as any[])
            .slice(0, 3)
            .map((s: any) => ({
              name: String(s.name ?? "Default"),
              category: String(s.category ?? "Bass"),
              id: Number(s.id ?? s.presetId ?? 1),
            })),
        };
      });

      return {
        mode: normalizedMode,
        label: opt.label ?? opt.title ?? opt.name ?? `${String(normalizedMode).charAt(0).toUpperCase() + String(normalizedMode).slice(1)} Arrangement`,
        description: opt.description ?? opt.desc ?? opt.summary ?? "",
        bpm: Number(opt.bpm ?? analysis.detectedBpm),
        key: opt.key ?? analysis.detectedKey,
        tracks,
        swing: Number(opt.swing ?? 0),
      };
    });

    // Pad to exactly 3 options if model returned fewer
    while (normalizedOptions.length < 3) {
      const modes = ["faithful", "simplified", "creative"];
      const idx = normalizedOptions.length;
      normalizedOptions.push({
        mode: modes[idx],
        label: `${modes[idx].charAt(0).toUpperCase() + modes[idx].slice(1)} Arrangement`,
        description: "Auto-generated placeholder",
        bpm: analysis.detectedBpm,
        key: analysis.detectedKey,
        tracks: [],
        swing: 0,
      });
    }

    return { options: normalizedOptions, analysis };
  } catch {
    return null;
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
