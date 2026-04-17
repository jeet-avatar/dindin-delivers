# Phase 12: Security Hardening and SOC2 Readiness - Research

**Researched:** 2026-04-10
**Domain:** Application security hardening, SOC2 compliance documentation, Python/Nginx/Terraform security controls
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit Log — Scope:**
Capture ALL of the following event types:
- Auth events: login (success + failure), logout, token refresh, failed token refresh
- Password events: password change, forgot-password request, password reset
- Account events: account deletion, email verification resend
- Admin events: user role change, user deactivation/deletion, team member invite, team member removal, config update
This is the "all auth + admin events" scope — broadest coverage for SOC2 evidence

**Audit Log — Storage:**
Separate `AuditLog` SQLite table in the existing DB
- Immutability enforced: no UPDATE or DELETE operations allowed on this table; append-only writes only
- Index on `(timestamp DESC, actor_id)` for fast admin queries

**Audit Log — Fields per Event:**
- `id` (auto-increment PK)
- `timestamp` (ISO 8601, UTC)
- `actor_email` (who did it — string, not FK to avoid orphan issues on account deletion)
- `actor_role` (admin/user at time of action)
- `action` (dot-notation string, e.g. `user.role_changed`, `auth.login_failed`, `admin.team_member_removed`)
- `target` (affected resource: user_id, email, or config key — nullable)
- `result` (`success` or `failure`)
- `ip_address` (from request — for incident investigation)

**Audit Log — UI:**
Add an Audit tab to the existing Admin Panel
- Paginated table, newest first, 50 events per page
- Columns: Timestamp, Actor, Action, Target, Result
- Filter by action type and date range
- CASE-177 (GET /api/admin/audit) already validates the endpoint exists

**Encryption at Rest:**
AWS EBS volume encryption via Terraform
- Enable `encrypted = true` on the EBS volume in `infrastructure/terraform/`
- Use AWS-managed KMS key (aws/ebs alias) — simpler than CMK for v1.0, still SOC2-compliant
- No application-level changes needed; SQLite file is encrypted at the block level

**SOC2 Documentation — Documents Produced:**
1. `docs/security/SECURITY_CONTROLS.md`
2. `docs/security/INCIDENT_RESPONSE.md`
3. `docs/security/DATA_CLASSIFICATION.md`
4. `docs/security/DEPLOYMENT_SECURITY.md`
5. `SECURITY.md` at repo root

**HTTP Security Headers:**
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- CSP in report-only mode: `Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`
- All headers set in Nginx config (not FastAPI middleware)

**CSRF Protection:**
JWT-in-Authorization-header architecture makes traditional CSRF non-applicable. Satisfied by documentation in SECURITY_CONTROLS.md + ensuring any cookies have `SameSite=Strict; HttpOnly; Secure`. No double-submit token needed.

**CORS Configuration:**
Tighten to specific allowed origins via `ALLOWED_ORIGINS` env var. Remove any wildcard. Keep `allow_credentials=False`.

**OWASP ZAP Scan:**
Run against local `docker-compose up` stack, target `http://localhost`. Automated scan with active scan enabled. Zero HIGH or CRITICAL findings required. Document in `docs/security/ZAP_SCAN_REPORT.md`.

**Dependency Vulnerability Scan:**
Run `pip-audit` in backend venv. Zero CRITICAL or HIGH. Add as Docker build step or CI note.

**TLS Hardening:**
Nginx: `ssl_protocols TLSv1.2 TLSv1.3`. Mozilla Intermediate cipher profile. Disable SSLv3/TLS 1.0/1.1. `ssl_prefer_server_ciphers on`.

### Claude's Discretion
- Exact AuditLog SQLAlchemy model structure and Alembic migration details
- Specific `action` string taxonomy (dot-notation event names)
- pip-audit output parsing and pass/fail logic
- ZAP scan configuration flags and scan policy
- Exact ALLOWED_ORIGINS parsing (comma-separated string → list)
- Terraform EBS encryption block syntax

### Deferred Ideas (OUT OF SCOPE)
- SQLCipher / application-level encryption
- CSP enforcing mode (post-launch)
- Scheduled pip-audit in CI (post-launch)
- Full enterprise incident response playbook
- Log shipping to SIEM (Splunk, Datadog)
</user_constraints>

---

## Summary

Phase 12 is a security hardening and compliance documentation phase, not a feature-building phase. Its primary output is a hardened infrastructure configuration and four SOC2 control documents. All security controls are well-understood and standard; the main risk is a coordination problem — touching 5 layers (models, routers, nginx, terraform, documentation) across 8 CASEs without regressions.

