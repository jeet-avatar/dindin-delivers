# QA Report: Security Scan

**Date**: Tue Feb  3 14:25:17 PST 2026
**Phase**: pre-deploy

---

## Secret Detection

| Potential API keys | ⚠️ WARNING | 526 occurrences |
| Hardcoded passwords | ❌ CRITICAL | 129 occurrences |
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
