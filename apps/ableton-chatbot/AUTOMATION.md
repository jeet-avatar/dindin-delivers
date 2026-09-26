# Verified Production Automation

The chat production path discovers actual browser sources, saves a production
brief, builds one part, verifies writes, captures Ableton audio, and waits for
review. Accepting a planned part starts the next part automatically. Repeated
acceptance does not issue another continuation. Read-only inspection remains
available while a recording awaits review.

## Discovery and Mapping

- `get_library_catalog`: paginated instrument, effect, plug-in, preset and pack
  browser paths. A page is not the entire library. Follow folder paths and
  `next_offset` for additional choices.
- `load_library_item`: exact discovered source path, with device-chain/type
  readback. Plug-ins require an empty target chain. No filename fallback.
- `get_track_device_tree`: nested rack paths and populated drum-pad MIDI notes.
- `get_device_control_map`: exposed parameter names, native ranges, displayed
  values, enum choices, enabled state and automation state.
- `set_device_control`: physical Hz/kHz, ms/s, dB, percent, enum labels or native
  values. Unit conversion queries Live's display function without writing trial
  values. Final writes require independent readback. Display rounding is reported
  honestly; the 800 Hz test read back as 801 Hz.

Ambiguous controls, stale mappings, disabled/inactive controls and existing
automation are rejected. A lost mutation reply is partial, never blindly retried.

## Installation

Install `bridge/abletonosc/beatmind_samples.py` and `beatmind_automation.py` beside
AbletonOSC's `browser.py`, retaining the existing `beatmind_samples.register`
registration documented in `bridge/abletonosc/README.md`. Restart Live after
updating imported modules; switching the control-surface slot alone can retain
cached Python modules. Save the current Live Set before restarting.

## Verification on 2026-09-10

- 64 backend tests, TypeScript checking, and frontend production build.
- Real browser login, bridge connection and actual library inspection.
- Existing KICKS rack: 16 populated pad mappings discovered without modifications.
- Two new Drift parts: exact browser loads, cutoff writes, MIDI readback and real
  12.8-second Ableton recordings decoded and played in Chromium.
- Keys acceptance automatically launched bass production through chat.
- Final bass recording left pending for the user's musical approval.
- Saved action history and responsive recording controls checked at 1280x900 and
  390x844.

## Boundaries

This is not universal control of every Ableton or plug-in feature. Hidden plug-in
parameters must first be exposed to Live. Browser discovery does not mean every
sample was listened to. Exact-pack loading verifies source identity, not waveform
identity after instrument processing. Performed parameter ramps are not saved
automation envelopes. Session sections are not a completed Arrangement export.
Browser autoplay may require an initial user gesture. Audio verification proves
recorded signal and playback, not that the user likes the musical result.

The local preview launchers use temporary storage for account data, plans and
recordings. Durable multi-user hosting, recovery of interrupted automatic
continuations, and persistent Arrangement/export workflows remain separate work.
