#!/usr/bin/env bash
# Phase 54.6-02 Task 1 — Provision RDS Proxy zietra-aurora-proxy
#
# Idempotent: every step does get-or-create / get-or-attach. Safe to re-run.
#
# Prereqs (from Phase 54.6-01):
#   - VPC zietra-prod-vpc with 2 private subnets (PRIV_1A, PRIV_1B)
#   - RDS Proxy SG `sg-0e066f754bf795ed5` (PROXY_SG)
#   - Aurora cluster `zietra-aurora-prod-v2` (NEW_CLUSTER) available
#   - NEW_MASTER_SECRET_ARN points at fresh Secrets Manager master secret
#
# Outputs (printed at end, written to vpc-migration.handoff.sh):
#   - PROXY_ENDPOINT  - the proxy DNS name Lambdas connect to
#
# Auth mode: password-auth via Secrets Manager (IAMAuth=DISABLED) per
# 54.6-02 critical_constraints #2 — clients keep using password URLs that
# point at the Proxy endpoint, Proxy uses Secrets Manager toward Aurora.
# IAM token client-side conversion deferred to Milestone M3.

set -euo pipefail

HANDOFF=/Users/jeet/doordash-p2p/.planning/phases/54.6-enterprise-hardening-starter-pack-vpc-rds-proxy-waf-guardduty-close-sg/vpc-migration.handoff.sh
RUNBOOK=/Users/jeet/doordash-p2p/.planning/runbooks/rds-proxy-cutover-54-6-02.md

# shellcheck disable=SC1090
source "$HANDOFF"

REGION=us-east-1
ROLE_NAME=zietra-rds-proxy-role
PROXY_NAME=zietra-aurora-proxy

mkdir -p "$(dirname "$RUNBOOK")"
touch "$RUNBOOK"

log() { echo "[$(date -u +%H:%M:%SZ)] $*" | tee -a "$RUNBOOK"; }

log "=== Task 1: Provision RDS Proxy ($PROXY_NAME) ==="

# 1. IAM role for proxy (get-or-create)
log "Step 1/6: IAM role $ROLE_NAME"
if ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null); then
  log "  role exists: $ROLE_ARN"
else
  cat > /tmp/proxy-trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"rds.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
  aws iam create-role --role-name "$ROLE_NAME" \
    --assume-role-policy-document file:///tmp/proxy-trust.json \
    --tags Key=Phase,Value=54.6 Key=Project,Value=Zietra \
    --region "$REGION" >/dev/null
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
  log "  created: $ROLE_ARN"
fi
PROXY_ROLE_ARN="$ROLE_ARN"

# 2. Inline policy: secretsmanager:GetSecretValue on rds!cluster-* + kms:Decrypt
log "Step 2/6: Inline policy 'secrets-and-kms'"
cat > /tmp/proxy-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-*"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "arn:aws:kms:us-east-1:134607809447:key/*",
      "Condition": {"StringEquals": {"kms:ViaService": "secretsmanager.us-east-1.amazonaws.com"}}
    }
  ]
}
EOF
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name secrets-and-kms \
  --policy-document file:///tmp/proxy-policy.json
log "  policy applied (secrets-and-kms)"

# 3. Create proxy (get-or-create by name)
log "Step 3/6: RDS Proxy $PROXY_NAME"
if aws rds describe-db-proxies --db-proxy-name "$PROXY_NAME" --region "$REGION" >/dev/null 2>&1; then
  log "  proxy exists, skipping create"
else
  log "  creating proxy (this can take 3-5 min)..."
  aws rds create-db-proxy \
    --db-proxy-name "$PROXY_NAME" \
    --engine-family POSTGRESQL \
    --auth "AuthScheme=SECRETS,SecretArn=$NEW_MASTER_SECRET_ARN,IAMAuth=DISABLED" \
    --role-arn "$PROXY_ROLE_ARN" \
    --vpc-subnet-ids "$PRIV_1A" "$PRIV_1B" \
    --vpc-security-group-ids "$PROXY_SG" \
    --require-tls \
    --idle-client-timeout 1800 \
    --tags Key=Phase,Value=54.6 Key=Project,Value=Zietra \
    --region "$REGION" >/dev/null
  log "  proxy creation submitted; waiting for available..."
  for i in $(seq 1 60); do
    STATUS=$(aws rds describe-db-proxies --db-proxy-name "$PROXY_NAME" --region "$REGION" \
      --query 'DBProxies[0].Status' --output text 2>/dev/null || echo "INIT")
    [ "$STATUS" = "available" ] && { log "  proxy available (after ${i}*5s)"; break; }
    sleep 5
  done
fi

# 4. Register Aurora cluster as proxy target
log "Step 4/6: Register Aurora target $NEW_CLUSTER"
TARGETS_JSON=$(aws rds describe-db-proxy-targets --db-proxy-name "$PROXY_NAME" --region "$REGION" 2>/dev/null || echo '{"Targets":[]}')
if echo "$TARGETS_JSON" | jq -e --arg c "$NEW_CLUSTER" '.Targets[] | select(.RdsResourceId==$c)' >/dev/null 2>&1; then
  log "  target already registered"
else
  aws rds register-db-proxy-targets \
    --db-proxy-name "$PROXY_NAME" \
    --db-cluster-identifiers "$NEW_CLUSTER" \
    --region "$REGION" >/dev/null
  log "  target registration submitted"
fi

# 5. Wait for target health
log "Step 5/6: Wait for TargetHealth.State=AVAILABLE"
for i in $(seq 1 60); do
  STATE=$(aws rds describe-db-proxy-targets --db-proxy-name "$PROXY_NAME" --region "$REGION" \
    --query 'Targets[0].TargetHealth.State' --output text 2>/dev/null || echo INIT)
  REASON=$(aws rds describe-db-proxy-targets --db-proxy-name "$PROXY_NAME" --region "$REGION" \
    --query 'Targets[0].TargetHealth.Reason' --output text 2>/dev/null || echo "")
  log "  attempt $i: state=$STATE reason=$REASON"
  [ "$STATE" = "AVAILABLE" ] && break
  sleep 5
done

# 6. Capture proxy endpoint
log "Step 6/6: Capture proxy endpoint"
PROXY_ENDPOINT=$(aws rds describe-db-proxies --db-proxy-name "$PROXY_NAME" \
  --query 'DBProxies[0].Endpoint' --output text --region "$REGION")
PROXY_ARN=$(aws rds describe-db-proxies --db-proxy-name "$PROXY_NAME" \
  --query 'DBProxies[0].DBProxyArn' --output text --region "$REGION")

log "  PROXY_ENDPOINT=$PROXY_ENDPOINT"
log "  PROXY_ARN=$PROXY_ARN"
log "  PROXY_ROLE_ARN=$PROXY_ROLE_ARN"

# Append PROXY_ENDPOINT to handoff file (idempotent)
if ! grep -q "^export PROXY_ENDPOINT=" "$HANDOFF"; then
  {
    echo ""
    echo "# --- RDS PROXY (Phase 54.6-02 Task 1) ---"
    echo "export PROXY_ENDPOINT=$PROXY_ENDPOINT"
    echo "export PROXY_ARN=$PROXY_ARN"
    echo "export PROXY_ROLE_ARN=$PROXY_ROLE_ARN"
  } >> "$HANDOFF"
  log "  handoff env appended"
else
  log "  handoff env already has PROXY_ENDPOINT — skipping append"
fi

log "=== Task 1 complete ==="
echo ""
echo "PROXY_ENDPOINT=$PROXY_ENDPOINT"
