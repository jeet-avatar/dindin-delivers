# QA Report: Security Scan

**Date**: Tue Feb  3 14:28:35 PST 2026
**Phase**: pre-deploy

---

## Secret Detection

| Potential hardcoded keys | ⚠️ WARNING | 2591 (review needed) |
| Hardcoded passwords | ❌ CRITICAL | 2 occurrences |
| Bearer tokens | ✅ PASS | None hardcoded |
| .env files | ⚠️ WARNING | 3 files (check .gitignore) |

## HTTPS Enforcement

| HTTPS enforced | ✅ PASS | All URLs use HTTPS |

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warnings | 2 |

**Status**: ❌ FAIL
