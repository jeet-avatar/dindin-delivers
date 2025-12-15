# EatFair/Dollor Enterprise GitOps Architecture

## Overview

Enterprise-grade CI/CD pipeline with **security scanning**, **code quality**, **GitOps deployment**, and **progressive delivery**.

```
+==================================================================================+
|                        EATFAIR ENTERPRISE ARCHITECTURE                           |
+==================================================================================+
|                                                                                  |
|  SECURITY & QUALITY TOOLS                                                        |
|  +-------------+    +-------------+    +-------------+    +----------------+     |
|  |  Semgrep    |    | SonarCloud  |    |   Trivy     |    | Argo Rollouts  |     |
|  |  (SAST)     |    | (Quality)   |    | (Container) |    | (Canary/B-G)   |     |
|  +-------------+    +-------------+    +-------------+    +----------------+     |
|                                                                                  |
|  PIPELINE FLOW                                                                   |
|  ============                                                                    |
|                                                                                  |
|  PR Created                                                                      |
|      |                                                                           |
|      v                                                                           |
|  +-----------------------------------------------------------------------+       |
|  | CI CHECKS (Must all pass)                                             |       |
|  |-----------------------------------------------------------------------|       |
|  | 1. Lint (ruff/ESLint)                                                 |       |
|  | 2. Semgrep SAST (OWASP rules) ---> SARIF upload to GitHub Security    |       |
|  | 3. Tests + Coverage (pytest --cov)                                    |       |
|  | 4. SonarCloud Analysis ---> PR comments + Quality Gate                |       |
|  | 5. Quality Gate (MUST PASS to merge)                                  |       |
|  | 6. Docker Build + Trivy Scan ---> SARIF upload                        |       |
|  +-----------------------------------------------------------------------+       |
|      |                                                                           |
|      v                                                                           |
|  PR Approved + Merged to develop                                                 |
|      |                                                                           |
|      v                                                                           |
|  Build Docker Image --> Push to ECR (with SHA tag)                               |
|      |                                                                           |
|      v                                                                           |
|  ArgoCD detects change --> Deploys to STAGING (EKS)                              |
|      |                                                                           |
|      v                                                                           |
|  +-----------------------------------------------------------------------+       |
|  | ARGO ROLLOUTS: CANARY DEPLOYMENT                                      |       |
|  |-----------------------------------------------------------------------|       |
|  | Step 1: 10% traffic --> Prometheus analysis (5 min)                   |       |
|  | Step 2: 25% traffic --> Prometheus analysis (5 min)                   |       |
|  | Step 3: 50% traffic --> Manual pause (optional)                       |       |
|  | Step 4: 100% traffic --> Deployment complete                          |       |
|  |                                                                        |       |
|  | On failure: Automatic rollback to previous version                    |       |
|  +-----------------------------------------------------------------------+       |
|      |                                                                           |
|      v                                                                           |
|  PR to main --> Requires 2 approvers --> Production deployment                   |
|      |                                                                           |
|      v                                                                           |
|  +-----------------------------------------------------------------------+       |
|  | ARGO ROLLOUTS: BLUE-GREEN DEPLOYMENT                                  |       |
|  |-----------------------------------------------------------------------|       |
|  | 1. Deploy new version (Green)                                         |       |
|  | 2. Run smoke tests against Green                                      |       |
|  | 3. Switch traffic from Blue to Green                                  |       |
|  | 4. Keep Blue for instant rollback (30 min)                            |       |
|  | 5. Scale down Blue after validation                                   |       |
|  +-----------------------------------------------------------------------+       |
|                                                                                  |
+==================================================================================+
```

---

## Security & Quality Tools

| Tool          | Purpose                              | Integration                   |
|---------------|--------------------------------------|-------------------------------|
| **Semgrep**   | SAST - Find security vulnerabilities | GitHub Actions + SARIF upload |
| **SonarCloud**| Code quality, coverage, duplication  | GitHub Actions + PR comments  |
| **Trivy**     | Container vulnerability scanning     | GitHub Actions + SARIF upload |
| **ArgoCD**    | GitOps deployment                    | EKS cluster                   |
| **Argo Rollouts** | Canary/Blue-Green deployments   | Kubernetes CRD                |

