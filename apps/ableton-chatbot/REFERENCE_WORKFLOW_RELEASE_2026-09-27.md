# Guided Reference Workflow Release

## Stem Next-Action Follow-Up

- Frontend `9af96653acf9cf742f328af01c6a47674b7bcb97` adds an on-screen Next step action for the current stem review state. Audio persistence and unsaved review choices are labeled separately.
- The action focuses the next undecided layer, listening confirmation, save, or Timing. Missing integrity checks, uncertain saves and saved reviews needing attention have separate recovery actions. Navigation never chooses or confirms for the user.
- Archived under `s3://beatmind-frontend/releases/web/9af96653/`; CloudFront invalidation `I105HGNPOBUUOU6JRQC8YK0B50` requested. Public manifest confirmed the new frontend revision.
- Production build and all 13 frontend unit files passed. Expanded stem browser tests passed at 1440px and 390px both locally and against deployed assets, using API/audio fixtures. Screenshots inspected for both widths. This did not process real user audio or alter Ableton.
- Source, tests and guide mirrored to the original workspace; backend and Bridge unchanged.

## Deployment

- Frontend source: `a3cbd6184635c6e3bc881af88d07f659c220aa81`.
- Live dashboard: https://www.beatmind.io/dashboard
- Archive: `s3://beatmind-frontend/releases/web/a3cbd618/`.
- CloudFront invalidation: `I5GHA8SDXVLOPDPCDBJMWYRQFT`, completed.
- Public release manifest verified after deployment.
- Backend remains `86796f6a48fe2ca49f22761a0bfa77e530b3f056`, task `beatmind-api:27`.
- Bridge release remains `c60f22a6d463fb1198300e0d2dc14ae78effa74f`; no installer or backend change in this release.

## Delivered

- Five reference tabs display saved progress, prerequisites, and next/back actions.
- Listening hands off to template planning, including the optional manual brief path.
- Successful template save/approval receipts survive a failed follow-up refresh.
- New template approval requests Ableton activation by default, with an opt-out.
- Persistent Bridge and Ableton controls are available across dashboard views.
- Offline activation waits for connection, can be canceled, and runs once on reconnect.
- Launch results distinguish confirmed, failed, and uncertain outcomes.
- See `REFERENCE_WORKFLOW_GUIDE.md` for the complete user flow and limitations.

## Verification

- Production build and TypeScript checks passed.
- All 13 frontend unit test files passed.
- Backend song-project tests: 15 passed; Bridge launch-link tests: 3 passed.
- Local browser suites passed at desktop and mobile widths: listening, Bridge launch, song projects, stems, and sound comparison.
- Listening and Bridge launch suites also passed against deployed frontend assets, with API fixtures. These are not real provider or Ableton execution tests.
- Covered consent, draft preservation, submit visibility, all five tabs, prerequisites, save-refresh failure, approval opt-out, launch failures, cancellation, and single activation after reconnection.
- Real authenticated production UI: all five tabs checked, listening draft preserved, original browser tab unchanged, no write requests and no page errors.
- Desktop and mobile screenshots inspected; compact listening controls checked at 360px viewport height.

## Remaining Live Check

The real Bridge was disconnected during the production UI check. The installed application was reopened, but no accessible Bridge window or connected dashboard status was confirmed. Ableton was already running. Real frontend-to-Bridge activation therefore remains unverified; mocked activation tests are not a substitute for this check.

No paid listening request, reference approval, musical edit, Live Set save/new/discard operation, or automatic stem import was performed during the real production check. Template approval means the planning brief is saved, not that an arrangement has been built. App activation never replaces the current Live Set.
