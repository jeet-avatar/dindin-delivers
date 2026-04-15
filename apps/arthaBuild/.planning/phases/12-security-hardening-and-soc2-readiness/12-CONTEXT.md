# Phase 12: Security Hardening and SOC2 Readiness - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the platform to enterprise security standards and produce SOC2 readiness documentation. Covers: audit logging, HTTP security headers, CSRF policy, dependency vulnerability scanning, encryption at rest (AWS EBS), TLS hardening, OWASP ZAP scan, and 4 SOC2 compliance documents.

No new user-facing features. No UI changes beyond adding an Audit tab to the existing Admin Panel.

</domain>

<decisions>
## Implementation Decisions

### Audit Log — Scope
- Capture ALL of the following event types:
  - Auth events: login (success + failure), logout, token refresh, failed token refresh
  - Password events: password change, forgot-password request, password reset
  - Account events: account deletion, email verification resend
  - Admin events: user role change, user deactivation/deletion, team member invite, team member removal, config update
- This is the "all auth + admin events" scope — broadest coverage for SOC2 evidence

### Audit Log — Storage
- **Claude's decision:** Separate `AuditLog` SQLite table in the existing DB
  - Rationale: no new dependencies, queryable from the API, consistent with single-tenant architecture
  - Immutability enforced: no UPDATE or DELETE operations allowed on this table; append-only writes only
  - Index on `(timestamp DESC, actor_id)` for fast admin queries

### Audit Log — Fields per Event
- `id` (auto-increment PK)
- `timestamp` (ISO 8601, UTC)
- `actor_email` (who did it — string, not FK to avoid orphan issues on account deletion)
- `actor_role` (admin/user at time of action)
- `action` (dot-notation string, e.g. `user.role_changed`, `auth.login_failed`, `admin.team_member_removed`)
- `target` (affected resource: user_id, email, or config key — nullable)
- `result` (`success` or `failure`)
- `ip_address` (from request — for incident investigation)

### Audit Log — UI
- **Recommended approach:** Add an Audit tab to the existing Admin Panel
  - Paginated table, newest first, 50 events per page
  - Columns: Timestamp, Actor, Action, Target, Result
  - Filter by action type and date range
  - CASE-177 (`GET /api/admin/audit`) already validates the endpoint exists

### Encryption at Rest
- **v1.0 approach:** AWS EBS volume encryption via Terraform
  - Enable `encrypted = true` on the EBS volume in `infrastructure/terraform/`
  - Use AWS-managed KMS key (aws/ebs alias) — simpler than CMK for v1.0, still SOC2-compliant
  - No application-level changes needed; SQLite file is encrypted at the block level
  - Document in deployment guide that EBS encryption must be enabled at EC2 launch time
- **Key management:** AWS KMS (aws/ebs default key) — customer does not need to manage keys manually

### SOC2 Documentation — Documents Produced
All 4 documents, dual-purpose (customer due diligence + internal audit foundation):
1. `docs/security/SECURITY_CONTROLS.md` — SOC2 control checklist: control ID, category, status (implemented/partial/N/A), implementation evidence
2. `docs/security/INCIDENT_RESPONSE.md` — Lightweight runbook (1-2 pages): detection → containment → notify → remediate → post-mortem; key contacts, rough SLA timelines
3. `docs/security/DATA_CLASSIFICATION.md` — What data ArthaBuild holds, sensitivity levels, retention periods, deletion procedures
4. `docs/security/DEPLOYMENT_SECURITY.md` — Customer-facing: secure deployment checklist (env vars, network config, backup, monitoring, key rotation)
5. `SECURITY.md` at repo root — GitHub vulnerability disclosure convention; links to `docs/security/` for detail

### SOC2 Documentation — Location
```
docs/security/
├── SECURITY_CONTROLS.md
├── INCIDENT_RESPONSE.md
├── DATA_CLASSIFICATION.md
└── DEPLOYMENT_SECURITY.md
SECURITY.md  (repo root — GitHub convention)
```

### SOC2 Documentation — Runbook Depth
- **Claude's decision:** Lightweight (1-2 pages) appropriate for a startup seeking first enterprise customers
  - 5-step structure: Detect → Contain → Assess → Notify → Recover
  - Severity tiers: P1 (data breach) / P2 (service compromise) / P3 (vulnerability discovered)
  - No full escalation matrix — small team, single point of contact for now
  - Include: evidence preservation note, 72-hour breach notification SLA (GDPR baseline)

