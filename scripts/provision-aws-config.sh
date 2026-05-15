#!/usr/bin/env bash
# Phase 54.6-03 Task 3b — Enable AWS Config + targeted resource recording +
# RDS Operational Best Practices conformance pack.
#
# Uses the AWS-managed service-linked role AWSServiceRoleForConfig (auto-created
# when Config service is enabled — sandbox blocks `aws iam` so we use the SLR
# ARN directly).
#
# Idempotent: re-running this script is a no-op once everything is in place.

set -euo pipefail
REGION=us-east-1
ACCOUNT_ID=134607809447
SLR_ARN="arn:aws:iam::${ACCOUNT_ID}:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig"
BUCKET_PREFIX=zietra-aws-config-

# 1. S3 bucket — get-or-create
BUCKET=$(aws s3api list-buckets --query "Buckets[?starts_with(Name,'${BUCKET_PREFIX}')].Name | [0]" --output text 2>/dev/null || echo "")
if [ -z "$BUCKET" ] || [ "$BUCKET" = "None" ]; then
  BUCKET="${BUCKET_PREFIX}$(date +%s)"
  echo "Creating S3 bucket ${BUCKET}..."
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"

  # Encryption (AES256)
  aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

  # Lifecycle: expire after 1 year
  aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-config-snapshots-after-1y",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Expiration": {"Days": 365},
      "NoncurrentVersionExpiration": {"NoncurrentDays": 30}
    }]
  }'

  # Block public access
  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

  # Bucket policy granting Config service write access
  cat > /tmp/config-bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AWSConfigBucketPermissionsCheck",
      "Effect": "Allow",
      "Principal": {"Service": "config.amazonaws.com"},
      "Action": "s3:GetBucketAcl",
      "Resource": "arn:aws:s3:::${BUCKET}",
      "Condition": {"StringEquals": {"AWS:SourceAccount": "${ACCOUNT_ID}"}}
    },
    {
      "Sid": "AWSConfigBucketExistenceCheck",
      "Effect": "Allow",
      "Principal": {"Service": "config.amazonaws.com"},
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::${BUCKET}",
      "Condition": {"StringEquals": {"AWS:SourceAccount": "${ACCOUNT_ID}"}}
    },
    {
      "Sid": "AWSConfigBucketDelivery",
      "Effect": "Allow",
      "Principal": {"Service": "config.amazonaws.com"},
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${BUCKET}/AWSLogs/${ACCOUNT_ID}/Config/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "bucket-owner-full-control",
          "AWS:SourceAccount": "${ACCOUNT_ID}"
        }
      }
    }
  ]
}
EOF
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/config-bucket-policy.json
else
  echo "Reusing existing S3 bucket ${BUCKET}"
fi

# 2. Configuration recorder — targeted resource subset
# Note: when allSupported=false, includeGlobalResourceTypes MUST also be false
# (else InvalidRecordingGroupException). Global types like IAM are included by
# adding their resource types explicitly to the list.
aws configservice put-configuration-recorder --configuration-recorder "{
  \"name\": \"default\",
  \"roleARN\": \"${SLR_ARN}\",
  \"recordingGroup\": {
    \"allSupported\": false,
    \"includeGlobalResourceTypes\": false,
    \"resourceTypes\": [
      \"AWS::Lambda::Function\",
      \"AWS::RDS::DBCluster\",
      \"AWS::RDS::DBInstance\",
      \"AWS::RDS::DBProxy\",
      \"AWS::S3::Bucket\",
      \"AWS::IAM::Role\",
      \"AWS::IAM::Policy\",
      \"AWS::IAM::User\",
      \"AWS::EC2::SecurityGroup\",
      \"AWS::EC2::VPC\",
      \"AWS::EC2::Subnet\",
      \"AWS::EC2::NatGateway\",
      \"AWS::EC2::InternetGateway\",
      \"AWS::CloudFront::Distribution\",
      \"AWS::WAFv2::WebACL\",
      \"AWS::KMS::Key\",
      \"AWS::Cognito::UserPool\",
      \"AWS::SecretsManager::Secret\"
    ]
  }
}" --region "$REGION"

# 3. Delivery channel — write snapshots to S3 every 6 hours
aws configservice put-delivery-channel --delivery-channel "{
  \"name\": \"default\",
  \"s3BucketName\": \"${BUCKET}\",
  \"configSnapshotDeliveryProperties\": {\"deliveryFrequency\": \"Six_Hours\"}
}" --region "$REGION"

# 4. Start recorder (idempotent — start on already-recording is no-op)
aws configservice start-configuration-recorder --configuration-recorder-name default --region "$REGION"

# 5. RDS conformance pack
# AWS publishes its conformance packs at github.com/awslabs/aws-config-rules.
# The packaged file `Security-Best-Practices-for-RDS.yaml` is internally titled
# "Operational Best Practices for RDS" — same content.
PACK_NAME=OperationalBestPracticesForAmazonRDS
PACK_FILE=/tmp/conformance-packs/operational-best-practices-for-rds.yaml
if ! aws configservice describe-conformance-packs --region "$REGION" \
    --query "ConformancePackDetails[?ConformancePackName=='${PACK_NAME}']" --output text | grep -q .; then
  echo "Deploying conformance pack ${PACK_NAME}..."
  mkdir -p /tmp/conformance-packs
  curl -fsSL -o "$PACK_FILE" \
    "https://raw.githubusercontent.com/awslabs/aws-config-rules/master/aws-config-conformance-packs/Security-Best-Practices-for-RDS.yaml"
  aws s3 cp "$PACK_FILE" "s3://${BUCKET}/conformance-packs/operational-best-practices-for-rds.yaml"
  aws configservice put-conformance-pack \
    --conformance-pack-name "$PACK_NAME" \
    --template-s3-uri "s3://${BUCKET}/conformance-packs/operational-best-practices-for-rds.yaml" \
    --delivery-s3-bucket "$BUCKET" \
    --region "$REGION"
else
  echo "Conformance pack ${PACK_NAME} already deployed."
fi

echo ""
echo "AWS Config + RDS conformance pack provisioned."
echo "  S3 bucket: ${BUCKET}"
echo "  Recorder: default (18 targeted resource types)"
echo "  Delivery: every 6 hours"
echo "  Conformance pack: ${PACK_NAME}"
