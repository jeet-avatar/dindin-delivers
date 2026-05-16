---
phase: 58-m7-marketing-site-completion
plan: 03
subsystem: ui+backend
tags: [marketing, case-studies, about, contact, contact-form, lambda, ses, postgres, public-api, rate-limit, honeypot, cors]

# Dependency graph
requires:
  - phase: 58-01
    provides: APP_SIGNUP + API_URL config + gen-sitemap.mjs (try/catch case-studies dynamic import) + NavBar + SiteFooter links to /case-studies /about /contact (existed already)
  - phase: 58-02
    provides: src/data/modules.ts (CASE_STUDIES validates module slug refs against this) + ModulePage parametrized-route pattern (mirrored exactly for CaseStudyPage)
  - phase: 55-02
    provides: db.ts pool (zietra_app role) — reused for public.contact_submissions INSERT
  - phase: 55-05
    provides: zietra-rls-runner-55-05 one-shot Lambda — used to apply migration 035 (VPC-only Aurora is unreachable from local)
  - phase: 52
    provides: routes/tenants.ts public-route mount pattern (mounted BEFORE requireAuth-using routers) — followed exactly for /api/contact mount
provides:
  - /case-studies — index grid of 3 case study cards (Turion / Marquee+Anni / Glide Labs)
  - /case-studies/:slug — parametrized React component renders all 3 case study detail pages (7 sections)
  - /about — 1-page mission + traction + stack + CTA
  - /contact — 2-col layout: ContactForm + 3 mailto channels + SLA box
  - ContactForm component — controlled inputs + honeypot + 4-state machine + POST /api/contact
  - POST /api/contact public Express route — Origin allow-list + 5/hr/IP rate limit + honeypot + DB persist + best-effort SES notification
  - public.contact_submissions table (migration 035) — 11 cols + 2 indexes + GRANT INSERT to zietra_app
  - backend/src/lib/rate-limit.ts — reusable in-memory rate limiter (Map-based, prune-on-call, MAX_KEYS=10k)
  - Sitemap grew 22 → 25 URLs (added 3 case study detail pages — /case-studies + /about + /contact were already in 58-01 STATIC_ROUTES)
affects: [SES support@zietra.com inbox (best-effort once VPC NAT is added in M8), 58-04 docs (NavBar+Footer links are all live now)]

# Tech tracking
tech-stack:
  added:
    - "@aws-sdk/client-ses already in deps from prior work — no new package"
  patterns:
    - "Public Express route mount BEFORE requireAuth (mirrors routes/tenants.ts /api/tenants and routes/invites.ts /api/invites — Phase 52 / 54.1-02)"
    - "3-layer abuse prevention: Origin allow-list (403) + per-IP in-memory rate limit (429) + honeypot field 'website' (200 silent drop)"
    - "X-Forwarded-For spoof-guard: trust ips[-2] when ≥2 hops, ips[0] when single — mirror of Phase 55 cache.py:209"
    - "Best-effort SES send wrapped in AbortController 4s timeout — DB row is source of truth, response is decoupled from notification delivery (Rule-1 fix for VPC-no-NAT)"
    - "Hand-written src/data/case-studies.ts + slug-only src/data/case-studies.mjs sibling — same .ts/.mjs pattern as 58-02 modules but mirrored manually (3 entries, low drift risk; auto-sync deferred to M8)"
    - "Drift sanity check on case-studies.ts import — soft console.warn (not throw) if a case study references an unknown module slug"
  removed: []

