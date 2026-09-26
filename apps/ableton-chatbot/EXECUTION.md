# Verified Production

The web backend and `backend/direct_runner.py` share `backend/execution.py`.
Every tool is schema-validated before sending OSC. Writes use readback checks;
creation, note insertion and browser loads are never automatically resent.

## Results

- `verified`: the stated property or note pattern matched Ableton's reply.
- `observed`: session data was inspected; no production completion is implied.
- `partial`: a write was attempted, but the complete result could not be verified.
- `failed`: validation or a prerequisite failed before a write, or a dependent action was skipped.
- `unverified`: a launch/ramp was sent but full playback or intermediate timing is not established.

Each action includes its input, ordered OSC writes/readbacks, responses, timings,
and summary. Failed note comparisons include missing/changed and unexpected notes.
The dashboard streams narration and action progress, retains interrupted actions,
and exposes exact note tables and execution details. Stop cancels subsequent work;
it does not undo operations already delivered to Live.

`describe_sound` pairs intended timbre, rhythm and mix role with observed devices
and notes. It explicitly distinguishes sound-design intent from audio analysis.
Drum Rack nested pad mappings and audio listening are not supported by this API.
Prefer separate instrument tracks when the actual drum-pad mapping is unknown.
Scene creation is not a saved Arrangement timeline; performed ramps are not saved
automation envelopes. A verified MIDI pattern is not proof of audible sound.

Browser loading requires the custom `/live/browser/load_device` and
`/live/browser/load_sample` handlers that return `loaded`/`not_found`. Device
verification requires the parameter name/value/min/max/is_quantized getters.
Normal track indices cannot be used for return-track device access.

## Local Checks

From `backend`, install `requirements.txt` into the backend virtual environment:

```sh
venv/bin/pip install -r requirements.txt
PYTHON_DOTENV_DISABLED=1 venv/bin/python -m unittest discover -s tests -v
```

The automated suite uses simulated Live state and a mocked model; it does not
call a model provider or change a Live project.

The optional live smoke test creates one uniquely named MIDI track, verifies
four notes (including pitch 127), loads an available built-in instrument, reads
parameters, clears notes, and removes its temporary track. It does not start
playback or change tempo. Keep the set idle during the test. Cleanup stops if
the track list changed unexpectedly.

```sh
venv/bin/python tests/live_smoke.py --run
```

For the browser app, run the backend and frontend with matching API configuration.
The frontend uses `POST /api/chat/stream` (NDJSON); proxies must not buffer that
response. `POST /api/chat` remains available for non-streaming clients.
`BEATMIND_MAX_ROUNDS` defaults to 60 (bounded 1-100). Hitting the budget reports
incomplete work, rather than claiming the production is finished.

## Release

Deploy the backend and frontend together and rebuild the desktop Bridge from
the updated `bridge/bridge.py`. Old installers do not contain the boolean OSC
decoder fix. Existing bridges must reconnect/sign in after the backend restart;
bridge tokens and chat sessions remain process-local. Bridge selection is scoped
to the authenticated user; multiple connected bridges require disambiguation by
disconnecting the unintended bridge. Run a single backend worker with this
in-memory session/bridge architecture.

No model-generated audio, perceptual listening, loudness analysis, nested Drum Rack
inspection, or finished-song export is claimed by this change. Those need separate
audio capture/analysis and Live control capabilities.
