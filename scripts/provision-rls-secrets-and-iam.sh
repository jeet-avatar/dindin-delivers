#!/usr/bin/env bash
# scripts/provision-rls-secrets-and-iam.sh — Phase 55 Plan 02
#
# Idempotently creates 2 Secrets Manager secrets for the new Postgres roles
# (zietra_app + zietra_admin_bypass) provisioned by migration 029, then DROPs
# the temp `_zietra_role_passwords` table from Postgres so no plaintext lingers.
#
# Each secret is shaped to match what the Lambda `secrets.ts` parser already
# expects (per RESEARCH §H.3):
#   {
#     "username": "<role>",
#     "password": "<random>",
#     "engine": "postgres",
#     "host": "<RDS Proxy endpoint>",
#     "port": 5432,
#     "dbname": "zietra"
#   }
#
# ⚠️ KNOWN ISSUE — direct psql does NOT work post-54.6 VPC migration. Aurora
# lives in private subnets only (no IGW route). We use the one-shot VPC Lambda
# pattern (zietra-rls-migration-runner) — see Phase 55-01 SUMMARY for the recipe.
#
# Strategy:
#   1. Source 54.6-01 handoff for cluster + proxy env vars
#   2. Resolve master password from Secrets Manager (operator CLI has IAM rights)
#   3. Invoke the one-shot Lambda to read the 2 generated passwords from
#      `_zietra_role_passwords`
#   4. Build the 2 JSON payloads with RDS Proxy endpoint as `host`
#   5. Create-or-update 2 Secrets Manager secrets
#   6. Invoke the one-shot Lambda once more to DROP `_zietra_role_passwords`
#   7. Done — no plaintext password lingers in Postgres
#
# Re-running this script is idempotent — the existence guard switches to
# put-secret-value on subsequent runs.

set -euo pipefail

HANDOFF_FILE="/Users/jeet/doordash-p2p/.planning/phases/54.6-enterprise-hardening-starter-pack-vpc-rds-proxy-waf-guardduty-close-sg/vpc-migration.handoff.sh"
if [[ ! -f "$HANDOFF_FILE" ]]; then
  echo "ERROR: handoff file not found: $HANDOFF_FILE" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$HANDOFF_FILE"

: "${NEW_MASTER_SECRET_ARN:?env from handoff missing NEW_MASTER_SECRET_ARN}"
: "${PROXY_ENDPOINT:?env from handoff missing PROXY_ENDPOINT}"

REGION="${REGION:-us-east-1}"
RUNNER_LAMBDA="${RUNNER_LAMBDA:-zietra-rls-migration-runner}"

echo "[secrets] Resolving master password from Secrets Manager..."
NEW_MASTER_PW=$(aws secretsmanager get-secret-value \
  --secret-id "$NEW_MASTER_SECRET_ARN" --query SecretString --output text \
  --region "$REGION" | jq -r .password)
[[ -z "$NEW_MASTER_PW" ]] && { echo "ERROR: empty master password"; exit 1; }

invoke_sql() {
  local sql="$1"
  local payload
  payload=$(jq -n --arg sql "$sql" --arg pw "$NEW_MASTER_PW" '{sql: $sql, password: $pw}')
  local tmp
  tmp=$(mktemp)
  local resp
  resp=$(mktemp)
  echo "$payload" > "$tmp"
  aws lambda invoke --function-name "$RUNNER_LAMBDA" \
    --payload "fileb://$tmp" --region "$REGION" "$resp" >/dev/null 2>&1
  cat "$resp"
  rm -f "$tmp" "$resp"
}

# Check if _zietra_role_passwords still exists. If yes (first run), read passwords.
# If no (idempotent re-run after first success), bail early ONLY IF both secrets
# already exist — otherwise raise an error.
echo "[secrets] Checking if _zietra_role_passwords table exists..."
PW_TABLE_EXISTS=$(invoke_sql "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_name = '_zietra_role_passwords';" \
  | jq -r '.result.rows[0].c // "0"')

