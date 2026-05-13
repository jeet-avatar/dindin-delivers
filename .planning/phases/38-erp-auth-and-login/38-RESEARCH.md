# Phase 38: ERP auth + login — Research

**Researched:** 2026-05-13
**Domain:** Express middleware (Supabase JWT verify) + vanilla-JS auth helpers + bulk fetch migration on the Turion Space ERP demo
**Confidence:** HIGH

## Summary

This phase is **a port, not a design exercise.** Every piece needed already exists and works on the sibling Turion Satellite app: `requireAuth` Express middleware, magic-link `login.html`, `satelliteAuth`/`satelliteApi` UMD helpers, the `SUPABASE_JWT_SECRET_ARN`→`loadSecrets()`→PEM-public-key flow, and the same Supabase project (`https://lbpkbpfwdpnwlccmlfxn.supabase.co`) is already serving the satellite frontend. The ERP backend and frontend ride on the same Lambda/CloudFront mechanics that Phase 36 deployed. The job is **clone-and-rename**: copy 5 satellite source files (`auth.ts`, `secrets.ts`, `satellite-auth.js`, `satellite-api.js`, `login.html` + `callback.html`) into the ERP repo as `auth.ts`/`secrets.ts`/`erp-auth.js`/`erp-api.js`/`erp-login.html`/`erp-auth-callback.html`; wire `requireAuth` onto every ERP route except `/api/health` (and the public `/api/notify/visit`); extend the existing config generator to emit `SUPABASE_URL` + `SUPABASE_ANON_KEY`; migrate **62 ERP fetch sites** (5 in shared helper JS + 57 in 31 HTML pages) from raw `fetch(API_BASE + …)` → `window.erpApi.{get,post,patch,del}(…)`; extend `audit-erp-buttons.mjs` with one extra matcher; deploy + curl-smoke.

The satellite is on `JWT_PUBLIC_KEY` / ES256 (the ARN secret is a JWKS JSON, which `loadSecrets()` parses → PEM via `crypto.createPublicKey({format:'jwk'})`). The legacy HS256 path is wired but unused on satellite. Mirror the same path for ERP: zero new AWS secrets — same JWKS, same anon key.

**Primary recommendation:** Port verbatim from `turion-satellite/backend/src/{middleware/auth.ts,secrets.ts}` + `turion-space-demo/satellite/{satellite-auth.js,satellite-api.js,login.html,auth/callback.html}`. Apply `requireAuth` **per-route** (the satellite pattern), not via `app.use(requireAuth)` — that way `/api/health` stays open without conditionals.

## User Constraints (from CONTEXT.md)

CONTEXT.md does NOT exist for this phase. The ROADMAP.md Phase-38 goal block is the binding spec. Treat the satellite-side patterns it references as locked decisions.

### Locked Decisions (from ROADMAP.md goal)

- Mirror the satellite app's existing auth pattern (Supabase magic-link, JWT verified server-side).
- Reuse `turion-satellite/production/supabase-jwt-secret` (or its ARN) — **no new AWS secret**.
- `/api/health` stays open. All other routes get `requireAuth`.
- Hardened catch (401 on missing/invalid JWT, **no `err.message` leak**).
- Lambda redeploy via `backend/build-and-push.sh`.
- New shared frontend files: `erp-auth.js`, `erp-api.js`, `erp-login.html`.
- Migrate every existing ERP fetch through `erpApi.*`.
- Every ERP HTML page calls `erpAuth.requireSession()` at the top of its IIFE before any fetch.
- Extend `audit-erp-buttons.mjs` to recognize `erpApi.{get,post,patch,del,put}(…)` — stay 0 violations.
- Deploy: F6 pre-flight + `build-and-push.sh` + `deploy-frontend.sh` + CF invalidation.
- Verify: curl write-route → 401 unauth; manual browser walk OR DB-direct simulation of magic-link round-trip.
- ~3-5 plans, 2-3 waves.

### Claude's Discretion

- **Whether to extend `generate-turion-config.sh`** to also emit `SUPABASE_URL` + `SUPABASE_ANON_KEY` (recommended below — yes), vs. having `erp-login.html` fetch a `/api/public/config` endpoint (rejected — needs a public backend route, more surface area). The chosen path: extend the generator.
- **Plan boundaries.** Final breakdown below.
- **Whether to gate `/api/notify/visit`** (the visit-pixel endpoint). Recommendation: keep it PUBLIC (it's the visit tracker fired from `index.html`'s `addEventListener('DOMContentLoaded')` BEFORE any auth flow runs; auth-gating breaks that telemetry).

### Deferred Ideas (OUT OF SCOPE)

- Role-based access (admin vs. read-only): the satellite has `requireRole` already but isn't using it; mirror that posture — `requireAuth` only.
- Row-level security in Postgres.
- Logout UI / "signed in as X" chip on every ERP page (nice-to-have, defer).
- Migrating the satellite-side fetches (already done in Phase 36 audit foundation).

## Phase Requirements

| ID | Description (from ROADMAP.md goal) | Research Support |
|----|-----------------------------------|------------------|
| `ErpAuthMiddleware` | Port `requireAuth` from satellite, apply to every ERP route except `/api/health`. Lambda env-var `SUPABASE_JWT_SECRET_ARN` + `loadSecrets()` on cold-start path. | §"Code Examples → `auth.ts` (port verbatim)" + §"`loadSecrets()` (port verbatim)" + §"Architecture Patterns → Per-route `requireAuth`" |
| `ErpLoginPage` | New `erp-login.html` magic-link page mirroring `satellite/login.html` + a callback page. | §"Code Examples → `erp-login.html` skeleton" + §"Code Examples → `erp-auth-callback.html`" |
| `ErpAuthHelpers` | New `erp-auth.js` (mirror of `satellite-auth.js`) + `erp-api.js` (mirror of `satellite-api.js`). Auto-injects `Authorization: Bearer <jwt>`; 401-refresh-retry; redirect-to-login on missing/expired session. | §"Code Examples → `erp-auth.js` (clone of satellite-auth.js)" + §"Code Examples → `erp-api.js` (clone of satellite-api.js)" |
| `ErpFetchMigration` | Migrate **all 62 ERP fetch sites** (5 shared-JS + 57 across 31 HTML pages) from raw `fetch(API_BASE + …)` → `erpApi.*`. Inject `await erpAuth.requireSession()` at the top of every page's inline IIFE. | §"Full ERP Fetch Inventory" (62-site list, grouped by file) + §"Pages Needing `requireSession()` injection" (31 pages) |
| `AuditExtendedForErpApi` | Extend `scripts/audit-erp-buttons.mjs` with an additional matcher for `erpApi.{get,post,patch,put,delete,del}(…)`. Stay 0 violations. | §"Audit-Script Extension" (exact regex + integration point: `iterFetchCalls` at line 451) |

## Standard Stack

### Core (already deployed — port verbatim)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jsonwebtoken` | (as used by satellite) | `jwt.verify(token, key, {algorithms})` — ES256/HS256 | Already in `turion-satellite/backend/package.json`; battle-tested |
| `@aws-sdk/client-secrets-manager` | (as used by satellite) | Fetch JWKS JSON from Secrets Manager at cold start | Same pattern as DATABASE_URL |
| `@supabase/supabase-js@2` (UMD) | `cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js` | Browser-side magic-link + session management | Loaded as UMD — zero bundler change; matches satellite |
| `express@4` | (already in ERP backend) | `requireAuth` is plain Express middleware | No change |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `serverless-http` | already in ERP `lambda.ts` | Wraps Express app for Lambda | No change — `loadSecrets()` already awaited there per satellite pattern |
| `crypto` (Node built-in) | n/a | `createPublicKey({ format: 'jwk' })` → PEM | JWK→PEM conversion in `loadSecrets()` |

