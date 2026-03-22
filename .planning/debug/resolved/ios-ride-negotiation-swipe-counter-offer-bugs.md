---
status: resolved
trigger: "ios-ride-negotiation-swipe-counter-offer-bugs"
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:00:00Z
---

## Current Focus

hypothesis: All three root causes confirmed
test: Completed
expecting: Fix all three issues
next_action: Apply fixes to CounterOfferResponseSheet.swift, ActiveRideView.swift, SubmitBidSheet.swift, and BidCounterSheet in RideRequestView.swift

## Symptoms

expected: SwipeToConfirmButton visible and functional in correct position on bid card; customer and driver can counter-offer back and forth without errors; smooth swipe animation
actual:
  1. SwipeToConfirmButton appears too far below the visible area on the negotiation screen
  2. Swipe gesture is not smooth — missing the fluid swipe-to-confirm feel
  3. During counter-offer exchange (customer counter → driver counter), a "message error" appeared
errors:
  - "message error" UI dialog/toast appeared during counter-offer exchange
  - Production CloudWatch shows NO ERROR-level logs in last 4h (likely 4xx silently failing or WebSocket event not handled)
reproduction:
  1. Customer requests ride, driver submits bid
  2. Customer counter-offers with a different amount
  3. Driver counter-offers back
  4. Error appears (possibly at step 2 or 3)
started: Observed Mar 22 2026 after iOS builds 1123/228 deployed to TestFlight

## Eliminated

- hypothesis: Backend counter-offer endpoint returning non-200 silently
  evidence: Backend /bid/{id}/respond correctly handles counter with PENDING status and returns proper JSON
  timestamp: 2026-03-22

- hypothesis: WebSocket event not handled for driver counter
  evidence: Backend broadcast_bid_update is sent; customer polling via startNegotiationPolling() handles it
  timestamp: 2026-03-22

## Evidence

- timestamp: 2026-03-22
  checked: SwipeToConfirmButton.swift — init signature
  found: Only one init: label:, accentColor:, isDisabled:, onConfirm:. No title:, color:, or isLoading: params exist.
  implication: All driver app call sites using title:/color:/isLoading: are invalid Swift

- timestamp: 2026-03-22
  checked: git log -- CounterOfferResponseSheet.swift
  found: Commit 12fa627f "fix" renamed label→title, accentColor→color, isDisabled→isLoading across ALL driver rideshare SwipeToConfirmButton call sites. This was backwards — it broke them.
  implication: Driver app counter-offer sheet, SubmitBidSheet, ActiveRideView all use wrong param names

- timestamp: 2026-03-22
  checked: BidCounterSheet in RideRequestView.swift (customer app, lines 2821-2942)
  found: Uses presentationDetents([.medium]) with Spacer() before SwipeToConfirmButton. On .medium detent (~half screen), content above (header + current price + counter input + counters remaining + optional message + optional warning) overflows, pushing SwipeToConfirmButton below visible area.
  implication: Bug 1 — button clipped below visible area

- timestamp: 2026-03-22
  checked: SwipeToConfirmButton gesture handling (lines 76-107)
  found: DragGesture is only on the thumb Circle, not the full track. .onTapGesture { } added to "prevent SwiftUI swallowing gestures" but may itself be consuming touches before DragGesture starts. Track area is not gesture-interactive.
  implication: Bug 2 — swipe feels non-smooth because drag must start precisely on thumb, tap gesture may interfere

- timestamp: 2026-03-22
  checked: BidCounterSheet.isValidPrice (line 2933-2935)
  found: return price < bid.proposed_price — requires counter < driver's bid. But after driver counter-offers, bid.proposed_price is updated on backend but the bid object in iOS cache may be stale showing old price. Backend also rejects counter at line 695 if bid.status != PENDING (after customer counters, status = COUNTERED), so customer cannot counter again until driver responds.
  implication: Bug 3 cause confirmed — the backend status check at line 695 is what blocks the flow and returns HTTP 400 "Bid is already countered", which iOS surfaces as "Error" alert (viewModel.showError)

## Resolution

root_cause: |
  Bug 1 (button position): BidCounterSheet uses .presentationDetents([.medium]) + Spacer() pushing SwipeToConfirmButton below fold. Fix: use .safeAreaInset(edge: .bottom) for the button (same as PreRequestNegotiationSheet which works correctly) + change to .large detent.

  Bug 2 (swipe smoothness): DragGesture only on thumb circle, .onTapGesture{} on same view may consume touches. Fix: add .highPriorityGesture to the DragGesture and remove the conflicting empty .onTapGesture. Also add gesture to the whole track for a better UX.

  Bug 3 (message error): Commit 12fa627f reversed the correct SwipeToConfirmButton parameter names across ALL driver rideshare views (CounterOfferResponseSheet, ActiveRideView, SubmitBidSheet). Should use label:, accentColor:, isDisabled: not title:, color:, isLoading:. Also, the isDisabled: replacement with isLoading: lost the "newCounterAmount <= 0" guard in CounterOfferResponseSheet.

fix: Revert parameter names in 3 driver files + fix BidCounterSheet layout + fix SwipeToConfirmButton gesture
verification: Build both customer and driver apps, test counter-offer flow
files_changed:
  - apps/ios/delivery/eatffairdelivery/Views/Rideshare/CounterOfferResponseSheet.swift
  - apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift
  - apps/ios/delivery/eatffairdelivery/Views/Rideshare/SubmitBidSheet.swift
  - apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift (BidCounterSheet)
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift
