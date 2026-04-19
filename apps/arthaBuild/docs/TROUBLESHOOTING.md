# ArthaBuild Troubleshooting Guide

> This guide covers the 10 most common issues encountered during and after deployment.  
> For each issue: symptom → diagnosis commands → fix commands.

---

## Issue 1: "AI not available" (503 on chat endpoint)

### Symptom

- `GET /health` returns `"ai_ready": false`
- Chat endpoint returns HTTP 503 with body `{"detail": "AI pipeline not available"}`
- ArthaBuild chat shows "AI service unavailable" banner

### Diagnosis

```bash
# Check if Ollama container is running:
docker compose ps ollama

# Check Ollama logs for errors:
docker compose logs ollama --tail=50

# Confirm models are pulled:
docker exec $(docker ps --filter name=ollama --format "{{.ID}}") \
  curl -s http://localhost:11434/api/tags | python3 -m json.tool

# Confirm FAISS index is loaded (look for "FAISS vectorstore loaded"):
docker compose logs backend --tail=30 | grep -i "faiss\|vector\|ollama"
```

### Fix

**If Ollama container is not running:**

```bash
docker compose up -d ollama
# Wait 30 seconds, then check:
docker compose ps ollama
```

**If models are not pulled (first startup or volume was reset):**

```bash
docker exec $(docker ps --filter name=ollama --format "{{.ID}}") \
  ollama pull llama3.1:8b
# This takes 5–10 minutes on first run (4.7GB download)

docker exec $(docker ps --filter name=ollama --format "{{.ID}}") \
  ollama pull nomic-embed-text
# ~270MB download
```

**If FAISS index is missing:**

The FAISS vectorstore must be present at the path defined by `FAISS_PATH` (default: `/app/data/vectorstore_ollama`). Check:

```bash
docker exec $(docker ps --filter name=backend --format "{{.ID}}") \
  ls -la /app/data/vectorstore_ollama/
```

