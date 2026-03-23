import type { SeqtrackChannel, SoundPreset } from "@/lib/midi/types";
import { getPresetsForChannel } from "@/lib/midi/sound-library";
import type { SoundRecommendation } from "./types";

// ---- Helpers --------------------------------------------------------

function presetToRecommendation(preset: SoundPreset): SoundRecommendation {
  return {
    name: preset.name,
    category: preset.category,
    id: preset.id,
  };
}

function findPresetById(id: number, presets: SoundPreset[]): SoundPreset | undefined {
  return presets.find((p) => p.id === id);
}

function fallbackForChannel(channel: SeqtrackChannel, presets: SoundPreset[]): SoundRecommendation {
  const first = presets[0];
  if (first) return presetToRecommendation(first);
  // Ultimate fallback — should never happen for channels 1-10
  return { name: "Default", category: "Bass", id: 1 };
}

// ---- Genre → preset ID maps ----------------------------------------

// Kick (channel 1)
const KICK_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 4,  alts: [7, 3] },       // 808 Kick, Sub Kick, Deep Kick
  "hip hop": { primary: 3,  alts: [4, 7] },       // Deep Kick, 808 Kick, Sub Kick
  hiphop:    { primary: 3,  alts: [4, 7] },
  house:     { primary: 5,  alts: [6, 1] },       // 909 Kick, Punchy Kick, Acoustic
  techno:    { primary: 10, alts: [5, 9] },       // Techno Kick, 909 Kick, Distorted
  dnb:       { primary: 6,  alts: [9, 5] },       // Punchy Kick, Distorted, 909
  lofi:      { primary: 8,  alts: [3, 1] },       // Lo-Fi Kick, Deep Kick, Acoustic
  "lo-fi":   { primary: 8,  alts: [3, 1] },
  rock:      { primary: 1,  alts: [2, 6] },       // Acoustic, Tight, Punchy
  pop:       { primary: 2,  alts: [1, 6] },       // Tight, Acoustic, Punchy
  jazz:      { primary: 1,  alts: [2, 3] },       // Acoustic, Tight, Deep
  default:   { primary: 1,  alts: [2, 5] },       // Acoustic Kick, Tight, 909
};

// Snare (channel 2)
const SNARE_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 125, alts: [123, 124] },  // Trap Snare, 808, 909
  "hip hop": { primary: 123, alts: [125, 121] },  // 808 Snare, Trap, Acoustic
  hiphop:    { primary: 123, alts: [125, 121] },
  house:     { primary: 124, alts: [122, 121] },  // 909 Snare, Tight, Acoustic
  techno:    { primary: 124, alts: [122, 125] },  // 909, Tight, Trap
  dnb:       { primary: 122, alts: [124, 125] },  // Tight, 909, Trap
  jazz:      { primary: 126, alts: [121, 122] },  // Brush, Acoustic, Tight
  default:   { primary: 121, alts: [122, 124] },  // Acoustic, Tight, 909
};

// Clap (channel 3)
const CLAP_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 241, alts: [243] },        // 808 Clap, Finger Snap
  "hip hop": { primary: 241, alts: [243] },
  hiphop:    { primary: 241, alts: [243] },
  house:     { primary: 242, alts: [241] },        // 909 Clap, 808 Clap
  techno:    { primary: 242, alts: [241] },
  default:   { primary: 241, alts: [242, 243] },
};

// Closed HiHat (channel 4)
const CLOSED_HAT_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 362, alts: [361, 363] },   // 808, Tight, 909
  "hip hop": { primary: 362, alts: [361] },
  hiphop:    { primary: 362, alts: [361] },
  house:     { primary: 363, alts: [361] },         // 909, Tight
  techno:    { primary: 363, alts: [361, 362] },
  default:   { primary: 361, alts: [362, 363] },
};

// Open HiHat (channel 5)
const OPEN_HAT_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 442, alts: [441] },         // 808 Open, Open Hat
  "hip hop": { primary: 442, alts: [441] },
  hiphop:    { primary: 442, alts: [441] },
  house:     { primary: 441, alts: [442] },
  techno:    { primary: 441, alts: [442] },
  default:   { primary: 441, alts: [442] },
};

