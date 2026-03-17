# TNC Frontend Suite — Full Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Scope:** 7 features across 6 apps (3 iOS + 3 Android) + 1 backend addition
**Authority:** CPUC Decision 13-09-045, Decision 19-06-033

---

## Overview

Build the complete user-facing TNC (Transportation Network Company) compliance frontend across all Dollor.ai mobile apps. The backend TNC endpoints already exist (`tnc_compliance.py`, `bid_routes.py`). This spec covers wiring them to customer and driver app UIs on both iOS and Android.

## Features

### Feature 1: Accessibility Request (Customer Apps — iOS + Android)

**Screen:** Ride Request — section below pickup/dropoff, above "Request Ride" button

**UI Components:**
- Toggle: "I need an accessible vehicle" → maps to `accessibility_requested: Bool`
- When toggled ON, expands to show:
  - Checkboxes: Wheelchair accessible vehicle, Service animal, Mobility aid storage, Audio/visual assistance
  - Free-text field: "Additional accessibility notes" (placeholder text)
- Checkboxes auto-populate `accessibility_notes` as structured JSON: `{"wheelchair": true, "service_animal": false, "mobility_aid": false, "audio_visual": false, "notes": "free text here"}`

**Backend wiring:**
- iOS: `RideRequestViewModel.accessibilityRequested` + `accessibilityNotes` already exist — wire to UI
- Android: Add `accessibilityRequested` + `accessibilityNotes` fields to ride request ViewModel
- API: `POST /api/rides/request` already accepts `accessibility_requested` + `accessibility_notes` — no backend changes

**Files to modify:**
- iOS: `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift`
- iOS: `apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift` (properties exist, may need API wiring)
- Android: Ride request screen + ViewModel in `eatfair-android/app/`

---

### Feature 2: Safety Report Button (Customer Apps — iOS + Android)

**Screens:** Active Ride view + Completed Ride view

**UI Components:**
- Red shield icon button: "Report Safety Concern"
- Tapping opens bottom sheet/modal:
  - Category selector: "Drug/alcohol suspicion", "Unsafe driving", "Harassment", "Other"
  - Description text field (min 10 chars, max 2000 — matches backend `ZeroToleranceReport` validation)
  - "Submit Report" button (disabled until description >= 10 chars)
  - CPUC info footer: "You may also contact CPUC: 1-800-894-9444 | CIU_intake@cpuc.ca.gov"
- On submit: `POST /api/tnc/zero-tolerance/report` with `driver_id`, `ride_request_id`, `description`, `reporter_type: "customer"`
- Success: "Driver has been immediately suspended pending investigation. Our safety team will review within 48 hours."
- Error: Generic "Unable to submit report. Please try again or call CPUC directly."

**Backend wiring:** `POST /api/tnc/zero-tolerance/report` exists at `tnc_compliance.py:598` — no changes needed.

**Files to modify:**
- iOS: `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift` (or wherever active/completed ride views live)
- iOS: New `SafetyReportSheet.swift` (shared sheet component)
- Android: Active ride + completed ride screens in `eatfair-android/app/`
- Android: New `SafetyReportDialog.kt` (shared composable)

---

### Feature 3: Waybill Display (Driver Apps — iOS + Android)

**Screen:** Active Ride view — info button in header

**UI Components:**
- Info button (circled "i") in active ride screen header/toolbar
- Tapping opens a card/sheet showing:
  - **Operator:** Zietra Technologies inc (dba Dollor.ai)
  - **Permit:** TCP-P TNC (number TBD)
  - **Trip ID:** From ride request ID
  - **Passenger:** Name from API
  - **Pickup:** Address
  - **Dropoff:** Address
  - **Vehicle:** Year, make, model, plate
  - **Driver:** Name, license number
  - **Started at:** Trip start timestamp
  - CPUC contact footer: "CPUC: 1-800-894-9444"
- Data source: `GET /api/rides/request/{id}/waybill`

**Backend wiring:** Endpoint exists at `bid_routes.py:2657` — no changes needed.

**Files to modify:**
- iOS: `apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift`
- iOS: New `WaybillSheet.swift`
- Android: Active ride screen in `eatfair-android/driver/`
- Android: New `WaybillDialog.kt`