key-files:
  created:
    - /Users/jeet/turion-space-demo/backend/migrations/035_contact_submissions.sql
    - /Users/jeet/turion-space-demo/backend/src/lib/rate-limit.ts
    - /Users/jeet/turion-space-demo/backend/src/routes/contact.ts
    - /Users/jeet/zietra/marketing/src/data/case-studies.ts
    - /Users/jeet/zietra/marketing/src/data/case-studies.mjs
    - /Users/jeet/zietra/marketing/src/pages/CaseStudiesIndexPage.tsx
    - /Users/jeet/zietra/marketing/src/pages/CaseStudyPage.tsx
    - /Users/jeet/zietra/marketing/src/pages/AboutPage.tsx
    - /Users/jeet/zietra/marketing/src/pages/ContactPage.tsx
    - /Users/jeet/zietra/marketing/src/components/ContactForm.tsx
    - /Users/jeet/doordash-p2p/.planning/phases/58-m7-marketing-site-completion/deferred-items.md
  modified:
    - /Users/jeet/turion-space-demo/backend/src/app.ts (mount /api/contact BEFORE requireAuth routers)
    - /Users/jeet/zietra/marketing/src/App.tsx (4 new lazy routes)
    - /Users/jeet/zietra/marketing/public/sitemap.xml (regenerated: 22 → 25 URLs)

key-decisions:
  - "Use the v2 Aurora cluster master secret (rds!cluster-16d5e38c-...-mhV473) — the proxy zietra-aurora-proxy points at zietra-aurora-prod-v2, NOT v1. The plan's recipe quoted the v1 secret ARN; that password is wrong. Discovered by reading aws rds describe-db-proxy-targets."
  - "Mount /api/contact BEFORE requireAuth routers (mirrors routes/tenants.ts /api/tenants public mount from Phase 52). The auth middleware is per-route in this codebase (Express, not Hono), so the contact route just doesn't add `requireAuth` and we're done."
  - "Use existing @aws-sdk/client-ses (v2 SDK) — already in deps. No new package added. Plan suggested @aws-sdk/client-sesv2 but the codebase already uses v2 client elsewhere."
  - "Decouple SES from the HTTP response (AbortController 4s timeout). The Lambda is in a private VPC with no NAT and no SES VPC endpoint — synchronous ses.send() hangs until Lambda timeout. DB row is source of truth; SES is best-effort. Documented as M8 follow-up (NAT gateway ~$32/mo OR SES VPCE ~$7/mo/AZ OR move Lambda out of VPC)."
  - "Hand-write src/data/case-studies.ts AND a slug-only .mjs sibling instead of inventing a sync-case-studies.mjs build step. 3 entries, low drift risk, M8 will auto-sync if it ever grows. Drift sanity check imports MODULES and console.warns on unknown slug refs."
  - "Tag Glide Labs (sample-saas-svc) with `representative: true` and surface a purple 'Representative · synthetic data' badge — global engineering rule #3 (no shortcuts, no assumptions). Honest about which case studies are real customers vs aspirational."
  - "Sitemap stays at 25 URLs not 28 — plan's expected count double-counted /about + /contact + /case-studies which were already in STATIC_ROUTES from 58-01. The actual delta from Wave 2 is +3 (the 3 case study detail pages)."
  - "Apply migration 035 via the zietra-rls-runner-55-05 Lambda (mirrors Phase 55-05 / 57-03 / 57-04 Task 1 Step A pattern). Aurora cluster is private VPC; local psql times out."
  - "IAM already has ses:SendEmail on zietra.com identity (existing zietra-signup-cognito-ses inline policy). NO new IAM policy needed — verified with aws iam get-role-policy before route impl."
  - "SES identities support@zietra.com + noreply@zietra.com auto-verified as soon as we ran aws sesv2 create-email-identity — the parent domain identity zietra.com is verified with DKIM, so child addresses pass immediately (sandbox-acceptable)."

requirements-completed:
  - CaseStudiesPage
  - AboutPage
  - ContactPage
  - ContactFormBackend

# Metrics
duration: 34 min
completed: 2026-05-15
---

# Phase 58 Plan 03: m7-marketing-site-completion Wave 3 Summary

