---
phase: quick-184
plan: 01
subsystem: offerletter-ai
tags: [bugfix, cookie-consent, cognito-auth, s3-deploy]
dependency_graph:
  requires: []
  provides: [working-signup-flow, working-forgot-password-flow, idempotent-consent-banner]
  affects: [offerletter.ai]
tech_stack:
  added: []
  patterns: [dom-idempotency-guard]
key_files:
  created: []
  modified:
    - /Users/jeet/Downloads/offerletter-ai/consent.js
    - /Users/jeet/Downloads/offerletter-ai/auth.js
decisions:
  - Added DOM idempotency guard in consent.js rather than removing auto-invoke, so pages loading consent.js without auth.js still work
  - Replaced auth.js initCookieConsent call with explanatory comment for future maintainability
metrics:
  duration: 107s
  completed: 2026-03-17
---

# Quick Task 184: Fix OfferLetter.ai Signup and Forgot Password Summary

Fixed JS errors blocking signup and forgot-password flows caused by double initCookieConsent() invocation creating duplicate DOM elements with same IDs.

## What Changed

### Task 1: Fix double initCookieConsent invocation

**Root cause:** `initCookieConsent()` was called twice on auth pages -- once by consent.js auto-invoke (line 208) and again by auth.js (line 443). On first visit (no consent stored), this created duplicate DOM elements with the same IDs, causing getElementById to return the first element while event listeners attached to the second, producing orphaned handlers and JS errors that blocked form submission.

**Fix 1 -- consent.js (line 15):** Added DOM idempotency guard:
```js
if (document.getElementById('ol-consent-banner')) return;
```
This ensures only ONE banner is ever created even if called multiple times.

**Fix 2 -- auth.js (line 443):** Removed the redundant `initCookieConsent()` call and replaced with an explanatory comment. The call was unnecessary because consent.js is always loaded before auth.js and auto-invokes at its end.

### Task 2: Deploy to S3 + CloudFront invalidation

- Uploaded both fixed files to `s3://offerletter.ai/` with no-cache headers
- CloudFront invalidation `I23RAHX7Z7IXS0CKRJMRHR4YAN` for `/consent.js` and `/auth.js`
- Verified fixes live on `https://www.offerletter.ai/`

## Verification

```
## Verification
- [x] Grep proof: consent.js line 15 has idempotency guard `getElementById('ol-consent-banner')`
- [x] Grep proof: auth.js has no initCookieConsent() call (only comment on line 443)
- [x] Deploy proof: curl www.offerletter.ai/consent.js shows guard on line 15
- [x] Deploy proof: curl www.offerletter.ai/auth.js grep returns only comment, not function call
- [x] Cognito endpoint reachable at cognito-idp.us-east-1.amazonaws.com
- [x] Auth.signUp() and Auth.forgotPassword() functions intact in deployed auth.js
- [x] CloudFront invalidation created for both paths
```

## Deviations from Plan

None -- plan executed exactly as written.

## Files Modified

| File | Change |
|------|--------|
| `/Users/jeet/Downloads/offerletter-ai/consent.js` | Added DOM idempotency guard (line 15) |
| `/Users/jeet/Downloads/offerletter-ai/auth.js` | Removed redundant initCookieConsent() call (line 443) |

## Deployment

| Resource | Value |
|----------|-------|
| S3 Bucket | `offerletter.ai` |
| CloudFront Distribution | `E319UG6B4QE97L` |
| Invalidation ID | `I23RAHX7Z7IXS0CKRJMRHR4YAN` |
| Cache-Control | `no-cache, no-store, must-revalidate` |
