---
phase: quick-278
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/ROADMAP.md
  - .planning/phases/13-identity-access/13-01-PLAN.md
  - .planning/phases/14-compliance-data/14-01-PLAN.md
  - .planning/phases/15-operations/15-01-PLAN.md
  - .planning/phases/16-api-platform/16-01-PLAN.md
  - .planning/phases/17-onboarding-ux/17-01-PLAN.md
autonomous: true
requirements: [M2-PLAN]

must_haves:
  truths:
    - "ROADMAP.md contains a complete M2 milestone section with all 5 phase goals and dependencies"
    - "Five PLAN.md files exist — one per Phase 13-17 — each with 2-3 tasks and a Regression Guard section"
    - "Each PLAN.md Regression Guard names exactly 5 existing M1 endpoints/smoke tests to run before and after the phase"
    - "No code is modified — this task produces planning documents only"
  artifacts:
    - path: ".planning/ROADMAP.md"
      provides: "M2 milestone section appended after existing M1 content"
    - path: ".planning/phases/13-identity-access/13-01-PLAN.md"
      provides: "Phase 13 SSO/MFA/idle-timeout/IP-allowlist plan"
    - path: ".planning/phases/14-compliance-data/14-01-PLAN.md"
      provides: "Phase 14 GDPR/audit-export/SOC2-evidence plan"
    - path: ".planning/phases/15-operations/15-01-PLAN.md"
      provides: "Phase 15 backup/DR/Sentry/health-check plan"
    - path: ".planning/phases/16-api-platform/16-01-PLAN.md"
      provides: "Phase 16 API-key-auth/versioning/webhooks plan"
    - path: ".planning/phases/17-onboarding-ux/17-01-PLAN.md"
      provides: "Phase 17 first-run-wizard/license-key-UI/notifications plan"
  key_links:
    - from: "ROADMAP.md M2 section"
      to: "each phase PLAN.md"
      via: "phase names and goal descriptions match"
    - from: "Regression Guard in each PLAN.md"
      to: "existing M1 endpoints"
      via: "real endpoint paths verified in src/backend/ code"
---

<objective>
Create M2 Enterprise-Ready milestone planning documents. No code is written.

Purpose: Define the five phases (13-17) that take ArthaBuild from v1.0 (first-customer-ready) to v2.0 (enterprise-grade), so the next execution session has a clear, actionable roadmap. Each phase plan includes a Regression Guard that re-runs five M1 smoke tests to catch regressions before and after the phase lands.

Output:
- ROADMAP.md updated with M2 milestone block
- Five phase PLAN.md files (Phases 13-17) written to `.planning/phases/`
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Append M2 milestone section to ROADMAP.md</name>
  <files>.planning/ROADMAP.md</files>
  <action>
Append the following block to the END of `.planning/ROADMAP.md`, after the Phase 08.1 entry.
Do NOT modify any existing M1 content.

```markdown

---

## Milestone 2: v2.0 — Enterprise Ready

**Goal:** ArthaBuild is safe to sell to Fortune-500 procurement. It passes SSO/SAML integration, GDPR data requests, SOC2 Type I audit evidence, production backup/DR drills, versioned API contracts, and guided onboarding — all without external cloud dependencies.

**Depends on:** Milestone 1 complete (v1.0.0 tagged at d3cfca6b)

**Execution order:** 13 → 14 → 15 → 16 → 17 → (M2 launch readiness)

---

### Phase 13: Identity & Access Management

**Goal:** Enterprise teams can authenticate via their corporate IdP (SAML 2.0 / OIDC SSO). Individual users can enable MFA/TOTP. Idle sessions expire after a configurable timeout. Admin can restrict login to approved IP ranges.

**Depends on:** Phase 12 (security hardening + SOC2 readiness)
**Requirements:** IAM-01 (SSO/SAML), IAM-02 (MFA/TOTP), IAM-03 (idle timeout), IAM-04 (IP allowlist)

**Plans:** 1 plan — to be executed
- [ ] 13-01-PLAN.md — SAML/OIDC SSO router, pyotp TOTP endpoints, session idle timeout middleware, IP allowlist config + admin UI

---

### Phase 14: Compliance & Data Governance

**Goal:** Users can export or erase all their personal data on request (GDPR Art. 15/17). Audit log entries are immutable and exportable as CSV. SOC2 evidence package is generated automatically from existing controls.

**Depends on:** Phase 13
**Requirements:** GDPR-01 (data export), GDPR-02 (right to erasure), AUDIT-01 (immutability), SOC2-01 (evidence package)

**Plans:** 1 plan — to be executed
- [ ] 14-01-PLAN.md — /api/user/export-data, /api/user/erase endpoint, audit log hash-chaining for immutability, audit CSV export endpoint, SOC2 evidence generator script

---

### Phase 15: Operations & Reliability

**Goal:** Automated daily SQLite backup to S3. Sentry error monitoring wired to all unhandled exceptions. Graceful shutdown drains in-flight requests before SIGTERM. /health/detail returns real dependency status (Ollama, DB, license, disk).

**Depends on:** Phase 14
**Requirements:** OPS-01 (backup/DR), OPS-02 (error monitoring), OPS-03 (graceful shutdown), OPS-04 (health depth)

**Plans:** 1 plan — to be executed
- [ ] 15-01-PLAN.md — backup.sh cron script (SQLite → S3), Sentry SDK wired in rawapi.py, SIGTERM handler, /health/detail extended with disk/latency metrics

---

### Phase 16: API Platform

**Goal:** Third-party integrations can authenticate with API keys (not user JWTs). All endpoints are served under /api/v1/ with backward-compatible versioning. Webhook delivery notifies external systems on key events (chat completed, script deployed). All responses follow a standard envelope: {data, error, meta}.

**Depends on:** Phase 15
**Requirements:** API-01 (API key auth), API-02 (versioning), API-03 (webhooks), API-04 (response standard)

**Plans:** 1 plan — to be executed
- [ ] 16-01-PLAN.md — APIKey model + Alembic migration, /api/v1/ router prefix, webhook delivery worker, response envelope middleware

---

### Phase 17: Onboarding UX

**Goal:** A new admin sees a first-run wizard on first login (connect NetSuite → invite team → verify license). License key can be entered and validated from the UI (no .env editing). In-app notifications surface warnings (license expiry, Ollama down, disk full). Empty states guide users when no chats/scripts exist yet.

**Depends on:** Phase 16
**Requirements:** UX-01 (first-run wizard), UX-02 (license UI), UX-03 (in-app notifications), UX-04 (empty states)

**Plans:** 1 plan — to be executed
- [ ] 17-01-PLAN.md — OnboardingWizard.tsx (3-step modal), LicenseSettings.tsx admin tab, NotificationBanner.tsx (poll /health/detail), EmptyState.tsx component for Chat/History
```
  </action>
  <verify>
    grep "Milestone 2" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/ROADMAP.md
    grep "Phase 13" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/ROADMAP.md
    grep "Phase 17" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/ROADMAP.md
  </verify>
  <done>ROADMAP.md ends with the full M2 section. All 5 phase headings (13-17) are present. Existing M1 content is unchanged (Phase 8.1 still at line ~280).</done>
