# TNC Frontend Suite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete user-facing TNC (CPUC compliance) frontend across all 6 Dollor.ai mobile apps — accessibility requests, safety reporting, waybill display, and driver compliance screens.

**Architecture:** 4-wave approach — backend first (driver accessibility model + endpoint), then iOS and Android frontend in parallel, then deploy all together via CI/CD. All features connect to existing TNC backend endpoints except one new PATCH endpoint for driver accessibility capability.

**Tech Stack:** Python/FastAPI backend, SwiftUI iOS apps, Jetpack Compose Android apps, Hilt DI (Android), existing P2PAPIService (iOS shared module)

**Spec:** `docs/superpowers/specs/2026-03-16-tnc-frontend-suite-design.md`

---

## Wave 1: Backend — Driver Accessibility Model + Endpoint

### Task 1: Add Driver Accessibility Columns

**CR Ticket:** CR-TNC-001 — Add accessibility_capable and accessibility_features columns to Driver model
**Files:**
- Modify: `apps/web/p2p-platform/backend/models.py:810-819` (add columns after existing Driver fields)
- Modify: `apps/web/p2p-platform/backend/main_new.py:844-866` (add to driver_columns migration list)

- [ ] **Step 1: Add columns to Driver model**

In `models.py`, add after the existing `terms_accepted_at` column (~line 819):

```python
# TNC-12: Driver accessibility capability
accessibility_capable = Column(Boolean, default=False)
accessibility_features = Column(Text)  # JSON: {"wheelchair": false, "service_animal": false, "mobility_storage": false}
```

- [ ] **Step 2: Add to migration list**

In `main_new.py`, add to `driver_columns` list (before the `for` loop at ~line 868):

```python
("accessibility_capable", "BOOLEAN DEFAULT FALSE"),
("accessibility_features", "TEXT"),
```

- [ ] **Step 3: Verify model loads**

Run:
```bash
cd apps/web/p2p-platform/backend && python -c "from models import Driver; print([c.name for c in Driver.__table__.columns if 'accessibility' in c.name])"
```
Expected: `['accessibility_capable', 'accessibility_features']`

- [ ] **Step 4: Commit**

```bash
git add apps/web/p2p-platform/backend/models.py apps/web/p2p-platform/backend/main_new.py
git commit -m "feat(tnc): add accessibility_capable + accessibility_features columns to Driver model"
```

---

### Task 2: Add Driver Accessibility PATCH Endpoint

**CR Ticket:** CR-TNC-002 — PATCH /api/tnc/driver/accessibility endpoint
**Files:**
- Modify: `apps/web/p2p-platform/backend/tnc_compliance.py` (add endpoint after TNC-23 section, ~line 930)

- [ ] **Step 1: Add Pydantic model and endpoint**

Append to `tnc_compliance.py` after line 930:

```python
# =============================================================================
# DRIVER ACCESSIBILITY CAPABILITY
# =============================================================================

class DriverAccessibilityUpdate(BaseModel):
    accessibility_capable: bool = False
    accessibility_features: Optional[Dict[str, bool]] = None  # {"wheelchair": true, "service_animal": true, "mobility_storage": false}

    @field_validator('accessibility_features')
    @classmethod
    def validate_features(cls, v):
        if v is None:
            return v
        allowed_keys = {"wheelchair", "service_animal", "mobility_storage", "audio_visual"}
        for key in v:
            if key not in allowed_keys:
                raise ValueError(f"Unknown accessibility feature: {key}. Allowed: {allowed_keys}")
        return v


@router.patch("/driver/accessibility")
async def update_driver_accessibility(
    data: DriverAccessibilityUpdate,
    driver: Driver = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Update driver's accessibility capability settings.
    Driver can only update their own profile (enforced by require_driver)."""
    import json

    driver.accessibility_capable = data.accessibility_capable
    if data.accessibility_features is not None:
        driver.accessibility_features = json.dumps(data.accessibility_features)
    elif not data.accessibility_capable:
        driver.accessibility_features = None

    db.commit()
    db.refresh(driver)

    features = {}
    if driver.accessibility_features:
        try:
            features = json.loads(driver.accessibility_features)
        except (json.JSONDecodeError, TypeError):
            features = {}

    return {
        "success": True,
        "driver_id": driver.id,
        "accessibility_capable": driver.accessibility_capable,
        "accessibility_features": features,
    }


@router.get("/driver/accessibility")
async def get_driver_accessibility(
    driver: Driver = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Get driver's current accessibility capability settings."""
    import json

    features = {}
    if driver.accessibility_features:
        try:
            features = json.loads(driver.accessibility_features)
        except (json.JSONDecodeError, TypeError):
            features = {}

    return {
        "driver_id": driver.id,
        "accessibility_capable": driver.accessibility_capable,
        "accessibility_features": features,
    }
```

- [ ] **Step 2: Add driver accessibility to bid serialization**

In `bid_routes.py`, update `serialize_bid()` (~line 378-408) to include driver accessibility:

```python
# After "driver_license_plate" line, add:
"driver_accessibility_capable": driver.accessibility_capable if driver else False,
```

- [ ] **Step 3: Add accessibility info to available rides**

In `bid_routes.py`, in the `/available` endpoint (~line 1169), after `request_data = serialize_ride_request(request)`, the accessibility_requested field is already included. No changes needed — drivers can see if a ride needs accessibility from the serialized data.

- [ ] **Step 4: Test endpoint manually**

```bash
cd apps/web/p2p-platform/backend
python -c "
from tnc_compliance import DriverAccessibilityUpdate
d = DriverAccessibilityUpdate(accessibility_capable=True, accessibility_features={'wheelchair': True, 'service_animal': False})
print(d.model_dump())
"
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/p2p-platform/backend/tnc_compliance.py apps/web/p2p-platform/backend/bid_routes.py
git commit -m "feat(tnc): add PATCH/GET /api/tnc/driver/accessibility endpoint + bid serialization"
```

---

### Task 3: Backend Tests for TNC Endpoints

**CR Ticket:** CR-TNC-003 — TNC endpoint test coverage
**Files:**
- Create: `apps/web/p2p-platform/backend/tests/test_tnc_compliance.py`

- [ ] **Step 1: Write test file**