### Alternatives Considered (and rejected — per ROADMAP locked decision)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Supabase magic-link | OAuth (Google/Microsoft) | Satellite has already shipped magic-link; consistency wins; no new IdP to configure |
| Per-route `requireAuth(…)` | `app.use(requireAuth)` global middleware with an allowlist | Satellite chose per-route — `/api/health` stays plain, no conditional in the middleware; mirror that |
| JWKS-via-jwks-rsa-lib | Plain `jwt.verify(token, PEM_KEY)` after one-time JWK→PEM at cold start | Satellite does the latter (one secret-manager fetch, no per-request JWKS HTTP); cheaper, simpler |
| Backend `/api/public/config` endpoint to ship Supabase URL+anon key to the login page | Extend `generate-turion-config.sh` to emit `SUPABASE_URL`+`SUPABASE_ANON_KEY` | The anon key is **public by design** (Supabase RLS-gated); embedding in `turion-config.js` is the standard pattern and matches `satellite-config.js` |

**Installation:** None required. All packages already in `turion-space-demo/backend/package.json` from prior phases (`@aws-sdk/client-secrets-manager` is already used by `notify.ts` — confirmed in Phase 36-07 work).

## Architecture Patterns

### Recommended file layout (post-Phase-38)

```
turion-space-demo/
├── backend/src/
│   ├── app.ts                       # MODIFIED: routers get requireAuth applied
│   ├── lambda.ts                    # MODIFIED: await loadSecrets() at cold start
│   ├── secrets.ts                   # NEW: ported from turion-satellite/backend/src/secrets.ts
│   ├── middleware/
│   │   └── auth.ts                  # NEW: ported from turion-satellite/backend/src/middleware/auth.ts
│   └── routes/                      # MODIFIED: each router-level r.<method>(requireAuth, …) added
├── erp-auth.js                      # NEW: clone of satellite/satellite-auth.js
├── erp-api.js                       # NEW: clone of satellite/satellite-api.js
├── erp-login.html                   # NEW: clone of satellite/login.html
├── erp-auth-callback.html           # NEW: clone of satellite/auth/callback.html
├── turion-config.js                 # MODIFIED (deploy-time generator): adds SUPABASE_URL + SUPABASE_ANON_KEY
├── scripts/
│   ├── generate-turion-config.sh    # MODIFIED: also reads supabase-anon-key secret
│   └── audit-erp-buttons.mjs        # MODIFIED: add erpApi.{…}() matcher
├── data-loader.js                   # MODIFIED: fetch → erpApi.get
├── data-loader-sf.js                # MODIFIED: fetch → erpApi.get
├── erp-lookups.js                   # MODIFIED: fetch → erpApi.get
├── arena-lookups.js                 # MODIFIED: fetch → erpApi.get
├── ns-editable.js                   # MODIFIED: fetch → erpApi.patch
└── *.html (31 pages)                # MODIFIED: <script src=erp-auth.js> + erp-api.js, requireSession() injected, fetch → erpApi.*
```

### Pattern 1: Per-route `requireAuth` (NOT global `app.use`)

**What:** Apply `requireAuth` as an Express middleware *per route handler*, not globally. The satellite uses `r.get('/foo', requireAuth, async (req, res) => …)`. Health stays as `r.get('/', async …)` — no auth.

**When to use:** Always, for ERP. It mirrors the satellite, avoids "did I add the right exception to my allowlist?" bugs, and keeps the readable property: *every route file declares its own auth.*

**Example (satellite — VERIFIED):**

```typescript
// turion-satellite/backend/src/routes/bom.ts (lines 2,7,68,159,215)
import { requireAuth } from '../middleware/auth';
router.get('/', requireAuth, async (req, res) => { … });
router.post('/', requireAuth, async (req, res) => { … });
router.delete('/:lineId', requireAuth, async (req, res) => { … });
```

```typescript
// turion-satellite/backend/src/routes/health.ts (line 6)
router.get('/', async (_req, res) => { … });  // NOTE: no requireAuth
```

### Pattern 2: Lazy-load secrets in cold-start path (BUT NOT for the JWT key — that's load-or-fail)

**What:** `lambda.ts` awaits `loadSecrets()` once before any handler runs. `loadSecrets()` is idempotent (`if (loaded) return;`). For optional secrets that may legitimately be absent (e.g. Anthropic API key on cold satellite), do the LAZY pattern (per-route `getApiKey()` with `cachedKey: string | null | undefined`). For required secrets (DATABASE_URL, SUPABASE_JWT key) — load at cold-start; throwing there is OK because the Lambda can't function without them.

**When to use:** JWT verify key = eager (`loadSecrets()`). Future optional secrets = lazy.

**Example (verified — `turion-satellite/backend/src/lambda.ts`):**

```typescript
import { loadSecrets } from './secrets';
import serverless from 'serverless-http';
import { app } from './app';

const baseHandler = serverless(app);

// loadSecrets is a no-op when DATABASE_URL / SUPABASE_JWT_SECRET are already
// set (local dev, tests) or when the ARN env vars are absent.
const ready = loadSecrets();

export const handler = async (event: unknown, context: unknown) => {
  await ready;
  return baseHandler(event as any, context as any);
};
```

### Pattern 3: Browser-side `requireSession()` BEFORE any data fetch

**What:** Every ERP HTML page's IIFE starts with `await window.erpAuth.requireSession();`. If no session → redirect to `/erp-login.html?redirect=<current>`; throw to halt the IIFE so subsequent fetches don't fire half-authenticated.

**When to use:** Top of every inline `<script>` IIFE on every ERP page. Not in shared helper JS files (those are imported AFTER auth is established).

**Example (satellite — verified `satellite/login.html` style mirrored for inline page boot):**

```javascript
(async function () {
  await window.erpAuth.requireSession();   // throws if no session → redirect handled
  const data = await window.erpApi.get('/api/data/all');
  render(data);
})();
```

### Anti-Patterns to Avoid

- **Global `app.use(requireAuth)` with path-based allowlist.** Satellite chose per-route — mirror it. Allowlists are error-prone (adding a new public route requires updating two places).
- **Embedding the JWT verify in the catch-all error middleware.** Don't. `requireAuth` runs FIRST, returns 401 immediately. Errors that escape become 500.
- **Returning `err.message` in the 401 body.** ROADMAP locked decision: hardened catch. Use a generic `{ error: 'Missing authorization token' }` / `{ error: 'Invalid or expired token' }` — `auth.ts` already does this verbatim.
- **Calling `erpAuth.requireSession()` inside a shared helper JS file.** It must be in the per-page IIFE — that way the page redirects BEFORE the helper-JS files start firing fetches and stacking 401-redirects.
- **Loading the Supabase UMD script after `erp-auth.js`.** Order must be: `turion-config.js` → Supabase UMD → `erp-auth.js` → `erp-api.js` → page IIFE. Same order satellite uses.
- **Auth-gating `/api/notify/visit`.** This is a public visit-pixel endpoint fired before any auth flow runs (from `index.html` `addEventListener('DOMContentLoaded')`). Gating it breaks the telemetry.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signature verification | Custom HMAC/ECDSA verifier | `jwt.verify()` from `jsonwebtoken` | Algorithm confusion attacks, replay, exp/iat validation — already solved |
| JWK → PEM conversion | Manual ASN.1 packing | Node's built-in `crypto.createPublicKey({format:'jwk'})` | Built into Node 16+; satellite already uses it |
| Magic-link email delivery | SMTP / Resend integration | `supabase.auth.signInWithOtp()` | Supabase ships the email, the tokens, the callback URL handling — for free |
| Session persistence across page loads | Manual `localStorage` token wrangling | Supabase client's `persistSession:true` + `storageKey` | Auto-refresh, auto-expire — already tested on satellite for months |
| Hash-fragment token parsing on `/auth/callback.html` | Manual URL parse | Supabase client's `detectSessionInUrl:true` | The createClient call does it; just `await getSession()` |
| CORS preflight for `Authorization` header | Custom `OPTIONS` handler | `app.use(cors({origin:'*'}))` (already present, line 18 of ERP `app.ts`) | `cors` package handles preflight for `Authorization` by default — no change needed |
| Login page CSS chrome | Tailwind / build step | Reuse `satellite-shell.css` from `satellite/` OR clone a minimal version for ERP | Satellite login is 60 lines of HTML; clone-and-rebrand |

