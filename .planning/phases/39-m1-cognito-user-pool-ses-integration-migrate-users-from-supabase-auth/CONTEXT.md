# Phase 39 CONTEXT — Cognito user pool + SES integration + Supabase Auth migration

> Synthesized 2026-05-14 from the handover doc, STATE.md, NEXT_SESSION.md, and the locked-decisions table. The handover is authoritative — read it first:
> `/Users/jeet/.claude/handoffs/2026-05-14-zietra-platform-milestone-kickoff.md`

---

## Phase 39 scope (verbatim from ROADMAP)

Stand up AWS Cognito as the platform's user-identity service. Configure a Cognito user pool with custom email templates that send via the SES SMTP that's already provisioned (`zietra/ses-smtp-credentials`). Migrate the existing Supabase Auth users (small set — the user + a few demo accounts) into Cognito with their email + role attributes. **Don't cut over the Lambdas yet — Phase 40 does that.**

End state: Cognito user pool exists, can be authenticated against, sends magic-link emails via SES from `noreply@zietra.com`, has all current users with their attributes preserved. Test by `aws cognito-idp admin-initiate-auth` succeeding for a migrated user. **Both backends still use Supabase Auth JWTs** during this phase — no Lambda code change.

**Requirement IDs (all 4 must be covered):**
- `CognitoUserPool`
- `CognitoSesIntegration`
- `UserMigrationFromSupabase`
- `CognitoAuthCheckpoint`

---

## LOCKED DECISIONS — do not relitigate

From the kickoff session:

| Topic | Decision |
|---|---|
| Auth provider | **AWS Cognito** (replacing Supabase Auth) |
| Cognito JWT alg | **RS256** (Supabase uses ES256 — different verify path; matters for Phase 40, not 39) |
| Magic-link UX | Preserve exactly — same email, same flow, same callback URL |
| Email sender | `noreply@zietra.com` via SES |
| Email transport | Cognito's **Custom Email Sender Lambda trigger** (NOT raw SES API in Cognito email config — Cognito's SES integration is limited to plain text; Custom Sender Lambda allows our existing branded templates) |
| Cognito email config | Use `EmailSendingAccount: DEVELOPER` with the Custom Sender Lambda trigger |
| Tenancy | **Single user pool** for all tenants (cheaper, simpler — `tenant_id` lives in custom attributes + DB, not in a pool boundary) |
| User attributes preserved | `email` (lowercase normalized), `role` (customer/driver/vendor/admin), `created_at`, anything in Supabase `auth.users.raw_user_meta_data` |
| Region | `us-east-1` (everything is here) |
| AWS account | `134607809447` |

---

## Why Phase 39 is hard NOT to over-scope

The temptation is to start cutting over the Lambdas now. **Don't.** Phase 39's job is:

1. Build the Cognito user pool + its SES email path.
2. Migrate users into it.
3. Prove auth works via `aws cognito-idp admin-initiate-auth` (CLI only — no app code uses Cognito yet).

Phase 40 owns the Lambda middleware switch (dual-issuer JWT verify). Phase 41 owns full cutover + Supabase Auth removal.

If you find yourself touching `turion-satellite-api` or `turion-demo-api` Lambda code in Phase 39, **stop** — that's Phase 40.

---

## Pre-conditions / what's already in place

