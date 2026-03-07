# Phase 12: Fix Admin Portal UI - Research

**Researched:** 2026-03-07
**Domain:** React admin frontend -- API integration, mock data removal, auth headers
**Confidence:** HIGH

## Summary

The admin portal has three categories of problems: (1) broken API calls that use raw `fetch()` instead of the `api` axios instance, bypassing the auth interceptor; (2) screens pointing at nonexistent backend endpoints (ERP integrations that were never wired); and (3) screens with real backend endpoints that work correctly. This research provides a complete audit of every admin screen, its data source, and whether it works.

The vendor management screens (Main, DocumentReview, MenuReview) are the highest-priority fix -- they use raw `fetch()` without auth headers, so all API calls fail with 401 in production. The ERP dashboards (Jira, NetSuite, ZIP tabs on the consolidated dashboard, System Dashboard) call endpoints that do not exist in the backend at all. These need to either be removed or replaced with real Dollor.ai data.

**Primary recommendation:** Fix raw `fetch()` calls to use `api` axios instance (fixes auth), replace fake ERP dashboards with real Dollor.ai operational dashboards, and remove unused mock data.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | UI framework | Project standard |
| react-router-dom | 6.18.0 | Routing | Already wired |
| axios | 1.12.2 | HTTP client with interceptors | Auth headers via interceptor |
| antd | 5.27.4 | UI component library | Used in most admin screens |
| lucide-react | 0.344.0 | Icons | Used in sidebar/layout |
| chart.js + react-chartjs-2 | 4.4.0 / 5.2.0 | Charts | Already used in dashboard screens |
| tailwindcss | 3.4.1 | CSS utility framework | Used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 2.30.0 | Date formatting | Already imported in several files |
| moment | 2.30.1 | Date formatting (legacy) | Already used in order/driver screens |

**No new libraries needed.** All fixes use existing dependencies.

## Architecture Patterns

### Pattern 1: Use `api` Axios Instance for All API Calls

**What:** The `api` axios instance in `src/app/api/api.ts` has an interceptor that automatically attaches `Authorization: Bearer {token}` from `localStorage.getItem("token")`.

**Current problem:** vendorManagement screens use raw `fetch()` which bypasses the interceptor.

**Wrong (current code in vendorManagement/Main.tsx:122-124):**
```typescript
// BUG: No auth header -- returns 401 in production
const response = await fetch(`${getApiUrl()}/api/vendors`);
const data = await response.json();
```

**Correct pattern:**
```typescript
import api from '../../api/api';

// Auth header added automatically by interceptor
const response = await api.get('/vendors');
const data = response.data;
```

**For admin endpoints requiring explicit token (raw fetch still used in publish/checklist):**
```typescript
// Wrong -- reads 'auth_token' but admin login stores as 'token'
const token = localStorage.getItem('auth_token');

// Correct -- use 'token' key, or better yet, just use `api` instance
const response = await api.post(`/admin/vendors/${vendorId}/publish`, {
  platforms: ['ios', 'android', 'web']
});
```

### Pattern 2: Admin Screen Data Source Categorization

Every admin screen falls into one of three categories:

| Category | Action | Screens |
|----------|--------|---------|
| **REAL + WORKING** | No changes needed | Orders, DriversAdmin, RideRequests, ActiveRides, Invoices, Clients, Accounting, ProjectTracker, ChangeManagement |
| **REAL + BROKEN** | Fix `fetch()` to `api`, fix endpoints | VendorManagement/Main, DocumentReview, MenuReview |
| **MOCK / NO BACKEND** | Remove or replace | Dashboard consolidated (Jira/NetSuite/ZIP/ProcessUtility/NetSuiteWolt tabs), JiraDashboard, NetsuiteDashboard, SystemDashboard, AIDashboard, CoupaDashboard (partially), Transactions, Settings |

### Pattern 3: Sidebar Navigation Cleanup

Remove or hide nav items that point to mock screens. Keep the sidebar focused on screens with real data.

### Anti-Patterns to Avoid
- **Raw `fetch()` in any admin screen:** Always use the `api` axios instance for auth header injection
- **Reading wrong localStorage key:** Admin login stores token as `"token"`, not `"auth_token"`
- **Calling `/api/vendors` to list restaurants for admin:** This endpoint returns ALL vendors. For admin listing, this is correct (it queries the DB). The `getVendors` function in api.ts already uses the `api` instance correctly. The vendor management Main.tsx just needs to use `getVendors()` from api.ts instead of raw fetch.

## Complete Screen Audit

### Screens with REAL Backend Endpoints (WORKING)

