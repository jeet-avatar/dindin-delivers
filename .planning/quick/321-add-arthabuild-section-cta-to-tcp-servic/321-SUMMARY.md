---
phase: quick-321
plan: 01
subsystem: techcloudpro/web
tags:
  - marketing
  - cross-promotion
  - tcp
  - arthabuild
  - hero-cta
requires: []
provides:
  - tcp-services-ai-arthabuild-cta
affects:
  - /Users/jeet/techcloudpro/src/pages/AIConsulting.tsx
tech-stack:
  added: []
  patterns:
    - "Mirror existing playground gradient-pill CTA shape; only icon, copy, badge color, href change"
key-files:
  created: []
  modified:
    - /Users/jeet/techcloudpro/src/pages/AIConsulting.tsx
decisions:
  - "Used 🤖 + emerald 'Live · Ours' badge (vs playground's 🏗️ + yellow 'Free · Live') to keep the two pills visually distinct when sitting side-by-side in the hero CTA row"
  - "Lead-line copy hard-codes the 'since 2015 / 1,000+ clients' framing per MEMORY.md TCP-positioning rule — no 'trial', no pricing"
metrics:
  duration_sec: 186
  completed: "2026-05-06T03:13Z"
  tasks: 1
  files_modified: 1
  commits: 1
requirements:
  - QUICK-321-01
---

# Quick Task 321: ArthaBuild CTA on TCP /services/ai Hero — Summary

Added a purple-indigo gradient ArthaBuild CTA pill to the TechCloudPro AI Consulting hero (mirrors the existing AI Playground CTA pattern), built, deployed to Hostinger, and verified live.

## What Shipped

A new `<a href="/arthabuild">` element inserted between the AI Playground CTA and the "See Capabilities" ghost button inside the hero `<div className="flex flex-wrap gap-3 items-center">` on `/services/ai`. Same gradient + pulse-badge shape as the playground CTA, with these specific differences:

- **href**: `/arthabuild` (TCP's existing in-app landing route, confirmed `src/App.tsx:58`)
- **icon**: 🤖 (vs playground's 🏗️) — visually distinct when stacked
- **copy**: "See ArthaBuild — the AI built on 1,000+ client projects since 2015" — leads with the mandatory "since 2015 / 1,000+ clients" positioning, soft "See" verb (no "trial", no pricing) per MEMORY.md `feedback_arthaBuild_positioning.md`
- **badge**: emerald `Live · Ours` (vs yellow `Free · Live`) — emerald keeps the two pills distinct, "Ours" reinforces ArthaBuild = TCP's own AI, not a third-party reseller play

## Verification Proof (per CLAUDE.md mandatory protocol)

### 1. Source proof — grep for new href in AIConsulting.tsx

```
$ grep -n "/arthabuild" /Users/jeet/techcloudpro/src/pages/AIConsulting.tsx
89:                href="/arthabuild"
```

### 2. Build proof — vite build exits 0, dist contains the string

```
$ cd /Users/jeet/techcloudpro && npm run build
… Pre-rendered 100/100 pages

$ grep -rc "arthabuild" /Users/jeet/techcloudpro/dist/assets/ | grep -v ":0"
/Users/jeet/techcloudpro/dist/assets/AIConsulting-tbnOYWAF-bmothc2wo.js:1
/Users/jeet/techcloudpro/dist/assets/index-C8HFgWsx-bmothc2wo.js:1
/Users/jeet/techcloudpro/dist/assets/ArthaBuildLanding-2AJJLSB5-bmothc2wo.js:1
```

The new bundle is **`assets/index-C8HFgWsx-bmothc2wo.js`** (build tag `bmothc2wo`).

### 3. Deploy proof — rsync output

```
sent 595593 bytes  received 79246 bytes  308978 bytes/sec
total size is 13151523  speedup is 19.49
```

`services/ai/index.html` and the new `assets/index-C8HFgWsx-bmothc2wo.js` bundle were uploaded to `u350621741@147.93.101.51:domains/techcloudpro.com/public_html/`.

### 4. Live proof — production curl with cache-bust headers

```
$ CB=$(date +%s)
$ curl -s -A "Mozilla/5.0" -H "Cache-Control: no-cache" \
    "https://techcloudpro.com/services/ai/?cb=$CB" | grep -ic "arthabuild"
2

$ curl -s "https://techcloudpro.com/?cb=$CB" | grep -oE "/assets/index-[^\"]+\.js" | head -1
/assets/index-C8HFgWsx-bmothc2wo.js

$ curl -s "https://techcloudpro.com/assets/index-C8HFgWsx-bmothc2wo.js?cb=$CB" | grep -oc "/arthabuild"
3
```

- **Page-level grep**: 2 hits for "arthabuild" on the live `/services/ai` HTML
- **Live JS bundle grep**: 3 hits for `/arthabuild` in the served bundle
- **Bundle filename live**: `index-C8HFgWsx-bmothc2wo.js` matches what we just built — fresh deploy is propagated

### 5. Scope-discipline proof — no out-of-scope files staged or committed

```
$ cd /Users/jeet/techcloudpro && git status --short
 M public/sitemap.xml
 M src/data/blogPosts.ts
 M src/data/navigation.ts
 M src/data/team.ts
?? seo/
```

After commit, all 5 unrelated dirty paths still show as unstaged/untracked. Confirms `blogPosts.ts`, `team.ts`, `seo/`, and the prior-session `navigation.ts`+`sitemap.xml` were NOT touched, NOT staged, NOT committed by this task.

### 6. Commit proof

```
$ cd /Users/jeet/techcloudpro && git log --oneline -3
31fd602 feat(ai-page): add ArthaBuild CTA pill to /services/ai hero (mirrors playground CTA pattern)
0ede64b fix(deploy): add build-tag suffix to chunk filenames
466bd64 feat(arthabuild): new /arthabuild landing page with hero, pain, 5-stage product flow, privacy + CTA blocks

$ git push origin main
   16b07e5..31fd602  main -> main
```

## Commits

| Repo                       | SHA       | Subject                                                                                       |
| -------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `/Users/jeet/techcloudpro` | `31fd602` | feat(ai-page): add ArthaBuild CTA pill to /services/ai hero (mirrors playground CTA pattern)  |

## Output Required by Plan

- **Commit SHA on `/Users/jeet/techcloudpro` for `AIConsulting.tsx`**: `31fd602`
- **Live verify curl exit value (count of "arthabuild" hits)**: `2` (page HTML) and `3` (live JS bundle)
- **Bundle filename deployed**: `assets/index-C8HFgWsx-bmothc2wo.js`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- File modified: `/Users/jeet/techcloudpro/src/pages/AIConsulting.tsx` — FOUND (verified via `grep -n "/arthabuild"` returning line 89)
- Commit `31fd602` — FOUND in `git log --oneline -3` on `/Users/jeet/techcloudpro` and pushed to `origin/main`
- Live verification — PASSED (2 page-level hits + 3 bundle hits for "arthabuild" on production)