### HTTP Security Headers — Coverage
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS — 1 year)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- **Content Security Policy:** Claude's decision → report-only mode for v1.0
  - `Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`
  - Report-only: logs violations to console, does not block — safe to deploy without risking SPA breakage
  - Post-launch: tighten to enforcing mode once violations are reviewed
- All headers set in Nginx config (not FastAPI middleware — Nginx handles all HTTP responses)

### CSRF Protection
- **Claude's decision:** JWT-in-Authorization-header architecture makes traditional CSRF non-applicable
  - ArthaBuild stores JWT in memory only (not cookies), sends via `Authorization: Bearer` header
  - Cross-site requests cannot include custom headers → no CSRF vector exists by design
  - CASE-190 is satisfied by: (a) documenting this design decision in SECURITY_CONTROLS.md, (b) ensuring any cookies that do exist (e.g. session tracking) have `SameSite=Strict; HttpOnly; Secure`
  - No double-submit token implementation needed — would add complexity with no security benefit given auth architecture

### CORS Configuration
- **Claude's decision:** Tighten to specific allowed origins
  - Add `ALLOWED_ORIGINS` env var to docker-compose (default: `http://localhost:5173`)
  - Production: customer sets to their actual domain(s)
  - Remove any wildcard `*` origin if present in current FastAPI CORS middleware
  - Keep `allow_credentials=False` (JWT in header, not cookies — credentials flag unnecessary)

### OWASP ZAP Scan
- Run ZAP against local `docker-compose up` stack
- Target: `http://localhost` (Nginx port 80)
- Mode: Automated scan (not spider-only) with active scan enabled
- Acceptable outcome: zero HIGH or CRITICAL findings before closing CASE-194
- Document ZAP version, scan date, and findings summary in a `docs/security/ZAP_SCAN_REPORT.md`

### Dependency Vulnerability Scan (pip-audit)
- Run `pip-audit` in the backend container / venv
- Acceptable: zero CRITICAL or HIGH findings
- If findings exist: fix by upgrading affected packages; document any accepted LOW/MEDIUM with rationale
- Add `pip-audit` as a step in the Docker build or a CI note for future runs

### TLS Hardening (CASE-195)
- Nginx: `ssl_protocols TLSv1.2 TLSv1.3`
- Cipher suite: Mozilla Intermediate profile (balance of compatibility and security)
- Disable SSLv3, TLSv1.0, TLSv1.1 explicitly
- `ssl_prefer_server_ciphers on`

### Claude's Discretion
- Exact AuditLog SQLAlchemy model structure and Alembic migration details
- Specific `action` string taxonomy (dot-notation event names)
- pip-audit output parsing and pass/fail logic
- ZAP scan configuration flags and scan policy
- Exact ALLOWED_ORIGINS parsing (comma-separated string → list)
- Terraform EBS encryption block syntax

</decisions>

<specifics>
## Specific Ideas

- CSRF protection is documented via the auth architecture, not a code control — this is the correct answer for JWT-in-header apps (industry standard: Auth0, Supabase, and similar all use this approach)
- EBS encryption at the block device level is indistinguishable from SQLCipher from a SOC2 auditor's perspective — it satisfies "encryption at rest" equally
- Report-only CSP is the right v1.0 call: enforcing CSP on a React SPA without CSP testing is a common deployment foot-gun
- Use Mozilla SSL Configuration Generator (Intermediate profile) for cipher suites — widely accepted SOC2 evidence

</specifics>

<deferred>
## Deferred Ideas

- **SQLCipher / application-level encryption** — for GCP/Azure deployments post-launch (EBS-only covers AWS v1.0)
- **CSP enforcing mode** — tighten from report-only after reviewing violation reports post-launch
- **Scheduled pip-audit in CI** — add to GitHub Actions / CI pipeline after first customer launch
- **Full enterprise incident response playbook** (escalation matrix, legal notification templates, regulatory timelines) — when pursuing formal SOC2 Type II certification
- **Log shipping to SIEM** (Splunk, Datadog, etc.) — post-launch when customers request it

</deferred>

---

*Phase: 12-security-hardening-and-soc2-readiness*
*Context gathered: 2026-04-10*
