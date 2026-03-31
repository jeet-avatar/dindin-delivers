#!/bin/bash
set -e

REGION="us-east-1"
CLUSTER="dollor-production"
IMAGE="134607809447.dkr.ecr.us-east-1.amazonaws.com/zietra-meet:latest"
EXEC_ROLE="arn:aws:iam::134607809447:role/DollorECSTaskExecutionRole"
TASK_ROLE="arn:aws:iam::134607809447:role/DollorECSTaskRole"
SUBNETS="subnet-0364e2a6f013a5a00,subnet-0d10e7d90357dbec8"
SG="sg-0f0300df4ba0989fe"

echo "=== Step 1: Register task definition ==="
TASK_ARN=$(aws ecs register-task-definition --region $REGION \
  --family zietra-meet \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 256 --memory 512 \
  --execution-role-arn "$EXEC_ROLE" \
  --task-role-arn "$TASK_ROLE" \
  --container-definitions "[{
    \"name\": \"zietra-meet\",
    \"image\": \"$IMAGE\",
    \"portMappings\": [{\"containerPort\": 3001, \"protocol\": \"tcp\"}],
    \"essential\": true,
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

echo "=== Step 2: Create ECS service ==="
aws ecs create-service --region $REGION \
  --cluster $CLUSTER \
  --service-name zietra-meet-service \
  --task-definition zietra-meet \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}" \
  --query 'service.serviceArn' --output text

echo ""
echo "=== Step 3: Wait for service to stabilize ==="
aws ecs wait services-stable --cluster $CLUSTER --services zietra-meet-service --region $REGION

echo ""
echo "=== Step 4: Get public IP ==="
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER --service-name zietra-meet-service --region $REGION --query 'taskArns[0]' --output text)
ENI=$(aws ecs describe-tasks --cluster $CLUSTER --tasks $TASK_ARN --region $REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)

echo ""
echo "========================================="
echo "Zietra Meet is live at: http://$PUBLIC_IP:3001"
echo "========================================="
echo ""
echo "Share this URL with anyone to join a call."
echo "Next: attach to ALB + CloudFront for HTTPS"
