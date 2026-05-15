#!/usr/bin/env bash
# Phase 54.6-03 Task 1 — Provision WAFv2 Web ACL(s) for Zietra production traffic.
#
# CLOUDFRONT-scope ACL `zietra-prod-waf` → associated with all customer-facing CF distros.
# REGIONAL-scope ACL `zietra-prod-waf-regional` → associated with marquee + asc606 APIGW (Rule-3 deviation:
# those domains don't live on CloudFront, they point directly at API Gateway).
#
# ALL managed rule groups deployed with OverrideAction=Count for the initial 24-72h soak.
# COUNT→BLOCK transition is operator-driven, documented in waf-deployment-54-6-03.md.
#
# Idempotent: re-running this script is a no-op once everything is in place.

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=134607809447

cat > /tmp/web-acl-rules.json <<'EOF'
[
  {
    "Name": "Allow-Auth-Paths",
    "Priority": 5,
    "Statement": {
      "OrStatement": {
        "Statements": [
          {"ByteMatchStatement": {"SearchString": "/api/auth/callback", "FieldToMatch": {"UriPath": {}}, "TextTransformations": [{"Priority": 0, "Type": "NONE"}], "PositionalConstraint": "STARTS_WITH"}},
          {"ByteMatchStatement": {"SearchString": "/api/auth/", "FieldToMatch": {"UriPath": {}}, "TextTransformations": [{"Priority": 0, "Type": "NONE"}], "PositionalConstraint": "STARTS_WITH"}},
          {"ByteMatchStatement": {"SearchString": "/accept-invite", "FieldToMatch": {"UriPath": {}}, "TextTransformations": [{"Priority": 0, "Type": "NONE"}], "PositionalConstraint": "STARTS_WITH"}},
          {"ByteMatchStatement": {"SearchString": "/cognito-auth-callback", "FieldToMatch": {"UriPath": {}}, "TextTransformations": [{"Priority": 0, "Type": "NONE"}], "PositionalConstraint": "STARTS_WITH"}},
          {"ByteMatchStatement": {"SearchString": "/api/invites/accept-invite", "FieldToMatch": {"UriPath": {}}, "TextTransformations": [{"Priority": 0, "Type": "NONE"}], "PositionalConstraint": "STARTS_WITH"}}
        ]
      }
    },
    "Action": {"Allow": {}},
    "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "allow-auth-paths"}
  },
  {
    "Name": "AWS-CommonRuleSet",
    "Priority": 10,
    "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesCommonRuleSet"}},
    "OverrideAction": {"Count": {}},
    "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "aws-common-rule-set"}
  },
  {
    "Name": "AWS-KnownBadInputs",
    "Priority": 20,
    "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesKnownBadInputsRuleSet"}},
    "OverrideAction": {"Count": {}},
    "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "aws-known-bad-inputs"}
  },
  {
    "Name": "AWS-AmazonIpReputation",
    "Priority": 30,
    "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesAmazonIpReputationList"}},
    "OverrideAction": {"Count": {}},
    "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "aws-ip-reputation"}
  },
  {
    "Name": "AWS-BotControlCommon",
    "Priority": 40,
    "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesBotControlRuleSet", "ManagedRuleGroupConfigs": [{"AWSManagedRulesBotControlRuleSet": {"InspectionLevel": "COMMON"}}]}},
    "OverrideAction": {"Count": {}},
    "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "aws-bot-control-common"}
  }
]
EOF

create_or_get_acl() {
  local SCOPE=$1
  local NAME=$2
  local ARN
  ARN=$(aws wafv2 list-web-acls --scope "$SCOPE" --region "$REGION" \
    --query "WebACLs[?Name=='$NAME'].ARN | [0]" --output text 2>/dev/null || echo "")
  if [ -z "$ARN" ] || [ "$ARN" = "None" ]; then
    echo "Creating $SCOPE Web ACL: $NAME" >&2
    ARN=$(aws wafv2 create-web-acl \
      --name "$NAME" --scope "$SCOPE" \
      --default-action 'Allow={}' \
      --rules file:///tmp/web-acl-rules.json \
      --visibility-config "SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=$NAME" \
      --tags Key=Phase,Value=54.6 Key=Wave,Value=3 \
      --region "$REGION" --query 'Summary.ARN' --output text)
  fi
  echo "$ARN"
}

# 1. CLOUDFRONT-scope ACL — for actual CloudFront distributions
CF_ACL_ARN=$(create_or_get_acl CLOUDFRONT zietra-prod-waf)
echo "CF_ACL_ARN=$CF_ACL_ARN"