```python
"""Tests for TNC compliance endpoints."""
import pytest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


class TestDriverAccessibility:
    """Test PATCH/GET /api/tnc/driver/accessibility"""

    def test_update_accessibility_capable(self, client, driver_token, driver_id):
        """Driver can enable accessibility capability."""
        response = client.patch(
            "/api/tnc/driver/accessibility",
            json={"accessibility_capable": True, "accessibility_features": {"wheelchair": True, "service_animal": False, "mobility_storage": False}},
            headers={"Authorization": f"Bearer {driver_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["accessibility_capable"] is True
        assert data["accessibility_features"]["wheelchair"] is True

    def test_update_accessibility_invalid_feature(self, client, driver_token):
        """Reject unknown accessibility feature keys."""
        response = client.patch(
            "/api/tnc/driver/accessibility",
            json={"accessibility_capable": True, "accessibility_features": {"flying_carpet": True}},
            headers={"Authorization": f"Bearer {driver_token}"},
        )
        assert response.status_code == 422

    def test_get_accessibility_defaults(self, client, driver_token):
        """New driver has accessibility disabled by default."""
        response = client.get(
            "/api/tnc/driver/accessibility",
            headers={"Authorization": f"Bearer {driver_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["accessibility_capable"] is False

    def test_accessibility_requires_driver_auth(self, client):
        """Endpoint requires driver authentication."""
        response = client.patch(
            "/api/tnc/driver/accessibility",
            json={"accessibility_capable": True},
        )
        assert response.status_code in (401, 403)


class TestZeroToleranceReport:
    """Test POST /api/tnc/zero-tolerance/report"""

    def test_report_requires_auth(self, client):
        """Zero-tolerance report requires authentication."""
        response = client.post(
            "/api/tnc/zero-tolerance/report",
            json={"driver_id": 1, "description": "Driver appeared intoxicated during ride"},
        )
        assert response.status_code in (401, 403)

    def test_report_too_short_description(self, client, customer_token):
        """Description must be at least 10 characters."""
        response = client.post(
            "/api/tnc/zero-tolerance/report",
            json={"driver_id": 1, "description": "bad"},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert response.status_code == 422


class TestBackgroundCheckStatus:
    """Test GET /api/tnc/background-check/{driver_id}/status"""

    def test_get_status_requires_auth(self, client):
        """Background check status requires authentication."""
        response = client.get("/api/tnc/background-check/1/status")
        assert response.status_code in (401, 403)


class TestVehicleInspection:
    """Test POST /api/tnc/vehicle-inspection/submit"""

    def test_submit_requires_driver_auth(self, client):
        """Vehicle inspection submission requires driver auth."""
        response = client.post(
            "/api/tnc/vehicle-inspection/submit",
            json={
                "driver_id": 1,
                "inspection_date": "2026-03-01",
                "facility_name": "California Auto Repair",
                "document_url": "https://example.com/inspection.pdf",
            },
        )
        assert response.status_code in (401, 403)

    def test_future_date_rejected(self, client, driver_token):
        """Cannot submit inspection with future date."""
        response = client.post(
            "/api/tnc/vehicle-inspection/submit",
            json={
                "driver_id": 1,
                "inspection_date": "2099-01-01",
                "facility_name": "Future Garage",
                "document_url": "https://example.com/inspection.pdf",
            },
            headers={"Authorization": f"Bearer {driver_token}"},
        )
        assert response.status_code == 400


class TestWaybill:
    """Test GET /api/rides/request/{id}/waybill"""

    def test_waybill_requires_auth(self, client):
        """Waybill requires authentication."""
        response = client.get("/api/rides/request/1/waybill")
        assert response.status_code in (401, 403)
```

- [ ] **Step 2: Run tests**

```bash
cd apps/web/p2p-platform/backend && pytest tests/test_tnc_compliance.py -v
```

- [ ] **Step 3: Fix any failures and re-run**

- [ ] **Step 4: Commit**

```bash
git add apps/web/p2p-platform/backend/tests/test_tnc_compliance.py
git commit -m "test(tnc): add TNC compliance endpoint test coverage"
```

---

## Wave 2: iOS Frontend — Customer + Driver Apps

### Task 4: iOS Customer — Accessibility Request UI

