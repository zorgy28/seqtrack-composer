export const maxDuration = 300; // 5 minutes for AI vision

import { getModelWithOverride } from "@/lib/ai/model-provider";
import { noteNameToMidi } from "@/lib/midi/note-utils";
import type { ImportResult, ImportedNote } from "@/lib/import/types";

// ---------------------------------------------------------------------------
// POST handler — route by file extension
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const instrument = formData.get("instrument") as string | null;
    const targetChannel = formData.get("targetChannel") as string | null;
    const modelProvider = formData.get("modelProvider") as string | null;
    const modelId = formData.get("modelId") as string | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    console.log(
      `[import-sheet] file=${file.name} size=${buffer.length} ext=${ext}`,
    );

    if (ext === "musicxml" || ext === "xml" || ext === "mxl") {
      return handleMusicXML(buffer, ext, instrument, targetChannel);
    }

    if (ext === "pdf") {
      return handlePDF(
        buffer,
        file.name,
        instrument,
        targetChannel,
        modelProvider,
        modelId,
      );
    }

    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      return handleImage(
        buffer,
        ext,
        instrument,
        targetChannel,
        modelProvider,
        modelId,
      );
    }

    return Response.json(
      { error: `Unsupported file type: ${ext}` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[import-sheet] error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Duration mapping — musical duration name to beats (quarter note = 1 beat)
// ---------------------------------------------------------------------------

const DURATION_BEATS: Record<string, number> = {
  whole: 4,
  "dotted-half": 3,
  half: 2,
  "dotted-quarter": 1.5,
  quarter: 1,
  "dotted-eighth": 0.75,
  eighth: 0.5,
  "16th": 0.25,
  sixteenth: 0.25,
  "32nd": 0.125,
  "64th": 0.0625,
};

// MusicXML <type> values
const MUSICXML_TYPE_BEATS: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "16th": 0.25,
  "32nd": 0.125,
  "64th": 0.0625,
  "128th": 0.03125,
};

/**
 * Convert duration in beats to seconds at a given BPM.
 */
function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

// ---------------------------------------------------------------------------
// MusicXML handler
// ---------------------------------------------------------------------------

async function handleMusicXML(
  buffer: Buffer,
  ext: string,
  instrument: string | null,
  targetChannel: string | null,
): Promise<Response> {
  // Suppress unused parameter warnings
  void instrument;

  let xmlText: string;

  if (ext === "mxl") {
    // MXL files are ZIP archives containing a MusicXML file
    try {
      xmlText = await extractMxl(buffer);
    } catch {
      return Response.json(
        {
          error:
            "Could not decompress .mxl file. Try exporting as .musicxml instead.",
        },
        { status: 400 },
      );
    }
  } else {
    xmlText = buffer.toString("utf-8");
  }

  const notes: ImportedNote[] = [];
  let detectedBpm = 120;
  let detectedKey: string | undefined;
  const channel = targetChannel ? parseInt(targetChannel, 10) : 8;

  // Extract tempo from <sound tempo="...">
  const tempoMatch = xmlText.match(/<sound[^>]+tempo="([^"]+)"/);
  if (tempoMatch) {
    detectedBpm = parseFloat(tempoMatch[1]) || 120;
  }

  // Extract key signature from <key><fifths>...</fifths></key>
  const fifthsMatch = xmlText.match(/<key>\s*<fifths>(-?\d+)<\/fifths>/);
  if (fifthsMatch) {
    const fifths = parseInt(fifthsMatch[1], 10);
    const keyMap: Record<number, string> = {
      [-7]: "Cb",
      [-6]: "Gb",
      [-5]: "Db",
      [-4]: "Ab",
      [-3]: "Eb",
      [-2]: "Bb",
      [-1]: "F",
      [0]: "C",
      [1]: "G",
      [2]: "D",
      [3]: "A",
      [4]: "E",
      [5]: "B",
      [6]: "F#",
      [7]: "C#",
    };
    detectedKey = keyMap[fifths] ?? "C";
    // Check for minor mode
    const modeMatch = xmlText.match(
      /<key>\s*<fifths>-?\d+<\/fifths>\s*<mode>(\w+)<\/mode>/,
    );
    if (modeMatch && modeMatch[1] === "minor") {
      detectedKey += "m";
    }
  }

  // Extract <divisions> (ticks per quarter note)
  const divisionsMatch = xmlText.match(/<divisions>(\d+)<\/divisions>/);
  const divisions = divisionsMatch ? parseInt(divisionsMatch[1], 10) : 1;

  // Parse measures and notes
  const measureRegex = /<measure[^>]*>([\s\S]*?)<\/measure>/g;
  let measureMatch: RegExpExecArray | null;
  let currentBeat = 0; // cumulative beat position

  while ((measureMatch = measureRegex.exec(xmlText)) !== null) {
    const measureContent = measureMatch[1];
    let beatInMeasure = 0;

    // Parse notes within this measure
    const noteRegex = /<note>([\s\S]*?)<\/note>/g;
    let noteMatch: RegExpExecArray | null;

    while ((noteMatch = noteRegex.exec(measureContent)) !== null) {
      const noteXml = noteMatch[1];

      // Check for chord (chord notes share position with previous note)
      const isChord = noteXml.includes("<chord/>");

      // Get duration in divisions
      const durationDivMatch = noteXml.match(/<duration>(\d+)<\/duration>/);
      const durationDivisions = durationDivMatch
        ? parseInt(durationDivMatch[1], 10)
        : divisions;
      const durationBeats = durationDivisions / divisions;

      // Get note type for more precise duration
      const typeMatch = noteXml.match(/<type>([^<]+)<\/type>/);
      let noteDurationBeats = durationBeats;
      if (typeMatch && MUSICXML_TYPE_BEATS[typeMatch[1]]) {
        noteDurationBeats = MUSICXML_TYPE_BEATS[typeMatch[1]];
        // Check for dotted notes
        if (noteXml.includes("<dot/>")) {
          noteDurationBeats *= 1.5;
        }
      }

      // Check if this is a rest
      if (noteXml.includes("<rest")) {
        if (!isChord) {
          beatInMeasure += durationBeats;
        }
        continue;
      }

      // Extract pitch: <pitch><step>C</step><alter>1</alter><octave>4</octave></pitch>
      const stepMatch = noteXml.match(/<step>([A-G])<\/step>/);
      const octaveMatch = noteXml.match(/<octave>(\d+)<\/octave>/);
      const alterMatch = noteXml.match(/<alter>(-?\d+)<\/alter>/);

      if (!stepMatch || !octaveMatch) {
        if (!isChord) {
          beatInMeasure += durationBeats;
        }
        continue;
      }

      const step = stepMatch[1];
      const octave = parseInt(octaveMatch[1], 10);
      const alter = alterMatch ? parseInt(alterMatch[1], 10) : 0;

      // Build note name
      let noteName = step;
      if (alter === 1) noteName += "#";
      else if (alter === -1) noteName += "b";
      noteName += octave;

      let midi: number;
      try {
        midi = noteNameToMidi(noteName);
      } catch {
        if (!isChord) {
          beatInMeasure += durationBeats;
        }
        continue;
      }

      // Velocity from <dynamics> or default
      const dynamicsMatch = noteXml.match(/<dynamics>(\d+)<\/dynamics>/);
      const velocity = dynamicsMatch
        ? Math.min(
            127,
            Math.max(1, Math.round(parseFloat(dynamicsMatch[1]) * 1.27)),
          )
        : 80;

      const beatPosition = isChord
        ? currentBeat + beatInMeasure - durationBeats
        : currentBeat + beatInMeasure;

      notes.push({
        pitch: midi,
        velocity,
        time: beatsToSeconds(beatPosition, detectedBpm),
        duration: beatsToSeconds(noteDurationBeats, detectedBpm),
        channel,
      });

      if (!isChord) {
        beatInMeasure += durationBeats;
      }
    }

    // Advance to next measure
    currentBeat += beatInMeasure;
  }

  // Sort notes by time for consistent output
  notes.sort((a, b) => a.time - b.time);

  const result: ImportResult = {
    notes,
    bpm: detectedBpm,
    key: detectedKey,
    name: extractTitle(xmlText),
    channels: [...new Set(notes.map((n) => n.channel ?? channel))],
  };

  console.log(
    `[import-sheet/musicxml] parsed ${notes.length} notes, bpm=${detectedBpm}, key=${detectedKey}`,
  );

  return Response.json(result);
}

