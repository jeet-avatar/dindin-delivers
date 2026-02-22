# Phase 02: Vendor + Admin Endpoint Auth - Research

**Researched:** 2026-02-21
**Domain:** FastAPI per-endpoint authentication (vendor + admin roles)
**Confidence:** HIGH

## Summary

Phase 02 completes the migration from middleware-only auth to per-endpoint `Depends()` auth for all vendor and admin endpoints in `main_new.py`. Phase 01 established the pattern by converting 49 customer endpoints, 18 driver endpoints, 16 shared ride endpoints, and 35 `bid_routes.py` endpoints. The auth utilities (`require_vendor`, `require_admin`) already exist in `auth_utils.py` and have been proven in production.

The work breaks into three distinct groups: (A) vendor endpoints that currently use `get_current_user` or `get_current_vendor` or manual JWT decode, (B) admin endpoints that currently use `get_current_user` or manual JWT decode, and (C) admin portal / ERP endpoints (invoices, clients, dashboard, tickets, chat, accounting, procurement) that use `get_current_user` as a generic auth check. Group C is the largest by count (~70 endpoints) and requires careful role classification.

**Primary recommendation:** Follow the exact Phase 01 pattern -- replace `get_current_user`/`get_current_vendor`/manual JWT with `Depends(require_vendor)` or `Depends(require_admin)` or `Depends(require_any_auth)` depending on endpoint purpose. Admin middleware remains as defense-in-depth. No new auth utilities needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-03 | All vendor endpoints have per-endpoint `Depends(require_vendor)` with ownership checks | Research identifies 31 vendor endpoints needing conversion across 4 auth patterns (see Endpoint Inventory) |
| AUTH-04 | All admin endpoints have per-endpoint `Depends(require_admin)` role checks | Research identifies 25 admin endpoints needing conversion across 3 auth patterns |
| AUTH-05 | All remaining middleware-only endpoints converted to per-endpoint `Depends()` | Research identifies ~70 admin portal/ERP endpoints using `get_current_user` that need role-appropriate Depends() |
| AUTH-06 | Zero endpoints rely solely on global middleware for auth -- every endpoint has an explicit `Depends()` | Full inventory below confirms all `get_current_user` usages; verification via grep after conversion |
</phase_requirements>

## Standard Stack

### Core (Already in Place)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `auth_utils.py` | N/A | `require_vendor`, `require_admin`, `require_any_auth` | **EXISTS** -- used in Phase 01, no changes needed |
| FastAPI `Depends()` | 0.104+ | Dependency injection for auth | **EXISTS** -- standard FastAPI pattern |

### No New Dependencies
Phase 02 requires zero new libraries, files, or utilities. Everything needed was created in Phase 01 (`auth_utils.py`).

## Architecture Patterns

### Pattern 1: Vendor Endpoint with Ownership Check (AUTH-03)
**What:** Replace `get_current_user` + manual role/vendor_id check with `Depends(require_vendor)` + ownership check.
**When:** Vendor endpoints where the authenticated vendor should only access their own data via `{vendor_id}` path param.
**Example:**
```python
# BEFORE (current):
@app.put("/api/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(vendor_id: int, vendor: VendorCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    ...

# AFTER:
@app.put("/api/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(vendor_id: int, vendor: VendorCreate, db: Session = Depends(get_db),
                  _auth_vendor: Vendor = Depends(require_vendor)):
    if _auth_vendor.id != vendor_id:
        raise HTTPException(status_code=403, detail="Access denied - not your vendor account")
    ...
```

### Pattern 2: Vendor Endpoint without Path Param (self-access)
**What:** Replace `get_current_user` role check with `Depends(require_vendor)` for endpoints where vendor accesses their own data (e.g., `/api/vendor/profile`, `/api/vendor/my-documents`).
**When:** Endpoints like `GET /api/vendor/profile` that use `current_user.vendor_id` to look up the vendor.
**Example:**
```python
# BEFORE:
@app.get("/api/vendor/profile")
def get_vendor_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.VENDOR or not current_user.vendor_id:
        raise HTTPException(status_code=403, detail="Not a vendor account")
    vendor = db.query(Vendor).filter(Vendor.id == current_user.vendor_id).first()
    ...

# AFTER:
@app.get("/api/vendor/profile")
def get_vendor_profile(db: Session = Depends(get_db), vendor: Vendor = Depends(require_vendor)):
    return vendor  # require_vendor already returns the Vendor ORM object
```