| Screen | Route | API Endpoint(s) | Uses `api` instance | Status |
|--------|-------|-----------------|---------------------|--------|
| Orders | `/admin/orders` | `GET /api/orders` | YES (via getOrders) | WORKING |
| DriversAdmin | `/admin/drivers` | `GET /api/admin/drivers` | YES | WORKING |
| RideRequests | `/admin/rideshare/requests` | `GET /api/admin/rideshare/requests` | YES | WORKING |
| ActiveRides | `/admin/rideshare/active` | `GET /api/admin/rideshare/active` | YES | WORKING |
| Invoices | `/admin/invoices` | `GET /api/invoices` | YES | WORKING |
| Clients | `/admin/clients` | `GET /api/clients` | YES | WORKING |
| VendorPayouts | `/admin/accounting/vendor-payouts` | `GET /api/accounting/vendor-payouts` | YES | WORKING |
| PlatformRevenue | `/admin/accounting/platform-revenue` | `GET /api/admin/accounting/*` | YES | WORKING |
| AccountingReports | `/admin/accounting/reports` | `GET /api/admin/accounting/*` | YES | WORKING |
| ProjectTracker | `/admin/project-tracker` | `GET /api/admin/project-cases/*` | YES | WORKING |
| ChangeManagement | `/admin/change-management` | `GET /api/admin/change-requests/*` | YES | WORKING |
| ZipDashboard | `/admin/zip-dashboard` | `GET /api/vendors` + `GET /api/vendors/published` | YES (via api.ts functions) | WORKING |

### Screens with REAL Backend Endpoints (BROKEN -- raw fetch, no auth)

| Screen | Route | Bug | Fix |
|--------|-------|-----|-----|
| VendorManagement/Main | `/admin/vendor-management` | Uses raw `fetch()` at line 123 -- no auth header. Also reads `auth_token` instead of `token` at line 477, 511 | Replace all `fetch()` with `api` instance calls |
| DocumentReview | `/admin/document-review` | Uses raw `fetch()` at lines 100, 158, 196 -- no auth header | Replace with `api` instance |
| MenuReview | `/admin/menu-review` | Uses raw `fetch()` at lines 97, 106, 204, 231, 253 -- no auth header | Replace with `api` instance |

### Screens with NO Backend Endpoints (MOCK DATA)

| Screen | Route | What it calls | Backend exists? | Recommendation |
|--------|-------|---------------|-----------------|----------------|
| Dashboard/Main (consolidated) | `/admin` | Tabs: Jira, NetSuite, ZIP, ProcessUtility, NetSuiteWolt | **Consolidated tab exists** (`/api/dashboard/consolidated`). Jira/NetSuite/ZIP/ProcessUtility/NetSuiteWolt tabs call `/api/dashboard/jira-tab`, `/api/dashboard/netsuite-tab` etc -- **NONE exist** | Keep consolidated tab. Replace mock tabs with real Dollor.ai dashboards OR remove |
| JiraDashboard | `/admin/jira-dashboard` | `/api/dashboard/jira/*` | NO | Remove from sidebar. JIRA is not integrated. |
| NetsuiteDashboard | `/admin/netsuite-dashboard` | `/api/dashboard/netsuite/*` | NO | Remove from sidebar. NetSuite is not integrated. |
| CoupaDashboard | `/admin/coupa-dashboard` | `/api/dashboard/coupa/*` | **YES - partially** (coupa endpoints exist at lines 8104-8474 in main_new.py) | Keep but audit -- Coupa endpoints exist in backend |
| SystemDashboard | (not in sidebar) | `/api/system-dashboard/*` | Only `/api/system-dashboard/coupa` exists | Remove -- not in sidebar anyway |
| AIDashboard | (not in sidebar) | Custom AI employee endpoints | Partially (menu review stats exist) | Not in sidebar -- low priority |
| Transactions | `/admin/transactions` | `/api/transactions/coupa`, `/api/transactions/netsuite` | NO backend endpoints exist | Remove or rewrite to show real platform transactions |
| Settings | (not in sidebar) | None | N/A | Placeholder -- no action needed |

### Backend Endpoints Available but NOT Used by Frontend

| Endpoint | Purpose | Could wire to |
|----------|---------|---------------|
| `GET /api/dashboard/stats` | Order stats, revenue, user counts | Main dashboard |
| `GET /api/dashboard/recent-activity` | Recent platform activity | Main dashboard activity feed |
| `GET /api/admin/vendors/all-documents` | All vendor documents | DocumentReview screen |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth headers on API calls | Manual token reading per screen | `api` axios instance from `api.ts` | Interceptor handles all token formats (token, id_token, access_token) |
| Vendor listing | Raw fetch to `/api/vendors` | `getVendors()` from `api.ts` | Already properly typed with auth |
| Dashboard stats | Fake/mock data objects | `GET /api/dashboard/stats` and `GET /api/dashboard/recent-activity` | These endpoints already exist with real data |