/**
 * Extract title from MusicXML <work-title> or <movement-title>.
 */
function extractTitle(xml: string): string | undefined {
  const workTitle = xml.match(/<work-title>([^<]+)<\/work-title>/);
  if (workTitle) return workTitle[1].trim();
  const movementTitle = xml.match(
    /<movement-title>([^<]+)<\/movement-title>/,
  );
  if (movementTitle) return movementTitle[1].trim();
  return undefined;
}

// ---------------------------------------------------------------------------
// PDF handler — Docling first, then AI vision fallback
// ---------------------------------------------------------------------------

async function handlePDF(
  buffer: Buffer,
  fileName: string,
  instrument: string | null,
  targetChannel: string | null,
  modelProvider: string | null,
  modelId: string | null,
): Promise<Response> {
  // Step 1: Try Docling API for text/structure extraction
  let doclingMarkdown: string | null = null;

  try {
    const doclingForm = new FormData();
    doclingForm.append(
      "files",
      new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
      fileName,
    );
    doclingForm.append("to_formats", "md");

    console.log("[import-sheet/pdf] trying Docling API...");

    const doclingRes = await fetch(
      "https://docling.taktik.net/v1/convert/file",
      {
        method: "POST",
        headers: {
          "X-Api-Key": "GIgKjX+a6gP41fRuOsSrGrveqeV+afhY4rWFcjQ0F2g=",
        },
        body: doclingForm,
        signal: AbortSignal.timeout(60_000), // 60 second timeout for Docling
      },
    );

    if (doclingRes.ok) {
      const doclingData = await doclingRes.json();
      // Docling returns various response shapes depending on version
      if (typeof doclingData === "string") {
        doclingMarkdown = doclingData;
      } else if (doclingData?.document?.[0]?.md_content) {
        doclingMarkdown = doclingData.document[0].md_content;
      } else if (doclingData?.md_content) {
        doclingMarkdown = doclingData.md_content;
      } else if (doclingData?.content) {
        doclingMarkdown = String(doclingData.content);
      } else {
        // Try to extract markdown from any string field
        doclingMarkdown = JSON.stringify(doclingData);
      }
      console.log(
        `[import-sheet/pdf] Docling returned ${doclingMarkdown?.length ?? 0} chars`,
      );
    } else {
      console.warn(
        `[import-sheet/pdf] Docling returned ${doclingRes.status}: ${await doclingRes.text().catch(() => "")}`,
      );
    }
  } catch (err) {
    console.warn("[import-sheet/pdf] Docling failed:", err);
  }

  // Step 2: Try to parse note sequences from Docling markdown
  if (doclingMarkdown) {
    const notesFromDocling = parseNotesFromMarkdown(
      doclingMarkdown,
      targetChannel,
    );
    if (notesFromDocling.notes.length > 0) {
      console.log(
        `[import-sheet/pdf] extracted ${notesFromDocling.notes.length} notes from Docling markdown`,
      );
      return Response.json(notesFromDocling);
    }
    console.log(
      "[import-sheet/pdf] no notes found in Docling output, falling through to AI vision",
    );
  }

  // Step 3: Fall through to AI vision
  const base64 = buffer.toString("base64");
  return transcribeWithVision(
    base64,
    "pdf",
    instrument,
    targetChannel,
    modelProvider,
    modelId,
    doclingMarkdown,
  );
}

