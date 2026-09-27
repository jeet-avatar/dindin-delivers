# Exact Sample Loading

Copy beatmind_samples.py alongside AbletonOSC's abletonosc/browser.py. At the
end of BrowserHandler.init_api, after the existing handler registrations, add:

```python
from .beatmind_samples import register
register(self, Live.Application.get_application())
from .beatmind_mixer import register as register_mixer
register_mixer(self, Live.Application.get_application())
from .beatmind_automation import register as register_automation
register_automation(self, Live.Application.get_application())
```

Also copy `beatmind_mixer.py`, `beatmind_automation.py` and `beatmind_stems.py` beside `browser.py`.
`beatmind_stems.py` places reference stems on new audio tracks at the start of the Arrangement (Live 12).
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
