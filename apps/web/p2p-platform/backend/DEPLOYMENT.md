# Backend Deployment Notes

## Current Setup
- **No staging environment configured**
- Backend runs on AWS ECS/EKS but staging services are not provisioned

## To Deploy Changes

### Option 1: Local Testing
```bash
cd apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080
```

### Option 2: Production (when ready)
Push to `main` branch triggers `.github/workflows/deploy-dollar-ai.yml`

### Option 3: Manual ECS Update
```bash
# Force new deployment with latest image
aws ecs update-service \
  --cluster dollor-production \
  --service dollor-api-service \
  --force-new-deployment
```

## Pending Infrastructure
- [ ] Set up staging ECS service (`dollor-api-staging-service`)
- [ ] Configure staging database
- [ ] Set up staging CloudFront distribution

## Recent Changes (Build 57)
- `fix(driver): Allow pending drivers to login` - Commit f8dd0bd9
  - Backend now allows PENDING drivers to log in
  - Returns `status`, `is_approved`, `requires_documents` in login response
