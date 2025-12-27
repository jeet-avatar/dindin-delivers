# DEPLOYMENT & INFRASTRUCTURE

> AWS staging infrastructure, CI/CD pipelines, and security scanning configuration.

---

## ENVIRONMENT PIPELINE

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│     DEV     │─────►│   STAGING   │─────►│ PRODUCTION  │
│  (feature)  │      │  (testing)  │      │   (live)    │
└─────────────┘      └─────────────┘      └─────────────┘
     │                     │                     │
     ▼                     ▼                     ▼
  Auto-deploy         Manual gate           Manual gate
  on PR merge        + QA approval        + Exec approval
```

### Golden Rule: NEVER TOUCH PRODUCTION DIRECTLY

| Environment | Purpose | Deployment | Database |
|-------------|---------|------------|----------|
| **Development** | Feature work, testing | Auto on PR merge | Dev DB |
| **Staging** | QA, integration testing | Manual approval | Staging DB (prod clone) |
| **Production** | Live users | Manual + exec approval | Production DB |

---

## DEPLOYMENT COMMANDS

### Development
```bash
# Deploy to dev (auto on PR merge, or manual)
kubectl apply -k infrastructure/argocd/apps/dev/

# Check dev status
argocd app get dollor-dev
```

### Staging
```bash
# Deploy to staging (requires approval)
kubectl apply -k infrastructure/argocd/apps/staging/

# Verify staging
argocd app sync dollor-staging
argocd app get dollor-staging
```

### Production
```bash
# Deploy to production (requires exec approval)
kubectl apply -k infrastructure/argocd/apps/production/

# Canary deployment (10% → 30% → 50% → 80% → 100%)
kubectl argo rollouts set weight dollor-api 10 -n production
# ... monitor metrics ...
kubectl argo rollouts promote dollor-api -n production
```

---

## AWS STAGING INFRASTRUCTURE

> **Status**: Terraform applied, infrastructure ready for EKS deployment

### Staging Environment Resources

| Component | Details |
|-----------|---------|
| **Region** | us-east-1 |
| **EKS Cluster** | dollor-staging, version 1.28, 2-5 nodes (auto-scaling) |
| **VPC** | vpc-06b31cf4c5205c340, CIDR 10.1.0.0/16 |
| **Subnets** | 3 public + 3 private (Multi-AZ) |
| **NAT Gateway** | Enabled |
| **ECR Registry** | 134607809447.dkr.ecr.us-east-1.amazonaws.com |
| **RDS** | db.t3.medium, 20GB, PostgreSQL, encrypted |

### Microservices in ECR

| Service | Port | Build | EKS |
|---------|------|-------|-----|
| auth-service | 8001 | ✓ | ✓ Deployed |
| user-service | 8002 | ✓ | ✓ Deployed |
| driver-service | 8003 | ✓ | ✓ Deployed |
| restaurant-service | 8004 | ✓ | Pending |
| order-service | 8005 | ✓ | ✓ Deployed |
| payment-service | 8006 | ✓ | Pending |
| location-service | 8007 | ✓ | Pending |
| menu-service | 8008 | ✓ | Pending |
| notification-service | 8009 | ✓ | ✓ Deployed |
| rating-service | 8013 | ✓ | Pending |
| ride-service | 8014 | ✓ | ✓ Deployed |
| pricing-service | 8015 | ✓ | Pending |
| analytics-service | 8016 | ✓ | Pending |
| negotiation-service | 8017 | ✓ | Pending |
| chat-service | 8018 | ✓ | Pending |
| call-service | 8019 | ✓ | Pending |

### Staging Database

```
Host: dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com
Port: 5432
Database: dollor_staging
User: dollor_admin
Tables: customers, drivers
```

### Connect to Staging EKS

```bash
# Update kubeconfig
aws eks update-kubeconfig --name dollor-staging --region us-east-1

# Verify connection
kubectl get nodes

# Check services
kubectl get pods -n dollor-staging
kubectl get services -n dollor-staging
```

### Terraform Commands

```bash
cd infrastructure/terraform/environments/staging

terraform show      # View current state
terraform plan      # Plan changes
terraform apply     # Apply (requires approval)
```

---

## CI/CD PIPELINE STATUS

```
GitHub Actions Workflows:
├── deploy-microservices.yml  ─── All 16 services building ✓
├── sonarcloud.yml           ─── Code quality passing ✓
└── security-scan.yml        ─── Security scans passing ✓

Build Pipeline:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Push   │───►│  Build  │───►│  Scan   │───►│ Deploy  │
│  Code   │    │ Docker  │    │ Trivy   │    │  EKS    │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Microservices CI/CD

**Workflow**: `.github/workflows/deploy-microservices.yml`

| Trigger | Action |
|---------|--------|
| Push to `main` or `feature/microservices` | Auto-detect changed services, build & deploy |
| Manual workflow_dispatch | Select environment (dev/staging/production) |

