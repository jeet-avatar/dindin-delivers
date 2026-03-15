---
created: 2026-03-14T00:00:00Z
title: "main_new.py miscellaneous RBAC + IDOR — FCM tokens, driver location, tracking"
area: security/rbac
severity: HIGH
files:
  - apps/web/p2p-platform/backend/main_new.py
---

## Problem

Several endpoint groups in `main_new.py` use `require_any_auth` when they should use role-specific auth with IDOR checks. Key issues:
- FCM token endpoints: any user can register/unregister push tokens for any other user
- Driver location: any user can spoof any driver's GPS location
- Order/ride tracking: no participant verification

## Affected Endpoints

### FCM Token Registration (should be role-specific + IDOR)
| Endpoint | Should Be | IDOR Check |
|----------|-----------|------------|
| `POST /api/erp/customers/{id}/fcm-token` | require_customer | auth customer.id == path id |
| `POST /api/erp/drivers/{id}/fcm-token` | require_driver | auth driver.id == path id |
| `POST /api/erp/vendors/{id}/fcm-token` | require_vendor | auth vendor.id == path id |
| `DELETE /api/erp/customers/{id}/fcm-token` | require_customer | auth customer.id == path id |
| `DELETE /api/erp/drivers/{id}/fcm-token` | require_driver | auth driver.id == path id |
| `DELETE /api/erp/vendors/{id}/fcm-token` | require_vendor | auth vendor.id == path id |

### Driver Location (should be require_driver + IDOR)
| Endpoint | Should Be | IDOR Check |
|----------|-----------|------------|
| `POST /api/driver/location` | require_driver | Use auth driver.id, not from body |
| `PUT /api/erp/drivers/{id}/location` | require_driver | auth driver.id == path id |

### Order/Ride Tracking (need participant checks)
| Endpoint | Should Be | IDOR Check |
|----------|-----------|------------|
| `GET /api/customer/orders/{id}/track` | require_customer | Verify customer owns order |
| `GET /api/rides/{id}/track` | require_any_auth | Verify user is ride participant |
| `GET /api/customer/{id}/active-orders` | require_customer | auth customer.id == path id |
| `GET /api/erp/rides/{id}/status` | require_any_auth | Verify user is ride participant |
| `GET /api/erp/rides/{id}/full-tracking` | require_any_auth | Verify user is ride participant |

### Delivery Decision (should be vendor/admin)
| Endpoint | Should Be |
|----------|-----------|
| `POST /api/erp/orders/{id}/start-delivery-decision` | require_vendor or require_admin |
| `POST /api/erp/orders/{id}/restaurant-delivery-decision` | require_vendor (IDOR: verify vendor owns order) |

## Solution

1. Replace `require_any_auth` with role-specific auth per mapping
2. Add IDOR checks: authenticated user ID must match path parameter ID
3. For tracking endpoints: look up the order/ride, verify auth user is customer, vendor, or assigned driver
4. For `POST /api/driver/location`: extract driver_id from JWT token, not request body
