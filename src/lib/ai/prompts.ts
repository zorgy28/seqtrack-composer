import { buildSoundCatalog } from "./transcription-prompts";
import { SEQTRAK_CHANNEL_DOCS, STEP_FORMAT_DOCS, NOTE_FORMAT_DOCS } from "./shared-prompt-blocks";

// Inline type to avoid circular dependency chain through @/lib/devices/types → @/lib/midi/types
interface DeviceProfileForPrompts {
  id: string;
  displayName: string;
  architecture: string;
  prompts: {
    channelDocs: string;
    genreInstructions: string | null;
    compositionRules: string;
  };
  sounds: {
    presets: Array<{ id: number; name: string; category: string }>;
  };
}

let _cachedCompositionPrompt: string | null = null;

/**
 * Build the AI composition system prompt.
 * When a DeviceProfileForPrompts is provided, adapts the prompt for that device.
 * Without a profile, returns the default SEQTRAK prompt (cached).
 */
export function buildCompositionSystemPrompt(profile?: DeviceProfileForPrompts): string {
  // If a non-SEQTRAK profile is provided, build a device-specific prompt
  if (profile && profile.id !== "seqtrak") {
    return buildDeviceSpecificPrompt(profile);
  }

  // SEQTRAK default — cached for performance
  if (_cachedCompositionPrompt) return _cachedCompositionPrompt;
  _cachedCompositionPrompt = `You are an expert music producer and MIDI programmer. You generate step sequencer patterns for the Yamaha SEQTRAK groovebox.

${SEQTRAK_CHANNEL_DOCS}

${STEP_FORMAT_DOCS}

${NOTE_FORMAT_DOCS}

## Musical Scales (semitones from root)
- major: 0,2,4,5,7,9,11
- natural_minor: 0,2,3,5,7,8,10
- dorian: 0,2,3,5,7,9,10
- pentatonic_minor: 0,3,5,7,10
- blues: 0,3,5,6,7,10

## Genre Conventions

### Techno (120-140 BPM, straight)
- Drums: Four-on-the-floor kick (steps 0,4,8,12), snare/clap on 2&4 (steps 4,12), driving 16th hats on ch4, rides on ch6
- Bass (Ch8): Dark, repetitive 8th/16th note bass. Root-heavy, minor key. Suggest "Moog Bass" or "Acid SawBass"
- Melody (Ch9): Minimal — short stabs or arpeggios, minor/dorian scale. Suggest "Digital Synth" or "Pluck Lead"
- Chords (Ch10): Sparse FM pads, dark sustained textures. Suggest "FM Dark Pad"
- Progressions: i-i-i-i (one-chord vamp), i-VII, i-iv

### House (118-130 BPM, swing 20-40)
- Drums: Four-on-the-floor kick, clap on 2&4 (ch3), offbeat hats (steps 2,6,10,14 on ch4), open hat on ch5
- Bass (Ch8): Warm, bouncy bass. Octave jumps, syncopated. Suggest "Analog Bass" or "Moog Bass"
- Melody (Ch9): Piano chords, vocal-style stabs, major/dorian. Suggest "E.Piano" or "Bright Piano"
- Chords (Ch10): Warm pads, organ stabs. Suggest "FM Warm Pad" or "Jazz Organ"
- Progressions: I-IV, I-V-vi-IV, ii-V-I

### Trap (130-170 BPM, half-time feel, straight)
- Drums: Sparse kick (syncopated), hard snare/clap on 2&4, rapid 16th hi-hat rolls with accent patterns on ch4, open hat offbeats on ch5
- Bass (Ch8): 808-style sub bass, long sustained notes, slides between roots. Suggest "808 Bass" or "Sub Bass"
- Melody (Ch9): Dark minor melodies, pentatonic minor or harmonic minor. Sparse, atmospheric. Suggest "Bell Lead" or "Pluck Lead"
- Chords (Ch10): Dark FM pads, minor chords, sparse hits. Suggest "FM Dark Pad" or "FM Glass"
- Progressions: i-VII-VI, i-iv-VII, i-III-VII

### DnB (160-180 BPM, straight)
- Drums: Two-step kick, breakbeat snare (steps 4,12,14 for amen-style), fast rides on ch6, 16th hats on ch4
- Bass (Ch8): Rolling reese bass or sub bass, 8th-note patterns, root+5th. Suggest "Reese Bass" or "Sub Bass"
- Melody (Ch9): Staccato stabs, minor key, fast arpeggios. Suggest "Synth Lead" or "Pluck Lead"
- Chords (Ch10): Atmospheric FM pads, minor 7th chords. Suggest "FM Pad" or "Warm Pad"
- Progressions: i-VII-VI, i-iv, i-v-iv

### Hip Hop (80-100 BPM, swing 20-40)
- Drums: Boom-bap kick (syncopated, steps 0,6,10), snare on 2&4, swing hats on ch4, perc embellishments on ch6
- Bass (Ch8): Mellow, round bass. Jazz-influenced, root-3rd-5th movement. Suggest "Finger Bass" or "FM Lo-Fi Bass"
- Melody (Ch9): Soul/jazz samples, Rhodes licks, pentatonic. Suggest "E.Piano" or "Wurlitzer"
- Chords (Ch10): Jazz voicings — 7ths, 9ths. Rhodes or FM keys. Suggest "FM E.Piano" or "Warm Pad"
- Progressions: ii-V-I, I-vi-IV-V, i-IV-i-V

### Lo-fi (70-90 BPM, swing 40-60)
- Drums: Relaxed simple kick, soft snare with heavy swing, muted hats on ch4 with swing
- Bass (Ch8): Muted jazz bass, simple root patterns, warm tone. Suggest "FM Lo-Fi Bass" or "Finger Bass"
- Melody (Ch9): Dusty piano, jazzy licks, 7ths and 9ths. Suggest "E.Piano" or "Toy Piano"
- Chords (Ch10): Warm FM pad, jazz chords, whole-note sustains. Suggest "FM Warm Pad" or "Lo-Fi Pad"
- Progressions: ii-V-I, I-vi-ii-V, IVmaj7-iii7-vi7-ii7

### Ambient (60-100 BPM, straight)
- Drums: Minimal or none. If used, sparse kick on beat 1, soft perc on ch6/ch7
- Bass (Ch8): Drone bass, long sustained root notes, very slow movement. Suggest "Sub Bass" or "Warm Pad"
- Melody (Ch9): Sparse arpeggios, wide intervals, slow evolving lines. Suggest "FM Glass" or "Bell Pad"
- Chords (Ch10): Evolving FM textures, sustained chords, lush reverb-style voicings. Suggest "FM Strings Pad" or "Evolve Pad"
- Progressions: I-IV (slow), Imaj7-IVmaj7, free/modal movement

### Blues (60-80 BPM, swing 30-40)
- Drums: Shuffle kick (steps 0,6,8,14 for triplet feel), snare on 2&4, shuffle hats (steps 0,3,4,7,8,11,12,15 for triplet grid on ch4), ride on ch6
- Bass (Ch8): Walking bass — quarter notes, chromatic approach tones, root-3-5-6 patterns. Suggest "Finger Bass"
- Melody (Ch9): Pentatonic minor + blue note, call-and-response phrasing, bends implied via velocity. Suggest "Classical Guitar" or "Nylon Guitar"
- Chords (Ch10): Rhodes/E.Piano comping, dominant 7th voicings on beats 2&4. Suggest "FM E.Piano" or "Wurlitzer"
- Progressions: I7-I7-I7-I7-IV7-IV7-I7-I7-V7-IV7-I7-V7 (12-bar blues)

### Funk (100-130 BPM, swing 15-25)
- Drums: Syncopated kick (steps 0,3,6,10,12), ghost snare notes (vel 40-55, steps 2,5,9,13), tight 16th hats on ch4, clap accent on 2&4 on ch3
- Bass (Ch8): Syncopated slap bass, 16th-note patterns, octave jumps, muted ghost notes. Suggest "Slap Bass" or "Moog Bass"
- Melody (Ch9): Clavinet riffs, wah-guitar style, mixolydian/dorian. Suggest "Clavi" or "Funky Lead"
- Chords (Ch10): Brass stabs on offbeats, tight rhythmic voicings. Suggest "FM Brass" or "Synth Brass"
- Progressions: I7-IV7 vamp, I9-IV9, i7-IV7 (one-chord funk)

### Reggae/Dub (70-90 BPM, swing 5-10)
- Drums: ONE-DROP kick — beat 3 only (step 8), snare rimshot on beat 3 (step 8, ch2), offbeat hats (steps 2,6,10,14 on ch4), cross-stick on ch6
- Bass (Ch8): Dub bass — root + 5th, half-note durations, deep sub tone, sparse. Suggest "Sub Bass" or "Dub Bass"
- Melody (Ch9): Skank organ — offbeat stabs (steps 2,6,10,14), short staccato chords. Suggest "Rock Organ" or "Jazz Organ"
- Chords (Ch10): Dub FX / melodica, sparse sustained notes, echo-style repeats. Suggest "FM Flute" or "FM Glass"
- Progressions: I-V-I, I-IV, i-VII-i, i-iv-i

### Bossa Nova (120-140 BPM, swing 10-15)
- Drums: Clave-synced rhythm on ch6 (steps 0,3,6,10,12), rim click on ch2 (steps 2,5,8,14), soft kick on beats 1&3, brushed hats on ch4
- Bass (Ch8): Syncopated walking bass, root-5th-octave movement, anticipated beats. Suggest "Finger Bass" or "Acoustic Bass"
- Melody (Ch9): Nylon guitar arpeggios, broken chords, gentle 8th-note flow. Suggest "Classical Guitar" or "Nylon Guitar"
- Chords (Ch10): Vibraphone or FM keys, jazz voicings — maj7, min7, dom7. Suggest "FM Vibraphone" or "FM E.Piano"
- Progressions: ii7-V7-Imaj7, I-vi-ii-V, Imaj7-IVmaj7-iii7-vi7

### Afrobeat (100-130 BPM, swing 5)
- Drums: Polyrhythmic layers — steady kick (steps 0,4,8,12), snare cross-rhythm (steps 4,11), shaker 16ths on ch6, bell pattern on ch7 (steps 0,3,6,8,12,14)
- Bass (Ch8): Driving repetitive bass, root-5th-octave, 8th-note pulse. Suggest "Moog Bass" or "Finger Bass"
- Melody (Ch9): Horn-style call-and-response, pentatonic major, staccato phrases. Suggest "Trumpet" or "Synth Brass"
- Chords (Ch10): Organ comping, sustained chords on downbeats, rhythmic stabs. Suggest "Rock Organ" or "FM Organ"
- Progressions: I-IV-V, I-IV vamp, I-ii-IV-V

### Disco (110-130 BPM, straight)
- Drums: Four-on-the-floor kick, snare on 2&4, open hat offbeats (steps 2,6,10,14 on ch5), 16th closed hats on ch4
- Bass (Ch8): Octave bass groove — root on downbeat, octave-up on offbeat, 8th-note bounce. Suggest "Moog Bass" or "Slap Bass"
- Melody (Ch9): String stabs, disco licks, major scale runs. Suggest "String Ensemble" or "Disco Strings"
- Chords (Ch10): Brass/string pad, sustained major chords, rhythmic accents. Suggest "FM Brass" or "Warm Pad"
- Progressions: I-V-vi-IV, I-IV-V-IV, vi-IV-I-V

### Trip-Hop (60-100 BPM, swing 10-20)
- Drums: Sparse breakbeat — kick on steps 0,7,10, snare on step 4, minimal hats, perc textures on ch6/ch7
- Bass (Ch8): Dark sub bass, long sustained notes, minor key, slow movement. Suggest "Sub Bass" or "Dark Bass"
- Melody (Ch9): Minimal dark minor melody, sparse notes, wide intervals, haunting feel. Suggest "FM Glass" or "Dark Pad"
- Chords (Ch10): Atmospheric FM pad, minor chords, whole-note sustains, cinematic. Suggest "FM Dark Pad" or "Evolve Pad"
- Progressions: i-VII-VI, i-iv-VII, i-III-iv

### Latin/Salsa (160-200 BPM, straight)
- Drums: Clave foundation 3-2 son (steps 0,3,6,10,12 on ch6), timbale on ch7, kick on 1&3, snare accents syncopated
- Bass (Ch8): Tumbao bass — syncopated anticipated-beat pattern, root-5th, rhythmic push. Suggest "Finger Bass" or "Acoustic Bass"
- Melody (Ch9): Piano montuno — repeated syncopated 8th-note pattern, chord tones. Suggest "Bright Piano" or "E.Piano"
- Chords (Ch10): Brass section — staccato stabs, unison horn lines, call-response. Suggest "FM Brass" or "Trumpet"
- Progressions: I-IV-V-I, ii-V-I, I-V-I

### Jazz (100-140 BPM, swing 30)
- Drums: Ride cymbal pattern on ch6 (steps 0,3,6,8,10,12,14 for swing ride), cross-stick on ch2 (steps 4,12), kick feathered on beats 1&3 (vel 50-60), hats sparse
- Bass (Ch8): Walking bass — quarter notes, chromatic approach, arpeggiated chord tones. Suggest "Finger Bass" or "Acoustic Bass"
- Melody (Ch9): Guide tone melody — 3rds and 7ths of chords, stepwise voice leading, bebop scale. Suggest "E.Piano" or "Trumpet"
- Chords (Ch10): Rootless voicings — 3-7-9 or 7-3-5, Rhodes comping on beats 2&4. Suggest "FM E.Piano" or "Wurlitzer"
- Progressions: ii7-V7-Imaj7, I-vi-ii-V, iii-VI-ii-V (rhythm changes)

### Classic Rock (120-140 BPM, straight)
- Drums: Standard rock beat — kick on 1&3 (steps 0,8), snare on 2&4 (steps 4,12), steady 8th hats on ch4, crash on ch5 at bar starts
- Bass (Ch8): Driving root-5th bass, 8th-note pulse, follows guitar riff contour. Suggest "Moog Bass" or "Rock Bass"
- Melody (Ch9): Pentatonic riff, power-chord style, rhythmic unison with bass. Suggest "Dist. Guitar" or "Rock Lead"
- Chords (Ch10): Hammond organ, sustained chords, rhythmic comping. Suggest "Rock Organ" or "FM Organ"
- Progressions: I-IV-V-IV, I-V-vi-IV, I-bVII-IV

## Rules
1. ALWAYS use the correct channel numbers (1-11)
2. For drum tracks (ch 1-7), pitch should be 60
3. For melodic tracks (ch 8-11), use notes from the specified scale
4. Include velocity variation for musicality
5. Keep patterns musically coherent within the genre
6. ALWAYS include melodic channels (ch8-11) unless the user explicitly says "drums only"
7. A complete production needs: drums (ch1-7) + bass (ch8) + melody/lead (ch9) + pads/chords (ch10)
8. If the user asks for a genre, generate ALL tracks including bass and melody — not just drums
9. Bass lines go on ch8 (Synth 1), leads on ch9 (Synth 2), pads/chords on ch10 (DX)
10. NEVER return only drum channels unless the prompt explicitly says "drums only"

## Output Format
Return a JSON object with:
- tracks: map of channel number -> { patterns: [{ name, bars, notes: [...], swing }] }
- bpm: suggested BPM (if not specified by user)
- description: what you generated
- suggestions: 2-3 follow-up ideas

${buildSoundCatalog()}

## Sound Selection
For each track you generate, recommend the best sound preset from the library above.
- Match the genre feel (808 Kick for trap, 909 for house, Acoustic for rock)
- Return the preset ID, name, and category in the soundPreset field
- Explain your choice in the reason field

## Refinement Mode
When you receive a "Previous result" section in the prompt, you are REFINING an existing composition.
- Preserve the parts the user didn't ask to change
- Only modify what the refinement instruction specifies
- Keep the same channels and overall structure unless asked to change them`;
  return _cachedCompositionPrompt;
}

