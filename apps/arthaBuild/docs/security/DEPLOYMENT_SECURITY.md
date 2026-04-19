# ArthaBuild Secure Deployment Guide

**Version:** 1.0
**Date:** 2026-04-10
**Audience:** ArthaBuild administrators deploying to AWS

---

## Pre-Deployment Checklist

### Required Environment Variables

Set in `.env` before `docker-compose up`:

- [ ] `JWT_SECRET_KEY` — min 32 random characters (use `openssl rand -hex 32`)
  - App refuses to start if this is missing or empty
  - Rotate on any suspected compromise — invalidates ALL active sessions
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` — email for password reset and verification emails
  - Leave empty to suppress email sending (non-fatal, but users cannot reset passwords or verify email)
- [ ] `ALLOWED_ORIGINS` — your domain(s), comma-separated (e.g. `https://arthaBuild.yourcompany.com`)
  - Required for CORS in production. Falls back to `FRONTEND_BASE_URL` if not set.
- [ ] `LICENSE_KEY` — ArthaBuild license key from Vibing World inc.
  - See: `GET /api/admin/license` to verify license status after deployment

### Network Configuration

- [ ] Deploy inside a private VPC subnet — no direct public internet access to port 8000 (FastAPI) or 11434 (Ollama)
- [ ] Only ports 80 and 443 exposed to internet (via Nginx reverse proxy)
- [ ] AWS Security Group: inbound 443 from `0.0.0.0/0`; inbound 22 from your IP or VPN CIDR only; all other ports denied
- [ ] Ollama port 11434 MUST NOT be exposed publicly — it has no authentication

### TLS / HTTPS Setup (Production)

- [ ] Obtain TLS certificate (Let's Encrypt via Certbot, or AWS ACM with NLB/ALB)
- [ ] Place `cert.pem` and `key.pem` in `/etc/nginx/ssl/` on the EC2 instance
- [ ] Use **`nginx/nginx.prod.conf`** (NOT `nginx/nginx.conf`) in production Docker Compose:

  ```yaml
  services:
    nginx:
      volumes:
        - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
        - /etc/nginx/ssl:/etc/nginx/ssl:ro
  ```

  The production config enables:
  - Port 80 → 443 HTTPS redirect (CASE-188)
  - TLS 1.2/1.3 only — SSLv3, TLS 1.0, TLS 1.1 disabled (CASE-195)
  - HSTS header: `max-age=31536000; includeSubDomains`
  - X-Frame-Options: DENY (clickjacking protection)
  - X-Content-Type-Options: nosniff (MIME sniffing protection)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content-Security-Policy-Report-Only (CASE-189)

- [ ] Verify HTTPS is working: `curl -I https://your-domain.com/` — expect 200 with `Strict-Transport-Security` header

### EBS Encryption

- [ ] Confirm `encrypted = true` in `infra/terraform/main.tf` before `terraform apply`
- [ ] EBS encryption applies to new volumes only — existing unencrypted volumes require snapshot-and-replace
- [ ] AWS KMS default key (`aws/ebs` alias) is used automatically — no additional IAM configuration needed for v1.0
- [ ] EBS encryption covers: SQLite DB, FAISS vectorstore, generated SuiteScript files, license cache

---

## Post-Deployment Security Checks

Run after `docker-compose up -d`:

- [ ] `curl -s https://your-domain.com/health | python3 -m json.tool` — expect `{ "status": "ok" }`
- [ ] Login with first user (admin) — verify session works, audit log row is created
- [ ] `GET /api/admin/audit` — expect `[]` (empty array = audit log table working)
- [ ] Confirm no JWT in cookies: browser DevTools → Network → login response → no `Set-Cookie` header containing `access_token`
- [ ] Run pip-audit on production: `pip-audit -r src/backend/requirements.txt` — review any new HIGH/CRITICAL findings
- [ ] Verify CORS: browser DevTools → login request → check `Origin` header is accepted
- [ ] Run ZAP baseline scan (instructions in `docs/security/ZAP_SCAN_REPORT.md`)

---

## Key Rotation Procedures

### JWT_SECRET_KEY Rotation

Invalidates ALL active sessions across the deployment. Coordinate with users.

```bash
# Step 1: Generate new key
NEW_KEY=$(openssl rand -hex 32)
echo "New key: $NEW_KEY"

# Step 2: Update .env
sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$NEW_KEY/" /opt/arthaBuild/.env

# Step 3: Restart backend
docker-compose restart backend

# Step 4: Verify health
curl -s http://localhost/health
```

### SMTP Credentials Rotation

No session impact. Safe to rotate without user disruption.

```bash
# Update .env
# Restart backend
docker-compose restart backend
```

### TLS Certificate Renewal

Let's Encrypt auto-renews via Certbot. Manual renewal if needed:

```bash
certbot renew
nginx -s reload
```

---

## SOC2 Evidence Notes

| Document | Contents |
|----------|---------|
| `docs/security/SECURITY_CONTROLS.md` | CC6/CC7/CC8/A1 control mapping with evidence |
| `docs/security/INCIDENT_RESPONSE.md` | P1/P2/P3 incident response runbook |
| `docs/security/DATA_CLASSIFICATION.md` | Data inventory, sensitivity levels, deletion procedures |
| `docs/security/ZAP_SCAN_REPORT.md` | pip-audit results + ZAP scan methodology |
| `SECURITY.md` | Vulnerability disclosure policy (repo root) |

---

## Minimal Security Baseline (Air-Gapped Deployment)

For BYOC deployments without outbound internet access:

1. `JWT_SECRET_KEY` — generated locally with `openssl rand -hex 32`
2. `LICENSE_KEY` — pre-validated and cached (72h grace period without license server)
3. Nginx in prod mode (`nginx.prod.conf`) with self-signed TLS cert if no public CA is reachable
4. No SMTP required — password reset/verification emails will be suppressed (non-fatal)
5. Ollama models pre-pulled before air-gapping: `ollama pull llama3.1:8b && ollama pull nomic-embed-text`
