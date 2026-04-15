#!/usr/bin/env python3
"""
generate_soc2_evidence.py — SOC2 Type II Evidence Package Generator
=====================================================================
Usage:
    python3 generate_soc2_evidence.py \\
        --db-path /path/to/arthaBuild.db \\
        --out-dir docs/soc2-evidence/

Generates the following control evidence files inside out-dir:
    CC6.1-access-control.md          — RBAC roles, auth endpoints, MFA policy
    CC6.2-least-privilege.md         — Admin-only endpoints and their guards
    CC7.2-audit-log-sample.md        — Last 50 audit events (markdown table)
    CC9.2-incident-response.md       — Reference to INCIDENT_RESPONSE.md
    A1.2-backup-schedule.md          — Backup configuration summary

Exit 0 on success, 1 on error.
"""

import argparse
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="generate_soc2_evidence",
        description="Generate SOC2 Type II evidence package from ArthaBuild database.",
    )
    parser.add_argument(
        "--db-path",
        default=os.getenv("ARTHABUILD_DB_PATH", "arthaBuild.db"),
        help="Path to the arthaBuild SQLite database (default: arthaBuild.db or ARTHABUILD_DB_PATH env var)",
    )
    parser.add_argument(
        "--out-dir",
        default="docs/soc2-evidence",
        help="Output directory for evidence files (default: docs/soc2-evidence)",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Evidence generators
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_cc61_access_control(out_dir: Path) -> None:
    """CC6.1 — Logical and Physical Access Controls."""
    content = f"""# CC6.1 — Access Control Evidence
Generated: {_now_iso()}

## Purpose
Documents the access control mechanisms implemented in ArthaBuild to restrict
access to data and system resources to authorized users only.

## RBAC Roles

| Role  | Description                          | Permissions                                      |
|-------|--------------------------------------|--------------------------------------------------|
| admin | Team administrator                   | Full admin panel, team management, audit export  |
| user  | Standard authenticated user          | Own chats, own profile, data export/erase        |

First registered user in a deployment automatically receives the `admin` role.
Subsequent users receive the `user` role.

## Authentication Endpoints

| Endpoint                     | Method | Description                        |
|------------------------------|--------|------------------------------------|
| /api/auth/login              | POST   | Username/password login → JWT      |
| /api/auth/register           | POST   | New user registration              |
| /api/auth/logout             | POST   | JWT invalidation (JTI blacklist)   |
| /api/auth/sso/config         | GET    | Read SSO/OIDC config               |
| /api/auth/sso/config         | POST   | Set SSO/OIDC config (admin only)   |
| /api/auth/sso/callback       | GET    | OIDC callback handler              |

## MFA Policy

| Control          | Value                                                   |
|------------------|---------------------------------------------------------|
| Algorithm        | TOTP (RFC 6238), SHA-1, 6-digit, 30-second window      |
| Enroll endpoint  | POST /api/mfa/enroll                                    |
| Verify endpoint  | POST /api/mfa/verify                                    |
| Status endpoint  | GET  /api/mfa/status                                    |
| Disable endpoint | POST /api/mfa/disable (requires admin or self)         |
| Storage          | Base32 secret in `mfa_secrets` table, is_active flag   |

## Session Controls

| Control               | Value                                  |
|-----------------------|----------------------------------------|
| Token type            | JWT (HS256, PyJWT)                     |
| Token expiry          | Configurable via JWT_ALGORITHM env     |
| Idle timeout          | SESSION_IDLE_MINUTES env var           |
| IP allowlist          | ALLOWED_IP_RANGES CIDR env var         |
| Credential storage    | Memory-only (never in DB or disk)      |
"""
    (out_dir / "CC6.1-access-control.md").write_text(content, encoding="utf-8")
    print("  [OK] CC6.1-access-control.md")


def gen_cc62_least_privilege(out_dir: Path) -> None:
    """CC6.2 — Least Privilege / Need-to-Know."""
    content = f"""# CC6.2 — Least Privilege Evidence
Generated: {_now_iso()}

## Purpose
Documents how ArthaBuild enforces the principle of least privilege by restricting
admin-only operations to users with the `admin` role.

## Implementation

Guard function: `require_admin()` in `src/backend/auth_utils.py`
- Calls `require_user()` to validate JWT
- Checks `user.role == "admin"` — raises HTTP 403 if not

## Admin-Only Endpoints

| Endpoint                            | Method  | Guard              |
|-------------------------------------|---------|--------------------|
| /api/admin/chats                    | GET     | require_admin()    |
| /api/admin/team                     | GET     | require_admin()    |
| /api/admin/team/invite              | POST    | require_admin()    |
| /api/admin/team/{{user_id}}           | DELETE  | require_admin()    |
| /api/admin/stats                    | GET     | require_admin()    |
| /api/admin/users                    | GET     | require_admin()    |
| /api/admin/users/{{user_id}}/role     | PATCH   | require_admin()    |
| /api/admin/users/{{user_id}}          | DELETE  | require_admin()    |
| /api/admin/audit                    | GET     | require_admin()    |
| /api/admin/audit/export             | GET     | require_admin()    |
| /api/admin/config                   | PUT     | require_admin()    |
| /api/admin/license                  | GET     | require_admin()    |
| /api/admin/teams                    | POST    | require_admin()    |
| /api/admin/users/{{user_id}}/send-reset | POST  | require_admin()    |
| /api/auth/sso/config (POST)         | POST    | require_admin()    |

## User Self-Service Endpoints (non-admin)

| Endpoint                 | Method | Description                    |
|--------------------------|--------|--------------------------------|
| /api/user/me             | GET    | Own profile only               |
| /api/user/change-password| POST   | Own password only              |
| /api/user/export-data    | POST   | Own data export (GDPR Art. 15) |
| /api/user/erase          | POST   | Own data erasure (GDPR Art. 17)|
| /api/chats               | GET    | Own chat sessions only         |
| /api/chats/{id}/messages | GET    | Own messages only              |

## Cross-Tenant Isolation

All admin endpoints check `user.team_id` before returning data. Admins can only
manage users on their own team. This prevents privilege escalation across tenants
in multi-team deployments.
"""
    (out_dir / "CC6.2-least-privilege.md").write_text(content, encoding="utf-8")
    print("  [OK] CC6.2-least-privilege.md")


def gen_cc72_audit_log_sample(out_dir: Path, db_path: str) -> None:
    """CC7.2 — Audit log sample from live database."""
    # Attempt to read from DB; gracefully handle missing DB or table
    rows = []
    db_note = f"Source: {db_path}"

    if os.path.exists(db_path):
        try:
            con = sqlite3.connect(db_path)
            con.row_factory = sqlite3.Row
            cur = con.cursor()
            cur.execute(
                """
                SELECT id, created_at, actor_email, actor_role, action, result,
                       ip_address, prev_hash, row_hash
                FROM audit_logs
                ORDER BY id DESC
                LIMIT 50
                """
            )
            rows = [dict(r) for r in cur.fetchall()]
            con.close()
        except Exception as e:
            db_note = f"Database read error: {e}"
    else:
        db_note = f"Database not found at {db_path} — sample generated without live data"

    # Build markdown table
    header = (
        "| id | created_at | actor_email | actor_role | action | result | ip_address | "
        "prev_hash (truncated) | row_hash (truncated) |"
    )
    divider = (
        "|----|------------|-------------|------------|--------|--------|------------|"
        "----------------------|----------------------|"
    )

    table_lines = [header, divider]
    for r in rows:
        ph = (r.get("prev_hash") or "")[:12] + "..." if r.get("prev_hash") else ""
        rh = (r.get("row_hash") or "")[:12] + "..." if r.get("row_hash") else ""
        table_lines.append(
            f"| {r.get('id','')} | {r.get('created_at','')} | {r.get('actor_email','')} | "
            f"{r.get('actor_role','')} | {r.get('action','')} | {r.get('result','')} | "
            f"{r.get('ip_address','')} | {ph} | {rh} |"
        )

    if not rows:
        table_lines.append("| — | — | No audit events found | — | — | — | — | — | — |")

    content = f"""# CC7.2 — Audit Log Sample Evidence
Generated: {_now_iso()}
{db_note}

## Purpose
Demonstrates the immutable, append-only audit trail maintained by ArthaBuild.
Each row contains a cryptographic hash chain (prev_hash → row_hash) computed
as: sha256(prev_hash|action|actor_email|created_at_iso).

## Tamper-Evidence Chain

Any modification to a historical row breaks the chain: the row_hash of the
altered row will no longer match the prev_hash of the subsequent row.

## Last 50 Audit Events

{chr(10).join(table_lines)}

## Audit Event Categories

| Category  | Examples                                                  |
|-----------|-----------------------------------------------------------|
| auth.*    | login, login_failed, logout, register                     |
| admin.*   | role_changed, user_removed, team_created, config_updated  |
| user.*    | password_changed, email_verified, data_erased             |
| license.* | validation events                                         |
"""
    (out_dir / "CC7.2-audit-log-sample.md").write_text(content, encoding="utf-8")
    print(f"  [OK] CC7.2-audit-log-sample.md ({len(rows)} rows)")


def gen_cc92_incident_response(out_dir: Path) -> None:
    """CC9.2 — Incident Response."""
    # Resolve relative path to docs/security/INCIDENT_RESPONSE.md
    script_dir = Path(__file__).resolve().parent
    # script is in src/backend/scripts/ — go up 3 levels to apps/arthaBuild/
    ir_path = script_dir.parents[2] / "docs" / "security" / "INCIDENT_RESPONSE.md"

    if ir_path.exists():
        ir_content = ir_path.read_text(encoding="utf-8")
        body = f"""# CC9.2 — Incident Response Evidence
Generated: {_now_iso()}

## Source
This document references the canonical Incident Response plan at:
`docs/security/INCIDENT_RESPONSE.md`

---

{ir_content}
"""
    else:
        body = f"""# CC9.2 — Incident Response Evidence
Generated: {_now_iso()}

## Incident Response Summary

ArthaBuild maintains a documented incident response procedure covering:

1. **Detection** — Audit log alerts, health endpoint monitoring
2. **Classification** — Severity tiers: P1 (critical) / P2 (high) / P3 (medium)
3. **Containment** — IP allowlist enforcement, session revocation via JWT blacklist
4. **Eradication** — Patch deployment via Docker Compose rolling restart
5. **Recovery** — Database restore from OPS_BACKUP_S3_BUCKET backup
6. **Post-Incident** — Root cause analysis, control improvement documentation

Contact: security@artha.build

Note: Full runbook at docs/security/INCIDENT_RESPONSE.md (not found at generation time).
"""

    (out_dir / "CC9.2-incident-response.md").write_text(body, encoding="utf-8")
    print("  [OK] CC9.2-incident-response.md")


def gen_a12_backup_schedule(out_dir: Path) -> None:
    """A1.2 — Backup Schedule and Recovery."""
    backup_bucket = os.getenv("OPS_BACKUP_S3_BUCKET", "(not configured — set OPS_BACKUP_S3_BUCKET env var)")
    backup_region = os.getenv("OPS_BACKUP_S3_REGION", "us-east-1")

    content = f"""# A1.2 — Backup Schedule and Recovery Evidence
Generated: {_now_iso()}

## Purpose
Documents the backup configuration and recovery procedures for ArthaBuild
customer deployments to satisfy SOC2 Availability criterion A1.2.

## Backup Configuration

| Parameter              | Value                                        |
|------------------------|----------------------------------------------|
| Database               | SQLite (`arthaBuild.db`)                     |
| Backup target S3 bucket| {backup_bucket}                              |
| S3 region              | {backup_region}                              |
| Backup frequency       | Daily (configured in OPS_BACKUP_SCHEDULE)    |
| Retention policy       | 30 days (configurable via OPS_BACKUP_RETAIN) |
| Encryption at rest     | AES-256 (EBS encrypted=true in Terraform)    |
| Encryption in transit  | TLS 1.2+ (nginx enforced)                    |

## Recovery Procedure

1. Identify backup file: `s3://{backup_bucket}/arthaBuild-YYYY-MM-DD.db`
2. Download: `aws s3 cp s3://{backup_bucket}/arthaBuild-YYYY-MM-DD.db ./restore.db`
3. Stop ArthaBuild services: `docker compose down`
4. Replace database: `cp restore.db /path/to/arthaBuild.db`
5. Run migrations: `docker compose run --rm api alembic upgrade head`
6. Restart: `docker compose up -d`
7. Verify health: `curl https://your-domain/health`

## Recovery Time Objective (RTO)

Target RTO: < 4 hours for full service restoration.

## Recovery Point Objective (RPO)

Target RPO: < 24 hours (daily backup frequency).

## Backup Monitoring

Backup job status should be monitored via CloudWatch or equivalent.
Alert threshold: backup job not completed within 2 hours of scheduled start.

## References

- Terraform EBS encryption: `terraform/main.tf` (encrypted=true)
- Docker Compose backup volume: `docker-compose.yml` (data volume)
- Full deployment guide: `docs/CUSTOMER_DEPLOYMENT.md`
"""
    (out_dir / "A1.2-backup-schedule.md").write_text(content, encoding="utf-8")
    print("  [OK] A1.2-backup-schedule.md")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating SOC2 evidence package...")
    print(f"  Database: {args.db_path}")
    print(f"  Output:   {out_dir.resolve()}")
    print()

    try:
        gen_cc61_access_control(out_dir)
        gen_cc62_least_privilege(out_dir)
        gen_cc72_audit_log_sample(out_dir, args.db_path)
        gen_cc92_incident_response(out_dir)
        gen_a12_backup_schedule(out_dir)
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        return 1

    files = list(out_dir.glob("*.md"))
    print(f"\nSOC2 evidence package generated at {out_dir.resolve()}")
    print(f"  {len(files)} control files written:")
    for f in sorted(files):
        print(f"    {f.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