**Shipped 3 case studies (Turion Space, Marquee + Anni Glitters, Glide Labs representative SaaS), /about, and /contact with a working contact form backed by a brand-new public Express route POST /api/contact (Origin allow-list + 5/hr/IP rate limit + honeypot + DB persist + best-effort SES). 4 atomic backend commits + 4 atomic marketing commits = 8 total. 12/12 live smoke pass on zietra.com. Backend Lambda turion-demo-api redeployed twice (pre-fix `322dcbea…`, post-fix `8a6a542b…` is the production value) Discovered + worked around a VPC-no-NAT issue that made the SES send hang the whole Lambda — best-effort timeout fix landed inline (Rule-1).**

## Performance

- **Duration:** 34 min
- **Started:** 2026-05-16T03:35:45Z
- **Completed:** 2026-05-16T04:09:56Z
- **Tasks:** 2 (autonomous)
- **Files created:** 11 (3 backend + 7 marketing + 1 deferred-items log)
- **Files modified:** 3 (backend/src/app.ts + marketing/src/App.tsx + marketing/public/sitemap.xml)
- **Commits:** 8 atomic + 1 marketing deploy marker = 9 total across 2 repos

## Accomplishments

### Backend (turion-space-demo)
- Migration 035 — `public.contact_submissions` table created (11 cols + 2 indexes + GRANT INSERT to zietra_app), applied via the zietra-rls-runner-55-05 Lambda using the **v2 cluster master secret** (the plan's secret ARN was the v1 cluster — proxy actually points at v2).
- `backend/src/lib/rate-limit.ts` — 45-LOC in-memory Map-based rate limiter, MAX_KEYS=10k cap, prune-on-call. Reusable for any future public route.
- `backend/src/routes/contact.ts` — 192-LOC Express Router with OPTIONS preflight + POST handler. 3-layer abuse prevention: Origin allow-list (zietra.com / www.zietra.com / dlzyv23o98bvo.cloudfront.net / localhost dev), per-IP 5/hr rate limit, honeypot field `website`. X-Forwarded-For spoof-guard uses ips[-2] when ≥2 hops (Phase 55 cache.py:209 pattern). DB persist via existing `pool` (zietra_app role). Best-effort SES send wrapped in AbortController 4s timeout.
- `backend/src/app.ts` mounts `/api/contact` BEFORE requireAuth routers — public route pattern from Phase 52 (routes/tenants.ts).
- IAM already had `ses:SendEmail` on `zietra.com` identity (existing inline policy `zietra-signup-cognito-ses`) — no IAM change needed.
- SES identities `noreply@zietra.com` + `support@zietra.com` verified instantly (parent domain zietra.com DKIM covers child addresses in sandbox).
- Lambda turion-demo-api redeployed via `build-and-push.sh` — new CodeSha256 `8a6a542befc37f0db2bb062b0428371ddab302a14a2546ce7644f44e46b5d790`.

### Frontend (zietra/marketing)
- `src/data/case-studies.ts` — 3 hand-written CaseStudy entries (Turion / Marquee+Anni / Glide Labs sample SaaS) with drift sanity check that warns on unknown module slug references.
- `src/data/case-studies.mjs` — slug-only Node-importable sibling for gen-sitemap.mjs.
- `src/pages/CaseStudyPage.tsx` — 282-LOC parametrized React component, mirrors ModulePage pattern. 7 sections: hero / problem / solution / modules-used pills (linking back to /modules/<slug>) / results grid / optional quote / bottom CTA → APP_SIGNUP?intent=<slug>. Unknown slug → Navigate to /case-studies.
- `src/pages/CaseStudiesIndexPage.tsx` — 182-LOC, 3-card grid each with industry / company / tagline / 5 module pills / "Read →".
- `src/pages/AboutPage.tsx` — 220-LOC, hero + Mission + Traction (real metrics inline-linked to 2 case studies) + Stack + bottom CTA.
- `src/pages/ContactPage.tsx` — 160-LOC, 2-col layout: ContactForm left, 3 mailto channels + SLA box right.
- `src/components/ContactForm.tsx` — 200-LOC controlled form: name/email/company/intent select/message textarea + honeypot. POST to `${API_URL}/api/contact` with credentials:'omit'. 4-state machine (idle/sending/success/error). On success, replaces form with thank-you panel.
- `src/App.tsx` — 4 new lazy routes (`/case-studies`, `/case-studies/:slug`, `/about`, `/contact`) wrapped in existing Suspense.
- Sitemap regenerated 22 → 25 URLs (+3 case study detail pages). `/about` / `/contact` / `/case-studies` were already in STATIC_ROUTES from 58-01.
- Marketing deployed via `deploy.sh` (S3 sync + CF invalidation) + Rule-3 follow-up invalidation for `/sitemap.xml` + `/robots.txt` + `/llms.txt`.

## Task Commits

**Backend (turion-space-demo):** 4 atomic commits
1. `e0f0dc7` `feat(58-03): migration 035 — public.contact_submissions (no RLS, GRANT INSERT to zietra_app)`
2. `769ad4a` `feat(58-03): backend/src/lib/rate-limit.ts — in-memory rate limiter (5/hr/IP)`
3. `105f6cb` `feat(58-03): public POST /api/contact route + mount`
4. `034b9c1` `fix(58-03): decouple SES send from response — turion-demo-api is in a VPC with no NAT, SES outbound hangs` (Rule-1 auto-fix)

**Marketing (zietra):** 4 atomic commits
5. `e12d9b4` `feat(58-03): src/data/case-studies.ts — 3 case studies (Turion, Marquee+Anni, Glide Labs)`
6. `d83104c` `feat(58-03): CaseStudyPage + CaseStudiesIndexPage + AboutPage + ContactPage + ContactForm + 4 routes`
7. `fdeab66` `chore(58-03): regen sitemap — 22 → 25 URLs (added 3 case study detail pages)`
8. `83f2221` `chore(58-03): deploy Wave 3 — case-studies + about + contact + form-backend live`

All 8 commits pushed to remote (turion-space-demo `3cf2064..034b9c1`, zietra `4645e28..83f2221`).

## Files Created / Modified

**Created** (11 files):
- `turion-space-demo/backend/migrations/035_contact_submissions.sql` (34 LOC)
- `turion-space-demo/backend/src/lib/rate-limit.ts` (45 LOC)
- `turion-space-demo/backend/src/routes/contact.ts` (192 LOC)
- `zietra/marketing/src/data/case-studies.ts` (208 LOC)
- `zietra/marketing/src/data/case-studies.mjs` (11 LOC)
- `zietra/marketing/src/pages/CaseStudyPage.tsx` (282 LOC)
- `zietra/marketing/src/pages/CaseStudiesIndexPage.tsx` (182 LOC)
- `zietra/marketing/src/pages/AboutPage.tsx` (220 LOC)
- `zietra/marketing/src/pages/ContactPage.tsx` (160 LOC)
- `zietra/marketing/src/components/ContactForm.tsx` (200 LOC)
- `.planning/phases/58-m7-marketing-site-completion/deferred-items.md` (M8 SES-VPC follow-up)

**Modified** (3 files):
- `turion-space-demo/backend/src/app.ts` (+5 LOC — import contact + app.use mount)
- `zietra/marketing/src/App.tsx` (+8 LOC — 4 lazy imports + 4 Route entries)
- `zietra/marketing/public/sitemap.xml` (regenerated — 22 → 25 URLs)

## Decisions Made

1. **Use v2 Aurora cluster master secret, not v1.** The plan referenced `rds!cluster-8dac9fc2-...-VbuP4h` (v1). Real proxy target is `zietra-aurora-prod-v2`, secret is `rds!cluster-16d5e38c-...-mhV473`. Verified via `aws rds describe-db-proxy-targets`.
2. **Mount /api/contact BEFORE requireAuth routers in Express.** Codebase uses per-route auth (not Hono global middleware as plan text described). Mirrors `routes/tenants.ts` public mount from Phase 52.
3. **Reuse existing `@aws-sdk/client-ses` (v2 SDK).** Already in `package.json`. Plan suggested adding `@aws-sdk/client-sesv2` but no need — v2 has SendEmailCommand.
4. **Decouple SES from HTTP response with AbortController 4s timeout.** Lambda is in private VPC with no NAT and no SES VPCE — synchronous `ses.send()` hangs until Lambda timeout. DB row is source of truth; SES is best-effort. M8 follow-up logged.
5. **Hand-write `.ts` + slug-only `.mjs` sibling** (no `sync-case-studies.mjs` script). 3 entries, low drift risk; the modules-auto-sync pattern from 58-02 is overkill here.
6. **Tag Glide Labs (sample-saas-svc) as Representative** in both index card and detail hero — global engineering rule #3 (no shortcuts, no assumptions). Honest about which case studies are real customers vs aspirational.
7. **Sitemap stays at 25 URLs (not 28 as plan expected).** Plan double-counted: /about + /contact + /case-studies were already in 58-01 STATIC_ROUTES. Actual delta from Wave 2 is +3 (the 3 case study detail pages).
8. **No IAM change needed.** `ses:SendEmail` already granted on `zietra.com` identity via existing `zietra-signup-cognito-ses` inline policy. Verified with `aws iam get-role-policy` before route implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] SES send hung the entire Lambda (turion-demo-api is in private VPC with no NAT)**
- **Found during:** Task 1 live smoke test (Case A: valid POST)
- **Issue:** First synchronous `await ses.send(SendEmailCommand)` call hung until the 30s Lambda timeout. Every valid POST returned HTTP 503 "Service Unavailable". CloudWatch logs showed zero log lines from inside the route handler — the SES SDK call was blocking before any `console.log` could flush. Root cause: Lambda's VPC has Secrets Manager / KMS / Cognito VPC endpoints only — no NAT gateway and no SES VPC endpoint, so SES API is unreachable.
- **Fix:** Wrapped `ses.send` in an AbortController that fires after 4 seconds. The DB INSERT (source of truth) runs synchronously and the user gets `{ok:true,id}` within ~200ms. The SES promise runs in the background and logs `[contact] SES send failed (row persisted)` with the submission ID on failure — ops can replay manually from the DB row. Added diagnostic `console.log` checkpoints at route entry / persist-step / persist-OK so future regressions are diagnosable in one CloudWatch pass.
- **Files modified:** `backend/src/routes/contact.ts` (+ rebuilt + redeployed Lambda)
- **Verification:** 6/6 backend smoke cases now pass (valid POST 200 + DB row, wrong-Origin 403, honeypot 200-silent, invalid-intent 400, short-message 400, OPTIONS 204).
- **Committed in:** `034b9c1`
- **Out-of-scope follow-up logged** in `.planning/phases/58-m7-marketing-site-completion/deferred-items.md`: M8 needs NAT gateway (~$32/mo) OR SES VPCE (~$7/mo/AZ) OR move turion-demo-api out of VPC to actually deliver the SES email. Until then support@zietra.com poll-and-process workflow logged.

