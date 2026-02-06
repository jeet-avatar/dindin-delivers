# QA Report: Data Type Validation

**Purpose**: Ensure API responses return correct data types that iOS/Android can decode.
**Critical Issue Caught**: `items` field returned as JSON string instead of array, causing iOS decode failures.

---

## Field Type Checks

| Endpoint | Field | Expected | Actual | Status |
|----------|-------|----------|--------|--------|
| Customer Orders | items | array | string | ❌ FAIL |
| Customer Orders | status | string | string | ✅ PASS |
| Customer Orders | total | number | float | ✅ PASS |
| Customer Orders | id | number | int | ✅ PASS |
| Customer Active Orders | - | - | Error: 'list' object has no attribute | ❌ Error |
| Vendor Orders | items | array | list (2 items) | ✅ PASS |
| Vendor Orders | status | string | string | ✅ PASS |
| Vendor Orders | total_amount | number | None | ⚠️ Missing |
| All Orders | items | array | list (1 items) | ✅ PASS |
| All Orders | status | string | string | ✅ PASS |

---

## Summary

| Metric | Count |
|--------|-------|
| ✅ Passed | 7 |
| ❌ Failed | 1 |
| ⚠️ Warnings | 1 |

**Status**: ❌ FAIL - Field type mismatches detected

---

## Why This Matters

iOS/Android apps use strongly-typed decoders (Swift Codable, Kotlin data classes).
When the backend returns wrong types, decoding fails silently:

| Wrong Type | iOS Behavior | Android Behavior |
|------------|--------------|------------------|
| String instead of Array | Falls back to empty [] | Throws JsonDataException |
| String instead of Number | Throws DecodingError | Throws JsonDataException |
| null instead of value | Uses default or crashes | Throws NullPointerException |

---

*Agent created to prevent items-as-string regression*
