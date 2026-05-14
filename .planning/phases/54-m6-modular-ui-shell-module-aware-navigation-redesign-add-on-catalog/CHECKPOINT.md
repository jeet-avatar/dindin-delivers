# Phase 54.1 CHECKPOINT — Multi-user invites + role-based access (handoff from Phase 54)

> **Phase 54 status:** CLOSED. 5/5 plans complete; 8/8 requirement IDs satisfied.
> **Source-of-truth commits (turion-space-demo):**
> - Wave 1: `d4d1167` (app-shell.js) + `04b20c1` (app-shell.css)
> - Wave 2: `3e33dab` (inject-shell.mjs) + `c8ebab3` (81 pages wrapped)
> - Wave 2: `1863611` (catalog.html) + `6e6e83f` (3 bottom-rail + 17 module stubs)
> - Wave 3: `721febb` (CF Function R-map + 14 RESERVED slugs)
> - Wave 3: `a8ad490` (Playwright scaffold) + `446236c` (29 tests + README)
> **Live distribution:** `https://turionspace.zietra.com` (CloudFront `E37R9PT8IL44L2`)
> **Backend Lambda:** `turion-demo-api` CodeSha256 `a6b47e07f7e2716abb5d09988a602713afa7ed46a6e0ce287ddda15d535fca74`
> **Written:** 2026-05-14 by Phase 54 Plan 05 executor

---

## 1. What Phase 54.1 inherits from Phase 54

| Inherited artifact | Description | Reference |
| ----------------- | ----------- | --------- |
| LIVE app shell at `<tenant>.zietra.com` | Module-aware left rail (11 groups) + top bar + tenant chrome via vanilla JS (`app-shell.js`, 431 LOC) and CSS Grid layout (`app-shell.css`, 503 LOC) | 54-01-SUMMARY |
| 82 wrapped HTML pages | Every ERP page at repo root carries `<!-- ZIETRA-SHELL-INJECTED -->` marker + `/app-shell.{js,css}` tags via idempotent `scripts/inject-shell.mjs` | 54-02-SUMMARY |
| 13-card add-on catalog at `/catalog` | Hash routing (`#asc606`, etc.), CTA branching on `tenant.features` × `tenant.plan`, ASC 606 external link | 54-03-SUMMARY |
| 17 module-landing stubs + 3 bottom-rail stubs | Every nav target has a real page (Rule 2: no dead ends). `/team.html`, `/settings.html`, `/help.html` ready for 54.1 / M4 fill-in | 54-03-SUMMARY |
| 31 pretty-URL CloudFront rewrites | `/catalog`, `/team`, `/salesforce/customers`, etc. all 200 via tuple-form R-map in `turion-clean-urls.js` | 54-04-SUMMARY |
| 31 RESERVED_SLUGS in CF Function + backend | Includes `team`, `settings`, `help`, `royalty`, `salesforce`, `netsuite`, `arena`, `mes`, `quality`, `agents`, `catalog`, `quickbooks`, `ramp`, `marketing` — prevents signup-shadowing the nav | 54-04-SUMMARY |
| `/team` stub URL | LIVE at `https://turionspace.zietra.com/team` (CF rewrite → `/team.html`); shell-wrapped, `requireSession`-gated, awaits Phase 54.1 fill-in | 54-03-SUMMARY |
| `BOTTOM_NAV` shell wiring | `app-shell.js` already wires `/team` as the 4th bottom-nav item (icon: `users-2`, label: `Team`) | 54-01-SUMMARY |
| 13 NAV_TAXONOMY groups filtered by `tenant.features[]` | Phase 54.1's role middleware can ALSO filter at the same boundary (extend the Set intersection) | 54-01-SUMMARY |
| `/api/tenants/current` (Phase 53) | Returns `{id, slug, name, plan, trial_ends_at, features[]}`. Phase 54.1 will add a `current_user` field OR a separate `/api/users/me` endpoint | 54-RESEARCH |
| Playwright E2E scaffold (29 tests) | `tests/e2e/` exists with `playwright.config.ts` + 4 spec files + setup; `npx playwright test --list` exits 0 (autonomous-provable scaffold proof) | 54-05-SUMMARY |
| README documenting TURION_ID_TOKEN | One-time capture instructions; CI rotation deferred to 54.3 | 54-05-SUMMARY |

---

## 2. Suggested Phase 54.1 scope (5 plans)

