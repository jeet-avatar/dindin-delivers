# QA Report: Performance

**Environment**: staging
**Date**: Thu Feb  5 11:26:59 PST 2026
**Phase**: pre-deploy

---

## 1. API Response Times

| Endpoint | Time | Status | Threshold |
|----------|------|--------|-----------|
| /health | 225ms | ✅ FAST | <500ms |
| /api/vendors/published | 174ms | ✅ FAST | <500ms |
| /api/vendors/40/menu | 169ms | ✅ FAST | <500ms |
| /api/v5/driver/48/dashboard | 168ms | ✅ FAST | <500ms |

## 2. Code Size Analysis

| Metric | Value | Status |
|--------|-------|--------|
| Swift files | 151 | ℹ️ INFO |
| Swift LOC | 87567 | ℹ️ INFO |
| Python files | 110 | ℹ️ INFO |

---

## Summary

| Metric | Count |
|--------|-------|
| Slow endpoints (>1s) | 0 |

**Status**: ✅ PASS