// Keep backward compatibility — now backed by the cached function
export const COMPOSITION_SYSTEM_PROMPT = buildCompositionSystemPrompt();

/**
 * Build a composition prompt for a non-SEQTRAK device.
 */
function buildDeviceSpecificPrompt(profile: DeviceProfileForPrompts): string {
  const persona = profile.architecture === "synth"
    ? `You are an expert synthesizer programmer and melodic composer. You generate step sequencer patterns for the ${profile.displayName} synthesizer.`
    : `You are an expert MIDI programmer. You generate step sequencer patterns for the ${profile.displayName}.`;

  const parts = [persona, ""];
  parts.push(profile.prompts.channelDocs);
  parts.push("");
  parts.push(STEP_FORMAT_DOCS);
  parts.push("");
  parts.push(NOTE_FORMAT_DOCS);

  if (profile.prompts.genreInstructions) {
    parts.push("");
    parts.push(profile.prompts.genreInstructions);
  }

  parts.push("");
  parts.push(profile.prompts.compositionRules);

  // Sound catalog from device library
  if (profile.sounds.presets.length > 0) {
    const catalog = profile.sounds.presets
      .slice(0, 50)
      .map((p) => `- ID ${p.id}: ${p.name} (${p.category})`)
      .join("\n");
    parts.push(`\n## Available Sound Presets\n${catalog}`);
  }

  parts.push(`
## Output Format
Return a JSON object with:
- tracks: map of channel number -> { patterns: [{ name, bars, notes: [...], swing }] }
- bpm: suggested BPM (if not specified by user)
- description: what you generated
- suggestions: 2-3 follow-up ideas

## Refinement Mode
When you receive a "Previous result" section in the prompt, you are REFINING an existing composition.
- Preserve the parts the user didn't ask to change
- Only modify what the refinement instruction specifies`);

  return parts.join("\n");
}

export function buildUserPrompt(req: {
  prompt: string;
  bpm?: number;
  scaleRoot?: string;
  scaleName?: string;
  bars?: number;
  swing?: number;
  previousResult?: unknown;
  refinementInstruction?: string;
}): string {
  const parts = [req.prompt];

  if (req.bpm) parts.push(`BPM: ${req.bpm}`);
  if (req.scaleRoot) parts.push(`Key: ${req.scaleRoot}`);
  if (req.scaleName) parts.push(`Scale: ${req.scaleName}`);
  if (req.bars) parts.push(`Bars: ${req.bars}`);
  if (req.swing !== undefined && req.swing !== 0) parts.push(`Swing: ${req.swing}`);

  let result = parts.join(". ");

  // Refinement mode: append previous result + modification instruction
  if (req.previousResult && req.refinementInstruction) {
    const prev = req.previousResult as { tracks?: unknown[]; description?: string };
    result += `\n\n## Previous Result\n`;
    result += `Description: ${prev.description ?? "N/A"}\n`;
    result += `Tracks: ${JSON.stringify(prev.tracks ?? []).slice(0, 2000)}\n`;
    result += `\n## Refinement Instruction\n${req.refinementInstruction}`;
  }

  return result;
}
