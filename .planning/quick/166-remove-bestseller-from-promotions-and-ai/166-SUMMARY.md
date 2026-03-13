# Quick Task 166 Summary

## Remove bestseller from AI tab recommendations

**Date:** 2026-03-13
**Status:** Complete

### Changes
| File | Change |
|------|--------|
| `apps/web/p2p-platform/backend/main_new.py` | Removed "Highlight Best Sellers" from `fallback_recommendations` array |

### Anti-hallucination Verification
- `grep "Highlight Best Sellers" main_new.py` → 0 matches (removed)
- `grep "Mark as Bestseller" EnhancedMenuView.swift` → line 634 (toggle preserved)
- Backend tests: 32 passed, 0 failed

### What was removed
- Backend AI recommendation: `{"type": "trending", "title": "Highlight Best Sellers", ...}` — fallback recommendation that appeared in AI tab when vendor had no data-driven recommendations

### What was kept
- Menu item toggle "Mark as Bestseller" in EnhancedMenuView.swift — vendors can still set items as bestseller from the menu edit screen
- `is_bestseller` field in MenuItem model — data model preserved
- Customer app "Bestseller" badge display — preserved

### Needs Deploy
Backend change requires staging + production deploy to take effect on the AI tab.