The existing audit log model (`AuditLog` in `models.py`, Alembic migration `b3c4d5e6f7a8`) was built in Phase 10 with admin-only scope. Phase 12 expands scope to include auth/user events by migrating to the broader field set defined in CONTEXT.md. The migration requires an Alembic `batch_alter_table` (SQLite rule) to add the new columns (`timestamp`, `actor_email`, `actor_role`, `result`, `ip_address`) and rename the existing narrow columns. The `_write_audit()` helper in `admin.py` must be extracted to `auth_utils.py` or a new `audit_utils.py` module so auth and user routers can also call it without circular imports.

The test pattern for this phase is `tests/security/` subdirectory with static analysis (grep/file inspection) tests for the nginx config, Terraform, and ZAP. The existing `tests/test_security.py` pattern (pytest-asyncio, async client fixtures) applies for audit log tests. Six new test files are needed: `test_audit_log.py`, `test_https_redirect.py`, `test_security_headers.py`, `test_csrf.py`, `test_encryption.py`, `test_tls_config.py`.

**Primary recommendation:** Structure Phase 12 as three plans: (1) Audit log expansion + new Alembic migration + auth event hooks + backend tests; (2) Nginx hardening (HTTPS redirect, security headers, TLS) + CORS tightening + Terraform EBS encryption + infrastructure tests; (3) Security scans (pip-audit, ZAP) + SOC2 documentation + ARCHITECTURE.md v2.1 + test-report.html.

---

## Existing Code State (Critical for Planning)

Understanding what already exists prevents duplicate work and migration collisions.

### What Already Exists (Do Not Rebuild)

| Component | Location | Current State | Phase 12 Change |
|-----------|----------|---------------|-----------------|
| `AuditLog` SQLAlchemy model | `src/backend/models.py` | Narrow: `admin_id` FK, `action`, `target_user_id`, `detail`, `created_at` | Expand: add `actor_email`, `actor_role`, `result`, `ip_address`, rename columns |
| `_write_audit()` helper | `src/backend/routers/admin.py:173` | Admin-only helper, narrow signature | Extract to shared module, expand signature |
| `GET /api/admin/audit` | `src/backend/routers/admin.py:296` | Returns 50 entries, no pagination/filter | Add pagination (`offset`, `limit`), filter params |
| Alembic migration chain | `alembic/versions/` | Latest: `c4d5e6f7a8b9_phase11_email_verification.py` | New migration `d5e6f7a8b9ca_phase12_audit_expansion.py` |
| CORS config | `src/backend/rawapi.py:113` | Already uses `FRONTEND_BASE_URL` env var, no wildcard | Rename to `ALLOWED_ORIGINS`, support comma-separated list |
| nginx config | `nginx/nginx.conf` | Only HTTP/80, no HSTS/TLS/headers | Add port 443 block, redirect, headers, TLS directives |
| Terraform EBS | `infra/terraform/main.tf` | `root_block_device` block exists, no `encrypted` | Add `encrypted = true`, `kms_key_id` optional |
| Tests/security | `src/backend/tests/` | No `tests/security/` subdirectory | Create with 6 new test files |

### Existing `_write_audit()` Signature (admin.py:173)

```python
async def _write_audit(
    db: AsyncSession,
    admin_id: int,
    action: str,
    target_user_id: int | None = None,
    detail: str | None = None,
) -> None:
```

This signature is admin-only (takes `admin_id`). The Phase 12 expansion needs `actor_email`, `actor_role`, `ip_address`, `result` — a different shape. The new helper must be backward compatible or the 5 existing call sites in `admin.py` must be updated.

### Existing AuditLog Model Columns (Alembic migration b3c4d5e6f7a8)

```sql
id           INTEGER PK
admin_id     INTEGER FK(users.id) NOT NULL
action       STRING NOT NULL
target_user_id INTEGER FK(users.id) NULLABLE
detail       STRING NULLABLE
created_at   DATETIME server_default=now()
```

Phase 12 must ADD columns and keep backward compatibility. Cannot DROP `admin_id` without breaking existing audit rows. Approach: add new columns as nullable, populate from context at write time.

### Test Infrastructure

- `tests/conftest.py` provides: `client` (async HTTPX), `db_session`, `registered_user`, `auth_tokens`
- First-registered user becomes admin — tests that need an admin use this invariant
- All fixtures use in-memory SQLite (`sqlite+aiosqlite:///:memory:`)
- `pytest.ini` in `src/backend/tests/` controls test discovery

---

## Standard Stack

### Core (No New Dependencies Required)

