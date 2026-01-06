# Dollor.ai CI/CD Pipeline - Complete End-to-End Flow

## 🎯 Overview

This document traces the **complete journey** of code from developer commit to running containers in production.

```
Developer → GitHub → Docker Build → ECR → Kubernetes/ECS → Production
```

---

## 📊 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                             │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Git Push to Branch      │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
   [main branch]            [staging branch]          [feature/*]
        │                         │                         │
        │                         │                         │
┌───────┴───────┐         ┌───────┴───────┐         ┌──────┴──────┐
│   PRODUCTION  │         │    STAGING    │         │     CI      │
│   PIPELINE    │         │   PIPELINE    │         │   CHECKS    │
└───────┬───────┘         └───────┬───────┘         └──────┬──────┘
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────────────────────────────────────────────────────────┐
│                     GITHUB ACTIONS WORKFLOWS                       │
├───────────────────────────────────────────────────────────────────┤
│ • deploy-dollar-ai.yml     (Production - main branch)             │
│ • deploy-staging.yml       (Staging - staging/develop)            │
│ • deploy-microservices.yml (Microservices - services/**)          │
│ • ios-ci.yml / android-ci.yml (Mobile apps CI)                    │
└───────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │   DOCKER BUILD    │       │   TESTS & LINT    │
        └───────────────────┘       └───────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │  Amazon ECR (Registry)    │
        │  134607809447.dkr.ecr...  │
        └───────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  EKS (K8s)    │       │  ECS/EC2      │
│  Microservices│       │  Monolith API │
└───────────────┘       └───────────────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   PRODUCTION LIVE     │
        │   api.dollor.ai       │
        └───────────────────────┘
```

---

## 🔄 FLOW 1: Microservices Deployment (EKS/Kubernetes)

### Trigger
```
Developer pushes to main branch
  → services/** files changed
  → GitHub Actions triggers deploy-microservices.yml
```

### Step-by-Step Flow

#### 1️⃣ **Detect Changes** (detect-changes job)

**File**: `.github/workflows/deploy-microservices.yml:33-81`

```bash
# Detects which services changed
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)

for svc in auth-service user-service driver-service ...; do
  if echo "$CHANGED_FILES" | grep -q "services/core/$svc/"; then
    SERVICES="${SERVICES:+$SERVICES,}$svc"
  fi
done

# Output: "auth-service,order-service,payment-service"
```

**Output**:
- Services list: `auth-service,order-service,payment-service`
- Matrix for parallel builds: `["auth-service", "order-service", "payment-service"]`

---

#### 2️⃣ **Build Docker Images** (build-and-push job)

**File**: `.github/workflows/deploy-microservices.yml:83-142`

**Runs in parallel for each service** using GitHub Actions matrix strategy.

**For each service** (e.g., `auth-service`):

```yaml
steps:
  # A. Login to AWS ECR
  - aws ecr describe-repositories --repository-names dollor-auth-service ||
    aws ecr create-repository --repository-name dollor-auth-service

  # B. Build Docker image
  - docker build \
      -f services/core/auth-service/Dockerfile \
      -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-auth-service:abc123 \
      -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-auth-service:latest \
      ./services

  # C. Push to ECR
  - docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-auth-service:abc123
  - docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-auth-service:latest

  # D. Scan for vulnerabilities
  - trivy image 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-auth-service:abc123
```

**Dockerfile Structure** (`services/core/auth-service/Dockerfile`):

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim as builder
WORKDIR /app
RUN apt-get install build-essential libpq-dev
COPY ./core/auth-service/requirements.txt .
RUN pip install --user -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim as production
COPY --from=builder /root/.local /home/appuser/.local
COPY ./shared /app/shared
COPY ./core/auth-service /app/auth-service
USER appuser
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Result**:
- Images pushed to ECR with tags:
  - `dollor-auth-service:abc123` (git SHA)
  - `dollor-auth-service:latest`

---

#### 3️⃣ **Deploy to EKS** (deploy-to-eks job)

**File**: `.github/workflows/deploy-microservices.yml:143-225`

```bash
# A. Configure kubectl
ENVIRONMENT="staging"  # or "production"
EKS_CLUSTER="dollor-${ENVIRONMENT}"
aws eks update-kubeconfig --name ${EKS_CLUSTER}

# B. For each service (e.g., auth-service):
SERVICE="auth-service"
OVERLAY_DIR="infrastructure/kubernetes/services/${SERVICE}/overlays/${ENVIRONMENT}"

# C. Update image tag in Kustomization
cd $OVERLAY_DIR
kustomize edit set image \
  dollor-auth-service=134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-auth-service:abc123

# D. Apply to Kubernetes
kubectl apply -k $OVERLAY_DIR --namespace=dollor-${ENVIRONMENT}

# E. Wait for rollout
kubectl rollout status deployment/auth-service -n dollor-${ENVIRONMENT} --timeout=180s
```

**Kubernetes Manifests**:

**Base Deployment** (`infrastructure/kubernetes/services/auth-service/deployment.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: auth-service
          image: dollor/auth-service:latest  # ← Replaced by Kustomize
          ports:
            - containerPort: 8001
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-service-secrets
                  key: DATABASE_URL
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8001
          readinessProbe:
            httpGet:
              path: /ready
              port: 8001
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  type: ClusterIP
  ports:
    - port: 8001
      targetPort: 8001
  selector:
    app: auth-service
```

**Staging Overlay** (`infrastructure/kubernetes/services/auth-service/overlays/staging/kustomization.yaml`):
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: staging

resources:
  - ../../  # Base deployment

patches:
  - patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: auth-service
      spec:
        replicas: 2  # Staging: 2 replicas

configMapGenerator:
  - name: auth-service-config
    literals:
      - ENVIRONMENT=staging

images:
  - name: dollor/auth-service
    newName: 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-auth-service
    newTag: abc123  # ← Updated by workflow
```

**Result**:
- Kubernetes deployment created/updated
- Pods running in EKS cluster
- Service exposed at `auth-service.staging.svc.cluster.local:8001`

---

#### 4️⃣ **Integration Tests** (integration-tests job)

```bash
# Test API endpoints
curl -sf https://api-staging.dollor.ai/api/auth/health || echo "FAILED"
curl -sf https://api-staging.dollor.ai/api/driver/health || echo "FAILED"
curl -sf https://api-staging.dollor.ai/api/order/health || echo "FAILED"
```

---

## 🔄 FLOW 2: Monolithic Backend Deployment (ECS + EC2)

### Trigger
```
Developer pushes to main branch
  → apps/web/p2p-platform/backend/** changed
  → GitHub Actions triggers deploy-dollar-ai.yml
```

### Step-by-Step Flow

#### 1️⃣ **Build Frontend** (deploy-frontend job)

**File**: `.github/workflows/deploy-dollar-ai.yml`

```bash
# A. Build React frontend
cd apps/web/p2p-platform/frontend
npm ci
npm run build  # Creates dist/

# B. Deploy to S3
aws s3 sync dist/ s3://dollar-ai-frontend/ --delete

# C. Invalidate CloudFront CDN
aws cloudfront create-invalidation \
  --distribution-id E1TL8YTTU1SF3A \
  --paths "/*"
```

**Result**:
- Frontend live at: `https://dollor.ai`

---

#### 2️⃣ **Build Backend Docker Image** (deploy-backend-ecs job)

```bash
# A. Build Docker image
cd apps/web/p2p-platform/backend
docker build \
  -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:abc123 \
  -t 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest \
  .

# B. Push to ECR
docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:abc123
docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest
```

**Backend Dockerfile** (`apps/web/p2p-platform/backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 3000
CMD ["uvicorn", "main_new:app", "--host", "0.0.0.0", "--port", "3000"]
```

---

#### 3️⃣ **Deploy to ECS** (deploy-backend-ecs job)

```bash
# Update ECS service to use new image
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --force-new-deployment

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster dollor-production \
  --services dollor-api-service
```

**ECS Task Definition** (managed by Terraform):
```json
{
  "family": "dollor-api",
  "containerDefinitions": [{
    "name": "dollor-api",
    "image": "134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest",
    "cpu": 256,
    "memory": 512,
    "portMappings": [{
      "containerPort": 3000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "ENVIRONMENT", "value": "production"},
      {"name": "DATABASE_URL", "value": "..."}
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
    }
  }]
}
```

**Result**:
- ECS tasks running on Fargate
- Load balancer routes traffic to tasks
- API live at: `https://api.dollor.ai`

---

#### 4️⃣ **Deploy to EC2** (deploy-backend-ec2 job)

**Parallel deployment** to EC2 for redundancy:

```bash
# A. SSH into EC2 instance
ssh ec2-user@44.192.34.143

# B. Deploy code
rsync -avz apps/web/p2p-platform/backend/ ec2-user@44.192.34.143:/opt/dollor-backend/

# C. Install dependencies
cd /opt/dollor-backend
source venv/bin/activate
pip install -r requirements.txt

# D. Seed database (if needed)
python seed_menu_items.py

# E. Restart service
pm2 restart dollor-backend
```

**Result**:
- Backend running on EC2
- PM2 process manager keeps it alive
- Backup to ECS deployment

---

## 🏗️ Infrastructure (Terraform)

### Infrastructure as Code

**File**: `infrastructure/terraform/main.tf`

```hcl
# VPC & Networking
module "vpc" {
  source = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  cluster_name = "dollor-${var.environment}"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"
  cluster_name = "dollor-${var.environment}"
}

# RDS Database
module "rds" {
  source = "./modules/rds"
  instance_class = "db.t3.medium"
  engine_version = "14.7"
}

# S3 Buckets
module "s3" {
  source = "./modules/s3"
  buckets = ["dollor-ai-frontend", "dollor-ai-uploads"]
}

# CloudFront CDN
module "cloudfront" {
  source = "./modules/cloudfront"
  s3_bucket = module.s3.frontend_bucket
}

# ECR Repositories
resource "aws_ecr_repository" "services" {
  for_each = toset([
    "dollor-api",
    "dollor-auth-service",
    "dollor-user-service",
    "dollor-driver-service",
    "dollor-order-service",
    ...
  ])

  name = each.value
  image_scanning_configuration {
    scan_on_push = true
  }
  encryption_configuration {
    encryption_type = "AES256"
  }
}
```

---

## 📋 Complete Deployment Checklist

### For Microservices (EKS)

```
✅ Code pushed to main branch
✅ GitHub Actions triggered
✅ Changed services detected
✅ Docker images built (multi-stage)
✅ Images scanned for vulnerabilities
✅ Images pushed to ECR
✅ Kustomize overlays updated
✅ kubectl apply executed
✅ Kubernetes deployments updated
✅ Pods rolled out
✅ Health checks passing
✅ Integration tests passed
✅ Services live in cluster
```

### For Monolithic API (ECS/EC2)

```
✅ Code pushed to main branch
✅ Frontend built (Vite/React)
✅ Frontend deployed to S3
✅ CloudFront cache invalidated
✅ Backend Docker image built
✅ Image pushed to ECR
✅ ECS service updated
✅ ECS tasks started
✅ Health checks passing
✅ EC2 deployment synced
✅ PM2 process restarted
✅ API live at api.dollor.ai
```

---

## 🔍 Monitoring & Verification

### Check Deployment Status

```bash
# Kubernetes (EKS)
kubectl get deployments -n staging
kubectl get pods -n staging
kubectl logs -f deployment/auth-service -n staging

# ECS
aws ecs list-tasks --cluster dollor-production
aws ecs describe-tasks --cluster dollor-production --tasks <task-id>
aws logs tail /ecs/dollor-api --follow

# EC2
ssh ec2-user@44.192.34.143
pm2 status
pm2 logs dollor-backend
tail -f /opt/dollor-backend/backend.log
```

### Health Checks

```bash
# Microservices (Kubernetes)
curl https://api.dollor.ai/api/auth/health
curl https://api.dollor.ai/api/driver/health
curl https://api.dollor.ai/api/order/health

# Monolithic API
curl https://api.dollor.ai/health
curl https://api.dollor.ai/docs  # Swagger UI

# Frontend
curl https://dollor.ai
```

---

## 🚨 Rollback Procedures

### Kubernetes Rollback

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/auth-service -n staging

# Rollback to specific revision
kubectl rollout history deployment/auth-service -n staging
kubectl rollout undo deployment/auth-service --to-revision=3 -n staging

# Check rollout status
kubectl rollout status deployment/auth-service -n staging
```

### ECS Rollback

```bash
# Deploy previous task definition
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --task-definition dollor-api:42  # Previous version

# OR force new deployment with :latest tag pointing to old image
docker tag \
  134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:abc123 \
  134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest
docker push 134607809447.dkr.ecr.us-east-1.amazonaws.com/dollor-api:latest

aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --force-new-deployment
```

---

## 🔒 Security

### Image Scanning

All images scanned with **Trivy** before deployment:
```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.ECR_REGISTRY }}/dollor-auth-service:${{ github.sha }}
    format: 'sarif'
    severity: 'CRITICAL,HIGH'
```

### Secrets Management

- **Kubernetes**: Sealed Secrets / AWS Secrets Manager
- **ECS**: AWS Secrets Manager
- **EC2**: Environment variables from SSM Parameter Store

### Network Security

- **EKS**: Private subnets, security groups
- **ECS**: Private subnets, ALB with WAF
- **RDS**: Private subnet, no public access

---

## 📊 Metrics & Observability

### Logging

- **Kubernetes**: FluentBit → CloudWatch Logs
- **ECS**: awslogs driver → CloudWatch Logs
- **EC2**: PM2 logs + custom logging

### Monitoring

- **Kubernetes**: Prometheus + Grafana
- **CloudWatch**: Custom metrics, alarms
- **APM**: OpenTelemetry traces

### Alerts

```yaml
# CloudWatch Alarms
- High CPU usage (> 80%)
- High memory usage (> 80%)
- Failed health checks
- 5xx error rate (> 1%)
- P99 latency (> 500ms)
```

---

## 🎯 Summary: Complete Flow

```
1. Developer commits code
      ↓
2. GitHub Actions detects changes
      ↓
3. Docker images built (multi-stage)
      ↓
4. Images pushed to Amazon ECR
      ↓
5. Vulnerability scanning (Trivy)
      ↓
6. Deploy to Kubernetes/ECS
      ↓
7. Rolling update (zero downtime)
      ↓
8. Health checks verify deployment
      ↓
9. Integration tests run
      ↓
10. Production LIVE ✅
```

---

**Maintained By**: DevOps Team
**Last Updated**: 2026-01-06
**Version**: 3.0