### Pattern 3: Vendor Stripe Endpoints with Manual JWT Decode
**What:** Replace inline `jwt.decode()` + manual vendor_id check with `Depends(require_vendor)` + ownership check.
**When:** Vendor Stripe endpoints at lines 5003-5264 that do their own JWT parsing.
**Example:**
```python
# BEFORE (manual JWT decode):
@app.post("/api/vendors/{vendor_id}/stripe/connect")
def create_vendor_stripe_account(vendor_id: int, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_vendor_id = payload.get("vendor_id")
        token_role = payload.get("role")
        if token_role != "admin" and token_vendor_id != vendor_id:
            raise HTTPException(status_code=403, ...)
    except JWTError:
        raise HTTPException(status_code=401, ...)
    ...

# AFTER:
@app.post("/api/vendors/{vendor_id}/stripe/connect")
def create_vendor_stripe_account(vendor_id: int, _auth_vendor: Vendor = Depends(require_vendor), db: Session = Depends(get_db)):
    if _auth_vendor.id != vendor_id:
        raise HTTPException(status_code=403, detail="Access denied - not your vendor account")
    ...
```

### Pattern 4: Admin Endpoint Conversion
**What:** Replace `get_current_user` + manual admin role check with `Depends(require_admin)`.
**When:** Admin endpoints that check `current_user.role != UserRole.ADMIN`.
**Example:**
```python
# BEFORE:
@app.post("/api/admin/vendors/{vendor_id}/documents/{document_type}/approve")
def admin_approve_document(vendor_id: int, document_type: str, request: AdminDocumentReviewRequest,
                           db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    ...

# AFTER:
@app.post("/api/admin/vendors/{vendor_id}/documents/{document_type}/approve")
def admin_approve_document(vendor_id: int, document_type: str, request: AdminDocumentReviewRequest,
                           db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    ...
```

### Pattern 5: Admin Endpoint with Manual JWT Decode
**What:** Replace inline `jwt.decode()` + manual admin check with `Depends(require_admin)`.
**When:** Admin endpoints that parse JWT manually (e.g., cleanup endpoints, schema, routes).
**Example:**
```python
# BEFORE (manual JWT decode):
@app.post("/api/admin/cleanup/pending-orders")
def admin_cleanup_pending_orders(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_user = db.query(User).filter(User.email == payload.get("sub")).first()
        if not admin_user or admin_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, ...)
    except JWTError:
        raise HTTPException(status_code=401, ...)
    ...

# AFTER:
@app.post("/api/admin/cleanup/pending-orders")
def admin_cleanup_pending_orders(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    ...
```

### Pattern 6: Admin Portal Endpoints (Generic Auth)
**What:** Replace `get_current_user` with `Depends(require_admin)` for admin portal features.
**When:** Invoice, client, dashboard, ticket, accounting, procurement endpoints that are admin portal features.
**Example:**
```python
# BEFORE:
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ...

# AFTER:
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    ...
```

### Pattern 7: `get_current_vendor` Replacement
**What:** Replace `get_current_vendor` (inline in `main_new.py:1126`) with `require_vendor` from `auth_utils.py`.
**When:** Vendor endpoints at lines 10547-10727 that use `Depends(get_current_vendor)`.
**Note:** `get_current_vendor` and `require_vendor` have identical logic (JWT -> vendor_id -> Vendor ORM). The only difference is `get_current_vendor` is defined in `main_new.py` while `require_vendor` is in `auth_utils.py`. After migration, `get_current_vendor` becomes dead code.

### Anti-Patterns to Avoid
- **Admin bypass in vendor endpoints:** Phase 01 decision -- admin uses admin-specific endpoints, not vendor endpoints. Do NOT add `or admin` checks to vendor ownership.
- **String comparison for role:** Use `UserRole.ADMIN` enum, not `"admin"` string. Phase 01 found bugs from `payload.get("role") != "admin"` -- this fails when role is enum.
- **Leaving `get_current_user` imports:** After Phase 02, `get_current_user` and `get_current_vendor` should have zero callers in endpoint signatures. They remain for `get_current_user_info` (GET /api/auth/me) which is an any-auth endpoint.

