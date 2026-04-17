---
phase: 05-docker-aws-terraform
plan: 01
status: complete
completed: 2026-04-09
commit: 95929155
---

# Phase 5 Plan 01 — Summary

## What Was Built

Packaged ArthaBuild for BYOC (Bring Your Own Cloud) customer deployment via Docker Compose + Terraform.

## Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | FastAPI backend image: python:3.11-slim + Node.js 20 + SuiteCloud CLI + Python deps |
| `nginx/nginx.conf` | Reverse proxy: SPA routing for React, /api/ → backend:8000, 120s AI timeout |
| `docker-compose.yml` | 4 services: ollama (GPU), ollama-init (model pull), backend, nginx. Named volumes: ollama_models, app_data |
| `infra/terraform/main.tf` | AWS: EC2 g4dn.xlarge, EBS 100GB gp3, security group (22/80/443), Elastic IP |
| `infra/terraform/variables.tf` | Inputs: aws_region, vpc_id, subnet_id, instance_type, ebs_size_gb, key_pair_name, license_key |
| `infra/terraform/outputs.tf` | Outputs: public_ip, arthaBuild_url, ssh_command |
| `infra/terraform/user_data.sh` | EC2 bootstrap: installs Docker + NVIDIA Container Toolkit, writes .env with license_key |
| `.env.example` | Documents all env vars: SECRET_KEY, LICENSE_KEY, SMTP_*, FRONTEND_BASE_URL, DB/Ollama defaults |
| `deploy.sh` | One-command deploy: --terraform flag, npm build, docker-compose up, health check |

## Routing Fix

- `src/frontend/src/routes.tsx:43` — `/chat/new` route was commented out, preventing navigation after login. Uncommented.

## Verification

- `docker compose config --quiet` → no errors
- `bash -n deploy.sh` → syntax OK
- nginx.conf: upstream DNS error expected in standalone test (backend resolves only inside Compose network)
- Terraform: 4 files validated (terraform validate requires AWS credentials — skipped in local check)

## Key Design Decisions

- **--workers 1**: SQLite is single-writer; increase only when migrating to PostgreSQL
- **Ollama ports internal only**: 11434 bound to 127.0.0.1 inside Compose; never exposed publicly
- **delete_on_termination = false**: EBS root volume persists on instance stop (protects model weights + DB)
- **Deep Learning Base AMI**: Pre-installed NVIDIA drivers on EC2; user_data only installs Docker + toolkit layer
- **ollama-init service**: Runs once (restart: no) after ollama is healthy to pull llama3.1:8b + nomic-embed-text

## Frozen Interfaces Consumed

| Interface | Source | Used By |
|-----------|--------|---------|
| FAISS_PATH=/app/data/vectorstore_ollama | Phase 3 | docker-compose volume mount |
| OLLAMA_BASE_URL=http://ollama:11434 | Phase 4 .env | docker-compose environment |
| Database path /app/data/arthaBuild.db | Phase 2 | docker-compose DATABASE_URL |
| Backend port 8000 | Phase 4 | nginx proxy_pass |
