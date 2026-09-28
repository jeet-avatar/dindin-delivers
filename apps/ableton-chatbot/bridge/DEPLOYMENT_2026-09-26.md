# Bridge deployment receipt

Runtime source commit: `c60f22a6d463fb1198300e0d2dc14ae78effa74f`.
Branch: `release/beatmind-bridge-ui-20260926`, pushed to origin.
No main-branch merge or website/backend deployment was performed.

## Verified release

- Eight native Tk UI/connection tests and six launch/TLS tests passed from the
  isolated release checkout with the pinned dependencies.
- The development backend suite passed 190 tests. That is regression evidence,
  not a production account or full-track listening test.
- Packaged and installed HTTPS health, WSS TLS and unauthenticated-rejection
  diagnostics all passed, without credentials or music commands.
- Apple submission `4faeaeb3-b4fa-4344-a9ab-ff620b443676`: Accepted; ticket stapled.
- Gatekeeper accepted both the mounted and installed app as Notarized Developer ID.
- Public installer: https://www.beatmind.io/BeatMind-Bridge.dmg
- Download size: 14,489,185 bytes.
- Local and public SHA-256:
  `befbc98db8b7b37d2cdf08b6688c3e632bba956ef17fd8e622495b3806876b69`.
- CloudFront invalidation `I3FRHX1CGH95KOGB28VZVICPFU` completed, for the DMG only.
- Installed `/Applications/BeatMind Bridge.app` and reopened via the registered
  `beatmind-bridge://open` URL. Process path and visible window confirmed.
- No Ableton project or stored account configuration was changed. Sign-in is
  still required after restarting the app; authenticated reconnection was not
  asserted by this release check.
- Automated widget contrast, focus, state and geometry checks passed. A visual
  screenshot check could not be completed because the runner lacks macOS Screen
  Recording permission; it returned wallpaper rather than the app window.

## Rollback copies

- Previous public installer:
  `s3://beatmind-frontend/releases/bridge/20260926-before-c60f22a6/BeatMind-Bridge.dmg`.
- Immutable release installer:
  `s3://beatmind-frontend/releases/bridge/c60f22a6/BeatMind-Bridge.dmg`.
- Previous installed app:
  `/Users/jeet/Library/Application Support/BeatMind/Bridge Backup.pUSB9J/BeatMind Bridge.app`.

## Separate application release

The initial generated-audio provider test returned HTTP 401 with `invalid_api_key`.
After the user stored another replacement through the validating helper, a fresh
real six-second generated-audio request returned HTTP 200, model `gpt-audio-1.5`,
finish reason `stop`, and `checks_passed`. No key was printed or written to disk.
Provider authentication is now verified; production audio enablement was not
changed by the test. Final clean release/container tests and the disposable-set
frontend/Ableton audible-preview and approval workflow remain prerequisites for
the application/audio release. Production health reports zero connected bridges
after the app restart; the user was asked to sign in again.

## 2026-09-27: on-device separation release (bridge commit ae5dd800)

- Public installer https://www.beatmind.io/BeatMind-Bridge.dmg, 310,714,556 bytes,
  SHA-256 `13f33f0104f916885830b266092f8fde6cc9278877886351bae81b2678db632d` (public download verified).
- Immutable copy `s3://beatmind-frontend/releases/bridge/ae5dd800/BeatMind-Bridge.dmg`; previous installer
  preserved at `s3://beatmind-frontend/releases/bridge/20260927-before-ae5dd800/`. Invalidation
  `IDMXEM34S1Y3OZ8LLH0D7DN8NI` (DMG only).
- Notarized with the App Store Connect API key (status Accepted), stapled; Gatekeeper: Notarized Developer ID.
- Build checks: packaged separation inside the signed app, HTTPS/WSS network check. Separately, the
  packaged app ran htdemucs_ft + drumsep on the Apple GPU (eight stems, checks passed), and the new
  Bridge code completed a production web -> API -> Bridge -> Apple GPU -> report round trip in 49 s
  with no audio stored on the server (file picker automated for that run).
- Includes Third-Party Notices and `AbletonOSC-Extensions/beatmind_stems.py` (Live 12 stem placement,
  not yet exercised in a real Live set).
