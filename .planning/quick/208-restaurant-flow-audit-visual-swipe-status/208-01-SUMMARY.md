---
phase: quick-208
plan: 01
subsystem: restaurant-ios
tags: [audit, visual, restaurant, order-flow, gaps]
dependency_graph:
  requires: [208-RESEARCH.md]
  provides: [restaurant-flow-audit.html]
  affects: [ios-restaurant-app, backend-erp-aliases]
tech_stack:
  added: []
  patterns: [dark-theme-html-audit-board, github-style-dark-ui]
key_files:
  created:
    - .superpowers/brainstorm/restaurant-flow-audit/restaurant-flow-audit.html
  modified: []
decisions:
  - "Used same visual pattern as driver-rideshare-audit.html for consistency"
  - "Included swipe conversion candidates table (GAP-6) from research even though plan had 5 gaps — adds value as reference"
metrics:
  duration: "~5 minutes"
  completed: "2026-03-24"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase Quick-208 Plan 01: Restaurant Flow Audit Visual Board Summary

## One-Liner

Self-contained 1397-line dark-theme HTML audit board for the restaurant order lifecycle — 9 stages, 8 verified endpoints, 5 gaps with RED/YELLOW indicators and exact file:line references, payment fee breakdown, and swipe conversion candidate table.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build restaurant-flow-audit.html | a6e99591 | .superpowers/brainstorm/restaurant-flow-audit/restaurant-flow-audit.html |

## Artifact

**File:** `.superpowers/brainstorm/restaurant-flow-audit/restaurant-flow-audit.html`
**Size:** 1397 lines / 65KB
**Opens in:** Any browser — fully self-contained (no external assets)

## What Was Built

A single-file HTML audit board with:

- **Sticky header** with summary badges (4 GREEN, 3 YELLOW, 2 RED, 9 stages, 8 endpoints)
- **Left panel (sticky):** 9 lifecycle stage nav items with colored dots + phone mockup preview showing Stage 1 PENDING_RESTAURANT state with pulsing orange ring
- **Right panel:** Scrollable audit content with 5 sections

### Sections Built

1. **Gap Summary Box** — all 5 gaps in one scannable block with fix instructions:
   - GAP-1 YELLOW: `acceptOrder()` calls wrong endpoint (OrdersViewModel.swift:273-278)
   - GAP-2 RED: `vendor-arrived-at-delivery` ERP alias missing (404 in production)
   - GAP-3 YELLOW: iOS countdown uses `placedAt` not `sent_to_restaurant_at` (EnhancedDashboardView.swift:443-448)
   - GAP-4 RED: `order_delivered` self-delivery auth mismatch — 403/TypeError (main_new.py:15500 vs order_flow.py:3887)
   - GAP-5 YELLOW: No push on delivery decision timeout (order_flow.py:2268-2269 TODO comments)

2. **9 Lifecycle Stages** — each stage has: status title bar with colored badge, description, detail cards, and tables showing correct vs bug paths

3. **8-Endpoint Verification Table** — Method | Path | Backend file:line | iOS call site | Status pill | Notes

4. **Payment Flow Section** — flat $1 fee model diagram (NOT %) with party-by-party breakdown, payout sequence, and anti-hallucination note

5. **Swipe Conversion Candidates** — 10-button table showing which buttons should become swipe (6) vs stay as tap (4)

6. **Status Enum Reference** — full `OrderStatus` enum from `models.py:392-414` with iOS mapping notes

## Verification

All plan verification criteria passed:

- [x] File exists: `.superpowers/brainstorm/restaurant-flow-audit/restaurant-flow-audit.html`
- [x] Line count: 1397 (minimum was 400)
- [x] Status enum matches: 35 occurrences of PENDING_RESTAURANT|PREPARING|READY_FOR_PICKUP|PENDING_DELIVERY_DECISION|OUT_FOR_DELIVERY|DELIVERED
- [x] GAP count: 31 total occurrences (all 5 GAP-1 through GAP-5 present)
- [x] vendor-arrived-at-delivery shows RED indicator with 404 explanation
- [x] Payment section shows $1 flat fee, NOT % commission — anti-hallucination check

## Deviations from Plan

### Auto-additions (within scope)

**1. GAP-6 swipe conversion table included**
- **Found during:** Building Stage 4 content
- **Reason:** Research.md documented GAP-6 (zero swipe protection) and the plan referenced it in stage descriptions. Including the full 10-button table as a section makes the audit board more complete.
- **Files modified:** Same HTML file

None of the 5 plan gaps were deviated from — all included as specified.

## Self-Check: PASSED

- [x] `.superpowers/brainstorm/restaurant-flow-audit/restaurant-flow-audit.html` — FOUND (1397 lines)
- [x] Commit `a6e99591` — FOUND in git log
- [x] GAP-2 and GAP-4 show RED status pills in endpoint table
- [x] GAP-1, GAP-3, GAP-5 show YELLOW status pills
- [x] Payment flow shows "$1 flat per party — NOT a % commission (rideshare_payments.py:36)"