---

## Repository Structure

```
eatfair-ios/
├── .github/
│   └── workflows/
│       ├── ci-security.yml        # Semgrep + SonarCloud + Tests
│       ├── ci-build.yml           # Docker build + Trivy + Push ECR
│       ├── promote-staging.yml    # Promote to staging
│       ├── promote-production.yml # Promote to production (requires approval)
│       └── ios-ci.yml             # iOS app builds
│
├── apps/
│   ├── ios/                       # iOS apps
│   └── web/
│       └── p2p-platform/
│           ├── frontend/          # React frontend
│           └── backend/           # Python FastAPI backend
│
├── infrastructure/
│   ├── argocd/
│   │   ├── apps/
│   │   │   ├── dev/
│   │   │   │   ├── backend.yaml
│   │   │   │   └── frontend.yaml
│   │   │   ├── staging/
│   │   │   │   ├── backend.yaml
│   │   │   │   └── frontend.yaml
│   │   │   └── production/
│   │   │       ├── backend.yaml
│   │   │       └── frontend.yaml
│   │   ├── app-of-apps.yaml       # Root ArgoCD application
│   │   └── projects.yaml          # ArgoCD projects
│   │
│   ├── helm/
│   │   ├── backend/
│   │   │   ├── Chart.yaml
│   │   │   ├── values.yaml        # Default values
│   │   │   ├── values-dev.yaml
│   │   │   ├── values-staging.yaml
│   │   │   ├── values-production.yaml
│   │   │   └── templates/
│   │   │       ├── rollout.yaml   # Argo Rollouts (not Deployment)
│   │   │       ├── service.yaml
│   │   │       ├── service-preview.yaml
│   │   │       ├── ingress.yaml
│   │   │       ├── configmap.yaml
│   │   │       ├── hpa.yaml
│   │   │       └── analysistemplate.yaml
│   │   │
│   │   └── frontend/
│   │       └── ... (similar structure)
│   │
│   └── kubernetes/
│       ├── namespaces/
│       │   ├── dev.yaml
│       │   ├── staging.yaml
│       │   └── production.yaml
│       └── argo-rollouts/
│           └── install.yaml
│
├── sonar-project.properties       # SonarCloud configuration
└── .semgrep.yml                   # Semgrep rules
```

---

## Environment Configuration

| Environment | Branch    | Sync Policy      | Rollout Strategy | Replicas | URL                    |
|-------------|-----------|------------------|------------------|----------|------------------------|
| Dev         | develop   | Auto             | RollingUpdate    | 1        | dev-api.dollor.ai      |
| Staging     | develop   | Auto             | Canary           | 2        | staging-api.dollor.ai  |
| Production  | main      | Manual + Approval| Blue-Green       | 3+       | api.dollor.ai          |

---

## Quality Gates

### SonarCloud Quality Gate (Must Pass)

| Metric                  | Threshold    |
|------------------------|--------------|
| Coverage               | > 80%        |
| Duplicated Lines       | < 3%         |
| Maintainability Rating | A            |
| Reliability Rating     | A            |
| Security Rating        | A            |
| Security Hotspots      | Reviewed     |
| New Code Coverage      | > 80%        |

### Semgrep Rules (OWASP)

- SQL Injection
- XSS (Cross-Site Scripting)
- Command Injection
- Path Traversal
- Insecure Deserialization
- SSRF (Server-Side Request Forgery)
- Hardcoded Secrets
- Weak Cryptography

---

## Canary Analysis (Staging)

```yaml
# Prometheus metrics analyzed during canary
Metrics:
  - request_success_rate > 99%
  - request_latency_p99 < 500ms
  - error_rate < 1%
  - memory_usage < 80%
  - cpu_usage < 70%

Analysis Duration: 5 minutes per step
Failure Threshold: 2 consecutive failures
Auto Rollback: Enabled
```

---

## Implementation Steps

### Phase 1: Security Setup (Day 1)
1. Configure SonarCloud project
2. Set up Semgrep rules
3. Add Trivy scanning
4. Create GitHub Actions workflows

### Phase 2: Kubernetes Setup (Day 2-3)
1. Create EKS cluster (or configure existing)
2. Install ArgoCD
3. Install Argo Rollouts
4. Configure namespaces

