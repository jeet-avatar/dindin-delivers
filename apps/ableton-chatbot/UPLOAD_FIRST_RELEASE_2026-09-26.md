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

## Upload Visibility Follow-Up

- Frontend commit `c979ef64` adds a persistent Upload song button to the song toolbar, a larger high-contrast file-picker button and an explicit Upload and analyze submission label.
- Archive: `s3://beatmind-frontend/releases/web/c979ef64/`; invalidation `IAHI6R53SO11FQ43O0BC7Z9LM1` completed. Backend and Bridge unchanged.
- Nine frontend regression suites, production build, desktop/mobile first-command tests and extended song/reference tests passed. The song tests now click the picker and use the resulting file chooser, not only programmatic input assignment. Song tests passed again against deployed assets at 1440px and 390px with fixture APIs.
- Actual signed-in browser: Upload song opens References; the file picker is visible and enabled, with a green button and 12px/16px padding. No file was chosen or uploaded on the user's behalf. Browser left on that screen.
- At diagnosis, the inspected account had only its existing QA reference and no newly uploaded file. This establishes no new upload in that account, not the cause of the user's report in another tab/browser.
- The canonical www.beatmind.io/dashboard works. The non-www beatmind.io/dashboard returned 404; DNS/redirect infrastructure was not changed in this frontend release.
