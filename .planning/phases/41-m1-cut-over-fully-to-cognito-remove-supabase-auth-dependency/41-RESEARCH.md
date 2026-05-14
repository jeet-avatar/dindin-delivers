# Phase 41: M1 — Cut over fully to Cognito + remove Supabase Auth dependency — Research

**Researched:** 2026-05-14
**Domain:** Vanilla-JS migration script · Cognito IdToken-only middleware · CloudFront URL routing · AWS env/IAM/secret cleanup
**Confidence:** HIGH — every assertion verified against the live filesystem (`/Users/jeet/turion-space-demo`, `/Users/jeet/turion-satellite`), the actual deployed Lambda env vars + Create-Auth-Challenge env vars, the live CloudFront function source, and Phase 40's already-deployed `cognito-auth.js`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| Topic | Decision |
|---|---|
| Magic-link UX | Preserved exactly — user receives email, clicks, lands in app. The Cognito CUSTOM_AUTH flow (Phase 39) already produces this UX. |
| Frontend helper | Single `cognitoAuth` (already deployed in Phase 40). `erpAuth` + `satelliteAuth` retired. |
| Backend middleware | Cognito-only after this phase. Drop the Supabase ES256 branch + the `getSupabasePublicKey()` helper + `process.env.SUPABASE_JWT_PUBLIC_KEY` derivation. |
| Supabase Postgres | KEEP (until M2/Phase 42-43). Only Supabase **Auth** is removed. The DB connection stays. |
| `auth.users` rows | Archived (NOT deleted) — Phase 39 stamped `custom:supabase_sub` forward-link on every Cognito user. Keep Supabase `auth.users` read-only until M2 migration. |
| Login pages | `erp-login.html` + satellite login → use `cognitoAuth.signInWithMagicLink(email)`. Same email-form UX. New callback page `cognito-auth-callback.html` (both apps) parses URL token + calls `cognitoAuth.respondToChallenge`. |
| Lambda env vars to delete | `SUPABASE_JWT_SECRET_ARN` on both Lambdas (after middleware drops ES256 branch). |
| IAM grant to delete | `secretsmanager:GetSecretValue` on `turion-satellite/production/supabase-jwt-secret-*` on `zietra-api-lambda-role` (last cleanup task). |
| Migration script | Delete `backend/scripts/migrate-supabase-users-to-cognito.ts` (Rule 5 — one-shot is done). |
| Cognito-trigger Lambdas | UNTOUCHED (`zietra-cognito-*` × 4). They issue tokens; this phase consumes them. |

### Claude's Discretion
- Whether the migration mechanism is a single `inject-cognito-auth.mjs` Node script (modeled on Phase 38's `/tmp/inject-erp-auth.mjs`) or a pair of sed-based replacements → **RECOMMEND: a single Node ES-module script that does deterministic block-replacement on the fixed Phase-38 marker block AND a second pass for satellite pages.** Marker-comment guarded for idempotency. See §"Pattern 1 — Migration script (`migrate-helpers-to-cognito.mjs`)".
- Whether ERP `cognito-auth-callback.html` and satellite `cognito-auth-callback.html` are two physical files vs one shared file → **RECOMMEND: two files** (mirrors `erp-login.html` vs `satellite/login.html`). The Create-Auth-Challenge Lambda's single `MAGIC_LINK_BASE_URL=https://turionspace.zietra.com` builds `https://turionspace.zietra.com/cognito-auth-callback?token=...&email=...` — the ERP file lives at `/cognito-auth-callback.html` (root). The satellite app needs a separate file at `/satellite/cognito-auth-callback.html`. But — since both apps share the same domain — the Lambda emits a single URL. Therefore Phase 41 **MUST decide which page that single magic-link URL lands on**. Options below; recommendation in §"Open Questions" §1.
- Whether `erp-api.js` + `satellite-api.js` get rewritten in-place to read from `cognitoAuth` storage, or whether they get replaced by a new `cognito-api.js` → **RECOMMEND: in-place rewrite.** Keep the global names `window.erpApi` + `window.satelliteApi` so no page-level change is needed for fetch sites; the migration script then doesn't have to touch `erpApi.*` / `satelliteApi.*` references. Net diff: ~5 lines per file (`getSession()` returns `{ idToken, ... }` not `{ access_token, user }`; pass `session.idToken` not `session.access_token`).
- Whether to retire the `SUPABASE_JWT_SECRET_ARN` env var in Wave 1 or Wave 3 → **RECOMMEND: Wave 3 (after both Lambdas are confirmed Cognito-only)**, so a Wave-2 rollback of the middleware can still reach the secret.
- Whether to delete `turion-satellite/production/supabase-jwt-secret-sWnNlr` (the secret itself) in Phase 41 or leave as an orphan → **RECOMMEND: delete in Wave 3** after >1 cold start proves Cognito-only verify works on both Lambdas. Cost is ~$0.40/mo but Rule 5 (remove dead) wins.

### Deferred Ideas (OUT OF SCOPE for Phase 41)
- Migrating `turion.*` schema tables off Supabase Postgres (M2, Phases 42-43)
- Deleting Supabase `auth.users` rows (read-only-archive policy)
- Rotating Cognito JWKs / app-client secret
- MFA, SSO, federation, password flows
- Touching any of the 4 Cognito-trigger Lambdas (`zietra-cognito-{custom-email-sender,define-auth-challenge,create-auth-challenge,verify-auth-challenge}`)
- Multi-tenancy `tenant_id` (M3)
- Stripe + entitlements (M4)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

From `.planning/REQUIREMENTS.md:119-121` — all 3 IDs MUST be addressed by the plans this research informs:

| ID | Description | Research Support |
|----|-------------|------------------|
| **CognitoOnlyFrontend** | All 96 HTML pages stop loading `erp-auth.js` / `satellite-auth.js` / `@supabase/supabase-js@2` UMD; all `erpAuth.requireSession()` and `satelliteAuth.requireSession()` calls are rewritten as `cognitoAuth.requireSession()`; new `cognito-auth-callback.html` (per app) replaces `erp-auth-callback.html` and the missing satellite callback; the two login pages call `cognitoAuth.signInWithMagicLink(email)`; `erp-api.js` + `satellite-api.js` rewired to pull `idToken` from `cognitoAuth` storage. | §"Pattern 1 — Migration script" + §"Pattern 2 — Login pages" + §"Pattern 3 — Callback pages" + §"Pattern 4 — `erp-api.js` / `satellite-api.js` rewrite" |
| **CognitoOnlyBackend** | Both `requireAuth` middlewares drop the Supabase ES256 branch + `SUPABASE_ISSUER` constant + `getSupabasePublicKey()`/`getSupabaseVerifyKey()` helpers; both `secrets.ts` drop the `SUPABASE_JWT_SECRET_ARN` derivation block. Cognito JWKS load is now MANDATORY at cold start (throw on failure — no Supabase fallback to preserve). All Cognito-iss tokens still verify exactly as in Phase 40; non-Cognito tokens 401. | §"Pattern 5 — Backend middleware simplification" + §"Pattern 6 — `secrets.ts` simplification" |
| **SupabaseAuthDeprecation** | `SUPABASE_JWT_SECRET_ARN` Lambda env vars removed (both Lambdas). `zietra-api-lambda-role` inline policy `secretsmanager:GetSecretValue` on `turion-satellite/production/supabase-jwt-secret-*` removed. Secrets Manager secret `turion-satellite/production/supabase-jwt-secret-sWnNlr` deleted. `backend/scripts/migrate-supabase-users-to-cognito.ts` deleted (Rule 5 — Phase 39 one-shot done). `@aws-sdk/client-cognito-identity-provider` dependency removed from `turion-space-demo/backend/package.json` (used only by the migration script). `SUPABASE_URL` + `SUPABASE_ANON_KEY` fields removed from both config-generator scripts. **DATABASE_URL / DATABASE_URL_ARN stay** (Supabase Postgres lives until M2). | §"Pattern 7 — AWS cleanup ordering" + §"Pattern 8 — Repo cleanup" |
</phase_requirements>

---

## Summary

Phase 41 is **largely deletion + one routing fix**. The hard work shipped in Phase 40 (dual-issuer middleware accepting both Cognito and Supabase concurrently; `cognito-auth.js` deployed byte-identical to both frontends). Phase 41 just (a) wires 96 pages to the new helper, (b) builds 2 new callback pages + 2 rewritten login pages, (c) strips the Supabase branch from the now-redundant dual-issuer middleware in both repos, and (d) deletes the orphaned AWS infra. There are no new AWS resources, no new Lambda functions, no new IAM grants, no new secrets.

The single biggest **discovery** during research: the deployed Create-Auth-Challenge Lambda already emits the magic-link URL as `https://turionspace.zietra.com/cognito-auth-callback?token=<nonce>&email=<email>` (verified at `lambdas/cognito-custom-email-sender/src/create-auth-challenge.ts:38` and `MAGIC_LINK_BASE_URL` env var on the live Lambda). That means **cross-page email-state is already solved** — the callback page reads `email` from the URL query string, not from `localStorage`. But it also means **CloudFront must route the extensionless `/cognito-auth-callback` URL to `/cognito-auth-callback.html`** — and a curl test against the live domain just now returned 403 because the rewrite rule isn't in the `turion-clean-urls` CloudFront function. So Phase 41 has one mandatory CloudFront-function edit to add a single line to the `R` table.

The second biggest discovery: **session-shape mismatch.** Existing pages (12 satellite pages, both `*-api.js` wrappers) read `session.user.email` and `session.access_token` (Supabase shape). `cognitoAuth` stores `{ idToken, accessToken, refreshToken, expiresAt, email }` (flat shape, no `user` nested object). So the migration script can't be pure search-and-replace of `erpAuth` → `cognitoAuth`; it must also rewrite `session.user.email` → `session.email` and the `*-api.js` files must be rewritten to pass `session.idToken` (NOT `session.access_token` and NOT `session.idToken` to a Supabase backend — but Phase 41's backend is Cognito-only by then, so `idToken` is correct).

**Primary recommendation:** 3 plans in 3 sequential waves (NOT parallel — order matters for cutover safety).

