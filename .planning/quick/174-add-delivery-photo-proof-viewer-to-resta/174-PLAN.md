---
phase: quick-174
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
  - apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
autonomous: true
requirements: [QUICK-174]

must_haves:
  truths:
    - "P2PVendorOrder decodes delivery_photo_url from backend JSON without crashing"
    - "Order struct carries deliveryPhotoUrl so it flows to EnhancedDashboardView"
    - "History tab shows a thumbnail photo card for delivered orders that have a delivery photo"
    - "Tapping the thumbnail opens a full-screen sheet with the full-resolution photo"
  artifacts:
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift"
      provides: "deliveryPhotoUrl field on P2PVendorOrder; field passed through toOrder()"
      contains: "deliveryPhotoUrl"
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift"
      provides: "deliveryPhotoUrl field on Order struct"
      contains: "deliveryPhotoUrl"
    - path: "apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift"
      provides: "DeliveryPhotoPreviewView + photo thumbnail in EnhancedOrderCard history section"
      contains: "DeliveryPhotoPreviewView"
  key_links:
    - from: "P2PVendorOrder.toOrder()"
      to: "Order.deliveryPhotoUrl"
      via: "deliveryPhotoUrl: deliveryPhotoUrl parameter in Order init"
    - from: "EnhancedOrderCard (history section)"
      to: "DeliveryPhotoPreviewView"
      via: "fullScreenCover on showDeliveryPhoto state"
---

<objective>
Add delivery photo proof viewer to the restaurant app's history tab.

