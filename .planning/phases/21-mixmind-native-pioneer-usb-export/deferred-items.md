# Deferred Items — Phase 21

Out-of-scope findings logged during plan execution. Not fixed in the originating
plan; to be triaged separately.

## tests/test_beat_detector.py::test_bpm_stable_flag fails on clean tree

- **Discovered during:** Plan 21-02 Task 2 integration-test run
- **Pre-existing:** Yes. Reproduced with `git stash` on `gsd/phase-21-mixmind-native-pioneer-usb-export`
  immediately after task-1 commit `15acf4a0`, with Task 2 changes removed.
- **Symptom:** `AssertionError: assert False` on `isinstance(result.bpm_stable, bool)`
  when `result.bpm_stable` prints as `True`. Indicates `bpm_stable` is a
  `numpy.bool_` (subclass of `int`), not Python `bool`. Ripple from numpy 2.x /
  madmom integration.
- **Scope:** Completely unrelated to the analyzer-pipeline wiring added in 21-02.
- **Action deferred to:** a follow-up quick task under `beat_detector.py` — cast
  `bpm_stable = bool(...)` explicitly before returning the BeatGrid. Fix is
  1 line; kept out of 21-02 to respect the scope boundary.
