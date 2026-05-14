# Phase 41 CONTEXT — Cognito cutover + Supabase Auth removal (M1 final phase)

> Master handoff: `.planning/phases/40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256/CHECKPOINT.md` (415 lines). Read it first — it has the full 96-page migration inventory, deletion targets, must-not-break list, JWT claim mapping, and 3-plan outline.

---

## Phase 41 scope (verbatim from ROADMAP)

Replace `satelliteAuth`/`erpAuth` JS helpers with one `cognitoAuth`. Remove Supabase Auth from both frontends (still keeping the Supabase Postgres connection until M2). New `erp-login.html` + the satellite app's login both call `cognitoAuth.signInWithMagicLink`. Lambda middleware drops ES256/Supabase support — Cognito-only. Old Supabase auth.users rows archived. Magic-link UX preserved; user-facing behavior unchanged. **M1 complete.** ~2 plans.

**Requirement IDs (all 3 must be covered):**
- `CognitoOnlyFrontend`
- `CognitoOnlyBackend`
- `SupabaseAuthDeprecation`

---

## LOCKED DECISIONS — do not relitigate

| Topic | Decision | Source |
|---|---|---|
| Magic-link UX | Preserved exactly — user receives email, clicks, lands in app. The Cognito CUSTOM_AUTH flow (Phase 39) already produces this UX. | CONTEXT 40, ROADMAP |
| Frontend helper | Single `cognitoAuth` (already deployed in Phase 40). `erpAuth` + `satelliteAuth` retired. | Phase 40 CHECKPOINT §5 |
| Backend middleware | Cognito-only after this phase. Drop the Supabase ES256 branch + the `getSupabasePublicKey()` helper + `process.env.SUPABASE_JWT_PUBLIC_KEY` derivation. | Phase 40 CHECKPOINT §5 |
| Supabase Postgres | KEEP (until M2/Phase 42-43). Only Supabase **Auth** is removed. The DB connection stays. | ROADMAP, kickoff handover |
| `auth.users` rows | Archived (NOT deleted) — Phase 39 stamped `custom:supabase_sub` forward-link on every Cognito user. Keep Supabase `auth.users` read-only until M2 migration. | Phase 39 migration design |
| Login pages | `erp-login.html` + satellite login → use `cognitoAuth.signInWithMagicLink(email)`. Same email-form UX. New callback page `cognito-auth-callback.html` (both apps) parses URL token + calls `cognitoAuth.respondToChallenge`. | Phase 40 CHECKPOINT §5.4 |
| Lambda env vars to delete | `SUPABASE_JWT_SECRET_ARN` on both Lambdas (after middleware drops ES256 branch). | Phase 40 CHECKPOINT §5 |
| IAM grant to delete | `secretsmanager:GetSecretValue` on `turion-satellite/production/supabase-jwt-secret-*` on `zietra-api-lambda-role` (last cleanup task) | Phase 40 CHECKPOINT §5 |
| Migration script | Delete `backend/scripts/migrate-supabase-users-to-cognito.ts` (Rule 5 — one-shot is done) | Phase 39 plan-03 marked `// TEMPORARY` |
| Cognito-trigger Lambdas | UNTOUCHED (`zietra-cognito-*` × 4). They issue tokens; this phase consumes them. | Phase 40 scope discipline preserved |

---

## Page inventory (from Phase 40 CHECKPOINT §4)

Per the verifier's check: **96 pages** use `erpAuth`/`satelliteAuth` today (83 ERP + 13 satellite). Phase 41 migrates each by:

1. Adding `<script src="/cognito-auth.js">` (already deployed in Phase 40)
2. Replacing `erpAuth.requireSession()` / `satelliteAuth.requireSession()` → `cognitoAuth.requireSession()`
3. Replacing `erpApi.*` / `satelliteApi.*` calls that pull tokens from `erpAuth`/`satelliteAuth` storage → from `cognitoAuth` storage instead
4. Removing the Supabase JS UMD `<script>` tag (`@supabase/supabase-js`) — used only by the old helpers

The CHECKPOINT lists these pages explicitly. Plan should auto-generate a sed-based migration script.

---

## Deletion targets (from Phase 40 CHECKPOINT §5)

After all pages migrated:

