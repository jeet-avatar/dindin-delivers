---
title: ArthaBuild Marketing Plan — AEO Backfill + 20 New Grounded Posts
date: 2026-04-22
status: spec-review-round-3-pending
revision: 3
author: claude-opus-4-7
human_approval: Jeet (sections 1-5 approved explicitly; 6-7 locked per "rest all good to go")
supersedes: none
related_memory:
  - techcloudpro-aeo-backfill.md
  - feedback_arthaBuild_positioning.md
  - feedback_arthaBuild_operational_separation.md
---

# ArthaBuild Marketing Plan — AEO Backfill + 20 New Grounded Posts

## 1. Problem and constraint

**Problem.** `artha.build/blog` has 84 well-written posts on NetSuite / SuiteScript / AI-for-ERP but none carry the Answer-Engine Optimization (AEO) fields Google, Perplexity, and ChatGPT-search use for citation selection. No `answer`, no FAQPage JSON-LD, no outbound authoritative citations, no `reviewedBy` Person schema. Ranking ceiling is low.

**User constraint (verbatim):** *"write meaningfully — no hallucinated topics. It has to make total sense for a reader."*

**Positioning constraint (from memory `feedback_arthaBuild_positioning.md`):** expertise-led, 18+ yrs / 1000+ clients implicit through real bylines, no pricing, "Talk to us" CTA.

**Operational constraint (from memory `feedback_arthaBuild_operational_separation.md`):** artha must stand on its own brand. **No company name appears in any blog byline.** Credentials-only attribution.

## 2. Goals

1. Bring every existing post to AEO parity (answer + FAQs + citations + reviewedBy + updatedAt).
2. Add **exactly 20 new posts** selected via real demand data, real Oracle doc anchors, real community pain — zero training-data speculation. (No "10-20" ambiguity: the 20-topic proposal in §9 is the committed target; if a topic is killed during user review, a replacement is proposed.)
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

### File layout note

The arthaBuild repo uses **two separate files**:
- `/Users/jeet/arthaBuild/src/frontend/src/data/blog.ts` — type definitions (`BlogPost` interface, `BlogCategory`, `categories` array, etc.)
- `/Users/jeet/arthaBuild/src/frontend/src/data/blogPosts.ts` — the 84-post data array, imports `BlogPost` from `./blog`. **This is the file all P2 additive edits land in.**

P0 schema additions go into `blog.ts`. P2 backfill reads/writes `blogPosts.ts`. Gate B's pre-commit hook watches `blogPosts.ts` for the provenance-delta pairing.

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

### Cadence: 8 full batches of 10 + 1 final batch of 4 = 9 batches, 84 posts total

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

## 10. Quality gates (all 7 enforced, with enforcement mechanisms)

| Gate | Type | Check | Failure action |
|------|------|-------|----------------|
| **A** Link health | automated pre-commit | `curl -I -L` every citation URL **+ every `team[].linkedin`** | 404/5xx blocks commit; replace or remove citation |
| **B** FAQ provenance | automated pre-commit | Every FAQ Q logged in provenance file. Pre-commit hook **fails if `blogPosts.ts` post modified without matching `faq-provenance.md` delta in the same commit**. | No provenance → commit blocked |
| **C** Answer word count | automated lint | `answer` field 40-60 words | Reject commit if out of range |
| **D** Claims audit (BACKFILL ONLY) | manual | For **backfill posts**: audit only what I add (answer + FAQs). Gate D does not run for new posts — it is fully subsumed by Gate G. | Soften or remove |
| **E** JSON-LD validation | automated | Article + FAQPage + Person schemas valid | Fix before commit |
| **F** Human spot-check | manual | User reads **3/10 for P2 backfill batches; 5/10 for P3 new-post batches** (P3 higher fabrication risk) | Batch returned if drift detected |
| **G** Claim-to-source map (NEW POSTS ONLY) | automated artifact | For each new post (P3), a sibling `claims-map-<slug>.md` lists every non-trivial factual assertion (numbers, API names, behavioral claims, version claims) with the exact Oracle doc URL + section anchor. Pre-commit fails if any cell is empty. | No source → claim removed or softened |

### Quarterly link-health re-check (scheduled, not just commit-time)

Gate A is a commit-time check, but Oracle doc URLs can move (SuiteAnswers IDs change between releases, Release Notes get redirected). Add `/Users/jeet/arthaBuild/scripts/recheck-blog-citations.mjs` that:
- curls every `citations[].url` and `team[].linkedin` across all posts
- writes `/Users/jeet/arthaBuild/.planning/marketing/link-rot-<date>.md` listing dead URLs
- Never auto-fixes — surfaces to user who picks replacements

