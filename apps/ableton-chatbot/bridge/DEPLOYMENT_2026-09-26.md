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

The fresh generated-audio provider test still returned HTTP 401 with
`invalid_api_key`. No secret value or response body was printed. The user was
directed to the validating secure-entry helper; lowercase `replace` correctly
left the stored value unchanged. Successful provider authentication, final clean
release/container tests and the disposable-set frontend/Ableton audible-preview
and approval workflow remain prerequisites for the application/audio release.
