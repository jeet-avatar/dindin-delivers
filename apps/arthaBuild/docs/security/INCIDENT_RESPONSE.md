# ArthaBuild Incident Response Runbook

**Version:** 1.0
**Date:** 2026-04-10
**Contact:** support@techcloudpro.com

This is a lightweight runbook for a startup-stage product with a small team.
For formal SOC2 Type II, a full escalation matrix will replace this document.

---

## Severity Tiers

| Tier | Definition | Response SLA |
|------|-----------|-------------|
| P1 | Data breach — customer NetSuite credentials or ArthaBuild user credentials exposed | 1-hour containment; 72-hour customer notification (GDPR baseline) |
| P2 | Service compromise — unauthorized access to ArthaBuild admin or user accounts | 4 hours |
| P3 | Vulnerability discovered — no evidence of exploitation | 5 business days |

---

## 5-Step Response Process

### Step 1 — Detect

- **Sources:** Customer report, security scan alert (`pip-audit`, ZAP), log anomaly from `GET /api/admin/audit`
- **Log the incident:** date/time, reporter, initial description, severity tier assignment
- **Preserve evidence:** DO NOT delete logs, containers, or DB snapshots before investigation
- **Immediate check:** `GET /api/admin/audit?limit=50` — review the most recent 50 audit log entries for anomalies

---

### Step 2 — Contain

- **P1/P2:** Immediately rotate `JWT_SECRET_KEY` (invalidates ALL active sessions across deployment)
  ```bash
  # Generate new key
  openssl rand -hex 32

  # Update .env on EC2 instance
  nano /opt/arthaBuild/.env
  # Replace JWT_SECRET_KEY value

  # Restart backend container to pick up new key
  docker-compose restart backend
  ```
- **P1:** Snapshot the ArthaBuild SQLite DB + audit logs BEFORE any changes
  ```bash
  # Snapshot DB
  docker exec arthaBuild-backend-1 cp /app/data/arthaBuild.db /tmp/arthaBuild-incident-$(date +%Y%m%d).db
  docker cp arthaBuild-backend-1:/tmp/arthaBuild-incident-*.db ./
  ```
- **P2:** Force-logout specific accounts by rotating `JWT_SECRET_KEY` (invalidates all tokens) or restarting backend (clears JTI blacklist in-memory state)
- **P3:** No immediate containment required — assess scope first

---

### Step 3 — Assess

- **Review AuditLog:** `GET /api/admin/audit?limit=200` — check timeline of suspicious events
  - Filter by `actor_email` for the compromised account
  - Check `action` values: `auth.login_success`, `admin.role_changed`, `user.account_deleted`, etc.
  - Check `ip_address` for unexpected origins
- **Determine:**
  - Which accounts were accessed? (`actor_email` + `target` in audit rows)
  - What actions were taken? (`action` field in dot-notation)
  - What data was reachable? (NetSuite TBA creds if admin account compromised)
  - What is the exploit path? (JWT forgery? Credential stuffing? Social engineering?)
- **Key ArthaBuild data exposure model:**
  - ArthaBuild user accounts (email + password hash) — in SQLite DB
  - NetSuite TBA credentials — in-memory ONLY; wiped on logout/restart. Not in DB.
  - Chat history — in SQLite DB (chat_sessions, chat_messages)
  - Generated SuiteScript files — on EC2 filesystem

---

### Step 4 — Notify

**P1 — Customer notification within 72 hours of confirmation (GDPR baseline):**

Required content:
- Date of breach (UTC timestamp)
- Nature of data involved (ArthaBuild accounts? NetSuite credential exposure?)
- Actions taken to contain (key rotation, affected sessions invalidated)
- Recommended steps for customer (rotate NetSuite TBA credentials immediately)
- Contact for questions: support@techcloudpro.com

Channel: Email to customer admin contact on file.

**P2 — Customer notification within 24 hours:**
- Summary of unauthorized access, accounts affected, actions taken
- No full customer data classification needed (P2 = service compromise, not data breach)

**P3 — No customer notification required unless data was accessed**

---

### Step 5 — Recover

1. **Rotate all exposed secrets:**
   - `JWT_SECRET_KEY` — if not already done in Step 2
   - `SMTP_PASSWORD` — if email system may have been accessed
   - NetSuite TBA credentials — advise customer to rotate in NetSuite directly (ArthaBuild holds TBA in RAM only, not on disk)

2. **Patch the vulnerability:**
   - Follow standard GSD workflow (`/gsd:quick` for small fixes, `/gsd:plan-phase` for larger changes)
   - Write test covering the exploit path before patching

3. **Re-run security scans after patch:**
   ```bash
   # pip-audit
   pip-audit -r src/backend/requirements.txt

   # Full test suite
   cd src/backend && pytest tests/ -v

   # ZAP (if stack is running)
   docker run --network=host ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://localhost
   ```

4. **Write post-mortem:** root cause, timeline, fix, prevention measures. Save to `docs/security/incidents/YYYY-MM-DD-incident-name.md`.

5. **Update controls:** If a control gap is found, update `docs/security/SECURITY_CONTROLS.md` with the corrected status and evidence.

---

## Evidence Preservation

Before any remediation, preserve:
- `arthaBuild.db` snapshot (contains AuditLog — primary forensic record)
- Container logs: `docker logs arthaBuild-backend-1 > /tmp/backend-logs-$(date +%Y%m%d).txt`
- Any relevant network access logs (CloudWatch if on AWS — check EC2 access logs + ALB logs)

---

## Key Contact

| Role | Contact |
|------|---------|
| Engineering | support@techcloudpro.com |
| Security disclosure | security@techcloudpro.com |
| Customer admin | Customer's designated ArthaBuild admin account |