### Phase 3: Helm Charts (Day 3-4)
1. Create backend Helm chart with Rollout
2. Create frontend Helm chart
3. Configure environment-specific values
4. Create AnalysisTemplates for canary

### Phase 4: ArgoCD Configuration (Day 4-5)
1. Create ArgoCD projects
2. Create Application manifests
3. Configure sync policies
4. Set up notifications

### Phase 5: Testing (Day 5-7)
1. Test full CI pipeline
2. Test canary deployment
3. Test blue-green deployment
4. Test rollback scenarios

---

## Files Created

### GitHub Actions Workflows
| File | Purpose |
|------|---------|
| `.github/workflows/ci-security.yml` | Lint, Semgrep SAST, Tests, SonarCloud |
| `.github/workflows/ci-build.yml` | Docker build, Trivy scan, Push to ECR |
| `.github/workflows/promote-production.yml` | Production promotion with approval |

### Helm Charts
| File | Purpose |
|------|---------|
| `infrastructure/helm/backend/Chart.yaml` | Helm chart definition |
| `infrastructure/helm/backend/values.yaml` | Default values |
| `infrastructure/helm/backend/values-dev.yaml` | Dev environment config |
| `infrastructure/helm/backend/values-staging.yaml` | Staging with canary |
| `infrastructure/helm/backend/values-production.yaml` | Production with blue-green |
| `infrastructure/helm/backend/templates/rollout.yaml` | Argo Rollout resource |
| `infrastructure/helm/backend/templates/service.yaml` | Service definitions |
| `infrastructure/helm/backend/templates/ingress.yaml` | Ingress configuration |
| `infrastructure/helm/backend/templates/analysistemplate.yaml` | Canary analysis |
| `infrastructure/helm/backend/templates/configmap.yaml` | ConfigMap |
| `infrastructure/helm/backend/templates/hpa.yaml` | HPA + PDB |

### ArgoCD Configuration
| File | Purpose |
|------|---------|
| `infrastructure/argocd/projects.yaml` | ArgoCD projects |
| `infrastructure/argocd/app-of-apps.yaml` | Root application |
| `infrastructure/argocd/apps/dev/backend.yaml` | Dev application |
| `infrastructure/argocd/apps/staging/backend.yaml` | Staging application |
| `infrastructure/argocd/apps/production/backend.yaml` | Production application |

### Kubernetes Resources
| File | Purpose |
|------|---------|
| `infrastructure/kubernetes/namespaces/dev.yaml` | Dev namespace + quotas |
| `infrastructure/kubernetes/namespaces/staging.yaml` | Staging namespace |
| `infrastructure/kubernetes/namespaces/production.yaml` | Prod namespace + network policies |

### Configuration Files
| File | Purpose |
|------|---------|
| `sonar-project.properties` | SonarCloud configuration |
| `.semgrep.yml` | Semgrep rules |

---

## Quick Start

### 1. Set up GitHub Secrets
```bash
# Required secrets in GitHub repository settings:
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
SONAR_TOKEN           # From SonarCloud
ARGOCD_TOKEN          # ArgoCD API token (optional)
```

### 2. Install ArgoCD on EKS
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 3. Install Argo Rollouts
```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

### 4. Apply Namespaces
```bash
kubectl apply -f infrastructure/kubernetes/namespaces/
```

### 5. Apply ArgoCD Applications
```bash
kubectl apply -f infrastructure/argocd/projects.yaml
kubectl apply -f infrastructure/argocd/app-of-apps.yaml
```

### 6. Configure SonarCloud
1. Go to https://sonarcloud.io
2. Create organization: `eatfair`
3. Import repository
4. Get SONAR_TOKEN and add to GitHub secrets

---

## Rollout Commands

### View Rollout Status
```bash
kubectl argo rollouts get rollout dollor-backend -n staging
```

### Promote Canary
```bash
kubectl argo rollouts promote dollor-backend -n staging
```

### Abort Rollout
```bash
kubectl argo rollouts abort dollor-backend -n staging
```

### Rollback
```bash
kubectl argo rollouts undo dollor-backend -n production
```

---

Last Updated: December 14, 2025
