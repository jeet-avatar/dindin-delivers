# Quick Task 004: QA Investigation - Negotiation Flow

## Task Description
Run world-class QA on P2P Rideshare negotiation flow - investigate why driver details and negotiation data are not showing correctly on frontend.

## Findings Summary

### ROOT CAUSE IDENTIFIED: DUPLICATE ROUTE HANDLERS

The backend has **TWO competing implementations** of the same endpoint `/api/rides/bid/{bid_id}/respond`:

| Location | Line | Status | Issues |
|----------|------|--------|--------|
| `bid_routes.py` | 359 | ✅ ACTIVE (correct) | Returns full driver info |
| `main_new.py` | 13408 | ❌ SHADOWED (legacy) | Missing message field, different auth |

### Critical Issues Found

1. **Duplicate Route Registration** - Both handlers registered, causing confusion
2. **Input Model Mismatch** - `BidResponseRequest` (main_new.py) missing `message` field
3. **Auth Mismatch** - main_new.py requires auth, bid_routes.py doesn't
4. **Legacy Code Debt** - ~300 lines of shadowed code in main_new.py

### iOS Field Mapping Status

**iOS expects `response.driver`** - This field IS correctly returned by bid_routes.py (confirmed in today's fix)

**View Logic**:
```swift
if let driver = response.driver {
    self.acceptedDriver = driver  // Uses full AcceptedDriverInfo
}
```

### Recommended Fix

1. **DELETE legacy endpoints** in main_new.py (lines 13299-13825)
2. **Keep bid_routes.py** as single source of truth
3. **Verify deployment** pushed latest bid_routes.py changes

## Tasks

- [x] Analyze API contract
- [x] Detect legacy code paths
- [x] Map iOS frontend fields
- [x] Verify route registration order
- [ ] Clean up duplicate handlers in main_new.py