## Endpoint Inventory

### Group A: Vendor Endpoints Needing Conversion (31 endpoints)

#### A1. Currently using `get_current_user` with vendor_id ownership check (14 endpoints)
| Line | Method | Path | Current Auth | Target Auth |
|------|--------|------|-------------|-------------|
| 10225 | POST | `/api/vendors` | `get_current_user` + admin check | `require_admin` (creates vendor) |
| 10519 | GET | `/api/vendors/{vendor_id}` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |
| 10533 | GET | `/api/vendor/profile` | `get_current_user` + role check | `require_vendor` (self-access) |
| 10847 | PUT | `/api/vendors/{vendor_id}` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |
| 10898 | PATCH | `/api/vendors/{vendor_id}` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |
| 11186 | PUT | `/api/vendors/{vendor_id}/online-status` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |
| 11296 | GET | `/api/vendors/{vendor_id}/documents` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |
| 11345 | POST | `/api/vendors/{vendor_id}/documents` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |
| 11408 | DELETE | `/api/vendors/{vendor_id}/documents/{id}` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |
| 11435 | PATCH | `/api/vendors/{vendor_id}/documents` | `get_current_user` | `require_vendor` + ownership |
| 11457 | DELETE | `/api/vendors/{vendor_id}` | `get_current_user` + admin only | `require_admin` (destructive) |
| 11728 | GET | `/api/vendor/my-documents` | `get_current_user` + role check | `require_vendor` (self-access) |
| 11807 | POST | `/api/vendor/my-documents/upload` | `get_current_user` + role check | `require_vendor` (self-access) |
| 13598 | POST | `/api/vendors/{vendor_id}/menu` | `get_current_user` + admin-or-owner | `require_vendor` + ownership |

#### A2. Currently using `get_current_vendor` (4 endpoints)
| Line | Method | Path | Current Auth | Target Auth |
|------|--------|------|-------------|-------------|
| 10547 | GET | `/api/vendor/earnings` | `get_current_vendor` | `require_vendor` (self-access) |
| 10629 | GET | `/api/vendor/kot-config` | `get_current_vendor` | `require_vendor` (self-access) |
| 10656 | PUT | `/api/vendor/kot-config` | `get_current_vendor` | `require_vendor` (self-access) |
| 10726 | POST | `/api/vendor/kot-test` | `get_current_vendor` | `require_vendor` (self-access) |

#### A3. Currently using manual JWT decode (6 endpoints)
| Line | Method | Path | Current Auth | Target Auth |
|------|--------|------|-------------|-------------|
| 5003 | POST | `/api/vendors/{id}/stripe/connect` | manual JWT + vendor_id/admin | `require_vendor` + ownership |
| 5081 | GET | `/api/vendors/{id}/stripe/onboarding-link` | manual JWT + vendor_id/admin | `require_vendor` + ownership |
| 5159 | GET | `/api/vendors/{id}/stripe/status` | manual JWT + vendor_id/admin | `require_vendor` + ownership |
| 5245 | POST | `/api/vendors/{id}/stripe/dashboard-link` | manual JWT + vendor_id/admin | `require_vendor` + ownership |
| 12709 | PATCH | `/api/vendors/{id}/location` | manual JWT + vendor_id/admin | `require_vendor` + ownership |
| 13827 | POST | `/api/vendors/{id}/register-app` | manual JWT + vendor_id/admin | `require_vendor` + ownership |

