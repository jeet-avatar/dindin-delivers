---
phase: quick-164
plan: 01
subsystem: menu-system
tags: [combo-deals, bestseller, backend, ios-restaurant, ios-customer]
dependency_graph:
  requires: []
  provides: [combo-deals, bestseller-badges, combo-creation-api]
  affects: [menu-display, restaurant-management, customer-ordering]
tech_stack:
  added: []
  patterns: [combo-item-aggregation, bestseller-sorting]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/models.py
    - apps/web/p2p-platform/backend/main_new.py
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Restaurant.swift
    - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedMenuView.swift
    - apps/ios/customer/eatfaircustomer/Models/MenuItem.swift
    - apps/ios/customer/eatfaircustomer/ViewModels/MenuViewModel.swift
    - apps/ios/customer/eatfaircustomer/Views/RestaurantDetailView.swift
decisions:
  - Used ComboItemInfo shared struct for combo item references (item_id, item_name, original_price)
  - Added safe custom decoders with decodeIfPresent for all new fields to maintain backward compatibility
  - Combo creation uses backend endpoint for savings calculation and item validation
  - P2PMenuItemCreate now has explicit CodingKeys for snake_case mapping (was relying on keyEncodingStrategy)
metrics:
  duration: 13m
  completed: 2026-03-13
  tasks: 3/3
---

# Quick Task 164: Add Combo Deals and Bestseller Features Summary

Combo deals and bestseller item features across backend model, API, iOS Restaurant management, and iOS Customer display with badges and priority sorting.

## Task Results

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Backend model + API | ccbccf02 | 4 new VendorMenuItem columns, updated pydantic models, POST /menu/combo endpoint |
| 2 | iOS Restaurant UI | 0340abc4 | Bestseller toggle, combo badges, CreateComboSheet with item selector and pricing |
| 3 | iOS Customer display | b00f7358 | Bestseller/combo badges on cards, priority sorting, savings display |

## Changes Made

### Backend (models.py + main_new.py)
- Added `is_bestseller`, `is_combo`, `combo_items` (JSON), `combo_savings` (Float) to VendorMenuItem model with defaults
- Updated MenuItemCreate and MenuItemResponse pydantic models
- Updated create_menu_item and get_vendor_menu to include all 4 new fields
- Added `POST /api/vendors/{vendor_id}/menu/combo` endpoint: validates item IDs, builds combo_items list, calculates savings, invalidates cache

### iOS Shared (Restaurant.swift + P2PAPIService.swift)
- Added `ComboItemInfo` struct (shared across restaurant and customer apps)
- Added isBestseller, isCombo, comboItems, comboSavings to shared MenuItem with backward-compatible decoding
- Updated P2PDetailMenuItem and P2PMenuItem with safe decoders for new fields
- Added isBestseller/isCombo to P2PMenuItemCreate with explicit CodingKeys
- Added `createComboItem(vendorId:comboData:completion:)` method to P2PAPIService

### iOS Restaurant (EnhancedMenuView.swift)
- Bestseller toggle in AddEditMenuItemView form (alongside existing Popular toggle)
- Bestseller badge (orange) and Combo Deal badge (green) on MenuItemCard
- Combo items list and savings display on combo item cards
- CreateComboSheet: multi-item selector, running price total, suggested 15% discount, savings calculator
- isBestseller wired through all add/update/upload flows and P2P sync

### iOS Customer (MenuItem.swift + MenuViewModel.swift + RestaurantDetailView.swift)
- ComboItemDetail struct with snake_case CodingKeys
- isBestseller, isCombo, comboItems, comboSavings fields with display helpers
- Updated P2P and Firebase sort: bestsellers first per category, then combos, then alphabetical
- Bestseller star badge and Combo Deal badge on MenuItemCard
- Combo items list and savings amount displayed on cards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added custom decoder to P2PMenuItem**
- **Found during:** Task 2
- **Issue:** P2PMenuItem had no custom init(from:) decoder -- new non-optional Bool fields would crash if backend omits them
- **Fix:** Added full custom decoder with decodeIfPresent and safe defaults for all fields
- **Files modified:** P2PAPIService.swift

**2. [Rule 2 - Missing critical functionality] Added CodingKeys to P2PMenuItemCreate**
- **Found during:** Task 2
- **Issue:** P2PMenuItemCreate had no CodingKeys enum -- relied on keyEncodingStrategy which is set per-call; explicit keys ensure correct snake_case mapping
- **Fix:** Added full CodingKeys enum mapping all fields to snake_case backend names
- **Files modified:** P2PAPIService.swift

## Verification

- Backend model: `['is_bestseller', 'is_combo', 'combo_items', 'combo_savings']` columns confirmed
- Backend API: 27 occurrences of new fields across pydantic models, create, get, combo endpoint
- Combo endpoint: `POST /api/vendors/{vendor_id}/menu/combo` at line 13739
- iOS Restaurant: BUILD SUCCEEDED (eatffairrestaurant scheme, Debug, iPhone 16 Pro Simulator)
- iOS Customer: BUILD SUCCEEDED (eatfaircustomer scheme, Debug, iPhone 16 Pro Simulator)
