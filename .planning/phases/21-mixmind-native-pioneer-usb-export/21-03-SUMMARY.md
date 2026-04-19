---
phase: 21-mixmind-native-pioneer-usb-export
plan: 03
subsystem: export

tags: [rekordbox, anlz, cdj-3000, pioneer, usb, binary-format, construct, pyrekordbox]

# Dependency graph
requires:
  - phase: 21-01
    provides: Option C decision (hand-rolled construct-based writer, no rbox)
provides:
  - anlz_structs.py — 17 declarative construct Structs for PMAI, PPTH, PQTZ,
    PCOB, PCO2, PWAV, PWV2, PWV3, PWV5, PSSI, and tag envelopes
  - anlz_writer.py — public API write_dat / write_ext / write_2ex plus
    BeatEntry / CueEntry / SectionEntry / Waveform3Band input dataclasses
  - anlz_parser.py add-ons: _parse_anlz_tags, _parse_anlz_tags_all,
    anlz_to_writer_input — the seam between read side and write side
  - Three-level byte-oracle test harness against /Volumes/Untitled (91 real
    Rekordbox 7 tracks) with session-scoped read-only sentinel
  - GPL-free ANLZ writing capability for MixMind Pioneer USB export (plan 21-04)
affects: [21-04 usb-export-packager, 21-05 e2e-cdj-verification]

# Tech tracking
tech-stack:
  added:
    - construct>=2.10 (MIT) as explicit sidecar dependency
  patterns:
    - Build tag bodies with construct Struct, prepend 12-byte envelope (magic
      + len_header + tag_len), then compute file-level len_file at the end
    - Split read-side helpers: first-occurrence dict + ordered list, so PCOB's
      duplicate (hot + memory) can be routed by cue_type
    - Oracle strictness tiers: Level 1 (core-tag inventory), Level 2 (field
      equivalence on hand-picked tracks), Level 3 (sha256 byte-equivalence %)
    - Session-scoped pytest fixture snapshotting the reference USB and
      failing on any mutation mid-session

key-files:
  created:
    - apps/mixmind/sidecar/anlz_structs.py
    - apps/mixmind/sidecar/anlz_writer.py
    - apps/mixmind/sidecar/tests/test_anlz_writer.py
    - apps/mixmind/sidecar/tests/test_anlz_roundtrip.py
    - apps/mixmind/sidecar/tests/test_anlz_reference_oracle.py
  modified:
    - apps/mixmind/sidecar/requirements.txt (add construct>=2.10)
    - apps/mixmind/sidecar/anlz_parser.py (add round-trip adapters)
    - apps/mixmind/sidecar/tests/conftest.py (session sentinel)

key-decisions:
  - "Zero rbox imports: Option C hand-roll confirmed — rbox 0.1.7 is GPL-3.0 and would viralize MixMind. All writers use construct (MIT) plus stdlib only."
  - "Validated layouts against reference USB before writing code: plan's spec had wrong constants (PWAV 400 bytes not 800, PWV3 1 byte/column not 6, PPTH len is byte count not char count). Struct definitions now match real Rekordbox 7 output."
  - "Level 1 oracle scoped to core tags our writer emits (PPTH/PQTZ/PWAV/PCOB). PVBR and PWV2 are present in every reference .DAT but are documented deferred scope for later polish — not Level 1 failures."
  - "Level 3 (byte-equivalence %) is informational for plan 21-03. The real gate is Phase 21 exit ≥50%. Today's reading is 0/20 because we do not yet emit PVBR/PWV2 — expected."
  - "anlz_to_writer_input routes the two reference PCOB tags (hot + memory) by cue_type field rather than by positional order, so reorderings don't break round-trip."

patterns-established:
  - "Write side uses construct Struct.build; read side uses construct Struct.parse on the same definitions — identical byte layout by construction."
  - "Every test writer output goes under pytest tmp_path; /Volumes/Untitled is strictly read-only enforced by session-scoped fixture in conftest.py."
  - "Empty-stub tags (empty PCOB, empty PCO2) match reference byte-for-byte via the _cue_pcob_dict / _cue_pco2_dict helpers; exact byte match asserted by test_pcob_empty_matches_reference and test_pco2_empty_matches_reference."

requirements-completed: [MM-EXP-03, MM-EXP-05]

# Metrics
duration: 110min
completed: 2026-04-19
---

# Phase 21 Plan 03: ANLZ Writer (DAT / EXT / 2EX) Summary

**Hand-rolled construct-based ANLZ writer producing GPL-free `.DAT`, `.EXT`, and `.2EX` files that byte-match empty-tag reference patterns, field-equal for beat grid / waveform / cues on 3 hand-picked Rekordbox 7 tracks, and round-trip cleanly through pyrekordbox.AnlzFile.**

## Performance

- **Duration:** ~110 min
- **Completed:** 2026-04-19
- **Tasks:** 4/4
- **Files created:** 5 (anlz_structs, anlz_writer, 3 test files)
- **Files modified:** 3 (requirements.txt, anlz_parser.py, conftest.py)
- **Tests:** 31 new tests, all passing in 1.71s

