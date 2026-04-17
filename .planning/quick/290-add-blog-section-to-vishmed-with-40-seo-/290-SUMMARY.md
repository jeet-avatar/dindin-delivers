---
phase: quick-290
plan: 01
subsystem: vishmed-blog
tags: [vishmed, seo, blog, next-js, glp1, weight-loss, primary-care, orlando]
dependency_graph:
  requires: []
  provides: [vishmed-blog-system]
  affects: [vishmed-homepage, vishmed-header]
tech_stack:
  added: []
  patterns: [next-js-static-params, server-component-url-filtering, json-ld-schema, manual-prose-styles]
key_files:
  created:
    - apps/vishmed/src/data/blogPosts.ts
    - apps/vishmed/src/app/blog/page.tsx
    - apps/vishmed/src/app/blog/[slug]/page.tsx
  modified:
    - apps/vishmed/src/components/layout/Header.tsx
    - apps/vishmed/src/app/page.tsx
decisions:
  - Manual prose styles used instead of @tailwindcss/typography (plugin not installed in vishmed project)
  - Blog index uses server-side URL param filtering (no client JS needed, fully crawlable)
  - BlogPosting JSON-LD schema injected via existing SchemaMarkup component
metrics:
  duration: ~25min
  completed: 2026-04-15
  tasks_completed: 3
  files_changed: 5
---

# Quick Task 290: Add Blog Section to VishMed — SUMMARY

**One-liner:** 40-post SEO blog system for Vish Medical with filterable index, individual post pages with BlogPosting schema, homepage preview section, and Blog nav link — targeting Orlando/Central Florida long-tail medical keywords across 6 categories.

## What Was Built

### Task 1 — blogPosts.ts (1060 lines)
- `BlogPost` interface and `BlogCategory` union type defined
- `CATEGORY_LABELS` map for display names
- 40 posts sorted newest-first (so `blogPosts.slice(0,3)` always returns 3 most recent)
- 6 categories: weight-loss (12), primary-care (8), telehealth (5), chronic-conditions (5), womens-mens-health (4), local-orlando (6)
- Date range: 2025-02-03 through 2026-03-25 — all unique, matching plan assignment exactly
- Each post: full HTML content (400–600 words), 120–160 char excerpt, readTime, accurate medical content (GLP-1 facts, Dr. Pillay details, Lake Nona address)

### Task 2 — /blog and /blog/[slug] pages
- Blog index: category filter tabs as server-side URL params (crawlable, no JS required), 3-col grid, category colored badges
- Individual post: BlogPosting JSON-LD schema via existing SchemaMarkup component, author row, manual prose article styles, related posts sidebar, Book Appointment CTA card, Browse by Topic links
- `generateStaticParams` pre-renders all 40 slugs at build time
- `generateMetadata` with OpenGraph article type per post
- `notFound()` for invalid slugs

### Task 3 — Header + Homepage
- Header.tsx: `{ href: '/blog', label: 'Blog' }` added to `navLinks` — covers both desktop and mobile nav from single array
- page.tsx: "Latest from the Blog" section between GoogleReviews and Final CTA, showing 3 most recent posts as linked cards

## Verification

```
npm run build: ✓ 52 static pages generated (12 existing + /blog + 40 /blog/[slug])
TypeScript: ✓ 0 errors (npx tsc --noEmit)
slug count: 40 (grep -c "slug:" blogPosts.ts → 41, includes interface)
Blog nav: ✓ grep "/blog" Header.tsx → { href: '/blog', label: 'Blog' }
Homepage section: ✓ grep "Latest from the Blog" page.tsx → confirmed
Date range: ✓ 2025-02-03 and 2026-03-25 both present
BlogPosting schema: ✓ '@type': 'BlogPosting' in [slug]/page.tsx
```

## Deviations from Plan

**1. [Rule 2 - Missing functionality] Manual prose styles**
- **Found during:** Task 2
- **Issue:** `@tailwindcss/typography` plugin not installed; Tailwind config has `plugins: []`. Using `prose prose-slate` classes would produce unstyled content.
- **Fix:** Injected `<style>` block with equivalent CSS rules for `h2`, `p`, `ul/li`, `strong`, `a` selectors scoped to `.blog-prose` class.
- **Impact:** No new dependencies added; existing Tailwind config untouched.

No other deviations — plan executed as specified.

## Self-Check: PASSED

- apps/vishmed/src/data/blogPosts.ts — FOUND
- apps/vishmed/src/app/blog/page.tsx — FOUND
- apps/vishmed/src/app/blog/[slug]/page.tsx — FOUND
- Commit c91ecc30 (blogPosts.ts) — FOUND
- Commit 5a9b6234 (blog pages) — FOUND
- Commit 6c2f6b6e (header + homepage) — FOUND