| Tool | Version | Purpose | Source |
|------|---------|---------|--------|
| Alembic | 1.13.3 (pinned) | DB migration for audit log expansion | Already in `requirements.txt` |
| SQLAlchemy | 2.0.35 (pinned) | ORM for expanded AuditLog model | Already in `requirements.txt` |
| FastAPI | 0.115.0 (pinned) | Request object for `request.client.host` IP extraction | Already in `requirements.txt` |
| Nginx | Container (stable) | Security headers, HTTPS redirect, TLS config | Already in `nginx/nginx.conf` |
| Terraform | ~> 5.0 (AWS provider) | EBS encryption via `encrypted = true` | Already in `infra/terraform/main.tf` |

### New Dependencies (Minimal)

| Package | Install | Purpose |
|---------|---------|---------|
| `pip-audit` | `pip install pip-audit` | Dependency vulnerability scan, NOT in requirements.txt |

**Installation:**
```bash
pip install pip-audit
# Run: pip-audit -r requirements.txt --format=json
```

Note: `pip-audit` is a dev/CI tool, not a production dependency. Do not add to `requirements.txt`. Document as a manual step or CI addition.

### No New Python Dependencies for Core Features

The audit log expansion, security headers, and TLS hardening require zero new Python packages. All use existing SQLAlchemy, FastAPI, and Nginx capabilities.

---

## Architecture Patterns

### Pattern 1: Audit Log Schema Migration (SQLite `batch_alter_table`)

**What:** SQLite cannot ALTER TABLE to add columns with constraints — requires `batch_alter_table`. Project rule (CLAUDE.md): always use `render_as_batch=True`.

**When to use:** Adding columns to existing `audit_logs` table.

**Migration approach:** Add new columns as `NULLABLE` with no server_default (Python sets them). The existing narrow columns (`admin_id`, `target_user_id`, `detail`) remain for backward compatibility with existing rows.

```python
# Source: Alembic docs + project pattern from b3c4d5e6f7a8 migration
revision = "d5e6f7a8b9ca"
down_revision = "c4d5e6f7a8b9"

def upgrade():
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.add_column(sa.Column("actor_email", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("actor_role", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("result", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("ip_address", sa.String(), nullable=True))
    op.create_index(
        "ix_audit_logs_timestamp_actor",
        "audit_logs",
        ["created_at", "actor_email"],
    )
```

### Pattern 2: Shared Audit Write Helper

**What:** Extract `_write_audit()` from `admin.py` into a shared module to avoid circular imports.

**Where:** `src/backend/audit_utils.py` (new file) — no circular import risk because it imports only from `models.py` and `database.py`.

**New signature:**
```python
# audit_utils.py
from models import AuditLog
from sqlalchemy.ext.asyncio import AsyncSession

async def write_audit_event(
    db: AsyncSession,
    actor_email: str,
    actor_role: str,
    action: str,
    result: str,                    # "success" | "failure"
    ip_address: str | None = None,
    target: str | None = None,      # user_id, email, or config key
) -> None:
    """Append-only audit log write. Caller commits the session."""
    log = AuditLog(
        actor_email=actor_email,
        actor_role=actor_role,
        action=action,
        result=result,
        ip_address=ip_address,
        target=target,
    )
    db.add(log)
    # NOTE: No db.commit() here — caller is responsible for atomicity
```

**Existing call sites to update (5 locations in admin.py):**
- `admin.py:262` — `_write_audit(db, admin.id, "role_changed", user_id)` → `write_audit_event(db, admin.email, admin.role, "admin.role_changed", "success", target=str(user_id))`
- `admin.py:291` — user_removed
- `admin.py:345` — config_updated
- `admin.py:389` — team_created
- `admin.py:424` — admin.send_reset (Phase 11)

### Pattern 3: IP Address Extraction from FastAPI Request

**What:** `request.client.host` gives the direct connection IP. Behind Nginx reverse proxy, use `X-Real-IP` header instead.

**Pattern:**
```python
# In FastAPI endpoint that needs IP
from fastapi import Request

async def login(request: Request, ...):
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    await write_audit_event(db, actor_email=user.email, ..., ip_address=ip)
```

Nginx already sets `proxy_set_header X-Real-IP $remote_addr;` in the existing config.

### Pattern 4: Nginx Security Headers Block

**What:** Add `add_header` directives to Nginx server block. Must appear in the correct location (server-level affects all responses; location-level only affects that block).

**Where to add:** In the `server` block, before `location` blocks.

```nginx
# nginx/nginx.conf — server block additions
server {
    listen 80;
    server_name _;

    # Redirect all HTTP to HTTPS (CASE-188)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # TLS hardening (CASE-195) — Mozilla Intermediate profile
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers (CASE-189)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'" always;

    # ... existing location blocks ...
}
```

**Important:** The `always` parameter ensures headers are sent on error responses too, not just 2xx.