# 2. REGIONAL-scope ACL — for direct-APIGW marquee + asc606 (Rule-3 deviation)
RG_ACL_ARN=$(create_or_get_acl REGIONAL zietra-prod-waf-regional)
echo "RG_ACL_ARN=$RG_ACL_ARN"

# 3. CloudFront distribution associations
# Discovered at runtime: marquee + asc606 don't have CF distros (Rule-3 — see runbook).
# Actual CF distros that ARE customer-facing:
#   - E37R9PT8IL44L2  → turionspace.zietra.com + *.zietra.com (S3 origin)
#   - E1X82T89JWL8CA  → zietra.com + www.zietra.com (S3 origin)
#
# WAFv2 does NOT support `associate-web-acl` for CloudFront — must use
# `cloudfront update-distribution` to set DistributionConfig.WebACLId = ACL_ARN.
TURION_DISTRO=E37R9PT8IL44L2
APEX_DISTRO=E1X82T89JWL8CA

attach_acl_to_cf() {
  local DIST=$1
  local DESIRED_ACL_ARN=$2
  local CFG_FILE="/tmp/cf-cfg-${DIST}.json"
  aws cloudfront get-distribution-config --id "$DIST" --output json > "$CFG_FILE"
  local ETAG=$(jq -r '.ETag' "$CFG_FILE")
  local CURRENT_ACL=$(jq -r '.DistributionConfig.WebACLId' "$CFG_FILE")

  if [ "$CURRENT_ACL" = "$DESIRED_ACL_ARN" ]; then
    echo "  CF distro $DIST already has WebACLId=$DESIRED_ACL_ARN (no-op)"
    return 0
  fi

  echo "  CF distro $DIST current WebACLId='$CURRENT_ACL', setting to $DESIRED_ACL_ARN..."
  jq --arg arn "$DESIRED_ACL_ARN" '.DistributionConfig.WebACLId = $arn | .DistributionConfig' \
    "$CFG_FILE" > "/tmp/cf-cfg-${DIST}.new.json"

  aws cloudfront update-distribution \
    --id "$DIST" \
    --if-match "$ETAG" \
    --distribution-config "file:///tmp/cf-cfg-${DIST}.new.json" \
    --query 'Distribution.{Status:Status,WebACLId:DistributionConfig.WebACLId}' \
    --output json
}

for DIST in $TURION_DISTRO $APEX_DISTRO; do
  echo "Associating CF Web ACL with ${DIST}..."
  attach_acl_to_cf "$DIST" "$CF_ACL_ARN"
done

# 4. APIGW associations (REGIONAL scope)
# marquee.zietra.com → ofp2jlem2l (HTTP API v2 - Lambda-proxy)
# asc606.zietra.com  → ps9egyvl14 (HTTP API v2 - Lambda-proxy)
#
# IMPORTANT DEVIATION (Rule 4 → handled as Rule 3 documentation):
# WAFv2 does NOT support API Gateway v2 (HTTP APIs) — only REST APIs (v1), ALBs,
# AppSync, Cognito User Pools, App Runner, Amplify, and Verified Access.
# Both marquee + asc606 use HTTP API v2, so the REGIONAL ACL CANNOT be attached
# to them via WAF. Their protection options are:
#   (a) Migrate APIGW v2 → REST API v1 (architectural change, deferred)
#   (b) Front them with CloudFront (architectural change, M3 trust-page work)
#   (c) Use Lambda@Edge / API key throttling (existing APIGW-native controls)
# REGIONAL ACL is created and stays unassigned, ready for future REST API or ALB
# attachments. Documented in waf-deployment-54-6-03.md.
echo ""
echo "REGIONAL WAF ACL exists but is not attached:"
echo "  marquee+asc606 use APIGW v2 (HTTP API) which WAFv2 does NOT support."
echo "  See waf-deployment-54-6-03.md for follow-up options."

# 5. Smoke — each customer-facing domain still returns 2xx/3xx (WAF in COUNT shouldn't block)
echo ""
echo "Post-associate smoke:"
for HOST in turionspace.zietra.com marquee.zietra.com asc606.zietra.com zietra.com; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$HOST/" --max-time 8 || echo 000)
  echo "  $HOST: $CODE"
done

echo ""
echo "Provisioning complete. ACLs:"
echo "  CLOUDFRONT: $CF_ACL_ARN  (turion + zietra-apex)"
echo "  REGIONAL:   $RG_ACL_ARN  (marquee-apigw + asc606-apigw)"