| Plan | Name | Output |
| ---- | ---- | ------ |
| **54.1-01** | `tenant_users` table migration + role enum | `backend/migrations/026_tenant_users.sql` — creates the table with FK to tenants + Cognito sub mapping |
| **54.1-02** | Invite flow API (admin only) | `POST /api/team/invites`, `GET /api/team/members`, `DELETE /api/team/invites/:id` — reuses Phase 39 CUSTOM_AUTH magic-link triggers |
| **54.1-03** | Role middleware (`requireRole`) | `backend/src/middleware/role.ts` — `requireRole(['admin'])` reads `req.user.cognito_sub`, looks up `tenant_users WHERE cognito_sub=$1 AND tenant_id=req.tenant.id`, 403 on mismatch |
| **54.1-04** | `/team` page UI | Rewrite `team.html` stub → member list + invite form + role dropdown + revoke action; all wired via shell-aware fetch (`window.erpApi.*`) |
| **54.1-05** | Smoke + Playwright tests | New `tests/e2e/team.spec.ts` for invite flow + role enforcement; smoke script for the new routes |

### 2a. Suggested `tenant_users` schema

```sql
-- backend/migrations/026_tenant_users.sql
CREATE TYPE tenant_role AS ENUM ('admin', 'manager', 'member', 'viewer');
CREATE TYPE invite_status AS ENUM ('pending', 'active', 'revoked');

CREATE TABLE tenant_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cognito_sub   TEXT,                                      -- NULL until invitee accepts magic-link
  email         TEXT NOT NULL,
  role          tenant_role NOT NULL DEFAULT 'member',
  status        invite_status NOT NULL DEFAULT 'pending',
  invited_by    UUID REFERENCES tenant_users(id),
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at     TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  CONSTRAINT tenant_users_email_per_tenant UNIQUE (tenant_id, email),
  CONSTRAINT tenant_users_sub_per_tenant   UNIQUE (tenant_id, cognito_sub)
);

CREATE INDEX idx_tenant_users_sub  ON tenant_users(cognito_sub) WHERE cognito_sub IS NOT NULL;
CREATE INDEX idx_tenant_users_tenant_status ON tenant_users(tenant_id, status);

-- Backfill: the signup user becomes the first admin
INSERT INTO tenant_users (tenant_id, cognito_sub, email, role, status, joined_at)
SELECT id, owner_cognito_sub, owner_email, 'admin', 'active', created_at
FROM tenants
WHERE owner_cognito_sub IS NOT NULL
ON CONFLICT DO NOTHING;
```

> The signup row (Phase 52) creates `tenants.owner_cognito_sub`; this migration projects that into a `tenant_users` row with role=`admin`, status=`active`. New invitees start as `pending` until they redeem the magic link.

### 2b. Suggested `requireRole` middleware contract

```typescript
// backend/src/middleware/role.ts
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';

export function requireRole(allowed: TenantRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sub = req.user?.cognito_sub;
    const tenantId = req.tenant?.id;
    if (!sub || !tenantId) return res.status(401).json({ error: 'unauthenticated' });

    const { rows } = await db.query(
      `SELECT role FROM tenant_users
       WHERE cognito_sub = $1 AND tenant_id = $2 AND status = 'active'`,
      [sub, tenantId]
    );
    const role = rows[0]?.role;
    if (!role) return res.status(403).json({ error: 'no_tenant_membership' });
    if (!allowed.includes(role)) return res.status(403).json({ error: 'insufficient_role', role, allowed });
    req.user.role = role;
    next();
  };
}
```

### 2c. Suggested invite flow

```
POST /api/team/invites
  Auth: requireSession + requireRole(['admin'])
  Body: { email, role }
  Action:
    1. INSERT tenant_users (tenant_id, email, role, status='pending')
    2. Trigger Phase 39 CUSTOM_AUTH magic link to that email
    3. Return { invite_id, email, role, status }

GET /api/team/members
  Auth: requireSession (any role)
  Returns: tenant_users[] filtered to req.tenant.id

DELETE /api/team/invites/:id
  Auth: requireSession + requireRole(['admin'])
  Action: UPDATE tenant_users SET status='revoked', revoked_at=NOW() WHERE id=$1 AND tenant_id=req.tenant.id
```

---

## 3. Must-not-break checklist (Phase 54.1 cannot regress these)

