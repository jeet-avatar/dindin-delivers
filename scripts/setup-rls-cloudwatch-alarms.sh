#!/usr/bin/env bash
# scripts/setup-rls-cloudwatch-alarms.sh — Phase 55-05
#
# Arms 2 CloudWatch alarms gating the 7-day RLS soak window:
#
#   1. zietra-rls-pinning-spike
#      → AWS/RDS::DatabaseConnectionsCurrentlySessionPinned (Maximum)
#         > 5 for 1 × 5-min period
#      → Indicates SET (not SET LOCAL) leaked into a Lambda route handler;
#        threatens RDS-Proxy compatibility under load (RESEARCH §G.3).
#
#   2. zietra-rls-lambda-p99-regression
#      → AWS/Lambda::Duration (p99) > 1.10 × 55-04 baseline for 3 × 5-min
#      → Catches RLS query-plan regressions BEFORE p99 customer impact.
#
# Both alarms publish to SNS topic zietra-aurora-alarms (subscribed to
# operator email since 54.6 hardening; same topic used by Aurora/Proxy
# alarms — operators already know how to triage from this channel).
#
# Idempotent: re-running updates existing alarms in place.

set -euo pipefail
REGION=us-east-1

# Resolve SNS topic — try multiple names in order of preference
SNS_TOPIC_ARN=""
for CANDIDATE in zietra-aurora-alarms zietra-prod-alerts zietra-security-findings; do
  ARN=$(aws sns list-topics --region "$REGION" \
    --query "Topics[?ends_with(TopicArn, ':${CANDIDATE}')].TopicArn" \
    --output text 2>/dev/null | head -1)
  if [ -n "$ARN" ] && [ "$ARN" != "None" ]; then
    SNS_TOPIC_ARN="$ARN"
    echo "[alarms] Using SNS topic: $CANDIDATE ($SNS_TOPIC_ARN)"
    break
  fi
done

if [ -z "$SNS_TOPIC_ARN" ]; then
  echo "[alarms] FAIL: no acceptable SNS topic found (tried zietra-aurora-alarms / zietra-prod-alerts / zietra-security-findings)"
  echo "[alarms]       Phase 54.6 provisions these — re-check that 54.6-04 completed."
  exit 1
fi

# Alarm 1: pinning spike
aws cloudwatch put-metric-alarm \
  --alarm-name "zietra-rls-pinning-spike" \
  --alarm-description "RLS soak — DatabaseConnectionsCurrentlySessionPinned > 5 indicates SET (not SET LOCAL) leaked into a Lambda route handler; threatens RDS-Proxy compatibility." \
  --metric-name DatabaseConnectionsCurrentlySessionPinned \
  --namespace AWS/RDS \
  --dimensions Name=ProxyName,Value=zietra-aurora-proxy \
  --statistic Maximum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --ok-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data notBreaching \
  --region "$REGION"

echo "[alarms] zietra-rls-pinning-spike — armed."

# Alarm 2: Lambda p99 trip-wire on turion-demo-api (most-invoked Aurora-backed Lambda).
# Threshold = 1.10 × 55-04 worst-p99 on a non-auth path.
# 55-04 baseline: /api/tenants/current p99 = 466 ms; /api/health p99 (cold) = 2378 ms.
# Use 2700ms (1.13 × 2378) as the trip-wire — captures sustained regression
# while tolerating cold-start noise. If TURION_P99_THRESHOLD_MS env var is set,
# it overrides this default (allows operator to tighten after the 7-day soak
# settles to a steady warm-state baseline).
THRESHOLD_MS=${TURION_P99_THRESHOLD_MS:-2700}

aws cloudwatch put-metric-alarm \
  --alarm-name "zietra-rls-lambda-p99-regression" \
  --alarm-description "RLS soak — turion-demo-api Lambda Duration p99 > ${THRESHOLD_MS} ms for 3×5min (1.10× 55-04 baseline). Trip-wire for >10% RLS regression." \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=turion-demo-api \
  --extended-statistic p99 \
  --period 300 \
  --evaluation-periods 3 \
  --threshold "$THRESHOLD_MS" \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --ok-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data notBreaching \
  --region "$REGION"

echo "[alarms] zietra-rls-lambda-p99-regression — armed (threshold=${THRESHOLD_MS}ms)."

# Verify both alarms exist + are in OK or INSUFFICIENT_DATA state
echo ""
echo "[alarms] Final state:"
aws cloudwatch describe-alarms \
  --alarm-names zietra-rls-pinning-spike zietra-rls-lambda-p99-regression \
  --query 'MetricAlarms[].[AlarmName,StateValue,Threshold]' \
  --output table \
  --region "$REGION"

echo ""
echo "[alarms] DONE — 2 alarms armed. SNS topic: $SNS_TOPIC_ARN"