</task>

<task type="auto">
  <name>Task 2: Create Phase 13-15 PLAN.md files</name>
  <files>
    .planning/phases/13-identity-access/13-01-PLAN.md
    .planning/phases/14-compliance-data/14-01-PLAN.md
    .planning/phases/15-operations/15-01-PLAN.md
  </files>
  <action>
Create three directories and write a PLAN.md into each. Use `mkdir -p` for each directory.

--- FILE 1: .planning/phases/13-identity-access/13-01-PLAN.md ---

```markdown
---
phase: 13-identity-access
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/backend/routers/sso.py
  - src/backend/routers/mfa.py
  - src/backend/models.py
  - src/backend/alembic/versions/13a_identity_access.py
  - src/backend/middleware/idle_timeout.py
  - src/backend/middleware/ip_allowlist.py
  - src/frontend/src/pages/AdminPanel.tsx
  - src/frontend/src/pages/MFASetup.tsx
autonomous: true
requirements: [IAM-01, IAM-02, IAM-03, IAM-04]

must_haves:
  truths:
    - "Admin can configure SSO/SAML IdP metadata URL and test the connection from AdminPanel"
    - "Users can enroll in TOTP MFA and are prompted for OTP code on next login"
    - "Sessions idle for longer than SESSION_IDLE_MINUTES automatically receive 401"
    - "Logins from IPs outside ALLOWED_IP_RANGES are rejected with 403"
  artifacts:
    - path: "src/backend/routers/sso.py"
      provides: "SAML/OIDC callback endpoints"
    - path: "src/backend/routers/mfa.py"
      provides: "TOTP enroll/verify/disable endpoints"
    - path: "src/backend/middleware/idle_timeout.py"
      provides: "Starlette middleware checking last_active_at JWT claim"
    - path: "src/backend/middleware/ip_allowlist.py"
      provides: "Middleware reading ALLOWED_IP_RANGES env var, rejects non-matching IPs"
    - path: "src/backend/models.py"
      provides: "MFASecret model + ip_allowlist column on Team model"
    - path: "src/frontend/src/pages/MFASetup.tsx"
      provides: "QR code display + OTP entry form"
  key_links:
    - from: "src/backend/routers/sso.py"
      to: "python3-saml or authlib"
      via: "pip install python3-saml authlib"
    - from: "src/backend/middleware/idle_timeout.py"
      to: "rawapi.py app.add_middleware()"
      via: "app.add_middleware(IdleTimeoutMiddleware, idle_minutes=SESSION_IDLE_MINUTES)"
---

## Regression Guard (Run BEFORE and AFTER this phase)

These five smoke tests verify M1 functionality is intact. Run them at the start of the phase
(to confirm green baseline) and at the end (to confirm no regression).

```bash
# RG-13-01: Health endpoint returns ok
curl -sf http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok', d" && echo "PASS: /health"

# RG-13-02: Login returns access_token
curl -sf -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.local","password":"Admin1234!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'access_token' in d, d" && echo "PASS: /api/auth/login"

# RG-13-03: Chat list requires auth (401 without token)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/chats)
[ "$STATUS" = "401" ] && echo "PASS: /api/chats auth guard" || echo "FAIL: /api/chats returned $STATUS"

# RG-13-04: Registration rejects weak password (422)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"email":"rg13@test.local","password":"weak","first_name":"T","last_name":"T"}')
[ "$STATUS" = "422" ] && echo "PASS: register rejects weak password" || echo "FAIL: register returned $STATUS"

# RG-13-05: Admin audit log endpoint requires admin JWT
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/admin/audit)
[ "$STATUS" = "401" ] || [ "$STATUS" = "403" ] && echo "PASS: /api/admin/audit is protected" || echo "FAIL: /api/admin/audit returned $STATUS"
```

<objective>
Add enterprise identity controls: SSO/SAML, TOTP MFA, idle session timeout, and IP allowlist.

Purpose: Unblock enterprise procurement — large customers require IdP integration and MFA before signing.
Output: sso.py + mfa.py routers, IdleTimeout + IPAllowlist middlewares, MFASecret DB model, AdminPanel SSO config tab, MFASetup.tsx page.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@src/backend/routers/auth.py
@src/backend/models.py
@src/backend/rawapi.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: SSO router + TOTP MFA backend</name>
  <files>
    src/backend/routers/sso.py
    src/backend/routers/mfa.py
    src/backend/models.py
    src/backend/alembic/versions/13a_identity_access.py
  </files>
  <action>
1. Add MFASecret model to models.py: id, user_id (FK users), secret (String encrypted), is_active (Boolean), created_at.
2. Add ip_allowlist column (String, nullable) to Team model — comma-separated CIDR notation.
3. Write Alembic migration 13a_identity_access.py: create mfa_secrets table, add ip_allowlist to teams. Use batch_alter_table (SQLite mandatory).
4. Create routers/sso.py with prefix /api/auth/sso:
   - GET /config — return current IdP metadata URL from SystemConfig table
   - POST /config — admin-only, save IdP metadata URL to SystemConfig
   - GET /callback — SAML/OIDC callback, exchange code for user identity, create/lookup User, return JWT (reuse create_access_token from auth_utils.py)
   - Use python3-saml or authlib (add to requirements.txt). If neither installed, raise ImportError with install instructions.
5. Create routers/mfa.py with prefix /api/auth/mfa:
   - POST /enroll — generate TOTP secret via pyotp (add to requirements.txt), store in MFASecret, return {provisioning_uri, qr_data_url}
   - POST /verify — accept {otp_code}, validate against stored secret with pyotp.TOTP(secret).verify(code), mark is_active=True
   - POST /disable — admin or self, soft-delete MFASecret (is_active=False)
   - POST /check — called at login time after password validates but before JWT issued; if user has active MFA, require OTP in same payload; return 403 with {mfa_required:true} if OTP absent
6. Register both routers in rawapi.py: app.include_router(sso_router), app.include_router(mfa_router).
  </action>
  <verify>
    grep -n "class MFASecret" src/backend/models.py
    grep -n "ip_allowlist" src/backend/models.py
    grep -rn "sso_router\|mfa_router" src/backend/rawapi.py
    python3 -c "import routers.sso, routers.mfa; print('imports ok')" 2>&1
  </verify>
  <done>MFASecret model exists. SSO and MFA routers importable. Migration file present. Both routers registered in rawapi.py.</done>
</task>

<task type="auto">
  <name>Task 2: Idle timeout + IP allowlist middlewares + AdminPanel SSO tab</name>
  <files>
    src/backend/middleware/idle_timeout.py
    src/backend/middleware/ip_allowlist.py
    src/backend/rawapi.py
    src/frontend/src/pages/AdminPanel.tsx
    src/frontend/src/pages/MFASetup.tsx
  </files>
  <action>
1. Create src/backend/middleware/__init__.py (empty).
2. Create middleware/idle_timeout.py:
   - Starlette BaseHTTPMiddleware subclass IdleTimeoutMiddleware
   - Constructor: idle_minutes = int(os.getenv("SESSION_IDLE_MINUTES", "30"))
   - On each request: extract Bearer token, decode JWT (PyJWT), check iat claim; if now - iat > idle_minutes*60, return JSONResponse({"detail":"Session expired"}, status_code=401)
   - Skip paths: /health, /api/auth/login, /api/auth/check-user, /api/user/register, static assets
3. Create middleware/ip_allowlist.py:
   - Starlette BaseHTTPMiddleware subclass IPAllowlistMiddleware
   - On each request: read ALLOWED_IP_RANGES env var (comma-separated CIDRs). If empty/unset → allow all (backward compatible). If set, extract client IP from X-Real-IP or request.client.host; check ipaddress.ip_address(client_ip) in each network; if no match → JSONResponse({"detail":"IP not permitted"}, status_code=403).
   - Skip paths: /health (monitoring tools may come from outside allowlist)
4. Wire both middlewares in rawapi.py after existing CORSMiddleware:
   app.add_middleware(IdleTimeoutMiddleware)
   app.add_middleware(IPAllowlistMiddleware)
5. Add "Security" tab to AdminPanel.tsx (6th tab after existing 5):
   - SSO Config section: text input for IdP Metadata URL, Save button → PUT /api/auth/sso/config
   - IP Allowlist section: textarea for CIDR ranges, Save button → PUT /api/admin/system-config (key=ip_allowlist)
   - MFA policy section: toggle "Require MFA for all users"
6. Create MFASetup.tsx at src/frontend/src/pages/:
   - Fetches POST /api/auth/mfa/enroll on mount, displays QR code (use qrcode.react or img tag with data URL)
   - OTP input field + Verify button → POST /api/auth/mfa/verify
   - On success: show "MFA enabled" message, navigate to /dashboard
   - Add /mfa-setup route in routes.tsx (protected, user role required)
  </action>
  <verify>
    python3 -c "from middleware.idle_timeout import IdleTimeoutMiddleware; print('ok')" 2>&1
    python3 -c "from middleware.ip_allowlist import IPAllowlistMiddleware; print('ok')" 2>&1
    grep -n "IdleTimeoutMiddleware\|IPAllowlistMiddleware" src/backend/rawapi.py
    grep -n "mfa-setup" src/frontend/src/routes.tsx
  </verify>
  <done>Both middlewares importable and registered in rawapi.py. MFASetup.tsx exists and route is registered. AdminPanel has Security tab with SSO and MFA sections.</done>
</task>

</tasks>

<verification>
1. Run Regression Guard (RG-13-01 through RG-13-05) — all 5 must PASS.
2. curl -X POST /api/auth/mfa/enroll with valid JWT → returns {provisioning_uri, qr_data_url}.
3. curl /api/auth/sso/config with admin JWT → returns current IdP config.
4. With SESSION_IDLE_MINUTES=0 set, make any protected request → returns 401 session expired.
5. With ALLOWED_IP_RANGES=192.0.2.0/24, request from 127.0.0.1 → returns 403.
</verification>

<success_criteria>
- All 5 regression tests pass (M1 functionality intact)
- TOTP enroll → verify flow returns 200
- SSO config readable via API
- IP allowlist blocks non-matching IPs when ALLOWED_IP_RANGES is set
- Existing pytest suite (149+ tests) still all pass
</success_criteria>

<output>
After completion, create `.planning/phases/13-identity-access/13-01-SUMMARY.md`
</output>
```