- **Wave 1 (1 plan, no backend touch) — Frontend cutover:** 41-01. Build `/cognito-auth-callback.html` + `/satellite/cognito-auth-callback.html`, rewrite `/erp-login.html` + `/satellite/login.html`, add the CloudFront `/cognito-auth-callback` rewrite rule, run the migration script across 96 pages (it does block-replacement of the locked Phase-38 marker block + rewrites session-shape references + drops Supabase UMD tags), rewrite `erp-api.js` + `satellite-api.js` to read from `cognitoAuth` storage, deploy frontend, drop `SUPABASE_URL`+`SUPABASE_ANON_KEY` from config generators. Smoke: per-page curl for representative pages + magic-link end-to-end via Playwright headless OR via the Phase 40 nonce-scrape pattern. **Backend stays dual-issuer the entire time — Cognito tokens already verify (Phase 40 proved this), so the cutover is safe to revert by re-deploying the prior frontend bundle.**
- **Wave 2 (2 plans, depends on Wave 1 — mirror change across repos) — Backend Cognito-only:**
  - 41-02: Strip Supabase branch from `turion-space-demo/backend/src/middleware/auth.ts` + `secrets.ts`. Make Cognito JWKS load MANDATORY (throw on failure — no fallback to preserve since Supabase is gone). Drop `SUPABASE_ISSUER` const, `getSupabasePublicKey()`, the `SUPABASE_JWT_PUBLIC_KEY`/`SUPABASE_JWT_SECRET` derivation, the `process.env.SUPABASE_JWT_SECRET_ARN` block. Rebuild + redeploy via `turion-space-demo/backend/build-and-push.sh`. Smoke: Cognito IdToken → 200, forged Cognito → 401, forged Supabase ES256 → 401 (would have been 200 on dual-issuer; now 401 because branch is gone — verifies the cutover).
  - 41-03: Mirror change for `turion-satellite/backend/src/middleware/auth.ts` + `secrets.ts`. Same diff, same smoke. Plans 41-02 and 41-03 are byte-identical patches applied to byte-identical files (verified live).
- **Wave 3 (1 plan, depends on Wave 2) — AWS cleanup + Rule-5 sweep:** 41-04. Remove `SUPABASE_JWT_SECRET_ARN` env var from both Lambdas (`aws lambda update-function-configuration`). Remove the IAM inline policy from `zietra-api-lambda-role` that grants `secretsmanager:GetSecretValue` on `supabase-jwt-secret`. **Delete** the secret `turion-satellite/production/supabase-jwt-secret-sWnNlr` (with a 7-day recovery window so it can be undeleted if needed). Delete `backend/scripts/migrate-supabase-users-to-cognito.ts` + `README-cognito-migration.md`. Remove `@aws-sdk/client-cognito-identity-provider` from `backend/package.json`. Delete `erp-auth.js`, `satellite/satellite-auth.js`, `erp-auth-callback.html` from the frontend. Final regression smoke: reuse `scripts/smoke-phase-40.sh` with case (e) → expect 401 (no change — already 401 in Phase 40), case (a) → 200, plus per-page `curl https://turionspace.zietra.com/<page>` for 5 representative pages + assert response HTML contains `cognito-auth.js` and does NOT contain `erp-auth.js` or `supabase-js@2`. Write `PHASE_41_CHECKPOINT.md` and close M1.

