---
plan: 203
phase: quick
subsystem: offerletter-ai-website
tags: [paywall, pricing, ux, stripe]
key-files:
  modified:
    - /Users/jeet/Downloads/offerletter-ai/interview.html
    - /Users/jeet/Downloads/offerletter-ai/offer.html
    - /Users/jeet/Downloads/offerletter-ai/login.html
    - /Users/jeet/Downloads/offerletter-ai/signup.html
    - /Users/jeet/Downloads/offerletter-ai/index.html
    - /Users/jeet/Downloads/offerletter-ai/dashboard.html
decisions:
  - "Used localStorage ol_purchased flag gated by ?purchased=true URL param on Stripe redirect; no backend needed"
  - "Paywall JS runs immediately on DOMContentLoaded — mutates existing downloadBtn in-place rather than hiding/showing two buttons; avoids HTML duplication"
  - "purchaseNotice banner added above download-card with display:none default; JS shows it for unpurchased visitors"
  - "Step 4 (BlackHole) added as new optional setup step with full routing instructions"
  - "dashboard.html trial-badge -> status-badge was a global replace_all (3 occurrences); no visible text changed"
metrics:
  duration: "~2 min"
  completed: "2026-03-20"
  tasks: 3
  files: 6
---

# Quick Task 203: OfferLetter.ai Website Audit + Paywall Summary

One-liner: Removed all free-pricing language from 6 HTML files, added localStorage-gated $19 Stripe paywall to interview.html download button, and expanded Mac setup help steps.

## Tasks Completed

### Task 1: Remove "free" wording (5 files)

| File | Change |
|------|--------|
| `interview.html:450` | `macOS 12+ · Free · 36 KB` → `macOS 12+ · $19 · 36 KB` |
| `login.html:96` | `Create free account` → `Create account` |
| `offer.html:498` | `Start Free` → `Get Started` |
| `signup.html:114` | Button text `Create free account` → `Create account` |
| `signup.html:212` | JS string `'Create free account'` → `'Create account'` |
| `index.html:1308` | CTA `Analyze My Offer Free` → `Analyze My Offer` |

Verification: `grep -in "start free|create free account|free · |analyze.*free"` returns 0 matches across all 5 files.

### Task 2: $19 paywall on interview.html

- Added `#purchaseNotice` banner div above the download card (hidden by default, shown to unpurchased visitors)
- Added paywall JS block before `</body>` that:
  - On `?purchased=true` URL param: sets `localStorage.ol_purchased = 'true'`, cleans URL via `history.replaceState`
  - Reads `ol_purchased` flag
  - If NOT purchased: mutates `#downloadBtn` href → Stripe payment link, removes `download` attr, changes label to "Purchase — $19", sets orange background; same for all `a[href*="Interview Assistant.dmg"]` links
  - Shows `#purchaseNotice` banner
- Stripe link: `https://buy.stripe.com/4gM00k8Gb20Td3B9kH6kg03`
- Success redirect must be configured in Stripe dashboard to: `https://www.offerletter.ai/interview.html?purchased=true`

### Task 3: Expand Mac setup steps + dashboard cleanup

**interview.html setup steps expanded:**
- Step 1: Added troubleshooting tip for "damaged or can't be opened" macOS warning
- Step 2: Added body div with Allow/System Settings instructions for missed microphone permission dialog
- Step 3: Added "invisible to Zoom and Teams" bullet + Manual questions / Audio mode usage instructions
- Step 4 (new): BlackHole optional hands-free audio setup — 5-step install + Multi-Output Device tip

**dashboard.html:**
- CSS class `.trial-badge` renamed to `.status-badge` (line 31)
- Element `id="trialBadge"` renamed to `id="statusBadge"` (line 62)
- `document.getElementById('trialBadge')` renamed to `document.getElementById('statusBadge')` (line 165)
- No visible text changed — badge still displays "Active"

## Deviations from Plan

None — plan executed exactly as written. The constraints specified using the exact JS block from the additional context, which was applied verbatim.

## Self-Check

- [x] interview.html: paywall JS present, purchaseNotice div present, $19 badge text present
- [x] login.html: "Create free account" → "Create account"
- [x] offer.html: "Start Free" → "Get Started"
- [x] signup.html: both HTML button and JS string updated
- [x] index.html: "Analyze My Offer Free" → "Analyze My Offer"
- [x] dashboard.html: zero trialBadge / trial-badge references remain

## Self-Check: PASSED

---

## DEPLOY CHECKLIST

### Manual step required in Stripe Dashboard (YOU must do this):

1. Go to https://dashboard.stripe.com/payment-links
2. Find the payment link `4gM00k8Gb20Td3B9kH6kg03` (or open: https://buy.stripe.com/4gM00k8Gb20Td3B9kH6kg03)
3. Click Edit
4. Under "After payment" → set Confirmation page to: **Redirect customers to your website**
5. Set the URL to: `https://www.offerletter.ai/interview.html?purchased=true`
6. Save

Without this step, Stripe will show its default confirmation page and the customer will NOT be automatically redirected back to unlock the download.

### Deploy the HTML files to production:
- Upload all 6 modified HTML files from `/Users/jeet/Downloads/offerletter-ai/` to your hosting (S3 / Cloudflare Pages / whatever hosts offerletter.ai)
- Invalidate CDN cache if applicable

### Test the flow end-to-end:
1. Open https://www.offerletter.ai/interview.html in an incognito window
2. Confirm download button shows "Purchase — $19" in orange
3. Confirm the purchase notice banner is visible
4. In browser console: `localStorage.setItem('ol_purchased','true')` then reload
5. Confirm download button reverts to normal Download state
6. Clear localStorage and navigate to `https://www.offerletter.ai/interview.html?purchased=true`
7. Confirm URL cleans to `/interview.html` and download is unlocked
