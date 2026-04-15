# ArthaBuild v1.0.0 — Customer Deployment Guide

> **Estimated time:** 20–30 minutes from zero to a running ArthaBuild instance  
> **Hosting model:** Bring Your Own Cloud (BYOC) — ArthaBuild runs inside your AWS account. No data leaves your VPC.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start](#2-quick-start)
3. [AWS Setup](#3-aws-setup)
4. [Configuration Reference](#4-configuration-reference)
5. [First-Time Setup Checklist](#5-first-time-setup-checklist)
6. [Verifying Your Deployment](#6-verifying-your-deployment)
7. [Upgrading ArthaBuild](#7-upgrading-arthaBuild)
8. [Backup and Recovery](#8-backup-and-recovery)

---

## 1. Prerequisites

### Software (on your local machine)

| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| Git | >= 2.30 | Clone ArthaBuild source | [git-scm.com](https://git-scm.com) |
| Docker | >= 24.0 | Container runtime | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | >= 2.20 | Multi-service orchestration | Included with Docker Desktop |
| Terraform | >= 1.5 | AWS infrastructure provisioning | [terraform.io](https://www.terraform.io/downloads) |
| AWS CLI | >= 2.0 | AWS credential configuration | [aws.amazon.com/cli](https://aws.amazon.com/cli/) |

Verify all tools are installed:

```bash
git --version
docker --version
docker compose version
terraform -version
aws --version
```

Expected output (versions may differ):

```
git version 2.43.0
Docker version 24.0.7
Docker Compose version v2.21.0
Terraform v1.7.0
aws-cli/2.15.0 Python/3.11.6
```

### AWS Account Requirements

- An active AWS account with billing enabled
- AWS credentials configured locally (`aws configure`)
- Ability to create EC2 instances, security groups, and Elastic IPs

### License Key

You need an ArthaBuild license key from TechCloudPro before deployment.
Contact us at **sales@techcloudpro.com** or visit **techcloudpro.com** to get one.

Your license key looks like: `AB-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

---

## 2. Quick Start

This section covers the complete deployment in 5 steps.

### Step 1: Clone the repository

```bash
git clone https://github.com/techcloudpro/arthaBuild.git
cd arthaBuild
```

Expected output:

```
Cloning into 'arthaBuild'...
remote: Counting objects: 1200, done.
Resolving deltas: 100% (800/800), done.
```

### Step 2: Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in the required values:

```bash
# Generate a secure secret key:
openssl rand -hex 32
```

Copy the output (64 hex characters) into the `SECRET_KEY` field. Then fill in your license key and SMTP credentials. See [Section 4](#4-configuration-reference) for the full reference.

**Minimum required values:**

```dotenv
SECRET_KEY=<output of openssl rand -hex 32>
LICENSE_KEY=AB-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourcompany.com
SMTP_PASSWORD=<your Gmail App Password>
FRONTEND_BASE_URL=https://arthaBuild.yourcompany.com
```

### Step 3: Provision AWS infrastructure and deploy

**Option A — Full deployment (recommended for first deployment):**

Provisions a fresh EC2 g4dn.xlarge instance and deploys ArthaBuild in one command:

```bash
./deploy.sh --terraform
```

This will:
1. Run `terraform apply` to create the EC2 instance, security group, and Elastic IP
2. Build the React frontend
3. Start all Docker Compose services (nginx, FastAPI backend, Ollama LLM)
4. Pull the Ollama models (`llama3.1:8b` and `nomic-embed-text`) — **this takes 5–10 minutes**
5. Run a health check to confirm ArthaBuild is running

Expected output (abbreviated):

```
=== ArthaBuild Deployment ===
>>> Provisioning AWS infrastructure...
...Apply complete! Resources: 4 added, 0 changed, 0 destroyed.
>>> Building frontend...
...✓ built in 8.34s
>>> Starting Docker Compose services...
...Container arthaBuild-ollama-1    Started
...Container arthaBuild-backend-1   Started
...Container arthaBuild-nginx-1     Started
>>> Running health check...
{"status":"ok","ai_ready":true,"license_valid":true}
=== ArthaBuild is running! ===
Access at: http://localhost (or your configured domain)
```

**Option B — Deploy to existing server:**

If you already have an EC2 instance running (re-deployment or upgrade):

```bash
./deploy.sh
```

### Step 4: Run the smoke test

Verify all critical endpoints are healthy:

```bash
./scripts/smoke_test.sh http://localhost
```

Expected output:

```
=========================================
 ArthaBuild Smoke Test — Thu Apr 10 2026
 Target: http://localhost
=========================================
  PASS Health endpoint returns status:ok
  PASS AI pipeline is ready (ai_ready:true)
  PASS License valid (license_valid:true)
  PASS Register endpoint creates user
  PASS Login endpoint returns access_token
  PASS Protected endpoint requires JWT
  PASS Chat endpoint returns response field with valid JWT
  PASS NetSuite status endpoint returns authenticated field
  PASS License status endpoint returns valid field
  PASS Check-user endpoint returns exists field

=========================================
 ALL PASSED: 10/10 checks passed
=========================================
```

### Step 5: Access ArthaBuild

Open your browser and navigate to your instance URL:

- **Local / EC2 public IP:** `http://<EC2_ELASTIC_IP>`
- **Custom domain:** `https://arthaBuild.yourcompany.com` (after DNS setup — see Section 5)

Register the first user account. **The first registered user automatically becomes the team admin.**

---

## 3. AWS Setup

### Recommended EC2 Instance

| Parameter | Value | Notes |
|-----------|-------|-------|
| Instance type | `g4dn.xlarge` | Required for GPU inference (NVIDIA T4, 16GB VRAM) |
| Region | Your preferred region | `us-east-1` recommended for lowest latency |
| AMI | Ubuntu 22.04 LTS | Pre-installed NVIDIA drivers available |
| Root EBS | 100 GB gp3 | Encrypted at rest (configured by Terraform) |
| Data EBS | 50 GB gp3 | Ollama models (~8GB) + FAISS index (~1.2GB) |
| On-Demand price | ~$0.53/hr | Consider Reserved Instance for 30–60% savings |

**Cost optimization:** A 1-year Reserved Instance for `g4dn.xlarge` costs approximately $0.29/hr — a 45% saving over On-Demand pricing.

### IAM Permissions for Terraform

Terraform requires the following AWS permissions to provision the infrastructure:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:RunInstances",
        "ec2:DescribeInstances",
        "ec2:TerminateInstances",
        "ec2:CreateSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:DescribeSecurityGroups",
        "ec2:DeleteSecurityGroup",
        "ec2:AllocateAddress",
        "ec2:AssociateAddress",
        "ec2:DescribeAddresses",
        "ec2:ReleaseAddress",
        "ec2:DescribeImages",
        "ec2:DescribeKeyPairs",
        "ec2:CreateTags"
      ],
      "Resource": "*"
    }
  ]
}
```

Configure your AWS credentials before running `terraform apply`:

```bash
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region name: us-east-1
# Default output format: json
```

### Security Group Rules

Terraform creates a security group with these inbound rules:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (after SSL setup) |

Port 11434 (Ollama) is intentionally closed — never expose Ollama publicly.

---

## 4. Configuration Reference

All configuration is in the `.env` file at the project root.

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `a3f9...b2d7` (64 hex chars) | JWT signing secret. Generate with `openssl rand -hex 32`. **Never share or commit this value.** |
| `LICENSE_KEY` | `AB-XXXX-XXXX-XXXX-XXXX` | Your ArthaBuild license key from TechCloudPro. |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server for password reset emails. |
| `SMTP_PORT` | `587` | SMTP port (587 = STARTTLS, 465 = SSL). |
| `SMTP_USER` | `notifications@company.com` | Email address that sends password reset emails. |
| `SMTP_PASSWORD` | `abcd efgh ijkl mnop` | App password (for Gmail: generate at Google Account → Security → App Passwords). |
| `FRONTEND_BASE_URL` | `https://arthaBuild.company.com` | Public URL of your ArthaBuild instance. Used in password reset email links. |

### Optional Variables (defaults work for Docker Compose)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:////app/data/arthaBuild.db` | SQLite database path inside the backend container. Do not change unless you know what you're doing. |
| `OLLAMA_BASE_URL` | `http://ollama:11434` | URL of the Ollama service. The Docker Compose service name `ollama` resolves automatically inside the stack. |
| `OLLAMA_MODEL` | `llama3.1:8b` | LLM used for chat and SuiteScript generation. Do not change — the FAISS index is tuned for this model's tokenizer. |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model (768-dimensional). Do not change — changing this requires a full FAISS vectorstore rebuild. |
| `FAISS_PATH` | `/app/data/vectorstore_ollama` | Path to the pre-built FAISS index inside the backend container. |
| `ACCESS_TOKEN_EXPIRE_HOURS` | `24` | JWT access token expiry in hours. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | JWT refresh token expiry in days. |
| `LICENSE_SERVER_URL` | `https://license.arthaBuild.com` | ArthaBuild license validation server. Only change if TechCloudPro provides an updated URL. |
| `ALLOWED_ORIGINS` | `$FRONTEND_BASE_URL` | Comma-separated CORS allowed origins. Defaults to `FRONTEND_BASE_URL`. |

---

## 5. First-Time Setup Checklist

Work through this checklist after your first deployment.

### SMTP Verification

Confirm password reset emails work before going live:

1. Register an account at your ArthaBuild URL
2. Click "Forgot Password" on the login page
3. Enter your email address
4. Check your inbox — you should receive a reset email within 60 seconds

If no email arrives, check the backend logs:

```bash
docker compose logs backend | grep -i "smtp\|email\|mail"
```

Common SMTP issues: see [Troubleshooting Issue #8](#docs/TROUBLESHOOTING.md).

### DNS Configuration

Point your domain to the EC2 Elastic IP:

```bash
# Get your Elastic IP from Terraform output:
cd infra/terraform
terraform output elastic_ip
```

Then add an A record in your DNS provider:

```
Type: A
Name: arthaBuild (or @)
Value: <Elastic IP from above>
TTL: 300
```

DNS propagation typically takes 2–15 minutes. Verify with:

```bash
dig +short arthaBuild.yourcompany.com
# Should return your Elastic IP
```

### SSL Certificate Setup

ArthaBuild ships with nginx configured for HTTPS using Let's Encrypt. Once DNS is pointing to your server:

```bash
# SSH into your EC2 instance:
ssh -i ~/.ssh/your-key.pem ubuntu@<Elastic IP>

# Install certbot and obtain certificate:
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d arthaBuild.yourcompany.com

# Certbot auto-configures nginx — verify:
sudo nginx -t && sudo systemctl reload nginx
```

Auto-renewal is configured by certbot automatically (runs via cron/systemd timer twice daily).

### License Verification

Confirm your license is active and registered:

```bash
curl http://localhost/api/license/status
```

Expected response:

```json
{
  "valid": true,
  "plan": "enterprise",
  "expires_at": "2027-04-10T00:00:00Z",
  "instance_id": "a1b2c3d4-..."
}
```

If `valid` is `false`, check your `LICENSE_KEY` in `.env` and that the ArthaBuild license server is reachable.

### Register the Admin Account

1. Navigate to your ArthaBuild URL in a browser
2. Click **Register** and create your account
3. **The first user to register becomes the team admin automatically**
4. Log in and navigate to **/admin** to access the Admin Panel
5. Invite team members from the **Team** tab

---

## 6. Verifying Your Deployment

### Health Check

```bash
curl http://localhost/health | python3 -m json.tool
```

Expected response:

```json
{
  "status": "ok",
  "ai_ready": true,
  "license_valid": true,
  "suitecloud_ready": true,
  "version": "1.0.0"
}
```

| Field | Meaning |
|-------|---------|
| `status: "ok"` | Backend is running and database connected |
| `ai_ready: true` | Ollama is running, both models are pulled, FAISS index loaded |
| `license_valid: true` | License key is valid and not expired |
| `suitecloud_ready: true` | SuiteCloud CLI is installed and available |

If `ai_ready` is `false`, check Ollama:

```bash
docker compose logs ollama | tail -20
# Common cause: model still downloading. Wait 5-10 minutes.
```

### Smoke Test

Run the full 10-check smoke test:

```bash
./scripts/smoke_test.sh http://localhost
```

All 10 checks should pass. If any fail, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### Performance Benchmark

Verify response times meet NFR targets:

```bash
# Health endpoint only (no auth needed):
./scripts/benchmark.sh http://localhost

# Full benchmark including AI chat (requires a valid JWT):
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"you@example.com","password":"YourPassword1!"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

./scripts/benchmark.sh http://localhost "$TOKEN"
```

Expected benchmark results on `g4dn.xlarge`:

```
1. GET /health  (NFR target: < 200ms)
   Run 1: PASS 12ms (target: <200ms)
   Run 2: PASS 9ms
   Run 3: PASS 11ms

2. POST /api/auth/login  (NFR target: < 500ms)
   Run 1: PASS 180ms (target: <500ms)

3. POST /api/chatbot/process — cold start  (NFR target: < 30s)
   Cold start: PASS 18450ms (GPU model warm-up)

4. POST /api/chatbot/process — warm query  (NFR target: < 15s)
   Warm query: PASS 6200ms
```

---

## 7. Upgrading ArthaBuild

### Standard Upgrade

Pull the latest version and redeploy:

```bash
# Pull latest changes:
git pull origin main

# Rebuild and restart (backend and frontend only — Ollama and FAISS unchanged):
./deploy.sh --skip-terraform
```

Alternatively, with explicit Docker Compose commands:

```bash
git pull origin main
cd src/frontend && npm install && npm run build && cd ../..
docker compose up -d --build backend nginx
```

### Upgrade Notes

- **Database migrations** run automatically on backend startup via Alembic
- **Ollama models** are never re-downloaded unless you explicitly remove the Docker volume
- **FAISS vectorstore** is never rebuilt during upgrade — the pre-built index is preserved on the EBS volume
- **Existing user data** (accounts, chat sessions) is preserved across upgrades

### Verifying an Upgrade

After upgrading, run the smoke test to confirm everything works:

```bash
./scripts/smoke_test.sh http://localhost
```

---

## 8. Backup and Recovery

ArthaBuild has two persistent data stores that must be backed up:

| Data | Location | Backup frequency |
|------|----------|-----------------|
| SQLite database | `/app/data/arthaBuild.db` (EBS volume) | Daily |
| FAISS vectorstore | `/app/data/vectorstore_ollama/` (EBS volume) | After any rebuild |

### Daily SQLite Backup

Create a cron job on the EC2 instance to back up the database daily:

```bash
# SSH into your EC2 instance:
ssh -i ~/.ssh/your-key.pem ubuntu@<Elastic IP>

# Create backup script:
sudo tee /opt/arthaBuild-backup.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/arthaBuild"
DB_CONTAINER=$(docker ps --filter name=backend --format "{{.ID}}" | head -1)
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Copy SQLite from running container
docker exec "$DB_CONTAINER" sqlite3 /app/data/arthaBuild.db ".backup /tmp/arthaBuild_backup.db"
docker cp "$DB_CONTAINER":/tmp/arthaBuild_backup.db "$BACKUP_DIR/arthaBuild_${DATE}.db"

# Keep only last 14 days
find "$BACKUP_DIR" -name "arthaBuild_*.db" -mtime +14 -delete

echo "Backup complete: $BACKUP_DIR/arthaBuild_${DATE}.db"
EOF
sudo chmod +x /opt/arthaBuild-backup.sh

# Schedule daily at 02:00 UTC:
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/arthaBuild-backup.sh >> /var/log/arthaBuild-backup.log 2>&1") | crontab -
```

Verify the backup script works:

```bash
sudo /opt/arthaBuild-backup.sh
ls -la /var/backups/arthaBuild/
```

### Backup to S3 (Recommended)

For off-site backup, upload the database to S3:

```bash
# Add to /opt/arthaBuild-backup.sh after the local backup line:
aws s3 cp "$BACKUP_DIR/arthaBuild_${DATE}.db" s3://your-backup-bucket/arthaBuild/
```

Requires the EC2 instance role to have `s3:PutObject` permission on your backup bucket.

### FAISS Vectorstore Backup

The FAISS vectorstore (203,618 NetSuite knowledge chunks) is pre-built and ships with ArthaBuild. Back it up after any manual rebuild:

```bash
DB_CONTAINER=$(docker ps --filter name=backend --format "{{.ID}}" | head -1)
docker cp "$DB_CONTAINER":/app/data/vectorstore_ollama/ /var/backups/arthaBuild/vectorstore_$(date +%Y%m%d)/
```

### Database Recovery

To restore from a backup:

```bash
# Stop the backend:
docker compose stop backend

# Copy backup into the data volume:
BACKUP_FILE="/var/backups/arthaBuild/arthaBuild_20260410_020000.db"
docker run --rm -v arthaBuild_data:/data \
  -v /var/backups/arthaBuild:/backup \
  alpine sh -c "cp /backup/$(basename $BACKUP_FILE) /data/arthaBuild.db"

# Restart the backend:
docker compose start backend

# Verify recovery:
curl http://localhost/health
```

### FAISS Vectorstore Rebuild

If the vectorstore is lost or corrupted, you can rebuild it from scratch. **This takes 30–90 minutes** and requires Ollama to be running:

```bash
# Access the backend container:
docker exec -it $(docker ps --filter name=backend --format "{{.ID}}") bash

# Inside the container, rebuild the vectorstore:
python -c "
from build_vectorstore import rebuild
rebuild(source_dir='/app/data/netsuite_docs', output_dir='/app/data/vectorstore_ollama')
print('Vectorstore rebuild complete.')
"
```

> **Note:** The vectorstore rebuild uses `nomic-embed-text` embeddings (768-dimensional). Do not change `OLLAMA_EMBED_MODEL` — doing so will produce an incompatible index that will crash on first query.

---

## Getting Help

| Resource | Link |
|----------|------|
| Documentation | This guide + [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Email support | support@techcloudpro.com |
| Security issues | security@techcloudpro.com |
| Website | techcloudpro.com |

Include your `instance_id` (from `GET /api/license/status`) in all support requests to help us locate your license record.

---

*ArthaBuild v1.0.0 — TechCloudPro*  
*Document version: 2026-04-10*
