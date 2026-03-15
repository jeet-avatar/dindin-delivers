# Admin Secret Key Rotation Runbook

## Overview

`ADMIN_SECRET_KEY` is used in `admin_auth_middleware` (`main_new.py:353-362`) as a bypass for ops/migration endpoints. It's stored in AWS Secrets Manager at `dollor/production/admin-yCDIFY`.

**Audit logging added (H3):** Every use of `ADMIN_SECRET_KEY` now emits `logger.warning(...)` to CloudWatch. Monitor for unexpected usage.

## When to Rotate

- **Quarterly** (routine)
- **Immediately** if: key is leaked, employee with access departs, suspicious `ADMIN_SECRET_KEY used` log entries detected

## How to Rotate

### Step 1 — Generate new key
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Step 2 — Update AWS Secrets Manager
```bash
aws secretsmanager update-secret \
  --secret-id dollor/production/admin-yCDIFY \
  --secret-string '{"ADMIN_SECRET_KEY":"<new-key>","DASHBOARD_SECRET":"<existing-dashboard-secret>"}' \
  --region us-east-1
```

Do the same for staging:
```bash
aws secretsmanager update-secret \
  --secret-id dollor/staging/admin-<suffix> \
  --secret-string '{"ADMIN_SECRET_KEY":"<new-key>"}' \
  --region us-east-1
```

### Step 3 — Deploy to force ECS task restart (picks up new secret)
```bash
git push origin main
gh workflow run deploy-dollar-ai.yml
gh run watch <run-id>
```

### Step 4 — Verify old key no longer works
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.dollor.ai/api/admin/users?secret_key=<OLD_KEY>"
# Must return 401
```

### Step 5 — Verify new key works
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.dollor.ai/api/admin/users?secret_key=<NEW_KEY>"
# Must return 200
```

## Monitoring

CloudWatch Logs Insights query to detect `ADMIN_SECRET_KEY` usage:

```
fields @timestamp, @message
| filter @message like /ADMIN_SECRET_KEY used/
| sort @timestamp desc
| limit 50
```

**Alert threshold**: >5 uses per hour from the same IP is suspicious.

## Where ADMIN_SECRET_KEY is Used in Code

- `admin_auth_middleware` (`main_new.py:353`) — all `/api/admin/*` routes
- `_require_admin_secret()` helper (`main_new.py:637`) — demo/ops endpoints
- Direct inline checks at: `backfill_payouts`, `run_migrations`, `setup_demo_accounts`, `set_driver_approved_status`

See H3 audit for full list of 17 endpoint + 1 middleware usages.