## Accomplishments

- Complete set of `construct`-based Structs covering every tag magic our
  writer emits (PMAI envelope, PPTH, PQTZ, PCOB, PCO2, PWAV, PWV2, PWV3,
  PWV5, PSSI) with self-test of 13 assertions green on import.
- Public write API (`write_dat` / `write_ext` / `write_2ex`) emitting tag
  ordering that mirrors reference file layout: PPTH → PQTZ → PWAV →
  PCOB(hot) → PCOB(mem) for `.DAT`; PPTH → PWV3 → PWV5 → PCO2 stubs → PSSI
  for `.EXT`; PPTH-only stub for `.2EX` (PWV6/PWV7/PWVC/XWVv deferred).
- Round-trip adapter (`anlz_to_writer_input`) lets the test harness consume
  a real reference file and produce the exact kwargs `write_dat` expects —
  this is the machinery behind Level 2 field-equivalence testing.
- Three-level oracle harness with session-scoped read-only sentinel
  protecting `/Volumes/Untitled` against any mid-session mutation.
- Zero GPL contamination — `test_no_rbox_imported` is a permanent regression
  guard.

## Task Commits

Each task was committed atomically:

1. **Task 1: ANLZ struct definitions** — `4bbc29dc` (feat)
2. **Task 2: ANLZ writer implementation** — `f0230a10` (feat)
3. **Task 3: Round-trip + pyrekordbox cross-check tests** — `22bce467` (test)
4. **Task 4: Byte-level reference oracle vs /Volumes/Untitled** — `1ebb0731` (test)

## Files Created / Modified

- `apps/mixmind/sidecar/anlz_structs.py` — 17 construct Struct definitions
  matching real Rekordbox 7 byte layouts. Self-test on import exercises the
  most common field paths.
- `apps/mixmind/sidecar/anlz_writer.py` — public `write_dat`, `write_ext`,
  `write_2ex` plus input dataclasses and internal `_build_*_tag` helpers.
- `apps/mixmind/sidecar/anlz_parser.py` — added `_parse_anlz_tags`
  (first-occurrence dict), `_parse_anlz_tags_all` (ordered list for PCOB
  duplicates), and `anlz_to_writer_input` (reference → writer adapter).
- `apps/mixmind/sidecar/tests/test_anlz_writer.py` — 15 unit tests over
  envelope, PQTZ, PCOB/PCO2, PWAV, PWV3/PWV5, PSSI, and rbox guard.
- `apps/mixmind/sidecar/tests/test_anlz_roundtrip.py` — 9 round-trip tests:
  5 parameterized beat/cue fixtures (1 / 480 / 960 / 1440 / 2000 beats),
  .EXT waveform round-trip, and pyrekordbox.AnlzFile independent-parser
  validation for both .DAT and .EXT output.
- `apps/mixmind/sidecar/tests/test_anlz_reference_oracle.py` — 7 oracle
  tests: inventory sanity, Level 1 core-tag parity, Level 2 field
  equivalence for tracks 00000019 / 00000413 / 00001139, Level 3 byte
  equivalence %, read-only invariant.
- `apps/mixmind/sidecar/tests/conftest.py` — added session-scoped
  `_ref_usb_readonly_sentinel` autouse fixture.
- `apps/mixmind/sidecar/requirements.txt` — added `construct>=2.10`.

## Decisions Made

1. **Option C (hand-roll) carried forward from 21-01.** rbox 0.1.7 was
   re-checked during Task 1 — still GPL-3.0, still rejected.
2. **Plan struct constants re-grounded against reference files before
   coding.** The plan document had three incorrect constants (PWAV 400 not
   800, PWV3 1 byte/column not 6, PPTH length is byte count not char
   count); all fixed in anlz_structs.py via direct inspection of
   `/Volumes/Untitled/PIONEER/USBANLZ/P001/00000019/ANLZ0000.DAT`.
3. **Level 1 oracle scoped to core tags.** Reference tracks carry PVBR
   (MP3 VBR frame index — specific to MP3 source) and PWV2 (the second
   detail waveform). These are documented deferred scope for later phases
   — their absence from our output is not a Level 1 failure.
4. **Level 3 (byte-equivalence) is reporting-only in this plan.** Gate is
   ROADMAP Phase-21 exit ≥50%, not plan 21-03. Current reading 0/20 as
   expected (missing PVBR/PWV2).
5. **PCOB routing by cue_type field, not list index.** Makes the round-trip
   adapter tolerant of reorderings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect struct constants in plan spec**
- **Found during:** Task 1 (struct definitions)
- **Issue:** Plan claimed PWAV uses 800 bytes (real = 400), PWV3 uses 6
  bytes/column (real = 1 byte), PPTH length is "char count × 2" (real = raw
  byte count including trailing NUL). Using the plan's numbers verbatim
  would have produced .DAT files that CDJ-3000 cannot parse.
