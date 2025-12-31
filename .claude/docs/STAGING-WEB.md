# Web Platform - Staging Guide

## Quick Command
```
Claude, I'm working on the WEB PLATFORM. Reference .claude/docs/STAGING-WEB.md
```

---

## Components

| Component | Directory | Tech Stack |
|-----------|-----------|------------|
| Frontend | `apps/web/p2p-platform/frontend/` | React + Vite + TypeScript |
| Backend | `apps/web/p2p-platform/backend/` | Python FastAPI |

## Environments

| Environment | Frontend URL | API URL |
|-------------|-------------|---------|
| Staging | `https://d16vg3j5yeo80q.cloudfront.net` | `https://d3kuu45w6kl8hr.cloudfront.net` |
| Production | `https://dollor.ai` | `https://api.dollor.ai` |

---

## CI/CD Pipeline

### Workflow: `ci-complete.yml`
```yaml
Stages:
  1. Lint & Format     → ruff (Python) + ESLint (TypeScript)
  2. Semgrep SAST      → Security scanning
  3. Tests & Coverage  → pytest with PostgreSQL + Redis
  4. SonarCloud        → Code quality analysis
  5. Quality Gate      → PR blocker
  6. Build & Scan      → Docker build + Trivy scan
  7. Deploy Dev        → develop branch → dev environment
  8. Deploy Staging    → staging/develop branch → staging
  9. Deploy Production → main branch (manual approval)
```

### GitHub Actions
```bash
# Check pipeline status
gh run list --repo jeet-avatar/eatfair-ios --workflow=ci-complete.yml --limit 5
```

---

## Frontend

### Configuration Files
```
apps/web/p2p-platform/frontend/
├── .env.development    # Local dev settings
├── .env.staging        # Staging settings (if exists)
├── .env.production     # Production settings
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Environment Variables
```env
# .env.production (currently pointing to staging for testing)
VITE_API_URL=https://api.dollor.ai
VITE_ENVIRONMENT=production
```

### Build Commands
```bash
cd apps/web/p2p-platform/frontend

# Install dependencies
npm ci

# Lint
npm run lint

# Build for staging
npm run build

# Dev server
npm run dev
```

### Key Features to Verify
- [ ] Login/Register pages
- [ ] Customer dashboard
- [ ] Restaurant browse
- [ ] Cart & checkout
- [ ] Order tracking
- [ ] Vendor dashboard
- [ ] Menu management
- [ ] Admin panel (if applicable)

---

## Backend

### Configuration Files
```
apps/web/p2p-platform/backend/
├── .env                # Environment config
├── main.py             # FastAPI app entry
├── database.py         # Database connection
├── requirements.txt    # Python dependencies
├── Dockerfile          # Container build
└── tests/              # Test suite
```

### Environment Variables
```env
# Required environment variables
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-jwt-secret
STRIPE_SECRET_KEY=sk_test_...
```

### Build Commands
```bash
cd apps/web/p2p-platform/backend

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/ -v --cov=.

# Run server locally
uvicorn main:app --reload --host 0.0.0.0 --port 8080

# Build Docker image
docker build -t dollor-api .
```

### API Endpoints to Verify
```bash
# Health check
curl https://d3kuu45w6kl8hr.cloudfront.net/health
curl https://d3kuu45w6kl8hr.cloudfront.net/api/health

# Auth endpoints
curl -X POST https://d3kuu45w6kl8hr.cloudfront.net/api/auth/customer/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@test.com&password=test123"
```

---

## Database

### Staging Database
| Field | Value |
|-------|-------|
| Host | `dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com` |
| Port | `5432` |
| Database | `dollor_staging` |
| Type | PostgreSQL 15 |

### Key Tables
```
customers, vendors, drivers, orders, order_items,
menu_items, addresses, rides, payments, promotions
```

### Migrations
```bash
# Located at:
apps/web/p2p-platform/backend/migrations/

# Apply migrations:
python -c "from database import apply_migrations; apply_migrations()"
```

---

## Kubernetes

### Staging Namespace
```bash
# Check pods
kubectl get pods -n dollor-staging

# Check services
kubectl get svc -n dollor-staging

# View logs
kubectl logs -f deployment/p2p-backend -n dollor-staging
```

### Key Deployments
- `p2p-backend` - Main API server
- `redis` - Caching
- Various microservices

---

## Pre-Production Checklist

### Frontend
- [ ] All pages render correctly
- [ ] API calls use correct URLs
- [ ] No console errors
- [ ] Responsive design works
- [ ] Forms validate correctly
- [ ] Error handling works

### Backend
- [ ] All endpoints return correct responses
- [ ] Database queries optimized
- [ ] Error handling in place
- [ ] Logging configured
- [ ] CORS configured correctly
- [ ] Rate limiting enabled

### Security
- [ ] HTTPS enforced
- [ ] JWT tokens secure
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Secrets not in code

### Performance
- [ ] Response times < 500ms
- [ ] Database indexes created
- [ ] Caching working
- [ ] CDN configured

### Deployment
- [ ] Docker image builds
- [ ] Health checks pass
- [ ] Rollback procedure tested
- [ ] Monitoring configured
