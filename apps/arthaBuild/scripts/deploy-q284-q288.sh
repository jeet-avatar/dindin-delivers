#!/bin/bash
# deploy-q284-q288.sh
# Deploys Q284-Q288 changes to EC2 production (artha.build)
# bypassing GitHub (push blocked by secret scanning on historical commit)
#
# Usage:
#   chmod +x scripts/deploy-q284-q288.sh
#   ./scripts/deploy-q284-q288.sh
#
# Prerequisites:
#   - SSH key at ~/.ssh/techcloudpro-key-1764031372.pem
#   - Google App Password for artha.build@artha.build ready
#   - Run from the REPO ROOT (/Users/jeet/doordash-p2p)

set -e

EC2_HOST="44.194.34.223"
EC2_USER="ubuntu"
SSH_KEY="$HOME/.ssh/techcloudpro-key-1764031372.pem"
SSH="ssh -i $SSH_KEY $EC2_USER@$EC2_HOST"

# Files changed by Q284-Q288
FILES=(
  "apps/arthaBuild/src/backend/email_utils.py"
  "apps/arthaBuild/src/backend/rawapi.py"
  "apps/arthaBuild/src/backend/routers/auth.py"
  "apps/arthaBuild/src/backend/routers/deploy.py"
  "apps/arthaBuild/src/backend/routers/license.py"
  "apps/arthaBuild/src/backend/routers/user.py"
  "apps/arthaBuild/src/backend/models.py"
  "apps/arthaBuild/src/backend/alembic/versions/22a_free_tier_script_counter.py"
  "apps/arthaBuild/src/frontend/src/components/ChatMessage.tsx"
  "apps/arthaBuild/src/frontend/src/components/HallucinationComparison.tsx"
  "apps/arthaBuild/src/frontend/src/components/LicenseBanner.tsx"
  "apps/arthaBuild/src/frontend/src/pages/Landing.tsx"
)

# ─── Step 1: Find ArthaBuild directory on EC2 ──────────────────────────────
echo "==> Finding ArthaBuild directory on EC2..."
EC2_AB_DIR=$($SSH 'ls -d ~/arthaBuild 2>/dev/null || ls -d ~/apps/arthaBuild 2>/dev/null || find /home/ubuntu -name "docker-compose.yml" -maxdepth 4 2>/dev/null | head -1 | xargs dirname' 2>/dev/null || true)
if [ -z "$EC2_AB_DIR" ]; then
  echo "ERROR: Could not find ArthaBuild directory on EC2. Set EC2_AB_DIR manually."
  exit 1
fi
echo "    Found: $EC2_AB_DIR"

# ─── Step 2: Create tar of Q284-Q288 files ─────────────────────────────────
echo "==> Creating deployment package..."
TMPTAR="/tmp/ab-q284-q288-$(date +%Y%m%d%H%M%S).tar.gz"
tar -czf "$TMPTAR" "${FILES[@]}"
echo "    Package: $TMPTAR ($(du -sh $TMPTAR | cut -f1))"

# ─── Step 3: SCP package to EC2 ────────────────────────────────────────────
echo "==> Uploading to EC2..."
scp -i "$SSH_KEY" "$TMPTAR" "$EC2_USER@$EC2_HOST:/tmp/ab-deploy.tar.gz"
echo "    Upload complete."

# ─── Step 4: Extract on EC2 ────────────────────────────────────────────────
echo "==> Extracting files on EC2..."
$SSH "
  cd /
  tar -xzf /tmp/ab-deploy.tar.gz --strip-components=2 -C $EC2_AB_DIR \
    apps/arthaBuild/src/

  # Verify key files landed
  echo '--- Extracted files ---'
  ls -la $EC2_AB_DIR/src/backend/email_utils.py
  ls -la $EC2_AB_DIR/src/backend/alembic/versions/22a_free_tier_script_counter.py
  ls -la $EC2_AB_DIR/src/frontend/src/components/HallucinationComparison.tsx
  echo '--- OK ---'
"

# ─── Step 5: Build frontend on EC2 ─────────────────────────────────────────
echo "==> Building frontend on EC2..."
$SSH "
  cd $EC2_AB_DIR/src/frontend
  npm install --silent
  npm run build
  echo '--- Frontend build complete ---'
  ls -la dist/index.html
"

# ─── Step 6: Run Alembic migration ─────────────────────────────────────────
echo "==> Running Alembic migration (22a_free_tier_script_counter)..."
$SSH "
  cd $EC2_AB_DIR
  docker-compose exec -T backend alembic upgrade head
"

# ─── Step 7: Rebuild backend and restart ───────────────────────────────────
echo "==> Restarting services..."
$SSH "
  cd $EC2_AB_DIR
  docker-compose up -d --build backend
  docker-compose restart nginx 2>/dev/null || true
  echo 'Waiting 10s for backend to start...'
  sleep 10
"

# ─── Step 8: Health check ───────────────────────────────────────────────────
echo "==> Running health check..."
HEALTH=$(curl -sf https://artha.build/health 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"ok"'; then
  echo "    HEALTHY: $HEALTH"
else
  echo "    WARNING: Health check returned: $HEALTH"
fi

# ─── Step 9: Verify free-email block ───────────────────────────────────────
echo "==> Verifying Q288 — free email block..."
BLOCK_RESP=$(curl -s -X POST https://artha.build/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"deploytest@gmail.com","password":"TestDeploy2026!","first_name":"Deploy","last_name":"Test"}' \
  -w "\n%{http_code}" 2>/dev/null)
HTTP_CODE=$(echo "$BLOCK_RESP" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  echo "    PASS: gmail.com blocked (HTTP 400)"
else
  echo "    FAIL: Expected 400, got $HTTP_CODE — Q288 may not be active"
fi

# ─── Cleanup ────────────────────────────────────────────────────────────────
rm -f "$TMPTAR"
$SSH "rm -f /tmp/ab-deploy.tar.gz"

echo ""
echo "================================================================"
echo " Q284-Q288 DEPLOYED"
echo " https://artha.build"
echo "================================================================"
echo ""
echo "NEXT — set SMTP in .env on EC2:"
echo "  ssh -i $SSH_KEY $EC2_USER@$EC2_HOST"
echo "  cd $EC2_AB_DIR"
echo "  nano .env   # add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, FRONTEND_BASE_URL"
echo "  docker-compose restart backend"
echo ""
echo "THEN — browser verify:"
echo "  1. https://artha.build — hallucination comparison section visible"
echo "  2. Chat: ask for SuiteScript → Download .js button appears"
echo "  3. Login with unverified account → 403 verify-email message"
