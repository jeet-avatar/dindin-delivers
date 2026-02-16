#!/bin/bash
# Deploy Notification Service to ECS
# ==================================
# Run this script when Docker is available

set -e

AWS_REGION="us-east-1"
ECR_REGISTRY="134607809447.dkr.ecr.us-east-1.amazonaws.com"
ECR_REPO="dollor-notification-service"
ECS_CLUSTER="dollor-production"
ECS_SERVICE="dollor-notification-service"
IMAGE_TAG="${1:-latest}"

echo "=========================================="
echo "Deploying Notification Service to ECS"
echo "=========================================="

# Step 1: Login to ECR
echo "[1/5] Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Step 2: Build Docker image
echo "[2/5] Building Docker image..."
cd "$(dirname "$0")/../services"
docker build -t $ECR_REPO:$IMAGE_TAG -f core/notification-service/Dockerfile .

# Step 3: Tag and push to ECR
echo "[3/5] Pushing to ECR..."
docker tag $ECR_REPO:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
docker tag $ECR_REPO:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPO:latest
docker push $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG
docker push $ECR_REGISTRY/$ECR_REPO:latest

# Step 4: Register task definition
echo "[4/5] Registering task definition..."
TASK_DEF_FILE="../infrastructure/ecs/notification-service-task-definition.json"
TASK_DEF=$(cat $TASK_DEF_FILE | sed "s|IMAGE_PLACEHOLDER|$ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG|g")
echo "$TASK_DEF" > /tmp/notification-task-def.json
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json file:///tmp/notification-task-def.json \
    --region $AWS_REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)
echo "Task definition: $TASK_DEF_ARN"

# Step 5: Create or update ECS service
echo "[5/5] Deploying to ECS..."
SERVICE_EXISTS=$(aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION --query 'services[0].status' --output text 2>/dev/null || echo "MISSING")

if [ "$SERVICE_EXISTS" == "ACTIVE" ]; then
    echo "Updating existing service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_SERVICE \
        --task-definition $TASK_DEF_ARN \
        --region $AWS_REGION \
        --desired-count 1
else
    echo "Creating new service..."
    aws ecs create-service \
        --cluster $ECS_CLUSTER \
        --service-name $ECS_SERVICE \
        --task-definition $TASK_DEF_ARN \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-0364e2a6f013a5a00,subnet-0d10e7d90357dbec8],securityGroups=[sg-0f0300df4ba0989fe],assignPublicIp=DISABLED}" \
        --region $AWS_REGION
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Service: $ECS_SERVICE"
echo "Cluster: $ECS_CLUSTER"
echo "Image: $ECR_REGISTRY/$ECR_REPO:$IMAGE_TAG"
echo ""
echo "Check status:"
echo "  aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION"