---

### Feature 4: Compliance & Safety Screen (Driver Apps — iOS + Android)

**Screen:** New screen accessible from driver profile → "Compliance & Safety" row

**Section 4a: Background Check Status**
- Status badge: Passed (green checkmark) / Pending (yellow clock) / Not Started (gray) / Failed (red X)
- "Last checked: {date}" or "Not yet checked"
- Read-only — admin initiates checks via Persona
- API: `GET /api/tnc/background-check/{driver_id}/status`

**Section 4b: Vehicle Inspection**
- Status card: Valid (green) / Expiring Soon ≤30 days (orange) / Expired (red) / Missing (gray)
- Next due date with days remaining countdown
- "Submit Inspection" button → form sheet:
  - Inspection date (date picker, cannot be future)
  - Facility name (required, max 500 chars)
  - BAR license number (optional, max 100 chars)
  - Mileage at inspection (optional, 0-999999)
  - Document URL (required — photo/PDF link, max 1000 chars)
  - Submit button
- After submit: shows updated status
- API: `GET /api/tnc/vehicle-inspection/{driver_id}/status` + `POST /api/tnc/vehicle-inspection/submit`

**Section 4c: Accessibility Capability**
- Toggle: "My vehicle is wheelchair accessible"
- Checkboxes (when toggle ON): Wheelchair ramp/lift, Service animal friendly, Extra trunk space for mobility aids
- Auto-saves on change
- API: `PATCH /api/tnc/driver/accessibility` (NEW — see Feature 5; driver ID from JWT, no URL param)

**Files to modify:**
- iOS: New `ComplianceView.swift` + `ComplianceViewModel.swift`
- iOS: `DriverProfileView.swift` — add navigation row to Compliance screen
- Android: New `ComplianceScreen.kt` + `ComplianceViewModel.kt`
- Android: `ProfileScreen.kt` — add navigation item to Compliance screen

---

### Feature 5: Backend — Driver Accessibility Capability

**Model changes** (`models.py` — Driver table):
```python
accessibility_capable = Column(Boolean, default=False)
accessibility_features = Column(JSON)  # {"wheelchair": true, "service_animal": true, "mobility_storage": false}
```

**DB migration** (`main_new.py` — add to `driver_columns` list at ~line 843):
```python
("accessibility_capable", "BOOLEAN DEFAULT FALSE"),
("accessibility_features", "JSON"),
```

**New endpoint** (add to `tnc_compliance.py`):
```
PATCH /api/tnc/driver/accessibility
```
- Auth: `require_driver` — driver can only update own settings
- Body: `{"accessibility_capable": true, "accessibility_features": {"wheelchair": true, ...}}`
- Returns updated settings

**Ride matching enhancement** (`bid_routes.py` — ride creation/matching):
- When `accessibility_requested=true` on a ride request, add a soft preference for drivers with `accessibility_capable=true`
- Do NOT hard-block — if no accessible drivers, still allow ride with a note to customer

---

## Implementation Order (Dependency Graph)

```
Wave 1 (Backend):  Feature 5 (driver accessibility model + endpoint)
Wave 2 (iOS):      Features 1-4 (all iOS customer + driver changes)
Wave 3 (Android):  Features 1-4 (all Android customer + driver changes)
Wave 4 (Deploy):   Push → staging → smoke test → production → build all 6 apps
```

Wave 2 and Wave 3 can run in parallel (separate repos).

---

## Out of Scope (Next Phase)

- TNC-11: In-trip panic button / real-time safety monitoring (needs WebSocket work)
- TNC-14: Admin-side CPUC complaint escalation workflow
- WAV vehicle tracking in CPUC quarterly reports (connect accessibility_capable to TNC-22)

---

## CI/CD Plan

1. All code committed with CR tickets
2. Backend deployed via `gh workflow run deploy-staging.yml` → smoke test → `gh workflow run deploy-dollar-ai.yml`
3. iOS apps archived → TestFlight via `xcodebuild archive + exportArchive`
4. Android apps built → Firebase App Distribution
5. No manual docker/ECS commands
