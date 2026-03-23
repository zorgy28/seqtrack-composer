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
}): Promise<T> {
  const { model, schema, system, prompt, supportsStructuredOutput: structured } = options;

  if (structured) {
    // Use native structured output (Claude supports this)
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      system,
      prompt,
    });
    if (!output) throw new Error("No output generated");
    return output;
  }

  // Fallback: ask for JSON in the prompt, parse manually
  const jsonInstruction = "\n\nIMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation, just the JSON object. The JSON must be parseable by JSON.parse().";

  const { text } = await generateText({
    model,
    system: system + jsonInstruction,
    prompt,
  });

  return extractAndValidateJSON(text, schema);
}

/**
 * Extract JSON from a text response and validate against a Zod schema.
 * Tries multiple extraction strategies.
 */
function extractAndValidateJSON<T>(text: string, schema: ZodType<T>): T {
  const extractors = [
    // Strategy 1: Trim whitespace and parse
    () => JSON.parse(text.trim()),
    // Strategy 2: Extract from ```json ... ``` code fence
    () => {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (!match) throw new Error("No JSON code fence found");
      return JSON.parse(match[1]);
    },
    // Strategy 3: Extract from ``` ... ``` code fence
    () => {
      const match = text.match(/```\s*([\s\S]*?)\s*```/);
      if (!match) throw new Error("No code fence found");
      return JSON.parse(match[1]);
    },
    // Strategy 4: Find first { ... } block (greedy)
    () => {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found");
      return JSON.parse(text.slice(start, end + 1));
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
    `${hint}. Response starts with: "${text.slice(0, 300)}..."`
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

  // Try to normalize the structure to match our expected schema
  const normalized = normalizeTranscriptionOutput(parsed);
  if (normalized) {
    const result = schema.safeParse(normalized);
    if (result.success) return result.data;
  }

  // If the model wrapped everything in an extra layer
  for (const key of Object.keys(parsed)) {
    const inner = parsed[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const result = schema.safeParse(inner);
      if (result.success) return result.data;

      const innerNorm = normalizeTranscriptionOutput(inner as Record<string, unknown>);
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
