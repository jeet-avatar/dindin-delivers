#!/usr/bin/env bash
# Phase 54.6-03 Task 3a — Enable AWS Security Hub + subscribe FSBP + CIS v1.4.
#
# Enabling Security Hub auto-creates the AWSServiceRoleForSecurityHub
# service-linked role (no manual IAM step required).
# `--enable-default-standards` subscribes AWS Foundational Security Best
# Practices + CIS AWS Foundations Benchmark v1.2 by default; we additionally
# subscribe CIS v1.4 (more recent + tighter controls).
#
# Idempotent: re-running this script is a no-op once everything is in place.

set -euo pipefail
REGION=us-east-1

# 1. Enable Security Hub (idempotent — describe-hub returns success if enabled)
if ! aws securityhub describe-hub --region "$REGION" >/dev/null 2>&1; then
  echo "Enabling Security Hub..."
  aws securityhub enable-security-hub \
    --enable-default-standards \
    --tags "Phase=54.6,Wave=3" \
    --region "$REGION"
else
  echo "Security Hub already enabled."
fi

# 2. Subscribe additional standard — CIS AWS Foundations Benchmark v1.4
# (default standards subscription already included AWS Foundational SBP + CIS v1.2)
echo "Subscribing to CIS AWS Foundations Benchmark v1.4..."
aws securityhub batch-enable-standards --region "$REGION" \
  --standards-subscription-requests '[
    {"StandardsArn": "arn:aws:securityhub:us-east-1::standards/cis-aws-foundations-benchmark/v/1.4.0"}
  ]' \
  --query 'StandardsSubscriptions[].StandardsArn' --output text

# 3. Report current subscriptions
echo ""
echo "Current Security Hub standards subscriptions:"
aws securityhub get-enabled-standards --region "$REGION" \
  --query 'StandardsSubscriptions[].{N:StandardsArn,S:StandardsStatus}' --output json

echo ""
echo "Security Hub enabled. Initial findings will populate within 15-30 minutes."