**Pipeline Steps**:
1. **Detect Changes** - Identifies which services have code changes
2. **Build & Push** - Matrix builds Docker images, pushes to ECR
3. **Security Scan** - Trivy container vulnerability scan
4. **Deploy to EKS** - Kustomize applies overlays for target environment
5. **Integration Tests** - Health checks on staging/dev environments

```bash
# Trigger manual deployment
gh workflow run deploy-microservices.yml -f environment=staging -f services=all

# View deployment status
gh run list --workflow=deploy-microservices.yml

# Deploy specific services only
gh workflow run deploy-microservices.yml -f environment=dev -f services=auth-service,driver-service
```

---

## SECURITY SCANNING

> **CRITICAL**: All code must pass Semgrep and SonarQube scans from STAGING onwards.
> Production deployments require zero critical/high severity findings.

### Security Gates by Environment

| Stage | Scans | Blocking |
|-------|-------|----------|
| DEV | Basic linting, unit tests | Auto-deploy |
| STAGING | Semgrep + SonarQube + Trivy | Critical/High |
| QA | Manual testing + security review | Approval required |
| PROD | Zero critical findings | Exec approval |

### Security Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| **Semgrep** | SAST - Static code analysis | Critical/High |
| **SonarQube** | Code quality + security | Critical/High |
| **Trivy** | Container vulnerability scan | Critical |
| **OWASP ZAP** | DAST - Dynamic testing | Critical |
| **Bandit** | Python security linter | High |
| **ESLint Security** | JS/TS security rules | High |
| **tfsec** | Terraform security | Critical |

### SonarQube Quality Gates

| Metric | Requirement | Blocking |
|--------|-------------|----------|
| Security Rating | A (no vulnerabilities) | Yes |
| Reliability Rating | B or better | Yes |
| Code Coverage | ≥70% for new code | Yes (Staging+) |
| Security Hotspots | All reviewed | Yes (Prod) |

### Run Security Scans Locally

```bash
# Semgrep
pip install semgrep
semgrep scan --config p/owasp-top-ten --config p/python --sarif --output semgrep.sarif .

# Bandit (Python)
pip install bandit
bandit -r services/ -ll

# Trivy (Containers)
trivy fs --severity CRITICAL,HIGH .

# SonarQube (requires server)
sonar-scanner -Dsonar.projectKey=dollor-ai
```

### Semgrep Configuration

File: `.semgrep.yml`

```yaml
rules:
  - id: dollor-no-hardcoded-secrets
    patterns:
      - pattern-regex: (api_key|secret|password|token)\s*=\s*['"][^'"]+['"]
    message: "Hardcoded secret detected"
    severity: ERROR

  - id: dollor-sql-injection
    patterns:
      - pattern: f"SELECT ... {$VAR} ..."
    message: "Potential SQL injection"
    severity: ERROR

  - id: dollor-no-eval
    pattern: eval(...)
    message: "eval() is dangerous"
    severity: ERROR

  - id: dollor-stripe-key-exposure
    pattern-regex: sk_(live|test)_[a-zA-Z0-9]+
    message: "Stripe secret key exposed"
    severity: ERROR
```

---

## API GATEWAY CONFIGURATION

**Location:** `infrastructure/kubernetes/api-gateway/`

### Routing Rules

```nginx
/api/auth/*        → auth-service:8001
/api/rides/*       → ride-service:8014
/api/restaurants/* → restaurant-service:8004
/api/orders/*      → order-service:8005
/api/payments/*    → payment-service:8006
/api/locations/*   → location-service:8007
/ws/*              → p2p-backend:8080 (WebSocket)
/api/erp/*         → p2p-backend:8080 (with proxy)
```

### Rate Limiting

- API endpoints: 100 req/s per IP
- Auth endpoints: 10 req/s per IP (brute force protection)

---

## GIT WORKTREE - HOTFIX WORKFLOW

### Repository Structure

```
/Users/jeet/StudioProjects/
├── eatfair-ios/              # Main development (branch: main)
│   └── scripts/hotfix.sh     # Hotfix helper script
└── eatfair-ios-hotfix/       # Hotfix worktree (branch: hotfix/base)
```

### Hotfix Commands

```bash
./scripts/hotfix.sh status              # Show worktree status
./scripts/hotfix.sh create payment-crash # Create new hotfix
./scripts/hotfix.sh finish payment-crash # Create PR
./scripts/hotfix.sh sync                 # Sync after merge
./scripts/hotfix.sh list                 # List active hotfixes
```

### When to Use Hotfix Worktree

| Scenario | Use Hotfix? |
|----------|-------------|
| Production is down | ✅ Yes |
| Critical security vulnerability | ✅ Yes |
| Payment processing broken | ✅ Yes |
| Minor bug (can wait) | ❌ No |
| New feature | ❌ No |

---

*Last Updated: December 26, 2025*
