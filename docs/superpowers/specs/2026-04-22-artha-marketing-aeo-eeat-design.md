---
title: ArthaBuild Marketing Plan — AEO Backfill + 10-20 New Grounded Posts
date: 2026-04-22
status: design-approved-pending-spec-review
author: claude-opus-4-7
human_approval: Jeet (sections 1-5 approved explicitly; 6-7 locked per "rest all good to go")
supersedes: none
related_memory:
  - techcloudpro-aeo-backfill.md
  - feedback_arthaBuild_positioning.md
  - feedback_arthaBuild_operational_separation.md
---

# ArthaBuild Marketing Plan — AEO + E-E-A-T Design

## 1. Problem and constraint

**Problem.** `artha.build/blog` has 84 well-written posts on NetSuite / SuiteScript / AI-for-ERP but none carry the Answer-Engine Optimization (AEO) fields Google, Perplexity, and ChatGPT-search use for citation selection. No `answer`, no FAQPage JSON-LD, no outbound authoritative citations, no `reviewedBy` Person schema. Ranking ceiling is low.

**User constraint (verbatim):** *"write meaningfully — no hallucinated topics. It has to make total sense for a reader."*

**Positioning constraint (from memory `feedback_arthaBuild_positioning.md`):** expertise-led, 18+ yrs / 1000+ clients implicit through real bylines, no pricing, "Talk to us" CTA.

**Operational constraint (from memory `feedback_arthaBuild_operational_separation.md`):** artha must stand on its own brand. **No company name appears in any blog byline.** Credentials-only attribution.

## 2. Goals

1. Bring every existing post to AEO parity (answer + FAQs + citations + reviewedBy + updatedAt).
2. Add 10-20 new posts selected via real demand data, real Oracle doc anchors, real community pain — zero training-data speculation.
3. Wire E-E-A-T Person schema for 3 real team members with verifiable LinkedIn `sameAs` and `/about/<slug>` bio pages.
4. Deliver a provenance record (every FAQ, every citation) so any future manual reviewer can audit source.

## 3. Non-goals

- No pillar/cluster content restructure. The existing 84 posts keep their topics and structure; we add fields, not rewrite prose.
- No cross-posting to techcloudpro.com. Authority flows via shared reviewer bio + Person `sameAs`, not content duplication.
- No pricing content. Ever. Per positioning rule.
- No `/products` listing for artha on TCP site. Per positioning rule.
- No new pillar pages in this phase (deferred until backfill compounds for 3-6 months).
- No programmatic content generation at scale. Every post is hand-written or hand-augmented with provenance.

## 4. Approach overview

Five numbered phases, enforced sequentially with review gates between each.

- **P0 — Schema + team + bio pages.** Additive fields to `BlogPost` type; new `team.ts` with 3 real people; new `/about/:slug` routes; `BlogPost.tsx` renders + emits full JSON-LD.
- **P1 — DataForSEO sweep + 20-topic proposal.** User-approved topic list before any post is written.
- **P2 — AEO backfill, 9 batches of 10 posts.** Additive only; user spot-checks 3/10 between batches.
- **P3 — 20 new posts (2 batches of 10).** Only after P1 topic-list approval.
- **P4 — Deploy + verify.** Per quick-296/297 pattern. Submit updated sitemap.

## 5. Schema additions (P0 deliverable)

### `/Users/jeet/arthaBuild/src/frontend/src/data/blog.ts`

