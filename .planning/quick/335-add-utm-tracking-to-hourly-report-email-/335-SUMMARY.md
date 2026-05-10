---
phase: quick-335
plan: 01
subsystem: aws-lambda
tags: [utm, email, lambda, tracking, zietra]
dependency_graph:
  requires: []
  provides: [utm-tagged-email-links]
  affects: [marquee-hourly-report-lambda]
tech_stack:
  added: []
  patterns: [utm-query-params, html-anchor-links]
key_files:
  created:
    - aws/lambda/marquee-hourly-report/lambda_function.py
  modified: []
decisions:
  - "Prepend https:// to p['page'] (already site+path) to form valid URL — no GROUPS dict change needed"
  - "Footer anchors use same #94a3b8 color as surrounding text for visual consistency"
metrics:
  duration: 5m
  completed: "2026-05-10T20:57:39Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase quick-335: Add UTM Tracking to Hourly Report Email Links Summary

UTM-tagged hyperlinks added to all demo site entries and footer domains in the marquee-hourly-report Lambda email, deployed and verified live with {"visitors": 2} response.

## What Was Done

### Task 1: Edit handler.py
- **Page entry td (line 77):** `{p['page']}` plain text wrapped in `<a href='https://{p['page']}?utm_source=hourly-report&utm_medium=email&utm_campaign=zietra-demo'>` anchor with `color:#3b82f6` styling
- **Footer (line 95):** All 3 bare domain names (`marquee.zietra.com`, `asc606.zietra.com`, `turionspace.zietra.com`) converted to `<a>` anchors with same UTM params, `color:#94a3b8` to match existing footer text

### Task 2: Deploy and Verify
- Rezipped handler: `lambda-updated.zip` (2.4K)
- `aws lambda update-function-code` succeeded: `LastModified: 2026-05-10T20:57:39.000+0000`
- Lambda invoked: returned `{"visitors": 2}` — email sent, no runtime errors
- Handler copied to `aws/lambda/marquee-hourly-report/lambda_function.py` and committed

## Verification

| Check | Result |
|-------|--------|
| Python syntax | PASS (`ast.parse` clean) |
| `utm_source=hourly-report` occurrences | 4 (1 page-entry anchor + 3 footer anchors) |
| Lambda LastModified | 2026-05-10T20:57:39Z (within session) |
| Lambda invoke response | `{"visitors": 2}` — no errorMessage |
| Committed file contains UTM | grep confirmed 2 lines with UTM params |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `/Users/jeet/doordash-p2p/aws/lambda/marquee-hourly-report/lambda_function.py` exists
- [x] Commit `4f0405f0` exists in git log
- [x] Lambda LastModified matches deploy timestamp
- [x] `{"visitors": 2}` returned — no crash