| Resource | State | Where |
|---|---|---|
| SES domain `zietra.com` | Verified · DKIM SUCCESS · MAIL FROM SUCCESS · DMARC live · apex SPF live | Route 53 zone `Z090201115UMJZ8TIAX5G` |
| SES sandbox | **YES** — 200/day, 1/sec, verified recipients only | Account dashboard. Prod-access reopen pending User (task #19) |
| SES SMTP creds | IAM user `ses-smtp-supabase`, creds in Secrets Manager `zietra/ses-smtp-credentials-RsRKSm` | **Do NOT re-create** — Supabase uses them |
| Supabase project | Live, schemas `turion` + `turion_satellite` + `auth` + `storage` | URL `https://lbpkbpfwdpnwlccmlfxn.supabase.co` |
| Supabase auth.users | Small set (user + demo accounts) — researcher inventories | Query via Supabase Postgres |
| Route 53 hosted zone | `zietra.com` → `Z090201115UMJZ8TIAX5G` | Owns DNS for any new Cognito custom-domain records if needed |
| Lambda IAM | Both Lambdas share `zietra-api-lambda-role` (reused via Phase 38) | New Cognito-trigger Lambda needs its own role or extension to this one |

---

## What's NOT in place yet (Phase 39 creates)

- Cognito user pool itself
- Cognito app client(s)
- Custom Sender Lambda trigger (sends via SES SMTP)
- KMS key for the Custom Sender encryption (Cognito requires KMS to call the Custom Sender Lambda — KMS encrypts the verification code in transit)
- IAM roles for the Cognito service to invoke the Lambda + the Lambda to send via SES
- Email templates (magic-link HTML, sign-up confirmation, password reset — even if we only use magic-link initially)

---

## Migration strategy — researcher decides, but the spec is small

Given the user count is tiny (user + a few demo accounts):
- **Live cutover** (admin-create users in Cognito with `MessageAction: SUPPRESS`, set permanent password via `AdminSetUserPassword`, mark `email_verified: true`) is the simplest and is preferred unless researcher finds a reason against it.
- **Dual-write** is over-engineered for this scale.
- **Lazy backfill** (migrate on first login) requires Lambda middleware that's NOT in scope for Phase 39 — defer to Phase 41 if needed.

Researcher must:
1. Query Supabase `auth.users` — get exact count, attribute shape, what's in `raw_user_meta_data`.
2. Inventory the JWT claims that the Lambda middleware currently reads (so Phase 40 knows what to preserve when issuing Cognito tokens). The current Supabase JWTs have `sub`, `email`, `role`, `exp`. Map each to a Cognito equivalent (`sub`, `email`, `cognito:groups` or `custom:role`).
3. Recommend whether to use Cognito **Groups** (`admin`, `customer`, `driver`, `vendor`) for roles or a **custom attribute** (`custom:role`). Groups are cleaner for IAM + map nicely to `cognito:groups` JWT claim, but require explicit `AdminAddUserToGroup` per migration.

---

## SES sandbox handling

Cognito's Custom Sender Lambda calls `ses:SendEmail` via the Lambda's IAM role — **NOT** the SMTP creds (those are for Supabase). The Lambda's IAM role needs `ses:SendEmail` on `zietra.com`.

While SES is in SANDBOX:
- Magic-link emails will only land for **verified recipients** in SES.
- The user's own email + the demo addresses must be added to "Verified identities" in SES Console before Phase 39's smoke test will pass.
- Plan must include a "verify these N recipient emails in SES" task OR list it as a USER-action follow-up. Don't proceed assuming inbox delivery for arbitrary addresses.

When prod-access lands (task #19), the same Lambda code works — sandbox/prod is account-level, not per-resource.

---

## Critical pitfalls (from the handover)

1. **Cognito JWTs are RS256, Supabase JWTs are ES256.** Phase 39 doesn't switch the verifiers — Lambdas keep verifying Supabase JWTs. But the user pool MUST be configured to issue RS256 (it's the default — just don't change it).
2. **Cognito Custom Sender Lambda requires a KMS key for code encryption.** This is a Cognito requirement, not optional. Create a CMK in `us-east-1`, grant Cognito + the Lambda usage.
3. **Email-case normalization.** Supabase `auth.users.email` is case-sensitive in some places, case-insensitive in others. When inserting into Cognito, lowercase the email. Set `email_verified: true` to avoid re-verification.
4. **Don't break the Turion Thursday demo.** Turion's stack runs on Supabase Auth — Phase 39 does NOT touch the Lambdas, so the demo is safe. But: if any "live cutover" step modifies Supabase's `auth.users` rows, **don't** — Cognito users are NEW rows in a NEW system; Supabase rows stay until Phase 41.
5. **SES is in SANDBOX.** Sandbox-aware test plan: verify recipient addresses in SES first, then test magic-link delivery to them only.
6. **Cognito hosted UI is NOT in scope for Phase 39.** Hosted UI is a separate decision (custom domain + ACM cert in us-east-1 + SES sandbox interactions). Stick to SDK-driven flows.

---

## Global Engineering Rules apply (PERMANENT)

All 6 rules in `memory/feedback_global_engineering_rules.md`. Phase-39-relevant excerpts:

- **Rule 1 (no hardcoded DB-derivable values):** Cognito user pool ID, client ID, region — read from env vars / Secrets Manager, never literal in code.
- **Rule 3 (no shortcuts, no assumptions):** Before claiming a user is migrated, query Cognito (`aws cognito-idp admin-get-user`) — don't trust the migration script's stdout.
- **Rule 5 (remove dead code):** If the migration script is a one-shot, mark it `// TEMPORARY: delete after Phase 41 cutover` and add it to a Phase-41 cleanup task.
- **Rule 6 (no unnecessary code):** Don't pre-build Cognito features we don't need yet (MFA, SAML, federated identity, advanced security). Magic-link via Custom Sender Lambda only.

---

## Reference paths

- Handover (master context): `/Users/jeet/.claude/handoffs/2026-05-14-zietra-platform-milestone-kickoff.md`
- NEXT_SESSION quick-ref: `/Users/jeet/doordash-p2p/.planning/NEXT_SESSION.md`
- STATE top-block: `/Users/jeet/doordash-p2p/.planning/STATE.md` (top, "Current Position")
- Global engineering rules: `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_global_engineering_rules.md`
- Supabase Auth migration (Phase 38 pattern to mirror): `/Users/jeet/turion-space-demo/backend/src/middleware/auth.ts` + `backend/src/secrets.ts` (cold-start JWKS load — Phase 40 will do the equivalent for Cognito)
- Roadmap entry: `.planning/ROADMAP.md` — search "Phase 39"

---

## Open questions for the researcher to resolve

1. Exact count + shape of Supabase `auth.users` rows (run a SELECT).
2. Whether to use Cognito Groups vs `custom:role` for role assignment (preference: Groups).
3. Whether to provision Cognito via AWS Console click-ops, CloudFormation, Terraform, or AWS SDK script. (Preference: a script in `infrastructure/` we can re-run, that's idempotent. CloudFormation if a stack already exists, otherwise plain `aws cognito-idp` CLI in a shell script.)
4. Where the Custom Sender Lambda source lives (preference: a new tiny repo or `/Users/jeet/turion-space-demo/lambdas/cognito-custom-sender/` — but research current monorepo conventions).
5. KMS CMK alias name + tag (preference: `alias/cognito-custom-sender`, tag `Service=cognito-email`).

---

*Synthesized 2026-05-14 from the handover. Researcher: read the handover, then this file, then ROADMAP.md Phase 39, then run your inventory queries.*
