# Phase 21 — CDJ-3000 Acceptance Test Report

> **Physical-hardware acceptance gate for Phase 21** (MixMind Native Pioneer USB Export).
> This file is the ground-truth record that gates Task 4 (DMG build + distribute).
> If any CRITICAL row below is FAIL, DO NOT build the DMG — loop back through
> plan 21-03 (ANLZ format issues) or 21-04 (PDB / USB layout issues) and fix
> before re-running the test.

## Environment

| Field | Value |
| ----- | ----- |
| Test date | _YYYY-MM-DD_ |
| CDJ firmware (System → Version) | _e.g. 3.04.1_ |
| MixMind build | _dev mode (from `npm run dev`) / DMG build NN_ |
| MixMind sidecar commit | _e.g. 88f17ac6_ |
| Test USB — make/model | _e.g. SanDisk Ultra 128GB_ |
| Test USB — filesystem | _exFAT / FAT32 / HFS+_ (MUST be exFAT for >32GB) |
| Test USB — mount path | _e.g. `/Volumes/MIXMIND-TEST` (must be writable; `/Volumes/Untitled/` is the READ-ONLY reference oracle and MUST NOT be used as the export target)_ |

## Pre-flight checklist (pass BEFORE plugging into CDJ)

- [ ] Test USB is writable and is NOT `/Volumes/Untitled/`
- [ ] `GET http://127.0.0.1:<sidecar-port>/api/usb/status` → `connected:true, path:"/Volumes/<YOUR-USB>"`
- [ ] MixMind app starts cleanly (sidecar health-check passes)
- [ ] Folder import completes with `imported > 0` for the test batch

---

## Phase 1 — Small-batch test (5 tracks)

Folder used: _e.g. `~/Music/MixMind-Inbox-5track-subset/`_

| # | Criterion | Result | Notes |
| - | --------- | ------ | ----- |
| 1 | Track list displays on CDJ — all 5 tracks visible | PASS / FAIL | |
| 2 | Tap one — track loads, no "cannot load" error | PASS / FAIL | |
| 3 | CDJ BPM display matches MixMind's calculated BPM (±0.5) | PASS / FAIL | _MixMind: ___ BPM, CDJ: ___ BPM_ |
| 4 | 3-band waveform renders (low=red, mid=green, high=blue) | PASS / FAIL | |
| 5 | Beatgrid locks — play 30s, beat indicator stays in sync | PASS / FAIL | |
| 6 | Hot cues recall at assigned positions (if auto-cues set) | PASS / FAIL / NOT_TESTED | |
| 7 | Artwork appears on CDJ browser grid | PASS / FAIL / NO_ART | |

---

## Phase 2 — Medium-batch test (50 tracks)

Folder used: _e.g. `~/Music/MixMind-Inbox-50track-subset/`_

| # | Criterion | Result | Notes |
| - | --------- | ------ | ----- |
| 1 | Track list displays — all 50 tracks | PASS / FAIL | |
| 2 | Track list scrolls smoothly on CDJ | PASS / FAIL | |
| 3 | Random 5-track sample loads + plays | PASS / FAIL | |
| 4 | No "library load taking long" warning | PASS / FAIL | |
| 5 | Artwork renders for tracks that had embedded art | PASS / FAIL / NO_ART | |

---

## Phase 3 — Full library (1458 tracks, ~48GB)

Folder used: `~/Music/MixMind-Inbox/` (the Phase 21 reference corpus)
USB target capacity: _64GB+ exFAT required (FAT32 maxes at 32GB files — see 21-RESEARCH.md Pitfall #4)_

| # | Criterion | Result | Notes |
| - | --------- | ------ | ----- |
| 1 | Import completes — `imported = 1458` | PASS / FAIL | |
| 2 | Analyze completes for all 1458 (may take 30-60 min) | PASS / FAIL | |
| 3 | Export completes without sidecar crash | PASS / FAIL | |
| 4 | All 1458 tracks visible on CDJ-3000 | PASS / FAIL | |
| 5 | Random 5-track sample loads + plays correctly | PASS / FAIL | |
| 6 | Playlist navigation works (if playlists exported) | PASS / FAIL / N/A | |
| 7 | No "no library" / "corrupt PDB" errors | PASS / FAIL | |

---

## Failures / Remediation Notes

_List any FAIL rows here with diagnosis. If format-level (ANLZ / PDB / USB
layout), link to the failing criterion above and propose a fix plan (which
sub-module to change, which reference-USB byte-equivalence test to add)._

---

## DMG Build Verification

_Appended by Task 4 ONLY IF all Phase 1-3 tests pass._

| Field | Value |
| ----- | ----- |
| Build date | _YYYY-MM-DD_ |
| DMG size | _NNN MB_ |
| S3 / CloudFront URL | _https://www.beatmind.io/MixMind-mac.dmg_ |
| Codesigned | PASS / FAIL |
| Notarized | PASS / FAIL |
| Installed-app launch (no Gatekeeper block) | PASS / FAIL |
| Installed-app → CDJ-3000 3-track export smoke test | PASS / FAIL |

---

*Phase: 21-mixmind-native-pioneer-usb-export*
*Last updated: 2026-04-20 (awaiting physical acceptance test)*
