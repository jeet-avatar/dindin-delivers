---
phase: quick
plan: 219
subsystem: offerletter-ai-frontend
tags: [ux, password, signup, offerletter]
key-files:
  modified:
    - /Users/jeet/Downloads/offerletter-ai/signup.html
decisions:
  - Used renderPasswordStrength('pwStrength', '') with empty string on focus — existing function already handles empty string (all 5 rules fail = all 5 grey circles), so no auth.js changes needed
  - scrollIntoView added to submit-error path so checklist is visible even if user has scrolled away
  - Removed min-height: 80px dead space since checklist is now shown on focus, not deferred until first keystroke
metrics:
  duration: "17 minutes"
  completed: "2026-03-23T19:31:03Z"
  tasks_completed: 2
  files_changed: 1
---

# Quick 219: Show Password Requirements Clearly on OfferLetter Signup — Summary

Password requirements checklist now appears immediately when the password field is focused (before any typing), turns green in real-time as each requirement is met, and the submit-error message directs users to the checklist instead of dumping raw requirement text into an alert.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Show password checklist on focus + fix submit error | ae1ec92 (offerletter repo) | signup.html |
| 2 | Deploy to S3 + CloudFront | (direct deploy) | — |

## Files Changed

### `/Users/jeet/Downloads/offerletter-ai/signup.html`

**Lines modified:**

1. **Line 63 (removed):** `#pwStrength { min-height: 80px; }` — dead space CSS rule removed entirely

2. **Lines 164-168 (added):** Focus listener immediately after existing `input` listener:
   ```js
   passwordInput.addEventListener('focus', () => {
     if (!passwordInput.value) {
       renderPasswordStrength('pwStrength', '');
     }
   });
   ```

3. **Lines 197-201 (replaced):**
   - Before: `if (!pwCheck.valid) { showError('Password requirements: ' + pwCheck.errors.join(', ')); return; }`
   - After:
   ```js
   if (!pwCheck.valid) {
     showError('Password does not meet all requirements — see the checklist below the password field.');
     document.getElementById('pwStrength').scrollIntoView({ behavior: 'smooth', block: 'center' });
     return;
   }
   ```

## Deployment

- **S3 upload:** `s3://offerletter.ai/signup.html` — `--cache-control "no-cache, no-store, must-revalidate"`
- **CloudFront distribution:** `E319UG6B4QE97L` (d13wgi0fw89dw8.cloudfront.net → www.offerletter.ai)
- **Invalidation ID:** `IA2KGRDWG91YE3UK5C4UIYTX0U`
- **Invalidation status:** Completed

## Live URL Verification

```
$ curl -s "https://www.offerletter.ai/signup.html" | grep "addEventListener.*focus"
    passwordInput.addEventListener('focus', () => {

$ curl -s "https://www.offerletter.ai/signup.html" | grep "see the checklist"
        showError('Password does not meet all requirements — see the checklist below the password field.');

$ curl -s "https://www.offerletter.ai/signup.html" | grep "min-height: 80px"
(no output — rule removed)
```

## Verification Checklist

- [x] Grep proof: `grep -n "addEventListener.*focus"` returns match at line 164
- [x] Grep proof: `grep -n "min-height: 80px"` returns nothing (rule removed)
- [x] Grep proof: `grep -n "see the checklist"` returns match at line 204
- [x] Live URL: `curl -s https://www.offerletter.ai/signup.html | grep "focus"` confirms deployment
- [x] CloudFront invalidation `IA2KGRDWG91YE3UK5C4UIYTX0U` status: Completed

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `/Users/jeet/Downloads/offerletter-ai/signup.html` — modified and verified on disk
- commit `ae1ec92` — exists in offerletter-ai repo (`git log` confirmed)
- CloudFront invalidation completed — live curl confirms new code is deployed