```ts
export interface BlogPost {
  // ── EXISTING FIELDS ──────────────────────────────────
  slug: string
  title: string
  description: string
  category: BlogCategory
  badge?: EditorialBadge
  publishedAt: string
  readTime: string
  tags: string[]
  content: string

  // ── NEW FIELDS (all optional for backwards compat) ──

  /** ISO date for schema dateModified + "Last reviewed" line. Set when AEO backfill touches a post. */
  updatedAt?: string

  /** Author byline (name). Matches a TeamMember slug to enable author-bio linkouts. */
  author?: string

  /** Role + credentials — NO company name (per positioning rule). */
  authorTitle?: string

  /** Fact-check reviewer. Person schema `reviewedBy`. NO company name. */
  reviewedBy?: string

  /** 40-60 word direct answer under H1. Target for AI Overview / Perplexity passage. HARD word-count lint. */
  answer?: string

  /** 3-6 self-contained Q&As. Rendered as accordion + emitted as FAQPage JSON-LD. */
  faqs?: { q: string; a: string }[]

  /** Outbound authoritative citations. URLs must return 200 at commit time. */
  citations?: { label: string; url: string }[]
}
```

### `/Users/jeet/arthaBuild/src/frontend/src/data/team.ts` (new file)

```ts
export interface TeamMember {
  slug: string
  name: string
  title: string            // no company — credentials-only byline
  bio: string              // full career bio for /about page (may mention companies)
  credentials?: string     // additional structured creds
  linkedin?: string        // for Person schema sameAs
  email?: string
}

export const team: TeamMember[] = [
  {
    slug: 'jithesh-manoharan',
    name: 'Jithesh Manoharan',
    title: 'NetSuite Certified Administrator · 18+ yrs ERP Solution Architect',
    credentials: 'NetSuite Certified Administrator (ID 9939) · 18+ years ERP Solution Architecture',
    bio: '… (verbatim from TCP team.ts — real career bio including Wells Fargo, Hampton Creek, Anastasia Beverly Hills, JUST Inc. — these are real cred signals, legit to keep on bio page)',
    linkedin: 'https://www.linkedin.com/in/jiteshmanoharan/',
    email: 'jm@techcloudpro.com',
  },
  {
    slug: 'rajesh-nair',
    name: 'Rajesh Nair',
    title: 'Managing Director',
    bio: '… (from TCP — but with name corrected from the erroneous "Rajesh Manoharan")',
    linkedin: 'https://www.linkedin.com/in/rajesh-nair-356b671a2/',
    email: 'rajesh@techcloudpro.com',
  },
  {
    slug: 'ethan-vereal',
    name: 'Ethan Vereal',
    title: 'CTO · Cloud Architecture & Private LLM Systems',
    bio: '… (from TCP — AI/ML + cloud architecture background)',
    linkedin: 'https://www.linkedin.com/in/ethan-vreal-9a265b394/',
  },
]
```

**Byline rule (locked by user):** no company name in `title`, `authorTitle`, or `reviewedBy`. Credentials or role only.

## 6. Author bio pages (P0 deliverable)

### Route registration (`routes.tsx`)
- `/about` → `AuthorIndex.tsx` (lists all 3 authors)
- `/about/:slug` → `AuthorPage.tsx`

### `AuthorPage.tsx` renders
- H1: name · title
- Credential block (for Jithesh: NetSuite Certified Administrator ID 9939 · 18+ yrs ERP Solution Architect)
- Full bio paragraph (same as `team.ts`)
- Real enterprise clients served (Wells Fargo etc.) — only for Jithesh, where bio lists them
- LinkedIn button → real LI URL, opens in new tab with `rel="noopener"`
- "Articles reviewed by Jithesh Manoharan" → auto-listed grid linking to posts where `reviewedBy` matches this person
- Person JSON-LD:
  ```json
  {
    "@type": "Person",
    "name": "Jithesh Manoharan",
    "jobTitle": "NetSuite Certified Administrator · 18+ yrs ERP Solution Architect",
    "url": "https://artha.build/about/jithesh-manoharan",
    "sameAs": [
      "https://www.linkedin.com/in/jiteshmanoharan/",
      "https://www.techcloudpro.com/leadership/jithesh-manoharan"
    ]
  }
  ```

### `BlogPost.tsx` updates
- Render `reviewedBy` block below H1 ("Reviewed by <link to /about/slug>") and at footer ("Last reviewed <updatedAt> by <author>")
- Emit Article JSON-LD with `author` + `reviewer` + `datePublished` + `dateModified` + `image` + FAQPage inlined
- Real `sameAs` URLs pulled from `team.ts` by slug match

