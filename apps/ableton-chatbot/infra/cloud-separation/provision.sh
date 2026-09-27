#!/bin/bash
# BeatMind Cloud HQ separation: S3 upload bucket and an AWS Batch GPU queue that scales to zero.
# Idempotent: re-running updates policies and registers a new job definition revision.
# Usage: IMAGE=<ecr image uri> ./provision.sh
set -euo pipefail
: "${IMAGE:?Set IMAGE to the GPU separation image URI}"
REGION=us-east-1
ACCOUNT=134607809447
VPC=vpc-0c87f730a3208b3f6
SUBNETS=subnet-0364e2a6f013a5a00,subnet-0d10e7d90357dbec8   # Private subnets used by beatmind-api (NAT egress).
BUCKET=beatmind-cloud-separation-$ACCOUNT
API_ROLE=BeatMindProductionTaskRole
NAME=beatmind-cloud-separation
MAX_VCPUS=16   # At most four GPU instances; nothing runs when the queue is empty.
aws() { command aws --region "$REGION" "$@"; }
exists() { "$@" >/dev/null 2>&1; }

# --- Upload bucket: private, encrypted, TLS only, everything expires after a day. ---
exists aws s3api head-bucket --bucket "$BUCKET" || aws s3api create-bucket --bucket "$BUCKET" >/dev/null
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration \
  '{"Rules":[{"ID":"expire-everything","Status":"Enabled","Filter":{},"Expiration":{"Days":1},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}]}'
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration \
  '{"CORSRules":[{"AllowedOrigins":["https://www.beatmind.io","https://beatmind.io"],"AllowedMethods":["POST"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]}'
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"TlsOnly\",\"Effect\":\"Deny\",\"Principal\":\"*\",\"Action\":\"s3:*\",\"Resource\":[\"arn:aws:s3:::$BUCKET\",\"arn:aws:s3:::$BUCKET/*\"],\"Condition\":{\"Bool\":{\"aws:SecureTransport\":\"false\"}}}]}"

# --- Roles. ---
if ! exists aws iam get-role --role-name BeatMindBatchInstanceRole; then
  aws iam create-role --role-name BeatMindBatchInstanceRole --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name BeatMindBatchInstanceRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role
fi
if ! exists aws iam get-instance-profile --instance-profile-name BeatMindBatchInstanceRole; then
  aws iam create-instance-profile --instance-profile-name BeatMindBatchInstanceRole >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name BeatMindBatchInstanceRole --role-name BeatMindBatchInstanceRole
  sleep 10  # Instance profiles propagate before Batch can use them.
fi
exists aws iam get-role --role-name BeatMindSeparationJobRole || aws iam create-role --role-name BeatMindSeparationJobRole \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
aws iam put-role-policy --role-name BeatMindSeparationJobRole --policy-name BeatMindSeparationObjects --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::$BUCKET/*\"}]}"
aws iam put-role-policy --role-name "$API_ROLE" --policy-name BeatMindCloudSeparation --policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[
  {\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\"],\"Resource\":\"arn:aws:s3:::$BUCKET/*\"},
  {\"Effect\":\"Allow\",\"Action\":\"s3:ListBucket\",\"Resource\":\"arn:aws:s3:::$BUCKET\"},
  {\"Effect\":\"Allow\",\"Action\":\"batch:SubmitJob\",\"Resource\":[\"arn:aws:batch:$REGION:$ACCOUNT:job-queue/$NAME\",\"arn:aws:batch:$REGION:$ACCOUNT:job-definition/$NAME\",\"arn:aws:batch:$REGION:$ACCOUNT:job-definition/$NAME:*\"]},
  {\"Effect\":\"Allow\",\"Action\":[\"batch:DescribeJobs\",\"batch:TerminateJob\"],\"Resource\":\"*\"}]}"

# --- Network: GPU instances only need outbound access (ECR, S3, Batch). ---
SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=beatmind-batch-gpu Name=vpc-id,Values=$VPC --query 'SecurityGroups[0].GroupId' --output text)
if [[ "$SG" == "None" ]]; then
  SG=$(aws ec2 create-security-group --group-name beatmind-batch-gpu --description "BeatMind Batch GPU jobs, egress only" --vpc-id $VPC --query GroupId --output text)
fi

# --- Launch template: room for the ~10 GB GPU image. ---
if ! exists aws ec2 describe-launch-templates --launch-template-names $NAME; then
  aws ec2 create-launch-template --launch-template-name $NAME --launch-template-data \
    '{"BlockDeviceMappings":[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":100,"VolumeType":"gp3","Encrypted":true,"DeleteOnTermination":true}}],"MetadataOptions":{"HttpTokens":"required"}}' >/dev/null
fi

# --- Batch: compute environment that scales to zero, queue and job definition. ---
if [[ "$(aws batch describe-compute-environments --compute-environments $NAME --query 'length(computeEnvironments)')" == "0" ]]; then
  aws batch create-compute-environment --compute-environment-name $NAME --type MANAGED --state ENABLED --compute-resources \
    "{\"type\":\"EC2\",\"allocationStrategy\":\"BEST_FIT_PROGRESSIVE\",\"minvCpus\":0,\"desiredvCpus\":0,\"maxvCpus\":$MAX_VCPUS,
      \"instanceTypes\":[\"g4dn.xlarge\",\"g5.xlarge\"],\"subnets\":[\"${SUBNETS/,/\",\"}\"],\"securityGroupIds\":[\"$SG\"],
      \"instanceRole\":\"arn:aws:iam::$ACCOUNT:instance-profile/BeatMindBatchInstanceRole\",
      \"launchTemplate\":{\"launchTemplateName\":\"$NAME\",\"version\":\"\$Latest\"},
      \"ec2Configuration\":[{\"imageType\":\"ECS_AL2_NVIDIA\"}],\"tags\":{\"app\":\"beatmind\"}}" >/dev/null
  until [[ "$(aws batch describe-compute-environments --compute-environments $NAME --query 'computeEnvironments[0].status' --output text)" == "VALID" ]]; do sleep 5; done
fi
if [[ "$(aws batch describe-job-queues --job-queues $NAME --query 'length(jobQueues)')" == "0" ]]; then
  aws batch create-job-queue --job-queue-name $NAME --state ENABLED --priority 1 \
    --compute-environment-order order=1,computeEnvironment=$NAME >/dev/null
fi
exists aws logs create-log-group --log-group-name /aws/batch/$NAME || true
aws logs put-retention-policy --log-group-name /aws/batch/$NAME --retention-in-days 14
aws batch register-job-definition --job-definition-name $NAME --type container --timeout attemptDurationSeconds=3600 \
  --retry-strategy attempts=2 --container-properties "{\"image\":\"$IMAGE\",
    \"resourceRequirements\":[{\"type\":\"VCPU\",\"value\":\"4\"},{\"type\":\"MEMORY\",\"value\":\"14000\"},{\"type\":\"GPU\",\"value\":\"1\"}],
    \"jobRoleArn\":\"arn:aws:iam::$ACCOUNT:role/BeatMindSeparationJobRole\",
    \"logConfiguration\":{\"logDriver\":\"awslogs\",\"options\":{\"awslogs-group\":\"/aws/batch/$NAME\",\"awslogs-stream-prefix\":\"job\"}}}" \
  --query '[jobDefinitionName,revision]' --output text

echo "API environment: BEATMIND_CLOUD_BUCKET=$BUCKET BEATMIND_CLOUD_JOB_QUEUE=$NAME BEATMIND_CLOUD_JOB_DEFINITION=$NAME"
