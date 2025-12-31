# Dollor.ai Admin Portal - Enterprise Security & Technical Audit Report

**Report Date:** December 30, 2025
**Audit Scope:** Admin Authentication, ZIP Dashboard, API Integration
**Severity Levels:** CRITICAL | HIGH | MEDIUM | LOW
**Status:** Issues Identified - Remediation Required

---

## Executive Summary

This report documents critical issues identified in the Dollor.ai Admin Portal affecting authentication flow, API integration, and dashboard functionality. The audit was conducted following reports of pages crashing post-login and authentication bypass concerns.

---

## 1. AUTHENTICATION SYSTEM ANALYSIS

### 1.1 Token Storage Inconsistency (CRITICAL - FIXED)

**Location:** `src/app/api/api.ts:42`

**Issue:** The API axios interceptor was configured to read authentication tokens from `localStorage.getItem("id_token")`, while the admin login component stores tokens as `localStorage.setItem('token', ...)`.

| Component | Token Key Used | Expected |
|-----------|---------------|----------|
| Login.tsx:41 | `token` | - |
| api.ts:42 | `id_token` | `token` |
| UserContext.tsx:75 | `token` | - |
| LoginCallback.tsx:15 | `id_token` | Legacy OAuth |

**Impact:** All authenticated API requests from admin portal failed silently, causing dashboard crashes and empty data states.

**Resolution Applied:** Modified `api.ts` to check multiple token keys:
```javascript
const token = globalThis.localStorage.getItem("token")
  || globalThis.localStorage.getItem("id_token")
  || globalThis.localStorage.getItem("access_token");
```

### 1.2 Session Management

**Location:** `src/app/context/UserContext.tsx`

| Feature | Implementation | Status |
|---------|---------------|--------|
| JWT Expiry Validation | `isTokenExpired()` function | Implemented |
| Session Timeout | 8 hours (`SESSION_TIMEOUT_MS`) | Implemented |
| Token Refresh | Not implemented | Missing |
| Periodic Validation | Every 5 minutes | Implemented |

**Recommendation:** Implement token refresh mechanism before expiry to prevent user session interruption.

### 1.3 Pre-React Security Layer

**Location:** `index.html:23-50`

A client-side security script blocks unauthenticated access to `/admin/*` routes before React loads. This is defense-in-depth but **should not be relied upon as primary security**.

**Limitations:**
- Client-side only - easily bypassed by disabling JavaScript
- Does not validate token authenticity (only checks existence)
- No server-side route protection for static assets

---

## 2. API ENDPOINT ANALYSIS

### 2.1 Missing Backend Endpoints (CRITICAL)

The frontend references API endpoints that **do not exist** in the backend:

| Frontend Reference | Endpoint | Backend Status | Impact |
|-------------------|----------|----------------|--------|
| Apis.tsx:95 | `/api/dashboard/zip/get` | **404 Not Found** | ZIP Dashboard crashes |
| Apis.tsx:96-101 | `/api/dashboard/zip/*` | **404 Not Found** | No metrics displayed |
| Apis.tsx:4 | `/api/me` | **404 Not Found** | Login state verification fails |
| Apis.tsx:6 | `/api/activity` | **404 Not Found** | Notifications fail to load |
| Apis.tsx:24-26 | `/api/dashboard/zip-tab` | **404 Not Found** | Dashboard tab crashes |

**Verified Working Endpoints:**
- `/api/vendors` - Returns vendor list
- `/api/dashboard/consolidated` - Returns consolidated metrics
- `/api/admin/login` - Authentication works
- `/api/auth/me` - Token validation (note: different from `/api/me`)

### 2.2 API Contract Misalignments

| Component | Expected Endpoint | Actual Endpoint |
|-----------|-------------------|-----------------|
| UserContext.tsx:110 | `/api/auth/me` | Correct |
| Apis.tsx:4 (Bridge) | `/api/me` | **Incorrect** |
| MainLayout.tsx:47 | Uses Bridge.notifications() | Calls non-existent `/api/activity` |

---

## 3. HARDCODED DATA ANALYSIS

### 3.1 Dashboard Tab - Zip.tsx (HIGH)

**Location:** `src/app/screens/dashboard/tabs/Zip.tsx:30-36`

```javascript
const zipMetrics = {
    activeVendors: 342,    // HARDCODED
    paymentSuccess: 45,    // HARDCODED
    processingTime: 12,    // HARDCODED
    newRequests: 12,       // HARDCODED
};
```

**Issue:** The ZIP dashboard tab displays hardcoded static data instead of fetching from API. The actual API call is commented out (lines 40-47).

### 3.2 Constants File - consts.tsx

**Location:** `src/app/constants/consts.tsx`

| Data | Lines | Type | Purpose |
|------|-------|------|---------|
| `spendTrendData` | 24-33 | Hardcoded chart data | Dashboard visualization |
| `DUMMY_REQUISITIONS_DATA` | 66-307 | Mock requisitions | Development placeholder |

### 3.3 Commented System Tabs

**Location:** `src/app/constants/consts.tsx:18-21`

Several dashboard tabs are commented out, causing navigation issues:
```javascript
/* { id: 'zip', name: 'ZIP', icon: <Wallet className="h-5 w-5" /> },
   { id: 'jira', name: 'JIRA', icon: <GitPullRequest className="h-5 w-5" /> },
   { id: 'process-unity', name: 'Process Unity', icon: <Shield className="h-5 w-5" /> },
   { id: 'netsuite-wolt', name: 'NetSuite Wolt', icon: <Globe className="h-5 w-5" /> } */
```