**2. [Rule 3 — Blocking] Initial `psql` apply of migration 035 timed out (Aurora is private VPC)**
- **Found during:** Task 1 Step C (apply migration)
- **Issue:** Local `psql -h zietra-aurora-proxy.proxy-c23qcukqe810.us-east-1.rds.amazonaws.com` blocks on connection (Operation timed out). The Aurora proxy is in a private VPC.
- **Fix:** Applied migration via the existing `zietra-rls-runner-55-05` Lambda (Phase 55-05 / 57-03 / 57-04 pattern). Built JSON payload with `{sql, password}` and invoked via `aws lambda invoke`. First attempt failed with "password that was provided for the role zietra_admin is wrong" — discovered the proxy points at the **v2** cluster, not v1. Switched to `rds!cluster-16d5e38c-...-mhV473` secret (v2 cluster). Migration applied: 1 table + 2 indexes + 1 GRANT, all returning OK.
- **Files modified:** None (operational only — plan recipe quoted the wrong secret)
- **Verification:** `SELECT to_regclass('public.contact_submissions'), has_table_privilege('zietra_app','public.contact_submissions','INSERT')` returns `(contact_submissions, true)`. Plus successful INSERT via runner Lambda.
- **Documented in:** `e0f0dc7` commit body
- **Note:** This is the documented "correct" pattern in MEMORY.md (Phase 55-05 one-shot runner) — the plan recipe just quoted the wrong cluster's secret ARN. No re-plan needed; future plans should look up the proxy target before quoting a secret ARN.