// ---------------------------------------------------------------------------
// Image handler — AI vision directly
// ---------------------------------------------------------------------------

async function handleImage(
  buffer: Buffer,
  ext: string,
  instrument: string | null,
  targetChannel: string | null,
  modelProvider: string | null,
  modelId: string | null,
): Promise<Response> {
  const base64 = buffer.toString("base64");
  return transcribeWithVision(
    base64,
    ext,
    instrument,
    targetChannel,
    modelProvider,
    modelId,
    null,
  );
}

// ---------------------------------------------------------------------------
// AI Vision transcription — shared by PDF fallback and image handler
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

interface VisionNote {
  pitch?: string;
  duration?: string;
  beat?: number;
  rest?: boolean;
  velocity?: number;
}

interface VisionResponse {
  notes?: VisionNote[];
  key?: string;
  time_signature?: string;
  tempo?: number;
  bpm?: number;
  title?: string;
}

async function transcribeWithVision(
  base64Data: string,
  ext: string,
  instrument: string | null,
  targetChannel: string | null,
  modelProvider: string | null,
  modelId: string | null,
  doclingContext: string | null,
): Promise<Response> {
  const { generateText } = await import("ai");
  const model = getModelWithOverride(
    modelProvider ?? undefined,
    modelId ?? undefined,
  );
  const channel = targetChannel ? parseInt(targetChannel, 10) : 8;
  const mimeType = MIME_TYPES[ext] ?? "image/png";

  const instrumentHint = instrument ? `\nThis is a ${instrument} part.` : "";

  const doclingHint = doclingContext
    ? `\n\nAdditional text extracted from this document:\n${doclingContext.slice(0, 2000)}`
    : "";

  const prompt = `Transcribe this sheet music into a JSON object with the following structure:
{
  "notes": [
    {"pitch": "C4", "duration": "quarter", "beat": 1.0},
    {"pitch": "E4", "duration": "eighth", "beat": 2.0, "velocity": 100}
  ],
  "key": "C",
  "time_signature": "4/4",
  "tempo": 120,
  "title": "Optional Title"
}

Rules:
- pitch: note name with octave (e.g. "C4", "F#5", "Bb3")
- duration: whole, half, quarter, eighth, sixteenth, dotted-half, dotted-quarter, dotted-eighth
- beat: beat position starting from 1.0 (1.0 = beat 1, 1.5 = eighth note after beat 1, 2.0 = beat 2, etc.)
  Beat numbers restart at 1.0 for each new measure. Use a running total across all measures.
  So measure 1 starts at beat 1.0, measure 2 (in 4/4) starts at beat 5.0, etc.
- velocity: optional, 1-127 (default 80). Use dynamics markings if visible (pp=40, p=60, mp=70, mf=85, f=100, ff=120)
- For rests: {"rest": true, "duration": "quarter", "beat": 2.0}
- Detect key signature, time signature, and tempo if visible
- Return JSON only, no explanation${instrumentHint}${doclingHint}`;

  console.log(
    `[import-sheet/vision] sending to AI, provider=${modelProvider ?? "claude"}, model=${modelId ?? "default"}`,
  );

  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: `data:${mimeType};base64,${base64Data}`,
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  // Parse AI response
  const parsed = extractJSON<VisionResponse>(text);
  if (!parsed) {
    return Response.json(
      {
        error: "Could not parse AI vision response",
        raw: text.slice(0, 500),
      },
      { status: 500 },
    );
  }

  const bpm = parsed.tempo ?? parsed.bpm ?? 120;
  const visionNotes = convertVisionNotes(parsed.notes ?? [], bpm, channel);

  const result: ImportResult = {
    notes: visionNotes,
    bpm,
    key: parsed.key,
    name: parsed.title,
    channels: [...new Set(visionNotes.map((n) => n.channel ?? channel))],
  };

  console.log(
    `[import-sheet/vision] transcribed ${visionNotes.length} notes, bpm=${bpm}, key=${parsed.key}`,
  );

  return Response.json(result);
}

