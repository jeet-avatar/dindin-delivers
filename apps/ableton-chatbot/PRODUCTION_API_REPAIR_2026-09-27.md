# Production API Origin Repair - 2026-09-27

## Cause

The manually published frontend was built without NEXT_PUBLIC_API_URL. Its shared API client therefore embedded http://localhost:8000, causing browser fetch failures instead of reaching the production API. The faulty public dashboard chunk was fetched and confirmed to contain that local address. Mocked browser tests intercepted API requests regardless of origin and did not detect this release error.

The production server was separately healthy and reported zero connected Bridges. A running local Bridge process is not proof of an authenticated WebSocket connection.

## Repair

- Runtime frontend: 37d4c20d81cd7b420728cef7e12907cdf6152040.
- Rebuilt with NEXT_PUBLIC_API_URL=https://api.beatmind.io.
- Production builds now reject a missing, local, non-HTTPS or malformed API origin before emitting a build. Development retains its existing local setup.
- Added build configuration regression tests and tests/api-origin.live.cjs, which uses a real browser with no API mocks.
- Archived under s3://beatmind-frontend/releases/web/37d4c20d/.
- CloudFront invalidation IAQS5UZOZS4CWUIN5NBVUANG5F completed.
- Public release manifest and current dashboard script references verified.
- Backend task beatmind-api:27 and the Bridge installer were not changed.

## Verification

- Production build and all 14 frontend unit test files passed.
- An actual build without NEXT_PUBLIC_API_URL failed with the expected configuration error.
- All 29 emitted JavaScript files scanned: no localhost API fallback present.
- All nine script assets referenced by the live dashboard loaded; the shared API bundle contains the production origin and no local API address.
- Unmocked browser requests reached https://api.beatmind.io. An intentionally invalid test token received HTTP 401 and redirected to login; health returned HTTP 200/ok. No API request failed at the network layer. No real user credentials were used.
- Bridge controls and stem workflow browser suites passed at 1440px and 390px against deployed assets, using API/audio fixtures. These tests do not prove an actual Bridge launch.
- Source and tests mirrored to the original workspace.

## Remaining Connection State

At verification, the real production health endpoint reported zero connected Bridges. Ableton command execution is not verified and must not be represented as connected. The Bridge needs an authenticated connection to the same BeatMind account before real launch or music commands can run.

Existing browser tabs can retain the previous bundle until reopened or refreshed. No user audio, reference choices, saved chats or Ableton sets were modified by this repair.