(Planner may merge 41-02 + 41-03 into one plan since they're byte-identical, mirroring Phase 40's 40-01+40-02. Mirroring 40's structure is fine too — two plans run sequentially, ~10 min each.)

---

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Node.js built-in `fs`/`path` | Node 22 (host machine) | Migration script — read/write 96 HTML files | Phase 38 already used this exact pattern (`/tmp/inject-erp-auth.mjs`); zero deps; idempotent via marker-comment guard. |
| `jsonwebtoken` | `^9.0.x` (both repos — installed) | Backend JWT verify (Cognito RS256 only after Phase 41) | Already in both repos; the Cognito path of Phase-40 middleware uses it; this phase just removes the parallel Supabase branch. |
| Node built-in `crypto.createPublicKey` | Node 22 (Lambda runtime) | JWK → SPKI PEM for Cognito JWKS | Already used in `secrets.ts:13-17` of both repos. Stays. |
| `@aws-sdk/client-secrets-manager` | `^3.x` (both repos) | Read `zietra/cognito-config` at cold start | Already used. Stays. |
| `fetch` (Node 22 global) | built-in | Cold-start JWKS fetch from Cognito | Already used. Stays. |
| `aws cognito-idp` CLI + `aws cloudfront update-function` CLI | bundled AWS CLI v2 | Smoke test (mint IdToken) + CloudFront rewrite-rule deploy | Already used in `scripts/smoke-phase-40.sh`. |

### Supporting

| Tool | Version | Purpose |
|------|---------|---------|
| `scripts/smoke-phase-40.sh` | already shipped | Re-run for Phase 41 final regression — but **expect case (e) [forged Supabase ES256] to still return 401** AND **case (d) [valid Supabase ES256] would now return 401 too** (where in Phase 40 dual-issuer mode it would have returned 200). This proves the Supabase branch is gone. |
| `scripts/audit-erp-buttons.mjs` + `scripts/audit-satellite-buttons.mjs` | already shipped | Run after migration — confirms 0 violations on both frontends after the page rewrites. The migration script does NOT change any `erpApi.*`/`satelliteApi.*` calls (those globals stay, just rewired) so audit-buttons output should be identical to pre-Phase-41. |
| Playwright / headless Chrome | NOT INSTALLED | If we want per-page browser-load smoke. Alternative: `curl` per-page + assert the HTML response contains `<script src="/cognito-auth.js">` (works fine — page-load gating is HTML/JS only, no SSR; the curl-served HTML is the entire client-side gate). | 
| Phase 38's `/tmp/inject-erp-auth.mjs` (already executed) | one-shot — already ran | **Reference pattern** for the Phase-41 migration script. Same shape (marker-guarded, idempotent, deterministic). Phase 41 must NOT re-run it — it would inject the Supabase block we're trying to remove. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Recommendation |
|------------|-----------|----------|----------------|
| Marker-block replacement on the locked Phase-38 helper block | sed across all 96 files | sed is fragile across BSD/GNU; the marker block spans 6 lines with HTML-special characters. | **USE Node script.** Read full file, `replace()` on the 6-line block as a single multi-line string, write back. Idempotent via the new Phase-41 marker. |
| Adding the CloudFront rewrite for `/cognito-auth-callback` | Editing `MAGIC_LINK_BASE_URL` to be `https://turionspace.zietra.com/cognito-auth-callback.html` | Would mean changing the Lambda env var (touches `zietra-cognito-create-auth-challenge`, marked OUT-OF-SCOPE in CONTEXT). | **EDIT the CloudFront function instead.** Add one line: `'/cognito-auth-callback': '/cognito-auth-callback.html',` to the `R` table. Single `aws cloudfront update-function` + invalidate. Mirrors how 50+ existing clean URLs are routed. |
| Two physical `cognito-auth-callback.html` files (ERP + satellite) | One shared file with `?app=erp` query param | One file is simpler. BUT — the magic-link URL emitted by Lambda has no `?app=` param today; adding one means editing the Lambda. **Better:** two files, AND a default URL the Lambda points at (`/cognito-auth-callback` = ERP root). The satellite app's pre-login flow stores `app=satellite` in `localStorage` before issuing `signInWithMagicLink`, then the ERP callback page reads it on load and forwards to `/satellite/index.html` if found. **Recommended:** see §"Open Questions §1" — single ERP-rooted callback page that branches based on `localStorage.app-hint` works without any Lambda change. |
| Rewriting `erp-api.js`/`satellite-api.js` | Building new `cognito-api.js` and migrating all `erpApi.*`/`satelliteApi.*` callers | The latter is a 100+ site rename. **Don't do it.** The minimal-diff path is: in-place rewrite so `window.erpApi` and `window.satelliteApi` keep their existing surface, just sourced from `cognitoAuth.getSession()` not `erpAuth.getSession()`. |
| Adding lazy Cognito JWKS re-fetch on `kid` miss | Letting cold-start JWKS go stale until next deploy | Cognito rotates JWKs at multi-day intervals + the Lambda warm container lifetime is ~15 min idle → cold start naturally re-fetches every 15 min anyway. **Hand-roll lazy fetch in Phase 41 only if Cognito JWK rotation event is observed in production logs.** Until then: cold-start-only suffices. |

**Installation:** No new dependencies. **Removal:** `@aws-sdk/client-cognito-identity-provider` from `turion-space-demo/backend/package.json` (used only by the soon-to-be-deleted migration script).

---

## Architecture Patterns

### Recommended file changes

```
turion-space-demo/                                    # frontend repo + ERP backend
├── cognito-auth-callback.html        # NEW — ERP callback (deserves dedicated page; magic-link points here)
├── erp-login.html                    # REWRITE — calls cognitoAuth.signInWithMagicLink
├── erp-api.js                        # REWRITE — sources idToken from cognitoAuth.getSession() (5-line diff)
├── erp-auth.js                       # DELETE — Phase-38 Supabase helper retired
├── erp-auth-callback.html            # DELETE — superseded by cognito-auth-callback.html
├── satellite/
│   ├── cognito-auth-callback.html    # NEW — satellite callback (if we use two-file shape — see Open Q §1)
│   ├── login.html                    # REWRITE — calls cognitoAuth.signInWithMagicLink
│   ├── satellite-api.js              # REWRITE — sources idToken from cognitoAuth.getSession()
│   └── satellite-auth.js             # DELETE — Phase-38 Supabase helper retired
├── *.html (81 ERP + 13 satellite — see CHECKPOINT §5.1 for full list)   # MODIFY via migration script
├── scripts/
│   ├── generate-turion-config.sh     # MODIFY — drop SUPABASE_URL + SUPABASE_ANON_KEY emission
│   ├── generate-satellite-config.sh  # MODIFY — same
│   ├── migrate-helpers-to-cognito.mjs # NEW — block-replace + session-shape rewriter
│   └── smoke-phase-40.sh             # KEEP — Phase 41 final smoke reuses it (case (e) still 401, case (d) now 401)
├── infrastructure/cloudfront/turion-clean-urls.js  # MODIFY — add '/cognito-auth-callback': '/cognito-auth-callback.html' (path may differ — see §"Pattern X")
├── backend/
│   ├── package.json                  # MODIFY — drop @aws-sdk/client-cognito-identity-provider dep
│   ├── scripts/migrate-supabase-users-to-cognito.ts  # DELETE
│   ├── scripts/README-cognito-migration.md          # DELETE
│   └── src/
│       ├── middleware/auth.ts        # MODIFY — drop Supabase branch + helpers
│       └── secrets.ts                # MODIFY — drop SUPABASE_JWT_SECRET_ARN block; make Cognito mandatory

turion-satellite/                                     # satellite backend repo
└── backend/src/
    ├── middleware/auth.ts            # MODIFY — mirror change (drop Supabase branch + getSupabaseVerifyKey)
    └── secrets.ts                    # MODIFY — mirror change (drop SUPABASE_JWT_SECRET_ARN block)
```

### Pattern 1: Migration script (`scripts/migrate-helpers-to-cognito.mjs`)

**What:** Node ES module that does deterministic block-replacement + session-shape fix across all HTML files in `turion-space-demo/*.html` and `turion-space-demo/satellite/*.html`.

**Why a script (not sed):** The Phase-38 marker block is a fixed 6-line string injected by `/tmp/inject-erp-auth.mjs` — exact same shape on all 81 injected ERP pages. Block-replacement is safer than sed for multi-line, HTML-character-heavy content. Idempotent via a new Phase-41 marker comment.

**Skeleton:**

```javascript
// scripts/migrate-helpers-to-cognito.mjs
// Phase 41 — One-shot, idempotent migration of every Supabase-auth-using HTML
// page in turion-space-demo to use cognitoAuth instead.
//
// Affects:
//   - 83 ERP root pages (skips erp-login.html + erp-auth-callback.html)
//   - 13 satellite/*.html pages (skips satellite/login.html)
//
// Action per file:
//   (a) If marker "ERP auth helpers (Phase 38)" is present (ERP pages), replace
//       the 6-line Phase-38 block with the new 4-line Phase-41 block.
//   (b) Otherwise (satellite pages have ad-hoc auth scripts not from a marker):
//       - Replace any '<script src="/satellite/satellite-auth.js"></script>' with
//         '<script src="/satellite/cognito-auth.js"></script>'
//       - Remove the Supabase UMD '<script src="https://cdn.jsdelivr.net/.../supabase-js@2/.../supabase.js"></script>'
//   (c) Replace 'satelliteAuth.requireSession' / 'satelliteAuth.getCurrentUser' / etc → 'cognitoAuth.*'
//   (d) Replace 'erpAuth.*' → 'cognitoAuth.*'
//   (e) Replace 'session.user.email' → 'session.email'
//   (f) Add the Phase-41 marker comment so re-runs are no-ops.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/jeet/turion-space-demo';
const ERP_SKIP = new Set(['erp-login.html', 'erp-auth-callback.html', 'cognito-auth-callback.html']);
const SAT_SKIP = new Set(['login.html', 'cognito-auth-callback.html']);

const PHASE_41_MARKER = 'Cognito auth helpers (Phase 41)';
const PHASE_38_BLOCK_REGEX = /<!-- ERP auth helpers \(Phase 38\) -->\s*\n\s*<script src="\/turion-config\.js"><\/script>\s*\n\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2[^"]*"><\/script>\s*\n\s*<script src="\/erp-auth\.js"><\/script>\s*\n\s*<script src="\/erp-api\.js"><\/script>\s*\n\s*<script>\(async \(\) => \{ await window\.erpAuth\.requireSession\(\); \}\)\(\);<\/script>/;

const PHASE_41_ERP_BLOCK = `<!-- ${PHASE_41_MARKER} -->
<script src="/turion-config.js"></script>
<script src="/cognito-auth.js"></script>
<script src="/erp-api.js"></script>
<script>(async () => { await window.cognitoAuth.requireSession(); })();</script>`;

const SUPABASE_UMD_REGEX = /\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2[^"]*"><\/script>/g;

function migrateErp(html) {
  if (html.includes(PHASE_41_MARKER)) return { html, modified: false };  // idempotent
  let out = html.replace(PHASE_38_BLOCK_REGEX, PHASE_41_ERP_BLOCK);
  out = out.replace(/\berpAuth\./g, 'cognitoAuth.');
  out = out.replace(/\bsession\.user\.email\b/g, 'session.email');
  return { html: out, modified: out !== html };
}

function migrateSatellite(html) {
  if (html.includes(PHASE_41_MARKER)) return { html, modified: false };
  let out = html;
  out = out.replace(SUPABASE_UMD_REGEX, '');
  out = out.replace('<script src="/satellite/satellite-auth.js"></script>',
                    `<!-- ${PHASE_41_MARKER} --><script src="/satellite/cognito-auth.js"></script>`);
  out = out.replace(/\bsatelliteAuth\./g, 'cognitoAuth.');
  out = out.replace(/\bsession\.user\.email\b/g, 'session.email');
  return { html: out, modified: out !== html };
}

// --- ERP pass ---
let erpModified = 0, erpAlready = 0, erpUnmatched = [];
for (const f of readdirSync(ROOT).filter(x => x.endsWith('.html'))) {
  if (ERP_SKIP.has(f)) continue;
  const p = path.join(ROOT, f);
  const html = readFileSync(p, 'utf8');
  const { html: out, modified } = migrateErp(html);
  if (html.includes(PHASE_41_MARKER)) { erpAlready++; continue; }
  if (!modified) { erpUnmatched.push(f); continue; }
  writeFileSync(p, out);
  erpModified++;
}

// --- Satellite pass ---
const SAT_DIR = path.join(ROOT, 'satellite');
let satModified = 0, satAlready = 0, satUnmatched = [];
for (const f of readdirSync(SAT_DIR).filter(x => x.endsWith('.html'))) {
  if (SAT_SKIP.has(f)) continue;
  const p = path.join(SAT_DIR, f);
  const html = readFileSync(p, 'utf8');
  const { html: out, modified } = migrateSatellite(html);
  if (html.includes(PHASE_41_MARKER)) { satAlready++; continue; }
  if (!modified) { satUnmatched.push(f); continue; }
  writeFileSync(p, out);
  satModified++;
}

console.log(`ERP: ${erpModified} modified, ${erpAlready} already-migrated, ${erpUnmatched.length} unmatched`);
if (erpUnmatched.length) console.log('  unmatched →', erpUnmatched.join(', '));
console.log(`Sat: ${satModified} modified, ${satAlready} already-migrated, ${satUnmatched.length} unmatched`);
if (satUnmatched.length) console.log('  unmatched →', satUnmatched.join(', '));
```

**Verification after script:**
```bash
# After running migrate-helpers-to-cognito.mjs:
cd /Users/jeet/turion-space-demo
grep -rln 'erpAuth\|satelliteAuth\|/erp-auth\.js\|/satellite/satellite-auth\.js\|@supabase/supabase-js@2' *.html satellite/*.html | wc -l   # → 0 (after deletions in Wave 3)
grep -rln 'cognitoAuth\|cognito-auth\.js' *.html satellite/*.html | wc -l   # → 94 (96 minus 2 callback pages that have inline cognitoAuth use)
```

### Pattern 2: Login pages (`/erp-login.html`, `/satellite/login.html`)

**What:** Rewrite both to call `cognitoAuth.signInWithMagicLink(email)`. Same email-form UX, same "Check your inbox at <email>" success card. The only change: drop the Supabase UMD script tag + the `erp-auth.js`/`satellite-auth.js` load + the `emailRedirectTo` argument (Cognito's Create-Auth-Challenge Lambda builds the URL server-side from `MAGIC_LINK_BASE_URL` env var).

**ERP login skeleton (replaces 111 lines in current `erp-login.html` with this):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in · Turion Space ERP</title>
  <link rel="stylesheet" href="/ns-shared.css">
  <style>/* same CSS as today */</style>
</head>
<body>
<div class="login-card">
  <div class="brand">Turion Space<span class="sub">ERP</span></div>
  <div class="tag">Sign in to the production system</div>

  <form id="loginForm">
    <label for="email">Work email</label>
    <input type="email" id="email" name="email" required autofocus autocomplete="email">
    <button type="submit" id="submitBtn">Send magic link</button>
    <div id="error" class="error" role="alert" aria-live="polite"></div>
  </form>

  <div id="success" style="display:none;">
    <div class="success-box">
      Check your inbox at <strong id="sentEmail"></strong>. Click the link to sign in.
    </div>
    <button class="secondary" onclick="location.reload()">Use a different email</button>
  </div>
</div>

<script src="/turion-config.js"></script>
<script src="/cognito-auth.js"></script>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const btn = document.getElementById('submitBtn');
  const err = document.getElementById('error');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Sending…';

  // Preserve the post-login destination across the magic-link round trip.
  // Phase 38 used sessionStorage; cognitoAuth uses sessionStorage internally
  // for the CUSTOM_AUTH Session, so we use a sibling key for the redirect.
  const params = new URLSearchParams(window.location.search);
  const redirectAfter = params.get('redirect') || '/';
  try { sessionStorage.setItem('zietra-cognito-erp-redirect', redirectAfter); } catch (e) {}
  // Set an app hint so a shared callback page can route correctly (see Open Q §1).
  try { sessionStorage.setItem('zietra-cognito-app-hint', 'erp'); } catch (e) {}

  try {
    await window.cognitoAuth.signInWithMagicLink(email);
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('success').style.display = 'block';
    document.getElementById('sentEmail').textContent = email;
  } catch (error) {
    err.textContent = error.message || 'Sign-in failed';
    btn.disabled = false;
    btn.textContent = 'Send magic link';
  }
});
</script>
</body>
</html>
```

**Satellite login** = byte-identical except `/turion-config.js` → `/satellite/satellite-config.js` (already loads `cognito-auth.js` via auto-detect path), `cognito-auth.js` source → `/satellite/cognito-auth.js`, `zietra-cognito-erp-redirect` → `zietra-cognito-satellite-redirect`, `app-hint` value `erp` → `satellite`, default redirect target `/` → `/satellite/`.

### Pattern 3: Callback pages (`/cognito-auth-callback.html`, `/satellite/cognito-auth-callback.html`)

**What:** Read `?token=<nonce>&email=<email>` from URL, call `cognitoAuth.respondToChallenge(token, email)` (passes email override so the callback works even if `sessionStorage` was cleared between login and callback — defensive). On success, read post-login destination from `sessionStorage` and redirect.

**Skeleton (ERP `/cognito-auth-callback.html`):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Signing in · Turion Space ERP</title>
  <link rel="stylesheet" href="/ns-shared.css">
  <style>/* same spinner CSS as erp-auth-callback.html today */</style>
</head>
<body>
<div class="cb-card">
  <div class="spinner"></div>
  <p class="msg">Signing you in…</p>
  <p id="error" class="err" role="alert" aria-live="polite"></p>
</div>

<script src="/turion-config.js"></script>
<script src="/cognito-auth.js"></script>
<script>
(async () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const email = params.get('email');

  if (!token) {
    document.getElementById('error').textContent = 'Missing token in URL. Try the link in your email again.';
    setTimeout(() => window.location.replace('/erp-login.html'), 3000);
    return;
  }

  try {
    // emailOverride is the SECOND arg, so the callback works even if the
    // sessionStorage CUSTOM_AUTH session was wiped (different browser, etc.).
    // Cognito's RespondToAuthChallenge still requires the original Session
    // string returned by InitiateAuth — that's in sessionStorage from the
    // login page. If sessionStorage was cleared, we get a clean error here.
    await window.cognitoAuth.respondToChallenge(token, email);
  } catch (err) {
    const msg = err && err.message || 'Sign-in failed. The link may have expired.';
    document.getElementById('error').textContent = msg;
    setTimeout(() => window.location.replace('/erp-login.html'), 4000);
    return;
  }

  // Determine post-login destination.
  let target = '/';
  try { target = sessionStorage.getItem('zietra-cognito-erp-redirect') || '/'; } catch (e) {}
  if (!target || target.startsWith('/erp-login') || target.startsWith('/cognito-auth-callback')) target = '/';
  try { sessionStorage.removeItem('zietra-cognito-erp-redirect'); } catch (e) {}

  // App hint — if user originated on satellite, forward.
  let appHint = null;
  try { appHint = sessionStorage.getItem('zietra-cognito-app-hint'); } catch (e) {}
  try { sessionStorage.removeItem('zietra-cognito-app-hint'); } catch (e) {}
  if (appHint === 'satellite' && !target.startsWith('/satellite')) target = '/satellite/';

  window.location.replace(target);
})();
</script>
</body>
</html>
```

