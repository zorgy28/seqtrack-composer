# SeqTrack Composer Project Memory

Last updated: 2026-03-23 (code cleaned, pushed to GitHub)

## Memory Files

- [project_seqtrack_composer.md](project_seqtrack_composer.md) — Project overview, tech stack, all phase statuses, architecture, key decisions
- [reference_seqtrak_midi_cc.md](reference_seqtrak_midi_cc.md) — Complete MIDI CC table (40 params), SysEx format, Bank Select quirk
- [reference_file_structure.md](reference_file_structure.md) — Full source tree with module responsibilities

## Quick Status

**GitHub:** https://github.com/zorgy28/seqtrack-composer (2 commits on main)

**All phases complete:**
- Phases 1-7: scaffold, types, pattern engine, step sequencer UI, Web MIDI, AI composition, MIDI export, project management
- Phases S1-S3: sound library (80+ presets from 2032), CC map (40 params), SysEx builders, Program Change with SEQTRAK quirk, Sound Browser UI with CC sliders
- Code cleanup: unused imports removed, mute button wired up, lint-clean

**Next potential work areas:**
- Sampler presets (ch 11) -- data exists in Data List but not yet coded
- Full 2032 preset library (currently representative subset)
- SysEx parameter editing UI (builders exist, no UI yet)
- FM editor (visual 4-operator + algorithm selector for ch 10)
- Live performance mode / scene triggering
- Audio preview via Web Audio API
- Transport bar with play/stop/looping