// Perc 1 (channel 6)
const PERC1_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 561, alts: [564, 565] },   // Shaker, Cowbell, Conga
  house:     { primary: 562, alts: [561, 565] },   // Tambourine, Shaker, Conga
  techno:    { primary: 563, alts: [564, 561] },   // Ride, Cowbell, Shaker
  "hip hop": { primary: 561, alts: [565, 566] },   // Shaker, Conga, Tom Low
  hiphop:    { primary: 561, alts: [565, 566] },
  jazz:      { primary: 563, alts: [561, 565] },   // Ride, Shaker, Conga
  latin:     { primary: 565, alts: [562, 564] },   // Conga, Tambourine, Cowbell
  default:   { primary: 561, alts: [562, 563] },
};

// Perc 2 (channel 7)
const PERC2_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 682, alts: [681, 683] },   // Tom High, Crash, Bongo
  house:     { primary: 681, alts: [683] },         // Crash, Bongo
  techno:    { primary: 681, alts: [682] },         // Crash, Tom High
  latin:     { primary: 683, alts: [682, 681] },   // Bongo, Tom High, Crash
  default:   { primary: 681, alts: [682, 683] },
};

// Synth 1 / Bass (channel 8)
const SYNTH1_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 860, alts: [859, 856] },   // Sub Bass, Analog Bullet, Rn Bass
  "hip hop": { primary: 856, alts: [860, 865] },   // Rn Bass, Sub Bass, Moog
  hiphop:    { primary: 856, alts: [860, 865] },
  house:     { primary: 857, alts: [861, 856] },   // Buzz Bass, Acid, Rn Bass
  techno:    { primary: 861, alts: [857, 858] },   // Acid Bass, Buzz, 3 VCOs
  dnb:       { primary: 862, alts: [857, 859] },   // Wobble, Buzz, Analog Bullet
  lofi:      { primary: 863, alts: [864, 856] },   // Finger Bass, Slap, Rn Bass
  "lo-fi":   { primary: 863, alts: [864, 856] },
  jazz:      { primary: 863, alts: [864, 860] },   // Finger Bass, Slap, Sub
  rock:      { primary: 864, alts: [863, 865] },   // Slap, Finger, Moog
  pop:       { primary: 856, alts: [863, 860] },   // Rn Bass, Finger, Sub
  default:   { primary: 856, alts: [857, 860] },
};

// Synth 2 / Lead (channel 9)
const SYNTH2_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 954, alts: [953, 951] },   // Super Saw, PWM Stabs, Slow Saw
  house:     { primary: 952, alts: [954, 953] },   // Trance Attack, Super Saw, PWM Stabs
  techno:    { primary: 952, alts: [956, 955] },   // Trance Attack, Hoover, Retro
  dnb:       { primary: 956, alts: [954, 952] },   // Hoover, Super Saw, Trance Attack
  "hip hop": { primary: 955, alts: [951, 1290] },  // Retro Lead, Slow Saw, Warm Pad
  hiphop:    { primary: 955, alts: [951, 1290] },
  lofi:      { primary: 1290, alts: [1294, 951] }, // Warm Pad, Ambient Pad, Slow Saw
  "lo-fi":   { primary: 1290, alts: [1294, 951] },
  jazz:      { primary: 1103, alts: [1135, 951] }, // Full Concert Grand, E.Piano 1, Slow Saw
  pop:       { primary: 1103, alts: [1135, 954] }, // Grand Piano, E.Piano, Super Saw
  ambient:   { primary: 1294, alts: [1290, 1292] },// Ambient Pad, Warm Pad, Sci-Fi Pad
  default:   { primary: 951, alts: [954, 1290] },
};