### Pattern 5: Terraform EBS Encryption

**What:** Add `encrypted = true` to the existing `root_block_device` block. AWS-managed KMS key (aws/ebs default alias) requires no additional IAM or KMS configuration — it just works.

**Existing block (infra/terraform/main.tf):**
```hcl
root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ebs_size_gb
    delete_on_termination = false
    tags = { Name = "arthaBuild-data" }
}
```

**After change:**
```hcl
root_block_device {
    volume_type           = "gp3"
    volume_size           = var.ebs_size_gb
    delete_on_termination = false
    encrypted             = true   # AES-256, AWS-managed KMS key (CASE-193)
    tags = { Name = "arthaBuild-data" }
}
```

Note: Encryption applies only to new EBS volumes. Existing running instances must be snapshot-and-replace to get encrypted EBS. The Terraform change is correct for all new deployments.

### Pattern 6: CORS Tightening

**What:** Current `rawapi.py:113` already uses `FRONTEND_BASE_URL` env var. Phase 12 adds `ALLOWED_ORIGINS` support for comma-separated multiple origins (needed when customer has subdomain + apex domain).

**Current (rawapi.py):**
```python
_frontend_origin = os.getenv("FRONTEND_BASE_URL", "")
_dev_origins = [f"http://localhost:{p}" for p in range(5173, 5181)] + ["http://127.0.0.1:5173"]
_allowed_origins = [_frontend_origin] if _frontend_origin else _dev_origins
```

**After change:**
```python
_origins_env = os.getenv("ALLOWED_ORIGINS", os.getenv("FRONTEND_BASE_URL", ""))
if _origins_env:
    _allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
else:
    _allowed_origins = [f"http://localhost:{p}" for p in range(5173, 5181)] + ["http://127.0.0.1:5173"]
```

Keep `allow_credentials=False` (CONTEXT.md decision — JWT in header, not cookies).

### Recommended Project Structure for Phase 12 Additions

```
src/backend/
├── audit_utils.py          # NEW: shared write_audit_event() helper
├── routers/
│   ├── admin.py            # MODIFY: update 5 _write_audit() call sites, expand GET /audit
│   ├── auth.py             # MODIFY: add write_audit_event() to login, logout, refresh, forgot-password, reset-password
│   └── user.py             # MODIFY: add write_audit_event() to register, delete-account, resend-verification, change-password
├── models.py               # MODIFY: add new columns to AuditLog
├── rawapi.py               # MODIFY: ALLOWED_ORIGINS parsing
└── alembic/versions/
    └── d5e6f7a8b9ca_phase12_audit_expansion.py  # NEW

nginx/
└── nginx.conf              # MODIFY: port 443, HTTPS redirect, security headers, TLS

infra/terraform/
└── main.tf                 # MODIFY: encrypted = true on root_block_device

docs/
└── security/               # NEW directory
    ├── SECURITY_CONTROLS.md
    ├── INCIDENT_RESPONSE.md
    ├── DATA_CLASSIFICATION.md
    └── DEPLOYMENT_SECURITY.md

SECURITY.md                 # NEW at repo root

tests/security/             # NEW directory (under src/backend/tests/)
├── __init__.py
├── test_audit_log.py
├── test_https_redirect.py
├── test_security_headers.py
├── test_csrf.py
├── test_encryption.py
└── test_tls_config.py
```

### Anti-Patterns to Avoid

- **Do NOT add `db.commit()` inside `write_audit_event()`** — audit writes must be atomic with the parent operation. Caller commits. If the parent operation fails and rolls back, the audit entry also rolls back.
- **Do NOT add security headers in FastAPI middleware** — the CONTEXT.md decision is Nginx handles all HTTP responses. Adding in both places causes duplicate headers.
- **Do NOT use `request.client.host` directly** — behind Nginx reverse proxy this will be `127.0.0.1`. Use `X-Real-IP` header instead.
- **Do NOT DROP existing `admin_id` column** — existing audit rows reference it. Add new columns as nullable; fill from context.
- **Do NOT run pip-audit inside the test suite** — it spawns subprocess processes and breaks test isolation. Run as a separate manual/CI step.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TLS cipher suites | Custom cipher string | Mozilla SSL Config Generator (Intermediate profile) | Industry-vetted, SOC2-accepted evidence |
| Dependency CVE scanner | Custom pip version check | `pip-audit` | Checks PyPI Advisory DB + OSV, JSON output, maintained by PyPA |
| OWASP scan | Custom HTTP fuzzer | OWASP ZAP Docker (`ghcr.io/zaproxy/zaproxy:stable`) | Industry-standard, SOC2 auditor-recognized tool |
| Audit log tamper detection | Cryptographic hash chain | Append-only SQLite (no UPDATE/DELETE permissions) | Simpler, sufficient for startup SOC2, no new deps |
| SOC2 control checklist | Custom compliance framework | SOC2 CC6/CC8/A1 mappings (standard) | Documented in CONTEXT.md — follow exactly |