// ---------------------------------------------------------------------------
// Convert AI vision note objects to ImportedNote[]
// ---------------------------------------------------------------------------

function convertVisionNotes(
  visionNotes: VisionNote[],
  bpm: number,
  channel: number,
): ImportedNote[] {
  const notes: ImportedNote[] = [];

  for (const vn of visionNotes) {
    if (vn.rest) continue;
    if (!vn.pitch) continue;

    let midi: number;
    try {
      midi = noteNameToMidi(vn.pitch);
    } catch {
      console.warn(
        `[import-sheet/vision] skipping unrecognized pitch: ${vn.pitch}`,
      );
      continue;
    }

    const durationName = (vn.duration ?? "quarter").toLowerCase();
    const durationInBeats = DURATION_BEATS[durationName] ?? 1;
    const durationSec = beatsToSeconds(durationInBeats, bpm);

    // Beat is 1-based, convert to 0-based seconds
    const beatPos = (vn.beat ?? 1) - 1; // 0-indexed
    const timeSec = beatsToSeconds(beatPos, bpm);

    const velocity = Math.max(1, Math.min(127, vn.velocity ?? 80));

    notes.push({
      pitch: midi,
      velocity,
      time: timeSec,
      duration: durationSec,
      channel,
    });
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Parse notes from Docling markdown
// ---------------------------------------------------------------------------

function parseNotesFromMarkdown(
  markdown: string,
  targetChannel: string | null,
): ImportResult {
  const channel = targetChannel ? parseInt(targetChannel, 10) : 8;
  const notes: ImportedNote[] = [];
  let bpm = 120;
  let detectedKey: string | undefined;

  // Look for tempo markings
  const tempoMatch = markdown.match(/(?:tempo|bpm)\s*[=:]\s*(\d+)/i);
  if (tempoMatch) {
    bpm = parseInt(tempoMatch[1], 10) || 120;
  }

  // Look for key signature mentions
  const keyMatch = markdown.match(
    /(?:key|tonality)\s*[=:of]*\s*([A-G][#b]?\s*(?:major|minor|maj|min)?)/i,
  );
  if (keyMatch) {
    detectedKey = keyMatch[1].trim();
  }

  // Try to find tabular note data first (more precise)
  // Pattern: "| C4 | quarter | 1.0 |"
  const tableRowPattern =
    /\|\s*([A-G][#b]?\d)\s*\|\s*(whole|half|quarter|eighth|sixteenth|16th|32nd)\s*\|\s*([\d.]+)\s*\|/gi;
  let match: RegExpExecArray | null;

  while ((match = tableRowPattern.exec(markdown)) !== null) {
    try {
      const midi = noteNameToMidi(match[1]);
      const durName = match[2].toLowerCase();
      const beat = parseFloat(match[3]);
      const durBeats = DURATION_BEATS[durName] ?? 1;

      notes.push({
        pitch: midi,
        velocity: 80,
        time: beatsToSeconds(beat - 1, bpm),
        duration: beatsToSeconds(durBeats, bpm),
        channel,
      });
    } catch {
      // skip invalid
    }
  }

  // If no tabular data, try space-separated note names
  if (notes.length === 0) {
    const noteNamePattern = /\b([A-G][#b]?\d)\b/g;
    let beatCounter = 0;

    while ((match = noteNamePattern.exec(markdown)) !== null) {
      try {
        const midi = noteNameToMidi(match[1]);
        notes.push({
          pitch: midi,
          velocity: 80,
          time: beatsToSeconds(beatCounter, bpm),
          duration: beatsToSeconds(1, bpm), // default quarter note
          channel,
        });
        beatCounter += 1;
      } catch {
        // skip invalid note names
      }
    }
  }

  return {
    notes,
    bpm,
    key: detectedKey,
    channels: notes.length > 0 ? [channel] : [],
  };
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------

function extractJSON<T>(text: string): T | null {
  // Strip thinking tags
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  const strategies: (() => unknown)[] = [
    () => JSON.parse(cleaned),
    () => {
      const m = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
      if (!m) throw new Error("no json fence");
      return JSON.parse(m[1]);
    },
    () => {
      const m = cleaned.match(/```\s*([\s\S]*?)\s*```/);
      if (!m) throw new Error("no fence");
      return JSON.parse(m[1]);
    },
    () => {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end <= start) throw new Error("no object");
      return cleaned.slice(start, end + 1);
    },
  ];

  for (const strategy of strategies) {
    try {
      const result = strategy();
      // The last strategy returns a string, so parse it
      if (typeof result === "string") {
        return JSON.parse(result) as T;
      }
      return result as T;
    } catch {
      continue;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// MXL (compressed MusicXML) extraction — minimal ZIP handling via Node zlib
// ---------------------------------------------------------------------------

/**
 * Extract the MusicXML content from an MXL (ZIP) file.
 * MXL files are ZIP archives that contain a META-INF/container.xml
 * pointing to the root MusicXML file. We do a simplified extraction
 * by finding the largest XML file in the archive.
 */
async function extractMxl(buffer: Buffer): Promise<string> {
  const { inflateRawSync } = await import("zlib");

  // Minimal ZIP parser — find local file headers and extract entries
  const entries: { name: string; data: string }[] = [];
  let offset = 0;

  while (offset < buffer.length - 4) {
    // Local file header signature = 0x04034b50
    if (
      buffer[offset] === 0x50 &&
      buffer[offset + 1] === 0x4b &&
      buffer[offset + 2] === 0x03 &&
      buffer[offset + 3] === 0x04
    ) {
      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      // suppress unused warning
      void uncompressedSize;
      const nameLength = buffer.readUInt16LE(offset + 26);
      const extraLength = buffer.readUInt16LE(offset + 28);

      const name = buffer
        .subarray(offset + 30, offset + 30 + nameLength)
        .toString("utf-8");
      const dataStart = offset + 30 + nameLength + extraLength;

      // Only process XML files
      if (name.endsWith(".xml") || name.endsWith(".musicxml")) {
        const rawData = buffer.subarray(dataStart, dataStart + compressedSize);

        let content: string;
        if (compressionMethod === 0) {
          // Stored (no compression)
          content = rawData.toString("utf-8");
        } else if (compressionMethod === 8) {
          // Deflated
          const decompressed = inflateRawSync(Buffer.from(rawData));
          content = decompressed.toString("utf-8");
        } else {
          offset = dataStart + compressedSize;
          continue;
        }

        entries.push({ name, data: content });

        // If this is clearly the main score file, return it immediately
        if (
          content.length > 500 &&
          !name.includes("META-INF") &&
          content.includes("<score-partwise")
        ) {
          return content;
        }
      }

      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }

  // If we didn't find a definitive score, return the largest XML entry
  // that looks like MusicXML
  const musicXmlEntries = entries.filter(
    (e) =>
      e.data.includes("<score-partwise") ||
      e.data.includes("<score-timewise"),
  );

  if (musicXmlEntries.length > 0) {
    return musicXmlEntries.sort((a, b) => b.data.length - a.data.length)[0]
      .data;
  }

  // Last resort: return the largest XML entry
  if (entries.length > 0) {
    return entries.sort((a, b) => b.data.length - a.data.length)[0].data;
  }

  throw new Error("No MusicXML content found in .mxl archive");
}
