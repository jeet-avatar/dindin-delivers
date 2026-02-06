# QA Report: API Contract Validation

**Purpose**: Detect field mismatches between iOS Codable models and Backend API responses
**Problem Detected**: This agent was created after discovering that iOS driver login was silently failing
because the backend returned `first_name`/`last_name` but iOS expected a combined `name` field.

---

## 1. Critical API/iOS Model Contracts

These are the key API endpoints and their iOS model mappings that must stay in sync:


### 1.1 Driver Login Response

| iOS Field | Type | Required | Backend Field | Status |
|-----------|------|----------|---------------|--------|
| accessToken | Required | ✓ | access_token | ❌ MISSING |
| tokenType | Required | ✓ | token_type | ❌ MISSING |
| driverId | Required | ✓ | driver_id | ❌ MISSING |
| driverCode | Required | ✓ | driver_code | ❌ MISSING |
| email | Required | ✓ | email | ❌ MISSING |

### 1.2 Name Field Compatibility (Critical Fix)

❌ **CRITICAL**: Neither `name` nor `first_name`/`last_name` found in response!

This will cause iOS driver login to fail silently!

---

## 2. Delivery Orders Response Contract


| iOS Field (P2PDeliveryOrder) | CodingKey | Required | Status |
|------------------------------|-----------|----------|--------|
| orderId | order_id | Required | ❌ MISSING |
| orderNumber | order_number | Required | ❌ MISSING |
| status | status | Optional | ⚠️ Not found |
| restaurantName | restaurant | Required | ❌ MISSING |
| restaurantAddress | pickup_address | Required | ❌ MISSING |
| deliveryFee | delivery_fee | Required | ❌ MISSING |
| createdAt | created_at | Required | ❌ MISSING |

---

## 3. iOS Model Decode Simulation

Testing if iOS models can decode actual API responses:

### 3.1 Driver Login Decode Test

❌ Decode would FAIL - Missing required fields: ['access_token', 'token_type', 'driver_id', 'driver_code', 'email']

---

## 4. Common Mismatch Patterns to Watch

| Pattern | iOS Expectation | Common API Issue | Detection |
|---------|-----------------|------------------|-----------|
| Name split | `name: String` | Returns `first_name`/`last_name` separately | ✅ Now handled |
| Optional vs Required | Non-optional field | API sometimes returns null | Check nullability |
| Type mismatch | `Int` | API returns String number | Check type coercion |
| Missing field | Expected field | Not included in response | Causes keyNotFound |
| Case mismatch | `orderId` | API uses `order_id` | Use CodingKeys |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 0 |
| Failed | 13 |
| Warnings | 1 |
| Total Checks | 14 |

**Status**: ❌ FAIL - Field mismatches detected that could break iOS apps

---

## Recommendations

1. **Always test API changes against iOS models** before deployment
2. **Add new fields as optional** in iOS until backend is confirmed deployed
3. **Use computed properties** for backward compatibility (like `name` field fix)
4. **Log decode errors in DEBUG mode** to catch silent failures

---

*Agent created after discovering silent driver login failure due to name field mismatch*
