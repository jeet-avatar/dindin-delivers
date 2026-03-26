---
phase: quick-228
plan: 01
subsystem: offerletter-interview-assistant
tags: [security, lambda, dynamodb, license-key, interview-assistant]
key-files:
  modified:
    - /tmp/gac-lambda/get_app_config.py
    - /Users/jeet/Downloads/interview-assistant/interview_assistant.py
    - /Users/jeet/Downloads/interview-assistant/interview_server.py
    - /Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py
    - /Users/jeet/Downloads/offerletter-ai/interview.html
decisions:
  - "Lambda now requires both app_token AND session_id; session_id validated against DynamoDB offerletter-verified-sessions table"
  - "License key stored in ~/.oa-license on first use; prompted via tkinter dialog (desktop) or stdin (server)"
  - "interview.html shows license key section post-purchase; reads ol_session_id from localStorage"
metrics:
  completed: "2026-03-26"
---

# Quick Task 228: Secure get-app-config — Require Valid Session Summary

One-liner: Lambda get-app-config now requires a DynamoDB-verified purchase session_id alongside the static app_token, with per-client license key prompting and post-purchase UI display.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update Lambda to validate session_id against DynamoDB | Lambda deployed directly | `/tmp/gac-lambda/get_app_config.py` |
| 2 | Update all client files to send session_id | `6bec8b0c` | `interview_assistant.py`, `interview_server.py`, `interview_assistant_windows.py` |
| 3 | Add license key UI to interview.html, deploy, trigger build | `6bec8b0c` + S3 deploy | `interview.html` → `s3://offerletter.ai/interview.html` |

## Verification

- [x] Lambda smoke test: missing session_id → 403 "License key required. Get yours at offerletter.ai/interview after purchasing."
- [x] Lambda smoke test: invalid DynamoDB session → 403 "License key not found. Purchase at offerletter.ai to get yours."
- [x] Lambda smoke test: wrong token → 403 "Invalid token"
- [x] Lambda smoke test: valid token + fake session → 403 "License key not found"
- [x] grep confirms `_get_license_key`, `session_id`, `_LICENSE_FILE` in all 3 Python files
- [x] `python3 -m py_compile` passes on all 3 Python files — "all OK"
- [x] grep confirms `licenseKeySection` (2 refs), `licenseKeyValue`, `copyLicenseKey`, `ol_session_id` in interview.html
- [x] S3 upload succeeded: `interview.html → s3://offerletter.ai/interview.html`
- [x] CloudFront invalidation triggered: `IEEMSVUEZE7P0PJZDE529L42Z0` (InProgress → E319UG6B4QE97L)
- [x] Windows build workflow triggered: run `23573305824` in_progress

## What Changed

### Lambda (`get_app_config.py`)
- Added `import time, boto3` for DynamoDB
- Added `TABLE_NAME = "offerletter-verified-sessions"` constant
- After `app_token` check: reads `session_id` from body; returns 403 with license purchase message if empty
- Calls `dynamodb.get_item()` on the table; returns 403 if item not found
- Checks `expires_at` TTL field; returns 403 if expired
- Only fetches Secrets Manager keys when session is valid and unexpired

### Mac app (`interview_assistant.py`)
- Added `_LICENSE_FILE = os.path.expanduser("~/.oa-license")`
- Added `_get_license_key()`: reads from file first, falls back to tkinter `simpledialog.askstring`, saves on success
- Updated `_fetch_api_keys()`: calls `_get_license_key()`, POSTs `session_id` in body, handles `"error"` key in response

### Phone server (`interview_server.py`)
- Same `_LICENSE_FILE` constant
- `_get_license_key()`: stdin prompt version (no tkinter dependency), saves to file
- Same `_fetch_api_keys()` pattern with session_id

### Windows app (`interview_assistant_windows.py`)
- Same `_LICENSE_FILE` and `_get_license_key()` as Mac (tkinter dialog, Windows-compatible)
- Same `_fetch_api_keys()` pattern

### interview.html
- Added `#licenseKeySection` green card (hidden by default) before the walkthrough video div
- `unlockDownload()` now shows the section and populates `#licenseKeyValue` from `localStorage.getItem('ol_session_id')`
- Added `copyLicenseKey()` function with Copy/Copied feedback near `copyCmd()`
- Deployed to `s3://offerletter.ai/interview.html` with `max-age=0`
- CloudFront distribution `E319UG6B4QE97L` invalidated

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files modified:
- FOUND: `/tmp/gac-lambda/get_app_config.py` (contains `offerletter-verified-sessions`)
- FOUND: `/Users/jeet/Downloads/interview-assistant/interview_assistant.py` (contains `_get_license_key`)
- FOUND: `/Users/jeet/Downloads/interview-assistant/interview_server.py` (contains `_get_license_key`)
- FOUND: `/Users/jeet/doordash-p2p/apps/interview-assistant/interview_assistant_windows.py` (contains `_get_license_key`)
- FOUND: `/Users/jeet/Downloads/offerletter-ai/interview.html` (contains `licenseKeySection`, deployed to S3)
- FOUND: commit `6bec8b0c` — Windows file staged and pushed to main
- Windows build run `23573305824` in_progress on GitHub Actions
