---
phase: quick-166
title: Remove bestseller from AI tab recommendations
plans: 1
---

# Plan 166-01: Remove Bestseller AI Recommendation

## Objective
Remove "Highlight Best Sellers" from AI tab fallback recommendations in the backend. The recommendation was a dead-end — tapping it in the iOS Restaurant app had no actionable UI to set items as bestseller.

## Task 1: Remove bestseller fallback recommendation from backend

**files:** apps/web/p2p-platform/backend/main_new.py
**action:** Remove the "Highlight Best Sellers" entry from `fallback_recommendations` array (line ~21721-21728)
**verify:** `grep -c "Highlight Best Sellers" main_new.py` returns 0
**done:** Recommendation removed, tests pass

## Notes
- The "Mark as Bestseller" toggle in EnhancedMenuView.swift:634 is KEPT — it works for vendors editing menu items
- Only the AI tab recommendation card is removed (dead-end with no navigation target)
