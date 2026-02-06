# QA Report: Field Mapping Validation

**Environment**: production
**URL**: https://api.dollor.ai
**Date**: Tue Feb  3 20:00:33 PST 2026
**Phase**: pre-deploy

This agent validates that API responses populate all expected fields (not null/empty).

---

## 1. Customer Profile Field Mapping

| Field | API Response | Has Data | UI Display | Status |
|-------|--------------|----------|------------|--------|
| email | demo.customer@dollor.ai | Yes | ProfileView | ✅ PASS |
| name | Demo Customer | Yes | ProfileView | ✅ PASS |
| phone | +14155551001 | Yes | ProfileView | ✅ PASS |
| customer_id | 74 | Yes | ProfileView | ✅ PASS |
| is_active | True | Yes | ProfileView | ✅ PASS |

---

## 2. Order History Field Mapping

| Field | Sample Value | Populated | UI Location | Status |
|-------|--------------|-----------|-------------|--------|
| order_id | 144 | Yes | OrderHistoryView | ✅ PASS |
| id | 144 | Yes | OrderHistoryView | ✅ PASS |
| status | confirmed | Yes | OrderHistoryView | ✅ PASS |
| total | 13.99 | Yes | OrderHistoryView | ✅ PASS |
| subtotal | 0 | Yes | OrderHistoryView | ✅ PASS |
| delivery_fee | 12.99 | Yes | OrderHistoryView | ✅ PASS |
| tax | 0 | Yes | OrderHistoryView | ✅ PASS |
| tip | 0 | Yes | OrderHistoryView | ✅ PASS |
| driver_name | __NULL__ | No | OrderHistoryView | ⚠️ WARN |
| driver_id | __NULL__ | No | OrderHistoryView | ⚠️ WARN |
| customer_name | Demo Customer | Yes | OrderHistoryView | ✅ PASS |
| delivery_address | {"street": "123 Test St", "cit | Yes | OrderHistoryView | ✅ PASS |
| restaurant_name | Apple Test Restaurant | Yes | OrderHistoryView | ✅ PASS |
| items | [{"name": "Test Burger", "quan | Yes | OrderHistoryView | ✅ PASS |
| placed_at | 2026-02-04T02:34:47.754278Z | Yes | OrderHistoryView | ✅ PASS |
| estimated_delivery_time | __NULL__ | No | OrderHistoryView | ⚠️ WARN |

---

## 3. Restaurant/Menu Field Mapping

### 3.1 Vendor Fields
| Field | Sample Value | Populated | UI Location | Status |
|-------|--------------|-----------|-------------|--------|
| id | 40 | Yes | HomeView/RestaurantView | ✅ PASS |
| name | Apple Test Restaurant | Yes | HomeView/RestaurantView | ✅ PASS |
| address | 1 Apple Park Way, Cuperti | Yes | HomeView/RestaurantView | ✅ PASS |
| phone | +14155551003 | Yes | HomeView/RestaurantView | ✅ PASS |
| rating | 4.5 | Yes | HomeView/RestaurantView | ✅ PASS |
| delivery_fee | 2.99 | Yes | HomeView/RestaurantView | ✅ PASS |
| minimum_order | 0.0 | Yes | HomeView/RestaurantView | ✅ PASS |
| is_open | True | Yes | HomeView/RestaurantView | ✅ PASS |
| cuisine_type | American | Yes | HomeView/RestaurantView | ✅ PASS |
| logo_url | https://images.unsplash.c | Yes | HomeView/RestaurantView | ✅ PASS |
| banner_url | https://images.unsplash.c | Yes | HomeView/RestaurantView | ✅ PASS |
| delivery_time_minutes | 15 | Yes | HomeView/RestaurantView | ✅ PASS |

### 3.2 Menu Item Fields
| Field | Sample Value | Populated | UI Location | Status |
|-------|--------------|-----------|-------------|--------|
| id | 466 | Yes | MenuView | ✅ PASS |
| name | Classic Soup of the Day | Yes | MenuView | ✅ PASS |
| description | Fresh homemade soup serve | Yes | MenuView | ✅ PASS |
| price | 5.99 | Yes | MenuView | ✅ PASS |
| category | Appetizers | Yes | MenuView | ✅ PASS |
| image_url | https://images.unsplash.c | Yes | MenuView | ✅ PASS |
| is_available | True | Yes | MenuView | ✅ PASS |
| prep_time_minutes | __NULL__ | No | MenuView | ⚠️ WARN |
| calories | __NULL__ | No | MenuView | ⚠️ WARN |
| dietary_tags | list[1] | Yes | MenuView | ✅ PASS |

---

## 4. Driver Dashboard Field Mapping

| Field | API Value | Populated | UI Location | Status |
|-------|-----------|-----------|-------------|--------|
| week_earnings | 78.43 | Yes | DashboardView | ✅ PASS |
| today_earnings | 0.0 | Yes | DashboardView | ✅ PASS |
| total_deliveries | 6 | Yes | DashboardView | ✅ PASS |
| week_deliveries | 6 | Yes | DashboardView | ✅ PASS |
| rating | 4.9 | Yes | DashboardView | ✅ PASS |
| acceptance_rate | 95.0 | Yes | DashboardView | ✅ PASS |
| completion_rate | 98.0 | Yes | DashboardView | ✅ PASS |
| total_tips | 28.19 | Yes | DashboardView | ✅ PASS |
| online_hours | 3.0 | Yes | DashboardView | ✅ PASS |

---

## 5. Missing Field Analysis

### 5.1 Fields with NULL/Empty Values (May Cause UI Display Issues)

| Category | Field | Impact | Recommendation |
|----------|-------|--------|----------------|
| Orders | driver_name | Shows 'Driver' placeholder | Check if order is assigned to driver |
| Orders | estimated_delivery_time | Cannot show ETA | Ensure backend calculates ETA |
| Profile | phone | Shows empty in settings | Make phone optional in UI |
| Menu | image_url | Shows placeholder image | Ensure images are uploaded |
| Menu | calories | Cannot show nutrition info | Make calories optional display |
| Driver | rating | Shows 0 or default | New drivers have no ratings yet |

---

## Summary

| Metric | Count |
|--------|-------|
| Fields with Data | 47 |
| Fields Empty/Null | 5 |
| Critical Missing | 0 |
| Total Fields Checked | 52 |

**Status**: ✅ PASS - Most fields populated

### Field Population Coverage
- Customer Profile: Fields checked
- Order History: Fields checked
- Vendor/Menu: Fields checked
- Driver Dashboard: Fields checked

### Recommendations
- Ensure all API endpoints return expected fields
- Add loading/placeholder states for empty fields in UI
- Consider making optional fields explicitly optional in models