#### A4. Currently using `get_current_user` but need different auth (7 endpoints)
| Line | Method | Path | Current Auth | Target Auth | Reason |
|------|--------|------|-------------|-------------|--------|
| 10941 | PATCH | `/api/vendors/{id}/status` | `get_current_user` + admin only | `require_admin` | Only admin changes status |
| 11241 | POST | `/api/vendors/{id}/create-account` | `get_current_user` + admin only | `require_admin` | Admin creates vendor accounts |
| 13744 | PUT | `/api/vendors/{id}/menu/{item_id}` | `get_current_user` (no ownership!) | `require_vendor` + ownership | **Missing ownership check** |
| 13800 | DELETE | `/api/vendors/{id}/menu/{item_id}` | `get_current_user` (no ownership!) | `require_vendor` + ownership | **Missing ownership check** |
| 17483 | GET | `/api/vendors/{id}/reviews` | `get_current_user` (no ownership!) | `require_vendor` + ownership | Vendor views own reviews |
| 17948 | POST | `/api/erp/vendors/{id}/fcm-token` | `get_current_user` (no ownership!) | `require_vendor` + ownership | **Missing ownership check** |
| 18001 | DELETE | `/api/erp/vendors/{id}/fcm-token` | `get_current_user` (no ownership!) | `require_vendor` + ownership | **Missing ownership check** |
| 20918 | GET | `/api/vendors/{id}/ai-insights` | `get_current_user` (no ownership!) | `require_vendor` + ownership | Vendor views own insights |

### Group B: Admin Endpoints Needing Conversion (25 endpoints)

#### B1. Admin endpoints using `get_current_user` + admin role check (13 endpoints)
| Line | Method | Path | Notes |
|------|--------|------|-------|
| 1623 | DELETE | `/api/auth/admin/legacy-cleanup` | Convert to `require_admin` |
| 11484 | POST | `/api/admin/vendors/{id}/documents/{type}/approve` | Convert to `require_admin` |
| 11533 | POST | `/api/admin/vendors/{id}/documents/{type}/reject` | Convert to `require_admin` |
| 11579 | POST | `/api/admin/vendors/{id}/documents/upload` | Convert to `require_admin` |
| 11954 | POST | `/api/admin/menu/{id}/approve` | Convert to `require_admin` |
| 11988 | POST | `/api/admin/menu/{id}/reject` | Convert to `require_admin` |
| 12025 | POST | `/api/admin/menu/{id}/flag` | Convert to `require_admin` |
| 12576 | POST | `/api/admin/vendors/{id}/verify-menu` | Convert to `require_admin` |
| 12630 | POST | `/api/admin/vendors/{id}/publish` | Convert to `require_admin` |
| 12808 | POST | `/api/admin/vendors/{id}/unpublish` | Convert to `require_admin` |
| 12852 | GET | `/api/admin/vendors/{id}/publish-checklist` | Convert to `require_admin` |
| 12924 | GET | `/api/admin/vendors/all-documents` | Convert to `require_admin` |
| 20378 | GET | `/api/admin/drivers` | Convert to `require_admin` |
| 20474 | POST | `/api/admin/drivers/{id}/set-documents` | Convert to `require_admin` |
| 20529 | POST | `/api/admin/drivers/{id}/verify` | Convert to `require_admin` |

#### B2. Admin endpoints using manual JWT decode (5 endpoints)
| Line | Method | Path | Notes |
|------|--------|------|-------|
| 20183 | GET | `/api/admin/rideshare/requests` | manual JWT decode |
| 20281 | GET | `/api/admin/rideshare/active` | manual JWT decode |
| 20572 | POST | `/api/admin/cleanup/pending-orders` | manual JWT decode |
| 20641 | POST | `/api/admin/cleanup/all-incomplete` | manual JWT decode |
| 20728 | GET | `/api/admin/database/schema` | manual JWT decode |

#### B3. Admin endpoints using manual JWT decode (token-only) (2 endpoints)
| Line | Method | Path | Notes |
|------|--------|------|-------|
| 20782 | GET | `/api/admin/api/routes` | JWT decode only, no role check! |
| 20828 | GET | `/api/admin/api/duplicates` | No auth at all! |

#### B4. Admin endpoints with `ADMIN_SECRET_KEY` only -- keep as-is (already auth'd)
| Line | Method | Path | Notes |
|------|--------|------|-------|
| 523 | POST | `/api/admin/backfill-payouts` | ADMIN_SECRET_KEY -- keep |
| 569 | POST | `/api/admin/migrate` | ADMIN_SECRET_KEY -- keep |
| 11672 | POST | `/api/admin/set-document-status` | body-based secret -- keep |
| 19213 | POST | `/api/admin/cleanup-expired-bids` | **NO AUTH!** -- needs `require_admin` |

