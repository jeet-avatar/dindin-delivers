#!/usr/bin/env bash
# scripts/lambda-env-snapshot-pre-55-03.sh — capture rollback baseline for 4 Lambdas.
#
# Snapshots the CURRENT env vars + IAM execution role inline policies for each Lambda
# to /tmp/lambda-env-pre-55-03/<lambda>.config.json (mode 600). This is the rollback
# ground truth: if the Wave-3 cutover breaks any Lambda, we restore from these files.
#
# Phase 55-03 plan calls for 4 Lambdas but only 2 actually have DB access:
#   - turion-demo-api      → uses plaintext DATABASE_URL env var
#   - turion-satellite-api → uses DATABASE_URL_ARN → secret -> URL
#   - asc606-app           → NO DB access (Next.js frontend)
#   - marquee-app          → NO DB access (static frontend)
# We snapshot all 4 anyway so the runbook can prove the no-op for asc606/marquee.
set -euo pipefail
REGION=us-east-1
OUTDIR=/tmp/lambda-env-pre-55-03
mkdir -p "$OUTDIR"
chmod 700 "$OUTDIR"

for FN in turion-demo-api turion-satellite-api asc606-app marquee-app; do
  CFG="$OUTDIR/${FN}.config.json"
  aws lambda get-function-configuration --function-name "$FN" --region "$REGION" \
    > "$CFG" 2>&1 || { echo "[snapshot] $FN: get-function-configuration FAILED"; continue; }
  chmod 600 "$CFG"

  # Capture each Lambda's execution-role inline policies (so rollback can restore IAM grants too)
  ROLE_ARN=$(jq -r .Role "$CFG")
  ROLE_NAME=$(basename "$ROLE_ARN")
  LIST="$OUTDIR/${FN}.iam-inline-policies.json"
  aws iam list-role-policies --role-name "$ROLE_NAME" --region "$REGION" > "$LIST" 2>&1 \
    || { echo "[snapshot] $FN: list-role-policies FAILED (skipping IAM capture)"; continue; }
  chmod 600 "$LIST"

  for POLICY in $(jq -r '.PolicyNames[]' "$LIST" 2>/dev/null); do
    POL="$OUTDIR/${FN}.iam-${POLICY}.json"
    aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY" --region "$REGION" \
      > "$POL" 2>&1 || true
    chmod 600 "$POL"
  done

  echo "[snapshot] $FN — config + IAM captured → $OUTDIR/${FN}.*"
done

echo "[snapshot] all 4 Lambdas snapshotted to $OUTDIR/ (mode 600)"
ls -la "$OUTDIR/"