--- FILE 2: .planning/phases/14-compliance-data/14-01-PLAN.md ---

```markdown
---
phase: 14-compliance-data
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/backend/routers/compliance.py
  - src/backend/routers/admin.py
  - src/backend/audit_utils.py
  - src/backend/alembic/versions/14a_audit_hash_chain.py
  - src/backend/models.py
  - src/backend/scripts/generate_soc2_evidence.py
autonomous: true
requirements: [GDPR-01, GDPR-02, AUDIT-01, SOC2-01]

must_haves:
  truths:
    - "Authenticated user can POST /api/user/export-data and receive a JSON file of all their personal data"
    - "Authenticated user can POST /api/user/erase and their account + data is anonymised within the platform"
    - "Each AuditLog row has a prev_hash + row_hash column forming an immutable chain"
    - "Admin can GET /api/admin/audit/export and receive a downloadable CSV of audit events"
    - "Running scripts/generate_soc2_evidence.py produces a docs/soc2-evidence/ directory with at least 5 control files"
  artifacts:
    - path: "src/backend/routers/compliance.py"
      provides: "GDPR export + erase endpoints"
    - path: "src/backend/audit_utils.py"
      provides: "hash_chain_row() function called in write_audit_event()"
    - path: "src/backend/alembic/versions/14a_audit_hash_chain.py"
      provides: "prev_hash + row_hash columns on audit_logs table"
    - path: "src/backend/scripts/generate_soc2_evidence.py"
      provides: "CLI script producing SOC2 evidence package"
  key_links:
    - from: "src/backend/routers/compliance.py"
      to: "src/backend/models.py User"
      via: "SELECT * FROM users WHERE id = current_user.id, then JOIN chats, messages, audit_logs"
    - from: "src/backend/audit_utils.py write_audit_event()"
      to: "AuditLog.row_hash"
      via: "sha256(prev_hash + json.dumps(event_fields))"
---

## Regression Guard (Run BEFORE and AFTER this phase)

```bash
# RG-14-01: Health endpoint returns ok
curl -sf http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok', d" && echo "PASS: /health"

# RG-14-02: Login returns access_token
curl -sf -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.local","password":"Admin1234!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'access_token' in d, d" && echo "PASS: /api/auth/login"

# RG-14-03: Audit log endpoint is protected (requires admin JWT)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/admin/audit)
[ "$STATUS" = "401" ] || [ "$STATUS" = "403" ] && echo "PASS: /api/admin/audit is protected" || echo "FAIL: returned $STATUS"

# RG-14-04: Chat list returns 401 without token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/chats)
[ "$STATUS" = "401" ] && echo "PASS: /api/chats auth guard" || echo "FAIL: returned $STATUS"

