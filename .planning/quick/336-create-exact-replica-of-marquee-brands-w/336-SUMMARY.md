---
phase: quick-336
plan: "01"
subsystem: marquee-larc-demo / frontend
tags: [html, demo, marquee-brands, frontend, carousel, responsive]
dependency_graph:
  requires: []
  provides: ["/marquee-website route", "marquee-website.html"]
  affects: [marquee-larc-demo backend, LARC demo sales asset]
tech_stack:
  added: []
  patterns: ["Single-file HTML with inline CSS/JS", "Google Fonts CDN (Playfair Display + Inter)", "CSS Grid layout", "CSS cross-fade carousel via opacity transitions"]
key_files:
  created:
    - /Users/jeet/dev/marquee-larc-demo/frontend/marquee-website.html
  modified:
    - /Users/jeet/dev/marquee-larc-demo/backend/app.py
decisions:
  - "Used opacity-based cross-fade carousel (no JS framework) matching the Squarespace site's smooth transitions"
  - "Inline SVG icons for LinkedIn and Instagram avoid external icon library dependency"
  - "All 5 hero images referenced from Squarespace CDN — no self-hosted copies needed"
metrics:
  duration: "~15 min"
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Quick-336: Marquee Brands Homepage Replica Summary

**One-liner:** Pixel-faithful single-file HTML replica of marqueebrands.com with 5-brand carousel, 10 sections, and FastAPI route, served at /marquee-website.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Build marquee-website.html (10-section replica) | `bcc0a66` | `frontend/marquee-website.html` (created, 992 lines / 28KB) |
| 2 | Add /marquee-website route to app.py | `7bd47df` | `backend/app.py` (route + TRACKED_PATHS) |

## What Was Built

### marquee-website.html (28,917 bytes)

All 10 required sections implemented:

1. **Sticky nav** — `position: sticky; top: 0; z-index: 1000`. Royal blue logo left, 8 Inter uppercase links right (11px, 0.1em tracking). Hamburger (`#nav-toggle`) hidden on desktop, shown at `<768px` with CSS-only open/close via `.open` class.

2. **Hero carousel** — `height: 100vh`, 5 `.slide` divs positioned absolutely, `opacity: 0 → 1` cross-fade via `transition: opacity 0.8s ease`. `setInterval(4000)` auto-rotates. 5 dot indicators are clickable to jump to any slide. Brand name overlays (Playfair Display 72px white) at `bottom: 80px; left: 60px`. All 5 CDN image URLs from Squarespace present.

3. **Tagline** — "The Premier Accelerator of Timeless Brands" — `clamp(28px, 4vw, 48px)` Playfair Display.

4. **About** — 2-column grid (text + image). Stacks to 1-col at 768px. About CDN image from Squarespace.

5. **Platform categories** — `2x2 grid, gap: 2px`. Each card: `aspect-ratio: 4/3`, hover zoom `scale(1.05)`, gradient overlay, category tag + title + "Explore →". All 4 CDN images.

6. **Press quotes** — 2-up cards on `#f5f5f5` background. CNN Business + WWD quotes.

7. **Stats bar** — `#0a1628` navy background, 4-column grid. Stats: 5,000+ / 400+ / $3B+ / 130+. Collapses to 2-col on mobile.

8. **Latest news** — 3-column grid, 3 news cards with dates and "Read More →". All 3 CDN article images.

9. **Newsletter** — `#0a1628` background, inline flex form (email + Subscribe button). `onsubmit` alert.

10. **Footer** — `2fr 1fr 1fr 1fr` grid: logo+tagline+social / New York / Los Angeles / London. Inline SVG LinkedIn + Instagram. Copyright + email in bottom bar.

### app.py changes

- Added `"/marquee-website"` to `TRACKED_PATHS` (line 62)
- Added `GET /marquee-website` + `GET /marquee-website.html` routes (lines 127–130) using `FileResponse(FRONTEND_DIR / "marquee-website.html")` — identical pattern to existing `/cfo-asc606`

## Verification

All checks passed:

```
PASS: sticky nav
PASS: hero carousel
PASS: 5 hero images
PASS: platform categories
PASS: stats bar
PASS: newsletter
PASS: footer locations
PASS: about image
PASS: logo
PASS: min size
File size: 28917 bytes

app.py PASS
marquee-website.html PASS
```

## Deviations from Plan

None. Plan executed exactly as written.

## Self-Check: PASSED

- [x] `/Users/jeet/dev/marquee-larc-demo/frontend/marquee-website.html` — EXISTS (28,917 bytes)
- [x] `/Users/jeet/dev/marquee-larc-demo/backend/app.py` — route verified via grep (4 matches)
- [x] Commit `bcc0a66` — EXISTS
- [x] Commit `7bd47df` — EXISTS
