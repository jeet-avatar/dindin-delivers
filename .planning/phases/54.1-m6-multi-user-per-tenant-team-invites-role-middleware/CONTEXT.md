# Phase 54.1 CONTEXT — Multi-user per tenant (team invites + RBAC)

> Phase 54 shipped the `/team` route stub. Phase 54.1 makes it real: tenant owners invite team members, each gets a role, role middleware enforces RBAC per route.

---

## Phase 54.1 scope (from ROADMAP)

A tenant owner can invite team members by email; each gets a role (`admin` / `manager` / `member` / `viewer`). New `tenant_users` table. Invite flow: owner submits email + role → backend creates pending invite + sends magic-link email via SES → invitee clicks → Cognito user provisioned (if new) → row added to `tenant_users`. New role middleware enforces RBAC per route. UI: `/team` page lists members + invite form. Stripe seat counting deferred to M4. Adds vitest backend tests.

**Requirement IDs (5):**
- `TenantUsersTable`
- `InviteFlow`
- `RoleMiddleware`
- `TeamPage`
- `VitestBackendBootstrap`

---

## LOCKED DECISIONS

### `tenant_users` table schema

```sql
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cognito_sub TEXT,  -- nullable until invitee accepts (provisioned at first sign-in)
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- admin / manager / member / viewer
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / active / suspended / removed
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  invited_by_cognito_sub TEXT NOT NULL,
  invite_token TEXT,  -- nullable; one-time, expires after 7 days; cleared after use
  invite_expires_at TIMESTAMPTZ,
  CONSTRAINT tenant_users_role_chk CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  CONSTRAINT tenant_users_status_chk CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
  UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_cognito_sub ON public.tenant_users(cognito_sub) WHERE cognito_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_users_invite_token ON public.tenant_users(invite_token) WHERE invite_token IS NOT NULL;
```

**Owner backfill:** in the same migration, insert one row per existing `tenants` row with `email = (owner email lookup via cognito sub)`, `role = 'admin'`, `status = 'active'`, `joined_at = tenants.created_at`. This makes the existing owner a first-class member.

For the 4 migrated Turion users: each gets a row in Turion's tenant (`tenant_id = '00000000-0000-0000-0000-000000000001'`) with `role = 'admin'`, `status = 'active'`.

### Role matrix (locked)

| Role | Can read | Can write/edit | Can invite | Can manage billing | Can change roles | Can delete tenant |
|------|---------|----------------|------------|---------------------|------------------|---------------------|
| `admin` | all | all | yes | yes | yes (incl. demote other admins) | yes (with confirmation) |
| `manager` | all | all module data | yes (member/viewer only) | no | no | no |
| `member` | module data only | own assignments + module data | no | no | no | no |
| `viewer` | read-only | no writes | no | no | no | no |

### Invite flow

1. Owner/admin/manager on `/team` clicks "Invite member" → modal with `{email, role}`
2. Backend `POST /api/team/invite` (requires auth + role >= manager):
   - Validates email + role (`manager` cannot create `admin`/`manager`)
   - Generates `invite_token = randomBytes(32).toString('base64url')`
   - Inserts pending row in `tenant_users` (status=pending, expires 7 days)
   - Sends SES email to invitee with link `https://<tenant-slug>.zietra.com/accept-invite?token=<invite_token>`
3. Invitee clicks link → lands on `/accept-invite.html`:
   - JS parses `?token=` from URL
   - Calls `POST /api/team/accept-invite` with `{token}` (PUBLIC — no auth required, token IS the auth)
   - Backend: SELECT row by token (must be pending, not expired)
   - Cognito: `AdminCreateUser` if user doesn't exist OR `AdminGetUser` to confirm existing → `AdminAddUserToGroup` (group = role)
   - Update row: `cognito_sub`, `joined_at = now()`, `status = active`, `invite_token = NULL`, `invite_expires_at = NULL`
   - Browser triggers `cognitoAuth.signInWithMagicLink(email)` → user gets magic-link email → standard sign-in flow → lands on tenant home

### Role middleware

New `backend/src/middleware/role.ts` (both repos):
```ts
export function requireRole(...allowed: string[]) {
  return (req, res, next) => {
    if (!req.user || !req.tenant) return res.status(401).json({error:'auth required'});
    // Look up role from tenant_users (cached 60s like tenantContext)
    const role = await getCachedRole(req.tenant.id, req.user.sub);
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({error:'insufficient role', required:allowed, actual:role||'none'});
    }
    req.role = role;
    next();
  };
}
```

