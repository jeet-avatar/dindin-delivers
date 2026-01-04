# Session State - January 4, 2026

## Current Issue
**Internal Server Error on `/api/vendors` endpoint**

### Root Cause Identified
The ECS database is missing columns that exist in the code model:
```
column vendors.persona_inquiry_id does not exist
```

### Architecture Status
- **CloudFront** (api.dollor.ai) → Points to **ECS ALB** (dollor-api-alb-2131646468.us-east-1.elb.amazonaws.com)
- **ECS** deployed successfully with new code
- **EKS** deployment keeps failing (K8s pod issues - separate problem)

### What's Working
- Health endpoint: `https://api.dollor.ai/health` - OK
- Admin login: `support@dollor.ai` / `DollorAdmin2026!` - OK
- Admin user ID: 126

### What's NOT Working
- `/api/vendors` - Internal Server Error (missing database columns)
- `/api/vendors/published` - Same error

### Pending Fix
Migration code has been added to `main_new.py` (lines 828-831) to add missing columns:
- `persona_inquiry_id`
- `onfido_applicant_id`
- `veriff_session_id`
- `verification_provider`

But migration endpoint requires the correct `ADMIN_SECRET_KEY` from AWS Secrets Manager:
- Secret: `dollor/production/admin`
- Key: `ADMIN_SECRET_KEY`

### DO NOT DO
- DO NOT guess or assume secret values
- DO NOT use manual kubectl commands - use CI/CD only
- DO NOT change CloudFront origin manually - use CI/CD

### Next Steps (for next session)
1. Get the correct ADMIN_SECRET_KEY from AWS Secrets Manager safely
2. Call migration endpoint: `POST /api/admin/migrate?secret_key=<CORRECT_KEY>`
3. Test `/api/vendors` endpoint after migration
4. Fix K8s deployment (separate issue - pod startup failures)

### Files Modified This Session
1. `apps/web/p2p-platform/backend/models.py` - Changed vendor_id from Computed to nullable Integer
2. `apps/web/p2p-platform/backend/main_new.py` - Added missing verification columns to migration
3. `.github/workflows/deploy-dollar-ai.yml` - Added EKS deployment step
4. `infrastructure/kubernetes/services/p2p-backend/deployment.yaml` - Updated to use ECR image

### Recent Commits
- `b4dc3fcc` - Fix vendor_id Computed column causing Internal Server Error
- `a72187dc` - Add missing verification provider columns to migration

### Database Comparison
- **ECS Database**: 64 tables (production data)
- **EKS Database**: 52 tables (different database - has working vendors)

Note: ECS and EKS use different databases! This is a configuration issue.
- ECS uses: `dollor/production/database-v2` (AWS Secrets Manager)
- EKS uses: Different secret/database
