# Bridge UI release - 2026-09-26

This is an Apple Silicon bridge-only release. It does not deploy the website,
backend, audio provider, or modify an Ableton Live Set.

## Changes

- Theme-rendered buttons keep readable text on macOS, including disabled states.
- The primary action is "Let's make music". After connection it opens the web
  dashboard; Disconnect is a separate action.
- Successful connection clears the password and moves focus to the primary button.
- Connected status is announced only after the authenticated WebSocket opens and
  the bridge hello is sent. It does not claim that Ableton or audio was verified.
- Reconnection and failed authentication have distinct states; duplicate sign-in
  submissions are blocked.
- Bundled trusted CA certificates fix packaged HTTPS/WSS verification without
  disabling hostname or certificate checks.
- The fixed browser launch URL only opens the bridge window. It cannot carry
  credentials or music commands.
- Preserve the existing capture helper and sample, Live Set, mixer and OSC modules
  in the reproducible installer build.

## Validation

From the bridge directory, using native macOS Python with Tk:

```sh
python -m pip install -r requirements-build.txt
python -m unittest discover -s tests -v
```

Eight UI/connection tests passed on macOS with the pinned dependencies. The
broader development backend suite also passed 190 tests, but that suite is not
evidence of a completed real-account frontend/music-production workflow.

Build with `build_app.sh`, supplying `SIGNING_ID`, `NOTARY_PROFILE` and `PYTHON`.
The release build requires actual packaged HTTPS/WSS checks, signing, Apple
notarization and stapling. `--local-test` output must not be published.

Deployment is limited to the public installer. Preserve the previous S3 object,
publish a commit-addressed installer plus `BeatMind-Bridge.dmg`, invalidate only
that download URL, and verify the public download's SHA-256 before completion.
The audio-provider release remains blocked on successful provider authentication
and final real frontend/Ableton tests in a disposable set.