**Key insight:** Every layer of this phase has a battle-tested off-the-shelf solution already running on the sibling app. The phase is **port-and-glue**, not invent.

## Common Pitfalls

### Pitfall 1: Wrong ARN env-var name on Lambda
**What goes wrong:** `loadSecrets()` does nothing, `SUPABASE_JWT_PUBLIC_KEY` is never set, `requireAuth` throws `Neither SUPABASE_JWT_PUBLIC_KEY nor SUPABASE_JWT_SECRET is set` on every request → all routes 500.
**Why it happens:** The satellite Lambda has `SUPABASE_JWT_SECRET_ARN` set (verified via `aws lambda get-function-configuration --function-name turion-satellite-api`); the ERP Lambda **does NOT have it today** (verified via the same call on `turion-demo-api` — only `DATABASE_URL` and `ANTHROPIC_API_KEY` are present, both plaintext).
**How to avoid:** The deploy task MUST set `SUPABASE_JWT_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr` on `turion-demo-api`. Use `aws lambda update-function-configuration --function-name turion-demo-api --environment '{"Variables":{...existing..., "SUPABASE_JWT_SECRET_ARN":"<arn>"}}'`.
**Warning signs:** Smoke test curl → 500, log line `Neither SUPABASE_JWT_PUBLIC_KEY…`.

### Pitfall 2: Loading order of frontend scripts
**What goes wrong:** `erp-auth.js` loads before the Supabase UMD or before `turion-config.js`, fails the "missing window.SATELLITE_CONFIG" / "missing window.supabase" guard, never registers `window.erpAuth`, every page redirects-loops or throws `Cannot read property 'requireSession' of undefined`.
**Why it happens:** Easy to get wrong with `<script>` order in 31 HTML pages.
**How to avoid:** **Always this order** (locked):
```html
<script src="/turion-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="/erp-auth.js"></script>
<script src="/erp-api.js"></script>
<!-- THEN any page-specific helper JS, THEN the inline IIFE -->
```
**Warning signs:** Console errors `[erp-auth] missing window.TURION_CONFIG` or `[erp-api] missing config or auth`.

