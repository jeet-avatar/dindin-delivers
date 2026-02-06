# QA Report: Performance

**Environment**: staging
**Date**: Thu Feb  5 17:00:29 PST 2026
**Phase**: pre-deploy

---

## 1. API Response Times

| Endpoint | Time | Status | Threshold |
|----------|------|--------|-----------|
| /health | 174ms | ✅ FAST | <500ms |
| /api/vendors/published | 184ms | ✅ FAST | <500ms |
| /api/vendors/40/menu | 187ms | ✅ FAST | <500ms |
| /api/v5/driver/48/dashboard | 178ms | ✅ FAST | <500ms |

## 2. Code Size Analysis

| Metric | Value | Status |
|--------|-------|--------|
| Swift files | 151 | ℹ️ INFO |
| Swift LOC | 87625 | ℹ️ INFO |
| Python files | 110 | ℹ️ INFO |

---

## Summary

| Metric | Count |
|--------|-------|
| Slow endpoints (>1s) | 0 |

**Status**: ✅ PASS
