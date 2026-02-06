# QA Report: Field Mapping Validation

**Environment**: production
**URL**: https://api.dollor.ai
**Date**: Tue Feb  3 16:00:18 PST 2026
**Phase**: pre-deploy

This agent validates that API responses populate all expected fields (not null/empty).

---

## 1. Customer Profile Field Mapping

| Field | API Response | Has Data | UI Display | Status |
|-------|--------------|----------|------------|--------|
| email | demo.customer@dollor.ai | Yes | ProfileView | ✅ PASS |
| name | Demo Customer | Yes | ProfileView | ✅ PASS |
| phone | +14155551001 | Yes | ProfileView | ✅ PASS |
| customer_id | __NULL__ | No | ProfileView | ⚠️ WARN |
| is_active | __NULL__ | No | ProfileView | ⚠️ WARN |

---

## 2. Order History Field Mapping

| Field | Sample Value | Populated | UI Location | Status |
|-------|--------------|-----------|-------------|--------|
| order_id | __NULL__ | No | OrderHistoryView | ⚠️ WARN |
| id | 142 | Yes | OrderHistoryView | ✅ PASS |
| status | ready_for_pickup | Yes | OrderHistoryView | ✅ PASS |
| total | __NULL__ | No | OrderHistoryView | ⚠️ WARN |
| subtotal | 19.98 | Yes | OrderHistoryView | ✅ PASS |
| delivery_fee | 2.99 | Yes | OrderHistoryView | ✅ PASS |
| tax | __NULL__ | No | OrderHistoryView | ⚠️ WARN |
| tip | 0.0 | Yes | OrderHistoryView | ✅ PASS |
| driver_name | Demo Driver | Yes | OrderHistoryView | ✅ PASS |
| driver_id | 48 | Yes | OrderHistoryView | ✅ PASS |
| customer_name | Demo Customer | Yes | OrderHistoryView | ✅ PASS |
| delivery_address | {"street": "1 Apple Park Way", | Yes | OrderHistoryView | ✅ PASS |
| restaurant_name | __NULL__ | No | OrderHistoryView | ⚠️ WARN |
| items | [{"name": "Chicken Sandwich",  | Yes | OrderHistoryView | ✅ PASS |
| placed_at | __NULL__ | No | OrderHistoryView | ⚠️ WARN |
| estimated_delivery_time | __NULL__ | No | OrderHistoryView | ⚠️ WARN |

---

## 3. Restaurant/Menu Field Mapping

### 3.1 Vendor Fields
| Field | Sample Value | Populated | UI Location | Status |
|-------|--------------|-----------|-------------|--------|
| id | 133 | Yes | HomeView/RestaurantView | ✅ PASS |
| name | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| address | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| phone | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| rating | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| delivery_fee | 0.0 | Yes | HomeView/RestaurantView | ✅ PASS |
| minimum_order | 0.0 | Yes | HomeView/RestaurantView | ✅ PASS |
| is_open | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| cuisine_type | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| logo_url | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| banner_url | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |
| delivery_time_minutes | __NULL__ | No | HomeView/RestaurantView | ⚠️ WARN |

### 3.2 Menu Item Fields
| Field | Sample Value | Populated | UI Location | Status |
|-------|--------------|-----------|-------------|--------|
| id | 466 | Yes | MenuView | ✅ PASS |
| name | __NULL__ | No | MenuView | ⚠️ WARN |
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
| week_earnings | __NULL__ | No | DashboardView | ⚠️ WARN |
| today_earnings | __NULL__ | No | DashboardView | ⚠️ WARN |
| total_deliveries | __NULL__ | No | DashboardView | ⚠️ WARN |
| week_deliveries | __NULL__ | No | DashboardView | ⚠️ WARN |
| rating | __NULL__ | No | DashboardView | ⚠️ WARN |
| acceptance_rate | __NULL__ | No | DashboardView | ⚠️ WARN |
| completion_rate | __NULL__ | No | DashboardView | ⚠️ WARN |
| total_tips | __NULL__ | No | DashboardView | ⚠️ WARN |
| online_hours | __NULL__ | No | DashboardView | ⚠️ WARN |

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
| Fields with Data | 23 |
| Fields Empty/Null | 29 |
| Critical Missing | 0 |
| Total Fields Checked | 52 |

**Status**: ⚠️ WARN - Many fields not populated

### Field Population Coverage
- Customer Profile: Fields checked
- Order History: Fields checked
- Vendor/Menu: Fields checked
- Driver Dashboard: Fields checked

### Recommendations
- Ensure all API endpoints return expected fields
- Add loading/placeholder states for empty fields in UI
- Consider making optional fields explicitly optional in models

