---
phase: quick-179
plan: 01
subsystem: offerletter-ai
tags: [polish, static-html, ux, content]
key-files:
  modified:
    - /Users/jeet/Downloads/offerletter-ai/dashboard.html
    - /Users/jeet/Downloads/offerletter-ai/index.html
    - /Users/jeet/Downloads/offerletter-ai/blog.html
    - /Users/jeet/Downloads/offerletter-ai/setup.html
    - /Users/jeet/Downloads/offerletter-ai/signup.html
    - /Users/jeet/Downloads/offerletter-ai/press.html
decisions:
  - Social links neutralized with href='#' + onclick=false instead of removed (preserves visual layout)
  - setup.html uses both meta refresh and inline JS replace for maximum redirect compatibility
  - Resume Upload card disabled via pointer-events:none + opacity:0.6 rather than removing the element
metrics:
  duration: ~10 minutes
  completed: 2026-03-16
  tasks: 3
  files: 6
---

# Quick Task 179: Fix All Polish Issues Making OfferLetter.ai Look Unfinished

One-liner: Fixed 9 polish issues across 6 HTML files — dead links, placeholder blog, inflated metrics, phantom social accounts, broken redirect, and missing press brand assets.

## Tasks Completed

| Task | Files | Commit |
|------|-------|--------|
| 1: Fix dashboard dead links and index.html copy/social | dashboard.html, index.html | a4ce73c |
| 2: Replace blog Coming Soon with 3 real articles | blog.html | 2cb16a1 |
| 3: Fix setup redirect, signup resendLink, press brand assets | setup.html, signup.html, press.html | 133db81 |

## Changes by File

### dashboard.html
- Offer Analyzer card: `href="#"` → `href="offer.html"`
- Resume Upload card: `href="#"` removed, `pointer-events:none; opacity:0.6; cursor:default` added

### index.html
- Testimonials heading: "10,000+ job seekers" → "2,000+ job seekers"
- All 6 testimonials: added green "Verified user" badge after role div
- Twitter, LinkedIn, YouTube footer links: replaced real (non-existent) URLs with `href="#" onclick="return false;"`, removed `target="_blank"`

### blog.html
- Entire coming-soon placeholder replaced with 3 full articles:
  1. "How to Negotiate Your Salary (And Actually Win)" — 5 min read
  2. "How to Read an Offer Letter: The 8 Things Most People Miss" — 4 min read
  3. "How AI Is Changing the Job Interview — and What That Means for You" — 6 min read

### setup.html
- Added `<meta http-equiv="refresh" content="0; url=interview.html" />` in `<head>`
- Added fallback div with "Go to Interview Coach" button after `<body>`
- Added `<script>window.location.replace('interview.html');</script>` for JS redirect

### signup.html
- `resendLink` anchor: removed `href="#"` to prevent page jump on click; JS handler by `getElementById` continues to work

### press.html
- Replaced single-line "email us" with full brand assets section:
  - Inline SVG logo preview card
  - "Request Full Asset Pack" mailto CTA
  - Usage guidelines list
  - Brand color swatches (#2563EB, #F97316, #1E293B)

## Verification

- [x] dashboard.html: Offer Analyzer card links to offer.html
- [x] dashboard.html: Resume Upload card has pointer-events:none (non-clickable)
- [x] index.html: "2,000+ job seekers" in testimonials heading
- [x] index.html: 6 "Verified user" badges (grep count=6)
- [x] index.html: Twitter/LinkedIn/YouTube social links are href="#" no-ops with onclick=false
- [x] blog.html: 0 "Coming Soon" matches, 3 real articles visible
- [x] signup.html: resendLink has no href="#"
- [x] setup.html: meta refresh + JS replace to interview.html
- [x] press.html: inline logo, color swatches, asset request CTA present

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 6 files verified via grep. All 3 commits exist in offerletter-ai repo (a4ce73c, 2cb16a1, 133db81).