### Headshots
- Pending: Jithesh + Rajesh Nair photos (user saved them; paths not yet located)
- Ethan: placeholder OK
- Until photos land: CSS-only initial-avatar (`JM` / `RN` / `EV` in a styled circle). One-file swap when paths arrive.

## 7. Grounding stack (zero-hallucination enforcement)

Three sources, every post uses all three:

### ① Oracle / NetSuite official docs
- Oracle Help Center, SuiteAnswers, Release Notes
- Every citation URL must resolve (`curl -I` hard gate before commit)
- No inventing URLs

### ② DataForSEO keyword research (real demand)
- Search volume ≥ 50/mo (target 200-2000)
- Keyword difficulty ≤ 45 (artha's domain age)
- SERP competitor top-10 analysis — skip topics where existing top-10 is better than we can produce
- Related keyword cluster drives H2 structure

### ③ Real community Q&A
- Stack Overflow `[suitescript]`, r/NetSuite, Oracle Cloud Customer Connect
- Every new-post FAQ question must have a resolving URL to the original asker's thread
- Provenance logged

④ (RAG corpus) and ⑤ (customer interviews) deferred past the initial 20.

## 8. AEO backfill process (P2)

### Per post, additive-only edit

For each of the 84 posts:

1. **Read existing content.** Extract actual claims.
2. **Compose `answer` from content only** (40-60 words). Verify no new claim introduced.
3. **Write 3-6 FAQs.** Each Q sourced from ③ community thread or ① Oracle doc. Each Q logged in provenance file.
4. **Select 3 citations.** Oracle doc + SuiteAnswers/Release Notes + industry authority if available. Skip 3rd if no real authority.
5. **Set `reviewedBy`** per topic fit. Default: Jithesh. Flag to user if Ethan or Rajesh Nair fits better.
6. **Set `updatedAt`** to today ISO.
7. **Run link-health gate** (curl each citation). Any non-200 blocks commit.
8. **Run word-count gate** on `answer`.

### Cadence: 9 batches × 10 posts

Between each batch:
- Write batch (10 posts, additive only)
- Run automated gates (link health, word count, JSON-LD validation)
- Ship to user for spot-check
- User reads 3 random posts from batch
- User approves OR flags drift
- If approved: next batch. If flagged: rework + update self-checks.

Existing content is never rewritten. If existing content has a factual error, flag to user separately — do not silent-fix during AEO backfill.

## 9. New-post topic selection (P1)

### 3 sweeps

**Sweep A — NetSuite + AI intersection** (artha's unique positioning).
Seed: "netsuite ai", "suitescript ai generator", "ai for netsuite developer", "generate suitescript with ai", etc.

**Sweep B — gaps vs existing 84 posts.**
Grep existing titles/slugs, find uncovered NetSuite+SuiteScript head-terms with search volume & difficulty in range.

**Sweep C — long-tail from community.**
Scrape top-voted Stack Overflow `[suitescript]` threads; map to commercial intent; pick ones where artha's RAG product has a genuine answer.

### 20-topic proposal document

Delivered to user at `/Users/jeet/arthaBuild/.planning/marketing/proposed-topics-batch-1.md` **before any post is written**.

Per candidate format:

```
### Topic #N: "<title>"

Target keyword: "<head query>"
DataForSEO: volume=X/mo, KD=Y, intent=informational|commercial
  Top 3 ranking today: [URL1] [URL2] [URL3]
  Related cluster: <5-10 semantic queries>
Oracle doc anchor: <URL> (200 ✅)
Community thread: <URL> (200 ✅ — n upvotes)
Reviewer: <Jithesh | Jithesh + Ethan>
Estimated word count: 1500-2500
Why artha is credible here: <one sentence grounded in product capability>

Draft outline:
  H2: <...>
  H2: <...>
  H2: <...>
  FAQs (N): sourced from <thread URL>
  Citations (3): <one-line each>
```

User reviews 20, kills bad candidates, requests replacements. Only after approval do I write posts.

## 10. Quality gates (all 6 enforced)

| Gate | Type | Check | Failure action |
|------|------|-------|----------------|
| **A** Link health | automated | `curl -I -L` every citation URL | 404/5xx blocks commit; replace or remove citation |
| **B** FAQ provenance | manual audit | Every FAQ Q logged in provenance file with source URL | No source → FAQ doesn't ship |
| **C** Answer word count | automated lint | `answer` field 40-60 words | Reject commit if out of range |
| **D** Claims audit | manual | New numeric claims / API mentions / feature attributions either cited, self-evident from existing content, or softened | Soften or remove |
| **E** JSON-LD validation | automated | Article + FAQPage + Person schemas valid | Fix before commit |
| **F** Human spot-check | manual | User reads 3 random posts per batch of 10 | Batch returned if drift detected |

### Provenance file layout

`/Users/jeet/arthaBuild/.planning/marketing/faq-provenance.md`

```
## Post: <slug>
### FAQ #N — "<Question>"
Source: <URL>
Date pulled: <ISO>
Real asker: <handle or "Oracle doc §N">
Grounded in: <Oracle doc section | post's own content>
```

Never rendered to users. Kept for internal + any future manual-review audit.

### Failure contract

If mid-batch I discover my topic selection was stale or a citation is broken, I **stop and surface** rather than write around it. Zero-hallucination requires zero silent drift.

## 11. Workflow + timeline (P0 → P4)

| Phase | Est. active time | User review gate |
|-------|-----------------|------------------|
| P0 schema + team + bios | ~2.5 hr | Build passes, JSON-LD validates |
| P1 DataForSEO sweep + 20-topic proposal | ~1 hr | **User approves topic list** |
| P2 AEO backfill (9 × 10) | ~1 hr × 9 batches | Spot-check 3/10 per batch |
| P3 20 new posts (2 × 10) | ~2 hr × 2 batches | Spot-check 3/10 per batch |
| P4 Deploy + verify | ~30 min | Live URLs 200, sitemap accepted |

**Total active time:** 15-20 hours focused work, over 5-8 calendar days depending on review speed.

Deploy cadence: P0 first; then P2 batches grouped every 3 batches; P3 all at once after batch 2 approval; P4 runs live verification per the quick-296/297 playbook (scp dist → rebuild/swap → `docker compose restart nginx` → verify at origin + public).

## 12. Success metrics

### Leading (30 days post-deploy)

- GSC indexation coverage ≥ 80% of 104 posts
- GSC Enhancements: ≥ 50 posts showing "FAQ eligible"
- Manual AI Overview / Perplexity check: ≥ 3 target queries show artha citation
- GSC Performance: ≥ 20 new-post keywords movement from >50 → <30
- Non-zero impressions + clicks on indexed posts

### Lagging (90 days)

- Organic sessions to /blog/* up 3-5× baseline
- Measurable blog→"Talk to us" funnel activity
- ≥ 20 new referring domains to artha.build/blog/*
- Position ≤ 10 for ≥ 10 target keywords

### Pause triggers

- <50% indexation at day 90 → dig into trust signals / schema / thin-content flags
- Zero AI Overview citations across 20 target queries → restructure answer format
- Negative organic trend → possible freshness-penalty from too-many simultaneous updates; slow batch cadence
- Google manual review flag on E-E-A-T schema → pause, audit, fix

### What we explicitly do not claim

Organic lift cannot be fully attributed to this plan. Background drift, concurrent page changes, and Google core updates confound attribution. Metrics are directional, not causal.

## 13. Open items tracked (not blocking)

- **Headshot file paths** for Jithesh Manoharan + Rajesh Nair (user saved locally, not yet located). Until then: CSS initial-avatar placeholder. One-file swap on delivery.
- **TCP memory corrections** (captured in design doc Appendix B for separate cleanup): `techcloudpro-aeo-backfill.md` uses wrong reviewer name; TCP `team.ts` has Rajesh's full name wrong (Manoharan → Nair); experience-year mismatch (18 vs 20).
- **Ethan Vereal LinkedIn vanity slug** typo: the URL slug is `ethan-vreal-9a265b394` (missing `e` between `v` and `r`) — verify this is actually his real slug before shipping schema `sameAs` (if typo, Person schema breaks).

## 14. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| DataForSEO returns stale keyword volumes | Gate requires data fetched within 7 days of topic approval |
| Broken citation URL survives commit | Gate A (automated `curl -I`) blocks commit; no manual override |
| User rubber-stamps topic list without real review | 20-item list is long enough that visual inspection alone won't catch bad topics; I include a 1-line "why this makes sense" per topic to force my own rigor; I also include 2-3 clearly weaker candidates deliberately so the user sees the range and pushes back |
| AEO backfill triggers "too many updated at once" Google freshness-penalty | Batch cadence of 10 + deploy every 3 batches avoids the signal; if detected, pause and spread |
| Person schema `sameAs` URL is wrong | Gate A applies to LinkedIn URLs too; if non-200, flag to user and don't emit that `sameAs` entry |
| Hallucinated statistic slips through | Claim audit (Gate D) + provenance file (Gate B); no numeric claim ships without citable anchor |
| I burn hours on a dead-end topic mid-batch | Failure contract: stop and surface rather than silent-drift |

## 15. Rollback

- P0 schema changes are additive and optional → safe, no rollback needed
- P2 backfill writes to existing file; git reverts per-batch if drift detected
- P3 new posts are additive; removing a post is a one-line delete + rebuild
- P4 deploy follows quick-295/296/297 pattern — `dist.bak.<ts>` preserved on every ship, one-line restore

## 16. Acceptance criteria

Ready to declare done when:

1. `team.ts` has 3 real TeamMember entries with resolving LinkedIn URLs
2. `/about/jithesh-manoharan`, `/about/rajesh-nair`, `/about/ethan-vereal` return 200 live and emit valid Person JSON-LD
3. All 84 existing posts carry `answer`, `faqs`, `citations`, `reviewedBy`, `updatedAt`
4. 10-20 new posts shipped, each passing all 6 gates
5. Google Rich Results Test returns valid Article + FAQPage for a sampled 10% of posts
6. Sitemap regenerated and submitted to GSC
7. Provenance file has an entry per FAQ for new posts + delta-entries for backfill additions
8. No byline contains a company name
9. User spot-check passes on the final batch

## 17. Appendices

### A — Real team data (verified source: `/Users/jeet/techcloudpro/src/data/team.ts`)

*[Jithesh / Rajesh Nair / Ethan bios, LinkedIn URLs, emails — per design doc Appendix A. Included in full in the PDF at `~/Downloads/artha-marketing-design.pdf`.]*

### B — Memory corrections flagged (for separate cleanup task)

1. `techcloudpro-aeo-backfill.md` says `reviewedBy Rajesh Manoharan` — should be Jithesh
2. TCP `src/data/team.ts` has "Rajesh Manoharan" — should be "Rajesh Nair" per LI slug
3. Experience: 18+ yrs (memory) vs 20+ yrs (TCP bio) — use 18+ consistently

### C — Session-approved decisions log

- Scope: Option B (backfill 84 + 10-20 new)
- Grounding: ① + ② + ③
- Reviewer: Jithesh Manoharan (credential-only byline, no company)
- Team: Jithesh + Rajesh Nair + Ethan (3 real people)
- Post location: artha.build/blog only
- Cadence: batches of 10 with spot-check gate
- Reviewer default: Jithesh, with Ethan/Rajesh co-review by topic fit
- Byline rule: NO company names anywhere (locked by user)
- Provenance file location: artha repo
- Gate F: 3 random posts per batch of 10