**Key insight:** Every component in this phase has a well-established "right answer" in the industry. The planning risk is configuration details (cipher suites, ZAP flags, migration syntax), not algorithm design.

---

## Common Pitfalls

### Pitfall 1: Alembic Migration Breaks Existing Audit Rows

**What goes wrong:** Adding `NOT NULL` columns without `server_default` causes migration failure on existing audit rows that have no value for the new column.

**Why it happens:** SQLite's batch_alter_table generates a new table with all existing rows copied. If new columns are `NOT NULL` with no default, the copy fails.

**How to avoid:** Add all new columns as `nullable=True`. The application code sets them at write time. Never add server_default for business logic fields.

**Warning signs:** Alembic `upgrade` fails with "NOT NULL constraint failed" during the copy phase.

### Pitfall 2: HTTPS Redirect Breaks Docker Compose Dev (Port 80 Only)

**What goes wrong:** Adding `return 301 https://$host$request_uri;` on port 80 breaks the dev `docker-compose up` workflow because no SSL cert exists in development.

**Why it happens:** The nginx.conf is used in both dev and production Docker contexts.

**How to avoid:** The nginx.conf must have conditional structure:
- Port 80 `server` block with HTTPS redirect is for production only
- Dev workflow uses port 80 without TLS — keep the existing port 80 `server` block intact
- Solution: Use environment variable or a separate `nginx.dev.conf` vs `nginx.prod.conf`

**Warning signs:** `docker-compose up` works but all API calls return 301 redirect loops.

**Recommended approach:** Keep current `nginx.conf` as the dev config (port 80 only). Create `nginx.prod.conf` with full TLS + redirect + headers. Reference `nginx.prod.conf` in deployment docs. The test `test_https_redirect.py` runs against the prod config file (static analysis), not a live Nginx.

### Pitfall 3: Security Header Tests Fail in Async Test Client

**What goes wrong:** HTTPX async test client (used in `conftest.py`) talks directly to FastAPI via ASGI — it bypasses Nginx. Security headers added to Nginx won't appear in test responses.

**Why it happens:** `AsyncClient(app=app, ...)` skips Nginx entirely.

**How to avoid:** Security header tests in `test_security_headers.py` MUST be static analysis tests (parsing `nginx/nginx.conf` as a text file), NOT live HTTP tests. The CASE-189 template in the CASE file already shows this pattern.

**Warning signs:** Test assertions check `response.headers.get("X-Frame-Options")` and always get None.

### Pitfall 4: AuditLog Circular Import

**What goes wrong:** If `write_audit_event()` is placed in `auth_utils.py`, importing it in `routers/auth.py` creates a circular import. `auth_utils.py` already imports from `models.py`; `models.py` imports from `database.py` — adding reverse imports breaks the chain.

**Why it happens:** `auth_utils.py` is imported at app startup before routers. If it imports from routers, the circular dependency causes `ImportError`.

**How to avoid:** Place `write_audit_event()` in a NEW `audit_utils.py` file. It only imports from `models.py` and `sqlalchemy`. No circular risk. Both `auth.py` and `admin.py` import from `audit_utils.py`.

**Warning signs:** `ImportError: cannot import name 'write_audit_event' from partially initialized module`.

### Pitfall 5: IP Address Is 127.0.0.1 Behind Nginx

**What goes wrong:** `request.client.host` returns `127.0.0.1` (the Nginx container IP) instead of the real client IP, making audit log IP addresses useless.

**Why it happens:** Nginx proxies the request; FastAPI sees Nginx as the client.

**How to avoid:** Use `request.headers.get("X-Real-IP", request.client.host)`. Nginx already sets `proxy_set_header X-Real-IP $remote_addr;` (verified in `nginx/nginx.conf`).

### Pitfall 6: pip-audit Finds Vulnerabilities in Existing Dependencies

**What goes wrong:** `pip-audit` reports HIGH vulnerabilities in pinned packages (langchain-core, SQLAlchemy, fastapi, etc.) that are difficult to upgrade without breaking other pinned versions.

**Why it happens:** The project uses strict version pinning due to the langchain-ollama/langchain-core compatibility incident (STATE.md entry).

**How to avoid:** Run pip-audit BEFORE the phase ends. If findings exist, triage: (a) upgrade if the package has no conflicting pins, (b) document accepted risk with rationale for MEDIUM/LOW, (c) escalate to user for CRITICAL/HIGH that can't be fixed. Do not defer this to "after phase."