If empty, restore from backup or rebuild (see [CUSTOMER_DEPLOYMENT.md §8](CUSTOMER_DEPLOYMENT.md#8-backup-and-recovery)).

---

## Issue 2: "License validation failed" (license_valid: false)

### Symptom

- `GET /health` returns `"license_valid": false`
- `GET /api/license/status` returns `{"valid": false, "error": "..."}`
- Features restricted to read-only demo mode

### Diagnosis

```bash
# Check license status:
curl http://localhost/api/license/status | python3 -m json.tool

# Check backend logs for license errors:
docker compose logs backend | grep -i "license"

# Confirm LICENSE_KEY is set in .env:
grep LICENSE_KEY .env
```

### Fix

**If LICENSE_KEY is missing or wrong:**

```bash
# Edit .env and set correct key:
nano .env
# LICENSE_KEY=AB-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# Restart backend to reload env:
docker compose restart backend

# Wait 5 seconds, then re-check:
curl http://localhost/api/license/status
```

**If license server is unreachable (network issue):**

ArthaBuild has a 72-hour grace period if it cannot reach the license server. After 72 hours of server unreachability, features are restricted. Ensure outbound HTTPS (port 443) from your EC2 instance to `license.arthaBuild.com` is allowed in your security group.

```bash
# Test connectivity to license server:
curl -v https://license.arthaBuild.com/api/ping
```

**If key shows "already registered to a different instance":**

Each license key is locked to one `instance_id` on first validation. If you redeployed with a different instance ID, contact support@artha.build to reset the binding.

---

## Issue 3: Login not working after re-deployment

### Symptom

- Users who previously logged in cannot log in after a re-deployment or server restart
- Login returns HTTP 401: "Invalid credentials"
- Password is definitely correct

### Diagnosis

```bash
# Check if SECRET_KEY changed between deployments:
# (This invalidates ALL existing JWT tokens AND bcrypt hashes if different)
grep SECRET_KEY .env
docker compose logs backend | grep -i "jwt\|secret"

# Verify database is intact:
docker exec $(docker ps --filter name=backend --format "{{.ID}}") \
  sqlite3 /app/data/arthaBuild.db "SELECT email, created_at FROM users LIMIT 5;"
```

### Fix

A changed `SECRET_KEY` invalidates all existing bcrypt-hashed passwords stored in the database, because bcrypt uses the SECRET_KEY as part of its key derivation in this implementation.

**Prevention:** Never change `SECRET_KEY` after initial deployment. Store it securely (e.g., AWS Secrets Manager).

**If SECRET_KEY was changed accidentally:**

1. Restore the original `SECRET_KEY` in `.env`
2. Restart the backend: `docker compose restart backend`
3. Users should be able to log in again with their original passwords

**If the original SECRET_KEY is lost:**

All user passwords must be reset. Existing users must use the "Forgot Password" flow to set a new password.

---

## Issue 4: NetSuite TBA authentication fails

### Symptom

- Clicking "Connect NetSuite" shows "Authentication failed" or "Invalid credentials"
- `POST /api/netsuite/authenticate` returns HTTP 401 or 500
- No SuiteScript deployment possible

### Diagnosis

```bash
# Check backend logs for NetSuite auth errors:
docker compose logs backend | grep -i "netsuite\|tba\|suitecloud" | tail -20

# Verify SuiteCloud CLI is available:
docker exec $(docker ps --filter name=backend --format "{{.ID}}") \
  suitecloud --version
```

### Fix

**Common credential format mistakes:**

| Field | Wrong | Correct |
|-------|-------|---------|
| Account ID (sandbox) | `https://TSTDRV123.suitetapp.com` | `TSTDRV123` |
| Account ID (production) | `1234567_prod` | `1234567` |
| Consumer Key | Blank or whitespace | 64-character hex string |
| Token ID | With quotes | Without quotes |

**If SuiteCloud CLI is not found:**

```bash
docker exec $(docker ps --filter name=backend --format "{{.ID}}") bash -c \
  "which suitecloud || npm install -g @oracle/suitecloud-cli"
```

**If NetSuite returns "Invalid login attempt":**

Confirm TBA integration record is enabled in NetSuite:
1. Log in to NetSuite as administrator
2. Navigate to **Setup → Company → Enable Features → SuiteCloud**
3. Confirm **Token-Based Authentication** is checked
4. Navigate to **Setup → Users/Roles → Access Tokens** and verify the token is active

---

## Issue 5: FAISS similarity search returns empty results

### Symptom

- Chat responses are generic ("I don't have specific information...")
- No NetSuite-specific knowledge appears in responses
- `GET /health` shows `ai_ready: true` but answers are unhelpful

### Diagnosis

```bash
# Confirm FAISS index has chunks:
docker exec $(docker ps --filter name=backend --format "{{.ID}}") \
  python3 -c "
import faiss, os
path = os.getenv('FAISS_PATH', '/app/data/vectorstore_ollama')
index = faiss.read_index(f'{path}/index.faiss')
print(f'FAISS index: {index.ntotal} vectors, dim={index.d}')
"
```

Expected output: `FAISS index: 203618 vectors, dim=768`

If dim=1536 instead of 768, the old OpenAI-embedded index is loaded.

### Fix

**If index has 0 vectors (empty):**

The FAISS index file is missing or corrupt. Restore from backup or rebuild (30–90 minutes):

```bash
# See CUSTOMER_DEPLOYMENT.md §8 for rebuild procedure
```

**If dim=1536 (wrong embedding dimensions):**

The pre-built index used OpenAI embeddings (1536-dim). You are using the wrong index file. The correct ArthaBuild index uses `nomic-embed-text` (768-dim). Obtain the correct `vectorstore_ollama/` directory from your ArthaBuild package.

**If index has the right dimensions but answers are still generic:**

The LLM may be failing to use retrieved context. Check the LangGraph pipeline:

```bash
docker compose logs backend | grep -i "grade\|rewrite\|retrieve" | tail -20
```

---

## Issue 6: Docker Compose won't start (GPU error)

### Symptom

- `docker compose up` fails with: `Error: could not select device driver "nvidia" with capabilities: [[gpu]]`
- Or: `docker: Error response from daemon: could not select device driver`
- Ollama container exits immediately

### Diagnosis

```bash
# Check if NVIDIA Container Toolkit is installed:
nvidia-container-cli --version 2>/dev/null || echo "NVIDIA Container Toolkit not installed"

# Check GPU availability:
nvidia-smi 2>/dev/null || echo "nvidia-smi not found — GPU drivers not installed"

# Check Docker GPU support:
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi 2>/dev/null || echo "GPU passthrough not working"
```

### Fix

**Install NVIDIA Container Toolkit on Ubuntu:**

```bash
# Add NVIDIA package repository:
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor \
  -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install:
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit

# Configure Docker:
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify:
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

**If running without a GPU (testing/development only):**

Edit `docker-compose.yml` and remove the `deploy.resources.reservations.devices` section from the `ollama` service. Ollama will fall back to CPU — response times will be much slower (minutes per query instead of seconds).

---

## Issue 7: Ollama very slow (CPU instead of GPU)

### Symptom

- AI chat responses take 2–5 minutes instead of 5–15 seconds
- `GET /health` shows `ai_ready: true` but performance is unacceptable
- `nvidia-smi` shows 0% GPU utilization while Ollama is processing

### Diagnosis

```bash
# Check GPU utilization during a chat request (run in a separate terminal):
watch -n 1 nvidia-smi

# Check Ollama logs for GPU detection:
docker compose logs ollama | grep -i "gpu\|cuda\|device"

# Confirm GPU passthrough in Docker:
docker exec $(docker ps --filter name=ollama --format "{{.ID}}") nvidia-smi
```

### Fix

**If `docker exec` shows no GPU:**

The Docker Compose file is not passing the GPU through. Check `docker-compose.yml` for the Ollama service:

```yaml
ollama:
  image: ollama/ollama
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

If this section is missing, add it and restart: `docker compose up -d ollama`

**If GPU is detected but utilization is still 0%:**

Ollama may be using a CPU-only model variant. Re-pull the model:

```bash
docker exec $(docker ps --filter name=ollama --format "{{.ID}}") \
  ollama pull llama3.1:8b
```

Then send a test chat message and monitor `nvidia-smi`.

---

## Issue 8: Password reset emails not sending

### Symptom

- Users click "Forgot Password" and see the success message
- No email arrives in inbox (check spam folder first)
- Backend logs show SMTP errors

### Diagnosis

```bash
# Check backend logs for SMTP errors:
docker compose logs backend | grep -i "smtp\|email\|mail\|suppress"

# If logs show "SUPPRESS_SEND=True", SMTP is disabled (SMTP_HOST not set):
grep SMTP .env
```

### Fix

**If SMTP_HOST is not set:**

```bash
# Edit .env:
nano .env
# Add/uncomment:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=notifications@yourcompany.com
# SMTP_PASSWORD=your-app-password

docker compose restart backend
```

**For Gmail — use an App Password (not your account password):**

1. Enable 2-Factor Authentication on your Google Account
2. Go to **Google Account → Security → App Passwords**
3. Create a new app password (select "Mail" + "Other" — name it "ArthaBuild")
4. Copy the 16-character password into `SMTP_PASSWORD` in `.env`

**Test SMTP directly:**

```bash
docker exec $(docker ps --filter name=backend --format "{{.ID}}") \
  python3 -c "
import smtplib, os
with smtplib.SMTP(os.getenv('SMTP_HOST'), int(os.getenv('SMTP_PORT', 587))) as s:
    s.starttls()
    s.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASSWORD'))
    print('SMTP connection successful')
"
```

---

## Issue 9: Cannot access ArthaBuild URL (connection refused or timeout)

### Symptom

- Browser shows "Connection refused" or times out at your domain/IP
- `curl http://<your-ip>` fails
- ArthaBuild was working before but now unreachable

### Diagnosis

```bash
# Check all containers are running:
docker compose ps

# Check nginx container logs:
docker compose logs nginx --tail=30

# Verify nginx is listening on port 80:
docker exec $(docker ps --filter name=nginx --format "{{.ID}}") \
  ss -tlnp | grep :80

# From local machine — check security group (AWS):
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=arthaBuild-sg" \
  --query "SecurityGroups[0].IpPermissions"
```

### Fix

**If security group is missing port 80/443:**

```bash
# Get your security group ID:
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=arthaBuild-sg" \
  --query "SecurityGroups[0].GroupId" --output text)

# Add port 80:
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# Add port 443:
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

**If nginx container is down:**

```bash
docker compose up -d nginx
docker compose logs nginx --tail=20
```

**If containers are running but port is still closed:**

Check if the host firewall (ufw) is blocking port 80:

```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Issue 10: Docker volumes lost after restart (data loss)

### Symptom

- All user accounts disappeared after a server reboot
- Chat history is gone
- `GET /health` shows `ai_ready: false` (models need to be re-pulled)

### Cause

This happens when bind mounts are used instead of Docker named volumes. Bind mounts at paths like `./data:/app/data` are more fragile — if the host path is on ephemeral storage, or if `docker compose down -v` was run, data is lost.

### Diagnosis

```bash
# Check current volume configuration in docker-compose.yml:
grep -A 5 "volumes:" docker-compose.yml

# List Docker named volumes:
docker volume ls | grep artha
```

### Fix

**Verify named volumes are configured (not bind mounts):**

In `docker-compose.yml`, the backend and Ollama services should use named volumes, not relative paths:

```yaml
services:
  backend:
    volumes:
      - arthaBuild_data:/app/data       # Named volume (CORRECT)
      # NOT: - ./data:/app/data         # Bind mount (fragile)

volumes:
  arthaBuild_data:
    driver: local
```

**Restore from backup after data loss:**

Follow the recovery procedure in [CUSTOMER_DEPLOYMENT.md §8](CUSTOMER_DEPLOYMENT.md#8-backup-and-recovery).

**Prevent future loss — enable EBS snapshots:**

```bash
# Get the EBS volume ID for your data volume:
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=arthaBuild" \
  --query "Reservations[0].Instances[0].InstanceId" --output text)

VOLUME_ID=$(aws ec2 describe-volumes \
  --filters "Name=attachment.instance-id,Values=$INSTANCE_ID" \
  --query "Volumes[0].VolumeId" --output text)

echo "EBS Volume ID: $VOLUME_ID"

# Create a manual snapshot:
aws ec2 create-snapshot \
  --volume-id "$VOLUME_ID" \
  --description "ArthaBuild data volume backup $(date +%Y-%m-%d)"
```

For automated daily EBS snapshots, enable AWS Data Lifecycle Manager in the AWS Console.

---

## Additional Resources

| Resource | Details |
|----------|---------|
| Deployment guide | [CUSTOMER_DEPLOYMENT.md](CUSTOMER_DEPLOYMENT.md) |
| Architecture reference | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Email support | support@artha.build |
| Security issues | security@artha.build |

Include the output of `GET /api/license/status` and `GET /health` in all support requests.

---

*ArthaBuild v1.0.0 Troubleshooting Guide — Vibing World inc.*  
*Document version: 2026-04-10*