**Scheduling mechanism (pick one):** **macOS calendar reminder** set during P4 deploy for +90 days, +180 days, +270 days, +360 days post-ship. Simpler than cron (no server to run on), survives laptop rebuilds, user-visible. First baseline run happens on day of P4 deploy. Script README header documents the schedule.

### Drift log (per-batch attestation)

Per batch (both P2 and P3), I write `/Users/jeet/arthaBuild/.planning/marketing/DRIFT_LOG.md` even when empty:

```
## Batch P2-3 (posts 21-30) — 2026-04-24

Topics rejected mid-batch: [none]
Citations replaced due to 404: [slug, original URL, replacement URL]
Claims softened to conditional language: [slug, original claim, revised wording]
Open concerns flagged to Jeet: [none]
```

Forces explicit negative attestation — I can't silently skip it; Gate F spot-check includes verifying the DRIFT_LOG entry matches what I actually did.

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
| P2 AEO backfill (8 × 10 + 1 × 4 = 84 total) | **~2 hr × 9 batches** (realistic per-post: 12 min incl. all gates) | Spot-check **3/10** per batch (final batch: 3/4) |
| P3 20 new posts (2 × 10) | ~3 hr × 2 batches (higher due to drafting from scratch) | Spot-check **5/10** per batch (higher fabrication risk) |
| P4 Deploy + verify | ~30 min | Live URLs 200, sitemap accepted |