**Warning signs:** pip-audit output shows CRITICAL or HIGH findings — these block CASE-191.

### Pitfall 7: ZAP Scan Requires Running Stack

**What goes wrong:** CASE-194 (OWASP ZAP scan) cannot run without a live ArthaBuild instance. ZAP needs a real HTTP target.

**Why it happens:** It's a dynamic security scan, not static analysis.

**How to avoid:** Run ZAP against `docker-compose up` local stack. The test file `tests/security/test_zap_scan.py` should be marked `@pytest.mark.integration` and skipped in the default pytest run. Document the manual execution steps in the plan.

---

## Code Examples

### Audit Event: Login Success/Failure Hook (auth.py)

```python
# Source: project pattern + CONTEXT.md decision
from audit_utils import write_audit_event

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    ip = request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")
    
    # ... existing lookup and verification logic ...
    
    if not verify_password(data.password, user.password_hash):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        await write_audit_event(
            db, actor_email=data.username.lower(), actor_role="unknown",
            action="auth.login_failed", result="failure", ip_address=ip
        )
        await db.commit()
        raise generic_error

    # Successful login
    user.failed_attempts = 0
    user.locked_until = None
    await write_audit_event(
        db, actor_email=user.email, actor_role=user.role,
        action="auth.login_success", result="success", ip_address=ip
    )
    await db.commit()
    return TokenResponse(...)
```

### Alembic Migration: Add Columns with batch_alter (phase12)

```python
# Source: project pattern from b3c4d5e6f7a8 + a2b3c4d5e6f7 migrations
from alembic import op
import sqlalchemy as sa

revision = "d5e6f7a8b9ca"
down_revision = "c4d5e6f7a8b9"

def upgrade():
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.add_column(sa.Column("actor_email", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("actor_role", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("result", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("ip_address", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("target", sa.String(), nullable=True))
    op.create_index(
        "ix_audit_logs_ts_actor",
        "audit_logs",
        ["created_at", "actor_email"],
    )

def downgrade():
    op.drop_index("ix_audit_logs_ts_actor", table_name="audit_logs")
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.drop_column("target")
        batch_op.drop_column("ip_address")
        batch_op.drop_column("result")
        batch_op.drop_column("actor_role")
        batch_op.drop_column("actor_email")
```

### Test: Audit Log Static Analysis (append-only check)

```python
# Source: CASE-192 template + project test pattern
@pytest.mark.asyncio
async def test_audit_log_rows_cannot_be_updated(client, db_session, auth_tokens):
    """Verify that AuditLog ORM model has no update path (append-only invariant)."""
    from models import AuditLog
    import sqlalchemy as sa
    # Write a test audit entry directly
    entry = AuditLog(actor_email="test@x.com", actor_role="admin", action="test.event", result="success")
    db_session.add(entry)
    await db_session.commit()
    await db_session.refresh(entry)
    entry_id = entry.id

    # Attempt to UPDATE via SQL — should be blocked at the application level
    # (No UPDATE route exists; test that GET /api/admin/audit doesn't expose mutation)
    resp = await client.put(f"/api/admin/audit/{entry_id}", headers=auth_tokens, json={"action": "tampered"})
    assert resp.status_code in (404, 405), "AuditLog must not have a PUT/PATCH endpoint"
```

### Test: Nginx Security Headers (static analysis)

```python
# Source: CASE-189 template — static analysis is correct pattern (not live HTTP)
import re

def test_nginx_conf_has_hsts_header():
    with open("nginx/nginx.conf") as f:
        content = f.read()
    assert "Strict-Transport-Security" in content, "Missing HSTS header in nginx.conf"
    assert "max-age=31536000" in content, "HSTS max-age must be at least 1 year"
    assert "includeSubDomains" in content, "HSTS must include subdomains"

def test_nginx_conf_has_x_frame_options():
    with open("nginx/nginx.conf") as f:
        content = f.read()
    assert "X-Frame-Options" in content
    assert "DENY" in content

def test_nginx_conf_has_content_type_options():
    with open("nginx/nginx.conf") as f:
        content = f.read()
    assert "X-Content-Type-Options" in content
    assert "nosniff" in content
```

### SECURITY_CONTROLS.md Template (SOC2 format)

