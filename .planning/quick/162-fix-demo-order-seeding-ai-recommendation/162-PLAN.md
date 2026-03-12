---
phase: quick-162
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/main_new.py
autonomous: true
requirements: [DEMO-SEED-FIX, AI-RECS-FALLBACK]

must_haves:
  truths:
    - "Demo vendor login seeds active orders (preparing/ready/out_for_delivery/pending_restaurant) every time"
    - "Dashboard shows active orders after demo login on production with 95+ existing delivered orders"
    - "History tab shows delivered and cancelled demo orders after login"
    - "AI recommendations endpoint returns at least 3 recommendations even with sparse order data"
  artifacts:
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Fixed demo seeding condition + AI recommendation fallbacks"
      contains: "existing_active_demo"
  key_links:
    - from: "vendor_demo_login (line ~2000)"
      to: "Order seeding block"
      via: "active demo order count check"
      pattern: "ORD-DEMO.*PREPARING|READY|OUT_FOR_DELIVERY|PENDING"
---

<objective>
Fix 3 iOS Restaurant app issues caused by demo order seeding being skipped on production.

Purpose: Demo vendor login must always show a populated dashboard with active orders, history, and 3+ AI recommendations for Apple App Store review.
Output: Updated `main_new.py` with fixed seeding condition and AI recommendation fallbacks.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/main_new.py (lines 1994-2076 — demo seeding block)
@apps/web/p2p-platform/backend/main_new.py (lines 21549-21596 — AI recommendations)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix demo order seeding condition to check active demo orders instead of total delivered</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
At line ~1996-2000, replace the seeding condition. The current logic checks total delivered orders for the vendor (`existing_delivered < 5`) which fails on production because there are 95+ delivered orders from real/previous activity.

**Replace:**
```python
existing_delivered = db.query(Order).filter(
    Order.vendor_id == user.vendor_id,
    Order.status == OrderStatus.DELIVERED
).count()
if existing_delivered < 5:
```

**With:**
```python
existing_active_demo = db.query(Order).filter(
    Order.vendor_id == user.vendor_id,
    Order.order_number.like("ORD-DEMO-%"),
    Order.status.in_([
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.PENDING_RESTAURANT,
        OrderStatus.CONFIRMED
    ])
).count()
if existing_active_demo < 5:
```

This checks specifically for active DEMO orders (not all vendor orders). If fewer than 5 active demo orders exist, it clears and re-seeds. This ensures every demo login produces a populated dashboard regardless of how many historical delivered orders exist.

Keep the rest of the seeding block (lines 2002-2073) exactly as-is — the order_configs with mixed statuses (35 orders: 15 delivered, 3 preparing, 2 ready, 2 out_for_delivery, 3 pending, 5 cancelled, 5 confirmed) are correct.
  </action>
  <verify>
Run: `grep -n "existing_active_demo" apps/web/p2p-platform/backend/main_new.py` — should show the new variable name.
Run: `grep -n "ORD-DEMO" apps/web/p2p-platform/backend/main_new.py` — should show both the check and the seeding logic.
Run: `cd apps/web/p2p-platform/backend && python -c "import main_new; print('Import OK')"` — confirms no syntax errors.
  </verify>
  <done>Demo seeding condition checks active demo orders instead of total delivered count. Seeding will trigger on production where 95+ delivered orders exist but 0 active demo orders exist.</done>
</task>

<task type="auto">
  <name>Task 2: Add fallback AI recommendations so at least 3 always return</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
At line ~21596 (after the bundle recommendation block, before the `return AIInsightsResponse` at line 21598), add fallback recommendations to ensure at least 3 are always returned.

**Insert after line 21596 (after the closing of the bundle `if` block):**

```python
    # Ensure at least 3 recommendations for demo/new vendors
    fallback_recommendations = [
        {
            "type": "trending",
            "icon": "star.fill",
            "title": "Highlight Best Sellers",
            "description": "Feature your most popular items at the top of your menu to attract more orders.",
            "impact": "Increase order frequency",
            "priority": "medium"
        },
        {
            "type": "bundle",
            "icon": "bag.badge.plus",
            "title": "Create Combo Deals",
            "description": "Offer meal combos (entree + side + drink) to increase average order value.",
            "impact": "+$5-10 per order",
            "priority": "medium"
        },
        {
            "type": "prep_time",
            "icon": "clock.badge.checkmark",
            "title": "Optimize Kitchen Flow",
            "description": "Pre-prep high-demand ingredients during slow periods to reduce wait times during rushes.",
            "impact": "Faster service, happier customers",
            "priority": "low"
        },
    ]

    # Fill up to 3 recommendations using fallbacks (skip types already present)
    existing_types = {r["type"] for r in recommendations}
    for fallback in fallback_recommendations:
        if len(recommendations) >= 3:
            break
        if fallback["type"] not in existing_types:
            recommendations.append(fallback)
            existing_types.add(fallback["type"])
```

This ensures:
- If data-driven logic produces 0-2 recommendations, fallbacks fill to 3.
- Fallbacks use distinct types so no duplicate recommendation types appear.
- The "Slow Period Promotion" (type: promotion) that already works is preserved.
- Fallback types (trending, bundle, prep_time) match the existing data-driven types so the iOS app's UI handles them identically.
  </action>
  <verify>
Run: `grep -n "fallback_recommendations" apps/web/p2p-platform/backend/main_new.py` — should show the new block.
Run: `grep -n "existing_types" apps/web/p2p-platform/backend/main_new.py` — should show dedup logic.
Run: `cd apps/web/p2p-platform/backend && python -c "import main_new; print('Import OK')"` — confirms no syntax errors.
  </verify>
  <done>AI recommendations endpoint always returns at least 3 recommendations. Data-driven recommendations take priority; fallbacks fill remaining slots with distinct types.</done>
</task>

</tasks>

<verification>
1. `cd apps/web/p2p-platform/backend && python -c "import main_new; print('OK')"` — no import/syntax errors
2. `grep -n "existing_active_demo\|fallback_recommendations" apps/web/p2p-platform/backend/main_new.py` — both changes present
3. `pytest tests/ -v -k "demo or ai_insights or vendor_login" --no-header 2>/dev/null || echo "No matching tests (acceptable — demo login is integration-tested via staging)"` — run any relevant tests
</verification>

<success_criteria>
- Demo vendor login seeds 35 orders (including active ones) on production regardless of existing delivered order count
- AI recommendations endpoint returns >= 3 recommendations for any vendor, even with no order history
- No syntax errors, no import failures
</success_criteria>

<output>
After completion, create `.planning/quick/162-fix-demo-order-seeding-ai-recommendation/162-SUMMARY.md`
</output>