#### B5. Quick-publish with manual JWT (admin-only, not under `/api/admin/` prefix)
| Line | Method | Path | Notes |
|------|--------|------|-------|
| 12747 | POST | `/api/vendors/{id}/quick-publish` | manual JWT admin check -- convert to `require_admin` |

### Group C: Admin Portal Endpoints using `get_current_user` (~70 endpoints)

These are all admin portal features (invoice, client, dashboard, ticket, accounting, procurement) that currently use `Depends(get_current_user)` without specific role checks. They need `Depends(require_admin)` since they are admin-only features.

#### C1. Client endpoints (5)
Lines: 7299, 7308, 7324, 7332, 7346

#### C2. Invoice endpoints (15)
Lines: 7363, 7418, 7466, 7566, 7580, 7594, 7609, 7634, 7648, 7752, 7801, 7853, 7903, 7956, 8002, 8062

#### C3. Dashboard endpoints (2)
Lines: 8096, 8176

#### C4. Coupa dashboard/procurement endpoints (10)
Lines: 8331, 8376, 8425, 8464, 8512, 8561, 8606, 8641, 8660, 8679, 8698

#### C5. Orders endpoint (1)
Line: 8724 (`/api/orders` -- already has admin-vs-non-admin logic, but uses `get_current_user`)

#### C6. Accounting endpoints (~4)
Lines: 9005, 9143, 9250, 9314, 9366

#### C7. Ticket/helpdesk endpoints (8)
Lines: 9250, 9314, 9366, 9419, 9451, 9486, 9521, 9582

#### C8. Chat endpoints (4)
Lines: 16086, 16769, 16837, 16880

#### C9. Delivery decision endpoints (4)
Lines: 16109, 16151, 16247, (and send_chat_message at 16086)

#### C10. Debug endpoint (1)
Line: 19127 (`/api/debug/order/{id}` -- dev only, blocked in production)

#### C11. Vendor-related admin portal endpoints (1)
Line: 12985 (admin vendor docs summary -- already verified)

### Group D: Already Converted (no work needed)
These endpoints already use `require_vendor`, `require_admin`, or `require_any_auth`:
- `/api/vendors/{id}/bank-account` (line 5448) -- `require_vendor`
- `/api/erp/payouts/vendor/{id}` (line 5496) -- `require_vendor`
- `/api/dashboard/consolidated` (line 8229) -- `require_admin`
- `/api/vendors` GET (line 10245) -- `require_admin`
- `/api/erp/orders/{id}/print-kot` (line 10809) -- `require_vendor`
- `/api/vendors/{id}/publish-checklist` (line 11083) -- `require_vendor`
- `/api/vendors/{id}/menu/{id}/customizations` (line 13768) -- `require_vendor`
- `/api/vendors/{id}/upload-image` (line 14352) -- `require_vendor`
- `/api/vendors/{id}/assign-stock-image` (line 14412) -- `require_vendor`
- `/api/vendors/{id}/menu/assign-stock-images` (line 14447) -- `require_vendor`
- `/api/ai/menu/review-all/{id}` (line 12156) -- `require_admin`
- `/api/ai/menu/review-item/{id}` (line 12214) -- `require_admin`
- `/api/ai/vendor/check-publish-ready/{id}` (line 12348) -- `require_admin`
- `/api/ai/vendor/auto-publish/{id}` (line 12367) -- `require_admin`
- `/api/ai/process-new-vendor/{id}` (line 12381) -- `require_admin`
- `/api/ai/dashboard` (line 12443) -- `require_admin`
- `/api/ai/menu/pending` (line 12505) -- `require_admin`

### Endpoints to Skip (public or appropriately auth'd)
- `/api/vendors/published` (line 10358) -- PUBLIC, no auth needed
- `/api/vendors/{id}/menu` GET (line 13653) -- PUBLIC (in middleware allowlist as regex)
- `/api/vendors/{id}/menu/categories` (line 13816) -- PUBLIC (menu browsing)
- `/api/vendors/public` (line 9805) -- PUBLIC registration
- `/api/vendors/public/{id}/documents` (line 9932, 10018) -- PUBLIC document upload
- `/api/vendors/public-with-menu` (line 10071) -- PUBLIC registration
- `/api/vendor/password-reset/*` (lines 6423, 6452) -- PUBLIC password reset
- `/api/admin/login` (line 1658) -- PUBLIC login
- `/api/auth/admin/demo-login` (line 1641) -- disabled stub

