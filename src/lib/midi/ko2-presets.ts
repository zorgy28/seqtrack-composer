/**
 * Teenage Engineering EP-133 KO II factory presets.
 *
 * Sound slots 001-599 organized by category:
 *   001-099: Kicks
 *   100-199: Snares & Rimshots
 *   200-299: Cymbals & Hi-Hats
 *   300-399: Percussion (Claps, Congas, Shakers, etc.)
 *   400-499: Bass
 *   500-599: Melodic & Synth
 *
 * Note: The EP-133 uses sample slot numbers (1-999), not standard bank/PC.
 * Program Change was removed in FW 2.0.2.
 * bankMSB = Math.floor((slot - 1) / 128), programNumber = (slot - 1) % 128.
 */

import type { SoundPreset, SoundCategory } from "./types";

function ko(slot: number, name: string, category: SoundCategory): SoundPreset {
  return {
    id: slot,
    name,
    category,
    engine: "drum", // sample-based — using "drum" for compatibility
    bankMSB: Math.floor((slot - 1) / 128),
    bankLSB: 0,
    programNumber: (slot - 1) % 128,
  };
}

export const KO2_PRESETS: SoundPreset[] = [
  // ─── Kicks (001-050) ──────────────────────────────────────────
  ko(1, "Micro Kick", "Kick"),
  ko(2, "Tight Kick", "Kick"),
  ko(3, "Deep Kick", "Kick"),
  ko(4, "808 Kick", "Kick"),
  ko(5, "909 Kick", "Kick"),
  ko(6, "Punchy Kick", "Kick"),
  ko(7, "Sub Kick", "Kick"),
  ko(8, "Lo-Fi Kick", "Kick"),
  ko(9, "Distorted Kick", "Kick"),
  ko(10, "Acoustic Kick", "Kick"),
  ko(11, "Boom Kick", "Kick"),
  ko(12, "Electro Kick", "Kick"),
  ko(13, "Tape Kick", "Kick"),
  ko(14, "Vinyl Kick", "Kick"),
  ko(15, "Click Kick", "Kick"),
  ko(16, "Thump Kick", "Kick"),
  ko(17, "Round Kick", "Kick"),
  ko(18, "Hard Kick", "Kick"),
  ko(19, "Soft Kick", "Kick"),
  ko(20, "Layered Kick", "Kick"),
  ko(21, "NT Alt Kick", "Kick"),

  // ─── Snares (100-140) ─────────────────────────────────────────
  ko(100, "NT Snare", "Snare"),
  ko(101, "808 Snare", "Snare"),
  ko(102, "909 Snare", "Snare"),
  ko(103, "Tight Snare", "Snare"),
  ko(104, "Acoustic Snare", "Snare"),
  ko(105, "Lo-Fi Snare", "Snare"),
  ko(106, "Brush Snare", "Snare"),
  ko(107, "Rim Snare", "Snare"),
  ko(108, "Fat Snare", "Snare"),
  ko(109, "Crisp Snare", "Snare"),
  ko(110, "Noise Snare", "Snare"),
  ko(111, "Clap Snare", "Snare"),
  ko(112, "Cross Stick", "Snare"),
  ko(113, "Tape Snare", "Snare"),
  ko(114, "NT Snare Alt", "Snare"),
  ko(130, "NT Rimshot", "Rim"),

  // ─── Cymbals & Hi-Hats (200-250) ─────────────────────────────
  ko(200, "NT HH Closed", "Closed HiHat"),
  ko(201, "808 HH Closed", "Closed HiHat"),
  ko(202, "909 HH Closed", "Closed HiHat"),
  ko(203, "Tight HH", "Closed HiHat"),
  ko(204, "Pedal HH", "Closed HiHat"),
  ko(205, "Lo-Fi HH", "Closed HiHat"),
  ko(218, "NT HH Open", "Open HiHat"),
  ko(219, "808 HH Open", "Open HiHat"),
  ko(220, "909 HH Open", "Open HiHat"),
  ko(221, "Sizzle HH", "Open HiHat"),
  ko(235, "NT Ride", "Ride"),
  ko(236, "Jazz Ride", "Ride"),
  ko(237, "Bell Ride", "Ride"),
  ko(240, "Crash", "Crash"),
  ko(241, "Dark Crash", "Crash"),
  ko(247, "NT Ride C", "Ride"),

  // ─── Percussion (300-350) ─────────────────────────────────────
  ko(300, "NT Clap", "Clap"),
  ko(301, "808 Clap", "Clap"),
  ko(302, "909 Clap", "Clap"),
  ko(303, "Finger Snap", "Snap"),
  ko(310, "Conga High", "Conga"),
  ko(311, "Conga Low", "Conga"),
  ko(315, "Bongo High", "World"),
  ko(316, "Bongo Low", "World"),
  ko(317, "NT Tambo", "Shaker"),
  ko(318, "Tambourine", "Shaker"),
  ko(320, "Shaker", "Shaker"),
  ko(321, "Maracas", "Shaker"),
  ko(325, "Cowbell", "Bell"),
  ko(326, "Woodblock", "World"),
  ko(330, "Tom High", "Tom"),
  ko(331, "Tom Mid", "Tom"),
  ko(332, "Tom Low", "Tom"),
  ko(335, "Agogo", "Bell"),
  ko(340, "Triangle", "Bell"),
  ko(343, "NT Perc", "World"),

  // ─── Bass (400-440) ───────────────────────────────────────────
  ko(400, "Sub Bass", "Bass"),
  ko(401, "808 Bass", "Bass"),
  ko(402, "Synth Bass", "Bass"),
  ko(403, "Deep Bass", "Bass"),
  ko(404, "Round Bass", "Bass"),
  ko(405, "Acid Bass", "Bass"),
  ko(406, "FM Bass", "Bass"),
  ko(407, "Moog Bass", "Bass"),
  ko(408, "Finger Bass", "Bass"),
  ko(409, "Slap Bass", "Bass"),
  ko(410, "Wobble Bass", "Bass"),
  ko(411, "Pluck Bass", "Bass"),
  ko(412, "Reese Bass", "Bass"),
  ko(413, "Lo-Fi Bass", "Bass"),
  ko(414, "Tape Bass", "Bass"),
  ko(415, "Warm Bass", "Bass"),

  // ─── Melodic (500-540) ────────────────────────────────────────
  ko(500, "Synth Lead", "Synth Lead"),
  ko(501, "Saw Lead", "Synth Lead"),
  ko(502, "Square Lead", "Synth Lead"),
  ko(503, "Bell", "Bell"),
  ko(504, "Pluck", "Synth Lead"),
  ko(505, "Keys", "Keyboard"),
  ko(506, "E.Piano", "Piano"),
  ko(507, "Organ", "Organ"),
  ko(508, "Strings", "Strings"),
  ko(509, "Pad", "Pad"),
  ko(510, "Warm Pad", "Pad"),
  ko(511, "Dark Pad", "Pad"),
  ko(512, "Choir", "Vocal"),
  ko(513, "Brass Stab", "Brass"),
  ko(514, "Flute", "Woodwind"),
  ko(515, "Guitar", "Guitar"),
  ko(516, "Marimba", "Mallet"),
  ko(517, "Vibraphone", "Mallet"),
  ko(518, "Kalimba", "Mallet"),
  ko(519, "Lo-Fi Piano", "Piano"),
  ko(520, "Tape Chords", "Keyboard"),
  ko(521, "Noise Hit", "SFX"),
  ko(522, "FX Riser", "SFX"),
  ko(523, "Impact", "SFX"),
  ko(524, "Vinyl Crackle", "Noise"),
  ko(525, "Atmosphere", "Texture"),
];