**3. [Rule 3 — Blocking] CloudFront `turionspace.zietra.com` distribution blocks POST/OPTIONS (cache-only origin behavior)**
- **Found during:** Task 1 first live smoke (POST to https://turionspace.zietra.com/api/contact)
- **Issue:** CF returned 403 "This distribution is not configured to allow the HTTP request method that was used for this request". `turionspace.zietra.com` is the demo *frontend* CF distribution (E37R9PT8IL44L2), not the API entry point.
- **Fix:** POST directly to the APIGW URL `https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/contact` — which is what `API_URL` in `marketing/src/lib/config.ts` already resolves to. No CF reconfiguration needed; the marketing site's `fetch(${API_URL}/api/contact)` was always correct. Live E2E from `https://zietra.com` Origin → APIGW returned `{"ok":true,"id":...}`.
- **Files modified:** None
- **Verification:** Final E2E smoke: `curl -X POST https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/contact -H 'Origin: https://zietra.com'` returns 200 + UUID.
- **Note:** Plan's smoke recipe quoted the wrong host. The marketing form was always correct.

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking). None changed plan output.
**Auth gates:** 0. SES identities verified non-interactively (parent domain DKIM).

## Issues Encountered

- **Smoke test cold-start timeouts (early in Task 1).** The first 2 POSTs against the not-yet-fixed contact route timed out. Both INSERTed rows to `public.contact_submissions` (confirmed by post-mortem SELECT) but returned HTTP 503 because Lambda timed out before `res.json()` flushed. Resolved by the Rule-1 SES decoupling fix; rows cleaned up afterwards (6 test rows deleted in batch).
- **No regressions.** Phase 58-01 / 58-02 routes (/ /pricing /modules /modules/<slug>) all still return 200. `npm run build` exits clean (0 errors), no chunks > 500 KB, sitemap regenerates to 25 URLs.
- **SES delivery is currently degraded (intentional).** The contact form persists DB rows reliably but SES email to support@zietra.com is best-effort and currently fails due to VPC NAT-less network. Logged for M8.