Applied per-route:
- `GET /api/team` — requireRole('admin','manager','member','viewer') — anyone in tenant can see team
- `POST /api/team/invite` — requireRole('admin','manager')
- `PATCH /api/team/:id/role` — requireRole('admin')
- `DELETE /api/team/:id` — requireRole('admin')

### `/team` page UI

`/Users/jeet/turion-space-demo/team.html` — replace the Phase 54 stub with real content:
- Header: "Team — N members" (count from `GET /api/team`)
- Table: name (or email if no name yet), role badge, status (active/pending), joined date, actions menu (Change role / Remove — admin only)
- "Invite member" button (visible if role >= manager) → modal
- Modal: email input + role dropdown (manager can only pick member/viewer; admin can pick any)
- After invite: refetch list, show success toast "Invite sent to <email>"

### vitest backend test bootstrap

- `cd /Users/jeet/turion-space-demo/backend && npm install -D vitest`
- `vitest.config.ts` with node environment + path aliases
- `package.json` add `"test": "vitest run"` + `"test:watch": "vitest"`
- Initial test files:
  - `tests/unit/role-middleware.test.ts` — requireRole accepts/rejects per role
  - `tests/unit/invite-flow.test.ts` — happy path + expiry + reuse rejection (with mocked Cognito + SES)
  - `tests/unit/tenant-users.test.ts` — schema + uniqueness + cascade-delete behavior (with real test DB or mocked pool)
- Target ≥15 tests in this phase; full coverage comes in Phase 54.3

---

## Critical scope boundaries

**IN:**
- Migration 026: `tenant_users` table + owner backfill (4 Turion users + 1 row for the Turion seed tenant owner)
- `backend/src/routes/team.ts` (NEW) — `GET /team`, `POST /invite`, `PATCH /:id/role`, `DELETE /:id`
- `backend/src/routes/invites.ts` (NEW) — `POST /accept-invite` (public)
- `backend/src/middleware/role.ts` (NEW) — mirror to satellite repo
- New `team.html` (real content, not the stub)
- New `accept-invite.html` (public landing)
- SES email template for invites
- Cognito IAM grant: already has AdminCreateUser/AdminAddUserToGroup from Phase 52 — verify, don't re-add
- vitest install + 15+ initial tests
- CloudFront Function rewrite for `/accept-invite` → `/accept-invite.html`

**OUT:**
- Stripe seat counting / billing (M4)
- Per-tenant audit log of role changes (M8)
- Org chart / hierarchy (separate feature, not M5/M6)
- SSO / SAML / federated identity (M8)
- 2FA / MFA (M8)
- Resending invites / bulk invite via CSV (could be 54.5 if needed)

**ABSOLUTELY OUT:**
- Touching the 4 zietra-cognito-* Lambdas
- Touching the apex zietra.com distribution
- Touching satellite-api's auth.ts (only middleware/role.ts is mirrored)

---

## Pre-conditions

- Phase 54 shipped: `/team` stub exists, app shell renders, `/api/tenants/current` returns `features[]`
- Phase 52 shipped: `tenants` + `tenant_features` tables live
- Cognito user pool live with `customer` group (Phase 39)
- Existing IAM policy `zietra-signup-cognito-ses` on `zietra-api-lambda-role` has `AdminCreateUser` + `AdminAddUserToGroup` + `AdminGetUser` (Phase 52)
- SES `noreply@zietra.com` verified, sandbox limits apply

---

## New Cognito Groups (add in this phase)

Currently: `admin`, `customer`, `driver`, `vendor` (Phase 39 — note `driver`/`vendor` are from prior Dollor.ai design, NOT used by Zietra Platform).

Add (or repurpose): `manager`, `member`, `viewer` for Zietra Platform RBAC. The `admin` group already exists from Phase 39 — reuse.

Plan task: create 3 new Cognito Groups via `aws cognito-idp create-group`. Idempotent (skip if exists).

When a user gets a role via invite, `AdminAddUserToGroup` puts them in the Cognito Group matching their role. `cognito:groups` in the JWT carries this. The role middleware can fall back to JWT-based group check if DB lookup fails (defensive).

---

## Engineering rules (PERMANENT)