// DX / FM (channel 10)
const DX_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 1933, alts: [1934, 1976] }, // FM Lo-Fi Bass, Dark Bass, 5th Atmosphere
  house:     { primary: 1964, alts: [1965, 1976] }, // Legend EP, Wood EP, 5th Atmosphere
  techno:    { primary: 1946, alts: [1933, 1977] }, // FM Metallic Lead, Lo-Fi Bass, Glass Dream
  dnb:       { primary: 1935, alts: [1946, 1933] }, // FM Bold Bass, Metallic Lead, Lo-Fi Bass
  "hip hop": { primary: 1964, alts: [1966, 1978] }, // Legend EP, Crystal EP, Strings Pad
  hiphop:    { primary: 1964, alts: [1966, 1978] },
  lofi:      { primary: 1965, alts: [1964, 1977] }, // Wood EP, Legend EP, Glass Dream
  "lo-fi":   { primary: 1965, alts: [1964, 1977] },
  jazz:      { primary: 1960, alts: [1964, 1965] }, // FM Simple Piano, Legend EP, Wood EP
  pop:       { primary: 1964, alts: [1960, 1978] }, // Legend EP, Simple Piano, Strings Pad
  ambient:   { primary: 1976, alts: [1977, 1978] }, // 5th Atmosphere, Glass Dream, Strings Pad
  default:   { primary: 1964, alts: [1965, 1976] },
};

// Synth 2 / Guitar override (channel 9 when guitar stem detected)
const GUITAR_MAP: Record<string, { primary: number; alts: number[] }> = {
  rock:      { primary: 1644, alts: [1643, 954] },    // Electric Clean, Classical, Super Saw
  pop:       { primary: 1644, alts: [1643, 951] },    // Electric Clean, Classical, Slow Saw
  jazz:      { primary: 1643, alts: [1644, 1103] },   // Classical Guitar, Electric Clean, Grand Piano
  lofi:      { primary: 1643, alts: [1644, 1290] },   // Classical Guitar, Electric Clean, Warm Pad
  "lo-fi":   { primary: 1643, alts: [1644, 1290] },
  "hip hop": { primary: 1644, alts: [1643, 955] },    // Electric Clean, Classical, Retro Lead
  hiphop:    { primary: 1644, alts: [1643, 955] },
  latin:     { primary: 1643, alts: [1644, 951] },    // Classical Guitar, Electric Clean, Slow Saw
  default:   { primary: 1644, alts: [1643, 954] },    // Electric Clean, Classical, Super Saw
};

// DX / Piano override (channel 10 when piano stem detected)
const PIANO_DX_MAP: Record<string, { primary: number; alts: number[] }> = {
  jazz:      { primary: 1960, alts: [1961, 1964] },   // FM Simple Piano, FM B Piano, Legend EP
  pop:       { primary: 1964, alts: [1960, 1966] },   // Legend EP, FM Simple Piano, Crystal EP
  rock:      { primary: 1960, alts: [1964, 1965] },   // FM Simple Piano, Legend EP, Wood EP
  lofi:      { primary: 1965, alts: [1964, 1960] },   // Wood EP, Legend EP, FM Simple Piano
  "lo-fi":   { primary: 1965, alts: [1964, 1960] },
  "hip hop": { primary: 1964, alts: [1966, 1960] },   // Legend EP, Crystal EP, FM Simple Piano
  hiphop:    { primary: 1964, alts: [1966, 1960] },
  house:     { primary: 1964, alts: [1965, 1976] },   // Legend EP, Wood EP, 5th Atmosphere
  default:   { primary: 1960, alts: [1964, 1965] },   // FM Simple Piano, Legend EP, Wood EP
};

// Sampler (channel 11)
const SAMPLER_MAP: Record<string, { primary: number; alts: number[] }> = {
  trap:      { primary: 1290, alts: [1294, 956] },    // Warm Pad, Ambient Pad, Hoover
  house:     { primary: 1291, alts: [1290, 952] },    // Trance Pad, Warm Pad, Trance Attack
  techno:    { primary: 1294, alts: [1295, 956] },    // Ambient Pad, Dark Pad, Hoover
  "hip hop": { primary: 1290, alts: [955, 1294] },    // Warm Pad, Retro Lead, Ambient Pad
  hiphop:    { primary: 1290, alts: [955, 1294] },
  jazz:      { primary: 1441, alts: [1439, 1103] },   // String Ensemble, Violin, Grand Piano
  ambient:   { primary: 1294, alts: [1290, 1295] },   // Ambient Pad, Warm Pad, Dark Pad
  default:   { primary: 1290, alts: [1294, 951] },    // Warm Pad, Ambient Pad, Slow Saw
};