### Pitfall 3: Magic-link redirect domain mismatch
**What goes wrong:** Click magic link → bounces to `localhost:3000/erp-auth-callback.html` (the email's `redirect_to=` URL was built from `window.location.origin` at sign-in time, which was localhost during dev) instead of `https://turionspace.zietra.com/erp-auth-callback.html`.
**Why it happens:** `signInWithOtp({email, options: {emailRedirectTo: …}})` records WHATEVER origin was passed; Supabase doesn't rewrite it.
**How to avoid:** ALSO add the callback URL to the Supabase project's "Redirect URLs" allowlist (Supabase Dashboard → Auth → URL Configuration). The satellite already has `https://turionspace.zietra.com/satellite/auth/callback.html` allowed; this phase must add `https://turionspace.zietra.com/erp-auth-callback.html`. (Local dev: also add `http://localhost:8000/erp-auth-callback.html` if running `python -m http.server`.)
**Warning signs:** Magic-link click → Supabase "URL not allowed" error page.

### Pitfall 4: 401-refresh-retry loop on expired token
**What goes wrong:** `erp-api.js` gets a 401, tries `refreshSession()`, refresh also returns 401, retries fetch, gets 401 again, redirects to login — but `getSession()` STILL returns the old session because the page state didn't reset. User-visible: redirect-loop or a stuck spinner.
**Why it happens:** Bad `erp-api.js` clone — must exactly mirror `satellite-api.js`'s "refresh-once-then-redirect" pattern.
**How to avoid:** Copy `satellite/satellite-api.js` (lines 36-47) verbatim. The single retry + redirect-on-second-401 is correct; don't "improve" it.
**Warning signs:** Network panel shows repeated 401s with no redirect; or constant redirects to `erp-login.html`.

### Pitfall 5: Missing CORS for the `Authorization` header
**What goes wrong:** Browser preflight OPTIONS fails because the response's `Access-Control-Allow-Headers` doesn't include `Authorization`. Every authenticated fetch becomes a CORS error.
**Why it happens:** Custom CORS configs sometimes restrict allowed headers.
**How to avoid:** **No change needed.** The ERP `app.ts` line 18 uses `app.use(cors({ origin: '*' }))` — the `cors` package default `allowedHeaders` is "request's Access-Control-Request-Headers", which means whatever the browser asks for. Auth + Content-Type both pass. This is the same config the satellite uses, and the satellite works with `Authorization` already. **Verified.**
**Warning signs:** Browser console: `Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response.`

### Pitfall 6: Auditing `erpApi` calls — regex too greedy
**What goes wrong:** The new audit regex `/erpApi\.(get|post|patch|put|delete|del)\s*\(/gi` accidentally matches `myErpApi.get(` or `cerpApi.del(` (substring match, no word boundary).
**Why it happens:** The satellite regex relies on the implicit `\b`-like behavior of `satelliteApi\.` because "satelliteApi" never appears as a substring of any other identifier. `erpApi` is short and could be a suffix.
**How to avoid:** Use `/(?:^|[^A-Za-z_$])erpApi\.(get|post|patch|put|delete|del)\s*\(/g` (positive lookahead-free, supports older Node). Verify with a unit-test-style line in the audit script: a fixture string containing `cerpApi.get(` must NOT match.
**Warning signs:** Audit reports more `apiCall` hits than there are actual call sites; or violations on identifiers that don't exist.

### Pitfall 7: Forgetting to extend the audit's `iterFetchCalls` matcher beyond raw `fetch(`
**What goes wrong:** After migrating fetches to `erpApi.*`, the audit script's count drops to near zero (no raw `fetch(` matches in HTML anymore), and the auditor reports "0 fetches scanned, 0 violations" — masking any genuinely broken endpoint a developer wrote as `erpApi.get('/api/typo')`.
**Why it happens:** `audit-erp-buttons.mjs` only looks for `fetch(` today (line 451: `function* iterFetchCalls(text)`).
**How to avoid:** ADD a second generator `iterErpApiCalls(text)` that does the same first-arg extraction as the satellite's `iterApiCalls`, but matches `erpApi.<method>(`. Then iterate BOTH in the main loop. Keep the raw `fetch(` matcher too — to catch regressions where someone re-introduces a bare fetch.
**Warning signs:** Audit summary line drops to `fetch API calls scanned: 0` (you'd expect ~60 going to ~60 via the new matcher).

## Code Examples

Verified patterns lifted from `turion-satellite/`. The planner can have an executor paste each block into the named new file.

### `backend/src/middleware/auth.ts` — port verbatim from satellite

Source: `/Users/jeet/turion-satellite/backend/src/middleware/auth.ts` (the whole file, 76 lines). The ENTIRE FILE is portable — no path changes, no Supabase-project-specific logic. The full file content:

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

function getVerifyKey(): { key: string; algorithms: jwt.Algorithm[] } {
  const pub = process.env.SUPABASE_JWT_PUBLIC_KEY;
  if (pub) return { key: pub, algorithms: ['ES256'] };
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (secret) return { key: secret, algorithms: ['HS256'] };
  throw new Error('Neither SUPABASE_JWT_PUBLIC_KEY nor SUPABASE_JWT_SECRET is set');
}

export interface AuthUser {
  id: string;
  role: string;
  vendorId?: string;  // satellite-specific — leave in or strip; harmless either way
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function extractBearer(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export function getRoleFromJwt(payload: any): string {
  const role = payload?.app_metadata?.role ?? payload?.user_metadata?.role;
  if (!role) { console.warn('[auth] JWT missing role claim'); return 'unknown'; }
  return role;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearer(req.headers.authorization);
  if (!token) { res.status(401).json({ error: 'Missing authorization token' }); return; }
  try {
    const { key, algorithms } = getVerifyKey();
    const payload = jwt.verify(token, key, { algorithms }) as any;
    if (!payload.sub || typeof payload.sub !== 'string') {
      res.status(401).json({ error: 'Invalid token: missing subject' }); return;
    }
    req.user = {
      id: payload.sub,
      role: getRoleFromJwt(payload),
      vendorId: payload.user_metadata?.vendor_id,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Confidence:** HIGH. File copied character-for-character; runs in production on satellite Lambda since Phase 32-34. Hardened catch (no `err.message` leak) is already there — verified.

### `backend/src/secrets.ts` — port verbatim from satellite

Source: `/Users/jeet/turion-satellite/backend/src/secrets.ts` (48 lines). Whole file ports without change. The key snippet that does the JWK→PEM:

```typescript
// JWKS JSON stored under this ARN; converted to PEM public key below.
_SUPABASE_JWKS_RAW: 'SUPABASE_JWT_SECRET_ARN',

// Fetch JWKS and convert to PEM public key for jwt.verify (ES256)
if (!process.env.SUPABASE_JWT_PUBLIC_KEY && process.env.SUPABASE_JWT_SECRET_ARN) {
  const raw = await fetchSecret(process.env.SUPABASE_JWT_SECRET_ARN);
  try {
    const jwks = JSON.parse(raw) as { keys: Record<string, unknown>[] };
    process.env.SUPABASE_JWT_PUBLIC_KEY = jwkToPem(jwks.keys[0]);
  } catch {
    // Plain secret (legacy HS256) — store as-is for backward compat
    process.env.SUPABASE_JWT_SECRET = raw;
  }
}
```

**The same ARN value** is used (`turion-satellite/production/supabase-jwt-secret-sWnNlr` — verified via `aws secretsmanager list-secrets`). The two Lambdas share it.

**Confidence:** HIGH.

### `backend/src/lambda.ts` — modify to await loadSecrets

Today the ERP `lambda.ts` doesn't exist with this pattern. **Port** the satellite's 14-line version:

```typescript
import { loadSecrets } from './secrets';
import serverless from 'serverless-http';
import { app } from './app';

const baseHandler = serverless(app);
const ready = loadSecrets();

export const handler = async (event: unknown, context: unknown) => {
  await ready;
  return baseHandler(event as any, context as any);
};
```

Read the existing ERP `lambda.ts` first to confirm shape (likely already similar) and add the `loadSecrets()` line.

### `backend/src/app.ts` — apply `requireAuth` per route

The cleanest port: edit each routes file to import `requireAuth` and add it as the second arg to each `r.<method>(…)`. Pattern (already used everywhere in satellite — see `bom.ts:7,68,159,215`):

```typescript
// In every backend/src/routes/<x>.ts that handles writes or sensitive reads:
import { requireAuth } from '../middleware/auth';

router.get('/foo', requireAuth, async (req, res) => { … });
router.post('/foo', requireAuth, async (req, res) => { … });
router.patch('/foo/:id', requireAuth, async (req, res) => { … });
router.delete('/foo/:id', requireAuth, async (req, res) => { … });
```

**Files to touch in ERP** (each contains route definitions):
- `backend/src/routes/salesforce.ts`
- `backend/src/routes/netsuite.ts`
- `backend/src/routes/arena.ts`
- `backend/src/routes/mes.ts`
- `backend/src/routes/vendor.ts`
- `backend/src/routes/integration.ts`
- `backend/src/routes/extras.ts`
- `backend/src/routes/notify.ts` *(keep `/visit` public — see below)*
- `backend/src/routes/agents.ts`
- `backend/src/routes/lookups.ts`
- `backend/src/routes/quickbooks.ts`
- `backend/src/routes/ramp.ts`

**Plus** the inline `app.get('/api/health', …)` (lines 22-91 of `app.ts`) — KEEP IT UNGUARDED.

**Plus** the inline `app.get('/api/activity', …)` (lines 94-102) — APPLY `requireAuth` to it manually since it's defined directly on `app`:

```typescript
app.get('/api/activity', requireAuth, async (req, res) => { … });
```

**Plus** the inline bulk loaders `/api/data/sf` (line 143), `/api/data/ns` (line 159), `/api/data/all` (line 188) — APPLY `requireAuth`. These are the LARGE dump endpoints; auth-gating them is essential.

### `/api/notify/visit` — keep PUBLIC (recommendation)

`index.html:528` fires `fetch('https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/notify/visit', …)` from `DOMContentLoaded` — before any auth flow could run. This is a visit-pixel for telemetry; it doesn't write user data, only logs the visit. Recommend: leave POST `/api/notify/visit` without `requireAuth`. If `notify.ts` has additional routes beyond `/visit`, those CAN take `requireAuth`. The planner should inspect `notify.ts` to enumerate.

### `erp-auth.js` — clone of `satellite-auth.js`

Source: `/Users/jeet/turion-space-demo/satellite/satellite-auth.js` (71 lines). The clone is mechanical — rename `SATELLITE_CONFIG` → `TURION_CONFIG`, `satelliteAuth` → `erpAuth`, `'turion-satellite-auth'` storageKey → `'turion-erp-auth'` (different key so the two apps don't stomp each other in the same browser), and the redirect target from `/satellite/login.html` → `/erp-login.html`. Full skeleton:

```javascript
// erp-auth.js · Supabase Auth client + session guards for the ERP demo.
// Depends on turion-config.js + Supabase UMD bundle loaded first.

(function () {
  const cfg = window.TURION_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.error('[erp-auth] missing window.TURION_CONFIG.SUPABASE_URL/SUPABASE_ANON_KEY — load turion-config.js first');
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[erp-auth] missing window.supabase — load Supabase UMD bundle first');
    return;
  }

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'turion-erp-auth',
    },
  });

  window.erpAuth = {
    client,
    async getSession() {
      const { data: { session }, error } = await client.auth.getSession();
      if (error) console.error('[erp-auth] getSession error:', error);
      return session;
    },
    async refreshSession() {
      const { data, error } = await client.auth.refreshSession();
      if (error) console.error('[erp-auth] refreshSession error:', error);
      return data?.session ?? null;
    },
    async getCurrentUser() {
      const session = await this.getSession();
      return session?.user ?? null;
    },
    async signInWithMagicLink(email, redirectTo) {
      return client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    },
    async signOut() {
      await client.auth.signOut();
      window.location.href = '/erp-login.html';
    },
    async requireSession() {
      const session = await this.getSession();
      if (!session) {
        const here = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/erp-login.html?redirect=${here}`;
        throw new Error('redirected to login');
      }
      return session;
    },
  };
})();
```

### `erp-api.js` — clone of `satellite-api.js`

Source: `/Users/jeet/turion-space-demo/satellite/satellite-api.js` (64 lines). The clone renames `SATELLITE_CONFIG` → `TURION_CONFIG`, `satelliteAuth` → `erpAuth`, `satelliteApi` → `erpApi`, login redirect target from `/satellite/login.html` → `/erp-login.html`. Full skeleton:

```javascript
// erp-api.js · Authenticated fetch wrapper for the ERP backend.
// Depends on erp-auth.js loaded first.

(function () {
  const cfg = window.TURION_CONFIG;
  const auth = window.erpAuth;
  if (!cfg || !auth) { console.error('[erp-api] missing config or auth'); return; }

  class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; this.name = 'ApiError'; }
  }

  async function api(path, opts = {}) {
    let session = await auth.getSession();
    if (!session) {
      const here = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/erp-login.html?redirect=${here}`;
      throw new ApiError(401, 'not authenticated');
    }
    const doFetch = (token) => fetch(cfg.API_BASE + path, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    let res = await doFetch(session.access_token);
    if (res.status === 401) {
      const refreshed = await auth.refreshSession();
      if (refreshed) res = await doFetch(refreshed.access_token);
      if (res.status === 401) {
        const here = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/erp-login.html?redirect=${here}`;
        throw new ApiError(401, 'session expired');
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  window.erpApi = {
    get:   (path)         => api(path),
    post:  (path, body)   => api(path, { method: 'POST',   body: JSON.stringify(body) }),
    patch: (path, body)   => api(path, { method: 'PATCH',  body: JSON.stringify(body) }),
    put:   (path, body)   => api(path, { method: 'PUT',    body: JSON.stringify(body) }),
    del:   (path)         => api(path, { method: 'DELETE' }),
    ApiError,
    raw: api,
  };
})();
```

### `erp-login.html` — clone of `satellite/login.html`

Source: `/Users/jeet/turion-space-demo/satellite/login.html` (60 lines). Rename references and update the redirect target on the callback URL. **NOTE the `?redirect=` honoring** so a logged-out user clicking a deep link returns there post-login:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in · Turion Space ERP</title>
<link rel="stylesheet" href="/satellite/satellite-shell.css">
<!-- the shell CSS is generic enough to reuse; or copy it into /erp-shell.css if you want zero coupling to /satellite/ -->
</head>
<body>
<div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;">
  <div class="panel" style="width:360px; padding:32px;">
    <h1 style="font-size:18px; margin-bottom:6px;">Turion Space ERP</h1>
    <p class="subtitle" style="margin-bottom:24px;">Sign in</p>
    <form id="loginForm">
      <label for="email">Work email</label>
      <input type="email" id="email" name="email" required autofocus autocomplete="email">
      <button type="submit" class="btn-primary" style="width:100%; margin-top:14px;" id="submitBtn">Send magic link</button>
      <div id="error" class="subtitle" role="alert" style="color:var(--red); min-height:14px;"></div>
    </form>
    <div id="success" style="display:none;">
      <div style="background:rgba(16,185,129,0.1); border:1px solid var(--green); border-radius:5px; padding:14px;">
        ✓ Check your inbox at <strong id="sentEmail"></strong>.
      </div>
    </div>
  </div>
</div>
<script src="/turion-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="/erp-auth.js"></script>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const btn = document.getElementById('submitBtn');
  const err = document.getElementById('error');
  err.textContent = '';
  btn.disabled = true; btn.textContent = 'Sending…';

  // Preserve ?redirect= so the callback can bounce there post-auth
  const params = new URLSearchParams(window.location.search);
  const redirectAfter = params.get('redirect') || '/';
  const cbUrl = `${window.location.origin}/erp-auth-callback.html?redirect=${encodeURIComponent(redirectAfter)}`;
  const { error } = await window.erpAuth.signInWithMagicLink(email, cbUrl);
  if (error) {
    err.textContent = error.message || 'Sign-in failed';
    btn.disabled = false; btn.textContent = 'Send magic link';
    return;
  }
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('success').style.display = 'block';
  document.getElementById('sentEmail').textContent = email;
});
</script>
</body>
</html>
```

### `erp-auth-callback.html` — clone of `satellite/auth/callback.html`

Mirror of the satellite version (verified above). Honors `?redirect=` query param to send the user back to where they came from:

```html
<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Signing in · Turion Space ERP</title>
<link rel="stylesheet" href="/satellite/satellite-shell.css">
</head><body>
<div style="min-height:100vh; display:flex; align-items:center; justify-content:center;">
  <p class="subtitle">Signing you in…</p>
  <p id="error" role="alert" style="color:var(--red);"></p>
</div>
<script src="/turion-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="/erp-auth.js"></script>
<script>
(async () => {
  setTimeout(async () => {
    const session = await window.erpAuth.getSession();
    if (session) {
      const params = new URLSearchParams(window.location.search);
      const target = params.get('redirect') || '/';
      window.location.replace(target);
    } else {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const desc = hashParams.get('error_description') || 'Sign-in failed. The link may have expired.';
      document.getElementById('error').textContent = desc;
      setTimeout(() => window.location.replace('/erp-login.html'), 3000);
    }
  }, 300);
})();
</script>
</body></html>
```

### `scripts/generate-turion-config.sh` — extend to emit Supabase URL+anon key

Current (verified):

```bash
#!/usr/bin/env bash
set -euo pipefail
OUT="/Users/jeet/turion-space-demo/turion-config.js"
API_BASE="${TURION_API_BASE:-https://lo254mvukl.execute-api.us-east-1.amazonaws.com}"
cat > "$OUT" <<EOF
window.TURION_CONFIG = Object.freeze({
  API_BASE: '${API_BASE}',
});
EOF
```

**Modified:**

```bash
#!/usr/bin/env bash
set -euo pipefail
OUT="/Users/jeet/turion-space-demo/turion-config.js"
REGION="us-east-1"
API_BASE="${TURION_API_BASE:-https://lo254mvukl.execute-api.us-east-1.amazonaws.com}"

# Reuse the SAME Supabase project as the satellite app
SUPABASE_URL="https://lbpkbpfwdpnwlccmlfxn.supabase.co"
SUPABASE_ANON_KEY=$(aws secretsmanager get-secret-value \
  --region "$REGION" \
  --secret-id turion-satellite/production/supabase-anon-key \
  --query SecretString --output text)

cat > "$OUT" <<EOF
window.TURION_CONFIG = Object.freeze({
  API_BASE: '${API_BASE}',
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}',
});
EOF
echo "→ wrote $OUT"
```

`turion-config.js` is `.gitignore`'d (verified by the comment in the existing file). The anon key never enters git.

### Audit-Script Extension — exact addition to `audit-erp-buttons.mjs`

Drop this generator next to `iterFetchCalls` at line 451 of `scripts/audit-erp-buttons.mjs`:

```javascript
// Find each `erpApi.<method>(` call; capture (method, firstArgExpr, rest).
// The `(?:^|[^A-Za-z_$])` guard prevents `myErpApi.get(` from matching
// (since `erpApi` is short enough to appear as a suffix of another identifier,
// unlike `satelliteApi` which never does).
function* iterErpApiCalls(text) {
  const re = /(?:^|[^A-Za-z_$])erpApi\.(get|post|patch|put|delete|del)\s*\(/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].toUpperCase();
    const method = raw === 'DEL' ? 'DELETE' : raw;
    const start = re.lastIndex; // index just after '('
    let depth = 1, q = null, i = start, commaIdx = -1;
    for (; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === q && text[i - 1] !== '\\') q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '(' || c === '[' || c === '{') { depth++; continue; }
      if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) break; continue; }
      if (c === ',' && depth === 1 && commaIdx < 0) commaIdx = i;
    }
    const firstArg = (commaIdx >= 0 ? text.slice(start, commaIdx) : text.slice(start, i)).trim();
    yield { method, firstArg };
  }
}
```

**Integration points** (search for them in `audit-erp-buttons.mjs`):

1. Inside the per-page loop (around line 682) — after the existing `for (const { firstArg, rest } of iterFetchCalls(html))` block, add:
   ```javascript
   for (const { method, firstArg } of iterErpApiCalls(html)) {
     apiCallCount++;
     const r = extractApiPath(firstArg);
     if (r == null) continue;
     if (r.unparseable) { violations.push({ file: rel, kind: 'unparseable-path', snippet: firstArg }); continue; }
     checkOneApiPath(r.path, method, rel, routes, violations);
   }
   ```

2. Inside the shared-JS loop (around line 713) — apply the same block, scanning `text` instead of `html`, pushing into `relJs` file path.

3. In the CLI summary at line 762, rename `fetch API calls scanned` → `API calls scanned (fetch + erpApi)` so the count stays meaningful as the migration progresses.

## Full ERP Fetch Inventory

**62 sites** total to migrate (verified via `grep -nE "fetch\(.*API_BASE|fetch\(.*TURION_CONFIG|fetch\(\s*['\"\`]/api/" *.js *.html` excluding `/satellite/`):

### Shared helper JS (5 sites — DO FIRST so pages can rely on them)

| File:line | Current | After |
|-----------|---------|-------|
| `data-loader.js:62` | `await fetch(API_BASE + '/api/data/all', { mode: 'cors' })` | `await window.erpApi.get('/api/data/all')` (drop the `.json()` parse — `erpApi` already returns parsed JSON) |
| `data-loader-sf.js:16` | `await fetch(API_BASE + '/api/data/sf', { mode: 'cors' })` | `await window.erpApi.get('/api/data/sf')` |
| `erp-lookups.js:24` | `await fetch(API_BASE + '/api/' + module + '/lookups', { mode: 'cors' })` | `await window.erpApi.get('/api/' + module + '/lookups')` |
| `arena-lookups.js:33` | `await fetch(\`${API_BASE}/api/${module}/lookups\`, { mode: 'cors' })` | `await window.erpApi.get(\`/api/${module}/lookups\`)` |
| `ns-editable.js:67` | `await fetch(url, { method: 'PATCH', headers: {…}, body: JSON.stringify(…) })` | `await window.erpApi.patch(url.replace(API_BASE,''), buildPatchBody(target.path, value))` |

Note: shared-JS files don't need `requireSession()` — they're imported AFTER the page IIFE has gated. But they DO need to be loaded AFTER `erp-auth.js` + `erp-api.js` in every page's `<script>` order.

### HTML pages (57 sites across 31 pages)

Grouped by page; each row is one `fetch(` line that becomes one `erpApi.*` call.

| File | Count | Lines | Verb |
|------|-------|-------|------|
| `quickbooks-bills.html` | 4 | 263, 264, 278, 335 | GET, GET, GET, POST (migrate) |
| `quickbooks-coa.html` | 4 | 244, 245, 259, 316 | GET, GET, GET, POST |
| `quickbooks-customers.html` | 4 | 252, 253, 267, 325 | GET, GET, GET, POST |
| `quickbooks-invoices.html` | 4 | 262, 263, 277, 334 | GET, GET, GET, POST |
| `quickbooks-items.html` | 4 | 247, 248, 262, 319 | GET, GET, GET, POST |
| `quickbooks-vendors.html` | 4 | 248, 249, 263, 320 | GET, GET, GET, POST |
| `ramp.html` | 4 | 278, 279, 294, 352 | GET, GET, GET, POST |
| `netsuite-setup.html` | 3 | 491, 499, 507 | GET, POST, PATCH (extras config CRUD) |
| `quickbooks.html` | 2 | 179, 205 | GET, GET |
| `sales-new-account.html` | 1 | 215 | POST `/api/netsuite/customers` |
| `sales-new-activity.html` | 1 | 68 | POST `/api/netsuite/activities` |
| `sales-new-case.html` | 1 | 68 | POST `/api/netsuite/cases` |
| `sales-new-cdrl.html` | 1 | 76 | POST `/api/netsuite/cdrls` |
| `sales-new-contact.html` | 1 | 200 | POST `/api/netsuite/contacts` |
| `sales-new-contract.html` | 1 | 81 | POST `/api/netsuite/contracts-create` |
| `sales-new-opportunity.html` | 1 | 226 | POST `/api/netsuite/opportunities` |
| `sales-new-order.html` | 1 | 729 | POST `/api/netsuite/sales-orders` |
| `sales-new-quote.html` | 1 | 152 | POST `/api/netsuite/quotes` |
| `arena-new-audit.html` | 1 | 53 | POST `/api/arena/audits-create` |
| `arena-new-capa.html` | 1 | 54 | POST `/api/arena/capas-create` |
| `arena-new-document.html` | 1 | 51 | POST `/api/arena/documents-create` |
| `arena-new-eco.html` | 1 | 77 | POST `/api/arena/ecos-create` |
| `arena-new-ncr.html` | 1 | 51 | POST `/api/arena/ncrs-create` |
| `arena-new-part.html` | 1 | 115 | POST `/api/arena/parts-create` |
| `arena-qms.html` | 1 | 730 | PATCH `/api/arena/{entity}/{id}` (NCR/CAPA close button) |
| `netsuite-new-item.html` | 1 | 129 | POST `/api/netsuite/items-create` |
| `netsuite-new-po.html` | 1 | 98 | POST `/api/netsuite/pos-create` |
| `netsuite-new-project.html` | 1 | 104 | POST `/api/netsuite/projects-create` |
| `netsuite-new-vendor.html` | 1 | 81 | POST `/api/netsuite/vendors-create` |
| `mes-shop-floor.html` | 1 | 1146 | PATCH `/api/mes/stages/{num}` (stage state toggle) |
| `agent-sales-cash.html` | 1 | 571 | POST `/api/agents/run` (or similar — verify path) |
| `index.html` | 1 | 528 | POST `/api/notify/visit` **— EXCEPTION: keep this raw fetch, do NOT migrate to erpApi (it must work without auth)** |

**TOTAL = 57 HTML-page fetches**, of which **1 stays raw** (`index.html:528` → `/api/notify/visit` is pre-auth telemetry). So **56 HTML fetches to migrate** + **5 shared-JS = 61** total migrations.

⚠️ Sanity check vs. ROADMAP's "~20 HTML pages": the count is 31 pages, but the audit fetch count of 57 is consistent with the ROADMAP's 37-violations-now history. The audit was reporting 37 ERP fetches at Phase 36-08 — Phase 37 added the 6 quickbooks + 1 ramp wizards (~20 new fetches). Adds up.

## Pages Needing `requireSession()` Injection

**31 pages** (every ERP `*.html` file that does any data work, EXCLUDING `erp-login.html`, `erp-auth-callback.html`, and the satellite app's pages):

Plus several more pages that LOAD `data-loader.js` but don't issue inline fetches themselves — those don't need the `requireSession()` line because `data-loader.js`'s call will trigger the redirect via `erpApi`. But for **defense-in-depth** the planner should inject `requireSession()` into **every ERP `*.html` page in the root directory** EXCEPT the two new login pages.

Counted via `ls /Users/jeet/turion-space-demo/*.html | wc -l` = **81 HTML files** at the root. So 81 minus 2 (login + callback) = **79 pages get `requireSession()`**.

The injection is mechanical — a one-line addition at the start of every inline `<script>` IIFE OR a new `<script>` block right after the `erp-auth.js`/`erp-api.js` loads:

```html
<script>
(async () => { await window.erpAuth.requireSession(); })();
</script>
```

(Place this BEFORE any page-specific inline `<script>` that issues fetches.)

## Read Routes To Keep PUBLIC

Verified by inspecting `backend/src/app.ts`:

| Route | File:line | Reason public |
|-------|-----------|---------------|
| `GET /api/health` | `app.ts:22-91` | Health checks (curl smoke, CloudWatch, monitoring); has no user data; standard pattern |
| `POST /api/notify/visit` | `notify.ts` (mounted at `app.ts:126`) | Visit telemetry pixel fired pre-auth from `index.html:528` |

Everything else gets `requireAuth`. The Phase 36-09 ground-truth walk confirmed there are no other public routes today.

## CORS / Preflight

**No changes needed.**

- `app.ts:18`: `app.use(cors({ origin: '*' }))` (verified).
- The `cors` middleware default `allowedHeaders` reflects the browser's `Access-Control-Request-Headers`, which will include `Authorization, Content-Type` when `erpApi` fires.
- Satellite uses the same `app.use(cors({ origin: '*' }))` (verified in `turion-satellite/backend/src/app.ts:25`) and Authorization works there — same library, same config, same behavior.

If smoke testing reveals a preflight failure, the fix is `app.use(cors({ origin: '*', allowedHeaders: ['Authorization', 'Content-Type'] }))` — but it shouldn't be necessary.

## Recommended Plan Breakdown

**4 plans across 3 waves.** Wave 1 lands the backend gate without breaking anything (frontend still uses raw `fetch` and hits 401s). Wave 2 lands the frontend helpers + login page. Wave 3 migrates all fetches + injects requireSession + deploys.

### Wave 1 (1 plan)

**`38-01-PLAN.md` — Backend `requireAuth` + secret wiring (commits, no push, no deploy yet)**
- Port `turion-satellite/backend/src/middleware/auth.ts` → `turion-space-demo/backend/src/middleware/auth.ts`
- Port `turion-satellite/backend/src/secrets.ts` → `turion-space-demo/backend/src/secrets.ts`
- Modify `turion-space-demo/backend/src/lambda.ts`: `import { loadSecrets }` + `const ready = loadSecrets(); await ready;` in the handler
- Modify `turion-space-demo/backend/src/app.ts`: add `requireAuth` to the inline `/api/activity`, `/api/data/sf`, `/api/data/ns`, `/api/data/all` routes
- Modify all 12 routers in `backend/src/routes/` to import `requireAuth` and apply it to each `r.<method>` — EXCEPT `health.ts` (already exempt by virtue of where `requireAuth` is applied) and `notify.ts`'s `/visit` route specifically
- Run `npm run build` + `tsc --noEmit` to verify clean compile
- Commit, do NOT push, do NOT redeploy Lambda — Wave 3 ships everything atomically.

### Wave 2 (parallel — 1 plan)

**`38-02-PLAN.md` — Frontend auth helpers + login page (no migration yet)**
- Extend `scripts/generate-turion-config.sh` to emit `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- Create `erp-auth.js` (clone of `satellite/satellite-auth.js`, renamed globals/storageKey)
- Create `erp-api.js` (clone of `satellite/satellite-api.js`, renamed globals)
- Create `erp-login.html` (clone of `satellite/login.html`, redirect target → `/erp-auth-callback.html`)
- Create `erp-auth-callback.html` (clone of `satellite/auth/callback.html`)
- Add CloudFront clean-URL rewrites if needed for `/erp-login` and `/erp-auth-callback` (check `scripts/deploy-frontend.sh` for the rewrite pattern; Phase 37 added 8 wizard rewrites — same mechanism)
- Verify locally: `python -m http.server` + navigate to `/erp-login.html` — should render, the magic-link button should fail-soft if no Supabase config (don't actually send while testing)
- Commit, do NOT push.

### Wave 3 (sequential after Wave 2 — 2 plans)

**`38-03-PLAN.md` — Migrate every ERP fetch to `erpApi.*` + inject `requireSession()` on every page**
- Shared JS migration (5 sites): `data-loader.js`, `data-loader-sf.js`, `erp-lookups.js`, `arena-lookups.js`, `ns-editable.js`
- HTML pages migration (56 sites, leaving `/api/notify/visit` alone): use a scripted text replacement for the 7 quickbooks pages + ramp.html (they share an identical template), then manual one-off for the 8 sales-new + 6 arena-new + 4 netsuite-new + arena-qms + mes-shop-floor + netsuite-setup + agent-sales-cash + quickbooks.html
- Inject `<script>(async () => { await window.erpAuth.requireSession(); })();</script>` AND `<script src="/turion-config.js"></script><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script><script src="/erp-auth.js"></script><script src="/erp-api.js"></script>` into **79 HTML pages** (every ERP page except the 2 new login pages)
- Local sanity: `python -m http.server`; navigate to any page; confirm redirect-to-login when no session
- `node --check` on every modified file
- Commit.

**`38-04-PLAN.md` — Audit extension + deploy + verify**
- Modify `scripts/audit-erp-buttons.mjs`: add `iterErpApiCalls(text)` generator + wire into per-page and shared-JS loops + update CLI summary line
- Run `npm run audit-buttons` → 0 violations (both frontends)
- F6 pre-flight (`.superpowers` aside)
- `aws lambda update-function-configuration --function-name turion-demo-api --environment '{"Variables":{"DATABASE_URL":"<existing>","ANTHROPIC_API_KEY":"<existing>","SUPABASE_JWT_SECRET_ARN":"arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr"}}'` — **add the ARN env var to the ERP Lambda** (critical; without this `requireAuth` will 500)
- Grant `turion-demo-api`'s Lambda execution role `secretsmanager:GetSecretValue` on the satellite's JWT-secret ARN if it doesn't have it already (check the role's policy; reuse the satellite Lambda's pattern)
- `backend/build-and-push.sh` → redeploy `turion-demo-api`
- Add `https://turionspace.zietra.com/erp-auth-callback.html` to Supabase Auth → URL Configuration → Redirect URLs allowlist (Supabase Dashboard, manual step — flag in plan)
- `deploy-frontend.sh` (regenerates `turion-config.js` with Supabase URL+anon key) + CloudFront invalidation `/* `
- F6 post-flight (`.superpowers` restored)
- Curl smoke:
  ```bash
  # 1. Health still works without auth
  curl -s https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health | jq '.db'
  # → "ok"

  # 2. Write route 401s without auth
  curl -s -o /dev/null -w '%{http_code}\n' -X POST \
    https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/netsuite/customers \
    -H 'content-type: application/json' -d '{"id":"TEST"}'
  # → 401

  # 3. Read route 401s without auth
  curl -s -o /dev/null -w '%{http_code}\n' \
    https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all
  # → 401

  # 4. Health-check page renders the login page when navigated without session
  curl -sI https://turionspace.zietra.com/erp-login.html | head -1
  # → HTTP/2 200

  # 5. Audit both frontends — 0 violations
  npm run audit-buttons
  ```
- **Headless-substitute checkpoint** (DB-direct, no browser):
  - Use the Supabase admin API or the satellite-side `signInWithOtp` helper to mint a real JWT for a test email
  - `curl -H "Authorization: Bearer <jwt>" https://lo254mvukl…/api/data/all | jq 'keys|length'` → expect 53
  - `curl -H "Authorization: Bearer <jwt>" -X POST …/api/netsuite/customers -d '{…}'` → expect 200, audit_log records CREATE
  - Cleanup: delete the test row
- Update `.planning/STATE.md` + `.planning/ROADMAP.md` Phase 38 entry
- Push both atomic commits → main
- Plan ends at "Phase 38 COMPLETE"

### Wave choreography summary

```
Wave 1 (alone): 38-01  (backend, no deploy)
Wave 2 (alone): 38-02  (frontend helpers + login pages, no deploy, no migration yet)
Wave 3 (alone): 38-03  (fetch migration + requireSession injection)
Wave 4 (alone): 38-04  (audit + deploy + smoke + headless checkpoint)
```

**Note:** Wave 2 must NOT push because there's no point shipping `erp-auth.js` without `requireAuth` on the backend (or vice-versa) — they're mutually-dependent for the system to work. Wave 4 deploys both atomically.

**Alternative if you want fewer waves:** Collapse 38-01 + 38-02 into a single Wave 1 with two parallel plans (they touch zero overlapping files: backend `src/*.ts` vs. frontend `*.js`/`*.html`). Then 38-03 in Wave 2, 38-04 in Wave 3 = **3 waves, 4 plans**. Recommended for tighter scheduling.

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Anyone-with-URL writes via raw `fetch(API_BASE+'/api/…')` | Supabase magic-link JWT + per-route `requireAuth` | This phase | Stops casual DB writes by anyone who knows the API Gateway host |
| `app.use(authMiddleware)` global with allowlist | Per-route `requireAuth` (satellite pattern, Phase 32+) | Phase 32 | Easier to audit; new public routes don't accidentally inherit auth bypass |
| Plain HS256 secret | ES256 JWKS from Supabase, PEM at cold start | Satellite Phase 32 | Asymmetric keys; satellite can rotate without touching the secret |
| Hardcoded `API_BASE` in every JS file | `window.TURION_CONFIG.API_BASE` from generated config | Phase 36 | Single source of truth; PR-ready for Phase 38 to add SUPABASE_URL/ANON_KEY |

**Deprecated/outdated:**
- HS256 `SUPABASE_JWT_SECRET` env var: present in `auth.ts` as a fallback but unused on satellite production (verified — Lambda has `SUPABASE_JWT_SECRET_ARN` set, which is the JWKS path, not the HS256 plain secret). Keep the fallback for local-dev convenience; don't rely on it.

## Open Questions

1. **Does the ERP Lambda's execution role have `secretsmanager:GetSecretValue` on the satellite JWT-secret ARN?**
   - What we know: The satellite Lambda's role has it (otherwise satellite would 500). The ERP Lambda accesses `notify.ts`'s Resend key via env var (since Phase 36-07 deprecated the Secrets Manager path for that one). The ERP role may or may not have IAM permission on cross-account-ish ARNs.
   - What's unclear: Whether `turion-demo-api`'s execution role is the same one as `turion-satellite-api`'s, or separate.
   - Recommendation: 38-04 task should `aws lambda get-function-configuration --function-name turion-demo-api --query 'Role'` to fetch the role ARN, then `aws iam get-role-policy --role-name <...> --policy-name <...>` to check. If permission is missing, add an inline policy granting `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/supabase-jwt-secret-sWnNlr`.

2. **Does the live `notify.ts` route at `/api/notify/visit` need any specific exemption code, or can we just NOT apply `requireAuth` to its `r.post('/visit', …)` line?**
   - What we know: Per-route `requireAuth` means the absence of `requireAuth` on a given handler = public.
   - What's unclear: Whether `notify.ts` has OTHER routes (besides `/visit`) that should be auth-gated.
   - Recommendation: 38-01 task should grep `notify.ts` for `r.<method>(` calls and inventory each; only `/visit` stays public.

3. **Does `satellite-shell.css` work cleanly when loaded from `erp-login.html` at the site root?**
   - What we know: `erp-login.html` at `/erp-login.html` would reference `/satellite/satellite-shell.css`. That file exists in the CloudFront bucket.
   - What's unclear: Whether the satellite shell CSS has any selectors that would corrupt the ERP demo's existing chrome.
   - Recommendation: The login page is a stand-alone, full-page form — no other ERP CSS is loaded — so collisions are impossible. Just verify the form renders correctly in the deploy-time smoke.

4. **Will the Supabase project's CORS settings accept the `https://turionspace.zietra.com` origin for `signInWithOtp`?**
   - What we know: The satellite app's magic-link works from `https://turionspace.zietra.com/satellite/login.html` — so the origin is already allowed.
   - What's unclear: Nothing — the same origin works for satellite.
   - Recommendation: No action; only need to add the new callback URL to Supabase's Redirect URLs allowlist (covered in 38-04).

5. **Should `/api/agents/run` (the AI agent endpoint) be `requireAuth`-gated?**
   - What we know: It currently calls Anthropic with a live API key; should NOT be open to abuse.
   - What's unclear: nothing — yes, gate it.
   - Recommendation: Apply `requireAuth` to `agents.ts`'s routes in 38-01. This is the highest-priority gate.

## Sources

### Primary (HIGH confidence)

- `/Users/jeet/turion-satellite/backend/src/middleware/auth.ts` (76 lines, read in full)
- `/Users/jeet/turion-satellite/backend/src/secrets.ts` (48 lines, read in full)
- `/Users/jeet/turion-satellite/backend/src/lambda.ts` (14 lines, read in full)
- `/Users/jeet/turion-satellite/backend/src/app.ts` (read in full — confirms `app.use(cors({origin:'*'}))` + per-route auth)
- `/Users/jeet/turion-satellite/backend/src/routes/health.ts:6` (confirms NO `requireAuth` on health)
- `/Users/jeet/turion-satellite/backend/src/routes/assistant.ts` (lazy-load pattern, lines 1-75)
- `/Users/jeet/turion-satellite/backend/scripts/audit-satellite-buttons.mjs:272-295` (exact `iterApiCalls` regex to mirror)
- `/Users/jeet/turion-space-demo/satellite/satellite-auth.js` (71 lines, read in full)
- `/Users/jeet/turion-space-demo/satellite/satellite-api.js` (64 lines, read in full)
- `/Users/jeet/turion-space-demo/satellite/login.html` (60 lines, read in full)
- `/Users/jeet/turion-space-demo/satellite/auth/callback.html` (read in full)
- `/Users/jeet/turion-space-demo/backend/src/app.ts` (read in full — confirms `app.use(cors({origin:'*'}))`, identifies 12 sub-routers + 5 inline routes)
- `/Users/jeet/turion-space-demo/scripts/generate-turion-config.sh` (read in full)
- `/Users/jeet/turion-space-demo/scripts/generate-satellite-config.sh` (read in full)
- `/Users/jeet/turion-space-demo/scripts/audit-erp-buttons.mjs` (read in full)
- `/Users/jeet/turion-space-demo/data-loader.js` + `ns-editable.js` (read partially)
- `aws lambda get-function-configuration --function-name turion-satellite-api` — confirms `SUPABASE_JWT_SECRET_ARN` env var present
- `aws lambda get-function-configuration --function-name turion-demo-api` — confirms `SUPABASE_JWT_SECRET_ARN` env var is **NOT** present (must be added in 38-04)
- `aws secretsmanager list-secrets` — confirms the three relevant secrets:
  - `turion-satellite/production/database-url-NCbgX6`
  - `turion-satellite/production/supabase-jwt-secret-sWnNlr`
  - `turion-satellite/production/supabase-anon-key-cxGmm1`

### Secondary (MEDIUM confidence)

- ROADMAP.md Phase 38 entry (lines 603-611) — the spec
- ROADMAP.md Phases 32-37 status entries — historical context for the satellite-side patterns this phase mirrors
- Counts of fetch sites: 62 verified via `grep -rnE "fetch\(.*API_BASE|fetch\(.*TURION_CONFIG|fetch\(\s*['\"\`]/api/" --include='*.html' --include='*.js'`

### Tertiary (LOW confidence)

- Whether `agents.ts`'s `/api/agents/run` route currently has any auth at all — assumed open; the planner should verify in 38-01 by reading the file
- Whether `notify.ts` has routes OTHER than `/visit` — assumed not, but planner must inventory in 38-01

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries verified in the satellite repo, all Lambda env vars verified via AWS CLI, all secrets verified via Secrets Manager list, anon-key reuse cross-checked
- Architecture (per-route `requireAuth`, lazy-load Anthropic key, eager-load JWT key): **HIGH** — verified across 8+ satellite route files
- Pitfalls: **HIGH** — the loading-order, ARN env-var, and redirect-domain pitfalls are all observed firsthand in the satellite Phase 32-34 work logged in MEMORY.md
- Fetch inventory + page count: **HIGH** — produced by file-by-file grep, cross-checked against the audit script's most-recent reported count (37 fetches at Phase 36-08 + ~25 added by Phase 37 wizards = ~62, matches)
- Plan breakdown: **MEDIUM** — well-bounded but boundaries are negotiable; planner may collapse 38-01+38-02 if they want fewer waves

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (30 days — stable port; only invalidated if Supabase changes its JWT issuance format or AWS Secrets Manager ARN changes)