## Total Count Summary

| Group | Count | Current Auth | Target Auth |
|-------|-------|-------------|-------------|
| A: Vendor endpoints | 31 | get_current_user / get_current_vendor / manual JWT | require_vendor + ownership |
| B: Admin endpoints | 25 | get_current_user / manual JWT / NONE | require_admin |
| C: Admin portal | ~70 | get_current_user (generic) | require_admin |
| D: Already done | 17 | require_vendor / require_admin | no change |
| Skip: Public | 9 | none / appropriate | no change |
| **Total to convert** | **~126** | | |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Inline `jwt.decode()` | `auth_utils.require_vendor` | DRY, consistent error messages, tested |
| Vendor lookup from JWT | Manual `payload.get("vendor_id")` | `require_vendor` returns Vendor ORM | Already does vendor_id + email fallback |
| Admin role check | `current_user.role != UserRole.ADMIN` | `require_admin` returns User | Returns 401/403 automatically |
| Generic auth check | `get_current_user` | `require_any_auth` | Returns JWT payload dict, no DB query |

**Key insight:** Every auth pattern needed for Phase 02 already exists in `auth_utils.py`. The only work is replacing old patterns with new ones.

## Common Pitfalls

### Pitfall 1: Admin Bypass in Vendor Endpoints
**What goes wrong:** Adding `or admin` checks to vendor ownership (e.g., `if _auth_vendor.id != vendor_id and admin_user.role != ADMIN`).
**Why it happens:** The old pattern had admin-or-owner checks. Developers might copy it.
**How to avoid:** Phase 01 decision -- admin uses admin-specific endpoints. Vendor endpoints ONLY accept vendor JWTs. If an admin needs to manage a vendor, use `/api/admin/vendors/{id}/*` endpoints.
**Warning signs:** Any `Depends(require_admin)` in a vendor endpoint, or `role == ADMIN` checks alongside `require_vendor`.

### Pitfall 2: Missing Ownership Checks
**What goes wrong:** Converting `get_current_user` to `require_vendor` but forgetting to check `_auth_vendor.id != vendor_id`.
**Why it happens:** Some existing endpoints have NO ownership check at all (see lines 13744, 13800, 17483, 17948, 18001, 20918 in Group A4).
**How to avoid:** Every `{vendor_id}` path param endpoint MUST have `if _auth_vendor.id != vendor_id: raise HTTPException(403)`.
**Warning signs:** `Depends(require_vendor)` without a subsequent `vendor_id` comparison.

### Pitfall 3: Forgetting `get_current_vendor` is Different from `get_current_user`
**What goes wrong:** Treating `get_current_vendor` the same as `get_current_user`. `get_current_vendor` returns a `Vendor` ORM object directly, while `get_current_user` returns a `User` ORM object.
**Why it happens:** Two vendor auth helpers exist (`get_current_vendor` at line 1126, `get_current_vendor_user` at line 2509).
**How to avoid:** `require_vendor` returns `Vendor` (like `get_current_vendor`), so it's a drop-in replacement for `get_current_vendor`. For `get_current_user` endpoints, you need to remove the `current_user.vendor_id` lookups.

### Pitfall 4: Admin Middleware Double-Auth
**What goes wrong:** Worrying that adding `Depends(require_admin)` to `/api/admin/*` endpoints conflicts with `admin_auth_middleware`.
**Why it happens:** The middleware already checks admin JWT for all `/api/admin/*` paths.
**How to avoid:** Defense in depth is fine. The middleware is a safety net; per-endpoint `Depends(require_admin)` is the primary auth. Both can coexist. The middleware passes the request through if auth succeeds, then `require_admin` also verifies. This is the design.

### Pitfall 5: `ADMIN_SECRET_KEY` Endpoints
**What goes wrong:** Converting ADMIN_SECRET_KEY-protected endpoints to `require_admin` JWT auth, breaking ops/migration scripts that use secret_key.
**Why it happens:** Some admin endpoints accept `ADMIN_SECRET_KEY` query param instead of JWT (e.g., `/api/admin/migrate`, `/api/admin/backfill-payouts`).
**How to avoid:** Leave ADMIN_SECRET_KEY endpoints as-is. They have their own auth mechanism. The middleware also accepts ADMIN_SECRET_KEY. Only convert endpoints that use `get_current_user` or `token: str = Depends(oauth2_scheme)`.