```markdown
# ArthaBuild Security Controls

**Version:** 1.0
**Date:** 2026-04-10
**Standard:** SOC2 Type II readiness

| Control ID | Category | Control | Status | Evidence |
|------------|----------|---------|--------|----------|
| CC6.1 | Access Control | Authentication required for all API endpoints | Implemented | `rawapi.py` — require_auth_middleware |
| CC6.1 | Access Control | Bcrypt password hashing (cost ≥ 12) | Implemented | `auth_utils.py:hash_password()` |
| CC6.1 | Access Control | JWT HS256, 24h access / 7d refresh | Implemented | `auth_utils.py:create_access_token()` |
| CC6.6 | Access Control | Rate limiting: 10 req/min on auth endpoints | Implemented | SlowAPI in `rawapi.py` |
| CC6.7 | Data Transmission | HTTPS enforced via Nginx (TLS 1.2+) | Implemented | `nginx/nginx.conf` |
| CC6.7 | Data Transmission | HSTS header: max-age=31536000 | Implemented | `nginx/nginx.conf` |
| CC7.2 | Audit Logging | All auth events logged with actor/IP/result | Implemented | `audit_utils.py` + CASE-192 |
| CC8.1 | Change Management | SECURITY.md vulnerability disclosure | Implemented | Repo root `SECURITY.md` |
| CC9.2 | Risk Mitigation | Dependency scan: pip-audit (0 HIGH/CRITICAL) | Implemented | `docs/security/ZAP_SCAN_REPORT.md` |
| A1.1 | Availability | EBS encrypted at rest | Implemented | `infra/terraform/main.tf` |
```

---

## Expanded AuditLog SQLAlchemy Model

```python
# Source: CONTEXT.md schema decisions + project convention (models.py)
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    # Phase 12 expansion — new fields
    actor_email = Column(String, nullable=True)   # string, not FK (survives account deletion)
    actor_role  = Column(String, nullable=True)   # "admin" | "user" at time of action
    action      = Column(String, nullable=False)  # dot-notation: "auth.login_failed"
    result      = Column(String, nullable=True)   # "success" | "failure"
    ip_address  = Column(String, nullable=True)
    target      = Column(String, nullable=True)   # user_id, email, or config key
    # Phase 10 legacy fields — kept for backward compatibility
    admin_id    = Column(Integer, ForeignKey("users.id"), nullable=True)  # was NOT NULL, now NULLABLE
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    detail      = Column(String, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
```

Key: `admin_id` changes from `nullable=False` to `nullable=True` in the migration, because new auth-event audit rows won't have an `admin_id`.

---

## Action String Taxonomy (dot-notation)

Recommended `action` strings for Phase 12 audit events:

| Event | Action String | Router | Result Values |
|-------|--------------|--------|---------------|
| Login success | `auth.login_success` | auth.py | success |
| Login failure | `auth.login_failed` | auth.py | failure |
| Logout | `auth.logout` | auth.py | success |
| Token refresh success | `auth.token_refresh` | auth.py | success |
| Token refresh failure | `auth.token_refresh_failed` | auth.py | failure |
| Registration | `auth.register` | user.py | success |
| Password change | `user.password_changed` | user.py | success |
| Forgot password request | `user.forgot_password` | auth.py | success |
| Password reset | `user.password_reset` | auth.py | success |
| Account deletion | `user.account_deleted` | user.py | success |
| Email verification resend | `user.email_resend` | user.py | success |
| Role change | `admin.role_changed` | admin.py | success |
| User deactivation | `admin.user_removed` | admin.py | success |
| Team invite sent | `admin.invite_sent` | admin.py | success |
| Config update | `admin.config_updated` | admin.py | success |
| Admin password reset | `admin.password_reset_sent` | admin.py | success |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| TLS 1.0/1.1 (deprecated 2021) | TLS 1.2+ only (Mozilla Intermediate) | Eliminates POODLE/BEAST vulnerabilities |
| CSP in enforcing mode (blocks SPA) | CSP in report-only mode for v1.0 | Catches violations without breaking React app |
| Manual security review | OWASP ZAP automated baseline scan | Reproducible, SOC2-auditor recognized evidence |
| SQLCipher application-level encryption | EBS-level AES-256 encryption (AWS KMS) | Same SOC2 compliance, zero app code changes |
| Wildcard CORS | Explicit origin allowlist | Eliminates cross-origin attack surface |

**Deprecated/outdated:**
- TLS 1.0 and TLS 1.1: IETF formally deprecated in RFC 8996 (March 2021). Never configure.
- SSLv3: Eliminated by POODLE attack. Never configure.
- `ALLOW_ORIGINS = ["*"]` with credentials: Invalid per CORS spec; FastAPI raises error if combined with `allow_credentials=True`.

---

## CASE-by-CASE Implementation Summary