# RG-14-05: User register endpoint exists (returns 422 for missing body, not 404)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/user/register)
[ "$STATUS" = "422" ] && echo "PASS: /api/user/register exists" || echo "FAIL: returned $STATUS"
```

<objective>
Add GDPR data rights, immutable audit log hash-chaining, CSV export, and SOC2 evidence generation.

Purpose: Enterprise customers in EU require GDPR-compliant data export/erasure. SOC2 auditors require immutable audit trail and point-in-time evidence packages.
Output: compliance.py router with GDPR endpoints, hash-chaining upgrade to audit_utils.py + AuditLog model, audit CSV export, SOC2 evidence generator script.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@src/backend/audit_utils.py
@src/backend/models.py
@src/backend/routers/admin.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: GDPR export/erase endpoints + audit hash chain</name>
  <files>
    src/backend/routers/compliance.py
    src/backend/audit_utils.py
    src/backend/models.py
    src/backend/alembic/versions/14a_audit_hash_chain.py
    src/backend/rawapi.py
  </files>
  <action>
1. Add prev_hash (String, nullable) and row_hash (String, nullable) columns to AuditLog in models.py.
2. Write Alembic migration 14a_audit_hash_chain.py: add prev_hash + row_hash to audit_logs. Use batch_alter_table.
3. Update write_audit_event() in audit_utils.py:
   - Before inserting, SELECT MAX(id), row_hash FROM audit_logs — use that as prev_hash.
   - Compute row_hash = hashlib.sha256(f"{prev_hash or ''}|{action}|{actor_email}|{created_at.isoformat()}".encode()).hexdigest()
   - Store both prev_hash and row_hash on the new AuditLog row.
4. Create routers/compliance.py with prefix /api/user:
   - POST /export-data (requires valid user JWT, uses require_user from auth_utils.py):
     * Query User, all ChatSessions, all ChatMessages, all AuditLog rows where actor_email=user.email
     * Serialize to {user:{...}, chats:[...], audit:[...]}
     * Return as FileResponse with Content-Disposition: attachment; filename="data-export-{user_id}.json"
   - POST /erase (requires valid user JWT):
     * Anonymise User: email → "erased-{id}@deleted.local", name/first_name/last_name → "Deleted User", password_hash → unusable hash
     * Soft-delete: set is_active=False, add erased_at timestamp (add erased_at column to User in same migration)
     * Delete ChatSessions + ChatMessages owned by user (hard delete — no PII retention)
     * Write audit event: "user.data_erased" with actor_email = original email
     * Return {message:"Your data has been erased"}
5. Register compliance_router in rawapi.py: app.include_router(compliance_router).
  </action>
  <verify>
    grep -n "class AuditLog" src/backend/models.py
    grep -n "prev_hash\|row_hash" src/backend/models.py
    grep -n "export-data\|erase" src/backend/routers/compliance.py
    grep -n "compliance_router" src/backend/rawapi.py
  </verify>
  <done>AuditLog has prev_hash + row_hash columns. Migration file exists. Compliance router has /export-data and /erase. Router registered in rawapi.py.</done>
</task>

<task type="auto">
  <name>Task 2: Audit CSV export + SOC2 evidence generator</name>
  <files>
    src/backend/routers/admin.py
    src/backend/scripts/generate_soc2_evidence.py
  </files>
  <action>
1. Add GET /api/admin/audit/export to routers/admin.py (admin JWT required):
   - Query all AuditLog rows, ordered by id ASC
   - Serialize to CSV: id, created_at, actor_email, actor_role, action, result, ip_address, prev_hash, row_hash
   - Return StreamingResponse with media_type="text/csv" and Content-Disposition: attachment; filename="audit-export-{date}.csv"
   - Accept query params: ?start=ISO8601&end=ISO8601 for date-range filtering
2. Create src/backend/scripts/generate_soc2_evidence.py (standalone CLI, not a FastAPI endpoint):
   - Usage: python3 generate_soc2_evidence.py --db-path /path/to/arthaBuild.db --out-dir docs/soc2-evidence/
   - Generates these files inside out-dir:
     a. CC6.1-access-control.md — list of RBAC roles, auth endpoints, MFA policy from DB
     b. CC6.2-least-privilege.md — list of admin endpoints and their require_admin() guards
     c. CC7.2-audit-log-sample.md — last 50 audit events in markdown table
     d. CC9.2-incident-response.md — copy/reference from docs/security/INCIDENT_RESPONSE.md
     e. A1.2-backup-schedule.md — backup config summary (reads OPS_BACKUP_S3_BUCKET env var)
   - Prints "SOC2 evidence package generated at {out-dir}" on success.
  </action>
  <verify>
    grep -n "audit/export" src/backend/routers/admin.py
    python3 src/backend/scripts/generate_soc2_evidence.py --help 2>&1 | grep -i "usage\|out-dir\|db-path"
  </verify>
  <done>GET /api/admin/audit/export exists in admin.py and returns CSV with date-range params. generate_soc2_evidence.py runs with --help and produces docs/soc2-evidence/ with 5 files.</done>
</task>

</tasks>

<verification>
1. Run Regression Guard (RG-14-01 through RG-14-05) — all 5 must PASS.
2. With a valid user JWT: POST /api/user/export-data → 200, Content-Disposition attachment JSON.
3. With a valid user JWT: POST /api/user/erase → 200, user row shows erased email in DB.
4. With admin JWT: GET /api/admin/audit/export → 200, response is CSV with row_hash column.
5. python3 scripts/generate_soc2_evidence.py → docs/soc2-evidence/ contains 5 .md files.
6. Existing pytest suite still all pass (no AuditLog regression from new columns).
</verification>

<success_criteria>
- GDPR export returns JSON file with user data, chats, and audit rows
- GDPR erase anonymises user and deletes chat data
- Audit rows have prev_hash + row_hash (chain verifiable)
- CSV export available with date filters
- SOC2 evidence script produces 5 control files
- All 5 regression tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/14-compliance-data/14-01-SUMMARY.md`
</output>
```

--- FILE 3: .planning/phases/15-operations/15-01-PLAN.md ---

```markdown
---
phase: 15-operations
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/backend/scripts/backup.sh
  - src/backend/rawapi.py
  - src/backend/routers/health.py
  - src/backend/requirements.txt
autonomous: true
requirements: [OPS-01, OPS-02, OPS-03, OPS-04]

must_haves:
  truths:
    - "Running backup.sh uploads arthaBuild.db to the configured S3 bucket and exits 0"
    - "Sentry SDK captures unhandled exceptions and sends them to SENTRY_DSN"
    - "SIGTERM triggers graceful shutdown: in-flight requests complete, server exits within 30s"
    - "GET /health/detail returns ai_ready, db_latency_ms, disk_free_gb, license_valid, ollama_model"
  artifacts:
    - path: "src/backend/scripts/backup.sh"
      provides: "SQLite → S3 backup script suitable for cron"
    - path: "src/backend/rawapi.py"
      provides: "Sentry init at startup, SIGTERM handler"
    - path: "src/backend/routers/health.py"
      provides: "/health/detail extended with disk + db latency metrics"
  key_links:
    - from: "src/backend/scripts/backup.sh"
      to: "AWS CLI"
      via: "aws s3 cp arthaBuild.db s3://$OPS_BACKUP_S3_BUCKET/..."
    - from: "rawapi.py SIGTERM handler"
      to: "uvicorn --graceful-timeout"
      via: "signal.signal(signal.SIGTERM, lambda s,f: server.should_exit=True)"
---

## Regression Guard (Run BEFORE and AFTER this phase)

```bash
# RG-15-01: Health endpoint returns ok
curl -sf http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok', d" && echo "PASS: /health"

# RG-15-02: Login returns access_token
curl -sf -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.local","password":"Admin1234!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'access_token' in d, d" && echo "PASS: /api/auth/login"

# RG-15-03: /health/detail exists and requires JWT
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health/detail)
[ "$STATUS" = "401" ] && echo "PASS: /health/detail is protected" || echo "FAIL: returned $STATUS"

# RG-15-04: Chat list returns 401 without token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/chats)
[ "$STATUS" = "401" ] && echo "PASS: /api/chats auth guard" || echo "FAIL: returned $STATUS"

# RG-15-05: Audit endpoint requires auth
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/admin/audit)
[ "$STATUS" = "401" ] || [ "$STATUS" = "403" ] && echo "PASS: /api/admin/audit is protected" || echo "FAIL: returned $STATUS"
```