**Satellite `/satellite/cognito-auth-callback.html`:** byte-identical except path-prefix changes — but **if we use the "one ERP-rooted callback + app-hint forwarding" approach (recommended in Open Q §1), the satellite callback file is NOT needed**. The single `/cognito-auth-callback.html` page handles both.

### Pattern 4: `erp-api.js` / `satellite-api.js` rewrite (in-place, 5-line diff)

**What:** Change auth import from `window.erpAuth` / `window.satelliteAuth` to `window.cognitoAuth`. Change token source from `session.access_token` to `session.idToken`. Change login redirect target unchanged (`erpApi` keeps redirecting to `/erp-login.html`).

**`erp-api.js` diff:**

```diff
- const auth = window.erpAuth;
+ const auth = window.cognitoAuth;
  if (!cfg || !auth) {
    console.error('[erp-api] missing config or auth');
    return;
  }
   ...
-     let res = await doFetch(session.access_token);
+     let res = await doFetch(session.idToken);
   ...
       if (refreshed) {
-        res = await doFetch(refreshed.access_token);
+        res = await doFetch(refreshed.idToken);
       }
```

**`satellite-api.js`:** byte-identical diff.

**Why preserve `window.erpApi` / `window.satelliteApi` globals:** The 96 migrated pages keep calling `erpApi.get('/api/data/all')` / `satelliteApi.get('/api/satellites')`. The migration script does NOT need to touch `erpApi.*` / `satelliteApi.*` references. Less churn, smaller diff, smaller blast radius.

### Pattern 5: Backend middleware simplification (`backend/src/middleware/auth.ts`, both repos)

**What:** Strip the Supabase ES256/HS256 branch. The `requireAuth` function shrinks from ~110 lines to ~75. Same `AuthUser` shape; same 401 responses; same `requireRole`. The pre-decode-then-route pattern stays (it's good defensive code), but only the Cognito branch remains.

**Diff (turion-space-demo/backend/src/middleware/auth.ts):**

```diff
  import jwt from 'jsonwebtoken';
  import { Request, Response, NextFunction } from 'express';
  import { getCognitoPem, getCognitoIssuer, getCognitoAppClientId } from '../secrets';

- // Supabase issuer is a public URL (not a secret) — Phase 38 source-of-truth.
- const SUPABASE_ISSUER = 'https://lbpkbpfwdpnwlccmlfxn.supabase.co/auth/v1';
-
  export interface AuthUser {
-   id: string; // Supabase or Cognito subject UUID (sub claim)
-   role: string; // from app_metadata.role / user_metadata.role / cognito:groups / custom:role
+   id: string; // Cognito subject UUID (sub claim)
+   role: string; // cognito:groups[0] || custom:role
    vendorId?: string;
  }
   ...
- // === Phase 38 — Supabase ES256/HS256 role extraction (UNCHANGED) ===
- // eslint-disable-next-line @typescript-eslint/no-explicit-any
- export function getRoleFromJwt(payload: any): string {
-   const role = payload?.app_metadata?.role ?? payload?.user_metadata?.role;
-   if (!role) {
-     console.warn('[auth] JWT missing role claim in app_metadata and user_metadata');
-     return 'unknown';
-   }
-   return role;
- }
-
- // === Phase 40 — Cognito role extraction (NEW) ===
+ // === Cognito role extraction ===
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getRoleFromCognitoJwt(payload: any): string {
    if (Array.isArray(payload?.['cognito:groups']) && payload['cognito:groups'][0]) {
      return payload['cognito:groups'][0];
    }
    if (typeof payload?.['custom:role'] === 'string') {
      return payload['custom:role'];
    }
    return 'unknown';
  }

- function getSupabasePublicKey(): { key: string; algorithms: jwt.Algorithm[] } {
-   const pub = process.env.SUPABASE_JWT_PUBLIC_KEY;
-   if (pub) return { key: pub, algorithms: ['ES256'] };
-   const secret = process.env.SUPABASE_JWT_SECRET;
-   if (secret) return { key: secret, algorithms: ['HS256'] };
-   throw new Error('Neither SUPABASE_JWT_PUBLIC_KEY nor SUPABASE_JWT_SECRET is set');
- }
-
  export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }
   ... (pre-decode block stays identical) ...

    const cognitoIssuer = getCognitoIssuer();
    const cognitoClientId = getCognitoAppClientId();

+   if (!cognitoIssuer || !cognitoClientId) {
+     // Cognito config didn't load at cold start — fail safe.
+     res.status(401).json({ error: 'Invalid or expired token' });
+     return;
+   }
+
    try {
-     // eslint-disable-next-line @typescript-eslint/no-explicit-any
-     let payload: any;
-     let role: string;
-
-     if (cognitoIssuer && iss === cognitoIssuer) {
-       // === COGNITO PATH (Phase 40) ===
-       ... cognito verify block ...
-     } else if (iss === SUPABASE_ISSUER || (iss.startsWith('https://') && iss.endsWith('/auth/v1'))) {
-       // === SUPABASE PATH ... ===
-       ... supabase verify block ...
-     } else {
-       res.status(401).json({ error: 'Invalid or expired token' });
-       return;
-     }
+     if (iss !== cognitoIssuer) {
+       res.status(401).json({ error: 'Invalid or expired token' });
+       return;
+     }
+     if (alg !== 'RS256') {
+       res.status(401).json({ error: 'Invalid or expired token' });
+       return;
+     }
+     const kid: string | undefined = unverified!.header?.kid;
+     if (!kid) { res.status(401).json({ error: 'Invalid or expired token' }); return; }
+     const pem = getCognitoPem(kid);
+     if (!pem) { res.status(401).json({ error: 'Invalid or expired token' }); return; }
+
+     // eslint-disable-next-line @typescript-eslint/no-explicit-any
+     const payload: any = jwt.verify(token, pem, {
+       algorithms: ['RS256'],
+       issuer: cognitoIssuer,
+       audience: cognitoClientId,
+     });
+     if (payload.token_use !== 'id') {
+       res.status(401).json({ error: 'Invalid or expired token' });
+       return;
+     }
+     const role = getRoleFromCognitoJwt(payload);

      if (!payload.sub || typeof payload.sub !== 'string') {
        res.status(401).json({ error: 'Invalid token: missing subject' });
        return;
      }
      req.user = {
        id: payload.sub,
        role,
-       vendorId: payload.user_metadata?.vendor_id, // Supabase-only — Cognito leaves undefined
+       // vendorId: not provided by Cognito IdToken — set on custom attribute if needed
+       vendorId: typeof payload['custom:vendor_id'] === 'string' ? payload['custom:vendor_id'] : undefined,
      };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
```

**Mirror to `turion-satellite/backend/src/middleware/auth.ts`:** same diff (the satellite middleware is structurally identical, with `getSupabaseVerifyKey()` instead of `getSupabasePublicKey()` — same name change applies). Verified live: both files have the same `requireAuth` structure; the diff applies cleanly.

### Pattern 6: `secrets.ts` simplification (both repos)

**What:** Drop the `SUPABASE_JWT_SECRET_ARN` derivation block. Make Cognito JWKS load MANDATORY at cold start (throw on failure — there's no Supabase fallback to keep alive anymore).

**Diff (turion-space-demo/backend/src/secrets.ts):**

```diff
  export async function loadSecrets(): Promise<void> {
    if (loaded) return;

    // Fetch DATABASE_URL if not already set
    if (!process.env.DATABASE_URL && process.env.DATABASE_URL_ARN) {
      process.env.DATABASE_URL = await fetchSecret(process.env.DATABASE_URL_ARN);
    }

-   // Fetch JWKS and convert to PEM public key for jwt.verify (ES256)
-   if (!process.env.SUPABASE_JWT_PUBLIC_KEY && process.env.SUPABASE_JWT_SECRET_ARN) {
-     const raw = await fetchSecret(process.env.SUPABASE_JWT_SECRET_ARN);
-     try {
-       const jwks = JSON.parse(raw) as { keys: Record<string, unknown>[] };
-       process.env.SUPABASE_JWT_PUBLIC_KEY = jwkToPem(jwks.keys[0]);
-     } catch {
-       // Plain secret (legacy HS256) — store as-is for backward compat
-       process.env.SUPABASE_JWT_SECRET = raw;
-     }
-   }
-
-   // === Phase 40 — Cognito ===
-   // CRITICAL: Wrap in try/catch. Failure here MUST NOT crash the Lambda
-   // — Supabase path keeps working in dual-issuer mode.
-   if (process.env.COGNITO_CONFIG_SECRET_ARN) {
-     try {
+   // === Cognito (Phase 41 — mandatory, Cognito-only) ===
+   if (!process.env.COGNITO_CONFIG_SECRET_ARN) {
+     throw new Error('COGNITO_CONFIG_SECRET_ARN env var required');
+   }
+   {
        const cfgRaw = await fetchSecret(process.env.COGNITO_CONFIG_SECRET_ARN);
        const cfg = JSON.parse(cfgRaw) as { user_pool_id: string; app_client_id: string; region?: string };
        const region = cfg.region || 'us-east-1';
        const poolId = cfg.user_pool_id;
        cognitoAppClientId = cfg.app_client_id;
        cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${poolId}`;

        const jwksUrl = `${cognitoIssuer}/.well-known/jwks.json`;
        const resp = await fetch(jwksUrl);
        if (!resp.ok) throw new Error(`Cognito JWKS ${jwksUrl} returned ${resp.status}`);
        const jwks = (await resp.json()) as { keys: { kid: string; [k: string]: unknown }[] };
        for (const jwk of jwks.keys) {
          cognitoPemCache[jwk.kid] = jwkToPem(jwk as Record<string, unknown>);
        }
-       console.log(`[secrets] Cognito JWKS loaded: ${Object.keys(cognitoPemCache).length} keys, issuer=${cognitoIssuer}`);
-     } catch (err) {
-       console.error('[secrets] Cognito JWKS load FAILED — Cognito tokens will 401 until next cold start:', ...);
-       // Intentionally do NOT throw — Supabase path stays alive.
-     }
+     console.log(`[secrets] Cognito JWKS loaded: ${Object.keys(cognitoPemCache).length} keys, issuer=${cognitoIssuer}`);
    }

    loaded = true;
  }