if [[ "$PW_TABLE_EXISTS" == "0" ]]; then
  # Idempotent path: table already dropped by a previous run. Confirm both
  # secrets exist + report no-op.
  echo "[secrets] _zietra_role_passwords already dropped — checking idempotent state..."
  APP_OK=$(aws secretsmanager describe-secret --secret-id zietra-aurora/app-role --region "$REGION" >/dev/null 2>&1 && echo yes || echo no)
  BYPASS_OK=$(aws secretsmanager describe-secret --secret-id zietra-aurora/admin-bypass-role --region "$REGION" >/dev/null 2>&1 && echo yes || echo no)
  if [[ "$APP_OK" == "yes" && "$BYPASS_OK" == "yes" ]]; then
    echo "[secrets] IDEMPOTENT no-op — zietra-aurora/app-role already exists"
    echo "[secrets] IDEMPOTENT no-op — zietra-aurora/admin-bypass-role already exists"
    echo "[secrets] DONE — both secrets present (no rotation; re-run migration 029 to rotate)"
    exit 0
  else
    echo "ERROR: _zietra_role_passwords was dropped but secrets are missing" >&2
    echo "  app-role exists=$APP_OK, admin-bypass-role exists=$BYPASS_OK" >&2
    echo "  Re-run migration 029 to regenerate passwords + table." >&2
    exit 1
  fi
fi

echo "[secrets] Reading role passwords from _zietra_role_passwords..."
APP_PW=$(invoke_sql "SELECT password FROM _zietra_role_passwords WHERE rolname='zietra_app';" \
  | jq -r '.result.rows[0].password // empty')
BYPASS_PW=$(invoke_sql "SELECT password FROM _zietra_role_passwords WHERE rolname='zietra_admin_bypass';" \
  | jq -r '.result.rows[0].password // empty')

if [[ -z "$APP_PW" || -z "$BYPASS_PW" ]]; then
  echo "ERROR: could not retrieve role passwords from _zietra_role_passwords" >&2
  exit 1
fi
echo "[secrets] Retrieved passwords: zietra_app (len=${#APP_PW}), zietra_admin_bypass (len=${#BYPASS_PW})"

# Build JSON payloads (shape matches Lambda secrets.ts parser per RESEARCH §H.3)
APP_JSON=$(jq -nc --arg pw "$APP_PW" --arg host "$PROXY_ENDPOINT" \
  '{username:"zietra_app", password:$pw, engine:"postgres", host:$host, port:5432, dbname:"zietra"}')
BYPASS_JSON=$(jq -nc --arg pw "$BYPASS_PW" --arg host "$PROXY_ENDPOINT" \
  '{username:"zietra_admin_bypass", password:$pw, engine:"postgres", host:$host, port:5432, dbname:"zietra"}')

create_or_update_secret() {
  local name="$1"
  local json="$2"
  local desc="$3"
  if aws secretsmanager describe-secret --secret-id "$name" --region "$REGION" >/dev/null 2>&1; then
    echo "[secrets] $name exists — putting new value"
    aws secretsmanager put-secret-value \
      --secret-id "$name" --secret-string "$json" \
      --region "$REGION" >/dev/null
  else
    echo "[secrets] $name does not exist — creating"
    aws secretsmanager create-secret \
      --name "$name" --description "$desc" --secret-string "$json" \
      --tags Key=Project,Value=Zietra Key=Phase,Value=55 Key=Plan,Value=02 \
      --region "$REGION" >/dev/null
  fi
}

create_or_update_secret "zietra-aurora/app-role" "$APP_JSON" \
  "Postgres zietra_app role — used by 4 Lambdas day-to-day (subject to RLS). Phase 55."
create_or_update_secret "zietra-aurora/admin-bypass-role" "$BYPASS_JSON" \
  "Postgres zietra_admin_bypass role (BYPASSRLS) — used ONLY by migration scripts. Phase 55."

# DROP temp password table from Postgres — no plaintext lingering
echo "[secrets] Dropping _zietra_role_passwords from Postgres..."
DROP_RESP=$(invoke_sql "DROP TABLE IF EXISTS _zietra_role_passwords;")
DROP_OK=$(echo "$DROP_RESP" | jq -r '.ok')
[[ "$DROP_OK" == "true" ]] && echo "[secrets] dropped" || { echo "ERROR: drop failed: $DROP_RESP"; exit 1; }

echo "[secrets] DONE — both secrets present; _zietra_role_passwords dropped"