### Pitfall 6: Chat/Order Endpoints Are Multi-Role
**What goes wrong:** Converting chat/delivery endpoints to `require_admin` when they should accept any authenticated user.
**Why it happens:** Chat messages are sent by customers AND drivers AND admin. Delivery decisions are made by restaurant vendors.
**How to avoid:** Chat endpoints (lines 16086, 16769, 16837, 16880) should use `require_any_auth` not `require_admin`. Delivery decision endpoints (lines 16109, 16151, 16247) should use `require_vendor` since restaurants make delivery decisions. Debug endpoint (line 19127) should use `require_admin`.

### Pitfall 7: `/api/orders` Has Mixed Access
**What goes wrong:** Converting `/api/orders` to `require_admin` breaks vendor order listing.
**Why it happens:** The endpoint has conditional logic: admins see all orders, non-admins see only their own.
**How to avoid:** Use `require_any_auth` for `/api/orders` and keep the existing admin-vs-non-admin filter logic. Or convert to `require_admin` if only admin portal uses it (verify with iOS/Android first).

### Pitfall 8: cleanup-expired-bids Has No Auth
**What goes wrong:** The endpoint `POST /api/admin/cleanup-expired-bids` (line 19213) has NO auth at all -- no `get_current_user`, no `token`, no `ADMIN_SECRET_KEY`. Only protected by `admin_auth_middleware`.
**Why it happens:** It was likely intended to be called by a cron/scheduler.
**How to avoid:** Add `Depends(require_admin)` to make it explicitly auth'd at the endpoint level. The middleware is already protecting it, but AUTH-06 requires every endpoint has explicit `Depends()`.

## Code Examples

### Converting Vendor Stripe Endpoint (Pattern 3)
```python
# File: main_new.py, line ~5003
# BEFORE:
@app.post("/api/vendors/{vendor_id}/stripe/connect")
def create_vendor_stripe_account(
    vendor_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_vendor_id = payload.get("vendor_id")
        token_role = payload.get("role")
        if token_role != "admin" and token_vendor_id != vendor_id:
            raise HTTPException(status_code=403, detail="You can only manage your own Stripe account")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    # ... rest of function

# AFTER:
@app.post("/api/vendors/{vendor_id}/stripe/connect")
def create_vendor_stripe_account(
    vendor_id: int,
    _auth_vendor: Vendor = Depends(require_vendor),
    db: Session = Depends(get_db)
):
    if _auth_vendor.id != vendor_id:
        raise HTTPException(status_code=403, detail="Access denied - not your vendor account")
    # ... rest of function (remove manual JWT block)
```

### Converting Admin Manual JWT Endpoint (Pattern 5)
```python
# File: main_new.py, line ~20572
# BEFORE:
@app.post("/api/admin/cleanup/pending-orders")
def admin_cleanup_pending_orders(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_user = db.query(User).filter(User.email == payload.get("sub")).first()
        if not admin_user or admin_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Admin access required")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token", headers={"WWW-Authenticate": "Bearer"})
    # ... rest of function

# AFTER:
@app.post("/api/admin/cleanup/pending-orders")
def admin_cleanup_pending_orders(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # ... rest of function (remove manual JWT block)
```

### Dead Code Cleanup After Phase 02
```python
# After all conversions, verify these have ZERO callers in endpoint signatures:
# - get_current_user (except GET /api/auth/me which is any-auth)
# - get_current_vendor (line 1126)
# - get_current_vendor_user (line 2509)
# If zero callers, mark as dead code (but don't delete yet -- do that in a separate commit)
```

## Special Cases

### 1. `GET /api/auth/me` (line 2523)
Uses `get_current_user` and should continue to -- it returns the current user info regardless of role. Convert to `require_any_auth` + manual User lookup, OR leave as `get_current_user` since it's the one legitimate use case for "any authenticated User object."

### 2. `POST /api/admin/set-document-status` (line 11672)
Uses body-based `admin_secret` field, NOT JWT auth. Already exempt from admin middleware. Leave as-is. It has its own ADMIN_SECRET_KEY check.

