---
phase: 309-phase-2b-identity-stack-brandmonkz-sende
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "/Users/jeet/Documents/CRM Module/src/routes/emailTracking.ts"
  - "/Users/jeet/Documents/CRM Module/src/routes/email-log.ts"
  - "/Users/jeet/Documents/CRM Module/src/app.ts"
  - "/Users/jeet/techcloudpro/api/identify-from-email.php"
  - "/var/www/crm-backend/backend/.env (BrandMonkz prod, via SSH — NEW env var TCP_IDENTITY_TOKEN)"
  - "AWS Secrets Manager: brandmonkz/production/tcp-identity-shared-secret (NEW)"
autonomous: true
requirements:
  - "TCP-IDENTITY-2B"
must_haves:
  truths:
    - "PII-touching: a new public-shaped (token-gated) BrandMonkz endpoint returns email/firstName+lastName/company.name from the EmailLog→Contact→Company join."
    - "Cross-system change: BrandMonkz Node/TypeScript + AWS Secrets Manager + PM2-managed prod .env + TechCloudPro PHP + Hostinger — five surfaces must agree on the same secret."
    - "Live email infrastructure: bug in the click handler corrupts ALL outbound campaign links — every recipient who clicks a TCP link is affected. Safe-fail (try/catch around URL mutation, fall back to original URL) is non-negotiable."
    - "Stub-flag flip is the ONE-WAY gate: once TCP_IDENTITY_STUB=false ships to Hostinger, the synthetic-body branch is dead and only real BM lookups identify visitors. Must be flipped LAST, only after BM-side endpoint + click-redirect mutation are live + smoke-tested."
    - "Atomic deploy on BM side: new endpoint + click-redirect change ship in one PM2 restart cycle. Half-deploy makes click links inject _tcp_uid that the stub-flagged TCP endpoint cannot validate (or vice versa)."
  artifacts:
    - path: "/Users/jeet/Documents/CRM Module/src/routes/email-log.ts"
      provides: "GET /api/email-log/:emailLogId/contact — token-gated lookup. Returns {email, name, company} or 401/404. Logs only emailLogId + result + latency, NEVER PII."
      min_lines: 50
    - path: "/Users/jeet/Documents/CRM Module/src/routes/emailTracking.ts"
      provides: "Click handler at line 295 patched: when redirect URL hostname matches techcloudpro.com (any subdomain), append ?_tcp_uid=<emailLogId> (or & if URL already has query). Wrapped in try/catch with safe-fail to original URL on any URL parsing error."
    - path: "/Users/jeet/Documents/CRM Module/src/app.ts"
      provides: "Mounts the new email-log routes at /api/email-log."
    - path: "/Users/jeet/techcloudpro/api/identify-from-email.php"
      provides: "TCP_BM_SHARED_SECRET placeholder replaced with real 64-hex secret; TCP_IDENTITY_STUB flipped from true to false. Stub branch becomes dead code."
    - path: "AWS Secrets Manager: brandmonkz/production/tcp-identity-shared-secret"
      provides: "64-char hex secret (openssl rand -hex 32). Single source of truth. Stored AES256, payload {\"TCP_IDENTITY_SHARED_SECRET\":\"<hex>\"}. Same pattern as brandmonkz/production/resend-hello-artha-build."
    - path: "/var/www/crm-backend/backend/.env (Hostinger NOT applicable — BrandMonkz EC2 100.24.213.224)"
      provides: "TCP_IDENTITY_TOKEN=<hex>. Read at boot via PM2 env_file plumbing in ecosystem.config.js — NO ecosystem.config.js change needed; existing env_file path /var/www/crm-backend/backend/.env already loads it."
  key_links:
    - from: "BrandMonkz click redirect (emailTracking.ts:~410)"
      to: "TCP inline JS hook (techcloudpro.com index.html / ai-playground.html lines 9-22, deployed in 308)"
      via: "?_tcp_uid=<emailLogId> query param injected by BM into the 302 Location header"
      pattern: "Location header on /api/tracking/click/<id>?url=https://techcloudpro.com/... contains _tcp_uid=<id>"
    - from: "TCP /api/identify-from-email.php (Hostinger)"
      to: "BrandMonkz /api/email-log/:id/contact (EC2)"
      via: "cURL GET with X-Identity-Token header (3s timeout, 2s connect timeout — already coded in 308)"
      pattern: "TCP cURL request hits BM endpoint, BM verifies header against TCP_IDENTITY_TOKEN env, returns {email,name,company} or 401/404"
    - from: "Phase 2a SUMMARY"
      to: ".planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md"
      via: "documented stub flag location + placeholder secret + cURL contract"
      pattern: "TCP_IDENTITY_STUB / TCP_BM_SHARED_SECRET / GET <BM>/api/email-log/<id>/contact"
    - from: "BrandMonkz endpoint to Prisma"
      to: "EmailLog.contact (required relation, schema.prisma:712) → Contact.firstName + lastName + company → Company.name"
      via: "prisma.emailLog.findUnique({where:{id}, include:{contact:{include:{company:true}}}})"
      pattern: "Schema confirms: EmailLog.contactId is NOT NULL with onDelete:Cascade — but a 404 path is still required because emailLogId may simply not exist."
---

<objective>
Wire the email-click identity chain end-to-end. Phase 2a (308) shipped the TCP receiver in stub mode. Phase 2b ships the BrandMonkz sender side (new lookup endpoint + click-redirect mutation that injects ?_tcp_uid into TCP-bound URLs), generates the shared secret, plumbs it through AWS Secrets Manager → PM2 .env → TCP PHP, then flips TCP_IDENTITY_STUB=false. After this phase, real BrandMonkz email recipients clicking any techcloudpro.com link in a tracked email become identified visitors with source_form='email-click' on TCP, with their email/name/company resolved server-side via BM API (NOT trusted from client).

