---
quick_task: 253
description: "Investigate BUG-3: food orders from non-V40 vendors fail HTTP 400"
date: 2026-03-30
---

# Investigation: BUG-3

## Finding: NOT A CODE BUG

V42 and V47 return "Restaurant is currently offline and not accepting orders" — this is correct behavior.
V136 works fine with correct menu item IDs (order 393 created successfully).

The original test used wrong item IDs for some vendors and the other vendors are simply offline.

**Status:** Closed — not a bug, data issue (test restaurants offline)
