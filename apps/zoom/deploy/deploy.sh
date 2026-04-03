#!/bin/bash
set -e

REGION="us-east-1"
CLUSTER="dollor-production"
ECR_REPO="134607809447.dkr.ecr.us-east-1.amazonaws.com/zietra-meet"
IMAGE="$ECR_REPO:latest"
EXEC_ROLE="arn:aws:iam::134607809447:role/DollorECSTaskExecutionRole"
TASK_ROLE="arn:aws:iam::134607809447:role/DollorECSTaskRole"
SUBNETS="subnet-0364e2a6f013a5a00,subnet-0d10e7d90357dbec8"
SG="sg-0f0300df4ba0989fe"
# ALB — reuse existing dollor production ALB
ALB_ARN="${ALB_ARN:-}"
CERT_ARN="${CERT_ARN:-}"

echo "=== Step 1: Build & push Docker image ==="
cd "$(dirname "$0")/.."

# Build frontend first
echo "Building frontend..."
cd frontend && npm ci && npx vite build && cd ..

# Build Docker image
echo "Building Docker image..."
docker build --platform linux/amd64 -f deploy/Dockerfile -t zietra-meet .
docker tag zietra-meet "$IMAGE"

echo "Pushing to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ECR_REPO"
docker push "$IMAGE"

echo "=== Step 2: Register task definition ==="
TASK_ARN=$(aws ecs register-task-definition --region $REGION \
  --family zietra-meet \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 512 --memory 1024 \
  --execution-role-arn "$EXEC_ROLE" \
  --task-role-arn "$TASK_ROLE" \
  --container-definitions "[{
    \"name\": \"zietra-meet\",
    \"image\": \"$IMAGE\",
    \"portMappings\": [{\"containerPort\": 3001, \"protocol\": \"tcp\"}],
    \"essential\": true,
    \"healthCheck\": {
      \"command\": [\"CMD-SHELL\", \"curl -f http://localhost:3001/ || exit 1\"],
      \"interval\": 30,
      \"timeout\": 5,
      \"retries\": 3,
      \"startPeriod\": 10
    },
    \"logConfiguration\": {
      \"logDriver\": \"awslogs\",
      \"options\": {
        \"awslogs-group\": \"/ecs/zietra-meet\",
        \"awslogs-region\": \"$REGION\",
        \"awslogs-stream-prefix\": \"ecs\",
        \"awslogs-create-group\": \"true\"
      }
    }
  }]" --query 'taskDefinition.taskDefinitionArn' --output text)

echo "Task definition: $TASK_ARN"

echo "=== Step 3: Create or update ECS service ==="
SERVICE_EXISTS=$(aws ecs describe-services --cluster $CLUSTER --services zietra-meet-service --region $REGION \
  --query 'services[?status==`ACTIVE`].serviceName' --output text 2>/dev/null || true)

if [ -z "$SERVICE_EXISTS" ]; then
  echo "Creating new service..."
  aws ecs create-service --region $REGION \
    --cluster $CLUSTER \
    --service-name zietra-meet-service \
    --task-definition zietra-meet \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}" \
    --query 'service.serviceArn' --output text
else
  echo "Updating existing service..."
  aws ecs update-service --region $REGION \
    --cluster $CLUSTER \
    --service zietra-meet-service \
    --task-definition zietra-meet \
    --force-new-deployment \
    --query 'service.serviceArn' --output text
fi

echo ""
echo "=== Step 4: Wait for service to stabilize ==="
aws ecs wait services-stable --cluster $CLUSTER --services zietra-meet-service --region $REGION

echo ""
echo "=== Step 5: Get public IP ==="
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER --service-name zietra-meet-service --region $REGION --query 'taskArns[0]' --output text)
ENI=$(aws ecs describe-tasks --cluster $CLUSTER --tasks $TASK_ARN --region $REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)

echo ""
echo "========================================="
echo "Zietra Meet is live at: http://$PUBLIC_IP:3001"
echo "========================================="
echo ""
echo "Features:"
echo "  - Multi-participant rooms (up to 8)"
echo "  - Room passwords"
echo "  - In-call chat"
echo "  - Screen sharing + annotations"
echo "  - Call recording (client-side)"
echo "  - Mobile responsive"
echo ""
echo "Next steps for HTTPS:"
echo "  1. Create ALB target group for port 3001"
echo "  2. Add ALB listener rule for meet.zietra.com"
echo "  3. Point DNS to ALB"
echo "  4. WebSocket upgrade handled by ALB stickiness"
