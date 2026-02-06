# QA Report: Performance

**Environment**: staging
**Date**: Tue Feb  3 19:11:06 PST 2026
**Phase**: pre-deploy

---

## 1. API Response Times

| Endpoint | Time | Status | Threshold |
|----------|------|--------|-----------|
| /health | 166ms | ✅ FAST | <500ms |
| /api/vendors/published | 201ms | ✅ FAST | <500ms |
| /api/vendors/40/menu | 171ms | ✅ FAST | <500ms |
| /api/v5/driver/48/dashboard | 186ms | ✅ FAST | <500ms |

## 2. Code Size Analysis

| Metric | Value | Status |
|--------|-------|--------|
| Swift files | 151 | ℹ️ INFO |
| Swift LOC | 86862 | ℹ️ INFO |
| Python files | 109 | ℹ️ INFO |

---

## Summary

| Metric | Count |
|--------|-------|
| Slow endpoints (>1s) | 0 |

**Status**: ✅ PASS