// Channel → genre map lookup table
const CHANNEL_GENRE_MAPS: Record<number, Record<string, { primary: number; alts: number[] }>> = {
  1: KICK_MAP,
  2: SNARE_MAP,
  3: CLAP_MAP,
  4: CLOSED_HAT_MAP,
  5: OPEN_HAT_MAP,
  6: PERC1_MAP,
  7: PERC2_MAP,
  8: SYNTH1_MAP,
  9: SYNTH2_MAP,
  10: DX_MAP,
  11: SAMPLER_MAP,
};

// ---- Public API -----------------------------------------------------

/**
 * Get recommended sounds for a channel based on detected genre.
 *
 * Returns a primary recommendation and up to 2 alternatives.
 * Falls back gracefully when a genre is unrecognized or a preset ID
 * is not found in the library.
 */
export function recommendSounds(
  channel: SeqtrackChannel,
  genre: string,
  stemName?: string,
): { primary: SoundRecommendation; alternatives: SoundRecommendation[] } {
  const presets = getPresetsForChannel(channel);

  // Sampler (channel 11) — use sampler genre map, falling back to AWM2 presets for lookup
  if (channel === 11) {
    const allPresets = [...getPresetsForChannel(8 as SeqtrackChannel), ...getPresetsForChannel(9 as SeqtrackChannel)];
    if (allPresets.length === 0) {
      return { primary: { name: "Default", category: "Bass", id: 1 }, alternatives: [] };
    }
    const normalizedGenre = genre.toLowerCase().trim();
    const mapping = SAMPLER_MAP[normalizedGenre] ?? SAMPLER_MAP["default"];
    if (!mapping) {
      return { primary: fallbackForChannel(channel, allPresets), alternatives: [] };
    }
    const primaryPreset = findPresetById(mapping.primary, allPresets);
    const primary = primaryPreset ? presetToRecommendation(primaryPreset) : fallbackForChannel(channel, allPresets);
    const alternatives: SoundRecommendation[] = [];
    for (const altId of mapping.alts) {
      const altPreset = findPresetById(altId, allPresets);
      if (altPreset) alternatives.push(presetToRecommendation(altPreset));
    }
    return { primary, alternatives };
  }

  if (presets.length === 0) {
    return {
      primary: { name: "Default", category: "Bass", id: 1 },
      alternatives: [],
    };
  }

  // Use stem-specific genre maps when a stem name signals guitar or piano
  const stem = stemName?.toLowerCase();
  let genreMap: Record<string, { primary: number; alts: number[] }> | undefined;

  if (stem === "guitar" && channel === 9) {
    genreMap = GUITAR_MAP;
  } else if (stem === "piano" && channel === 10) {
    genreMap = PIANO_DX_MAP;
  } else {
    genreMap = CHANNEL_GENRE_MAPS[channel];
  }

  if (!genreMap) {
    const fb = fallbackForChannel(channel, presets);
    return { primary: fb, alternatives: [] };
  }

  const normalizedGenre = genre.toLowerCase().trim();
  const mapping = genreMap[normalizedGenre] ?? genreMap["default"];

  if (!mapping) {
    const fb = fallbackForChannel(channel, presets);
    return { primary: fb, alternatives: [] };
  }

  // Resolve primary preset
  const primaryPreset = findPresetById(mapping.primary, presets);
  const primary = primaryPreset
    ? presetToRecommendation(primaryPreset)
    : fallbackForChannel(channel, presets);

  // Resolve alternatives
  const alternatives: SoundRecommendation[] = [];
  for (const altId of mapping.alts) {
    const altPreset = findPresetById(altId, presets);
    if (altPreset) {
      alternatives.push(presetToRecommendation(altPreset));
    }
  }

  return { primary, alternatives };
}