## Common Pitfalls

### Pitfall 1: Wrong localStorage Key for Token
**What goes wrong:** VendorManagement/Main.tsx reads `localStorage.getItem('auth_token')` at line 477 for the publish action, but admin login stores the token as `localStorage.setItem('token', access_token)` (Login.tsx:39).
**Why it happens:** Different developers used different key names.
**How to avoid:** Always use the `api` axios instance which checks `token`, `id_token`, and `access_token` keys automatically.
**Warning signs:** 401 errors on admin actions that use raw fetch.

### Pitfall 2: Mock Data Left Behind
**What goes wrong:** vendorManagement/Main.tsx still has `_mockVendors` state (lines 172-318) with hardcoded fake companies like "Tech Solutions Inc." and "Global Supplies Co."
**Why it happens:** Original development used mock data before backend was built.
**How to avoid:** Remove all `_mockVendors` state and related mock data. The `vendors` state from `fetchVendors()` is the real data.
**Warning signs:** Variables prefixed with `_` that are never used.

### Pitfall 3: ERP Dashboard Endpoints Don't Exist
**What goes wrong:** Dashboard tabs (Jira, NetSuite, ZIP, ProcessUtility, NetSuiteWolt) and standalone dashboards call endpoints that return 404/500.
**Why it happens:** Frontend was built aspirationally for ERP integrations that were never implemented.
**How to avoid:** Audit Apis.tsx against actual backend routes before assuming data will load.
**Warning signs:** Screens that show "Loading..." forever or display empty charts.

### Pitfall 4: Coupa Dashboard Partial Implementation
**What goes wrong:** Coupa endpoints DO exist in backend (lines 8104-8474) but the data may be mock/placeholder data served from the backend itself.
**Why it happens:** Backend Coupa endpoints were scaffolded but may return static data since no real Coupa integration exists.
**How to avoid:** Test each Coupa endpoint to see if it returns real or static data before keeping the screen.

### Pitfall 5: VendorManagement Data Mapping Issues
**What goes wrong:** VendorManagement/Main.tsx maps backend fields to a different frontend `Vendor` interface (line 127-163) that includes fields like `risk_rating`, `performance_score`, `contract_status` that don't exist in the backend model.
**Why it happens:** Frontend was designed for a generic vendor management system, not Dollor.ai's restaurant model.
**How to avoid:** Align the frontend Vendor interface with actual backend Vendor model fields (`onboarding_status`, `onboarding_phase`, `is_published`, etc.)

## Code Examples

### Fix: Replace raw fetch with api instance (VendorManagement/Main.tsx)

```typescript
// Before (broken -- no auth):
const fetchVendors = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/api/vendors`);
    const data = await response.json();
    // ...
  }
};

// After (fixed -- auth via interceptor):
import { getVendors } from '../../api/api';

const fetchVendors = async () => {
  try {
    const data = await getVendors();
    // data is already response.data thanks to api.ts
    const mappedVendors = data.map((v: BackendVendor) => ({
      // ... mapping
    }));
    setVendors(mappedVendors);
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
  }
};
```

### Fix: Replace raw fetch publish action

```typescript
// Before (broken -- wrong token key):
const token = localStorage.getItem('auth_token');
const response = await fetch(`${getApiUrl()}/api/admin/vendors/${vendor.id}/publish`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ platforms: ['ios', 'android', 'web'] })
});

// After (fixed -- uses api interceptor):
import api from '../../api/api';

const response = await api.post(`/admin/vendors/${vendor.id}/publish`, {
  platforms: ['ios', 'android', 'web']
});
```

### Fix: Main Dashboard to use real endpoints

```typescript
// The consolidated dashboard already calls /api/dashboard/consolidated which EXISTS
// But the tab-specific views (Jira, NetSuite, ZIP, etc.) call nonexistent endpoints

// Replace dashboard with real Dollor.ai stats:
import api from '../../api/api';

const fetchDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
  // Returns: { total_orders, total_revenue, total_customers, total_drivers, ... }
};

