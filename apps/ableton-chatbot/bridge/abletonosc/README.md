# BeatMind extensions for AbletonOSC

Copy every `beatmind_*.py` file beside AbletonOSC's `abletonosc/browser.py`. At the end of
`BrowserHandler.init_api`, after the existing handler registrations, add:

```python
from .beatmind_samples import register
register(self, Live.Application.get_application())   # also registers beatmind_automation
from .beatmind_mixer import register as register_mixer
register_mixer(self, Live.Application.get_application())
from .beatmind_master import register as register_master
register_master(self, Live.Application.get_application())
from .beatmind_sidechain import register as register_sidechain
register_sidechain(self, Live.Application.get_application())
```

What each file adds:
- `beatmind_samples.py`: exact sample loading (and registers the automation module).
- `beatmind_automation.py`: device discovery and control, clip automation with curves (linear, exponential,
  logarithmic, step) that land exactly on their end values, "-inf" dB for fully off, reading stored clip
  automation (including inside Drum Racks), reading a track's real mixer and send levels, the Groove Pool
  (factory grooves, per-clip grooves, amounts, global Groove Amount) and note feel (chance, velocity deviation,
  millisecond timing nudges).
- `beatmind_mixer.py`: fader mapping from Live's own display strings.
- `beatmind_master.py`: built-in effects on the Main track (master Limiter).
- `beatmind_sidechain.py`: Compressor sidechain source routing.
- `beatmind_stems.py`: reference stems on new audio tracks at the start of the Arrangement (Live 12).
- `beatmind_view.py`: checked track, device, MIDI-clip and Arrangement display selection.
- `beatmind_arrangement_preview.py`: checked playback-start marker for Arrangement previews.

Bridge 1.3.7 advertises these new features only after the installed extensions report
support. Copy all extension files, save your set, restart Ableton, then reconnect
the Bridge. Existing commands remain available on older Bridge versions; the new
display and Arrangement-preview commands require the matching update.

The mixer mapping returns Live's
native fader values and actual display strings; no guessed dB conversion is used.
Writes reject stale track/sample identities, changed faders and automation.

Save the Live Set and restart Ableton after updating these Python modules.
Changing the control-surface slot can retain cached modules.

The extension resolves the full browser path under the selected installed pack.
It never falls back to a matching filename elsewhere. The bridge separately
reads Simpler's actual sample file path and verifies the source SHA-256.
Missing or ambiguous browser paths fail explicitly.

Currently supported library: ~/Music/Ableton/Factory Packs on macOS.
Audio files are indexed; Ableton's generated preview cache is excluded.
Pack presets/racks, external sample folders, and uninstalled bundles are not
silently treated as supported audio files. File identity is not proof of an
identical rendered sound: pitch, velocity, envelopes, warp and effects matter.