## Authentication Gates

None. All AWS calls used the existing CLI credentials for account 134607809447. SES identity verification was automatic (parent domain DKIM covered child addresses).

## User Setup Required

**None for the contact form to capture leads** — `public.contact_submissions` rows are persisting and queryable today.

**For SES delivery to actually work** (M8 task, logged in `deferred-items.md`):
- Add a NAT gateway to vpc-012ab4500dcd4ee41 (~$32/mo), OR
- Add an SES VPC endpoint (~$7/mo/AZ), OR
- Move `turion-demo-api` out of the VPC and use the bypass pool pattern for DB access.

Until then, support team should poll `SELECT * FROM public.contact_submissions WHERE processed_at IS NULL ORDER BY created_at DESC` for new leads.

## Self-Check: PASSED

**Created files exist:**
- `/Users/jeet/turion-space-demo/backend/migrations/035_contact_submissions.sql` — FOUND
- `/Users/jeet/turion-space-demo/backend/src/lib/rate-limit.ts` — FOUND (45 LOC, exports `rateLimitOk`)
- `/Users/jeet/turion-space-demo/backend/src/routes/contact.ts` — FOUND (192 LOC, contains `SendEmailCommand`)
- `/Users/jeet/zietra/marketing/src/data/case-studies.ts` — FOUND (208 LOC, exports `CASE_STUDIES` of 3 entries)
- `/Users/jeet/zietra/marketing/src/data/case-studies.mjs` — FOUND
- `/Users/jeet/zietra/marketing/src/pages/CaseStudyPage.tsx` — FOUND (282 LOC, uses `useParams`)
- `/Users/jeet/zietra/marketing/src/pages/CaseStudiesIndexPage.tsx` — FOUND (182 LOC, contains `CASE_STUDIES.map`)
- `/Users/jeet/zietra/marketing/src/pages/AboutPage.tsx` — FOUND (220 LOC)
- `/Users/jeet/zietra/marketing/src/pages/ContactPage.tsx` — FOUND (160 LOC, renders `<ContactForm />`)
- `/Users/jeet/zietra/marketing/src/components/ContactForm.tsx` — FOUND (200 LOC, contains honeypot)