Purpose: Close the open identity-injection surface created by stub mode (308 SUMMARY flagged this as the #1 follow-up). Real campaign clicks → real identified visitors → stats.php top_visitors with named prospects.

Output:
- New BM endpoint (token-gated, PII-aware logging discipline, Prisma null-safe).
- BM click handler that injects opaque emailLogId into the redirect URL ONLY for techcloudpro.com hostnames.
- Real shared secret in AWS SM + PM2 prod .env + TCP PHP — three-way agreement.
- Stub flag flipped, stub branch becomes dead code (cleanup deferred to a future task).
- Live E2E proof: real test email → click TCP link → identified_visitors row with real email/name (not stub data).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/.planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md
@/Users/jeet/Documents/CRM Module/src/routes/emailTracking.ts
@/Users/jeet/Documents/CRM Module/src/app.ts
@/Users/jeet/Documents/CRM Module/prisma/schema.prisma
@/Users/jeet/Documents/CRM Module/deploy.sh
@/Users/jeet/Documents/CRM Module/ecosystem.config.js
@/Users/jeet/techcloudpro/api/identify-from-email.php
</context>

<ground_truth_findings>
The planner already verified these — executor must NOT re-research, but MUST stop and ask if any of these turn out wrong:

1. **Schema (prisma/schema.prisma:655-723)** — EmailLog has REQUIRED `contactId` and required relation `contact Contact @relation(...) onDelete:Cascade`. Contact (line 239) has `firstName: String` + `lastName: String` (NOT a single `name` field) and `companyId: String?` → optional `company Company?`. Company (line 306) has `name: String`.
   - **Concatenate name as**: `[firstName, lastName].filter(Boolean).join(' ').trim()` — handle whitespace properly.
   - **Company is optional**: return `company.name ?? ''` (empty string, not null) — TCP PHP expects string fields.
   - **404 path still needed**: emailLogId may not exist. Even though contact is required-by-schema, defensive-code the contact null check anyway (cascading deletes can race).

2. **Source of truth for click handler is `.ts` NOT `.js`** — `src/app.ts:63` imports from `./routes/emailTracking` which resolves to `emailTracking.ts` (TS prefers `.ts`). The `.js` file at `src/routes/emailTracking.js` is legacy/orphaned. Edit ONLY `emailTracking.ts`.

3. **Existing `validateRedirectUrl()` in `.ts` already allows techcloudpro.com** — it only blocks localhost / private IPs / non-http(s) schemes (lines 261-291). The `.js` allowlist that only allows `brandmonkz.com` is dead code. So Phase 2b ONLY adds the `?_tcp_uid` injection, does NOT need to change validation logic. (Sanity check: confirm `validateRedirectUrl('https://techcloudpro.com/foo')` returns `true` against the `.ts` source — already the case.)

4. **PM2 secret plumbing** — `ecosystem.config.js:146` uses `env_file: BACKEND_ENV_PATH` where `BACKEND_ENV_PATH = /var/www/crm-backend/backend/.env`. So we add `TCP_IDENTITY_TOKEN=<hex>` to the prod `.env` file directly via SSH. **Do NOT modify ecosystem.config.js** — that pattern matches existing SMTP/Resend secrets which also live in `.env`.

5. **Mount point** — `src/app.ts:438` uses `app.use('/api/tracking', emailTrackingRoutes)`. New route mounts at a sibling path: `app.use('/api/email-log', emailLogRoutes)`. Add the import and the `app.use` line; pick a sensible nearby spot in app.ts.

6. **Click query-string** — handler at `src/routes/emailTracking.ts:298` reads `const { url, cta } = req.query`. The destination URL comes via `?url=` (NOT `?dest=`). All curl tests must use `?url=`.

7. **Uncommitted changes in BM repo** — confirmed 19 modified files in frontend/, several modified .ts files in src/, plus untracked design docs. Use `git add <specific-file>` for ONLY the files we touch. Never `git add -A` or `git add .`.
</ground_truth_findings>

<tasks>

<task type="auto">
  <name>Task 1: Local dev — preflight, write all code (BM endpoint + click mutation + TCP secret/flip placeholders), DO NOT deploy</name>
  <files>
    /Users/jeet/Documents/CRM Module/src/routes/email-log.ts (NEW)
    /Users/jeet/Documents/CRM Module/src/routes/emailTracking.ts (PATCH — click handler URL mutation only)
    /Users/jeet/Documents/CRM Module/src/app.ts (PATCH — mount /api/email-log routes)
    /Users/jeet/techcloudpro/api/identify-from-email.php (PATCH — leave both placeholders for now; flip in Task 3)
  </files>
  <action>
    **STEP 1.0 — PREFLIGHT (STOP-AND-ASK gates):**

    a. `cd "/Users/jeet/Documents/CRM Module" && git status --short` — confirm pre-existing uncommitted changes match what's known (19 frontend, ~6 src, untracked design docs from prior work). If anything looks WORSE than expected (e.g., conflict markers, half-merged files), STOP and ask the user.

    b. `cd "/Users/jeet/Documents/CRM Module" && npm run build` — must succeed against the CURRENT tree BEFORE we write any code. If TS build fails on existing pre-existing TS errors, STOP and ask the user. Do NOT auto-fix unrelated TS errors.

    c. Re-read `/Users/jeet/Documents/CRM Module/prisma/schema.prisma` lines 655-723 (EmailLog model) and 239-303 (Contact model) and 306-340 (Company model). Confirm:
       - `EmailLog.contactId` is required (no `?`), `contact Contact @relation(... onDelete:Cascade)`.
       - `Contact.firstName String` + `Contact.lastName String` + `Contact.companyId String?` → `company Company?`.
       - `Company.name String`.
       If schema differs from these expectations (e.g., relation is optional, single `name` field, no company), STOP and ask the user how to proceed.

    d. Confirm `ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 'whoami'` succeeds. If SSH fails, STOP — Task 2 deploy will fail.

    e. Confirm `aws sts get-caller-identity --profile default` (or whatever default profile is configured) returns account `134607809447` in `us-east-1`. Test secret read access with `aws secretsmanager describe-secret --secret-id brandmonkz/production/resend-hello-artha-build --region us-east-1` — should succeed. If AWS creds unavailable, STOP and ask the user.

    **STEP 1.1 — Create new endpoint `src/routes/email-log.ts`:**

    Express Router with ONE route: `GET /:emailLogId/contact`.

    Behavior:
    - Read `X-Identity-Token` header. If absent or `!== process.env.TCP_IDENTITY_TOKEN` → respond 401 with `{error: "unauthorized"}`. ALSO 401 (not 500) if `process.env.TCP_IDENTITY_TOKEN` is undefined or empty — fail closed. Use `crypto.timingSafeEqual` for the comparison if both lengths match (otherwise short-circuit to 401 BEFORE comparing to avoid timing oracle on length).
    - Validate `:emailLogId` matches `/^[A-Za-z0-9_-]{1,64}$/` (cuid-safe). If not → 404 `{error: "not_found"}`.
    - Lookup: `prisma.emailLog.findUnique({ where: { id: emailLogId }, include: { contact: { include: { company: true } } } })`.
    - If `emailLog === null` OR `emailLog.contact == null` → 404 `{error: "not_found"}` (neutral message, never expose which condition).
    - Build response: `{ email: contact.email ?? "", name: [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim(), company: contact.company?.name ?? "" }`. If `email` is empty string → 404 (TCP requires email; treat as not_found rather than returning incomplete data).
    - Wrap entire handler in try/catch. On exception: log opaque error (NO emailLogId, NO PII) and return 500 `{error: "internal"}`. (500 is OK here — TCP cURL will degrade to {ok:false} on non-200.)

    Logging discipline (NON-NEGOTIABLE):
    - Log start: `console.log('[email-log] req', { id: emailLogId.slice(0, 8) + '...', hasToken: !!req.headers['x-identity-token'] })` — log only first 8 chars of id, not the full string, and a boolean of token presence (not the token itself).
    - Log end: `console.log('[email-log] res', { id: emailLogId.slice(0, 8) + '...', status, ms: Date.now() - startMs })`.
    - **NEVER** log: `email`, `name`, `company`, `firstName`, `lastName`, full `emailLogId`, the actual token value.

    Imports: `Router, Request, Response from 'express'`, `PrismaClient from '@prisma/client'`, `timingSafeEqual from 'crypto'`. Match the pattern of `src/routes/emailTracking.ts` lines 1-5 (single `prisma` instance — but for safety create a new one in this file; existing pattern shows other routes do the same).

    Export: `export default router;`.

    Rate-limiting: Check if `src/middleware/` has an existing rate-limit middleware (`grep -r "express-rate-limit\|rateLimit\|rate-limit" src/middleware/ src/app.ts`). If yes, apply it to this route at 100 req/min per IP. If not, **DO NOT** introduce a new dependency — instead add a code comment `// TODO(Phase X): rate-limit when express-rate-limit middleware lands` and proceed. Document in SUMMARY as a Phase X follow-up.

    **STEP 1.2 — Mount in `src/app.ts`:**

    Edit ONLY 2 lines:
    - Add `import emailLogRoutes from "./routes/email-log";` near line 63 (next to the existing `import emailTrackingRoutes from "./routes/emailTracking";`).
    - Add `app.use('/api/email-log', emailLogRoutes);` near line 438 (next to `app.use('/api/tracking', emailTrackingRoutes);`).

    Confirm with `grep -n "email-log\|emailLogRoutes" src/app.ts` — exactly 2 matches.

    **STEP 1.3 — Patch `src/routes/emailTracking.ts` click handler — URL mutation ONLY:**

    Locate lines 408-420 area (the redirect block: `if (url && validateRedirectUrl(url)) { res.redirect(url); }`).

    Replace the redirect-execution block with logic that:
    1. If validation fails → fall through to default redirect (no change to existing semantics).
    2. If validation passes → wrap URL mutation in try/catch:
       ```ts
       let finalUrl = url;
       try {
         const parsed = new URL(url);
         const isTcp = parsed.hostname === 'techcloudpro.com' || parsed.hostname.endsWith('.techcloudpro.com');
         if (isTcp) {
           parsed.searchParams.set('_tcp_uid', emailLogId);
           finalUrl = parsed.toString();
         }
       } catch (e) {
         // Safe-fail: malformed URL or any mutation error → use original URL unchanged.
         finalUrl = url;
       }
       res.redirect(finalUrl);
       ```

    Hostname check semantics:
    - `parsed.hostname === 'techcloudpro.com'` — apex.
    - `parsed.hostname.endsWith('.techcloudpro.com')` — any subdomain (www., blog., etc.).
    - **DO NOT** use `parsed.hostname.includes('techcloudpro.com')` — that matches `techcloudpro.com.evil.com` (hostname spoof).

    Query-param semantics:
    - Use `URL.searchParams.set('_tcp_uid', emailLogId)` — automatically uses `&` if other params exist, `?` if not. Handles encoding. **DO NOT** hand-construct query strings.
    - If `_tcp_uid` somehow already in URL (unlikely but possible — campaign template injected one manually), `set()` overwrites it with the canonical emailLogId. Acceptable.

    **STEP 1.4 — Verify TS still builds:**

    `npm run build` — must succeed. If it fails, fix the new code (NOT pre-existing files).

    **STEP 1.5 — DO NOT TOUCH `/Users/jeet/techcloudpro/api/identify-from-email.php` YET.**

    The placeholder + stub flag stay in place until Task 3. This is part of the "deploy BM first, flip TCP last" sequencing.

    **Atomic commit (BM repo only — TCP repo untouched):**

    `cd "/Users/jeet/Documents/CRM Module"` then add ONLY the files we touched, individually:
    ```bash
    git add src/routes/email-log.ts
    git add src/routes/emailTracking.ts
    git add src/app.ts
    git diff --cached --stat   # confirm exactly 3 files staged, no others
    git commit -m "feat(api): TCP identity-stack phase 2b — BM lookup endpoint + click-redirect _tcp_uid injection"
    ```
    DO NOT push. DO NOT use `-A` or `.`. If `git diff --cached --stat` shows any other file (e.g. one of the pre-existing modifieds), STOP and ask the user.
  </action>
  <verify>
    Run all of these and capture verbatim outputs for the SUMMARY:

    1. `cd "/Users/jeet/Documents/CRM Module" && npm run build 2>&1 | tail -5` — exits 0.
    2. `ls -la dist/routes/email-log.js dist/routes/emailTracking.js dist/app.js` — all three present.
    3. `grep -c "_tcp_uid" dist/routes/emailTracking.js` — at least 1.
    4. `grep -c "TCP_IDENTITY_TOKEN" dist/routes/email-log.js` — at least 1.
    5. `grep -c "timingSafeEqual" dist/routes/email-log.js` — exactly 1.
    6. `grep -c "console.log" dist/routes/email-log.js` AND that the source file `src/routes/email-log.ts` does NOT log any of: `firstName`, `lastName`, `email`, `company`, `\${contact` — `grep -nE 'firstName|lastName|company\.|email[^L]' src/routes/email-log.ts | grep -i "console\."` — ZERO matches.
    7. `cd "/Users/jeet/Documents/CRM Module" && git log -1 --format=%H%n%s%n%n && git diff HEAD~1 HEAD --stat` — confirm only 3 files in commit, with sane line counts (~50-100 added for email-log.ts, ~10-15 for emailTracking.ts, ~2 for app.ts).
    8. `git status --short | grep -v "^??" | grep -v frontend/ | grep -v "src/routes/campaigns\|src/routes/deals\|src/routes/pricing\|src/routes/systemTemplates\|src/services/ai-orchestrator\|src/services/awsSES"` — should be EMPTY (we only touched files NOT in the pre-existing modified set).
  </verify>
  <done>
    - `email-log.ts` written with token gate, regex check, Prisma include, null-safe response, no-PII logging, try/catch wrapper.
    - `emailTracking.ts` click handler injects `?_tcp_uid=<emailLogId>` for TCP hostnames only, with try/catch safe-fail to original URL.
    - `app.ts` mounts new routes at `/api/email-log`.
    - `npm run build` passes with the new code in dist/.
    - One atomic git commit on BM repo with EXACTLY 3 files (email-log.ts, emailTracking.ts, app.ts).
    - Pre-existing uncommitted files in BM repo are UNTOUCHED (still showing in `git status` with same M/?? markers as before).
    - TCP PHP file unchanged. Stub flag still true. Hostinger NOT touched.
  </done>
</task>

<task type="auto">
  <name>Task 2: Generate secret → AWS SM → BM .env on EC2 → deploy BM (build + rsync + PM2 restart) → smoke tests A+B</name>
  <files>
    AWS Secrets Manager: brandmonkz/production/tcp-identity-shared-secret (CREATE)
    /var/www/crm-backend/backend/.env (UPDATE on EC2 100.24.213.224 via SSH — append TCP_IDENTITY_TOKEN line)
    /var/www/crm-backend/backend/dist/ (REPLACE via rsync, preserves PM2 config)
  </files>
  <action>
    **STEP 2.0 — Generate the shared secret:**

    `SECRET=$(openssl rand -hex 32)` — 64-char hex. Store ONLY in shell variable for this task; NEVER echo it to the SUMMARY, commit log, or any file we save.

    Sanity check: `echo -n "$SECRET" | wc -c` → exactly 64.

    **STEP 2.1 — Store in AWS Secrets Manager:**

    ```bash
    aws secretsmanager create-secret \
      --region us-east-1 \
      --name brandmonkz/production/tcp-identity-shared-secret \
      --description "Shared HMAC token for TCP /api/identify-from-email.php → BM /api/email-log/<id>/contact. Phase 2b (309)." \
      --secret-string "{\"TCP_IDENTITY_SHARED_SECRET\":\"$SECRET\"}"
    ```

    If the secret already exists from a prior failed run, use `aws secretsmanager put-secret-value --secret-id ... --secret-string ...` instead.

    Verify (without printing the secret): `aws secretsmanager describe-secret --secret-id brandmonkz/production/tcp-identity-shared-secret --region us-east-1 --query 'ARN'` returns a valid ARN.

    **STEP 2.2 — Plumb secret to BM prod `.env`:**

    SSH to BM EC2 and append the env var:
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "echo 'TCP_IDENTITY_TOKEN=$SECRET' | sudo tee -a /var/www/crm-backend/backend/.env > /dev/null && \
       sudo grep -c '^TCP_IDENTITY_TOKEN=' /var/www/crm-backend/backend/.env"
    ```
    The grep at the end should return exactly `1`. If it returns `2` or more (line already existed from a previous run), STOP and remediate manually with `sudo sed -i '/^TCP_IDENTITY_TOKEN=/d' .env` then re-append.

    DO NOT print the .env file contents. DO NOT cat it back.

    **STEP 2.3 — Pre-deploy: check immutability of `dist/routes/emailTracking.js` (memory note: campaigns.js was made immutable with chattr +i):**

    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "lsattr /var/www/crm-backend/backend/dist/routes/emailTracking.js 2>&1 || echo 'FILE_NOT_LSATTR'"
    ```
    Expected: an `lsattr` output line. If the `i` flag is set (e.g. `----i--------------- /var/www/...`), STOP and ask the user before proceeding (we'd need to chattr -i to deploy, then chattr +i back — only do this with explicit consent). If the `i` flag is NOT set, proceed.

    Also check the new file's parent dir:
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "lsattr /var/www/crm-backend/backend/dist/routes/ | grep -E '^[-]+i'"
    ```
    Should be empty (no immutable files in routes/). If anything has `i`, STOP and ask.

    **STEP 2.4 — Run the official deploy script (atomic):**

    ```bash
    cd "/Users/jeet/Documents/CRM Module"
    bash deploy.sh 2>&1 | tee /tmp/309-deploy.log
    ```

    The script does: `npm run build` → SSH `pm2 stop crm-backend` → rsync dist/ + prisma/ → `npx prisma generate` → `pm2 start dist/server.js --name crm-backend` → health check `curl https://brandmonkz.com/api/health`.

    Confirm the health check at the end exits with `✅ Backend is healthy (HTTP 200)`. If it fails, immediately tail logs:
    ```bash
    ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 'pm2 logs crm-backend --lines 80 --nostream'
    ```
    Common failures: missing env var → `TCP_IDENTITY_TOKEN is undefined` (means Step 2.2 didn't take effect — re-check). Compile error → fix locally, re-run.

    Note: deploy.sh ALSO rebuilds + redeploys frontend (lines 41-46). Since frontend has uncommitted changes from a different feature, this is acceptable — those changes are already PRESENT locally and the user is OK with them deploying. **However, if frontend build fails for any reason** (TS errors in pre-existing modified .tsx files), STOP and ask the user — do not bypass the script's frontend step.

    **STEP 2.5 — Smoke test A: token-gated endpoint:**

    First, get a real `emailLogId` from the prod DB:
    ```bash
    REAL_UID=$(ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
      "cd /var/www/crm-backend/backend && node -e \"
        const {PrismaClient}=require('@prisma/client');
        const p=new PrismaClient();
        p.emailLog.findFirst({orderBy:{createdAt:'desc'}, select:{id:true}}).then(r=>{console.log(r.id); process.exit(0)});
      \"")
    echo "REAL_UID=$REAL_UID" # OK to print — emailLogId is opaque, not PII
    ```
    If no emailLogs exist in prod DB, STOP and ask the user — we cannot test without one. (Memory note suggests there are thousands; should be fine.)

    Run all 4 endpoint test cases — paste outputs verbatim into SUMMARY:

    ```bash
    # A1 — happy path: valid token + real uid → 200 + JSON body
    curl -sS -i -H "X-Identity-Token: $SECRET" \
      "https://brandmonkz.com/api/email-log/$REAL_UID/contact" | head -20

    # A2 — bad token → 401
    curl -sS -i -H "X-Identity-Token: WRONG_TOKEN_FOR_TEST" \
      "https://brandmonkz.com/api/email-log/$REAL_UID/contact" | head -10

    # A3 — no token → 401
    curl -sS -i \
      "https://brandmonkz.com/api/email-log/$REAL_UID/contact" | head -10

    # A4 — non-existent uid (regex-valid format, but won't match) → 404
    curl -sS -i -H "X-Identity-Token: $SECRET" \
      "https://brandmonkz.com/api/email-log/cnonexistent000000000000000000/contact" | head -10

    # A5 — malformed uid (regex fails) → 404
    curl -sS -i -H "X-Identity-Token: $SECRET" \
      "https://brandmonkz.com/api/email-log/bad..uid/contact" | head -10
    ```

    Expected:
    - A1: `HTTP/2 200`, body `{"email":"...","name":"...","company":"..."}` (the actual values are PII — record in SUMMARY but mark explicitly as "this is real prospect data, included for one-time verification proof").
    - A2/A3: `HTTP/2 401`, body `{"error":"unauthorized"}`.
    - A4/A5: `HTTP/2 404`, body `{"error":"not_found"}`.

    All 5 must match. If any fail, investigate before proceeding.

    **STEP 2.6 — Smoke test B: click redirect with `_tcp_uid` injection:**

    ```bash
    # B1 — TCP-bound URL (apex) → Location should contain _tcp_uid
    curl -sS -I "https://brandmonkz.com/api/tracking/click/$REAL_UID?url=https%3A%2F%2Ftechcloudpro.com%2Fblog%2Ffoo%2F" \
      -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16 Safari/605.1.15" \
      | grep -iE "^(HTTP|location)"

    # B2 — TCP-bound URL (subdomain) → Location should contain _tcp_uid
    curl -sS -I "https://brandmonkz.com/api/tracking/click/$REAL_UID?url=https%3A%2F%2Fwww.techcloudpro.com%2Fservices%2Fai%2F" \
      -A "Mozilla/5.0 ... Safari/605.1.15" \
      | grep -iE "^(HTTP|location)"

    # B3 — TCP-bound URL with existing query string → _tcp_uid added with & not ?
    curl -sS -I "https://brandmonkz.com/api/tracking/click/$REAL_UID?url=https%3A%2F%2Ftechcloudpro.com%2Fblog%2Ffoo%2F%3Futm_source%3Dbm" \
      -A "Mozilla/5.0 ... Safari/605.1.15" \
      | grep -iE "^(HTTP|location)"

    # B4 — non-TCP URL (example.com) → Location WITHOUT _tcp_uid
    curl -sS -I "https://brandmonkz.com/api/tracking/click/$REAL_UID?url=https%3A%2F%2Fexample.com%2F" \
      -A "Mozilla/5.0 ... Safari/605.1.15" \
      | grep -iE "^(HTTP|location)"

    # B5 — hostname spoof attempt (must NOT inject _tcp_uid into evil host)
    curl -sS -I "https://brandmonkz.com/api/tracking/click/$REAL_UID?url=https%3A%2F%2Ftechcloudpro.com.evil.com%2F" \
      -A "Mozilla/5.0 ... Safari/605.1.15" \
      | grep -iE "^(HTTP|location)"

    # B6 — malformed URL → safe-fail (302 to original or default; just must NOT 5xx)
    curl -sS -I "https://brandmonkz.com/api/tracking/click/$REAL_UID?url=not-a-valid-url" \
      -A "Mozilla/5.0 ... Safari/605.1.15" \
      | grep -iE "^(HTTP|location)"
    ```

    Expected:
    - B1: `HTTP/2 302`, `location: https://techcloudpro.com/blog/foo/?_tcp_uid=<REAL_UID>` (note: trailing slash before `?` is OK; URL serialization may normalize it).
    - B2: `HTTP/2 302`, `location: https://www.techcloudpro.com/services/ai/?_tcp_uid=<REAL_UID>`.
    - B3: `HTTP/2 302`, `location: ...?utm_source=bm&_tcp_uid=<REAL_UID>` (or order-swapped — that's fine, just both params present).
    - B4: `HTTP/2 302`, `location: https://example.com/` (NO `_tcp_uid`).
    - B5: `HTTP/2 302`, `location: https://techcloudpro.com.evil.com/` (NO `_tcp_uid` — hostname spoof correctly NOT matched).
    - B6: `HTTP/2 302`, `location: https://brandmonkz.com/campaigns` (default redirect — original URL failed validation OR fell through `new URL()` parse error in the safe-fail block).

    All 6 must match. If B5 (hostname spoof) injects _tcp_uid, that's a security regression — STOP and fix.

    **STEP 2.7 — Sanity: confirm TCP side is STILL in stub mode:**

    ```bash
    curl -sS -i -X POST -H "Content-Type: application/json" \
      -d '{"uid":"phase2b-task2-stillstub","email":"task2-stub@example.com","name":"Task2 Stub","company":"Verify"}' \
      -A "Mozilla/5.0 ... Safari/605.1.15" \
      "https://techcloudpro.com/api/identify-from-email.php" | head -10
    ```
    Expected: `HTTP/2 200`, body `{"ok":true}`, with a `Set-Cookie: tcp_vid=...` header. This confirms TCP stub is still on (we have NOT flipped it). If it returns `{"ok":false}`, the TCP side already changed somehow — STOP and investigate. (Cleanup: this fake email row will land in `identified_visitors`. We'll note it in SUMMARY as "test pollution" and leave it — it's already an issue for past stub tests.)
  </action>
  <verify>
    1. `aws secretsmanager describe-secret --secret-id brandmonkz/production/tcp-identity-shared-secret --region us-east-1 --query 'Name'` returns `brandmonkz/production/tcp-identity-shared-secret`.
    2. SSH `ec2-user@100.24.213.224 'sudo grep -c ^TCP_IDENTITY_TOKEN= /var/www/crm-backend/backend/.env'` returns `1`.
    3. `tail -5 /tmp/309-deploy.log` ends with `🎉 Deployment Successful!`.
    4. `curl -sS https://brandmonkz.com/api/health` returns 200 (already confirmed by deploy.sh, but re-verify).
    5. All 5 Test A outputs match the expected matrix. The PII in A1 response is recorded with the explicit caveat "real prospect data — one-time verification".
    6. All 6 Test B outputs match the expected matrix. Critically: B5 must NOT inject `_tcp_uid`.
    7. Test 2.7 returns 200 + {ok:true} — proving TCP is still in stub mode and Task 2 ran zero TCP-side changes.
    8. PM2 process listing: `ssh ... 'pm2 list'` shows `crm-backend` as `online` with recent restart timestamp.

    Rollback path documented in case any of these fail:
    - **AWS SM**: `aws secretsmanager delete-secret --secret-id ... --force-delete-without-recovery` (use only if test deployment is fully aborted).
    - **`.env`**: `ssh ... 'sudo sed -i "/^TCP_IDENTITY_TOKEN=/d" /var/www/crm-backend/backend/.env && pm2 restart crm-backend'`.
    - **BM code**: `cd "/Users/jeet/Documents/CRM Module" && git revert HEAD && bash deploy.sh` — re-rolls the dist/ back. NEVER `git push --force`. NEVER `git reset --hard`.
  </verify>
  <done>
    - AWS SM secret `brandmonkz/production/tcp-identity-shared-secret` exists in us-east-1, account 134607809447.
    - BM EC2 prod `.env` contains `TCP_IDENTITY_TOKEN=<hex>` exactly once.
    - BM new `dist/routes/email-log.js` deployed and live. PM2 `crm-backend` online and restarted.
    - 5 endpoint tests (A1-A5) all pass with the expected status + body matrix.
    - 6 click-redirect tests (B1-B6) all pass — TCP URLs get `_tcp_uid`, others don't, hostname spoof safely ignored, malformed URL safe-fails.
    - TCP side STILL in stub mode (confirmed via 2.7) — NO changes to Hostinger yet.
    - Secret value never written to disk in our repo, never echoed to logs, never committed.
  </done>
</task>

<task type="auto">
  <name>Task 3: Flip TCP — replace placeholder secret + flip stub flag → deploy to Hostinger → live E2E test (real BM email click) + stub-bypass proof → SUMMARY</name>
  <files>
    /Users/jeet/techcloudpro/api/identify-from-email.php (PATCH — both secret + stub flag, then commit)
    Hostinger: /home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php (REPLACE via scp)
    /Users/jeet/doordash-p2p/.planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md (NEW)
  </files>
  <action>
    **STEP 3.0 — Patch TCP PHP locally:**

    Edit `/Users/jeet/techcloudpro/api/identify-from-email.php`:
    - Line 13: `define('TCP_IDENTITY_STUB', true);` → `define('TCP_IDENTITY_STUB', false);`
    - Line 17: `define('TCP_BM_SHARED_SECRET', 'PHASE_2B_PLACEHOLDER_REPLACE_ME');` → `define('TCP_BM_SHARED_SECRET', '<the same hex as $SECRET from Task 2>');`

    Get the value back from AWS SM (we no longer have $SECRET in shell if a new session started):
    ```bash
    SECRET=$(aws secretsmanager get-secret-value \
      --secret-id brandmonkz/production/tcp-identity-shared-secret \
      --region us-east-1 \
      --query SecretString --output text | python3 -c 'import sys,json; print(json.load(sys.stdin)["TCP_IDENTITY_SHARED_SECRET"])')
    echo -n "$SECRET" | wc -c   # MUST print 64
    ```

    Then edit (use `sed -i.bak` and confirm before commit):
    ```bash
    cd /Users/jeet/techcloudpro
    cp api/identify-from-email.php api/identify-from-email.php.preflip.bak  # backup
    sed -i.sed-bak \
      -e "s|define('TCP_IDENTITY_STUB', true);|define('TCP_IDENTITY_STUB', false);|" \
      -e "s|define('TCP_BM_SHARED_SECRET', 'PHASE_2B_PLACEHOLDER_REPLACE_ME');|define('TCP_BM_SHARED_SECRET', '$SECRET');|" \
      api/identify-from-email.php
    # confirm exactly the two changes landed
    grep -nE "TCP_IDENTITY_STUB|TCP_BM_SHARED_SECRET" api/identify-from-email.php
    ```
    Expected: line 13 shows `false`, line 17 shows the hex value (NOT the placeholder string).

    DELETE the sed backup AND the manual backup BEFORE git add:
    ```bash
    rm -f api/identify-from-email.php.sed-bak api/identify-from-email.php.preflip.bak
    ```

    **STEP 3.1 — Atomic commit + scp deploy to Hostinger:**

    ```bash
    cd /Users/jeet/techcloudpro
    git add api/identify-from-email.php
    git diff --cached --stat   # confirm exactly 1 file, ~2 line changes
    git commit -m "chore(api): identity-stack phase 2b — flip TCP_IDENTITY_STUB=false + plumb real shared secret"
    ```
    DO NOT push. (Pre-existing pattern from 305/306/307/308 — neither pushed unless user asks.)

    **CRITICAL — secret-in-source caveat**: this commit contains the live shared secret hex in the PHP file. Pre-existing pattern matches the inline DB credentials in `_visitor.php` already in this repo. The repo is private (`github.com/jeet-avatar/techcloudpro`). Document this in SUMMARY as **NOT a regression** (same pattern as 305-308) but file as a Phase X follow-up to migrate ALL TCP secrets (DB creds + this token) to environment variables.

    SCP to Hostinger (proven pattern from 305-308):
    ```bash
    scp -P 65002 -i ~/.ssh/id_rsa api/identify-from-email.php \
      u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php
    ```
    (If a different key is used, match the pattern from 308 SUMMARY exactly.)

    Verify on Hostinger:
    ```bash
    ssh -p 65002 u350621741@147.93.101.51 \
      "grep -nE 'TCP_IDENTITY_STUB|TCP_BM_SHARED_SECRET' /home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php"
    ```
    Expected: line 13 `false`, line 17 with the hex value (NOT placeholder). If grep shows old values, the scp didn't take effect — STOP and re-investigate (probably a Cloudflare cache or wrong remote path).

    **STEP 3.2 — Stub-bypass smoke test (proves stub branch is dead):**

    Repeat the Task 2.7 stub call — but now expect FAILURE:
    ```bash
    curl -sS -i -X POST -H "Content-Type: application/json" \
      -d '{"uid":"phase2b-task3-stubmustfail","email":"task3-stub@example.com","name":"Task3 Stub","company":"Bypass"}' \
      -A "Mozilla/5.0 ... Safari/605.1.15" \
      "https://techcloudpro.com/api/identify-from-email.php" | head -10
    ```
    Expected: `HTTP/2 200`, body `{"ok":false}`. The cookie may or may not be set (the endpoint short-circuits via `goto fail` after the BM cURL fails on the synthetic uid). Either way, body must be `{"ok":false}` — proving the stub branch is no longer trusted.

    Cross-check the DB to confirm NO row was created with `email='task3-stub@example.com'`. (Use the `_probe-XXX.php` pattern from 308: deploy a temp probe, query, verify zero rows, delete the probe.)

    **STEP 3.3 — Live E2E (real BM test email):**

    Use BrandMonkz's existing "Send Test Email" mechanism (UI in CampaignWizard or a CLI script — the executor must investigate which is available; memory shows campaigns have a test-send feature). Send to a real but isolated mailbox: `jeetnair.in+phase2b-test-309@gmail.com` (per memory: "smoke tests must use real-deliverable mailbox" — see feedback memory).

    Email content: must include at least one link to `https://techcloudpro.com/` (use the homepage to be safe). The link should be wrapped through the click tracker — that's BM default behavior per memory ("Tracking pixel + click wrap injected per emailLogId" from BrandMonkz Apr-17 memory).

    Email setup steps (executor will discover the exact UI):
    1. Open BM CRM admin: `https://brandmonkz.com/admin` or wherever the campaign UI lives.
    2. Create a single-recipient test campaign or use the "Send Test" feature.
    3. Recipient: `jeetnair.in+phase2b-test-309@gmail.com`.
    4. Send. Note the `emailLogId` of the send (from DB or admin UI — `prisma.emailLog.findFirst({orderBy:{createdAt:'desc'}}).id` will give the latest).

    Receive the email in Gmail. Click the TCP link.

    Verify on TCP side (4 checks):

    a. **`identified_visitors` row appears with real data:**
       Deploy a temp `_probe-309.php` to Hostinger that runs:
       ```php
       $stmt = $pdo->prepare("SELECT visitor_id, email, name, company, source_form, first_seen_at FROM identified_visitors WHERE source_form='email-click' AND email LIKE '%jeetnair.in%' ORDER BY first_seen_at DESC LIMIT 3");
       ```
       Expected: a row with `email='jeetnair.in+phase2b-test-309@gmail.com'` (or actual recipient — match the BM Contact for this emailLogId), `source_form='email-click'`, recent `first_seen_at`.

    b. **`tcp_vid` cookie was set in the real browser**: open Chrome DevTools → Application → Cookies → `.techcloudpro.com` — confirm `tcp_vid` is present with the value matching the row from (a).

    c. **Subsequent navigation produces page_views with visitor_id**: navigate to one more page on techcloudpro.com (e.g. `/services/ai`), then re-query the probe with `SELECT * FROM page_views WHERE visitor_id='<the-vid-from-a>' ORDER BY id DESC LIMIT 5` — at least one row.

    d. **stats.php top_visitors surfaces this entry**:
       ```bash
       curl -sS 'https://techcloudpro.com/api/stats.php?s=TcpSecureAdmin2026' \
         -A "Mozilla/5.0 ... Safari/605.1.15" \
         | jq '.windows.today.identified_visits.top_visitors[] | select(.source_form=="email-click" and (.email | contains("jeetnair.in")))'
       ```
       Expected: a JSON object with the recipient's name, email, company, source_form='email-click', pageviews ≥ 1.

    Delete the temp probe: `ssh -p 65002 u350621741@147.93.101.51 'rm /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-309.php'`. Confirm deletion: `ls` should return "No such file or directory".

    **STEP 3.4 — Write SUMMARY:**

    Create `/Users/jeet/doordash-p2p/.planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md` matching the structure of 308-SUMMARY.md (frontmatter with phase/plan/tags/dependency-graph/tech-stack/key-files/decisions/metrics). Body sections:

    - One-liner.
    - What was built (BM endpoint, BM click-redirect mutation, secret plumbing, TCP flip).
    - Verification — verbatim live evidence: paste ALL Task 2 + Task 3 curl outputs (Tests A1-A5, B1-B6, 3.2 stub-bypass, 3.3 a/b/c/d). Mark the A1 PII response with explicit caveat.
    - Privacy stance: secret in PHP file is pre-existing pattern, NOT a new exposure. Endpoint logs zero PII. Click-redirect change is purely additive (existing redirects unchanged for non-TCP URLs).
    - **⚠️ Phase X follow-ups** (file these clearly):
      1. Hardcoded secret in TCP PHP — pre-existing pattern (DB creds same way). Migrate ALL TCP PHP secrets to env vars (Hostinger supports `.env` via apache config or PHP-side dotenv lib).
      2. BM endpoint rate-limit — needs `express-rate-limit` middleware introduction (currently no rate limiting on this route specifically).
      3. Stub-branch dead code in TCP PHP — line 46-50 in identify-from-email.php is now unreachable. Cleanup pass to delete.
      4. Test-pollution rows in `identified_visitors` from Phase 2a + Phase 2b (synthetic emails like `tcp-308-emailclick-*`, `task2-stub@example.com`, `task3-stub@example.com`). One-time DELETE WHERE email LIKE pattern as a maintenance task.
    - DB tables touched (none on BM side; `identified_visitors` + `page_views` on TCP side via existing helpers from 307).
    - Files changed table.
    - Deviations from plan.
    - Commit hashes (BM repo from Task 1, TCP repo from Task 3.1, dollor.ai SUMMARY commit at end).
    - Rollback playbook (full):
      * **TCP flip-back**: `cd /Users/jeet/techcloudpro && git revert HEAD && scp ...` re-deploys with stub=true. Effect: synthetic stub calls work again; real BM clicks return {ok:false}. Use ONLY if BM endpoint becomes broken.
      * **BM code revert**: `cd "/Users/jeet/Documents/CRM Module" && git revert <commit> && bash deploy.sh`. Effect: removes new endpoint + click-redirect mutation. Click-tracked TCP links no longer carry _tcp_uid; existing 308 stub mode still works on TCP for synthetic E2E.
      * **Secret rotation**: generate new $SECRET → put-secret-value in AWS SM → update BM .env via SSH + `pm2 restart crm-backend` → edit + scp identify-from-email.php → done. Both ends MUST flip in the same window or live click-tracking breaks.
      * **AWS SM rollback**: `aws secretsmanager update-secret-version-stage --secret-id ... --version-stage AWSCURRENT --move-to-version-stage AWSPREVIOUS` to restore prior version (only works if there's a prior version). For brand-new secrets, use `delete-secret --force-delete-without-recovery` only if rolling back the entire phase.
    - Self-Check checklist (~30 boxes covering every file, every test, every decision).

    **Atomic commits:**
    ```bash
    cd /Users/jeet/doordash-p2p
    git add .planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-PLAN.md
    git add .planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md
    git diff --cached --stat   # confirm exactly 2 files
    git commit -m "docs(quick-309): TCP identity-stack phase 2b — BM sender + stub flip live, E2E proven"
    ```
    DO NOT push.

    **Final state:** TCP repo has 1 new commit (chore), BM repo has 1 new commit (feat), dollor.ai has 1 new commit (docs). AWS SM has 1 new secret. BM EC2 .env has 1 new line. Hostinger has updated identify-from-email.php. Stub branch is dead code. End-to-end identity chain is live.
  </action>
  <verify>
    1. `grep -E "TCP_IDENTITY_STUB|TCP_BM_SHARED_SECRET" /Users/jeet/techcloudpro/api/identify-from-email.php` — line 13 `false`, line 17 with 64-hex (not placeholder).
    2. `ssh -p 65002 u350621741@147.93.101.51 'grep -E "TCP_IDENTITY_STUB|TCP_BM_SHARED_SECRET" /home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php'` — same as local.
    3. Test 3.2 stub-bypass: `{"ok":false}` returned, NO row inserted with `task3-stub@example.com` in `identified_visitors` (probe-confirmed).
    4. Test 3.3: real test email sent, real click made, real `identified_visitors` row exists with the recipient's true email/name/company (NOT stub data), tcp_vid cookie present, page_views row exists, stats.php top_visitors surfaces the entry.
    5. SUMMARY exists at `.planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md` with all verbatim curl outputs from Tasks 2 + 3.
    6. `cd /Users/jeet/doordash-p2p && git log -1 --format=%H%n%s` shows the docs commit.
    7. `cd /Users/jeet/techcloudpro && git log -1 --format=%H%n%s` shows the chore commit.
    8. `cd "/Users/jeet/Documents/CRM Module" && git log -1 --format=%H%n%s` shows the feat commit from Task 1 (no new commits in this task on BM repo).
    9. Probe file `_probe-309.php` deleted from Hostinger (confirmed via `ls` returning "No such file").
    10. All 4 Phase X follow-ups documented in SUMMARY with clear ownership.
  </verify>
  <done>
    - TCP_IDENTITY_STUB flipped to `false` on Hostinger live PHP.
    - Real shared secret (64-hex) deployed identically in: AWS SM + BM EC2 .env + TCP Hostinger PHP.
    - Stub-branch is unreachable (proven by 3.2 returning {ok:false} for stub-shaped POST).
    - Real BM email → real click → real identified_visitors row with real PII (not stub) → real tcp_vid cookie → real page_views attribution → surfaces in stats.php top_visitors.
    - SUMMARY written with verbatim curl outputs, rollback playbook, 4 Phase X follow-ups documented.
    - 3 atomic commits across 3 repos (BM feat from Task 1 already in place; TCP chore + dollor.ai docs from this task).
    - Zero pushes to any remote (per CLAUDE.md pattern from 305-308).
    - Zero PII in any logs / commit messages / SUMMARY frontmatter.
  </done>
</task>

</tasks>

<verification>
**End-to-end identity chain (the goal):**
1. BM admin sends a test email to a real mailbox. Email contains a click-tracked link to techcloudpro.com.
2. Recipient opens email. Image-tracking pixel fires (existing 308 behavior).
3. Recipient clicks the TCP link. Browser hits `https://brandmonkz.com/api/tracking/click/<emailLogId>?url=...techcloudpro.com...`.
4. **NEW (this phase)**: BM click handler appends `?_tcp_uid=<emailLogId>` to the URL because hostname is techcloudpro.com.
5. Browser follows 302 to `https://techcloudpro.com/...?_tcp_uid=<emailLogId>`.
6. TCP page loads. **308's inline JS hook** captures `_tcp_uid`, POSTs `{uid: <emailLogId>}` to `/api/identify-from-email.php`, then strips `_tcp_uid` from URL via `history.replaceState`.
7. **NEW (this phase)**: TCP_IDENTITY_STUB is now false. Endpoint cURLs `https://brandmonkz.com/api/email-log/<emailLogId>/contact` with `X-Identity-Token: <secret>`.
8. **NEW (this phase)**: BM endpoint validates token (timing-safe), looks up EmailLog→Contact→Company, returns `{email, name, company}` JSON.
9. TCP endpoint receives identity, mints/reads tcp_vid cookie, upserts identified_visitors with source_form='email-click', returns `{ok:true}`.
10. Subsequent pageviews from this device land in `page_views.visitor_id` joined to the named prospect in stats.php.

**The chain has 8 trust boundaries; all 8 must hold for identity to flow correctly. This phase wires up steps 4, 7, 8 — the previously-stubbed pieces.**

**Smoke test deck (already in tasks):**
- A1-A5: BM endpoint behavior matrix (200/401/404).
- B1-B6: BM click redirect _tcp_uid injection matrix (TCP-yes / non-TCP-no / spoof-no / safe-fail).
- 3.2: Stub-bypass proof on TCP side.
- 3.3a/b/c/d: Live E2E with real test email — DB row, cookie, page_view, stats.php.

**Failure-mode rollback drills (documented in 3.4 SUMMARY):**
- BM endpoint goes 5xx → TCP cURL gets non-200 → TCP returns {ok:false} → identified_visitors NO row → page still loads. (Safe-fail proven by 308 design.)
- BM click-handler bug → wrong URL injected → recipient lands on wrong page. (Mitigation: try/catch safe-fail to original URL — see Task 1 STEP 1.3.)
- Secret mismatch (BM .env vs TCP PHP) → 401 every time → TCP gets {ok:false} → no identification. (Detection: 0 rows with source_form='email-click' from real campaigns even though clicks happen — alert via stats.php diff.)
</verification>

<success_criteria>
- [x] BM new endpoint `GET /api/email-log/:id/contact` live, 401-gated, 404-on-missing, 200-with-PII-on-valid.
- [x] BM click handler injects `?_tcp_uid=<emailLogId>` ONLY for techcloudpro.com hostnames (apex + subdomains), with hostname-spoof protection and try/catch safe-fail.
- [x] Shared secret stored in AWS Secrets Manager + BM EC2 prod .env + TCP Hostinger PHP — three-way agreement, never logged, never echoed.
- [x] TCP_IDENTITY_STUB flipped to false. Stub-shaped POST now returns {ok:false}. Real BM-mediated lookups still succeed.
- [x] Live E2E proven: real test email → real click → real `identified_visitors` row with real PII (not synthetic) + tcp_vid cookie + page_view attribution + stats.php top_visitors surface.
- [x] Atomic per-file commits across three repos. Pre-existing uncommitted changes in BM frontend/ untouched.
- [x] Rollback playbook for every change documented in SUMMARY.
- [x] 4 Phase X follow-ups filed: hardcoded TCP secret, missing BM rate-limit, stub-branch dead code, identified_visitors test-pollution.
- [x] Zero PII in logs / commits / SUMMARY metadata. (PII appears in SUMMARY ONLY in the Test A1 verbatim response, marked explicitly.)
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md` matching the 308-SUMMARY structure (frontmatter + verbatim live evidence + privacy stance + Phase X follow-ups + DB tables touched + files changed + deviations + commits + rollback + self-check).
</output>
