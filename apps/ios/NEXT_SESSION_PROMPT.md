# Next Session Prompt - Build 59

Copy and paste this into your next Claude Code session:

---

## Session Start Command

```
/gsd:resume-work
```

If that doesn't work or you're starting fresh, use:

```
/gsd:progress
```

---

## Context for New Session

**Previous Build:** 58 - Rating Storage, Driver ID Fix, Vendor Route, Persona Integration
**Current Build:** 59

### What Was Deployed in Build 58

1. **Rating Storage Complete**
   - Changed 4 hardcoded `4.5` ratings to use actual `vendor.average_rating`
   - Fallback to 4.5 if no ratings yet
   - Commit: `78a595b1`

2. **Driver ID Fix (Web App)**
   - Fixed `getCurrentDriverId()` in api.ts
   - Now reads both `driver_user` object AND direct `driver_id` key
   - Commit: `f8704c63`

3. **Vendor Documents Route**
   - Added missing `/vendor/documents` route in App.tsx
   - Commit: `5b9c2cd5`

4. **Persona Integration for Driver Documents**
   - Upload endpoint now creates Persona inquiry instead of hardcoding `True`
   - Webhook handler sets `drivers_license = True` only when Persona approves
   - Auto-approves driver when all docs verified
   - Commit: `1a13c0ac`

### Recent Commits
```
1a13c0ac feat(verification): Integrate Persona for driver document verification
5b9c2cd5 fix(vendor): Add missing /vendor/documents route
f8704c63 fix(driver): Fix getCurrentDriverId to read driver_id from localStorage
78a595b1 feat(rating): Store and display actual restaurant ratings
f8dd0bd9 fix(driver): Allow pending drivers to login and track approval status
```

---

## Build 59 Priority Options

### Option A: Verify Persona Integration (Recommended)
```
/gsd:quick

Task: Test Persona driver verification end-to-end
1. Check PERSONA_API_KEY is set in production environment
2. Upload a driver's license through web app
3. Verify Persona inquiry is created
4. Check webhook is received and processed
5. Confirm driver status updates correctly
```

### Option B: Vendor Persona Integration
```
/gsd:plan-phase

Phase: Integrate Persona for vendor document verification
Goal: Verify vendor documents (health permit, business license) via Persona

Requirements:
1. Update vendor document upload endpoint to create Persona inquiry
2. Handle vendor-specific document types in webhook
3. Set documents_verified when all required docs approved
4. Auto-approve vendor when verification complete
```

### Option C: Driver Status UI (iOS)
```
/gsd:plan-phase

Phase: Driver approval status UI
Goal: Show PENDING drivers what's needed and block order acceptance

Requirements:
1. Display driver status on profile screen
2. Show checklist of required documents for PENDING drivers
3. Disable "Go Online" button for non-approved drivers
4. Add status banner at top of driver home screen
```

### Option D: Driver Ratings Storage
```
/gsd:plan-phase

Phase: Implement driver rating storage
Goal: Persist driver ratings like restaurant ratings

Requirements:
1. Create driver_ratings table (mirrors restaurant_ratings structure)
2. Update rate-driver endpoint to persist ratings
3. Add average_rating/total_ratings to Driver model
4. Display driver ratings in customer app order history
```

### Option E: TestFlight Build
```
/gsd:quick

Task: Prepare Customer App Build 59 for TestFlight
- Bump version to 1.0.59
- Run build validation
- Archive and upload to App Store Connect
```

---

## Document Verification Status

| Entity | Upload Endpoint | Persona Integration | Webhook Handler | Status |
|--------|-----------------|---------------------|-----------------|--------|
| Driver | `/api/drivers/{id}/upload-document` | Yes (Build 58) | Yes | Complete |
| Vendor | `/api/vendor/upload-document` | No | No | Needs work |

### Persona Environment Variable
```bash
# Check if set in production
PERSONA_API_KEY=persona_sandbox_xxx  # or persona_production_xxx
```

---

## Deployment Notes

**IMPORTANT:** No staging environment exists. All deployments go to production.

```bash
# Local testing
cd apps/web/p2p-platform/backend
source venv/bin/activate
uvicorn main_new:app --reload --port 8080

# Production deployment
git push origin main  # Triggers deploy-dollar-ai.yml
```

---

## Key Files Reference

```
# Persona Integration (Build 58)
apps/web/p2p-platform/backend/main_new.py (lines 3773-3843, 10751-10780)
apps/web/p2p-platform/backend/document_verification_service.py

# Driver ID Fix (Build 58)
apps/web/p2p-platform/frontend/src/app/api/api.ts (getCurrentDriverId function)

# Vendor Documents Route (Build 58)
apps/web/p2p-platform/frontend/src/App.tsx

# Models
apps/web/p2p-platform/backend/models.py
```

---

## Environment

- **Staging API:** https://d3kuu45w6kl8hr.cloudfront.net (NOT DEPLOYED - no staging)
- **Production API:** https://api.dollor.ai
- **Branch:** main

---

*Generated: January 31, 2026*
*Build 58 Complete → Ready for Build 59*
