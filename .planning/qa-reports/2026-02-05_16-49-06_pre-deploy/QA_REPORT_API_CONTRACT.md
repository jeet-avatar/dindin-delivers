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
| accessToken | Required | ✓ | access_token | ✅ Present |
| tokenType | Required | ✓ | token_type | ✅ Present |
| driverId | Required | ✓ | driver_id | ✅ Present |
| driverCode | Required | ✓ | driver_code | ✅ Present |
| email | Required | ✓ | email | ✅ Present |

### 1.2 Name Field Compatibility (Critical Fix)

✅ **Name field compatibility**: API returns name info that iOS can decode

- Combined `name` field: yes
- Separate `first_name`: yes
- Separate `last_name`: yes

---

## 2. Delivery Orders Response Contract


| iOS Field (P2PDeliveryOrder) | CodingKey | Required | Status |
|------------------------------|-----------|----------|--------|
| orderId | order_id | Required | ✅ Present |
| orderNumber | order_number | Required | ✅ Present |
| status | status | Optional | ✅ Present |
| restaurantName | restaurant | Required | ✅ Present |
| restaurantAddress | pickup_address | Required | ✅ Present |
| deliveryFee | delivery_fee | Required | ✅ Present |
| createdAt | created_at | Required | ✅ Present |

---

## 3. iOS Model Decode Simulation

Testing if iOS models can decode actual API responses:

### 3.1 Driver Login Decode Test

✅ Decode would SUCCEED - All required fields present

### 3.2 Customer Orders Items Field Type Check

**Critical Fix**: iOS expects `items` as an array, not a JSON string.

```
❌ /api/customer/orders: items is STRING (iOS decode will fail!)
❌ Error testing items field: 'list' object has no attribute 'get'
```

---

## 4. Common Mismatch Patterns to Watch

| Pattern | iOS Expectation | Common API Issue | Detection |
|---------|-----------------|------------------|-----------|
| Name split | `name: String` | Returns `first_name`/`last_name` separately | ✅ Now handled |
| Items as string | `items: [OrderItem]` | Returns JSON string instead of array | ✅ Now checked |
| Optional vs Required | Non-optional field | API sometimes returns null | Check nullability |
| Type mismatch | `Int` | API returns String number | Check type coercion |
| Missing field | Expected field | Not included in response | Causes keyNotFound |
| Case mismatch | `orderId` | API uses `order_id` | Use CodingKeys |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 14 |
| Failed | 1 |
| Warnings | 0 |
| Total Checks | 15 |

**Status**: ❌ FAIL - Field mismatches detected that could break iOS apps

---

## Recommendations

1. **Always test API changes against iOS models** before deployment
2. **Add new fields as optional** in iOS until backend is confirmed deployed
3. **Use computed properties** for backward compatibility (like `name` field fix)
4. **Log decode errors in DEBUG mode** to catch silent failures

---

*Agent created after discovering silent driver login failure due to name field mismatch*