<objective>
Add operational reliability: S3 backup, Sentry error monitoring, graceful shutdown, and deep health checks.

Purpose: Customer VPC deployments need ops-grade reliability — automated backups prevent data loss, Sentry surfaces silent failures, graceful shutdown prevents corruption mid-write, and deeper health checks let monitoring systems detect Ollama/disk problems before users do.
Output: backup.sh cron script, Sentry SDK wired in rawapi.py, SIGTERM handler, extended /health/detail endpoint.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@src/backend/rawapi.py
@src/backend/routers/health.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: S3 backup script + Sentry integration + graceful shutdown</name>
  <files>
    src/backend/scripts/backup.sh
    src/backend/rawapi.py
    src/backend/requirements.txt
  </files>
  <action>
1. Create src/backend/scripts/backup.sh:
   ```bash
   #!/usr/bin/env bash
   # ArthaBuild SQLite Backup — Phase 15 OPS-01
   # Env vars required: OPS_BACKUP_S3_BUCKET, DB_PATH (default /app/data/arthaBuild.db)
   set -euo pipefail
   DB_PATH="${DB_PATH:-/app/data/arthaBuild.db}"
   BUCKET="${OPS_BACKUP_S3_BUCKET:?OPS_BACKUP_S3_BUCKET must be set}"
   TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
   DEST="s3://${BUCKET}/backups/arthaBuild-${TIMESTAMP}.db"
   echo "[backup] Copying ${DB_PATH} to ${DEST}"
   aws s3 cp "${DB_PATH}" "${DEST}" --sse AES256
   echo "[backup] Done: ${DEST}"
   ```
   chmod +x scripts/backup.sh

2. Add sentry-sdk to requirements.txt (sentry-sdk==2.x — check latest compatible with fastapi 0.115).

3. Wire Sentry in rawapi.py at module top (after load_dotenv()):
   ```python
   import sentry_sdk
   _SENTRY_DSN = os.getenv("SENTRY_DSN", "")
   if _SENTRY_DSN:
       sentry_sdk.init(dsn=_SENTRY_DSN, traces_sample_rate=0.1, environment=os.getenv("ENVIRONMENT","production"))
       logger.info("Sentry initialized")
   ```

4. Add SIGTERM graceful shutdown in rawapi.py lifespan or __main__ block:
   ```python
   import signal
   _shutdown_event = asyncio.Event()

   def _handle_sigterm(sig, frame):
       logger.info("SIGTERM received — draining requests")
       _shutdown_event.set()

   signal.signal(signal.SIGTERM, _handle_sigterm)
   ```
   Add SIGINT handler identically. Uvicorn reads ASGI lifespan — document in a code comment that docker stop sends SIGTERM and uvicorn will drain within --timeout-graceful-shutdown=30.

5. Add SENTRY_DSN and OPS_BACKUP_S3_BUCKET to .env.example with comments.
  </action>
  <verify>
    grep -n "sentry_sdk" src/backend/rawapi.py
    grep -n "SIGTERM\|_handle_sigterm" src/backend/rawapi.py
    grep -n "sentry-sdk" src/backend/requirements.txt
    bash -n src/backend/scripts/backup.sh && echo "PASS: backup.sh syntax ok"
  </verify>
  <done>Sentry init is in rawapi.py (guarded by SENTRY_DSN). SIGTERM handler registered. backup.sh passes bash -n. sentry-sdk in requirements.txt.</done>
</task>

<task type="auto">
  <name>Task 2: Extended /health/detail endpoint with disk + DB latency metrics</name>
  <files>
    src/backend/routers/health.py
  </files>
  <action>
Extend the existing GET /health/detail endpoint (already returns ai_ready, license_valid, license_plan per AB-081-004 decision).

Add these new fields to the response:
- db_latency_ms: run "SELECT 1" via AsyncSession and measure time in milliseconds (round to 1 decimal)
- disk_free_gb: use shutil.disk_usage(DB_PATH) — report free space in GB (round to 2 decimals). DB_PATH defaults to /app/data or /tmp if not set.
- ollama_status: repeat the existing _check_ollama_available() logic inline — return "ok" or "unavailable"
- ollama_model: read OLLAMA_MODEL env var (default "qwen2.5:14b") — just echo the configured model name
- sentry_active: bool — True if SENTRY_DSN env var is set and non-empty
- backup_bucket_configured: bool — True if OPS_BACKUP_S3_BUCKET is set

Keep existing fields (ai_ready, license_valid, license_plan) unchanged — they are frozen interface per AB-081-004.

Response shape:
```json
{
  "status": "ok",
  "ai_ready": true,
  "license_valid": true,
  "license_plan": "starter",
  "db_latency_ms": 1.2,
  "disk_free_gb": 45.3,
  "ollama_status": "ok",
  "ollama_model": "qwen2.5:14b",
  "sentry_active": false,
  "backup_bucket_configured": false
}
```

The endpoint already requires JWT (Bearer token via require_user). Do not change the auth guard.
  </action>
  <verify>
    grep -n "db_latency_ms\|disk_free_gb\|ollama_status" src/backend/routers/health.py
    # With valid JWT:
    # curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/health/detail | python3 -m json.tool
  </verify>
  <done>/health/detail response includes db_latency_ms, disk_free_gb, ollama_status, ollama_model, sentry_active, backup_bucket_configured. Existing fields unchanged.</done>
</task>

</tasks>

<verification>
1. Run Regression Guard (RG-15-01 through RG-15-05) — all 5 must PASS.
2. OPS_BACKUP_S3_BUCKET=my-bucket DB_PATH=/tmp/test.db bash scripts/backup.sh 2>&1 — exits 0 (or fails with "upload failed" not "syntax error").
3. With SENTRY_DSN set to a dummy URL, uvicorn logs "Sentry initialized" at startup.
4. /health/detail with valid JWT → response contains db_latency_ms key.
5. Existing pytest suite still all pass.
</verification>

<success_criteria>
- backup.sh exists, is executable, passes bash -n syntax check
- Sentry SDK initialises (logged) when SENTRY_DSN is set
- SIGTERM handler registered at startup
- /health/detail returns 6 new fields without breaking existing 3
- All 5 regression tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/15-operations/15-01-SUMMARY.md`
</output>
```
  </action>
  <verify>
    ls /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/13-identity-access/13-01-PLAN.md
    ls /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/14-compliance-data/14-01-PLAN.md
    ls /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/15-operations/15-01-PLAN.md
    grep "Regression Guard" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/13-identity-access/13-01-PLAN.md
    grep "Regression Guard" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/14-compliance-data/14-01-PLAN.md
    grep "Regression Guard" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/15-operations/15-01-PLAN.md
  </verify>
  <done>Three PLAN.md files exist. Each contains a "Regression Guard" section with 5 curl smoke tests referencing real M1 endpoints (/health, /api/auth/login, /api/chats, /api/user/register, /api/admin/audit).</done>