**Commits exist on remote:**
- turion-space-demo: `e0f0dc7`, `769ad4a`, `105f6cb`, `034b9c1` — all 4 pushed
- zietra: `e12d9b4`, `d83104c`, `fdeab66`, `83f2221` — all 4 pushed

**Backend smoke (6/6 PASS):**
- Valid POST → 200 + `{ok:true,id}` + DB row inserted
- Wrong Origin → 403
- Honeypot filled → 200 `{ok:true}` (no id, silent drop, no DB row)
- Invalid intent → 400 `{error:"Invalid intent."}`
- Short message → 400 `{error:"Message must be 10-5000 characters."}`
- OPTIONS preflight → 204 + CORS headers

**Frontend smoke (10/10 PASS) on https://zietra.com:**
- `/`, `/pricing`, `/modules`, `/modules/crm` (regression check) → 200
- `/case-studies`, `/case-studies/turion-space`, `/case-studies/marquee-anni`, `/case-studies/sample-saas-svc` → 200
- `/about`, `/contact` → 200

**Sitemap:** 25 URLs (9 static + 13 modules + 3 case studies) — verified via `curl https://zietra.com/sitemap.xml | grep -c '<loc>'`.

**E2E contact form:** `curl -X POST https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/contact -H 'Origin: https://zietra.com' -H 'Content-Type: application/json' -d '{...}'` returned `{"ok":true,"id":"632edc16-..."}`. Test row cleaned up.

**Lambda redeploy:** `aws lambda get-function-configuration --function-name turion-demo-api --query CodeSha256` returns `8a6a542befc37f0db2bb062b0428371ddab302a14a2546ce7644f44e46b5d790` (changed from prior).

**CloudFront invalidations:** `I8ZLEHSNR9CDTM0NNGJ2FSREBG` (default / + /index.html) — Completed. `I8LZPLKN3UCCQ30FEK5A5FJQO6` (Rule-3 follow-up for /sitemap.xml + /robots.txt + /llms.txt) — Completed.

## Next Phase Readiness

**Ready for 58-04 (docs + final polish).** Wave 3 surfaces are live:
- NavBar links (/modules, /pricing, /case-studies) all resolve to live pages.
- SiteFooter links (/about, /contact, /privacy, /terms, /modules, /case-studies, /docs) — only `/docs` remains as a 404 (the last 58-04 deliverable).
- ContactForm pattern available for future "Get a demo" embeds in 58-04 docs.
- Case study modules pills demonstrate the cross-page link pattern (CaseStudyPage → /modules/<slug>) that 58-04 docs can reuse.

**Open blockers for 58-04:** None.

**Deferred for M8:** NAT gateway / SES VPCE so contact form SES delivery actually works (DB persistence works today). Documented in `deferred-items.md`.

---
*Phase: 58-m7-marketing-site-completion*
*Completed: 2026-05-15*
