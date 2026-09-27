# Upload-First References

- Frontend source: `3c0db627c95d2ee49af0ec8d8d491c7efc87e597`, pushed to `release/beatmind-audio-20260926` and deployed to https://www.beatmind.io/dashboard.
- Archive: `s3://beatmind-frontend/releases/web/3c0db627/`.
- CloudFront invalidation `I40F5E361JN4R4GC2ATQC932WW` completed.
- Backend `beatmind-api:25` and Bridge unchanged; no restart or music commands.
- New songs offer Upload a reference track. Project reference screens default to an empty upload form when no reference is attached, including navigation through the References tab.
- Existing uploads remain accessible only after explicitly opening Choose a saved reference. Opening the library does not select or play a file. Existing song references still restore when that song is reopened.
- Nine frontend regression suites and the production build passed. Song/reference and sound-approval browser tests passed on desktop/mobile.
- Extended song workflow tests include a preexisting QA reference, an empty initial selection/player, explicit library disclosure without selection, attaching only the uploaded file, and a second new song with cleared file input, permission checkbox and reference. These tests also passed against deployed assets at 1440px and 390px.
- Actual signed-in production New song created `3b54a9a9-64ae-417a-89e1-7d3463db62ca`, title New song, zero messages, no selected reference and no selected Live Set. Upload view had an empty file picker, collapsed saved references and zero audio players. Bridge remained connected.
- Browser left at the empty upload view for the user's own file. No test track uploaded or selected in the live account during this verification; no existing songs, references or Ableton tracks deleted.
