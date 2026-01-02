# Dollor.ai Staging to Production Master Guide

## Quick Reference
```
Claude, I'm working on [APP_NAME]. Reference .claude/docs/STAGING-[APP].md
```

---

## All Apps Overview

| App | Platform | Location | CI/CD Workflow | Status |
|-----|----------|----------|----------------|--------|
| Customer | Android | `eatfair-android/app/` | `android-ci.yml` | [ ] |
| Driver | Android | `eatfair-android/driver/` | `android-ci.yml` | [ ] |
| Partner | Android | `eatfair-android/partner/` | `android-ci.yml` | [ ] |
| Customer | iOS | `eatfair-ios/apps/ios/customer/` | `ios-ci.yml` | [ ] |
| Restaurant | iOS | `eatfair-ios/apps/ios/restaurant/` | `ios-ci.yml` | [ ] |
| Delivery | iOS | `eatfair-ios/apps/ios/delivery/` | `ios-ci.yml` | [ ] |
| Web Frontend | Web | `eatfair-ios/apps/web/p2p-platform/frontend/` | `ci-complete.yml` | [ ] |
| Web Backend | API | `eatfair-ios/apps/web/p2p-platform/backend/` | `ci-complete.yml` | [ ] |

---

## Staging Environment

| Component | URL |
|-----------|-----|
| API (CloudFront) | `https://d3kuu45w6kl8hr.cloudfront.net` |
| API (ELB Direct) | `http://a25a4d0c5877a4a5898ab0352303effe-578011169.us-east-1.elb.amazonaws.com:8080` |
| Database | `dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/dollor_staging` |
| Kubernetes | `dollor-staging` namespace |
| Firebase | `eatfair-app` project |

---

## CI/CD Pipelines Summary

### Android (`android-ci.yml`)
```
Lint Check → Unit Tests → Build APKs → Instrumented Tests (optional) → Release Build
```
- Triggers: push to main/develop/staging/feature/*
- Staging only builds (no production in CI)
- Artifacts: APKs uploaded to GitHub

### iOS (`ios-ci.yml`)
```
SwiftLint → Build Shared → Build Apps → Tests → Archive (main only)
```
- Triggers: push to main/develop/staging/feature/*
- Builds: Customer, Restaurant, Delivery
- Archive only on main branch

### Web/Backend (`ci-complete.yml`)
```
Lint → Semgrep SAST → Tests → SonarCloud → Quality Gate → Docker Build → Deploy
```
- Deploys: develop→dev, staging→staging, main→production
- Quality gates: Coverage, security, code quality

---

## Universal Staging Checklist

### Before Starting Any App
- [ ] All shared modules build successfully
- [ ] API health check passes: `curl https://d3kuu45w6kl8hr.cloudfront.net/health`
- [ ] Database connectivity verified
- [ ] Firebase project configured

### Before Moving to Production
- [ ] All staging CI/CD pipelines green
- [ ] All API endpoints tested
- [ ] All UI screens functional
- [ ] No hardcoded staging URLs
- [ ] Security scan passed
- [ ] Performance acceptable
- [ ] Error handling works
- [ ] Push notifications work