</task>

<task type="auto">
  <name>Task 3: Create Phase 16-17 PLAN.md files</name>
  <files>
    .planning/phases/16-api-platform/16-01-PLAN.md
    .planning/phases/17-onboarding-ux/17-01-PLAN.md
  </files>
  <action>
Create two directories and write a PLAN.md into each.

--- FILE 1: .planning/phases/16-api-platform/16-01-PLAN.md ---

```markdown
---
phase: 16-api-platform
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/backend/models.py
  - src/backend/alembic/versions/16a_api_key_model.py
  - src/backend/routers/apikeys.py
  - src/backend/middleware/api_key_auth.py
  - src/backend/rawapi.py
  - src/backend/middleware/response_envelope.py
autonomous: true
requirements: [API-01, API-02, API-03, API-04]

must_haves:
  truths:
    - "POST /api/v1/keys creates an API key for the authenticated user"
    - "Requests bearing X-API-Key header are authenticated without a JWT"
    - "All /api/v1/ prefixed endpoints return the standard envelope: {data, error, meta}"
    - "POST /api/admin/webhooks registers a webhook URL for a named event"
    - "On chat-completed event, the webhook worker POSTs a signed payload to the registered URL"
  artifacts:
    - path: "src/backend/models.py"
      provides: "APIKey model, WebhookEndpoint model"
    - path: "src/backend/routers/apikeys.py"
      provides: "CRUD endpoints for API key management"
    - path: "src/backend/middleware/api_key_auth.py"
      provides: "Middleware: if X-API-Key present, resolve to User and inject into request state"
    - path: "src/backend/middleware/response_envelope.py"
      provides: "Middleware: wrap successful JSON responses in {data:{...}, error:null, meta:{version,timestamp}}"
  key_links:
    - from: "src/backend/middleware/api_key_auth.py"
      to: "src/backend/models.py APIKey"
      via: "SELECT FROM api_keys WHERE key_hash = sha256(request header value) AND is_active"
    - from: "rawapi.py /api/chatbot/process"
      to: "webhook worker"
      via: "asyncio.create_task(dispatch_webhook('chat.completed', payload)) after AI response"
---

## Regression Guard (Run BEFORE and AFTER this phase)

```bash
# RG-16-01: Health endpoint returns ok
curl -sf http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok', d" && echo "PASS: /health"

# RG-16-02: Login returns access_token (JWT flow unchanged after API key middleware lands)
curl -sf -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.local","password":"Admin1234!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'access_token' in d, d" && echo "PASS: /api/auth/login"

# RG-16-03: Chat list returns 401 without token or API key
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/chats)
[ "$STATUS" = "401" ] && echo "PASS: /api/chats auth guard" || echo "FAIL: returned $STATUS"

# RG-16-04: Register still validates password (422 for missing body)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/user/register)
[ "$STATUS" = "422" ] && echo "PASS: /api/user/register exists" || echo "FAIL: returned $STATUS"