| CASE | Title | Files Changed | Test File | Confidence |
|------|-------|--------------|-----------|------------|
| CASE-188 | HTTPS redirect | `nginx/nginx.conf` (new port 80 redirect block) | `test_https_redirect.py` (static analysis) | HIGH |
| CASE-189 | Security headers | `nginx/nginx.conf` (add_header directives) | `test_security_headers.py` (static analysis) | HIGH |
| CASE-190 | CSRF protection | `docs/security/SECURITY_CONTROLS.md` (document), verify no Set-Cookie JWT | `test_csrf.py` (static analysis + endpoint check) | HIGH |
| CASE-191 | pip-audit | Manual run + `docs/security/ZAP_SCAN_REPORT.md` | `test_pip_audit.py` (subprocess call or skip) | MEDIUM |
| CASE-192 | Audit log expansion | `models.py`, `audit_utils.py` (new), `routers/auth.py`, `routers/admin.py`, `routers/user.py`, Alembic migration | `tests/security/test_audit_log.py` (async) | HIGH |
| CASE-193 | EBS encryption | `infra/terraform/main.tf` | `test_encryption.py` (static: parse main.tf) | HIGH |
| CASE-194 | OWASP ZAP | `docs/security/ZAP_SCAN_REPORT.md` | `test_zap_scan.py` (integration, manual) | MEDIUM |
| CASE-195 | TLS hardening | `nginx/nginx.conf` (ssl_protocols, ssl_ciphers) | `test_tls_config.py` (static analysis) | HIGH |

---

## Open Questions

1. **`admin_id` column nullability migration**
   - What we know: The existing `admin_id` column is `NOT NULL` in the schema (migration b3c4d5e6f7a8)
   - What's unclear: SQLite batch_alter may not support altering nullability directly; may need a full table rebuild
   - Recommendation: In the migration, use `batch_alter_table` to rename the column then recreate — OR simply add all new columns and keep `admin_id` as NOT NULL with a sentinel value (0) for auth events. Sentinel value approach is simpler and avoids migration complexity. Add to plan as a decision point.

2. **nginx.conf: dev vs prod separation**
   - What we know: Current `nginx.conf` is shared between dev Docker and production deployment
   - What's unclear: Does the CASE-188 HTTPS redirect break the dev workflow?
   - Recommendation: Plan should either (a) use two config files or (b) make the port 80 redirect conditional via Nginx variable. Recommend option (a): `nginx.conf` (dev, port 80 only) + `nginx.prod.conf` (port 443 + redirect). Update `docs/security/DEPLOYMENT_SECURITY.md` to reference prod config.

3. **pip-audit finding risk**
   - What we know: langchain/SQLAlchemy/fastapi are pinned to specific versions due to compatibility matrix
   - What's unclear: Whether pip-audit will find known CVEs in the pinned versions
   - Recommendation: Run pip-audit as an early task in Plan 3. If CRITICAL/HIGH found, allocate time for triage + upgrade. Do not assume clean results.

---

## Sources

### Primary (HIGH confidence)
- `src/backend/models.py` — Verified existing AuditLog schema
- `src/backend/routers/admin.py:173-320` — Verified existing `_write_audit()` and `GET /api/admin/audit`
- `infra/terraform/main.tf` — Verified existing EBS block device configuration
- `nginx/nginx.conf` — Verified current nginx config (port 80 only, no TLS/headers)
- `src/backend/alembic/versions/b3c4d5e6f7a8_phase10_audit_config.py` — Verified existing migration chain
- `docs/cases/phase-12-security-soc2/CASE-188.md` through `CASE-195.md` — Verified expected test patterns per CASE
- `12-CONTEXT.md` — All locked decisions with rationale

### Secondary (MEDIUM confidence)
- Mozilla SSL Configuration Generator (Intermediate profile cipher suite) — Industry standard, widely documented
- OWASP ZAP Docker image `ghcr.io/zaproxy/zaproxy:stable` — Per CASE-194 template and standard practice
- pip-audit PyPA tool — per CASE-191 and PyPA documentation

### Tertiary (LOW confidence)
- SQLite batch_alter_table nullability change behavior — Based on Alembic docs knowledge; verify against actual SQLite behavior during migration authoring

---

## Metadata

**Confidence breakdown:**
- Existing code state: HIGH — directly verified by reading source files
- Standard stack: HIGH — no new deps, all use existing tools
- Architecture patterns: HIGH — verified against actual codebase, Alembic patterns match project history
- Security header values: HIGH — Mozilla Intermediate profile is stable, well-documented
- Pitfalls: HIGH — all identified from actual codebase inspection (nginx bypass, circular import risk, nullable migration)
- OWASP ZAP specifics: MEDIUM — container name and flags verified via CASE-194 template, not live run

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days — stable security standards, not fast-moving ecosystem)