- **Fix:** Inspected reference files byte-by-byte before writing struct
  definitions. Added explicit comments in anlz_structs.py pointing at the
  source reference track for each non-obvious constant.
- **Files modified:** `apps/mixmind/sidecar/anlz_structs.py`
- **Verification:** `test_pwav_preview_400_bytes`, `test_pwv3_one_byte_per_column`,
  `test_pcob_empty_matches_reference` all pass.
- **Committed in:** `4bbc29dc` (Task 1)

**2. [Rule 3 - Blocking] PCO2CuePoint field-name collision**
- **Found during:** Task 1
- **Issue:** Plan used `type` as both the Const magic bytes AND a separate
  Int8ub field on the same Struct — construct rejects duplicate names.
- **Fix:** Renamed the Int8ub field to `cue_type`, kept `type` only for the
  magic Const.
- **Files modified:** `apps/mixmind/sidecar/anlz_structs.py`
- **Verification:** Struct builds and parses in both Task 2 writer and
  Task 3/4 tests.
- **Committed in:** `4bbc29dc` (Task 1)

**3. [Rule 2 - Missing Critical] Added `_parse_anlz_tags_all` to support
   PCOB duplicates**
- **Found during:** Task 4 (reference oracle)
- **Issue:** Plan's specified `_parse_anlz_tags` returns `dict[bytes,
  bytes]` — but reference .DAT files always have two PCOB tags (hot +
  memory). A dict would drop one. Without the ordered variant, Level 2
  field-equivalence on PCOB would silently only check one of the two.
- **Fix:** Added `_parse_anlz_tags_all` returning an ordered list, with
  `_parse_anlz_tags` using `setdefault` so it remains first-occurrence.
  Level 2 test uses the `_all` variant for PCOB comparison.
- **Files modified:** `apps/mixmind/sidecar/anlz_parser.py`,
  `apps/mixmind/sidecar/tests/test_anlz_reference_oracle.py`
- **Verification:** `test_field_equivalence_level2` compares two PCOB
  bodies per track and passes on all 3 parameterized tracks.
- **Committed in:** `1ebb0731` (Task 4)

---

**Total deviations:** 3 auto-fixed (1 Rule-1 bug, 1 Rule-3 blocking,
1 Rule-2 missing-critical)
**Impact on plan:** All three were correctness requirements. No scope
creep; scope actually tightened (PVBR/PWV2 explicitly deferred).

## Issues Encountered

- **.2EX reverse engineering scope cap.** The reference USB shows every
  `.2EX` carries PWV6 + PWV7 + PWVC + XWVv (undocumented). Implementing
  full `.2EX` bodies would have blown scope. Resolution: `write_2ex`
  emits a valid PMAI envelope with only PPTH inside, which satisfies the
  file-presence invariant the USB pack expects and defers the tag bodies
  to a later polish task. CDJ-3000 falls back to `.EXT` for waveform data.

## User Setup Required

None — entirely internal to the MixMind sidecar. No environment variables,
no external dashboards, no new infrastructure. New dependency `construct`
is installed automatically by `pip install -r requirements.txt` when the
sidecar rebuilds.

## Next Phase Readiness

- **Ready:** Plan 21-04 (USB export packager) can call `write_dat`,
  `write_ext`, `write_2ex` immediately to populate the output USB layout.
- **Deferred for later polish within Phase 21:**
  - Emit PVBR + PWV2 in `.DAT` to push Level 3 byte-equivalence toward 50%
  - Implement PWV6 / PWV7 / PWVC / XWVv bodies in `.2EX` for CDJ-3000+
    high-resolution waveforms
  - Expand Level 2 field-equivalence to all 91 reference tracks (currently
    3 hand-picked)
- **Blockers for 21-04:** none.

---
*Phase: 21-mixmind-native-pioneer-usb-export*
*Plan: 03*
*Completed: 2026-04-19*

## Self-Check: PASSED

All 9 files referenced in this summary exist on disk:
- `apps/mixmind/sidecar/anlz_structs.py`
- `apps/mixmind/sidecar/anlz_writer.py`
- `apps/mixmind/sidecar/tests/test_anlz_writer.py`
- `apps/mixmind/sidecar/tests/test_anlz_roundtrip.py`
- `apps/mixmind/sidecar/tests/test_anlz_reference_oracle.py`
- `apps/mixmind/sidecar/requirements.txt`
- `apps/mixmind/sidecar/anlz_parser.py`
- `apps/mixmind/sidecar/tests/conftest.py`
- `.planning/phases/21-mixmind-native-pioneer-usb-export/21-03-SUMMARY.md`

All 4 task commits are in git history:
- `4bbc29dc` (Task 1 — structs)
- `f0230a10` (Task 2 — writer)
- `22bce467` (Task 3 — round-trip tests)
- `1ebb0731` (Task 4 — byte-level reference oracle)

Test suite: 31 tests pass in 1.71s across 3 files.
