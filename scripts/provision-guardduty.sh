#!/usr/bin/env bash
# Phase 54.6-03 Task 2 — Enable GuardDuty + route HIGH-severity findings to SNS.
#
# - Creates a detector with FIFTEEN_MINUTES publishing frequency and S3 protection.
# - Creates an SNS topic `zietra-security-findings` (separate from
#   zietra-aurora-alarms, which is DB-specific from 54.5).
# - Subscribes security@zietra.com (operator must confirm via email link).
# - Wires an EventBridge rule that filters severity>=7.0 findings and publishes
#   them to the SNS topic.
#
# Idempotent: re-running this script is a no-op once everything is in place.

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=134607809447
TOPIC_NAME=zietra-security-findings
RULE_NAME=zietra-gd-high-severity
NOTIFY_EMAIL=security@zietra.com

# 1. Get-or-create detector
DET=$(aws guardduty list-detectors --region "$REGION" --query 'DetectorIds[0]' --output text 2>/dev/null || echo None)
if [ "$DET" = "None" ] || [ -z "$DET" ]; then
  echo "Creating GuardDuty detector..."
  DET=$(aws guardduty create-detector \
    --enable \
    --finding-publishing-frequency FIFTEEN_MINUTES \
    --data-sources '{"S3Logs": {"Enable": true}, "Kubernetes": {"AuditLogs": {"Enable": false}}, "MalwareProtection": {"ScanEc2InstanceWithFindings": {"EbsVolumes": false}}}' \
    --tags Phase=54.6,Wave=3 \
    --region "$REGION" --query 'DetectorId' --output text)
fi
echo "DETECTOR_ID=$DET"

# 2. Get-or-create SNS topic
SNS_ARN=$(aws sns list-topics --region "$REGION" \
  --query "Topics[?ends_with(TopicArn, ':${TOPIC_NAME}')].TopicArn | [0]" --output text)
if [ -z "$SNS_ARN" ] || [ "$SNS_ARN" = "None" ]; then
  echo "Creating SNS topic ${TOPIC_NAME}..."
  SNS_ARN=$(aws sns create-topic --name "$TOPIC_NAME" --region "$REGION" \
    --attributes "DisplayName=Zietra Security" \
    --tags "Key=Phase,Value=54.6" "Key=Wave,Value=3" \
    --query 'TopicArn' --output text)
fi
echo "SNS_ARN=$SNS_ARN"

# 3. Subscribe security@zietra.com (idempotent: only create if no entry for this email)
EXISTING=$(aws sns list-subscriptions-by-topic --topic-arn "$SNS_ARN" --region "$REGION" \
  --query "Subscriptions[?Endpoint=='${NOTIFY_EMAIL}'].SubscriptionArn | [0]" --output text)
if [ -z "$EXISTING" ] || [ "$EXISTING" = "None" ]; then
  echo "Creating email subscription for ${NOTIFY_EMAIL}..."
  aws sns subscribe --topic-arn "$SNS_ARN" --protocol email \
    --notification-endpoint "$NOTIFY_EMAIL" --region "$REGION" \
    --query '{SubscriptionArn:SubscriptionArn}' --output text
  echo "  Subscription created — operator MUST confirm via email link before deliveries arrive."
else
  echo "Subscription for ${NOTIFY_EMAIL} already exists: $EXISTING"
fi

# 4. Allow EventBridge to publish to the SNS topic
echo "Granting EventBridge sns:Publish permission..."
SID=AllowEventBridgePublish-54-6-03
POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "${SID}",
      "Effect": "Allow",
      "Principal": {"Service": "events.amazonaws.com"},
      "Action": "sns:Publish",
      "Resource": "${SNS_ARN}"
    }
  ]
}
EOF
)
aws sns set-topic-attributes --topic-arn "$SNS_ARN" \
  --attribute-name Policy --attribute-value "$POLICY" --region "$REGION"

# 5. EventBridge rule — severity >= 7.0
EVENT_PATTERN=$(cat <<'EOF'
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {"severity": [{"numeric": [">=", 7.0]}]}
}
EOF
)
echo "Upserting EventBridge rule ${RULE_NAME}..."
aws events put-rule --name "$RULE_NAME" --region "$REGION" \
  --description "Route GuardDuty severity>=7 findings to ${TOPIC_NAME}" \
  --event-pattern "$EVENT_PATTERN" \
  --state ENABLED \
  --tags "Key=Phase,Value=54.6" "Key=Wave,Value=3" \
  --query '{Arn:RuleArn}' --output text

# 6. Target the rule at SNS
echo "Setting SNS target..."
aws events put-targets --rule "$RULE_NAME" --region "$REGION" \
  --targets "Id=1,Arn=${SNS_ARN}" \
  --query 'FailedEntryCount' --output text

echo ""
echo "GuardDuty + EventBridge + SNS wiring complete."
echo "  DETECTOR_ID=${DET}"
echo "  SNS_ARN=${SNS_ARN}"
echo "  RULE_NAME=${RULE_NAME}"
echo "  Email subscription: ${NOTIFY_EMAIL} (pending confirmation)"