# RG-16-05: Response envelope is present on /api/v1/ routes
TOKEN=$(curl -sf -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.local","password":"Admin1234!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -sf -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/keys \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'data' in d and 'meta' in d, d" && echo "PASS: /api/v1/keys has envelope"
```

<objective>
Add API key authentication, versioned /api/v1/ routing, webhook delivery, and standardised response envelope.

Purpose: Third-party integrations (Zapier, customer scripts, CI pipelines) need API keys (not user JWTs) to call ArthaBuild. Versioned routes let us ship breaking changes without breaking existing integrations. Webhooks push events to customer systems without polling.
Output: APIKey + WebhookEndpoint models, api_key_auth middleware, apikeys.py router, response envelope middleware, webhook dispatch worker.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@src/backend/rawapi.py
@src/backend/models.py
@src/backend/routers/auth.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: APIKey model + middleware + /api/v1/ router prefix</name>
  <files>
    src/backend/models.py
    src/backend/alembic/versions/16a_api_key_model.py
    src/backend/routers/apikeys.py
    src/backend/middleware/api_key_auth.py
    src/backend/rawapi.py
  </files>
  <action>
1. Add to models.py:
   - APIKey model: id, user_id (FK users), key_hash (String unique — SHA-256 of raw key), name (String), is_active (Boolean default True), last_used_at (DateTime nullable), created_at.
   - WebhookEndpoint model: id, user_id (FK users), event (String — e.g. "chat.completed", "script.deployed"), url (String), secret (String — HMAC signing secret), is_active (Boolean), created_at.
2. Write Alembic migration 16a_api_key_model.py: create api_keys + webhook_endpoints tables. Use batch_alter_table.
3. Create routers/apikeys.py with prefix /api/v1/keys:
   - POST / — create API key: generate 32-byte secret (secrets.token_urlsafe), store SHA-256 hash in DB, return raw key ONCE in response (never stored raw)
   - GET / — list user's API keys (name, id, is_active, last_used_at — NOT the hash)
   - DELETE /{key_id} — deactivate (is_active=False)
4. Create middleware/api_key_auth.py (BaseHTTPMiddleware):
   - Check for X-API-Key header. If absent → pass through (JWT auth still applies).
   - If present: compute SHA-256 of value, SELECT FROM api_keys WHERE key_hash=hash AND is_active=True. If not found → return 401.
   - Update last_used_at on the key row.
   - Inject resolved user into request.state.api_key_user so downstream Depends can read it.
5. Register in rawapi.py: app.add_middleware(APIKeyAuthMiddleware). Include apikeys_router at /api/v1/keys.
6. Add a /api/v1/ router prefix alias for the chats router — same handler, different prefix — so v1 routes exist alongside legacy /api/ routes.
  </action>
  <verify>
    grep -n "class APIKey\|class WebhookEndpoint" src/backend/models.py
    grep -n "APIKeyAuthMiddleware" src/backend/rawapi.py
    grep -n "api/v1" src/backend/rawapi.py
  </verify>
  <done>APIKey and WebhookEndpoint models exist. Migration file present. APIKeyAuthMiddleware registered. /api/v1/keys router present.</done>
</task>

<task type="auto">
  <name>Task 2: Webhook delivery worker + response envelope middleware</name>
  <files>
    src/backend/webhook_worker.py
    src/backend/middleware/response_envelope.py
    src/backend/rawapi.py
  </files>
  <action>
1. Create webhook_worker.py:
   - async def dispatch_webhook(db, event: str, payload: dict): query WebhookEndpoint WHERE event=event AND is_active=True
   - For each endpoint: POST to endpoint.url with JSON payload + X-ArthaBuild-Event header + X-ArthaBuild-Signature (HMAC-SHA256 of payload with endpoint.secret)
   - Use httpx.AsyncClient with timeout=10s. Catch all exceptions — webhook failure must NEVER crash the main request.
   - Log delivery result (success/failure) at DEBUG level.
   - async def register_webhook(db, user_id, event, url, secret) → creates WebhookEndpoint row.

2. Add POST /api/admin/webhooks endpoint in routers/admin.py (admin JWT required):
   - Body: {event: str, url: str, secret: str}. Validates event is one of: "chat.completed", "script.deployed", "user.registered".
   - Calls register_webhook().

3. Wire dispatch_webhook in rawapi.py after AI response in /api/chatbot/process:
   asyncio.create_task(dispatch_webhook(db, "chat.completed", {"session_id": ..., "user_email": ...}))

4. Create middleware/response_envelope.py (BaseHTTPMiddleware):
   - Only wraps routes that match /api/v1/. Pass through all other routes unchanged.
   - On response with Content-Type: application/json and 2xx status: decode body, wrap in:
     {"data": <original>, "error": null, "meta": {"version": "v1", "timestamp": "<ISO8601>"}}
   - On 4xx/5xx: wrap in {"data": null, "error": <original body>, "meta": {...}}
   - Register in rawapi.py: app.add_middleware(ResponseEnvelopeMiddleware)
  </action>
  <verify>
    grep -n "dispatch_webhook" src/backend/rawapi.py
    grep -n "dispatch_webhook" src/backend/webhook_worker.py
    grep -n "ResponseEnvelopeMiddleware" src/backend/rawapi.py
    grep -n "admin/webhooks" src/backend/routers/admin.py
  </verify>
  <done>webhook_worker.py has dispatch_webhook and register_webhook. POST /api/admin/webhooks exists in admin.py. dispatch_webhook called from chatbot endpoint. ResponseEnvelopeMiddleware registered and wraps /api/v1/ responses.</done>
</task>

</tasks>

<verification>
1. Run Regression Guard (RG-16-01 through RG-16-05) — all 5 must PASS.
2. POST /api/v1/keys with JWT → returns {data:{id, name, key}, meta:{version:"v1"}} — envelope present.
3. Create a key, then GET /api/chats with X-API-Key header → 200 (API key auth works).
4. POST /api/admin/webhooks with valid event + url → 200, webhook row in DB.
5. Existing pytest suite still all pass.
</verification>

<success_criteria>
- API key create/list/delete endpoints work
- X-API-Key header authenticates requests to /api/chats
- /api/v1/ routes return standard envelope
- Webhook endpoint registration works
- dispatch_webhook called after chat.completed event
- All 5 regression tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/16-api-platform/16-01-SUMMARY.md`
</output>
```

--- FILE 2: .planning/phases/17-onboarding-ux/17-01-PLAN.md ---

```markdown
---
phase: 17-onboarding-ux
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/frontend/src/pages/OnboardingWizard.tsx
  - src/frontend/src/pages/AdminPanel.tsx
  - src/frontend/src/components/NotificationBanner.tsx
  - src/frontend/src/components/EmptyState.tsx
  - src/frontend/src/pages/Chat.tsx
  - src/frontend/src/pages/History.tsx
  - src/frontend/src/routes.tsx
  - src/backend/routers/admin.py
  - src/backend/models.py
autonomous: true
requirements: [UX-01, UX-02, UX-03, UX-04]

must_haves:
  truths:
    - "A new admin user sees OnboardingWizard modal on first login (disappears after completing or dismissing)"
    - "Admin can enter and validate a license key from the AdminPanel License tab without editing .env"
    - "NotificationBanner appears at top of Chat when /health/detail signals a problem (Ollama down, disk low, license expiring)"
    - "Chat page shows an EmptyState component when the user has no chat sessions"
    - "History page shows EmptyState when no chat history exists"
  artifacts:
    - path: "src/frontend/src/pages/OnboardingWizard.tsx"
      provides: "3-step modal: connect NetSuite → invite team → verify license"
    - path: "src/frontend/src/pages/AdminPanel.tsx"
      provides: "License tab with license key input + validate button"
    - path: "src/frontend/src/components/NotificationBanner.tsx"
      provides: "Banner polling /health/detail every 60s, shows warnings"
    - path: "src/frontend/src/components/EmptyState.tsx"
      provides: "Reusable empty state with icon + message + CTA button"
  key_links:
    - from: "src/frontend/src/pages/Chat.tsx"
      to: "src/frontend/src/components/EmptyState.tsx"
      via: "{sessions.length === 0 && <EmptyState message='...' cta='New Chat' onCta={handleNewChat} />}"
    - from: "src/frontend/src/components/NotificationBanner.tsx"
      to: "/health/detail"
      via: "useEffect poll every 60s, displays banner if ai_ready=false or disk_free_gb < 5"
---

## Regression Guard (Run BEFORE and AFTER this phase)

```bash
# RG-17-01: Health endpoint returns ok
curl -sf http://localhost:8000/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='ok', d" && echo "PASS: /health"

# RG-17-02: Login returns access_token (auth still works after onboarding changes)
curl -sf -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.local","password":"Admin1234!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'access_token' in d, d" && echo "PASS: /api/auth/login"

# RG-17-03: Chat list still returns 401 without token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/chats)
[ "$STATUS" = "401" ] && echo "PASS: /api/chats auth guard" || echo "FAIL: returned $STATUS"

# RG-17-04: Frontend build produces dist/ without errors
cd src/frontend && npm run build 2>&1 | tail -5
[ -d dist ] && echo "PASS: frontend builds clean" || echo "FAIL: build failed"

# RG-17-05: License validate endpoint exists and requires auth
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/admin/license/validate-key)
[ "$STATUS" = "401" ] || [ "$STATUS" = "422" ] && echo "PASS: /api/admin/license/validate-key exists" || echo "FAIL: returned $STATUS"
```

<objective>
Add guided first-run onboarding, license key management UI, in-app health notifications, and empty states.

Purpose: New customers currently deploy ArthaBuild and stare at a blank chat page with no guidance. This phase adds the "paved path" — wizard, clear empty states, and proactive notifications — reducing time-to-first-value from hours to minutes.
Output: OnboardingWizard.tsx (3-step modal), LicenseSettings tab in AdminPanel, NotificationBanner.tsx polling /health/detail, EmptyState.tsx used in Chat and History.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@src/frontend/src/pages/Chat.tsx
@src/frontend/src/pages/AdminPanel.tsx
@src/frontend/src/pages/History.tsx
@src/frontend/src/routes.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: OnboardingWizard + License tab in AdminPanel + backend license-validate-key endpoint</name>
  <files>
    src/frontend/src/pages/OnboardingWizard.tsx
    src/frontend/src/pages/AdminPanel.tsx
    src/backend/routers/admin.py
    src/backend/models.py
  </files>
  <action>
1. Add onboarding_completed (Boolean, default False) column to User model in models.py.
   Write Alembic migration 17a_onboarding.py: add onboarding_completed to users. Use batch_alter_table.

2. Add to routers/admin.py:
   - POST /api/admin/onboarding/complete — require_user, set current_user.onboarding_completed=True, commit, return {done:true}
   - POST /api/admin/license/validate-key — require_admin, body {license_key:str}, call validate_license(license_key) from existing license_utils.py, return {valid:bool, plan:str, expiry:str}
   - GET /api/admin/user/me/onboarding — return {onboarding_completed: current_user.onboarding_completed}

3. Create OnboardingWizard.tsx:
   - On mount: GET /api/admin/user/me/onboarding. If onboarding_completed=True → render nothing.
   - If onboarding_completed=False AND user.role==="admin" → show modal with 3 steps:
     * Step 1 "Connect NetSuite": prompt to open TBA connect modal (call existing NetSuite connect flow), with Skip button
     * Step 2 "Invite your team": show email input + Invite button (calls POST /api/admin/team/invite), with Skip button
     * Step 3 "Verify license": show license key input + Validate button (calls POST /api/admin/license/validate-key), display result
   - Finish / Skip All button: calls POST /api/admin/onboarding/complete, closes modal
   - Style: fixed overlay z-50, white card 500px wide, step indicator dots

4. Add 7th tab "License" to AdminPanel.tsx (after existing 6 tabs including the Security tab from Phase 13):
   - Shows current license info: plan, expiry, instance_id (from GET /api/admin/license)
   - Text input for new license key + Validate button (POST /api/admin/license/validate-key)
   - On valid response: show green checkmark + plan name; on invalid: red error message
  </action>
  <verify>
    grep -n "OnboardingWizard\|onboarding_completed" src/frontend/src/pages/OnboardingWizard.tsx
    grep -n "License\|validate-key" src/backend/routers/admin.py
    grep -n "onboarding_completed" src/backend/models.py
  </verify>
  <done>OnboardingWizard.tsx exists and checks onboarding_completed before rendering. AdminPanel has License tab with validate-key call. Backend endpoints POST /api/admin/onboarding/complete and POST /api/admin/license/validate-key exist.</done>
</task>

<task type="auto">
  <name>Task 2: NotificationBanner + EmptyState components wired into Chat and History</name>
  <files>
    src/frontend/src/components/NotificationBanner.tsx
    src/frontend/src/components/EmptyState.tsx
    src/frontend/src/pages/Chat.tsx
    src/frontend/src/pages/History.tsx
  </files>
  <action>
1. Create EmptyState.tsx at src/frontend/src/components/:
   Props: {icon?: ReactNode, message: string, subtext?: string, ctaLabel?: string, onCta?: () => void}
   Renders: centered div with icon (defaults to ChatBubbleIcon or similar SVG), bold message, lighter subtext, and optional CTA button in primary color.
   Export as named export: export const EmptyState = ...

2. Wire EmptyState into Chat.tsx:
   In the chat list panel (left sidebar / session list), wrap the sessions.length===0 case:
   {sessions.length === 0 && (
     <EmptyState
       message="No chats yet"
       subtext="Start a conversation to ask ArthaBuild a NetSuite question"
       ctaLabel="New Chat"
       onCta={handleNewChat}
     />
   )}
   Keep existing chat list rendering logic unchanged when sessions.length > 0.

3. Wire EmptyState into History.tsx:
   Similar pattern — if chat history array is empty:
   <EmptyState
     message="No history yet"
     subtext="Your past conversations will appear here"
   />

4. Create NotificationBanner.tsx at src/frontend/src/components/:
   - Uses useEffect to poll GET /health/detail every 60 seconds (with Authorization: Bearer token from getAccessToken()).
   - Extracts warnings from the response:
     * ai_ready===false → "AI model unavailable — answers may be degraded"
     * disk_free_gb < 5 → "Disk space low ({disk_free_gb}GB free) — contact your admin"
     * license_valid===false → "License invalid — some features may be restricted"
   - If any warnings: render a yellow banner at top of page with warning text and a dismiss button (X).
   - If no warnings or /health/detail returns 401 (non-admin): render nothing.
   - Props: none — reads token and polls autonomously.

5. Wire NotificationBanner into Chat.tsx:
   Place <NotificationBanner /> at the very top of the Chat page return, above the main layout div.
   Import from "../components/NotificationBanner".
  </action>
  <verify>
    grep -n "EmptyState" src/frontend/src/pages/Chat.tsx
    grep -n "EmptyState" src/frontend/src/pages/History.tsx
    grep -n "NotificationBanner" src/frontend/src/pages/Chat.tsx
    grep -n "health/detail" src/frontend/src/components/NotificationBanner.tsx
    cd src/frontend && npm run build 2>&1 | grep -i "error" | head -5 || echo "PASS: no errors"
  </verify>
  <done>EmptyState component exists and is used in both Chat.tsx and History.tsx. NotificationBanner polls /health/detail and displays warnings. Frontend build is clean. OnboardingWizard is rendered inside Chat.tsx or the App root (whichever is appropriate).</done>
</task>

</tasks>

<verification>
1. Run Regression Guard (RG-17-01 through RG-17-05) — all 5 must PASS.
2. Frontend: login as a brand new admin user → OnboardingWizard modal appears.
3. Frontend: complete wizard → OnboardingWizard does not appear on next login.
4. Frontend: Chat page with empty sessions → EmptyState "No chats yet" visible.
5. AdminPanel: navigate to License tab → current license info shown + key input field.
6. NotificationBanner: with Ollama stopped, reload Chat page → yellow banner "AI model unavailable" visible.
7. Existing pytest suite still all pass.
</verification>

<success_criteria>
- OnboardingWizard shown on first admin login, hidden after completion
- License tab in AdminPanel allows key validation without .env edit
- NotificationBanner appears when health signals a problem
- EmptyState visible in Chat and History when no data exists
- Frontend build clean (npm run build exits 0)
- All 5 regression tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/17-onboarding-ux/17-01-SUMMARY.md`
</output>
```
  </action>
  <verify>
    ls /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/16-api-platform/16-01-PLAN.md
    ls /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/17-onboarding-ux/17-01-PLAN.md
    grep "Regression Guard" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/16-api-platform/16-01-PLAN.md
    grep "Regression Guard" /Users/jeet/doordash-p2p/apps/arthaBuild/.planning/phases/17-onboarding-ux/17-01-PLAN.md
  </verify>
  <done>Phase 16 and Phase 17 PLAN.md files exist. Each contains a "Regression Guard" section with 5 curl smoke tests. Phase 17 regression guard includes npm run build check for the frontend.</done>
</task>

</tasks>

<verification>
1. ROADMAP.md contains "Milestone 2: v2.0 — Enterprise Ready" section with all 5 phases (13-17).
2. Five PLAN.md files exist under .planning/phases/1{3..7}-*/
3. Each PLAN.md has a "## Regression Guard" section with exactly 5 named tests (RG-NN-01 through RG-NN-05).
4. Regression tests reference only real M1 endpoints: /health, /api/auth/login, /api/chats, /api/user/register, /api/admin/audit, /health/detail.
5. No code files were modified — only planning documents created.
</verification>

<success_criteria>
- ROADMAP.md: M2 milestone appended cleanly after Phase 08.1 entry, all 5 phases listed
- 5 PLAN.md files exist: 13-01, 14-01, 15-01, 16-01, 17-01
- Each PLAN.md: contains frontmatter, must_haves, Regression Guard (5 tests), objective, 2-3 tasks, verification, success_criteria
- Regression Guard in each file: tests RG-NN-01 through RG-NN-05 targeting real verified M1 endpoints
- Zero code changes made — this is a planning-only task
</success_criteria>

<output>
After completion, create `.planning/quick/278-plan-m2-enterprise-ready-milestone-phase/278-SUMMARY.md`
</output>