| Target | Why | Where |
|---|---|---|
| `backend/scripts/migrate-supabase-users-to-cognito.ts` | One-shot done in Phase 39 (Rule 5) | turion-space-demo |
| `getSupabasePublicKey()` / `getSupabaseVerifyKey()` function | Dead after Cognito-only | both `backend/src/middleware/auth.ts` |
| Supabase verify branch in `requireAuth` | Dead after Cognito-only | both `auth.ts` |
| Supabase JWKS load block in `secrets.ts` | Dead — no longer reads `SUPABASE_JWT_SECRET_ARN` | both `backend/src/secrets.ts` |
| `SUPABASE_JWT_SECRET_ARN` env var | Dead | both Lambdas |
| `erp-auth.js` + `satellite-auth.js` | Dead — no page imports them after migration | turion-space-demo (root + satellite/) |
| Supabase JS UMD `<script>` tag | Dead — used only by the old helpers | all migrated HTML pages |
| `turion-satellite/production/supabase-jwt-secret-sWnNlr` secret | Dead after Lambdas redeployed without ES256 | AWS Secrets Manager (LAST step — only after deploy proves Cognito-only verify works) |
| `secretsmanager:GetSecretValue` IAM grant on supabase-jwt-secret | Dead — IAM cleanup | `zietra-api-lambda-role` |
| `@supabase/supabase-js` dependency | Dead in frontend if it was an npm dep (likely UMD-only, but check) | check `package.json` |

**Critical:** Do NOT delete the Supabase Postgres connection. `DATABASE_URL` / `DATABASE_URL_ARN` STAYS — Supabase Postgres remains the DB until M2.

---

## Must-not-break list (from Phase 40 CHECKPOINT §6)

- **Turion's Thursday demo** — runs on the current stack. Phase 41 must produce equivalent functionality with Cognito (login page works, sessions persist, protected routes return data).
- **4 Cognito-trigger Lambdas** (`zietra-cognito-*`) — they issue tokens; do NOT touch.
- **KMS CMK** `arn:aws:kms:us-east-1:134607809447:key/fd1706a7-...` — Cognito needs this to call Custom Email Sender Lambda.
- **4 migrated users** (`demo@zietra.com`, `gteshnair@gmail.com`, `jm@techcloudpro.com`, `jeetnair.in@gmail.com`) — all CONFIRMED, all in `admin` Cognito Group, all carry `custom:supabase_sub` forward-link.
- **Supabase Postgres database connection** — both Lambdas keep using it for data (only Auth is removed).
- **Phase 38 ERP audit gate** — `npm run audit-buttons` 0 violations across both frontends.

---

## Open follow-ups (carried from Phase 40)

- **SES prod-access reopen** (AWS Console — case `176066476400763` was DENIED). Non-blocking for Phase 41 (sandbox limit fine for 4 users).
- **`demo@zietra.com` SES verify click** (Phase 39 left it pending). Phase 41 may need this for non-jm email tests, but jm@techcloudpro.com is verified and sufficient for smoke.
- **Resend API key rotation** (security follow-up, unrelated to Phase 41).

---

## Engineering rules (PERMANENT — apply during execution)

- **Rule 1:** Pool ID, client ID, region — read from `zietra/cognito-config` at runtime. NEVER hardcode in source.
- **Rule 3:** Final smoke MUST prove all 96 migrated pages work — automated test, not manual. Use Playwright or a curl-based check per-page.
- **Rule 4 (workflow uniformity):** Both frontends migrated with the SAME pattern. Mirror the migration logic.
- **Rule 5:** Remove dead code aggressively — this phase IS the cleanup phase.
- **Rule 6:** Do NOT add new features (no MFA, no SSO, no admin UI). Just cut over.

---

## Autonomous mode — user has authorized full autonomy through end of M1

- Skip ALL human-action checkpoints. Defer with log note if unavoidable.
- No "ask user before X" prompts.
- Push commits, deploy, run smokes, verify — all without waiting.
- Final exit point: M1 module complete (Phase 41 verified passed → ROADMAP closed → STATE shows "M1 done").

---

## Reference paths

- Phase 40 CHECKPOINT (MASTER for Phase 41): `.planning/phases/40-m1-replace-lambda-jwt-middleware-supabase-es256-cognito-rs256/CHECKPOINT.md`
- Phase 40 SUMMARYs: `.planning/phases/40-m1-.../40-0{1,2,3,4}-SUMMARY.md`
- Phase 40 smoke script (reuse for Phase 41 final smoke): `/Users/jeet/turion-space-demo/scripts/smoke-phase-40.sh`
- Phase 38 ERP migration pattern (mirror for cognito-auth.js page injection): the Phase 38 inject-erp-auth.mjs script
- Both backend middleware files: `/Users/jeet/turion-space-demo/backend/src/middleware/auth.ts` + `/Users/jeet/turion-satellite/backend/src/middleware/auth.ts`
- Both secrets.ts files: `/Users/jeet/turion-space-demo/backend/src/secrets.ts` + `/Users/jeet/turion-satellite/backend/src/secrets.ts`
- Deploy scripts: `turion-satellite/build-and-push.sh` + `turion-space-demo/backend/build-and-push.sh` + `turion-space-demo/deploy-frontend.sh`
- Global engineering rules: `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/feedback_global_engineering_rules.md`

---

*Written 2026-05-14 by the autonomous Phase 41 orchestrator. Planner: read the Phase 40 CHECKPOINT first, then this file, then verify the 96-page count via grep.*
