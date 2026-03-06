---
phase: quick-104
title: "Detailed fix plan for 23 UI audit issues"
status: complete
date: 2026-03-06
---

# Quick-104 Summary

## What Was Done

Performed root cause analysis on all 23 issues from Quick-103 UI audit, verifying each against actual source code with grep.

## Key Finding

**10 of 23 issues are false positives.** The audit agents missed backend route aliases registered via `app.add_api_route()` at the bottom of `main_new.py` (lines 21300+). These aliases were added during v1.2 API Standardization specifically for iOS/Android compatibility.

## Verified Issue Breakdown

| Category | Count | Action |
|----------|-------|--------|
| FALSE POSITIVE | 10 | No fix needed — endpoints/features exist |
| HIGH (backend bug) | 1 | BUG-01: function shadow in main_new.py |
| MEDIUM (missing UX) | 4 | BUG-02 to BUG-05: empty handlers, missing buttons |
| LOW (dead code) | 4 | BUG-06 to BUG-10: aspirational features, empty lambdas |
| INFO (by design) | 4 | NFX-01 to NFX-03 + BUG-07: no fix needed |

## Fix Waves

| Wave | Issues | Effort | Priority |
|------|--------|--------|----------|
| 1 | BUG-01 (backend shadow) | 5 min | Do now |
| 2 | BUG-02, BUG-03 (Android handlers) | 15 min | Do now |
| 3 | BUG-04, BUG-05 (iOS UX) | 20 min | Do now |
| 4 | BUG-06, BUG-08-10 (dead code) | 85 min | Defer |
| 5 | NFX-01-03, BUG-07 | 0 min | No fix |

**Recommended:** Fix Waves 1-3 now (5 real bugs, ~40 min total)

## Artifact

- `ISSUE_TRACKER.md` — Complete issue database with root cause, fix plan, effort estimates
