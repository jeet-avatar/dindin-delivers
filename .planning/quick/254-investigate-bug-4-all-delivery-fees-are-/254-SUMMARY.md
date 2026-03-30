---
quick_task: 254
status: closed-not-a-bug
---

# Summary: BUG-4 Investigation

**Result:** Not a code bug. V40 (Apple Test Restaurant) is in Cupertino, CA (37.33, -122.01). All test delivery addresses are 37-1,614 miles away. The delivery fee formula `max($2.99, min($12.99, $2.49 + distance * $0.50))` correctly caps at $12.99 for any distance >21 miles.

**Action:** No code changes. Updated PRODUCTION_TESTS.md.