- [x] Phase 41 Cognito-only auth UNCHANGED (don't add password flows)
- [x] Phase 52 signup public + atomic UNCHANGED (signup creates the FIRST admin user; subsequent invites flow through 54.1)
- [x] Phase 53 wildcard subdomain + `tenantContext` middleware UNCHANGED (role middleware runs AFTER tenantContext)
- [x] Phase 54 app shell + NAV_TAXONOMY + catalog UNCHANGED (54.1 adds nav-rail filtering ON TOP of feature filtering — doesn't replace it)
- [x] 4 `zietra-cognito-*` trigger Lambdas NOT touched (invite magic-links reuse the existing PreSignUp/PreAuth/DefineAuth/CreateAuthChallenge chain)
- [x] The 31 RESERVED_SLUGS list NOT shrunk
- [x] Playwright config `tests/e2e/playwright.config.ts` EXTENDED (not rewritten) — add `tests/e2e/team.spec.ts` to the chromium testMatch regex
- [x] Existing 29 tests remain green (don't change their assertions; add new spec instead)
- [x] No new framework (vanilla JS continues; HTML pages remain hand-authored)
- [x] No new top-level bottom-rail item (use the existing `/team` slot wired in 54-01)

---

## 4. Phase 54 closure evidence — 8/8 requirement IDs satisfied

| Requirement ID | Evidence | Source |
| -------------- | -------- | ------ |
| `AppShell` | `/app-shell.js` (431 LOC) + `/app-shell.css` (503 LOC) LIVE; CSS Grid layout; tenant chrome; 53 legacy `/shells/*` pages migrated + 28 fresh pages injected = 81 total wrapped | 54-01-SUMMARY, 54-02-SUMMARY |
| `ModuleAwareNavigation` | `NAV_TAXONOMY` has 11 module groups + 4 bottom-rail items; every label references its source system ("NetSuite • Sales Orders", "Arena • BOMs", etc.); 31 CloudFront rewrites map pretty URLs to S3 keys | 54-01-SUMMARY, 54-04-SUMMARY |
| `NavigationLandingPages` | 17 module stubs under `/stubs/` + 10 reuse URLs all return HTTP 200; every nav target has real content (Rule 2: no dead ends) | 54-03-SUMMARY, 54-04-SUMMARY |
| `CatalogPage` | `/catalog` LIVE with 13-card MODULE_CATALOG grid; hash routing via `Element.scrollIntoView({behavior:'smooth'})`; consistent `.z-status` pills per card | 54-03-SUMMARY |
| `AddOnCTAs` | Card render branches on `tenant.features` Set × `tenant.plan`; `Open` for enabled, `Subscribe`/`Try free` stub-alerting M4 for disabled; ASC 606 external `target="_blank"` | 54-03-SUMMARY |
| `ShellWrapperForExistingPages` | `scripts/inject-shell.mjs` (154 LOC) idempotent codemod with `ZIETRA-SHELL-INJECTED` marker guard; 81 pages wrapped first pass, 0 modifications second pass (idempotency proven) | 54-02-SUMMARY |
| `TenantBrandedChrome` | Top bar reads `tenant.name`, `plan`, `trial_ends_at` from Phase 53's `/api/tenants/current`; plan badge with amber-at-7d red-at-0d trial countdown logic; workspace link → `/settings` | 54-01-SUMMARY |
| `PlaywrightE2EScaffold` | `tests/e2e/` exists with 29 tests across 4 specs + 1 setup; `npx playwright test --list` exits 0 (autonomous-provable scaffold proof); `tests/e2e/README.md` documents the one-time `TURION_ID_TOKEN` capture; CI rotation deferred to Phase 54.3 | 54-05-SUMMARY |

---

## 5. Deferred items (carried to 54.1 / 54.2 / 54.3 / later)

| Item | Target phase | Notes |
| ---- | ------------ | ----- |
| CI rotation of Playwright auth state | **54.3** | AdminInitiateAuth USER_PASSWORD_AUTH against a dedicated test user; scheduled GH Action rotates IdToken every 50 min |
| Multi-user invites + RBAC | **54.1** (this handoff) | Plans 54.1-01 through 54.1-05 above |
| AI agent per-tenant scoping | **54.2** | Currently all tenants share Anthropic key; scope to tenant_id + per-tenant rate limit |
| Vitest backend coverage for tenantContext + role middleware | **54.3** | Today's coverage is smoke-only; need unit tests for the middleware chain |
| Lighthouse + axe accessibility audit | **54.3** | Shell hasn't been axe-tested yet |
| Mobile hamburger menu | **M8** | Shell is desktop-only; mobile breakpoint hides the rail entirely today |
| Per-tenant `/` home page customization | **M7** | Today's `/` is the generic ERP dashboard |
| Per-tenant CloudFront cache key | **M7 / M8** | Today all tenants share the same edge cache for `/app-shell.{js,css}` (intentional — same code) |
| `.superpowers/` cleanup in `deploy-frontend.sh` | Cosmetic / hygiene | Pre-existing — not a 54.x blocker |
| Backend `backend/dist/*` working-tree drift | Cosmetic / hygiene | Pre-existing — not a 54.x blocker |

---

## 6. Resources Phase 54.1 will use

| Resource | Identifier |
| -------- | ---------- |
| ERP API base | `https://lo254mvukl.execute-api.us-east-1.amazonaws.com` |
| Satellite API base | `https://rjydekliee.execute-api.us-east-1.amazonaws.com` |
| `/team` URL | `https://<tenant>.zietra.com/team` (CF Function rewrite → `/team.html`) |
| `tenant_users` table | NEW — Phase 54.1-01 migration (see §2a above) |
| Cognito user pool | `us-east-1_KQuNS85nP` |
| Phase 39 CUSTOM_AUTH triggers | UNCHANGED — invite emails reuse the magic-link path |
| Wildcard cert | `arn:aws:acm:us-east-1:134607809447:certificate/4a29032a-...` |
| Backend Lambda | `turion-demo-api` (CodeSha256 `a6b47e07…`) |
| Migration script pattern | `turion-space-demo/scripts/inject-shell.mjs` (idempotent marker pattern — copy for any future page-wide change) |
| Phase 41 cognito-auth.js storage keys | `cognito_id_token`, `cognito_id_token_expiry` (read by app-shell.js + erp-api.js wrapper) |
| Phase 53 tenantContext middleware | Sets `req.tenant = {id, slug, ...}` from `X-Tenant-Slug` header (called by `erpApi.*` wrapper) |
| Playwright scaffold | `tests/e2e/playwright.config.ts` — extend `testMatch` regex with `team.spec.ts` |

---

## 7. Files Phase 54.1 will probably touch

| File | Purpose | Action |
| ---- | ------- | ------ |
| `backend/migrations/026_tenant_users.sql` | New table + enums + indexes + backfill | CREATE |
| `backend/src/routes/team.ts` | New invite + list + revoke endpoints | CREATE |
| `backend/src/routes/index.ts` | Mount `/api/team` router | MODIFY |
| `backend/src/middleware/role.ts` | `requireRole(['admin'])` decorator | CREATE |
| `backend/src/middleware/index.ts` | Export role middleware | MODIFY |
| `backend/src/types/express.d.ts` | Add `req.user.role` typing | MODIFY |
| `team.html` | Replace stub with member list + invite form + role dropdown | REWRITE |
| `app-shell.js` | Add role filtering to nav rail (after feature filtering) | MODIFY |
| `tests/e2e/team.spec.ts` | New spec for invite flow + role enforcement | CREATE |
| `tests/e2e/playwright.config.ts` | Extend testMatch regex (add `team`) | MODIFY |
| `scripts/smoke-phase-54-1.sh` | New smoke script for team endpoints | CREATE |

---

## 8. Open questions for Phase 54.1 planner

1. **Owner role on signup:** Phase 52's signup endpoint writes `tenants.owner_cognito_sub`. Should the backfill INSERT a `tenant_users` row with role `admin` AND keep the `owner_cognito_sub` column? Or drop `owner_cognito_sub` once `tenant_users` exists? **Recommendation:** keep both for now; the column is the bootstrap-admin record (immutable, prevents lockout). The `tenant_users` row is the live RBAC source. Sync them on insert.
2. **Invite expiry:** Cognito magic links expire in 1 hour. Should `tenant_users.invited_at` enforce an invite-row TTL (e.g., 7 days)? **Recommendation:** yes — add a nightly Lambda that flips `pending` → `revoked` after 7 days.
3. **Email transport:** Phase 39 magic-link triggers SES from `noreply@zietra.com`. Should the invite email use a distinct From or template? **Recommendation:** reuse the existing transport, branch on a `purpose=invite` claim in the magic-link payload to render a different subject/body.
4. **Role-based nav filtering:** Should `viewer` role hide the AI Agents nav group? Or show it greyed-out with a "+ Upgrade your role" CTA? **Recommendation:** hide for v1; greying-out becomes M8 polish.
5. **Frontend role caching:** `app-shell.js` already caches `tenant` for 60 seconds. Should it also cache `user.role`? **Recommendation:** yes, but invalidate on `tenant_users` mutations (POST/DELETE) by clearing the cache key.

---

*Written 2026-05-14 by Phase 54 Plan 05 executor. Phase 54 CLOSED. Phase 54.1 ready to plan.*
