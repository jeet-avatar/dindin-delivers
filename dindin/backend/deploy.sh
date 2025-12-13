#!/bin/bash
# =============================================================================
# Dollor.ai Production Deployment Script
# =============================================================================
# This script builds for linux/amd64 (required by ECS Fargate) and deploys
# to the dollor-production ECS cluster.
#
# Usage: ./deploy.sh
# =============================================================================

set -e

# Configuration
AWS_ACCOUNT_ID="134607809447"
AWS_REGION="us-east-1"
ECR_REPO="dollor-api"
ECS_CLUSTER="dollor-production"
ECS_SERVICE="dollor-api-service"
PLATFORM="linux/amd64"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

echo "============================================="
echo "  DOLLOR.AI PRODUCTION DEPLOYMENT"
echo "============================================="
echo ""

# Step 1: Login to ECR
echo "[1/4] Logging into AWS ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
echo "     Login successful!"
echo ""

# Step 2: Build for linux/amd64 (required by ECS Fargate)
echo "[2/4] Building Docker image for ${PLATFORM}..."
echo "     (This ensures compatibility with ECS Fargate)"
docker buildx build \
    --platform ${PLATFORM} \
    -t ${ECR_URI}:latest \
    --push \
    .
echo "     Build and push complete!"
echo ""

# Step 3: Trigger ECS deployment
echo "[3/4] Triggering ECS deployment..."
aws ecs update-service \
    --cluster ${ECS_CLUSTER} \
    --service ${ECS_SERVICE} \
    --force-new-deployment \
    --output json > /dev/null
echo "     Deployment triggered!"
echo ""

# Step 4: Monitor deployment
echo "[4/4] Monitoring deployment status..."
echo "     (Waiting for tasks to start...)"
echo ""

for i in {1..20}; do
    STATUS=$(aws ecs describe-services \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --query "services[0].deployments[0].rolloutState" \
        --output text 2>/dev/null)

    RUNNING=$(aws ecs describe-services \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --query "services[0].deployments[0].runningCount" \
        --output text 2>/dev/null)

    DESIRED=$(aws ecs describe-services \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --query "services[0].deployments[0].desiredCount" \
        --output text 2>/dev/null)

    echo "     Check $i: Status=$STATUS, Running=$RUNNING/$DESIRED"

    if [ "$STATUS" = "COMPLETED" ]; then
        echo ""
        echo "============================================="
        echo "  DEPLOYMENT SUCCESSFUL!"
        echo "============================================="
        echo ""
        echo "API is now live at: https://api.dollor.ai"
        echo ""

        # Quick health check
        echo "Running health check..."
        curl -s https://api.dollor.ai/health | head -c 200
        echo ""
        exit 0
    fi

    if [ "$STATUS" = "FAILED" ]; then
        echo ""
        echo "============================================="
        echo "  DEPLOYMENT FAILED!"
        echo "============================================="
        echo ""
        echo "Check the ECS console for more details."
        exit 1
    fi

    sleep 15
done

echo ""
echo "Deployment still in progress. Check status with:"
echo "  aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}"
echo ""
