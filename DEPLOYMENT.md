# Dollor.ai Deployment Guide

> **Last Updated**: February 3, 2026
> **API Contract Version**: 1.0.8

---

## Quick Reference

| Environment | Frontend URL | API URL | Trigger |
|-------------|--------------|---------|---------|
| **Staging** | https://staging.dollor.ai | https://d3kuu45w6kl8hr.cloudfront.net | Push to `staging`/`develop` or manual |
| **Production** | https://dollor.ai | https://api.dollor.ai | Push to `main` or manual |

---

## 1. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
├─────────────────────────────────────────────────────────────────┤
│  Push to main ──► Deploy to Dollor.ai (Production)              │
│  Push to staging/develop ──► Deploy to Staging                  │
│  Manual ──► workflow_dispatch                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Services                             │
├──────────────────────┬──────────────────────────────────────────┤
│      Frontend        │              Backend                      │
├──────────────────────┼──────────────────────────────────────────┤
│  S3 Bucket           │  ECR (Docker Images)                     │
│  CloudFront CDN      │  ECS Fargate (Container Orchestration)   │
│                      │  RDS PostgreSQL (Database)               │
│                      │  ElastiCache Redis (Caching)             │
└──────────────────────┴──────────────────────────────────────────┘
```

---

## 2. Deploy to Staging

### Option A: Automatic (Push to Branch)
```bash
# Push to staging or develop branch triggers deployment
git checkout staging
git merge main
git push origin staging
```

### Option B: Manual (GitHub CLI)
```bash
# Trigger staging deployment from any branch
gh workflow run "Deploy to Staging" --ref main

# Check deployment status
gh run list --workflow="Deploy to Staging" --limit 3

# View deployment logs
gh run view <run-id> --log
```

### Option C: GitHub UI
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Staging** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

### Verify Staging Deployment
```bash
# Check API health
curl https://d3kuu45w6kl8hr.cloudfront.net/health

# Expected response:
# {"status": "healthy", "service": "p2p-backend", "version": "1.0.x", "database": "connected"}
```

---

## 3. Deploy to Production

### Option A: Automatic (Push to Main)
```bash
# Any push to main with changes in apps/web/p2p-platform/** triggers deployment
git push origin main
```

### Option B: Manual (GitHub CLI)
```bash
# Trigger production deployment
gh workflow run "Deploy to Dollor.ai" --ref main

# Check deployment status
gh run list --workflow="Deploy to Dollor.ai" --limit 3
```

### Option C: Promote Staging to Production
```bash
# Creates a PR from staging to main with approval checklist
gh workflow run "Promote Staging to Production" -f confirm_promotion=PROMOTE
```

### Verify Production Deployment
```bash
# Check API health
curl https://api.dollor.ai/health

# Test critical endpoints
curl https://api.dollor.ai/api/vendors
curl https://api.dollor.ai/api/v5/driver/48/dashboard
```

---

## 4. Deployment Workflows

### `deploy-staging.yml`
| Job | Description |
|-----|-------------|
| `run-tests` | Runs pytest on backend and microservices |
| `deploy-staging-frontend` | Builds React app, deploys to S3, invalidates CloudFront |
| `deploy-staging-ecs` | Builds Docker image, pushes to ECR, updates ECS service |
| `deploy-staging-eks` | Updates Kubernetes deployments (if cluster exists) |

### `deploy-dollar-ai.yml` (Production)
| Job | Description |
|-----|-------------|
| `deploy-frontend` | Builds and deploys frontend to S3/CloudFront |
| `deploy-ecs` | Builds Docker image, pushes to ECR, updates ECS Fargate |
| `deploy-eks` | Updates EKS deployments (optional) |

---

## 5. Environment Variables

### Required Secrets (GitHub)
| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `STAGING_CLOUDFRONT_ID` | CloudFront distribution ID for staging |
| `STAGING_EC2_HOST` | EC2 hostname for staging (optional) |
| `STAGING_EC2_SSH_KEY` | SSH key for EC2 access (optional) |

### Backend Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dollor_db

# Authentication
JWT_SECRET_KEY=your-secret-key
SECRET_KEY=your-app-secret

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Firebase
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
```

---

## 6. Rollback Procedures

### Quick Rollback via ECS
```bash
# List recent task definitions
aws ecs list-task-definitions --family-prefix dollor-api --sort DESC --max-items 5

# Update service to previous task definition
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --task-definition dollor-api:<previous-revision> \
  --force-new-deployment
```

### Rollback via Git
```bash
# Find the last working commit
git log --oneline -10

# Revert to previous commit
git revert HEAD
git push origin main
# This triggers a new deployment with reverted code
```

### Emergency: Force Previous Docker Image
```bash
# Get previous image tag
aws ecr describe-images --repository-name dollor-api --query 'imageDetails[*].imageTags' --output text

# Update ECS with specific image tag
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --force-new-deployment
```

---

## 7. Monitoring & Troubleshooting

### Check Deployment Status
```bash
# GitHub Actions status
gh run list --limit 5

# ECS service status
aws ecs describe-services \
  --cluster dollor-production \
  --services dollor-api-service \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}'

# View ECS logs
aws logs tail /ecs/dollor-api --follow
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Tests failing | Import errors in test files | Fix test imports or use `skip_tests: true` |
| EKS deployment fails | Cluster doesn't exist | Safe to ignore if ECS succeeds |
| CloudFront not updating | Cache not invalidated | Manually invalidate: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"` |
| API returns old version | ECS task not updated | Force new deployment or check task definition |

### Health Check Endpoints
```bash
# Backend health
curl https://api.dollor.ai/health

# Database connectivity
curl https://api.dollor.ai/health | jq .database

# Demo account setup
curl -X POST https://api.dollor.ai/api/demo/setup
```

---

## 8. iOS/Android App Deployment

### TestFlight (iOS)
```bash
cd apps/ios
fastlane ios beta
```

### Play Store (Android)
```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:bundleProductionRelease
# Upload AAB to Play Console
```

---

## 9. Database Migrations

### Run Migrations
```bash
# SSH to backend or run locally
cd apps/web/p2p-platform/backend
source venv/bin/activate

# Migrations are auto-applied on startup via ensure_columns_exist()
python -c "from main_new import ensure_columns_exist; ensure_columns_exist()"
```

### Seed Demo Data
```bash
# Create demo accounts for App Store review
curl -X POST https://api.dollor.ai/api/demo/setup

# Verify demo accounts
curl https://api.dollor.ai/api/admin/drivers | jq '.drivers[] | select(.email=="demo.driver@dollor.ai")'
```

---

## 10. Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally: `pytest tests/unit/ -v`
- [ ] API contract updated: `API_CONTRACT.md`
- [ ] No hardcoded credentials in code
- [ ] Database migrations tested

### Post-Deployment
- [ ] Health check passes: `curl https://api.dollor.ai/health`
- [ ] Critical endpoints work (vendors, orders, drivers)
- [ ] Mobile apps can connect (test on device)
- [ ] No errors in CloudWatch logs

### For Production
- [ ] Staging tested and approved
- [ ] Stakeholder sign-off obtained
- [ ] Rollback plan ready
- [ ] Monitor for 1 hour post-deploy

---

## 11. Contact & Support

- **GitHub Issues**: https://github.com/jeet-avatar/dindin-delivers/issues
- **API Contract**: See `API_CONTRACT.md` for endpoint documentation
- **Infrastructure**: See `.claude/docs/05-DEPLOYMENT.md` for detailed AWS setup

---

*Generated by Claude Code - Dollor.ai AI Employee*