### 3. `POST /api/admin/backfill-payouts` and `POST /api/admin/migrate`
Use ADMIN_SECRET_KEY query param. Already auth'd by middleware + their own check. Leave as-is.

### 4. `POST /api/admin/cleanup-expired-bids` (line 19213)
**NO AUTH AT ALL.** Only protected by admin middleware (defense-in-depth). Must add `Depends(require_admin)` for AUTH-06 compliance.

### 5. `GET /api/admin/api/duplicates` (line 20828)
**NO AUTH AT ALL.** Not even `token = Depends(oauth2_scheme)`. Only protected by admin middleware. Must add `Depends(require_admin)`.

### 6. `GET /api/admin/rideshare/requests` and `GET /api/admin/rideshare/active`
Use manual JWT but accept any valid token, not just admin. The middleware enforces admin, but the endpoint-level code only decodes JWT without role check. Convert to `Depends(require_admin)`.

## Verification Strategy

After all conversions, run these verification steps:

1. **grep for `get_current_user` in endpoint signatures:** Should only appear in `GET /api/auth/me`
2. **grep for `get_current_vendor` in endpoint signatures:** Should be ZERO
3. **grep for `token: str = Depends(oauth2_scheme)` in endpoint signatures:** Should only appear in ADMIN_SECRET_KEY endpoints (backfill-payouts, migrate) and public endpoints
4. **grep for endpoints with no auth param:** Every `@app.` decorated function should have at least one `Depends()` param for auth (except public endpoints in the allowlist)
5. **Run full test suite:** `pytest tests/ -v` -- all 890 tests should pass
6. **Spot-check 5 vendor endpoints:** curl without token -> 401, curl with customer token -> 401, curl with vendor token for wrong vendor -> 403, curl with correct vendor token -> 200
7. **Spot-check 5 admin endpoints:** curl without token -> 401, curl with non-admin token -> 403, curl with admin token -> 200

## Open Questions

1. **`GET /api/orders` -- admin-only or multi-role?**
   - What we know: Currently has admin-vs-non-admin conditional filtering. Admin sees all, vendor sees own.
   - What's unclear: Does any mobile app call this endpoint for vendors? If so, it needs `require_any_auth` with vendor filter logic.
   - Recommendation: Use `require_any_auth` and keep existing filter logic. This preserves backward compatibility.

2. **Chat endpoints -- which role?**
   - What we know: Chat is used by customers (order chat), drivers (delivery chat), and admin (web frontend).
   - What's unclear: Should chat endpoints verify the user is a participant in the order?
   - Recommendation: Use `require_any_auth` for Phase 02. Participant verification is a deeper IDOR fix for a later phase.

3. **Delivery decision endpoints -- vendor or any?**
   - What we know: `start-delivery-decision`, `confirm-delivery-decision`, `delivery-decision-status` are called by the restaurant app.
   - What's unclear: Is `_user = Depends(get_current_user)` actually used or just for auth check?
   - Recommendation: Convert to `require_vendor` since these are restaurant-only operations.

## Sources

### Primary (HIGH confidence)
- `/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/auth_utils.py` -- all 5 auth functions verified
- `/Users/jeet/doordash-p2p/apps/web/p2p-platform/backend/main_new.py` -- full endpoint inventory from code review
- `/Users/jeet/doordash-p2p/.planning/phases/01-customer-driver-endpoint-auth/.continue-here.md` -- Phase 01 decisions
- `/Users/jeet/doordash-p2p/.planning/REQUIREMENTS.md` -- AUTH-03 through AUTH-06 requirement definitions

### Secondary (MEDIUM confidence)
- `/Users/jeet/doordash-p2p/.planning/STATE.md` -- project decisions from Phase 01
- `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` -- success criteria for Phase 02

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all auth utilities exist and are proven in production
- Architecture: HIGH -- patterns are exact copies of Phase 01 patterns, already used successfully on ~118 endpoints
- Pitfalls: HIGH -- based on actual bugs found during Phase 01 (admin bypass, missing ownership, string vs enum)
- Endpoint inventory: HIGH -- grep-verified against actual codebase with line numbers

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days -- stable domain, no external dependencies)
