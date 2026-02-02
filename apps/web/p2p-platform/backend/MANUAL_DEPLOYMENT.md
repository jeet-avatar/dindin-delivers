# Manual Deployment Guide

When GitHub Actions is unavailable (outages, runner issues), use this guide to deploy manually.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed and running
- Access to ECR and ECS

## Quick Deploy Commands

### 1. Login to ECR

```bash
ECR_PASSWORD=$(aws ecr get-login-password --region us-east-1) && \
echo "$ECR_PASSWORD" | docker login --username AWS --password-stdin 134607809447.dkr.ecr.us-east-1.amazonaws.com
```

### 2. Build Docker Image

```bash
cd apps/web/p2p-platform/backend

# Use commit hash or custom tag
IMAGE_TAG=$(git rev-parse --short HEAD)
# Or use timestamp: IMAGE_TAG="deploy-$(date +%Y%m%d%H%M%S)"

docker build --platform linux/amd64 \
  -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:$IMAGE_TAG \
  -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest .
```

### 3. Push to ECR

```bash
docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:$IMAGE_TAG
docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest
```

### 4. Update ECS Task Definition

```bash
# Get current task definition
aws ecs describe-task-definition --task-definition dollor-api --region us-east-1 \
  --query 'taskDefinition' > /tmp/task-def.json

# Clean for re-registration
jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
  /tmp/task-def.json > /tmp/clean-task-def.json

# Update image
NEW_IMAGE="134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:$IMAGE_TAG"
jq --arg IMAGE "$NEW_IMAGE" '.containerDefinitions[0].image = $IMAGE' \
  /tmp/clean-task-def.json > /tmp/new-task-def.json

# Register new task definition
aws ecs register-task-definition --cli-input-json file:///tmp/new-task-def.json --region us-east-1
```

### 5. Deploy to ECS

```bash
# Get latest revision number
REVISION=$(aws ecs describe-task-definition --task-definition dollor-api --region us-east-1 \
  --query 'taskDefinition.revision' --output text)

# Update service
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --task-definition dollor-api:$REVISION \
  --force-new-deployment \
  --region us-east-1
```

### 6. Wait for Deployment

```bash
aws ecs wait services-stable \
  --cluster dollor-production \
  --services dollor-api-service \
  --region us-east-1

echo "Deployment complete!"
```

## One-Liner (Full Deploy)

```bash
cd apps/web/p2p-platform/backend && \
IMAGE_TAG=$(git rev-parse --short HEAD) && \
ECR_PASSWORD=$(aws ecr get-login-password --region us-east-1) && \
echo "$ECR_PASSWORD" | docker login --username AWS --password-stdin 134607809447.dkr.ecr.us-east-1.amazonaws.com && \
docker build --platform linux/amd64 -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:$IMAGE_TAG -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest . && \
docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:$IMAGE_TAG && \
docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest && \
aws ecs describe-task-definition --task-definition dollor-api --region us-east-1 --query 'taskDefinition' > /tmp/task-def.json && \
jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' /tmp/task-def.json > /tmp/clean-task-def.json && \
jq --arg IMAGE "134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:$IMAGE_TAG" '.containerDefinitions[0].image = $IMAGE' /tmp/clean-task-def.json > /tmp/new-task-def.json && \
aws ecs register-task-definition --cli-input-json file:///tmp/new-task-def.json --region us-east-1 && \
REVISION=$(aws ecs describe-task-definition --task-definition dollor-api --region us-east-1 --query 'taskDefinition.revision' --output text) && \
aws ecs update-service --cluster dollor-production --service dollor-api-service --task-definition dollor-api:$REVISION --force-new-deployment --region us-east-1 && \
aws ecs wait services-stable --cluster dollor-production --services dollor-api-service --region us-east-1 && \
echo "✅ Deployed $IMAGE_TAG to production!"
```

## Verify Deployment

```bash
# Check service status
aws ecs describe-services --cluster dollor-production --services dollor-api-service --region us-east-1 \
  --query 'services[0].{status: status, running: runningCount, desired: desiredCount, taskDef: taskDefinition}'

# Health check
curl -s https://api.dollor.ai/health | jq

# Check specific endpoint
curl -s https://api.dollor.ai/api/erp/orders/1/full-tracking | jq '.success'
```

## Rollback

To rollback to a previous version:

```bash
# List recent task definitions
aws ecs list-task-definitions --family-prefix dollor-api --region us-east-1 --sort DESC --max-items 5

# Update to specific revision (e.g., 155)
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --task-definition dollor-api:155 \
  --force-new-deployment \
  --region us-east-1

# Wait for rollback
aws ecs wait services-stable --cluster dollor-production --services dollor-api-service --region us-east-1
```

## Environment Details

| Resource | Value |
|----------|-------|
| AWS Region | us-east-1 |
| ECR Repository | 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api |
| ECS Cluster | dollor-production |
| ECS Service | dollor-api-service |
| Task Definition | dollor-api |
| Production URL | https://api.dollor.ai |

---

*Last Updated: February 2, 2026*
*Created during GitHub Actions outage*