---

## 4. UI/UX ISSUES

### 4.1 Error Handling Gaps

| Component | Issue | Severity |
|-----------|-------|----------|
| zipDashboard/Main.tsx | No error boundary | HIGH |
| Bridge.tsx | Silent API failures | MEDIUM |
| MainLayout.tsx | Empty notifications array on error | LOW |

### 4.2 Loading States

The ZIP Dashboard (`zipDashboard/Main.tsx`) implements proper loading states but crashes when API returns 404 due to missing error handling in the Promise chain.

### 4.3 Type Safety Issues

**Location:** `src/app/screens/dashboard/tabs/Zip.tsx:18-19`

```javascript
const [dashboardCount, setDashboardCount] = useState({});  // No type annotation
const [chartData, setChartData] = useState({});            // No type annotation
```

Accessing properties like `dashboardCount.activeVendors` on an empty object causes undefined behavior.

---

## 5. SECURITY OBSERVATIONS

### 5.1 Positive Security Implementations

| Feature | Location | Status |
|---------|----------|--------|
| JWT-based authentication | UserContext.tsx | Implemented |
| Admin role verification | Login.tsx:36, App.tsx:99 | Implemented |
| Token expiry handling | UserContext.tsx:48-58 | Implemented |
| HTTPS API communication | api.ts:5 | Enforced |
| Logout confirmation modal | MainLayout.tsx:337-350 | Implemented |

### 5.2 Security Concerns

| Issue | Location | Risk Level |
|-------|----------|------------|
| Client-side only route protection | index.html | MEDIUM |
| Token stored in localStorage (XSS vulnerable) | Login.tsx:41 | MEDIUM |
| API endpoints not requiring authentication | `/api/vendors` | LOW (intended for admin ops) |
| Hardcoded admin credentials in setup endpoint | main_new.py:906 | MEDIUM |

---

## 6. DEPLOYMENT STATUS

### 6.1 Current Production State

| Resource | Status | Version |
|----------|--------|---------|
| S3 Bucket | `dollar-ai-frontend` | Active |
| CloudFront Distribution | `E1TL8YTTU1SF3A` | Active |
| API Backend | `api.dollor.ai` | Active |
| Latest JS Bundle | `index-B0JTzfSA.js` | Deployed 2025-12-30 |

### 6.2 Cache Invalidation

Last invalidation: `I7VAG75AM2SH7V2II7YYL744M6` (2025-12-30 10:05:32 UTC)

---

## 7. REMEDIATION ROADMAP

### Phase 1: Critical Fixes (Immediate)

1. **Implement missing ZIP dashboard endpoints in backend**
   - `/api/dashboard/zip/get`
   - `/api/dashboard/zip/*` metrics endpoints

2. **Fix API reference inconsistencies**
   - Update `Apis.tsx` to use correct endpoint paths
   - Align with actual backend routes

3. **Add error boundaries to dashboard components**
   - Wrap dashboard tabs in React Error Boundary
   - Implement graceful degradation

### Phase 2: High Priority (1-2 Days)

4. **Remove hardcoded data**
   - Replace mock data in `Zip.tsx` with API calls
   - Remove `DUMMY_REQUISITIONS_DATA` from consts.tsx

5. **Uncomment and test system tabs**
   - Enable ZIP, JIRA, Process Unity tabs
   - Verify all navigation paths work

6. **Add proper TypeScript types**
   - Define interfaces for all API responses
   - Add type annotations to useState hooks

### Phase 3: Security Enhancements (1 Week)

7. **Implement token refresh mechanism**
8. **Add server-side route protection**
9. **Migrate token storage to HttpOnly cookies**
10. **Add request rate limiting**

---

## 8. APPENDIX

### A. File Inventory

| File | Purpose | Issues Found |
|------|---------|--------------|
| `Login.tsx` | Admin authentication | None (correctly implemented) |
| `api.ts` | API client configuration | Token key mismatch (FIXED) |
| `Apis.tsx` | Endpoint URL definitions | Multiple 404 endpoints |
| `Bridge.tsx` | API abstraction layer | References non-existent endpoints |
| `Zip.tsx` | Dashboard tab | Hardcoded data |
| `zipDashboard/Main.tsx` | Full ZIP dashboard | Depends on missing APIs |
| `UserContext.tsx` | Auth state management | Well implemented |
| `consts.tsx` | Constants/mock data | Contains development placeholders |

### B. API Endpoint Registry

**Working Endpoints:**
```
POST /api/admin/login
GET  /api/auth/me
GET  /api/vendors
GET  /api/vendors/{id}
PATCH /api/vendors/{id}/status
GET  /api/dashboard/consolidated
GET  /api/orders
POST /api/auth/admin/setup-production
```

**Missing Endpoints (404):**
```
GET  /api/me
GET  /api/activity
GET  /api/dashboard/zip
GET  /api/dashboard/zip/get
GET  /api/dashboard/zip-tab
GET  /api/dashboard/jira
GET  /api/dashboard/netsuite-tab
```

### C. Environment Configuration

```
VITE_API_URL=https://api.dollor.ai (Production)
Fallback: http://a25a4d0c5877a4a5898ab0352303effe-578011169.us-east-1.elb.amazonaws.com:8080 (Staging ELB)
```

---

**Report Prepared By:** Claude Code Audit
**Classification:** Internal Use Only
**Next Review Date:** January 15, 2026