const fetchRecentActivity = async () => {
  const response = await api.get('/dashboard/recent-activity');
  return response.data;
};
```

## Files Requiring Changes

### High Priority (Broken -- 401 errors)
| File | Line(s) | Issue |
|------|---------|-------|
| `src/app/screens/vendorManagement/Main.tsx` | 123, 478, 512 | Raw `fetch()` without auth |
| `src/app/screens/vendorManagement/DocumentReview.tsx` | 100, 158, 196 | Raw `fetch()` without auth |
| `src/app/screens/vendorManagement/MenuReview.tsx` | 97, 106, 204, 231, 253 | Raw `fetch()` without auth |

### Medium Priority (Mock screens to remove/replace)
| File | Issue |
|------|-------|
| `src/app/screens/dashboard/Main.tsx` | Tabs reference mock ERP systems |
| `src/app/screens/dashboard/tabs/Jira.tsx` | Calls nonexistent `/api/dashboard/jira-tab` |
| `src/app/screens/dashboard/tabs/Netsuite.tsx` | Calls nonexistent `/api/dashboard/netsuite-tab` |
| `src/app/screens/dashboard/tabs/Zip.tsx` | Calls nonexistent `/api/dashboard/zip-tab` |
| `src/app/screens/dashboard/tabs/ProcessUtility.tsx` | Calls nonexistent endpoint |
| `src/app/screens/dashboard/tabs/NetSuiteWolt.tsx` | Calls nonexistent endpoint |
| `src/app/screens/jiraDashboard/Main.tsx` | Entire screen is mock |
| `src/app/screens/netsuiteDashboard/Main.tsx` | Entire screen is mock |
| `src/app/screens/systemDashboard/Main.tsx` | Entire screen is mock |
| `src/app/screens/transactions/Main.tsx` | Calls nonexistent transaction endpoints |
| `src/App.tsx` | Routes for mock screens |
| `src/app/components/layout/MainLayout.tsx` | Sidebar nav items for mock screens |
| `src/app/constants/Apis.tsx` | URL constants for nonexistent endpoints |
| `src/app/constants/mockData.ts` | Mock data file |
| `src/app/constants/mockNetSuiteTransactions.ts` | Mock NetSuite data |

### Low Priority (Cleanup)
| File | Issue |
|------|-------|
| `src/app/screens/vendorManagement/Main.tsx` | Remove `_mockVendors` state (lines 172-318), remove unused AI components |
| `src/app/screens/settings/Main.tsx` | Placeholder -- just says "Settings Main Screen" |
| `src/app/constants/Bridge.tsx` | Contains calls to nonexistent dashboard endpoints |

## Sidebar Navigation (Current vs Recommended)

### Current Sidebar Items
1. Dashboard (partially mock)
2. Food Delivery > Orders, Restaurants, Menu Review
3. Rideshare > Ride Requests, Active Rides
4. Partners > Restaurants, Drivers, Document Review, Onboarding (ZIP)
5. Finance > Platform Revenue, Financial Reports, Settlement
6. ERP > Coupa (Procurement), NetSuite (Accounting), JIRA (Support), Transactions
7. Customers
8. Project Tracker
9. Change Management
10. Invoices

### Recommended Sidebar (Remove mock ERP)
1. Dashboard (rewired to real stats)
2. Food Delivery > Orders, Restaurants, Menu Review
3. Rideshare > Ride Requests, Active Rides
4. Partners > Restaurants, Drivers, Document Review, Onboarding (ZIP)
5. Finance > Platform Revenue, Financial Reports, Settlement
6. ~~ERP~~ (REMOVE -- no real integrations)
7. Customers
8. Project Tracker
9. Change Management
10. Invoices

## Open Questions

1. **Should Coupa Dashboard be kept?**
   - What we know: Backend has Coupa endpoints (8 routes at `/api/dashboard/coupa/*`)
   - What's unclear: Whether these return real data or mock data
   - Recommendation: Test the Coupa endpoints. If they return real data, keep. If mock, remove with the other ERP screens.

2. **Should Transactions screen be rewritten or removed?**
   - What we know: Currently calls `/api/transactions/coupa` and `/api/transactions/netsuite` which don't exist
   - What's unclear: Whether admin needs a transactions view for Stripe payments
   - Recommendation: Remove for now. The Finance section already covers revenue/payouts. Can add real Stripe transaction view in a future phase.

3. **Should the AI Dashboard be accessible?**
   - What we know: Not in sidebar navigation. Has partial backend support (menu review stats).
   - Recommendation: Leave as-is (not in sidebar). Not broken, just hidden.

## Sources

### Primary (HIGH confidence)
- Direct codebase audit of all files in `apps/web/p2p-platform/frontend/src/app/screens/`
- Direct grep of all backend endpoints in `main_new.py`, `accounting_module.py`, `project_tracker.py`, `change_management.py`
- `api.ts` interceptor code (line 39-58) -- verified auth header injection
- `Login.tsx` line 39 -- verified `localStorage.setItem('token', access_token)`
- `vendorManagement/Main.tsx` line 123 -- verified raw `fetch()` without auth
- `Apis.tsx` -- verified URL constants for nonexistent endpoints

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - direct inspection of package.json and existing code
- Architecture: HIGH - complete audit of all 30+ admin screens
- Pitfalls: HIGH - verified each issue by checking both frontend calls and backend endpoints

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- internal codebase, not external dependencies)