Purpose: Restaurant owners can see photographic proof that a delivery was completed when reviewing delivered orders in their history.
Output: deliveryPhotoUrl field threaded from backend JSON → P2PVendorOrder → Order → EnhancedDashboardView history card with AsyncImage thumbnail + full-screen preview sheet.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CR ticket and add deliveryPhotoUrl to P2PVendorOrder + Order</name>
  <files>
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift
    apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift
  </files>
  <action>
    First, create a Change Request ticket per ticketed-task skill:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
      -H "Content-Type: application/json" \
      -d '{"title":"Add delivery photo proof viewer to restaurant app history tab","description":"Add deliveryPhotoUrl field to P2PVendorOrder and Order structs; show delivery photo thumbnail with full-screen preview in EnhancedDashboardView history tab","change_type":"code","priority":"Medium","requested_by":"support@dollor.ai"}'
    ```
    Then submit it:
    ```bash
    curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/<cr_id>/submit?secret_key=$ADMIN_SECRET_KEY"
    ```

    **In P2PAPIService.swift — P2PVendorOrder struct (around line 10507):**

    1. Add field after `vendorName` (before CodingKeys enum, around line 10543):
    ```swift
    // Delivery proof photo
    public let deliveryPhotoUrl: String?
    ```

    2. Add CodingKey after `case vendorName = "vendor_name"` (inside the existing CodingKeys enum, around line 10572):
    ```swift
    case deliveryPhotoUrl = "delivery_photo_url"
    ```

    3. In `toOrder()` method (around line 10717), pass the field through by adding `deliveryPhotoUrl: deliveryPhotoUrl` to the Order init call. Add it after `leaveAtDoor: leaveAtDoor`:
    ```swift
    leaveAtDoor: leaveAtDoor,
    deliveryPhotoUrl: deliveryPhotoUrl
    ```

    **In Order.swift (EatFairShared/Models/Order.swift):**

    4. Add property after `leaveAtDoor` (around line 377):
    ```swift
    // Delivery proof photo URL
    public var deliveryPhotoUrl: String?
    ```

    5. Add to CodingKeys enum after `case leaveAtDoor` (around line 395):
    ```swift
    case deliveryPhotoUrl
    ```

    6. Add decoding after `leaveAtDoor = try container.decodeIfPresent(Bool.self, forKey: .leaveAtDoor)` (around line 473):
    ```swift
    deliveryPhotoUrl = try container.decodeIfPresent(String.self, forKey: .deliveryPhotoUrl)
    ```

    7. Add to the long `public init(...)` parameter list — append `deliveryPhotoUrl: String? = nil` as the last parameter.

    8. Add `self.deliveryPhotoUrl = deliveryPhotoUrl` in the init body after `self.leaveAtDoor = leaveAtDoor`.

    9. Add `self.deliveryPhotoUrl = nil` in `public init()` (the empty init around line 529) after `self.leaveAtDoor = nil`.

    The `Order` struct's `init(from decoder:)` already handles optional fields cleanly — follow the same `decodeIfPresent` pattern as `leaveAtDoor`.
  </action>
  <verify>
    Build the EatFairShared package:
    ```bash
    xcodebuild -project apps/ios/eatfair-ios-shared/Package.swift build 2>/dev/null | tail -5
    ```
    Or verify via the restaurant app build in Task 2. If build errors occur, check that the Order init's parameter list includes `deliveryPhotoUrl: String? = nil` and the body has `self.deliveryPhotoUrl = deliveryPhotoUrl`.
  </verify>
  <done>
    P2PVendorOrder has `deliveryPhotoUrl: String?` with `case deliveryPhotoUrl = "delivery_photo_url"` CodingKey. Order struct has `deliveryPhotoUrl: String?` in property, CodingKeys, decoder, and both inits. toOrder() passes the value through.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add DeliveryPhotoPreviewView and photo thumbnail to history tab in EnhancedDashboardView</name>
  <files>
    apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
  </files>
  <action>
    In EnhancedDashboardView.swift, make two additions:

    **A. Add DeliveryPhotoPreviewView component** — add this new struct after the `EmptyOrdersView` struct (around line 1464):

    ```swift
    // MARK: - Delivery Photo Preview
    struct DeliveryPhotoPreviewView: View {
        let photoUrl: String
        @Environment(\.dismiss) var dismiss

        var body: some View {
            NavigationStack {
                ZStack {
                    Color.black.ignoresSafeArea()
                    AsyncImage(url: URL(string: photoUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        case .failure:
                            VStack(spacing: 12) {
                                Image(systemName: "photo.slash")
                                    .font(.system(size: 48))
                                    .foregroundColor(.white.opacity(0.6))
                                Text("Photo unavailable")
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        case .empty:
                            ProgressView()
                                .tint(.white)
                        @unknown default:
                            EmptyView()
                        }
                    }
                }
                .navigationTitle("Delivery Photo")
                .navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(Color.black, for: .navigationBar)
                .toolbarColorScheme(.dark, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") { dismiss() }
                            .foregroundColor(.white)
                    }
                }
            }
        }
    }
    ```

    **B. Add photo thumbnail to EnhancedOrderCard for delivered orders** — find the `EnhancedOrderCard` struct (around line 401). Add a `@State private var showDeliveryPhoto = false` state variable alongside the existing `@State` variables at the top of the struct.

    Then, find the section in the `body` where the order status is `"delivered"`. Look for the else branch (after all the active status checks) that falls through for delivered/cancelled orders — this renders at the bottom of the card. The delivered status likely renders in the final `else` block or after the `pending_delivery_proof` block (around line 1380). Add a delivery photo section there:

    Find the block that handles `order.status.lowercased() == "delivered"` OR add a conditional block just before `.onChange(of: order.status)` (around line 1427) that handles all terminal statuses:

    ```swift
    // Delivery photo proof (shown on delivered orders in history)
    if order.status.lowercased() == "delivered",
       let photoUrl = order.deliveryPhotoUrl, !photoUrl.isEmpty {
        Divider()
            .padding(.horizontal)
        Button {
            showDeliveryPhoto = true
        } label: {
            HStack(spacing: 12) {
                AsyncImage(url: URL(string: photoUrl)) { phase in
                    if case .success(let image) = phase {
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: 64, height: 64)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 64, height: 64)
                            .overlay(
                                Image(systemName: "photo")
                                    .foregroundColor(.gray)
                            )
                    }
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Delivery Photo")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Text("Tap to view full size")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
        .buttonStyle(.plain)
        .fullScreenCover(isPresented: $showDeliveryPhoto) {
            DeliveryPhotoPreviewView(photoUrl: photoUrl)
        }
    }
    ```

    Use `.fullScreenCover` (not `.sheet`) to avoid SwiftUI double-dismissal issues with nested sheets — see decision from quick-147.
  </action>
  <verify>
    Build the restaurant app:
    ```bash
    xcodebuild -workspace apps/ios/EatFair.xcworkspace \
      -scheme eatffairrestaurant -configuration Staging \
      -destination 'generic/platform=iOS' build 2>&1 | grep -E "error:|warning:|BUILD SUCCEEDED|BUILD FAILED" | tail -20
    ```
    Zero build errors required. Warnings are acceptable.
  </verify>
  <done>
    Restaurant app builds with zero errors. `DeliveryPhotoPreviewView` struct exists in EnhancedDashboardView.swift. EnhancedOrderCard renders a photo thumbnail row with "Delivery Photo / Tap to view full size" for delivered orders where `deliveryPhotoUrl` is non-nil and non-empty. Tapping opens `DeliveryPhotoPreviewView` in a full-screen cover.
  </done>
</task>

</tasks>

<verification>
1. Build passes: `xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Staging -destination 'generic/platform=iOS' build` exits 0
2. `grep -n "deliveryPhotoUrl" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` shows 3 hits (property, CodingKey, toOrder call)
3. `grep -n "deliveryPhotoUrl" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Models/Order.swift` shows 5+ hits (property, CodingKey, decoder, init param, init body, empty init)
4. `grep -n "DeliveryPhotoPreviewView\|showDeliveryPhoto" apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift` shows the new view and state variable
</verification>

<success_criteria>
- P2PVendorOrder.deliveryPhotoUrl decodes `delivery_photo_url` from backend JSON (nil-safe, no crash if field absent)
- Order.deliveryPhotoUrl carries the value through from P2PVendorOrder.toOrder()
- EnhancedOrderCard in history tab shows a 64x64 thumbnail for delivered orders with a photo URL
- Tapping thumbnail opens full-screen DeliveryPhotoPreviewView with AsyncImage loading
- Zero build errors on restaurant app
</success_criteria>

<output>
After completion, create `.planning/quick/174-add-delivery-photo-proof-viewer-to-resta/174-SUMMARY.md` with what was changed, files modified, and CR ID.

Commit message format: `feat(quick-174): [CR-XXXX] add delivery photo proof viewer to restaurant history tab`
</output>
