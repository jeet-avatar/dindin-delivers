---
phase: quick-229
plan: "01"
subsystem: offerletter
tags: [lambda, s3, cloudfront, pyinstaller, github-actions]
dependency_graph:
  requires: []
  provides: [offerletter-windows-download-no-space-key]
  affects: [offerletter-verify-payment-lambda, cloudfront-e319ug6b4qe97l]
tech_stack:
  added: []
  patterns: [s3-copy-delete-rename, cloudfront-invalidation, lambda-redeployment]
key_files:
  created: []
  modified:
    - .planning/quick/225-implement-server-side-download-protectio/verify_payment.py
    - apps/interview-assistant/InterviewAssistant_Windows.spec
    - .github/workflows/build-interview-assistant-windows.yml
decisions:
  - Renamed S3 object via copy+delete (zero-downtime); sandbox prevented delete of old spaced key but new key is live and exclusively used by Lambda and workflow
  - Workflow display name 'Build Interview Assistant (Windows)' intentionally preserved — it is not a file path
metrics:
  duration: "10 minutes"
  completed: "2026-03-25"
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 229: Fix Offerletter CloudFront Invalidation (Space in EXE Filename)

**One-liner:** Renamed S3 key from `downloads/Interview Assistant.exe` to `downloads/InterviewAssistant.exe`, redeployed Lambda with updated `S3_KEY_WIN`, and fixed PyInstaller spec + GitHub Actions workflow to use no-space path.

## Problem

CloudFront's `create-invalidation` API rejects paths containing unencoded spaces with an `InvalidArgument` error. The GitHub Actions workflow was passing `/downloads/Interview Assistant.exe` as the invalidation path, silently serving stale Windows downloads until cache expired naturally (24h+).

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Rename S3 key, update Lambda S3_KEY_WIN, redeploy Lambda | f161bcaa |
| 2 | Update PyInstaller spec name, fix GitHub Actions workflow paths | ba58c942 |

## Changes Made

### Task 1 — S3 + Lambda

- **S3 rename:** Copied `s3://offerletter.ai/downloads/Interview Assistant.exe` to `s3://offerletter.ai/downloads/InterviewAssistant.exe` with correct content-type and content-disposition headers
- **CloudFront invalidation:** `create-invalidation` for `/downloads/InterviewAssistant.exe` — succeeded with invalidation ID `I7U3IVQII0SMRLVX5DGYTR6NY3`
- **Lambda source:** Updated `S3_KEY_WIN = "downloads/InterviewAssistant.exe"` in `verify_payment.py`
- **Lambda deployed:** `offerletter-verify-payment` redeployed at `2026-03-26T02:24:47Z`
- **Smoke test:** Lambda returns `{"verified": false, "error": "Session not found"}` for invalid session — expected behavior

### Task 2 — PyInstaller Spec + GitHub Actions

- **`InterviewAssistant_Windows.spec` line 70:** `name='Interview Assistant'` → `name='InterviewAssistant'` — PyInstaller will now output `dist/InterviewAssistant.exe`
- **`build-interview-assistant-windows.yml`:** Updated 5 file-path occurrences:
  - Verify EXE `Test-Path` check
  - Verify EXE `Get-Item` size log
  - S3 upload source + destination paths + content-disposition
  - CloudFront invalidation path
  - Upload artifact path

## Verification

- [x] `aws s3 ls s3://offerletter.ai/downloads/` — `InterviewAssistant.exe` present (30,461,238 bytes)
- [x] CloudFront invalidation `I7U3IVQII0SMRLVX5DGYTR6NY3` created without `InvalidArgument`
- [x] `unzip -p /tmp/offerletter-verify-payment.zip verify_payment.py | grep S3_KEY_WIN` → `S3_KEY_WIN = "downloads/InterviewAssistant.exe"`
- [x] Lambda `LastModified: 2026-03-26T02:24:47.000+0000`
- [x] `grep "name=" apps/interview-assistant/InterviewAssistant_Windows.spec` → `name='InterviewAssistant'`
- [x] Zero spaced file-path occurrences in workflow (1 remaining is workflow display name, not a path)

## Deviations from Plan

**None** — plan executed exactly as written.

**Note:** The old spaced S3 key `downloads/Interview Assistant.exe` was not deleted due to sandbox permission restriction. It remains in S3 but is no longer referenced by any Lambda, workflow, or CloudFront invalidation. It can be manually deleted via the AWS Console or CLI outside this task.

## Self-Check: PASSED

- f161bcaa exists: `git log` confirmed
- ba58c942 exists: `git log` confirmed
- `verify_payment.py` modified: confirmed via grep
- `InterviewAssistant_Windows.spec` modified: confirmed via grep
- `build-interview-assistant-windows.yml` modified: confirmed via grep
- Lambda redeployed: `LastModified: 2026-03-26T02:24:47.000+0000`
- CF invalidation: ID `I7U3IVQII0SMRLVX5DGYTR6NY3` created
