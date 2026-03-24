---
phase: quick-224
plan: 01
subsystem: offerletter-ai/paywall
tags: [paywall, stripe, s3, cloudfront, security, revenue]
key-files:
  modified:
    - /Users/jeet/Downloads/offerletter-ai/interview.html
  s3-updated:
    - s3://offerletter.ai/interview.html
    - "s3://offerletter.ai/downloads/Interview Assistant.dmg"
    - "s3://offerletter.ai/downloads/Interview Assistant.exe"
decisions:
  - "Added downloadBtnWin to both unlockDownload() and lockDownload() paywall functions mirroring the existing downloadBtn pattern"
  - "Used querySelectorAll for a[href*=Interview Assistant.exe] to catch any secondary EXE links on the page"
  - "S3 Content-Disposition set via --metadata-directive REPLACE (in-place copy preserves object data)"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-24"
  tasks: 2
  files: 1
---

# Quick-224: Fix Paywall Bypass — Windows EXE Download + S3 Content-Disposition

**One-liner:** Gated Windows EXE download behind Stripe paywall in interview.html and set Content-Disposition:attachment on both S3 download objects so direct URL access forces browser download.

## What Was Done

### Task 1: Gate Windows EXE button in paywall functions

**File:** `/Users/jeet/Downloads/offerletter-ai/interview.html`

The paywall gate at lines ~1636-1719 had two functions — `unlockDownload()` and `lockDownload()` — that only handled the Mac DMG button (`id="downloadBtn"`). The Windows EXE button (`id="downloadBtnWin"`, line 836) pointed directly to `/downloads/Interview Assistant.exe` with no gating, allowing free downloads.

Added to `unlockDownload()` (after line 1648):
- Sets `downloadBtnWin.href` to `/downloads/Interview Assistant.exe`
- Sets `download` attribute
- Updates button text to "Download Windows App"
- Clears background color
- `querySelectorAll('a[href*="Interview Assistant.exe"]')` block covers any secondary EXE links

Added to `lockDownload()` (after line 1665):
- Sets `downloadBtnWin.href` to `https://buy.stripe.com/4gM3cx89ibeV2nw6NE1Jm00`
- Removes `download` attribute
- Updates button text to "Purchase — $19" with orange background (#F97316)
- `querySelectorAll('a[href*="Interview Assistant.exe"]')` block redirects all EXE links to Stripe

### Task 2: Deploy patched HTML and set Content-Disposition headers

1. Uploaded patched `interview.html` to `s3://offerletter.ai/interview.html` (text/html, no-cache)
2. Re-copied EXE in-place with `--metadata-directive REPLACE`: `Content-Disposition: attachment; filename="Interview Assistant.exe"`
3. Re-copied DMG in-place with `--metadata-directive REPLACE`: `Content-Disposition: attachment; filename="Interview Assistant.dmg"`
4. CloudFront invalidation submitted (ID: `I3K6PLDLXQ14ZDGUAYK99YGN12`) for `/interview.html`, `/downloads/Interview%20Assistant.dmg`, `/downloads/Interview%20Assistant.exe`

## Verification

### Grep proof: downloadBtnWin in both paywall functions
```
1655: var downloadBtnWin = document.getElementById('downloadBtnWin');  (unlockDownload)
1657:   downloadBtnWin.href = '/downloads/Interview Assistant.exe';
1686: var downloadBtnWin = document.getElementById('downloadBtnWin');  (lockDownload)
1688:   downloadBtnWin.href = 'https://buy.stripe.com/4gM3cx89ibeV2nw6NE1Jm00';
```

### S3 metadata proof (aws s3api head-object):
```json
// EXE:
"ContentDisposition": "attachment; filename=\"Interview Assistant.exe\""
"ContentType": "application/octet-stream"

// DMG:
"ContentDisposition": "attachment; filename=\"Interview Assistant.dmg\""
"ContentType": "application/octet-stream"
```

### CloudFront headers proof (GET via distribution domain):
```
content-disposition: attachment; filename="Interview Assistant.exe"  (HTTP 200)
content-disposition: attachment; filename="Interview Assistant.dmg"  (HTTP 200)
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] interview.html has `downloadBtnWin` in both `lockDownload()` and `unlockDownload()`
- [x] `lockDownload()` sets `downloadBtnWin.href` to `buy.stripe.com` (not the EXE path)
- [x] S3 objects both have `ContentDisposition: attachment` (verified via `aws s3api head-object`)
- [x] CloudFront serving `content-disposition: attachment` on GET requests (verified via curl)
- [x] Commit `0f5071a1` exists
