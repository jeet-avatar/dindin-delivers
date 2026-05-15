#!/usr/bin/env bash
# scripts/lambda-flip-to-app-role.sh — Wave 3 Lambda cutover for Phase 55-03.
#
# Flips both RLS-bound Lambdas from zietra_admin (master) to zietra_app (NOBYPASSRLS).
# AFTER this script:
#   - turion-demo-api connects as zietra_app via plaintext DATABASE_URL env var
#   - turion-satellite-api connects as zietra_app via the existing DATABASE_URL_ARN
#     env var (we mutate the secret VALUE, not the ARN — same env var keeps working)
#   - asc606-app and marquee-app are untouched (no DB access)
#
# Pre-flight: requires snapshot at /tmp/lambda-env-pre-55-03/ (run lambda-env-snapshot
# first). Aborts if missing.
#
# Rollback: see .planning/runbooks/lambda-app-role-cutover-55-03.md
set -euo pipefail
REGION=us-east-1
SNAPDIR=/tmp/lambda-env-pre-55-03

if [ ! -d "$SNAPDIR" ] || [ "$(ls "$SNAPDIR"/*.config.json 2>/dev/null | wc -l)" -lt 4 ]; then
  echo "FAIL: pre-flight snapshot missing at $SNAPDIR — run lambda-env-snapshot-pre-55-03.sh first"
  exit 1
fi

# Build the zietra_app URL from the JSON-shape Secrets Manager secret.
APP_SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id zietra-aurora/app-role \
  --region "$REGION" \
  --query 'SecretString' --output text)
APP_USER=$(echo "$APP_SECRET_JSON" | jq -r .username)
APP_PASS_RAW=$(echo "$APP_SECRET_JSON" | jq -r .password)
APP_HOST=$(echo "$APP_SECRET_JSON" | jq -r .host)
APP_PORT=$(echo "$APP_SECRET_JSON" | jq -r .port)
APP_DB=$(echo "$APP_SECRET_JSON" | jq -r .dbname)
# URL-encode the password (it may contain special chars)
APP_PASS_ENC=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$APP_PASS_RAW")

# Each Lambda uses a different schema query-string — preserve that.
DEMO_URL="postgres://${APP_USER}:${APP_PASS_ENC}@${APP_HOST}:${APP_PORT}/${APP_DB}?schema=turion&sslmode=require"
SAT_URL="postgres://${APP_USER}:${APP_PASS_ENC}@${APP_HOST}:${APP_PORT}/${APP_DB}?schema=turion_satellite&sslmode=require"

echo "[flip] Built zietra_app URLs for demo + satellite Lambdas"
echo "[flip] DEMO_URL: ${DEMO_URL//${APP_PASS_ENC}/<redacted>}"
echo "[flip] SAT_URL : ${SAT_URL//${APP_PASS_ENC}/<redacted>}"

# ── 1. turion-demo-api: replace DATABASE_URL value in env vars ──
echo "=== turion-demo-api ==="
CUR_ENV=$(aws lambda get-function-configuration --function-name turion-demo-api --region "$REGION" \
  --query 'Environment.Variables' --output json)
NEW_ENV_JSON=$(echo "$CUR_ENV" | jq --arg u "$DEMO_URL" '{Variables: (. + {DATABASE_URL: $u})}')
ENV_FILE=$(mktemp)
echo "$NEW_ENV_JSON" > "$ENV_FILE"
aws lambda update-function-configuration \
  --function-name turion-demo-api \
  --environment "file://$ENV_FILE" \
  --region "$REGION" >/dev/null
rm "$ENV_FILE"
aws lambda wait function-updated --function-name turion-demo-api --region "$REGION"
echo "[flip] turion-demo-api DATABASE_URL → zietra_app"

# ── 2. turion-satellite-api: mutate the existing secret's value (env var is unchanged) ──
echo "=== turion-satellite-api ==="
SAT_SECRET_ARN=$(aws lambda get-function-configuration --function-name turion-satellite-api --region "$REGION" \
  --query 'Environment.Variables.DATABASE_URL_ARN' --output text)
echo "[flip] satellite secret ARN: $SAT_SECRET_ARN"
# Update the secret value — old value was a URL with zietra_admin; new value is URL with zietra_app
aws secretsmanager put-secret-value \
  --secret-id "$SAT_SECRET_ARN" \
  --secret-string "$SAT_URL" \
  --region "$REGION" >/dev/null
echo "[flip] turion-satellite/production/database-url → zietra_app (env var unchanged)"
# Bounce satellite Lambda to clear secret cache. Skip if you trust loadSecrets() to refresh
# on next cold start; we force one with update-function-configuration (any tag change works).
aws lambda update-function-configuration \
  --function-name turion-satellite-api \
  --description "Phase 55-03 cutover $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --region "$REGION" >/dev/null
aws lambda wait function-updated --function-name turion-satellite-api --region "$REGION"
echo "[flip] turion-satellite-api description bumped (forces cold-start to pick up new secret)"

# ── 3. asc606-app + marquee-app: NO-OP (no DATABASE_URL — they're frontend-only Lambdas) ──
echo "=== asc606-app + marquee-app: NO-OP ==="
echo "[flip] asc606-app has no DATABASE_URL env var (frontend-only Lambda)"
echo "[flip] marquee-app has no env vars (static-site Lambda)"

echo ""
echo "[flip] DONE — both DB-using Lambdas now connect as zietra_app"
echo "[flip] Verify: curl <api-gw>/api/health → expect {status:ok, db:ok}"
