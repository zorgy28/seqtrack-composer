---
name: SEQTRAK MIDI CC Reference
description: Complete MIDI CC table for Yamaha SEQTRAK - 40 parameters across 11 channels, SysEx format, and device specs
type: reference
updated: 2026-03-23
---

Implemented CC map: `src/lib/midi/cc-map.ts`
Official source: SEQTRAK Data List V2.00 (pages 111-114)

## CC Parameter Summary (40 total)

### Control (7 params)
| CC | Name | Range | Default | Channels |
|----|------|-------|---------|----------|
| 7 | Volume | 0-127 | 100 | all |
| 10 | Pan | 0-127 | 64 | all (bipolar) |
| 11 | Expression | 0-127 | 127 | all |
| 5 | Portamento Time | 0-127 | 0 | synth |
| 64 | Sustain | 0-127 | 0 | all |
| 65 | Portamento Switch | 0-1 | 0 | synth |
| 66 | Sostenuto | 0-127 | 0 | all |

### Sound Shaping (5 params, bipolar around 64)
| CC | Name | Range | Channels |
|----|------|-------|----------|
| 74 | Filter Cutoff | 0-127 | all |
| 71 | Filter Resonance | 0-127 | all |
| 73 | EG Attack Time | 0-127 | all |
| 75 | EG Decay/Release | 0-127 | all |
| 25 | Drum Pitch | 40-88 | drum only |

### EQ (2 params, bipolar)
| CC | Name | Range | Channels |
|----|------|-------|----------|
| 20 | EQ High Gain | 40-88 | all |
| 21 | EQ Low Gain | 40-88 | all |

### SEQTRAK-specific (4 params)
| CC | Name | Range | Channels |
|----|------|-------|----------|
| 23 | Mute | 0-127 | all |
| 26 | Mono/Poly/Chord | 0-2 | synth |
| 27 | Arp Template | 0-15 | synth |
| 28 | Arp Gate | 0-127 | synth |
| 29 | Arp Speed | 0-9 | synth |

### Effects Send (2 params)
| CC | Name | Range | Default | Channels |
|----|------|-------|---------|----------|
| 91 | Reverb Send | 0-127 | 40 | all |
| 94 | Delay Send | 0-127 | 0 | all |

### Master/Insert Effects (12 params)
CCs 102-115: Master FX1-3 params, Insert FX params, Reverb params, Delay params (all 0-127, all channels)

### FM/DX-specific (4 params, ch 10 only)
| CC | Name | Range |
|----|------|-------|
| 116 | FM Algorithm | 0-11 |
| 117 | FM Mod Amount | 0-127 |
| 118 | FM Mod Frequency | 0-127 |
| 119 | FM Mod Feedback | 0-127 |

## SysEx Format
```
F0 43 1n 7F 1C 0C [addr_hi] [addr_mid] [addr_lo] [data...] F7
```
- F0 = SysEx start, 43 = Yamaha, 1n = Param Change (n=device#)
- 7F 1C = SEQTRAK group, 0C = SEQTRAK model
- No checksum needed for Parameter Change messages

## Bank Select + Program Change
- Sound presets: MSB=63, LSB=0-15, PC=0-127
- DrumKit by part: MSB=32-38
- Sampler: MSB=62
- Projects: MSB=64, LSB=0, PC=0-7
- **QUIRK: CC32 (Bank LSB) must be re-sent AFTER the Program Change**