**Total active time:** **~25-30 hours** focused work, over 7-10 calendar days depending on review speed. (Revised up from initial 15-20 estimate — prior estimate didn't account for Gate G claim-maps on new posts + DRIFT_LOG writing + realistic per-post backfill time.)

### Freshness-penalty guardrail (measurable pause trigger)

Freshness-signal thresholds are not publicly documented, but the signal exists. Measurable trigger: **if GSC indexation drops >10% within 7 days of any P2 deploy, pause remaining deployments and spread across 2+ weeks.** This converts the §14 risk from hand-wave to decision rule.

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

## 13. Open items (with deadlines and blocking rules)

- **Headshot file paths** for Jithesh Manoharan + Rajesh Nair. Placeholder (CSS initials) ships at P0; **real headshots must replace placeholders within 14 days of P0 ship, or Jeet explicitly declines in writing**. Tracked as soft acceptance criterion in §16.
- **TCP memory corrections** (separate cleanup task, not blocking this work): `techcloudpro-aeo-backfill.md` wrong reviewer name; TCP `team.ts` "Rajesh Manoharan" should be "Rajesh Nair"; experience years mismatch (18 vs 20 — use 18 consistently).
- **Ethan Vereal LinkedIn slug verification (BLOCKING P0)**: URL slug is `ethan-vreal-9a265b394` (possible typo — missing `e` between `v` and `r`). **P0 cannot complete until all 3 LinkedIn URLs return 200 via Gate A.** If Ethan's URL doesn't resolve, surface to Jeet with the real URL or Ethan is removed from P0 team scope until resolved.
- **TCP URL in Person `sameAs` — needs explicit user confirmation.** `team.ts` currently has `sameAs: [linkedin_url, techcloudpro.com/leadership/<slug>]`. Schema-only (user-invisible), but the "no company names" rule in §5 applies to user-facing bylines. Jeet: confirm TCP domain in `sameAs` is OK as E-E-A-T cross-domain authority signal. If not, strip TCP URL from `sameAs` and accept weaker authority graph.
- **Quarterly link-health re-check** — `scripts/recheck-blog-citations.mjs` per Gate A extension (§10). Ship with P0 or P1; schedule is quarterly.

## 14. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| DataForSEO returns stale keyword volumes | Gate requires data fetched within 7 days of **proposal delivery to user** (not approval — approval lag can exceed window) |
| Broken citation URL survives commit | Gate A (automated `curl -I`) blocks commit; no manual override |
| User rubber-stamps topic list without real review | Each proposed topic includes "why artha is credible here" + DataForSEO evidence + Oracle doc anchor + community thread URL. User is expected to reject weak candidates; replacements are proposed until 20 strong candidates are approved. No deliberately-weaker decoys — that would conflict with the "exactly 20" target. If reviewer accepts all 20 without edit, I flag it: that outcome should be rare and deserves a second pass. |
| AEO backfill triggers Google freshness-penalty | Measurable trigger: if GSC indexation drops >10% within 7 days of any P2 deploy, pause remaining deployments and spread across 2+ weeks (see §11) |
| Person schema `sameAs` URL is wrong or breaks later | Gate A applies to LinkedIn URLs too (pre-commit); **quarterly re-check** catches post-ship drift; Ethan's slug flagged for P0-blocking verification (§13) |
| Hallucinated statistic slips through | For new posts: Gate G (claim-to-source map) forces every non-trivial assertion to have a cited anchor. For backfill: Gate D audits only additions, existing content untouched. |
| I burn hours on a dead-end topic mid-batch | Failure contract: stop and surface. **Enforcement:** DRIFT_LOG.md must be written per batch, even when empty — forces negative attestation. |
| Cross-domain near-duplicate with TCP blog | Before topic-list approval, grep TCP published + in-backfill-pipeline topic list. Reject any artha candidate with >60% topic overlap with TCP. |
| LinkedIn vanity URL changes / account takedown | Quarterly `sameAs` recheck catches; if broken, schema emit drops that URL while user resolves. |
| Citation link-rot 3-6 months post-ship | Quarterly link-health cron surfaces dead URLs. Not auto-fixed — user picks replacements. |

## 15. Rollback

- P0 schema changes are additive and optional → safe, no rollback needed
- P2 backfill writes to existing file; git reverts per-batch if drift detected
- P3 new posts are additive. **Removal rule**: a post that has been live and indexed for >48 hrs must not be hard-deleted (creates a 404 in Google's index until recrawl). Use `301 redirect to closest related post` instead. Spec acceptance criteria already require this rule be followed if any post needs removal.
- P4 deploy follows quick-295/296/297 pattern — `dist.bak.<ts>` preserved on every ship, one-line restore

## 16. Acceptance criteria

Ready to declare done when:

1. `team.ts` has 3 real TeamMember entries with all 3 LinkedIn URLs returning **HTTP 200 via Gate A** (P0-blocking per §13)
2. `/about/jithesh-manoharan`, `/about/rajesh-nair`, `/about/ethan-vereal` return 200 live and emit valid Person JSON-LD
3. All 84 existing posts carry `answer`, `faqs`, `citations`, `reviewedBy`, `updatedAt`
4. **Exactly 20 new posts shipped**, each passing gates A, B, C, E, F, G (Gate D is backfill-only, subsumed by Gate G for new posts)
5. Google Rich Results Test returns valid Article + FAQPage for **10 posts sampled by Jeet** (user picks the URLs — either randomly or via a rule like every 10th post in slug-alphabetical order). Screenshots attached to final phase-complete artifact.
6. Sitemap regenerated and submitted to GSC
7. Provenance file has one entry per FAQ — same format for both backfill additions and new posts (no "delta" tier)
8. No byline contains a company name
9. User spot-check passes on the final batch (3/10 for P2, 5/10 for P3)
10. `DRIFT_LOG.md` has an entry per shipped batch (empty entries OK; absence is not OK)
11. For every new post (P3), a `claims-map-<slug>.md` sibling file exists with no empty cells (Gate G)
12. **Soft criterion:** real headshots for Jithesh + Rajesh Nair swapped in within 14 days of P0 ship, or Jeet explicitly declines. Ethan is exempt (placeholder acceptable).
13. **`scripts/recheck-blog-citations.mjs` exists, runs cleanly on day of P4 deploy (baseline run), and the quarterly schedule (4 calendar reminders +90/+180/+270/+360 days) is created in macOS Calendar.**

## 17. Appendices

### A — Real team data (verified source: `/Users/jeet/techcloudpro/src/data/team.ts`)

*[Jithesh / Rajesh Nair / Ethan bios, LinkedIn URLs, emails — per design doc Appendix A. Included in full in the PDF at `~/Downloads/artha-marketing-design.pdf`.]*

### B — Memory corrections flagged (for separate cleanup task)

1. `techcloudpro-aeo-backfill.md` says `reviewedBy Rajesh Manoharan` — should be Jithesh
2. TCP `src/data/team.ts` has "Rajesh Manoharan" — should be "Rajesh Nair" per LI slug
3. Experience: 18+ yrs (memory) vs 20+ yrs (TCP bio) — use 18+ consistently

### C — Session-approved decisions log

- Scope: Option B (backfill 84 + exactly 20 new posts)
- Grounding: ① + ② + ③
- Reviewer: Jithesh Manoharan (credential-only byline, no company)
- Team: Jithesh + Rajesh Nair + Ethan (3 real people)
- Post location: artha.build/blog only
- Cadence: batches of 10 with spot-check gate
- Reviewer default: Jithesh, with Ethan/Rajesh co-review by topic fit
- Byline rule: NO company names anywhere (locked by user)
- Provenance file location: artha repo
- Gate F: 3 random posts per batch for P2 backfill; 5 random posts per batch for P3 new posts
