# Application candidate checkpoint

This is a local release candidate, not a deployed application release.
Branch: `release/beatmind-audio-20260926`, based on the published bridge branch.
No backend task definition, website files or production feature flags changed.

## Fresh checks

- A new Python 3.12 virtual environment installed declared backend/test/bridge
  dependencies. With dotenv disabled, all 190 backend tests passed.
- `npm ci` from the candidate's lockfile succeeded; all five frontend regression
  test files passed. The production build and its TypeScript checks passed,
  exporting 13 pages, including after the public-copy corrections.
- The Linux amd64 candidate image built successfully. Its no-network smoke test,
  running as the application user with no credentials and no user recordings,
  performed cached Demucs separation: four aligned stems, two non-silent
  comparison previews and owner-scoped chat storage checks passed.
- Initial image config: `sha256:778dca34aaf081cb004b6e5689e81c66cd6b1939cfcad5ca2ae3cb9cb731d6ed`.
  Rebuild before shipping: the unused legacy auth module was removed afterward.
- A targeted credential-pattern scan found no matching keys in runtime source,
  frontend source or release scripts. Secret values were not copied into this tree.
- Updated public copy removes instant full-arrangement, every-parameter and
  automatic-connection claims, and identifies the illustrative chat as an example.

## Real production connection check

After the user reconnected the bridge and signed in to the website, the dashboard
reported connected. Authenticated `/api/bridge/status` returned HTTP 200 with
`bridge_connected: true`. ECS had one running task on `beatmind-api:19`.

At 16:46 PDT, a read-only request was submitted through the actual dashboard chat.
It produced exactly one `get_session_state` action with eight successful OSC
readbacks: tempo 123 BPM, 4/4, 17 tracks, eight unnamed scenes, stopped transport.
The producer summary agreed with the action results. No creation, deletion,
loading, playback, stop, save or other music write was requested or recorded.
The open set remained `Peak Bites - Dark Current 123 - Ready 02`.

The initial browser offline report was not present after sign-in/status polling;
no persistent account-linkage failure was reproduced. Do not describe the brief
offline display as a proven root cause or a patched production bug.

## Remaining release gates

The replacement OpenAI audio key passed a real generated-audio request in the
previous checkpoint. Listening is not yet enabled in the deployed backend.
The read-only production inspection is not evidence that the candidate's new
audition, approval, reference comparison and recovery workflow works end to end.

Still required: bounded release-model conversation evaluations, candidate browser
checks on desktop/mobile, committed-tree/container validation and an authenticated
candidate frontend -> bridge -> disposable Live Set -> audible preview -> review
test. Preserve the finished set; do not use it for write tests. Verify backup and
rollback artifacts before the coordinated backend/frontend release. Arrangement
timeline writing/export is not implemented by the chat tools and is not promised.