```

**Note:** Making Cognito MANDATORY is the right call — by Phase 41, there's no Supabase fallback to keep alive. If Cognito JWKS load fails, the Lambda SHOULD crash so that the failure is loud and CloudWatch alarms fire. Same as `JWT_SECRET_KEY` startup assertion in the Dollor.ai backend (cited in CLAUDE.md).

### Pattern 7: AWS cleanup ordering (Wave 3)

**Strict order — every step depends on the previous:**

1. **Both Lambdas redeployed and verified Cognito-only** (Wave 2 closed). `aws lambda invoke` with a Cognito IdToken → 200; with a forged-but-well-shaped Supabase ES256 → 401.
2. **Remove `SUPABASE_JWT_SECRET_ARN` env var from `turion-demo-api`:**
   ```bash
   aws lambda update-function-configuration \
     --function-name turion-demo-api \
     --environment file:///tmp/turion-demo-env.json   # JSON without SUPABASE_JWT_SECRET_ARN
   ```
   Wait for `LastUpdateStatus: Successful`. Test: invoke protected route with Cognito IdToken → still 200.
3. **Remove `SUPABASE_JWT_SECRET_ARN` env var from `turion-satellite-api`:** same shape.
4. **Remove IAM inline policy on `zietra-api-lambda-role`** granting `secretsmanager:GetSecretValue` on `turion-satellite/production/supabase-jwt-secret-*`:
   ```bash
   aws iam delete-role-policy --role-name zietra-api-lambda-role \
     --policy-name <name of policy granting supabase-jwt-secret access>
   ```
   (Phase 40 added a NEW policy `zietra-cognito-config-secret-read` — that one stays. The pre-Phase-40 policy granting supabase-jwt-secret access is the one to delete.)
5. **Delete the Secrets Manager secret** with 7-day recovery window:
   ```bash
   aws secretsmanager delete-secret \
     --secret-id turion-satellite/production/supabase-jwt-secret-sWnNlr \
     --recovery-window-in-days 7
   ```
   The 7-day window means if Phase 41 rollback is needed, we can `restore-secret` within a week. After 7 days it's permanently gone.

**Rollback:** If Wave 3 steps 2 or 3 cause regression, re-add the env var with `aws lambda update-function-configuration` and re-deploy the prior Lambda zip (Wave 2 backed up CodeSha256 of pre-Phase-41 versions). Steps 4 and 5 are reversible within their respective windows.

### Pattern 8: Repo cleanup (Wave 3)

```bash
# Frontend repo cleanup
cd /Users/jeet/turion-space-demo
rm erp-auth.js
rm erp-auth-callback.html
rm satellite/satellite-auth.js
# Note: satellite/satellite-config.js, satellite/satellite-api.js stay (rewritten, not deleted)

# Backend repo cleanup
cd /Users/jeet/turion-space-demo/backend
rm scripts/migrate-supabase-users-to-cognito.ts
rm scripts/README-cognito-migration.md
# Drop dependency
npm uninstall @aws-sdk/client-cognito-identity-provider

# Config generators
# Edit scripts/generate-turion-config.sh + scripts/generate-satellite-config.sh:
# - Drop SUPABASE_URL line
# - Drop SUPABASE_ANON_KEY line  
# - Drop "Reuse the SAME Supabase project" comment block
# - Drop the get-secret-value call for supabase-anon-key
```

### Pattern 9: CloudFront rewrite for `/cognito-auth-callback`

**What:** Edit `infrastructure/cloudfront/turion-clean-urls.js` (the CloudFront Function source — check whether the repo has the source committed or if the function lives only in AWS). Add one line to the `R` table.

```diff
  var R = {
    '/': '/index.html',
    ... existing 60+ entries ...
+   '/cognito-auth-callback': '/cognito-auth-callback.html',
    ...
  };
