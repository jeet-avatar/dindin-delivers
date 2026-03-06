# Quick Task 105: Fix 5 UI Audit Bugs (BUG-01 through BUG-05)

## Task 1: Fix backend function shadow (BUG-01)
- **Files:** `apps/web/p2p-platform/backend/main_new.py:20273`
- **Action:** Rename `complete_delivery()` to `complete_delivery_v2()` to stop shadowing the `order_flow.complete_delivery` import at line 14277
- **Verify:** `grep -n "def complete_delivery" main_new.py` shows only `complete_delivery_v2`; tests pass

## Task 2: Fix Android phone dialer + remove dead Add Instructions (BUG-02, BUG-03)
- **Files:** `NavigationGraph.kt:320`, `OrderTrackingScreen.kt:483`
- **Action:** Add `Intent(ACTION_DIAL)` to `onCallPartner` lambda; remove `.clickable` from Add Instructions row
- **Verify:** Code compiles, phone intent launches on tap, instructions row is display-only

## Task 3: Fix iOS pull-to-refresh + chat button (BUG-04, BUG-05)
- **Files:** `OrderHistoryView.swift`, `DeliveryTrackingView.swift`
- **Action:** Add `.refreshable` to OrderHistoryView; add "Chat with Driver" button + OrderChatView sheet to DeliveryBottomSheet
- **Verify:** Pull-to-refresh works on order history; chat button visible during active delivery