- **Rule 1:** No hardcoded tenant data. Tenant + role from DB/JWT.
- **Rule 2:** Every link works. The `/accept-invite` flow MUST end at a working tenant home page.
- **Rule 3:** vitest tests assert each role's allow/deny matrix. ≥15 tests, all passing.
- **Rule 4:** Role middleware in BOTH repos (mirror change). Same logic.
- **Rule 5:** Phase 54's `team.html` stub gets replaced (Rule 5 — no dead code).
- **Rule 6:** No bulk invites, no SSO, no MFA. Single-invite + magic-link only.

---

## Autonomous mode

Full autonomy. No human checkpoints. Defer with log if SES sandbox blocks an invite to an unverified address — that's an information-leak side effect, not a blocker.

---

## Open questions for the researcher

1. **Existing IAM policy:** confirm `zietra-signup-cognito-ses` already grants the Admin* permissions Phase 54.1 needs (Phase 52 should have added them).
2. **Backfill of Turion's 4 users:** confirm exact email-to-cognito-sub mapping. Turion's owner row in `tenants` has `owner_cognito_sub`; the other 3 users (gteshnair@gmail.com, jm@techcloudpro.com, jeetnair.in@gmail.com) need to be added to Turion's `tenant_users` as role=admin too (they were Turion-pre-multi-tenant).
3. **Cognito Group creation:** `aws cognito-idp create-group` syntax. Confirm idempotency check pattern.
4. **vitest setup:** any prior vitest config in either repo? (Satellite repo had vitest from Phase 41 — verify; if yes, just align to the same shape.)
5. **Email template content:** invite email subject + body. Use plain text + HTML alt. Brand-consistent.
6. **Invite token storage:** plaintext in DB acceptable for demo-grade; M8 hashes it.
7. **Idempotent invite:** if same email already has a `pending` row in same tenant, return 200 with existing token (resend). If already `active`, return 409 "Already a member."
8. **Role-change route:** `PATCH /api/team/:id/role` requires admin. If demoting the LAST admin, must reject (need at least one admin per tenant).
9. **Owner deletion safeguard:** admins can't delete themselves; at least one admin must remain.
10. **Accept-invite UX:** what happens if the token is invalid/expired? Show clear error + link to `/signup` (maybe they want to create their own tenant).

---

## Recommended wave structure

- **Wave 1 (1 plan):** **54.1-01** — Migration 026 (`tenant_users` + backfill) + role middleware + Cognito Groups created. Requirements: `TenantUsersTable`, `RoleMiddleware`.
- **Wave 2 (parallel, 2 plans):**
  - **54.1-02** — Backend invite + accept endpoints (`routes/team.ts` + `routes/invites.ts`), SES invite email template, CloudFront `/accept-invite` rewrite, deploy ERP Lambda. Requirements: `InviteFlow`.
  - **54.1-03** — Frontend: replace `team.html` stub with real content, new `accept-invite.html`, deploy. Requirements: `TeamPage`.
- **Wave 3 (1 plan):** **54.1-04** — vitest install + 15+ tests + end-to-end smoke (signup tenant, invite test user, accept, role middleware allow/deny) + CHECKPOINT for 54.2. Requirements: `VitestBackendBootstrap` + all 5 closure-evidence.

---

## Reference paths

- ROADMAP entry: `.planning/ROADMAP.md` Phase 54.1
- Phase 54 CHECKPOINT.md: `.planning/phases/54-m6-modular-ui-shell-module-aware-navigation-redesign-add-on-catalog/CHECKPOINT.md` — has Phase 54.1 handoff with tenant_users schema sketch + requireRole skeleton + 5-plan scope
- Phase 52 signup endpoint (reference for atomic transaction pattern): `/Users/jeet/turion-space-demo/backend/src/routes/tenants.ts`
- Phase 53 tenantContext middleware (reference for cache pattern): `/Users/jeet/turion-space-demo/backend/src/middleware/tenant.ts`
- App shell: `/Users/jeet/turion-space-demo/app-shell.js` (the nav highlights `/team` when user clicks it)
- Frontend deploy: `/Users/jeet/turion-space-demo/deploy-frontend.sh`
- Backend deploy: `/Users/jeet/turion-space-demo/backend/build-and-push.sh`
- Global engineering rules: `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_global_engineering_rules.md`

---

*Written 2026-05-14. Autonomous mode. Researcher: run 54.1 inventory + write 54.1-RESEARCH.md, then planner produces 4 plans across 3 waves.*