**CR Ticket:** CR-TNC-004 — Accessibility request toggle + checkboxes on ride request screen (iOS)
**Files:**
- Modify: `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift:398-409` (insert accessibility section before notes field)
- Modify: `apps/ios/customer/eatfaircustomer/ViewModels/RideRequestViewModel.swift` (wire properties to API call)
- Modify: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` (add accessibility params to ride request API call)

- [ ] **Step 1: Add accessibility UI to RideRequestView.swift**

In `RideBottomSheet`, insert BEFORE the existing "Add notes for driver" section (~line 398):

```swift
// TNC-12: Accessibility Request
VStack(alignment: .leading, spacing: 12) {
    Toggle(isOn: $viewModel.accessibilityRequested) {
        HStack(spacing: 8) {
            Image(systemName: "figure.roll")
                .foregroundColor(.blue)
            Text("I need an accessible vehicle")
                .font(.subheadline.weight(.medium))
        }
    }
    .tint(.blue)

    if viewModel.accessibilityRequested {
        VStack(alignment: .leading, spacing: 8) {
            Text("Select your needs:")
                .font(.caption)
                .foregroundColor(.secondary)

            ForEach(AccessibilityOption.allCases, id: \.self) { option in
                HStack {
                    Image(systemName: viewModel.selectedAccessibilityOptions.contains(option) ? "checkmark.square.fill" : "square")
                        .foregroundColor(viewModel.selectedAccessibilityOptions.contains(option) ? .blue : .gray)
                    Text(option.label)
                        .font(.subheadline)
                    Spacer()
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    viewModel.toggleAccessibilityOption(option)
                }
            }

            TextField("Additional accessibility notes (optional)", text: $viewModel.accessibilityNotes, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(2...4)
                .font(.subheadline)
        }
        .padding(.leading, 4)
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
}
.padding(.horizontal)
.animation(.easeInOut(duration: 0.2), value: viewModel.accessibilityRequested)
```

- [ ] **Step 2: Add AccessibilityOption enum and ViewModel methods**

In `RideRequestViewModel.swift`, add after the `accessibilityNotes` property (~line 20):

```swift
@Published var selectedAccessibilityOptions: Set<AccessibilityOption> = []

func toggleAccessibilityOption(_ option: AccessibilityOption) {
    if selectedAccessibilityOptions.contains(option) {
        selectedAccessibilityOptions.remove(option)
    } else {
        selectedAccessibilityOptions.insert(option)
    }
    updateAccessibilityNotes()
}

private func updateAccessibilityNotes() {
    let structured: [String: Bool] = Dictionary(
        uniqueKeysWithValues: AccessibilityOption.allCases.map {
            ($0.rawValue, selectedAccessibilityOptions.contains($0))
        }
    )
    let freeText = accessibilityNotes.trimmingCharacters(in: .whitespacesAndNewlines)
    var dict = structured as [String: Any]
    if !freeText.isEmpty { dict["notes"] = freeText }
    if let data = try? JSONSerialization.data(withJSONObject: dict),
       let json = String(data: data, encoding: .utf8) {
        // Store structured JSON in accessibilityNotes for API
        // The free-text portion is appended separately
    }
}
```

Add `AccessibilityOption` enum (can go at bottom of file or in a new shared file):

```swift
enum AccessibilityOption: String, CaseIterable {
    case wheelchair = "wheelchair"
    case serviceAnimal = "service_animal"
    case mobilityStorage = "mobility_storage"
    case audioVisual = "audio_visual"

    var label: String {
        switch self {
        case .wheelchair: return "Wheelchair accessible vehicle"
        case .serviceAnimal: return "Service animal"
        case .mobilityStorage: return "Mobility aid storage"
        case .audioVisual: return "Audio/visual assistance"
        }
    }
}
```

- [ ] **Step 3: Wire accessibility params to API call**

In `P2PAPIService.swift`, find the ride request POST body construction (search for `"accessibility_requested"`). Add:

```swift
"accessibility_requested": accessibilityRequested,
"accessibility_notes": accessibilityNotes,
```

If these params are NOT already in the POST body, add them. The ViewModel properties exist but may not be passed through to the API call — verify and wire.

- [ ] **Step 4: Build and verify**

```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add apps/ios/customer/ apps/ios/eatfair-ios-shared/
git commit -m "feat(tnc-12): add accessibility request UI to iOS customer ride request screen"
```

---

### Task 5: iOS Customer — Safety Report Sheet

**CR Ticket:** CR-TNC-005 — Safety report button on active + completed ride screens (iOS)
**Files:**
- Create: `apps/ios/customer/eatfaircustomer/Views/SafetyReportSheet.swift`
- Modify: `apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift` (add safety button to active ride state)
- Modify: `apps/ios/customer/eatfaircustomer/Views/RideReceiptView.swift:445-485` (add safety button to action buttons)
- Modify: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` (add zero-tolerance report API call)

- [ ] **Step 1: Create SafetyReportSheet.swift**

```swift
import SwiftUI

struct SafetyReportSheet: View {
    let driverId: Int
    let rideRequestId: Int?
    @Environment(\.dismiss) private var dismiss
    @State private var selectedCategory: SafetyCategory = .drugAlcohol
    @State private var description: String = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    enum SafetyCategory: String, CaseIterable, Identifiable {
        case drugAlcohol = "Drug/alcohol suspicion"
        case unsafeDriving = "Unsafe driving"
        case harassment = "Harassment"
        case other = "Other safety concern"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Category
                    Text("What happened?")
                        .font(.headline)
                    ForEach(SafetyCategory.allCases) { category in
                        HStack {
                            Image(systemName: selectedCategory == category ? "largecircle.fill.circle" : "circle")
                                .foregroundColor(selectedCategory == category ? .red : .gray)
                            Text(category.rawValue)
                                .font(.subheadline)
                            Spacer()
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { selectedCategory = category }
                    }

                    // Description
                    Text("Describe what happened")
                        .font(.headline)
                    TextEditor(text: $description)
                        .frame(minHeight: 100)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.gray.opacity(0.3)))
                    if description.count < 10 && !description.isEmpty {
                        Text("Please provide at least 10 characters")
                            .font(.caption)
                            .foregroundColor(.red)
                    }

                    // Submit
                    Button(action: submitReport) {
                        HStack {
                            if isSubmitting {
                                ProgressView().tint(.white)
                            }
                            Text("Submit Safety Report")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(description.count >= 10 ? Color.red : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(description.count < 10 || isSubmitting)

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }

                    // CPUC footer
                    VStack(alignment: .leading, spacing: 4) {
                        Divider()
                        Text("You may also contact CPUC directly:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        HStack {
                            Image(systemName: "phone.fill").font(.caption)
                            Text("1-800-894-9444")
                                .font(.caption.weight(.medium))
                        }
                        HStack {
                            Image(systemName: "envelope.fill").font(.caption)
                            Text("CIU_intake@cpuc.ca.gov")
                                .font(.caption.weight(.medium))
                        }
                    }
                    .foregroundColor(.secondary)
                }
                .padding()
            }
            .navigationTitle("Report Safety Concern")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Report Submitted", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("The driver has been immediately suspended pending investigation. Our safety team will review within 48 hours.")
            }
        }
    }

    private func submitReport() {
        isSubmitting = true
        errorMessage = nil
        let desc = "[\(selectedCategory.rawValue)] \(description)"

        Task {
            do {
                let result = try await P2PAPIService.shared.reportSafetyConcern(
                    driverId: driverId,
                    rideRequestId: rideRequestId,
                    description: desc
                )
                await MainActor.run {
                    isSubmitting = false
                    if result["success"] as? Bool == true {
                        showSuccess = true
                    } else {
                        errorMessage = "Unable to submit report. Please try again or call CPUC directly at 1-800-894-9444."
                    }
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = "Unable to submit report. Please try again or call CPUC directly at 1-800-894-9444."
                }
            }
        }
    }
}
```

- [ ] **Step 2: Add reportSafetyConcern to P2PAPIService.swift**

```swift
func reportSafetyConcern(driverId: Int, rideRequestId: Int?, description: String) async throws -> [String: Any] {
    var body: [String: Any] = [
        "driver_id": driverId,
        "description": description,
        "reporter_type": "customer"
    ]
    if let rideId = rideRequestId {
        body["ride_request_id"] = rideId
    }
    // POST to /api/tnc/zero-tolerance/report with customerToken
    // Follow existing pattern in P2PAPIService for authenticated POST requests
}
```

- [ ] **Step 3: Add safety button to RideReceiptView.swift**

In the action buttons section (~line 445-485), add:

```swift
Button(action: { showSafetyReport = true }) {
    HStack {
        Image(systemName: "shield.lefthalf.filled")
            .foregroundColor(.red)
        Text("Report Safety Concern")
    }
}
.sheet(isPresented: $showSafetyReport) {
    SafetyReportSheet(driverId: receipt.driverId, rideRequestId: receipt.rideRequestId)
}
```

Add `@State private var showSafetyReport = false` to the view.

- [ ] **Step 4: Add safety button to active ride view in RideRequestView.swift**

In the active ride state (where the customer sees driver en route / in progress), add the same sheet trigger with a red shield button.

- [ ] **Step 5: Build and verify**

```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatfaircustomer -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add apps/ios/customer/ apps/ios/eatfair-ios-shared/
git commit -m "feat(tnc-10): add safety report sheet to iOS customer active + completed ride"
```

---

### Task 6: iOS Driver — Waybill Display

**CR Ticket:** CR-TNC-006 — Waybill info button on driver active ride screen (iOS)
**Files:**
- Create: `apps/ios/delivery/eatffairdelivery/Views/Rideshare/WaybillSheet.swift`
- Modify: `apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift:104-135` (add waybill button to toolbar)
- Modify: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` (add getWaybill API call)

- [ ] **Step 1: Create WaybillSheet.swift**

```swift
import SwiftUI

struct WaybillSheet: View {
    let rideRequestId: Int
    @Environment(\.dismiss) private var dismiss
    @State private var waybill: [String: Any]?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("Loading trip information...")
                } else if let waybill = waybill {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            waybillSection("TNC Operator", items: [
                                ("Carrier", stringValue(waybill, "tnc_operator.carrier_name")),
                                ("DBA", stringValue(waybill, "tnc_operator.dba")),
                                ("Permit", stringValue(waybill, "tnc_operator.permit_type")),
                            ])
                            waybillSection("Trip", items: [
                                ("Trip ID", "#\(rideRequestId)"),
                                ("Status", stringValue(waybill, "status")),
                                ("Prearranged", "Yes"),
                            ])
                            waybillSection("Passenger", items: [
                                ("Name", stringValue(waybill, "passenger.name")),
                            ])
                            waybillSection("Route", items: [
                                ("Pickup", stringValue(waybill, "route.pickup_address")),
                                ("Dropoff", stringValue(waybill, "route.dropoff_address")),
                                ("Pickup Time", stringValue(waybill, "route.pickup_time")),
                            ])
                            waybillSection("Driver & Vehicle", items: [
                                ("Driver", stringValue(waybill, "driver.name")),
                                ("License", stringValue(waybill, "driver.license_number")),
                                ("Vehicle", stringValue(waybill, "driver.vehicle")),
                                ("Plate", stringValue(waybill, "driver.license_plate")),
                            ])
                            waybillSection("Fare", items: [
                                ("Amount", "$\(stringValue(waybill, "fare.amount"))"),
                                ("Platform Fee", "$\(stringValue(waybill, "fare.platform_fee"))"),
                                ("Access for All", "$\(stringValue(waybill, "fare.access_for_all_fee"))"),
                            ])

                            // CPUC footer
                            HStack {
                                Image(systemName: "info.circle")
                                Text("CPUC: 1-800-894-9444")
                            }
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.top, 8)
                        }
                        .padding()
                    }
                } else {
                    Text(errorMessage ?? "Unable to load trip information")
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Trip Information")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .task { await loadWaybill() }
        }
    }

    @ViewBuilder
    private func waybillSection(_ title: String, items: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            ForEach(items, id: \.0) { label, value in
                HStack {
                    Text(label)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(width: 100, alignment: .leading)
                    Text(value)
                        .font(.subheadline)
                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func stringValue(_ dict: [String: Any], _ keyPath: String) -> String {
        let keys = keyPath.split(separator: ".").map(String.init)
        var current: Any = dict
        for key in keys {
            if let d = current as? [String: Any], let next = d[key] {
                current = next
            } else {
                return "N/A"
            }
        }
        if let num = current as? NSNumber {
            return num.stringValue
        }
        return "\(current)"
    }

    private func loadWaybill() async {
        do {
            let result = try await P2PAPIService.shared.getRideWaybill(rideRequestId: rideRequestId)
            await MainActor.run {
                waybill = result["waybill"] as? [String: Any]
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Unable to load trip information"
                isLoading = false
            }
        }
    }
}
```

- [ ] **Step 2: Add getRideWaybill to P2PAPIService.swift**

```swift
func getRideWaybill(rideRequestId: Int) async throws -> [String: Any] {
    // GET /api/rides/request/{rideRequestId}/waybill with driverToken
    // Follow existing pattern for authenticated GET requests
}
```

- [ ] **Step 3: Add waybill button to ActiveRideView.swift toolbar**

In the toolbar section (~line 104-135), add alongside existing chat and SOS buttons:

```swift
Button(action: { showWaybill = true }) {
    Image(systemName: "doc.text")
        .font(.title2)
        .foregroundColor(.blue)
}
.accessibilityLabel("Trip Information")
.sheet(isPresented: $showWaybill) {
    WaybillSheet(rideRequestId: currentRideRequestId)
}
```

Add `@State private var showWaybill = false` to ActiveRideView.

- [ ] **Step 4: Build and verify**

```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add apps/ios/delivery/ apps/ios/eatfair-ios-shared/
git commit -m "feat(tnc-15): add waybill display to iOS driver active ride screen"
```

---

### Task 7: iOS Driver — Compliance & Safety Screen

**CR Ticket:** CR-TNC-007 — Compliance & Safety screen in driver profile (iOS)
**Files:**
- Create: `apps/ios/delivery/eatffairdelivery/Views/ComplianceView.swift`
- Create: `apps/ios/delivery/eatffairdelivery/ViewModels/ComplianceViewModel.swift`
- Modify: `apps/ios/delivery/eatffairdelivery/Views/DriverProfileView.swift:306-308` (add Compliance tab)
- Modify: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` (add TNC API calls)

- [ ] **Step 1: Create ComplianceViewModel.swift**

```swift
import SwiftUI

@MainActor
class ComplianceViewModel: ObservableObject {
    // Background Check
    @Published var bgCheckStatus: String = "not_started"
    @Published var bgCheckDate: String?

    // Vehicle Inspection
    @Published var inspectionStatus: String = "missing"
    @Published var inspectionNextDue: String?
    @Published var inspectionDaysRemaining: Int?
    @Published var inspectionWarning: Bool = false

    // Accessibility
    @Published var accessibilityCapable: Bool = false
    @Published var wheelchairAccessible: Bool = false
    @Published var serviceAnimalFriendly: Bool = false
    @Published var mobilityStorage: Bool = false

    // Inspection Form
    @Published var inspectionDate = Date()
    @Published var facilityName: String = ""
    @Published var barLicense: String = ""
    @Published var mileage: String = ""
    @Published var documentUrl: String = ""

    // State
    @Published var isLoading = true
    @Published var isSaving = false
    @Published var isSubmittingInspection = false
    @Published var errorMessage: String?
    @Published var showInspectionSuccess = false

    private let driverId: Int

    init(driverId: Int) {
        self.driverId = driverId
    }

    func loadAll() async {
        isLoading = true
        async let bg = loadBackgroundCheck()
        async let insp = loadInspection()
        async let access = loadAccessibility()
        _ = await (bg, insp, access)
        isLoading = false
    }

    private func loadBackgroundCheck() async {
        do {
            let result = try await P2PAPIService.shared.getBackgroundCheckStatus(driverId: driverId)
            bgCheckStatus = result["status"] as? String ?? "not_started"
            bgCheckDate = result["checked_at"] as? String
        } catch { }
    }

    private func loadInspection() async {
        do {
            let result = try await P2PAPIService.shared.getVehicleInspectionStatus(driverId: driverId)
            inspectionStatus = result["status"] as? String ?? "missing"
            inspectionNextDue = result["next_due_date"] as? String
            inspectionDaysRemaining = result["days_until_due"] as? Int
            inspectionWarning = result["warning"] as? Bool ?? false
        } catch { }
    }

    private func loadAccessibility() async {
        do {
            let result = try await P2PAPIService.shared.getDriverAccessibility()
            accessibilityCapable = result["accessibility_capable"] as? Bool ?? false
            if let features = result["accessibility_features"] as? [String: Bool] {
                wheelchairAccessible = features["wheelchair"] ?? false
                serviceAnimalFriendly = features["service_animal"] ?? false
                mobilityStorage = features["mobility_storage"] ?? false
            }
        } catch { }
    }

    func saveAccessibility() async {
        isSaving = true
        let features: [String: Bool] = [
            "wheelchair": wheelchairAccessible,
            "service_animal": serviceAnimalFriendly,
            "mobility_storage": mobilityStorage,
        ]
        do {
            _ = try await P2PAPIService.shared.updateDriverAccessibility(
                capable: accessibilityCapable,
                features: features
            )
        } catch {
            errorMessage = "Failed to save accessibility settings"
        }
        isSaving = false
    }

    func submitInspection() async {
        isSubmittingInspection = true
        errorMessage = nil
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            _ = try await P2PAPIService.shared.submitVehicleInspection(
                driverId: driverId,
                inspectionDate: formatter.string(from: inspectionDate),
                facilityName: facilityName,
                barLicense: barLicense.isEmpty ? nil : barLicense,
                mileage: Int(mileage),
                documentUrl: documentUrl
            )
            showInspectionSuccess = true
            await loadInspection()
        } catch {
            errorMessage = "Failed to submit inspection"
        }
        isSubmittingInspection = false
    }
}
```

- [ ] **Step 2: Create ComplianceView.swift**

```swift
import SwiftUI

struct ComplianceView: View {
    @StateObject private var viewModel: ComplianceViewModel
    @State private var showInspectionForm = false

    init(driverId: Int) {
        _viewModel = StateObject(wrappedValue: ComplianceViewModel(driverId: driverId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView("Loading compliance status...")
                    .padding(.top, 40)
            } else {
                VStack(spacing: 16) {
                    backgroundCheckSection
                    vehicleInspectionSection
                    accessibilitySection
                }
                .padding()
            }
        }
        .navigationTitle("Compliance & Safety")
        .task { await viewModel.loadAll() }
        .alert("Inspection Submitted", isPresented: $viewModel.showInspectionSuccess) {
            Button("OK") { showInspectionForm = false }
        } message: {
            Text("Your vehicle inspection has been recorded.")
        }
    }

    @ViewBuilder
    private var backgroundCheckSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Background Check", systemImage: "person.badge.shield.checkmark")
                .font(.headline)
            HStack {
                statusBadge(viewModel.bgCheckStatus)
                Spacer()
                if let date = viewModel.bgCheckDate {
                    Text("Checked: \(date.prefix(10))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            Text("Background checks are initiated by Dollor.ai administration.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    @ViewBuilder
    private var vehicleInspectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Vehicle Inspection", systemImage: "car.badge.gearshape")
                .font(.headline)
            HStack {
                statusBadge(viewModel.inspectionStatus)
                Spacer()
                if let days = viewModel.inspectionDaysRemaining {
                    Text(days >= 0 ? "\(days) days remaining" : "Overdue by \(abs(days)) days")
                        .font(.caption)
                        .foregroundColor(days <= 30 ? .orange : .secondary)
                }
            }
            if let nextDue = viewModel.inspectionNextDue {
                Text("Next due: \(nextDue)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Button(action: { showInspectionForm = true }) {
                Label("Submit Inspection", systemImage: "doc.badge.plus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .sheet(isPresented: $showInspectionForm) {
                inspectionFormSheet
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    @ViewBuilder
    private var inspectionFormSheet: some View {
        NavigationView {
            Form {
                DatePicker("Inspection Date", selection: $viewModel.inspectionDate, in: ...Date(), displayedComponents: .date)
                TextField("Facility Name *", text: $viewModel.facilityName)
                TextField("BAR License Number", text: $viewModel.barLicense)
                TextField("Mileage at Inspection", text: $viewModel.mileage)
                    .keyboardType(.numberPad)
                TextField("Document URL *", text: $viewModel.documentUrl)
                    .keyboardType(.URL)
                    .autocapitalization(.none)

                if let error = viewModel.errorMessage {
                    Text(error).foregroundColor(.red).font(.caption)
                }

                Button(action: { Task { await viewModel.submitInspection() } }) {
                    if viewModel.isSubmittingInspection {
                        ProgressView()
                    } else {
                        Text("Submit")
                    }
                }
                .disabled(viewModel.facilityName.isEmpty || viewModel.documentUrl.isEmpty || viewModel.isSubmittingInspection)
            }
            .navigationTitle("Submit Inspection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { showInspectionForm = false }
                }
            }
        }
    }

    @ViewBuilder
    private var accessibilitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Accessibility Capability", systemImage: "figure.roll")
                .font(.headline)

            Toggle("My vehicle is wheelchair accessible", isOn: $viewModel.accessibilityCapable)
                .tint(.blue)
                .onChange(of: viewModel.accessibilityCapable) { _ in
                    Task { await viewModel.saveAccessibility() }
                }

            if viewModel.accessibilityCapable {
                VStack(alignment: .leading, spacing: 8) {
                    accessibilityToggle("Wheelchair ramp/lift", isOn: $viewModel.wheelchairAccessible)
                    accessibilityToggle("Service animal friendly", isOn: $viewModel.serviceAnimalFriendly)
                    accessibilityToggle("Extra trunk space for mobility aids", isOn: $viewModel.mobilityStorage)
                }
                .padding(.leading, 4)
            }

            if viewModel.isSaving {
                HStack {
                    ProgressView().scaleEffect(0.7)
                    Text("Saving...").font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func accessibilityToggle(_ label: String, isOn: Binding<Bool>) -> some View {
        Toggle(label, isOn: isOn)
            .font(.subheadline)
            .tint(.blue)
            .onChange(of: isOn.wrappedValue) { _ in
                Task { await viewModel.saveAccessibility() }
            }
    }

    @ViewBuilder
    private func statusBadge(_ status: String) -> some View {
        let (color, icon, text): (Color, String, String) = {
            switch status {
            case "passed", "valid": return (.green, "checkmark.circle.fill", status.capitalized)
            case "pending": return (.yellow, "clock.fill", "Pending")
            case "expired": return (.red, "xmark.circle.fill", "Expired")
            case "failed": return (.red, "xmark.circle.fill", "Failed")
            default: return (.gray, "questionmark.circle", "Not Started")
            }
        }()
        Label(text, systemImage: icon)
            .font(.subheadline.weight(.medium))
            .foregroundColor(color)
    }
}
```

- [ ] **Step 3: Add navigation to DriverProfileView.swift**

In the tab selector (~line 306-308), add "Compliance" as a new tab option (case 4), or add a navigation row in the Settings section:

```swift
// In SettingsSection or as new tab case 4:
NavigationLink(destination: ComplianceView(driverId: viewModel.driverId)) {
    Label("Compliance & Safety", systemImage: "shield.checkered")
}
```

- [ ] **Step 4: Add P2PAPIService methods**

Add these methods to `P2PAPIService.swift`:

```swift
// TNC API methods
func getBackgroundCheckStatus(driverId: Int) async throws -> [String: Any]
func getVehicleInspectionStatus(driverId: Int) async throws -> [String: Any]
func submitVehicleInspection(driverId: Int, inspectionDate: String, facilityName: String, barLicense: String?, mileage: Int?, documentUrl: String) async throws -> [String: Any]
func getDriverAccessibility() async throws -> [String: Any]
func updateDriverAccessibility(capable: Bool, features: [String: Bool]) async throws -> [String: Any]
```

Each follows existing P2PAPIService patterns with driverToken auth.

- [ ] **Step 5: Build and verify**

```bash
xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairdelivery -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add apps/ios/delivery/ apps/ios/eatfair-ios-shared/
git commit -m "feat(tnc): add Compliance & Safety screen to iOS driver app — BG check, inspection, accessibility"
```

---

## Wave 3: Android Frontend — Customer + Driver Apps

### Task 8: Android Customer — Accessibility Request UI

**CR Ticket:** CR-TNC-008 — Accessibility request toggle + checkboxes on ride request screen (Android)
**Files:**
- Modify: `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/rideshare/RideRequestScreen.kt`
- Modify: `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/rideshare/RideRequestViewModel.kt`
- Modify: `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt:127-191` (add accessibility params to request body)

- [ ] **Step 1: Add state to RideRequestViewModel.kt**

```kotlin
var accessibilityRequested by mutableStateOf(false)
var accessibilityNotes by mutableStateOf("")
var wheelchairSelected by mutableStateOf(false)
var serviceAnimalSelected by mutableStateOf(false)
var mobilityStorageSelected by mutableStateOf(false)
var audioVisualSelected by mutableStateOf(false)

private fun buildAccessibilityNotes(): String? {
    if (!accessibilityRequested) return null
    val features = buildMap {
        put("wheelchair", wheelchairSelected)
        put("service_animal", serviceAnimalSelected)
        put("mobility_storage", mobilityStorageSelected)
        put("audio_visual", audioVisualSelected)
        if (accessibilityNotes.isNotBlank()) put("notes", accessibilityNotes)
    }
    return Gson().toJson(features)
}
```

- [ ] **Step 2: Add accessibility UI to RideRequestScreen.kt**

Insert before the "Request Ride" button:

```kotlin
// TNC-12: Accessibility Request
Card(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
    Column(modifier = Modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Accessible, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.width(8.dp))
            Text("I need an accessible vehicle", style = MaterialTheme.typography.bodyMedium)
            Spacer()
            Switch(checked = viewModel.accessibilityRequested, onCheckedChange = { viewModel.accessibilityRequested = it })
        }

        AnimatedVisibility(visible = viewModel.accessibilityRequested) {
            Column(modifier = Modifier.padding(top = 12.dp)) {
                Text("Select your needs:", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(8.dp))

                AccessibilityCheckbox("Wheelchair accessible vehicle", viewModel.wheelchairSelected) { viewModel.wheelchairSelected = it }
                AccessibilityCheckbox("Service animal", viewModel.serviceAnimalSelected) { viewModel.serviceAnimalSelected = it }
                AccessibilityCheckbox("Mobility aid storage", viewModel.mobilityStorageSelected) { viewModel.mobilityStorageSelected = it }
                AccessibilityCheckbox("Audio/visual assistance", viewModel.audioVisualSelected) { viewModel.audioVisualSelected = it }

                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = viewModel.accessibilityNotes,
                    onValueChange = { viewModel.accessibilityNotes = it },
                    label = { Text("Additional notes (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )
            }
        }
    }
}
```

Helper composable:
```kotlin
@Composable
private fun AccessibilityCheckbox(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { onCheckedChange(!checked) }.padding(vertical = 4.dp)) {
        Checkbox(checked = checked, onCheckedChange = onCheckedChange)
        Text(label, style = MaterialTheme.typography.bodyMedium)
    }
}
```

- [ ] **Step 3: Wire to API call in CustomerRideshareApiService.kt**

In `createRideRequest()` (~line 127-191), add to the JSON body:

```kotlin
put("accessibility_requested", accessibilityRequested)
if (accessibilityRequested) {
    put("accessibility_notes", buildAccessibilityNotes())
}
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleDebug 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jeet/StudioProjects/eatfair-android
git add app/
git commit -m "feat(tnc-12): add accessibility request UI to Android customer ride request screen"
```

---

### Task 9: Android Customer — Safety Report Dialog

**CR Ticket:** CR-TNC-009 — Safety report dialog on active + completed ride screens (Android)
**Files:**
- Create: `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/rideshare/SafetyReportDialog.kt`
- Modify: Active ride screen (add safety button)
- Modify: `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/ui/rideshare/RideReceiptScreen.kt` (add safety button)
- Modify: `/Users/jeet/StudioProjects/eatfair-android/app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt` (add report API call)

- [ ] **Step 1: Create SafetyReportDialog.kt**

```kotlin
package ai.dollor.customer.ui.rideshare

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

enum class SafetyCategory(val label: String) {
    DRUG_ALCOHOL("Drug/alcohol suspicion"),
    UNSAFE_DRIVING("Unsafe driving"),
    HARASSMENT("Harassment"),
    OTHER("Other safety concern")
}

@Composable
fun SafetyReportDialog(
    driverId: Int,
    rideRequestId: Int?,
    token: String,
    onDismiss: () -> Unit
) {
    var selectedCategory by remember { mutableStateOf(SafetyCategory.DRUG_ALCOHOL) }
    var description by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var showSuccess by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    if (showSuccess) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Report Submitted") },
            text = { Text("The driver has been immediately suspended pending investigation. Our safety team will review within 48 hours.") },
            confirmButton = { TextButton(onClick = onDismiss) { Text("OK") } }
        )
        return
    }

    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        title = { Text("Report Safety Concern") },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text("What happened?", style = MaterialTheme.typography.labelLarge)
                Spacer(modifier = Modifier.height(8.dp))
                SafetyCategory.entries.forEach { category ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth().selectable(selected = selectedCategory == category, onClick = { selectedCategory = category }).padding(vertical = 4.dp)
                    ) {
                        RadioButton(selected = selectedCategory == category, onClick = { selectedCategory = category })
                        Text(category.label, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Describe what happened") },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    maxLines = 5
                )
                if (description.isNotEmpty() && description.length < 10) {
                    Text("Please provide at least 10 characters", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
                }
                errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(top = 4.dp))
                }
                Spacer(modifier = Modifier.height(8.dp))
                Divider()
                Text("You may also contact CPUC:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                Text("1-800-894-9444 | CIU_intake@cpuc.ca.gov", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    scope.launch {
                        isSubmitting = true
                        errorMessage = null
                        try {
                            val fullDesc = "[${selectedCategory.label}] $description"
                            submitSafetyReport(token, driverId, rideRequestId, fullDesc)
                            showSuccess = true
                        } catch (e: Exception) {
                            errorMessage = "Unable to submit. Call CPUC: 1-800-894-9444"
                        }
                        isSubmitting = false
                    }
                },
                enabled = description.length >= 10 && !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Submit Report")
            }
        },
        dismissButton = {
            if (!isSubmitting) TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

private suspend fun submitSafetyReport(token: String, driverId: Int, rideRequestId: Int?, description: String) {
    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        val url = URL("${ai.dollor.shared.config.AppConfig.API.BASE_URL}/api/tnc/zero-tolerance/report")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Authorization", "Bearer $token")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        val body = buildString {
            append("""{"driver_id":$driverId,"description":"${description.replace("\"", "\\\"")}","reporter_type":"customer"""")
            rideRequestId?.let { append(""","ride_request_id":$it""") }
            append("}")
        }
        conn.outputStream.write(body.toByteArray())
        if (conn.responseCode !in 200..299) throw Exception("HTTP ${conn.responseCode}")
    }
}
```

- [ ] **Step 2: Add safety button to RideReceiptScreen.kt**

Add a red "Report Safety Concern" button in the action section:

```kotlin
var showSafetyReport by remember { mutableStateOf(false) }

// In the action buttons area:
OutlinedButton(
    onClick = { showSafetyReport = true },
    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
    modifier = Modifier.fillMaxWidth()
) {
    Icon(Icons.Default.Shield, contentDescription = null, tint = MaterialTheme.colorScheme.error)
    Spacer(modifier = Modifier.width(8.dp))
    Text("Report Safety Concern")
}

if (showSafetyReport) {
    SafetyReportDialog(
        driverId = driverId,
        rideRequestId = rideRequestId,
        token = token,
        onDismiss = { showSafetyReport = false }
    )
}
```

- [ ] **Step 3: Add to active ride screen similarly**

- [ ] **Step 4: Build and verify**

```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :app:assembleDebug 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jeet/StudioProjects/eatfair-android
git add app/
git commit -m "feat(tnc-10): add safety report dialog to Android customer active + completed ride"
```

---

### Task 10: Android Driver — Waybill Display

**CR Ticket:** CR-TNC-010 — Waybill dialog on driver active ride screen (Android)
**Files:**
- Create: `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/WaybillDialog.kt`
- Modify: `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/rides/ActiveRideScreen.kt` (add waybill button)

- [ ] **Step 1: Create WaybillDialog.kt**

Composable that fetches `GET /api/rides/request/{id}/waybill` and displays all fields in a Card-based layout. Follow the same field structure as the iOS WaybillSheet (operator, trip, passenger, route, driver/vehicle, fare, CPUC footer).

- [ ] **Step 2: Add waybill button to ActiveRideScreen.kt toolbar**

Add an info icon button that opens the WaybillDialog as a bottom sheet or full dialog.

- [ ] **Step 3: Build and verify**

```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :driver:assembleDebug 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jeet/StudioProjects/eatfair-android
git add driver/
git commit -m "feat(tnc-15): add waybill display to Android driver active ride screen"
```

---

### Task 11: Android Driver — Compliance Screen

**CR Ticket:** CR-TNC-011 — Compliance & Safety screen in driver profile (Android)
**Files:**
- Create: `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/compliance/ComplianceScreen.kt`
- Create: `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/compliance/ComplianceViewModel.kt`
- Modify: `/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/profile/ProfileScreen.kt` (add navigation to Compliance)
- Modify: Navigation graph (add compliance route)

- [ ] **Step 1: Create ComplianceViewModel.kt**

Hilt ViewModel with:
- `loadBackgroundCheckStatus()` → `GET /api/tnc/background-check/{driverId}/status`
- `loadVehicleInspectionStatus()` → `GET /api/tnc/vehicle-inspection/{driverId}/status`
- `submitVehicleInspection()` → `POST /api/tnc/vehicle-inspection/submit`
- `loadAccessibility()` → `GET /api/tnc/driver/accessibility`
- `saveAccessibility()` → `PATCH /api/tnc/driver/accessibility`

Follow existing ViewModel patterns in the driver app (Hilt injection, StateFlow).

- [ ] **Step 2: Create ComplianceScreen.kt**

Three sections matching iOS ComplianceView:
1. Background Check status card (green/yellow/red badge)
2. Vehicle Inspection card (status + "Submit Inspection" button → form dialog)
3. Accessibility Capability (toggle + checkboxes)

- [ ] **Step 3: Add to navigation**

In the driver app's navigation graph, add:
```kotlin
composable("compliance") {
    ComplianceScreen(navController = navController)
}
```

In ProfileScreen.kt, add a Card row:
```kotlin
Card(onClick = { navController.navigate("compliance") }) {
    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.Shield, contentDescription = null)
        Spacer(modifier = Modifier.width(12.dp))
        Text("Compliance & Safety")
        Spacer(modifier = Modifier.weight(1f))
        Icon(Icons.Default.ChevronRight, contentDescription = null)
    }
}
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :driver:assembleDebug 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jeet/StudioProjects/eatfair-android
git add driver/
git commit -m "feat(tnc): add Compliance & Safety screen to Android driver app"
```

---

## Wave 4: Deploy & Distribute

### Task 12: Deploy Backend

**CR Ticket:** CR-TNC-012 — Deploy TNC frontend backend changes to staging + production
**Files:** None (CI/CD only)

- [ ] **Step 1: Push code to remote**

```bash
cd /Users/jeet/doordash-p2p && git push origin main
```

- [ ] **Step 2: Deploy to staging**

```bash
gh workflow run deploy-staging.yml --ref main
gh run list --workflow=deploy-staging.yml --limit 3
```

- [ ] **Step 3: Smoke test staging**

```bash
# Test new driver accessibility endpoint
curl -s https://d34u5ixl0bulv4.cloudfront.net/api/tnc/driver/accessibility -H "Authorization: Bearer <driver_token>" | python3 -m json.tool

# Test existing TNC endpoints
curl -s https://d34u5ixl0bulv4.cloudfront.net/api/tnc/background-check/1/status -H "Authorization: Bearer <token>" | python3 -m json.tool
curl -s https://d34u5ixl0bulv4.cloudfront.net/api/tnc/vehicle-inspection/1/status -H "Authorization: Bearer <token>" | python3 -m json.tool
```

- [ ] **Step 4: Deploy to production**

```bash
gh workflow run deploy-dollar-ai.yml
gh run list --workflow=deploy-dollar-ai.yml --limit 3
# Wait for completion
gh run watch <run-id>
```

- [ ] **Step 5: Smoke test production**

```bash
curl -s https://api.dollor.ai/api/tnc/driver/accessibility -H "Authorization: Bearer <driver_token>" | python3 -m json.tool
```

---

### Task 13: Build & Distribute iOS Apps

**CR Ticket:** CR-TNC-013 — Build iOS Customer + Driver apps with TNC features → TestFlight
**Files:** None (build only)

- [ ] **Step 1: Bump iOS build numbers**

Increment build numbers in Xcode project settings:
- Customer: current 1115 → 1116
- Driver: current 220 → 221

- [ ] **Step 2: Archive + Upload Customer app**

```bash
xcodebuild archive \
  -workspace apps/ios/customer/eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer -configuration Release \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/customer.xcarchive \
  -exportOptionsPlist apps/ios/customer/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/customer \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```

- [ ] **Step 3: Archive + Upload Driver app**

```bash
xcodebuild archive \
  -workspace apps/ios/delivery/eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery -configuration Release \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates

xcodebuild -exportArchive \
  -archivePath /tmp/dollor-archives/driver.xcarchive \
  -exportOptionsPlist apps/ios/delivery/ExportOptions.plist \
  -exportPath /tmp/dollor-ipas/driver \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8 \
  -authenticationKeyID 9K626GB728 \
  -authenticationKeyIssuerID 80d10e49-f379-462f-9668-5ea53016812e
```

- [ ] **Step 4: Commit build number bump**

```bash
git add apps/ios/
git commit -m "chore(ios): bump build numbers — Customer 1116, Driver 221"
git push origin main
```

---

### Task 14: Build & Distribute Android Apps

**CR Ticket:** CR-TNC-014 — Build Android Customer + Driver apps with TNC features → Firebase
**Files:** None (build only)

- [ ] **Step 1: Bump Android version codes**

In `app/build.gradle.kts` and `driver/build.gradle.kts`, increment `versionCode` and `versionName`.

- [ ] **Step 2: Build release APKs**

```bash
cd /Users/jeet/StudioProjects/eatfair-android
./gradlew :app:assembleRelease :driver:assembleRelease
```

- [ ] **Step 3: Distribute to Firebase**

```bash
firebase appdistribution:distribute app/build/outputs/apk/release/app-release.apk \
  --app "1:65740760476:android:535885ca28086e6242d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "TNC compliance: accessibility request, safety report" \
  --project dollorai-production

firebase appdistribution:distribute driver/build/outputs/apk/release/driver-release.apk \
  --app "1:65740760476:android:7d9bed1ee685434c42d459" \
  --testers "jeetnair.in@gmail.com" \
  --release-notes "TNC compliance: waybill display, compliance screen, accessibility settings" \
  --project dollorai-production
```

- [ ] **Step 4: Commit version bump**

```bash
cd /Users/jeet/StudioProjects/eatfair-android
git add app/build.gradle.kts driver/build.gradle.kts
git commit -m "chore(android): bump Customer + Driver version codes for TNC release"
git push origin main
```

---

## CR Ticket Summary

| CR ID | Feature | Wave | Files |
|-------|---------|------|-------|
| CR-TNC-001 | Driver accessibility DB columns | 1 | models.py, main_new.py |
| CR-TNC-002 | PATCH/GET /api/tnc/driver/accessibility | 1 | tnc_compliance.py, bid_routes.py |
| CR-TNC-003 | TNC endpoint tests | 1 | tests/test_tnc_compliance.py |
| CR-TNC-004 | iOS accessibility request UI | 2 | RideRequestView.swift, RideRequestViewModel.swift, P2PAPIService.swift |
| CR-TNC-005 | iOS safety report sheet | 2 | SafetyReportSheet.swift, RideReceiptView.swift, P2PAPIService.swift |
| CR-TNC-006 | iOS waybill display | 2 | WaybillSheet.swift, ActiveRideView.swift, P2PAPIService.swift |
| CR-TNC-007 | iOS compliance screen | 2 | ComplianceView.swift, ComplianceViewModel.swift, DriverProfileView.swift, P2PAPIService.swift |
| CR-TNC-008 | Android accessibility request UI | 3 | RideRequestScreen.kt, RideRequestViewModel.kt, CustomerRideshareApiService.kt |
| CR-TNC-009 | Android safety report dialog | 3 | SafetyReportDialog.kt, RideReceiptScreen.kt |
| CR-TNC-010 | Android waybill display | 3 | WaybillDialog.kt, ActiveRideScreen.kt |
| CR-TNC-011 | Android compliance screen | 3 | ComplianceScreen.kt, ComplianceViewModel.kt, ProfileScreen.kt |
| CR-TNC-012 | Deploy backend staging + production | 4 | CI/CD |
| CR-TNC-013 | iOS builds → TestFlight | 4 | Build only |
| CR-TNC-014 | Android builds → Firebase | 4 | Build only |

---

## Verification Checklist

After all waves complete:

```
## Verification
- [ ] Backend: curl /api/tnc/driver/accessibility returns 200 with correct fields
- [ ] Backend: curl /api/tnc/zero-tolerance/report returns 200 with driver suspended
- [ ] Backend: curl /api/rides/request/{id}/waybill returns full waybill
- [ ] Backend: tests pass — pytest tests/test_tnc_compliance.py -v
- [ ] iOS Customer: accessibility toggle visible on ride request screen
- [ ] iOS Customer: safety report button visible on active + completed ride
- [ ] iOS Driver: waybill button visible on active ride toolbar
- [ ] iOS Driver: Compliance & Safety screen accessible from profile
- [ ] Android Customer: accessibility toggle visible on ride request screen
- [ ] Android Customer: safety report button visible on completed ride
- [ ] Android Driver: waybill button visible on active ride screen
- [ ] Android Driver: Compliance screen accessible from profile
- [ ] Staging: all endpoints smoke tested
- [ ] Production: deployed and verified
- [ ] iOS: Customer + Driver on TestFlight
- [ ] Android: Customer + Driver on Firebase
```