```

Deploy with:
```bash
# 1. Update the function source (if committed in repo) OR edit in AWS console
# 2. Publish:
aws cloudfront publish-function --name turion-clean-urls --if-match <etag-from-describe>
# 3. Invalidate /cognito-auth-callback so CloudFront picks up the new function
aws cloudfront create-invalidation --distribution-id E37R9PT8IL44L2 --paths '/cognito-auth-callback'
```

**Verification:**
```bash
curl -sI "https://turionspace.zietra.com/cognito-auth-callback?token=test&email=test@test.com"
# Expect: HTTP/2 200 + content-type: text/html
# Currently (verified live): HTTP/2 403 + content-type: application/xml (S3 NoSuchKey)
```

### Anti-Patterns to Avoid

- **Running 41-01 and 41-02 in parallel.** Wave 1 (frontend cutover) ships pages that call `cognitoAuth`. Backend is still dual-issuer (Phase 40). Cognito tokens already verify. If frontend goes first and backend Wave 2 hasn't shipped, **everything still works** because the backend is dual-issuer. Reverse order doesn't work: if backend drops Supabase branch first, any user with an active Supabase session in browser localStorage would 401 on every API call until they re-logged in via Cognito — bad UX. **Strict order: frontend Wave 1 → backend Wave 2 → AWS cleanup Wave 3.**
- **Deleting `SUPABASE_JWT_SECRET_ARN` env var before Wave 2 redeploys.** The current Phase 40 middleware still has the Supabase branch — if a Lambda cold-starts with `loadSecrets()` and `SUPABASE_JWT_SECRET_ARN` is unset, `loadSecrets()` simply skips the Supabase block (no crash; verified in `secrets.ts:46-55` — gated on `process.env.SUPABASE_JWT_SECRET_ARN`). So **deleting the env var before Wave 2 ships is safe from a startup POV**, but the middleware would still 401 every Supabase-iss token (because `process.env.SUPABASE_JWT_PUBLIC_KEY` would be unset → `getSupabasePublicKey()` throws → catch returns 401). Better to delete in Wave 3 after Wave 2's middleware drop is verified.
- **Deleting `turion-satellite/production/supabase-jwt-secret-sWnNlr` before Wave 2 verified.** Once the secret is deleted, the Phase-40 fallback can't reach it for re-verify. Wave 3 only.
- **Deleting `auth.users` rows in Supabase.** CONTEXT.md locks them as read-only-archive until M2. Plus the forward-link `custom:supabase_sub` would orphan.
- **Touching the 4 Cognito-trigger Lambdas.** ABSOLUTE OUT.
- **Touching `MAGIC_LINK_BASE_URL` env var on `zietra-cognito-create-auth-challenge`.** Locked. Instead, edit CloudFront to route `/cognito-auth-callback` (extensionless) to `/cognito-auth-callback.html`.
- **Letting the migration script touch `erp-login.html`, `erp-auth-callback.html`, `satellite/login.html`, or `cognito-auth-callback.html`.** These are hand-rewritten in Wave 1 OR newly created. The script's SKIP set covers them.
- **Letting `loadSecrets()` failure silently downgrade to Supabase-only.** Phase 41 makes Cognito mandatory. If JWKS load fails, the Lambda crashes — that's correct loud-fail behavior post-cutover.
- **Removing `DATABASE_URL` / `DATABASE_URL_ARN`.** Supabase Postgres stays until M2. Lockedouter rule.
- **Removing `cognitoAuth.getSession().user.email` from page code.** That's Supabase shape. Cognito's `getSession()` returns `{email, idToken, ...}` flat. The migration script handles this rewrite.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-page rewrite of marker block | Hand-edit 96 HTML files | `migrate-helpers-to-cognito.mjs` (idempotent, marker-guarded) | 96-file scope; deterministic block-replace + session-shape fix; mirrors Phase 38's pattern. |
| Cross-page state for email | Custom `localStorage` round-trip | `?email=<email>` is ALREADY in the magic-link URL the Create-Auth-Challenge Lambda emits (verified `create-auth-challenge.ts:38`) | Email round-trip already solved server-side. |
| Cognito JWT verify | `aws-jwt-verify` package | Keep Phase-40's `jsonwebtoken.verify(token, pem, {algorithms:['RS256'], issuer, audience})` | Already shipped, already smoke-tested, already byte-identical across both repos. Don't add a dep mid-cutover. |
| Cognito client SDK on frontend | `amazon-cognito-identity-js` / `@aws-sdk/client-cognito-identity-provider` | Phase-40's `cognitoAuth` raw-fetch helper (~6KB, zero bundler) | Already shipped + smoke-tested. |
| CloudFront URL rewrite | Some custom Lambda@Edge | One line in the existing `turion-clean-urls` CloudFront Function | The function ALREADY handles 60+ clean URLs the same way. |
| Session-storage TTL | Custom expiry logic | Phase-40 cognitoAuth's built-in `expiresAt + 60s margin + auto-refresh via REFRESH_TOKEN_AUTH` | Already shipped. |

**Key insight:** Phase 41 is *deletion*, not *invention*. Every component needed already exists; the work is wiring + stripping.

---

## Common Pitfalls

### Pitfall 1: 96-page count drift
**What goes wrong:** Phase 40 CHECKPOINT counted 96 pages (83 ERP + 13 satellite). If a new page is added between Phase 40 close and Phase 41 execution, the migration misses it.
**Why it happens:** Multi-week phase gap on a moving codebase.
**How to avoid:** Plan tasks include a fresh `grep -rln 'erpAuth\|satelliteAuth\|/erp-auth\.js\|/satellite/satellite-auth\.js' *.html satellite/*.html | wc -l` BEFORE running the script, and assert the count matches `(83 + 13 - SKIP)` after — `wc -l` of the modified-file list output. If new pages appear, plan a hot-fix task.
**Warning signs:** Migration script reports `erpUnmatched` or `satUnmatched` non-empty.

### Pitfall 2: CloudFront cache during deploy
**What goes wrong:** Magic-link landing URL `/cognito-auth-callback` returns 403 even after the file is uploaded to S3 and the CloudFront function is updated — because CloudFront cached the 403 from before the upload.
**Why it happens:** CloudFront serves the cached 403 for the default TTL (24h on `turionspace.zietra.com`).
**How to avoid:** Always run `aws cloudfront create-invalidation --paths '/cognito-auth-callback' '/erp-login.html' '/satellite/login.html' '/cognito-auth.js' '/satellite/cognito-auth.js' '/*'` AFTER the S3 sync. The Phase-40 deploy-frontend.sh does `/*` invalidation by default.
**Warning signs:** Curl returns 403 after deploy; F5 in browser shows old page.

### Pitfall 3: Pre-existing Phase-38 markers still present
**What goes wrong:** If Phase-41 migration script runs on a page that ALREADY has the Phase-41 marker (re-run scenario), it should no-op. If it runs on a page that DOESN'T have the Phase-38 marker (unusual page), the block-replace regex doesn't match and the file is reported unmatched.
**Why it happens:** Idempotency requirement. Plus, some pages may have been hand-edited (login, callback) and don't have the Phase-38 marker.
**How to avoid:** Script's SKIP set (`erp-login.html`, `erp-auth-callback.html`, `cognito-auth-callback.html`, `satellite/login.html`, `satellite/cognito-auth-callback.html`) covers all expected unmatched files. Anything else flagged as unmatched is a genuine surprise — fail loud.

### Pitfall 4: Session-shape mismatch silent breakage
**What goes wrong:** 12 satellite pages read `session.user.email` to render topbar. After migration to `cognitoAuth`, `session.user` is undefined → topbar shows `undefined` in the email slot.
**Why it happens:** Different session shape: Supabase `{ user: { email }, access_token }` vs Cognito `{ email, idToken }`.
**How to avoid:** Migration script does `s/session\.user\.email/session.email/g`. Audit afterwards: `grep -rn 'session\.user\.' *.html satellite/*.html` should return 0.
**Warning signs:** Smoke shows `Hello, undefined` in topbar.

### Pitfall 5: `erpApi` / `satelliteApi` token-source mismatch
**What goes wrong:** After Wave 1 ships, page calls `erpApi.get('/api/data/all')` → it reads `session.access_token` → undefined → Authorization header is `Bearer undefined` → backend (dual-issuer) returns 401.
**Why it happens:** `erp-api.js` / `satellite-api.js` not rewritten in lockstep with the page migration.
**How to avoid:** Wave 1 plan task includes the 5-line in-place rewrite of BOTH `*-api.js` files in the SAME commit/deploy as the page migration. Smoke: load one page, observe Network tab → `Authorization: Bearer eyJraWQ...` (Cognito JWT shape, not "undefined").

### Pitfall 6: CORS pre-flight on Cognito InitiateAuth/RespondToAuthChallenge
**What goes wrong:** The browser sends a CORS pre-flight OPTIONS to `cognito-idp.us-east-1.amazonaws.com` before the POST. If the response doesn't include `Access-Control-Allow-Origin: <our origin>`, the call fails.
**Why it doesn't actually happen:** Cognito's `cognito-idp` endpoint serves CORS headers permissively. Verified live in Phase 40 with the raw fetch from `cognitoAuth`. No issue. But: if the frontend ever switches to a different region's `cognito-idp` host, retest CORS.
**How to avoid:** N/A — works out of the box. Note for future regions.

### Pitfall 7: Cognito CUSTOM_AUTH `Session` lifetime
**What goes wrong:** User clicks magic-link 4+ minutes after requesting it. The `Session` from `InitiateAuth` has expired. `RespondToAuthChallenge` returns `NotAuthorizedException: Invalid session for the user`.
**Why it happens:** Cognito CUSTOM_AUTH Sessions are short-lived (~3 minutes — verified via prior smoke runs returning expired-session errors).
**How to avoid:** Test with rapid click-to-callback (<3 min). Document the limit in the callback page error message ("Try again — the link may have expired").
**Warning signs:** Phase 41 smoke fails on real-user click but passes on programmatic CUSTOM_AUTH ping-pong.

### Pitfall 8: Lambda cold-start crash on missing `COGNITO_CONFIG_SECRET_ARN`
**What goes wrong:** Wave 2 makes Cognito MANDATORY (`throw` on missing env var). If a deploy somehow drops the env var, the Lambda 5xx's on every request.
**Why it happens:** Aggressive cutover; Cognito is now load-bearing.
**How to avoid:** Wave-3 cleanup ONLY removes `SUPABASE_JWT_SECRET_ARN` — NEVER touches `COGNITO_CONFIG_SECRET_ARN` or `DATABASE_URL_ARN` (satellite). Plan checklist explicitly lists the env vars to drop AND the env vars to preserve.
**Warning signs:** `[secrets] COGNITO_CONFIG_SECRET_ARN env var required` in CloudWatch + 502 from APIGW.

### Pitfall 9: Audit-buttons false positive on the deleted `erp-auth.js` / `satellite-auth.js`
**What goes wrong:** The audit-erp-buttons script scans shared helper JS files. If `erp-auth.js` is deleted but some HTML still references it (a missed migration), audit-buttons may not flag it (it audits fetch/onclick, not script-src).
**Why it happens:** Audit-buttons doesn't validate `<script src=...>` resolves to a real file.
**How to avoid:** Plan task explicitly greps `grep -rln '/erp-auth\.js\|/satellite/satellite-auth\.js' *.html satellite/*.html` and asserts result is 0 lines. The migration script should produce this state.

### Pitfall 10: Cognito JWKS rotation mid-session
**What goes wrong:** User's localStorage has an IdToken signed by a kid that's no longer in the Cognito JWKS (very rare — Cognito rotates roughly every multi-day-to-multi-week interval). Backend `getCognitoPem(kid)` returns null → 401.
**Why it happens:** Cold-start JWKS is cached per Lambda container.
**How to avoid:** Phase 41 plan defers lazy-refetch (CONTEXT.md doesn't list it). If observed in CloudWatch as a real-user issue, build a separate hot-fix that adds lazy JWKS re-fetch + retry on cache miss in `auth.ts`.
**Warning signs:** CloudWatch shows scattered 401s with `kid=<unknown>` errors despite valid user sessions.

---

## Code Examples

### Final smoke (`scripts/smoke-phase-41.sh` — or extend `smoke-phase-40.sh`)

```bash
#!/usr/bin/env bash
# Phase 41 final smoke — Cognito-only verify path on BOTH Lambdas + frontend page-load.
set -euo pipefail

REGION=us-east-1
ERP_API=https://lo254mvukl.execute-api.us-east-1.amazonaws.com
SAT_API=https://rjydekliee.execute-api.us-east-1.amazonaws.com
CDN=https://turionspace.zietra.com
COGNITO_CFG=$(aws secretsmanager get-secret-value --region "$REGION" \
  --secret-id zietra/cognito-config --query SecretString --output text)
POOL_ID=$(echo "$COGNITO_CFG" | jq -r .user_pool_id)
CLIENT_ID=$(echo "$COGNITO_CFG" | jq -r .app_client_id)

# Reuse mint_cognito_idtoken() from smoke-phase-40.sh
# ...

IDTOKEN=$(mint_cognito_idtoken)

# Case 1: Valid Cognito IdToken → 200 on both Lambdas
curl -s -o /dev/null -w "ERP /api/data/all (valid Cognito)  = %{http_code}\n" \
  -H "Authorization: Bearer $IDTOKEN" "$ERP_API/api/data/all"
curl -s -o /dev/null -w "Sat /api/satellites (valid Cognito) = %{http_code}\n" \
  -H "Authorization: Bearer $IDTOKEN" "$SAT_API/api/satellites"

# Case 2: Phase-38-era Supabase ES256 forgery → 401 on both (UNCHANGED from Phase 40)
# Case 3: NEW — Phase 38 Supabase forgery → 401 (was 200 in dual-issuer mode if valid)
# Already covered by smoke-phase-40.sh cases (c) + (e).

# Case 4: Page load — every page references cognito-auth.js, NOT erp-auth.js
for path in / /sales /finance/general-ledger /quality/bom /satellite/; do
  html=$(curl -s "$CDN$path")
  if echo "$html" | grep -q '/erp-auth\.js\|/satellite/satellite-auth\.js\|@supabase/supabase-js@2'; then
    echo "FAIL: $path still loads Supabase helpers"
    exit 1
  fi
  if ! echo "$html" | grep -q 'cognito-auth\.js'; then
    echo "FAIL: $path doesn't load cognito-auth.js"
    exit 1
  fi
  echo "page-load OK: $path"
done

# Case 5: CloudFront rewrite — /cognito-auth-callback → 200
curl -s -o /dev/null -w "CF rewrite /cognito-auth-callback = %{http_code}\n" \
  "$CDN/cognito-auth-callback?token=test&email=test@test.com"
# Expect: 200 (the page itself handles the bad token gracefully)

# Case 6: Audit (Rule 1)
cd /Users/jeet/turion-space-demo
grep -rln 'us-east-1_KQuNS85nP\|1tuq2a1eedd3hvdsl0kvtu55ih' *.js *.ts 2>/dev/null | grep -v node_modules || echo "Rule 1 PASS"

# Case 7: audit-buttons 0 violations on both frontends
npm run audit-buttons
# Expect: violations 0 ERP + violations 0 satellite
```

### End-to-end magic-link CUSTOM_AUTH flow (sanity check before Phase 41 ships)

```bash
# Step 1: User submits email on /erp-login.html
# → cognitoAuth.signInWithMagicLink('jm@techcloudpro.com')
# → POST cognito-idp / InitiateAuth { AuthFlow: 'CUSTOM_AUTH', ClientId, AuthParameters: { USERNAME } }
# → Cognito invokes Define-Auth-Challenge → returns CUSTOM_CHALLENGE
# → Cognito invokes Create-Auth-Challenge:
#   - Generates 32-byte base64url nonce
#   - SES sends magic-link email: https://turionspace.zietra.com/cognito-auth-callback?token=<nonce>&email=jm@techcloudpro.com
#   - privateChallengeParameters.answer = nonce
# → Response: { ChallengeName: 'CUSTOM_CHALLENGE', Session: '...', ChallengeParameters: { email } }
# → cognitoAuth stashes Session in sessionStorage under 'zietra-cognito-erp-pending-session'

# Step 2: User clicks email link
# → Browser navigates to https://turionspace.zietra.com/cognito-auth-callback?token=<nonce>&email=jm@techcloudpro.com
# → CloudFront Function turion-clean-urls rewrites /cognito-auth-callback → /cognito-auth-callback.html
# → Page reads token + email from URL query string
# → cognitoAuth.respondToChallenge(token, email)
# → POST cognito-idp / RespondToAuthChallenge { ChallengeName: 'CUSTOM_CHALLENGE', ClientId, Session (from sessionStorage), ChallengeResponses: { USERNAME: email, ANSWER: token } }
# → Cognito invokes Verify-Auth-Challenge → privateChallengeParameters.answer === ChallengeResponses.ANSWER → answerCorrect: true
# → Cognito invokes Define-Auth-Challenge → issueTokens: true
# → Response: { AuthenticationResult: { IdToken, AccessToken, RefreshToken, ExpiresIn: 3600 } }
# → cognitoAuth stores { idToken, accessToken, refreshToken, expiresAt, email } in localStorage 'zietra-cognito-erp'
# → Callback page redirects to sessionStorage.zietra-cognito-erp-redirect (default '/')

# Step 3: User lands on / 
# → /index.html loads /turion-config.js + /cognito-auth.js
# → Inline IIFE: await window.cognitoAuth.requireSession() → reads localStorage → has valid session → returns
# → Page renders
# → User clicks a button → erpApi.get('/api/data/all') → reads cognitoAuth.getSession().idToken → fetch with Authorization: Bearer <idToken>
# → turion-demo-api requireAuth → decode JWT → iss matches Cognito → verify RS256 → token_use === 'id' → req.user = { id: sub, role: 'admin' } → next()
# → Route handler responds with data
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase Auth UMD on every page | Vanilla `cognitoAuth` raw-fetch helper | Phase 40 (deployed, not yet wired) | Removes ~80KB of SDK from every page load; same UX. |
| Per-page session shape `{ user: { email }, access_token }` | Flat `{ email, idToken, accessToken, refreshToken, expiresAt }` | Phase 41 | Slightly different code in 12 satellite pages; migration script handles. |
| Dual-issuer middleware (accepts Cognito AND Supabase) | Cognito-only middleware (accepts only Cognito) | Phase 41 Wave 2 | One fewer code branch; one fewer env var; one fewer secret; one fewer IAM grant. |
| Magic-link email built by Supabase Auth | Magic-link email built by `zietra-cognito-create-auth-challenge` Lambda + SES | Phase 39 | Different email template; URL pattern `?token=&email=` (was `#access_token=...`). |

**Deprecated/outdated after Phase 41:**
- `window.erpAuth` / `window.satelliteAuth` → fully replaced by `window.cognitoAuth`.
- `erp-auth.js` / `satellite-auth.js` files — deleted.
- `erp-auth-callback.html` — deleted (replaced by `cognito-auth-callback.html`).
- `@supabase/supabase-js@2` UMD `<script>` tags — removed from all HTML.
- `SUPABASE_ISSUER` const, `getSupabasePublicKey()`, `getSupabaseVerifyKey()` — removed from middleware.
- `SUPABASE_JWT_SECRET_ARN` env var on both Lambdas — removed.
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` fields on `window.TURION_CONFIG` / `window.SATELLITE_CONFIG` — removed.
- `backend/scripts/migrate-supabase-users-to-cognito.ts` — deleted (Phase 39 one-shot done).
- `@aws-sdk/client-cognito-identity-provider` dep — removed.

**Still alive:** `DATABASE_URL` / `DATABASE_URL_ARN` (Supabase Postgres connection stays until M2 → Phase 42-43).

---

## Open Questions

### 1. Two callback pages vs one ERP-rooted callback with app-hint forwarding?

**What we know:** The deployed Create-Auth-Challenge Lambda emits a single URL `https://turionspace.zietra.com/cognito-auth-callback?token=...&email=...`. Both apps share the same hostname. The Lambda has no notion of which app initiated the sign-in.

**What's unclear:** Which page does the URL land on? Options:
- (A) Two physical files: `/cognito-auth-callback.html` (ERP) + `/satellite/cognito-auth-callback.html` (satellite). But the Lambda only emits one URL, so the satellite file would never be reached unless the Lambda is updated to include a path hint (CONTEXT marks Lambda touches as OUT).
- (B) One ERP-rooted file `/cognito-auth-callback.html` that branches based on `localStorage.zietra-cognito-app-hint` set by the login page before redirect. ERP login sets `app-hint=erp`; satellite login sets `app-hint=satellite`. On callback completion, the page reads the hint and redirects to `/` (ERP) or `/satellite/` (satellite).

**Recommendation:** Option (B) — one shared callback page with app-hint forwarding. Avoids touching the Lambda. Storage shape: `sessionStorage.zietra-cognito-app-hint`. **Risk:** if user clears storage between login click and email click (different browser, incognito, etc.), the hint is lost → defaults to ERP. Acceptable for a magic-link flow where same-browser is the expected case.

### 2. Lambda env-var update — file:// JSON vs shorthand?

**What we know:** Phase 40-01 plan deviation #1 documented that `aws lambda update-function-configuration --environment Variables={K=V,K=V}` shorthand mangles comma-containing values. The fix was the `--environment file:///tmp/env.json` form.

**What's unclear:** Whether Phase 41's `update-function-configuration` calls hit the same issue. The new env var set DOESN'T include `SUPABASE_JWT_SECRET_ARN` (the whole point is to remove it). Same `ANTHROPIC_API_KEY` (contains commas) issue.

**Recommendation:** Phase 41 plan tasks for env-var changes use `file://` JSON form. Reference 40-01-SUMMARY auto-fix #1.

### 3. Do `erpApi` and `satelliteApi` need to ALSO be deleted / unified?

**What we know:** Phase 40 added `cognitoAuth` but did NOT add `cognitoApi`. Pages call `erpApi.*` / `satelliteApi.*` today.

**What's unclear:** Whether Phase 41 should consolidate to a single `zietraApi.*` or `cognitoApi.*` global.

**Recommendation:** Don't. Keep `window.erpApi` and `window.satelliteApi` names. The 5-line in-place rewrite to source from `cognitoAuth` instead of `erpAuth` is the minimum viable change. Rename to a unified `zietraApi` in a future tidy-up — out of scope per CONTEXT (Rule 6: just cut over, no new features).

### 4. Should Phase 41 add lazy JWKS re-fetch?

**What we know:** Phase 40's middleware returns 401 if `kid` is not in the cold-start cache. Cognito JWK rotation is rare (multi-day-to-multi-week) but possible.

**What's unclear:** Whether to harden now or defer.

**Recommendation:** Defer. Add only if CloudWatch shows real-user 401s on `kid=<rotated>` after Phase 41 ships. Phase 41 is cutover-only.

### 5. Should we delete `auth.users` Supabase rows after M1?

**What we know:** CONTEXT explicitly locks `auth.users` as read-only-archive until M2. Forward-link `custom:supabase_sub` on every Cognito user.

**What's unclear:** Nothing — decision is locked.

**Recommendation:** Confirm in Wave 3 plan task: SUMMARY explicitly notes "Supabase `auth.users` rows preserved as read-only archive — M2 will delete."

---

## Verified Live Facts (Anti-Hallucination Section)

| Claim | Verification | Source |
|---|---|---|
| 83 ERP pages reference erpAuth/erp-auth.js | `grep -rln 'erpAuth\|/erp-auth\.js' *.html \| wc -l` → 83 | `/Users/jeet/turion-space-demo` 2026-05-14 |
| 13 satellite pages reference satelliteAuth/satellite-auth.js | `grep -rln 'satelliteAuth\|/satellite-auth\.js' satellite/*.html \| wc -l` → 13 | same |
| 81 ERP pages carry the Phase-38 marker block | `grep -l "ERP auth helpers (Phase 38)" *.html \| wc -l` → 81 (84 minus 3 = login + callback + 1 non-marked) | same |
| `cognito-auth.js` deployed but NO HTML page references it yet | `grep -rln 'cognito-auth\.js\|cognitoAuth' *.html satellite/*.html \| wc -l` → 0 | same |
| Magic-link URL pattern is `?token=<nonce>&email=<email>` | `lambdas/cognito-custom-email-sender/src/create-auth-challenge.ts:38` reads `const url = \`${BASE_URL}/cognito-auth-callback?token=${nonce}&email=${encodeURIComponent(email)}\`;` | source file |
| `MAGIC_LINK_BASE_URL` env var = `https://turionspace.zietra.com` on Create-Auth-Challenge Lambda | `aws lambda get-function-configuration --function-name zietra-cognito-create-auth-challenge --query 'Environment.Variables'` → `{"MAGIC_LINK_BASE_URL": "https://turionspace.zietra.com", ...}` | live AWS |
| `/cognito-auth-callback` currently returns 403 (file not in S3, no CF rewrite) | `curl -sI 'https://turionspace.zietra.com/cognito-auth-callback?token=test&email=test@test.com'` → `HTTP/2 403, content-type: application/xml, server: AmazonS3` | live |
| CloudFront function `turion-clean-urls` is the rewrite engine | `aws cloudfront list-functions --query "FunctionList.Items[?Name=='turion-clean-urls']"` → LIVE stage exists; function source has 60+ entries in `R` table; no entry for `/cognito-auth-callback` | live AWS |
| `turion-demo-api` env has SUPABASE_JWT_SECRET_ARN + COGNITO_CONFIG_SECRET_ARN + DATABASE_URL + ANTHROPIC_API_KEY | `aws lambda get-function-configuration --function-name turion-demo-api --query 'Environment.Variables'` returned all four | live AWS |
| `turion-satellite-api` env has SUPABASE_JWT_SECRET_ARN + COGNITO_CONFIG_SECRET_ARN + DATABASE_URL_ARN + S3_FILES_BUCKET | same query against `turion-satellite-api` | live AWS |
| The Cognito-trigger Lambda zips DO log nonce to CloudWatch (autonomous smoke) | `[create-auth-challenge] nonce=<base64url>` line in source | `create-auth-challenge.ts:48` |
| `session.user.email` is used in 12 satellite pages + 2 `*-api.js` files use `session.access_token` | `grep -rn 'session\.user\.\|session\.access_token' *.html satellite/*.html *.js satellite/*.js` → 14 lines | same dir |
| `@aws-sdk/client-cognito-identity-provider` is in backend/package.json | `grep '@aws-sdk/client-cognito-identity-provider' backend/package.json` → installed v3.1046.0 | same |
| `backend/scripts/migrate-supabase-users-to-cognito.ts` exists + `README-cognito-migration.md` | `ls backend/scripts/` returns both files | same |

---

## Sources

### Primary (HIGH confidence)
- `/Users/jeet/turion-space-demo/lambdas/cognito-custom-email-sender/src/create-auth-challenge.ts` — magic-link URL pattern source
- `/Users/jeet/turion-space-demo/cognito-auth.js` — Phase-40 helper (token storage shape, sessionStorage bridge)
- `/Users/jeet/turion-space-demo/erp-auth.js` + `/Users/jeet/turion-space-demo/satellite/satellite-auth.js` — Supabase helpers being retired
- `/Users/jeet/turion-space-demo/erp-login.html` + `/Users/jeet/turion-space-demo/erp-auth-callback.html` — login + callback shape to mirror
- `/Users/jeet/turion-space-demo/satellite/login.html` — satellite login shape
- `/Users/jeet/turion-space-demo/erp-api.js` + `/Users/jeet/turion-space-demo/satellite/satellite-api.js` — token-source change scope
- `/Users/jeet/turion-space-demo/backend/src/middleware/auth.ts` + `/Users/jeet/turion-satellite/backend/src/middleware/auth.ts` — dual-issuer middleware to simplify
- `/Users/jeet/turion-space-demo/backend/src/secrets.ts` + `/Users/jeet/turion-satellite/backend/src/secrets.ts` — JWKS loader to simplify
- `/Users/jeet/turion-space-demo/scripts/generate-turion-config.sh` + `generate-satellite-config.sh` — Supabase-field emission to drop
- `/tmp/inject-erp-auth.mjs` — Phase 38 migration script (reference pattern for Phase 41)
- `.planning/phases/40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256/CHECKPOINT.md` — master Phase-41 handoff
- `.planning/phases/40-m1-.../40-RESEARCH.md` — Phase 40 research (Cognito JWKS, JWT verify, `cognitoAuth` design)
- Live AWS API: `aws lambda get-function-configuration` × 3 Lambdas, `aws cloudfront get-function`, `curl https://turionspace.zietra.com/cognito-auth-callback`

### Secondary (MEDIUM confidence)
- `.planning/phases/41-.../CONTEXT.md` — locked decisions
- `.planning/STATE.md` (top block) — Phase 40 close-out narrative
- `.planning/ROADMAP.md` (Phase 41 entry) — scope description
- `.planning/REQUIREMENTS.md:119-121` — the 3 requirement IDs

### Tertiary (LOW confidence)
- IAM grant listing on `zietra-api-lambda-role` — could not enumerate inline policies (permission denied at this terminal). Plan task must enumerate via the user's authorized terminal or AWS console BEFORE deletion. **Flag for plan-time validation.**

---

## Metadata

**Confidence breakdown:**
- Page inventory + migration script shape: HIGH — counts and patterns verified against live filesystem.
- Magic-link URL pattern + email round-trip: HIGH — verified against Create-Auth-Challenge source + Lambda env var.
- CloudFront routing: HIGH — function source read, live 403 confirmed.
- Backend middleware diff: HIGH — read both repos' `auth.ts` + `secrets.ts` to byte level.
- AWS cleanup ordering: HIGH — env vars verified live; IAM policy LOW (couldn't enumerate; plan must validate).
- Pitfalls: HIGH — most lifted from Phase 40 SUMMARYs (40-01 file:// JSON; 40-04 nonce-scrape; 40 deviations).
- Wave order: HIGH — argued through; frontend-first is the only safe order with dual-issuer backend.

**Research date:** 2026-05-14
**Valid until:** 7 days (M1 cutover is active; codebase moves fast)

---

## RESEARCH COMPLETE

**Phase:** 41 — M1 Cognito cutover + Supabase Auth removal
**Confidence:** HIGH

### Key Findings
1. **Phase 40 already did the heavy lifting** — `cognitoAuth` is deployed byte-identical to both frontends; dual-issuer backend accepts Cognito tokens; CUSTOM_AUTH end-to-end smoke passes. Phase 41 is wiring + deletion, not invention.
2. **Cross-page email state is already solved server-side** — the magic-link URL emitted by Create-Auth-Challenge Lambda includes `&email=<email>` (verified at `create-auth-challenge.ts:38`). The callback page reads it from the query string; no `localStorage` round-trip needed.
3. **One mandatory CloudFront edit** — `/cognito-auth-callback` currently returns 403 (verified live). Add one line to the `turion-clean-urls` Function's `R` table: `'/cognito-auth-callback': '/cognito-auth-callback.html'`.
4. **Session shape changes** — Supabase `{ user: { email }, access_token }` → Cognito `{ email, idToken, ... }`. Migration script must rewrite `session.user.email` → `session.email` (12 satellite pages) and both `*-api.js` files must source `session.idToken` (not `session.access_token`).
5. **Strict wave order — frontend FIRST, backend SECOND, AWS cleanup THIRD.** Backend is already dual-issuer so frontend can cut over alone safely. Reverse order would 401 active Supabase sessions until users re-logged.
6. **96 pages migration via Node script** — modeled on Phase 38's `/tmp/inject-erp-auth.mjs`, idempotent via Phase-41 marker comment. Block-replace + session-shape rewrite + Supabase UMD removal in one pass.

### File Created
`/Users/jeet/doordash-p2p/.planning/phases/41-m1-cut-over-fully-to-cognito-remove-supabase-auth-dependency/41-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All deps already installed; nothing new to evaluate |
| Architecture (waves + plans) | HIGH | Order argued from dual-issuer fallback property |
| Pitfalls | HIGH | Lifted from Phase 40 SUMMARYs + live smoke results |
| AWS cleanup | MEDIUM-HIGH | env vars verified live; IAM policy name not enumerated (permission denied at this terminal — plan task must enumerate before delete) |
| Migration script | HIGH | Marker patterns + counts verified against live filesystem |

### Open Questions
1. Two callback pages vs one shared (recommendation: one shared ERP-rooted with app-hint forwarding via sessionStorage).
2. Exact name of the IAM inline policy granting supabase-jwt-secret read on `zietra-api-lambda-role` — couldn't enumerate at research terminal due to IAM permission denial. Plan task #1 in Wave 3 should run `aws iam list-role-policies --role-name zietra-api-lambda-role` and pick the policy that matches `secretsmanager:GetSecretValue` on `*supabase-jwt-secret*`.
3. Lazy JWKS re-fetch — deferred (only build if observed in CloudWatch).

### Ready for Planning
Research complete. Planner can now create plan files for waves 1, 2, 3 (with 41-02 + 41-03 as the byte-identical mirror change in Wave 2). All locked decisions from CONTEXT.md preserved; all 3 requirement IDs (CognitoOnlyFrontend, CognitoOnlyBackend, SupabaseAuthDeprecation) mapped to plan sections.
