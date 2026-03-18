---
phase: quick-190
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift
  - apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift
  - apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift
  - apps/ios/delivery/eatffairdelivery/Views/Rideshare/SubmitBidSheet.swift
  - apps/ios/delivery/eatffairdelivery/Views/Rideshare/CounterOfferResponseSheet.swift
  - apps/ios/delivery/eatffairdelivery/Views/Rideshare/RideshareDashboardView.swift
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "SwipeToConfirmButton.swift exists in the shared library and compiles without errors"
    - "All 10 customer ride swipe buttons use SwipeToConfirmButton instead of plain Button/tap"
    - "All 9 driver ride swipe buttons use SwipeToConfirmButton instead of plain Button/tap"
    - "Drag past 80% threshold triggers the action; releasing before 80% snaps back"
    - "Haptic feedback fires on successful completion"
    - "SOS and Cancel Ride buttons remain as plain tap Buttons (not swipe)"
    - "Bid/offer cards (customer bid list and driver available-ride cards) use Tinder-style card swipe"
    - "VoiceOver double-tap activates the swipe action (accessibility)"
  artifacts:
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift"
      provides: "Reusable slide-to-confirm pill component"
      exports: ["SwipeToConfirmButton", "TinderSwipeCard"]
    - path: "apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift"
      provides: "10 customer swipe button integrations"
      contains: "SwipeToConfirmButton"
    - path: "apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift"
      provides: "Driver active-ride swipe buttons (arrived, start, complete, rating, done)"
      contains: "SwipeToConfirmButton"
  key_links:
    - from: "SwipeToConfirmButton"
      to: "onConfirm closure"
      via: "DragGesture translation > 80% width threshold"
      pattern: "gestureOffset / geometry.size.width >= 0.8"
    - from: "TinderSwipeCard"
      to: "onAccept/onDecline closures"
      via: "horizontal DragGesture with 100pt threshold"
      pattern: "translation.width > 100"
---

<objective>
Build the SwipeToConfirmButton shared SwiftUI component and wire it into all 19 rideshare action
points across the iOS Customer and Driver apps.

Purpose: Replace plain tap buttons in the rideshare bid/ride flow with gesture-based confirmations
that reduce accidental taps on high-stakes actions (submitting rides, starting trips, paying fares).
Output: One shared component file + updated caller sites in RideRequestView.swift, ActiveRideView.swift,
SubmitBidSheet.swift, CounterOfferResponseSheet.swift, and RideshareDashboardView.swift.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/DeliveryProofCameraView.swift
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create SwipeToConfirmButton shared component</name>
  <files>apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift</files>
  <action>
Create a new file at the path above with two public SwiftUI views:

**1. SwipeToConfirmButton** — slide-to-confirm pill (iOS power-off style):

```swift
import SwiftUI

public enum SwipeButtonState {
    case idle, dragging, completed, disabled
}

public struct SwipeToConfirmButton: View {
    public let label: String
    public let accentColor: Color
    public let isDisabled: Bool
    public let onConfirm: () -> Void

    @State private var dragOffset: CGFloat = 0
    @State private var buttonState: SwipeButtonState = .idle
    private let thumbSize: CGFloat = 52
    private let height: CGFloat = 60
    private let threshold: CGFloat = 0.80   // 80% of track width

    public init(label: String,
                accentColor: Color = .blue,
                isDisabled: Bool = false,
                onConfirm: @escaping () -> Void) {
        self.label = label
        self.accentColor = accentColor
        self.isDisabled = isDisabled
        self.onConfirm = onConfirm
    }

    public var body: some View {
        GeometryReader { geo in
            let trackWidth = geo.size.width - thumbSize
            let clampedOffset = min(max(dragOffset, 0), trackWidth)
            let progress = clampedOffset / trackWidth

            ZStack(alignment: .leading) {
                // Track
                Capsule()
                    .fill(accentColor.opacity(0.15))
                    .frame(height: height)
                    .overlay(
                        Capsule().stroke(accentColor.opacity(0.4), lineWidth: 1)
                    )

                // Fill strip
                Capsule()
                    .fill(accentColor.opacity(0.25 + 0.25 * progress))
                    .frame(width: clampedOffset + thumbSize, height: height)

                // Label (fades as thumb advances)
                Text(label)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(accentColor)
                    .opacity(1.0 - progress * 1.5)
                    .frame(maxWidth: .infinity)

                // Thumb
                Circle()
                    .fill(buttonState == .completed ? accentColor : .white)
                    .frame(width: thumbSize, height: thumbSize)
                    .shadow(color: .black.opacity(0.15), radius: 4, x: 0, y: 2)
                    .overlay(
                        Image(systemName: buttonState == .completed ? "checkmark" : "chevron.right.2")
                            .foregroundColor(buttonState == .completed ? .white : accentColor)
                            .font(.system(size: 18, weight: .bold))
                    )
                    .offset(x: clampedOffset)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                guard !isDisabled, buttonState != .completed else { return }
                                buttonState = .dragging
                                dragOffset = value.translation.width
                            }
                            .onEnded { _ in
                                guard !isDisabled, buttonState != .completed else { return }
                                let progress = min(max(dragOffset, 0), trackWidth) / trackWidth
                                if progress >= threshold {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        dragOffset = trackWidth
                                        buttonState = .completed
                                    }
                                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                                        onConfirm()
                                    }
                                } else {
                                    withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                        dragOffset = 0
                                        buttonState = .idle
                                    }
                                }
                            }
                    )
                    // VoiceOver accessibility fallback — double-tap activates
                    .accessibilityLabel(label)
                    .accessibilityHint("Double-tap to confirm")
                    .accessibilityAddTraits(.isButton)
                    .onTapGesture { } // prevents SwiftUI from swallowing gestures
            }
            .frame(height: height)
            .opacity(isDisabled ? 0.5 : 1.0)
            .allowsHitTesting(!isDisabled)
        }
        .frame(height: height)
        .onChange(of: isDisabled) { newValue in
            if newValue { dragOffset = 0; buttonState = .idle }
        }
    }
}
```

**2. TinderSwipeCard** — left/right card swipe for bid-list cards:

```swift
public struct TinderSwipeCard<Content: View>: View {
    public let content: Content
    public let onAccept: () -> Void    // swipe right
    public let onDecline: () -> Void   // swipe left
    private let acceptThreshold: CGFloat = 100
    private let declineThreshold: CGFloat = -100

    @State private var offset: CGSize = .zero
    @State private var isDismissed = false

    public init(onAccept: @escaping () -> Void,
                onDecline: @escaping () -> Void,
                @ViewBuilder content: () -> Content) {
        self.onAccept = onAccept
        self.onDecline = onDecline
        self.content = content()
    }

    public var body: some View {
        guard !isDismissed else { return AnyView(EmptyView()) }
        return AnyView(
            content
                .rotationEffect(.degrees(Double(offset.width) / 20))
                .offset(x: offset.width, y: offset.height * 0.3)
                .overlay(
                    HStack {
                        if offset.width > 30 {
                            Label("Accept", systemImage: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.title2.bold())
                                .padding()
                        }
                        Spacer()
                        if offset.width < -30 {
                            Label("Decline", systemImage: "xmark.circle.fill")
                                .foregroundColor(.red)
                                .font(.title2.bold())
                                .padding()
                        }
                    }
                )
                .gesture(
                    DragGesture()
                        .onChanged { value in offset = value.translation }
                        .onEnded { _ in
                            if offset.width >= acceptThreshold {
                                withAnimation(.easeOut(duration: 0.3)) { offset.width = 500 }
                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    isDismissed = true
                                    onAccept()
                                }
                            } else if offset.width <= declineThreshold {
                                withAnimation(.easeOut(duration: 0.3)) { offset.width = -500 }
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    isDismissed = true
                                    onDecline()
                                }
                            } else {
                                withAnimation(.spring()) { offset = .zero }
                            }
                        }
                )
        )
    }
}
```

Add `#Preview` blocks at the bottom for SwiftUI canvas preview. Do NOT modify any other file in this task.
  </action>
  <verify>
Search for the file: `ls apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift`
Confirm it contains both structs: `grep -n "struct SwipeToConfirmButton\|struct TinderSwipeCard" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift`
  </verify>
  <done>File exists, contains SwipeToConfirmButton and TinderSwipeCard structs, uses DragGesture with 80% threshold and UIImpactFeedbackGenerator, has VoiceOver accessibilityLabel and accessibilityHint on the thumb.</done>
</task>

<task type="auto">
  <name>Task 2: Wire SwipeToConfirmButton into Customer app (10 buttons in RideRequestView.swift)</name>
  <files>apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift</files>
  <action>
Add `import EatFairShared` at the top of RideRequestView.swift if not already present.

Replace the 10 tap-based action buttons listed below with SwipeToConfirmButton (or TinderSwipeCard for the bid list cards). Use the exact line numbers from the spec as landmarks — search nearby context to locate each button precisely.

**Slide-to-confirm buttons (8 items — use SwipeToConfirmButton):**

1. ~Line 644 — "Find Driver" / "Request Ride" primary action button in the fare review screen.
   Replace with: `SwipeToConfirmButton(label: "Slide to Find Driver", accentColor: .blue) { /* existing action */ }`

2. ~Line 920 — Custom offer submission button ("Request with $X" or similar).
   Replace with: `SwipeToConfirmButton(label: "Slide to Request with \(formattedCustomOffer)", accentColor: .orange) { /* existing action */ }`
   (Interpolate the dollar amount from whatever local variable holds the custom offer price.)

3. ~Line 2900 — Counter bid submission button in the bid counter sheet.
   Replace with: `SwipeToConfirmButton(label: "Slide to Submit Counter", accentColor: .purple) { /* existing action */ }`

5. ~Line 1853 — "Accept Offer" button in the negotiation card.
   Replace with: `SwipeToConfirmButton(label: "Slide to Accept Offer", accentColor: .green) { /* existing action */ }`

6. ~Line 920 area (R4/R5 negotiation counter, if a separate button exists near the negotiation flow) — Counter submit button during R4/R5 negotiation.
   Replace with: `SwipeToConfirmButton(label: "Slide to Submit Counter", accentColor: .orange) { /* existing action */ }`
   (If this is the same button as #2 contextually, skip to avoid double-replacement.)

7. Payment phase — "Pay $X.XX" Stripe PaymentSheet trigger button (search for `paymentSheet` or `presentPaymentSheet` near a Button).
   Replace with: `SwipeToConfirmButton(label: "Slide to Pay \(formattedFare)", accentColor: .blue) { /* existing PaymentSheet trigger */ }`

8-10. Inside `RideStatusCard` struct (~line 1510 onward) — three completion buttons:
   - Rating submit button (~line 2331): `SwipeToConfirmButton(label: "Slide to Submit Rating", accentColor: .yellow) { /* existing */ }`
   - Tip add button (~line 2447): `SwipeToConfirmButton(label: "Slide to Add \(formattedTip) Tip", accentColor: .green) { /* existing */ }`
   - Done button (~line 2501): `SwipeToConfirmButton(label: "Slide to Done", accentColor: .gray) { /* existing */ }`

**Card swipe (1 item — use TinderSwipeCard):**

4. ~Line 3162 — The bid list card row (likely a `ForEach` inside a bid list section). Wrap the card content in `TinderSwipeCard`:
   ```swift
   TinderSwipeCard(
       onAccept: { /* existing accept bid action */ },
       onDecline: { /* existing decline/ignore action, or no-op if none */ }
   ) {
       /* existing card content (VStack/HStack showing driver name, price, etc.) */
   }
   ```

**Rules:**
- Do NOT touch SOS buttons or "Cancel Ride" buttons — they must remain as plain `.tap` `Button` views.
- Preserve all existing state variables, bindings, closures, and view model calls unchanged.
- Where a Button's `action` closure has multiple lines, move those lines into the SwipeToConfirmButton `onConfirm` closure as-is.
- Add `.padding(.horizontal, 24)` and `.padding(.vertical, 8)` around each SwipeToConfirmButton to give it proper spacing.
- Each SwipeToConfirmButton should be full-width (no `.frame(width:)` constraint — it uses GeometryReader internally).
  </action>
  <verify>
Count SwipeToConfirmButton usages: `grep -c "SwipeToConfirmButton" apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift`
Should be >= 9. Also confirm TinderSwipeCard is used once: `grep -c "TinderSwipeCard" apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift`
Confirm SOS and Cancel are untouched: `grep -n "Cancel Ride\|SOS\|cancelRide\|sos" apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift | grep -i "SwipeToConfirm"` — should return nothing.
  </verify>
  <done>RideRequestView.swift has >= 9 SwipeToConfirmButton usages and 1 TinderSwipeCard usage. SOS and Cancel Ride buttons have no SwipeToConfirmButton. File compiles (no syntax errors visible from grep/structure checks).</done>
</task>

<task type="auto">
  <name>Task 3: Wire SwipeToConfirmButton into Driver app (9 buttons across 4 files)</name>
  <files>
    apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift
    apps/ios/delivery/eatffairdelivery/Views/Rideshare/SubmitBidSheet.swift
    apps/ios/delivery/eatffairdelivery/Views/Rideshare/CounterOfferResponseSheet.swift
    apps/ios/delivery/eatffairdelivery/Views/Rideshare/RideshareDashboardView.swift
  </files>
  <action>
Add `import EatFairShared` at the top of each file that doesn't already have it.

**ActiveRideView.swift (~891 lines) — 5 buttons:**

Locate and replace each action button near the indicated lines:

- ~Line 479 — "Arrived" button (triggered when driver reaches pickup location):
  `SwipeToConfirmButton(label: "Slide — I've Arrived", accentColor: .blue) { /* existing arrived action */ }`

- ~Line 523 — "Start Ride" button (triggered after passenger is in car):
  `SwipeToConfirmButton(label: "Slide to Start Ride", accentColor: .green) { /* existing start action */ }`

- ~Line 561 — "Complete Ride" button (triggered at drop-off):
  `SwipeToConfirmButton(label: "Slide to Complete Ride", accentColor: .orange) { /* existing complete action */ }`

- ~Line 703 — "Rate Passenger" button (post-completion):
  `SwipeToConfirmButton(label: "Slide to Submit Rating", accentColor: .yellow) { /* existing rate action */ }`

- Near the "Done" navigation action after rating (~line 703+ area):
  `SwipeToConfirmButton(label: "Slide to Done", accentColor: .gray) { /* existing navigate-to-dashboard action */ }`

Do NOT touch any "Cancel Ride" or SOS button.

**SubmitBidSheet.swift (~669 lines) — 1 button:**

- ~Line 572 — "Submit Bid" button:
  `SwipeToConfirmButton(label: "Slide to Submit Bid \(formattedBidAmount)", accentColor: .blue) { /* existing submit bid action */ }`
  Interpolate the formatted bid dollar amount from whatever local variable is used near this button.

**CounterOfferResponseSheet.swift (~476 lines) — 2 buttons:**

- ~Line 411 — "Accept Counter" button (driver accepts customer's counter):
  `SwipeToConfirmButton(label: "Slide to Accept \(formattedAmount)", accentColor: .green) { /* existing accept action */ }`

- ~Line 374 — "Send Driver Counter" button (driver sends their own counter):
  `SwipeToConfirmButton(label: "Slide to Send \(formattedAmount) Offer", accentColor: .orange) { /* existing send counter action */ }`

**RideshareDashboardView.swift (~910 lines) — 1 TinderSwipeCard:**

- ~Line 769 — Available ride card row in the bid-card list (ForEach over available rides). Wrap the card body in TinderSwipeCard:
  ```swift
  TinderSwipeCard(
      onAccept: { /* open SubmitBidSheet or existing bid interest action */ },
      onDecline: { /* no-op or skip to next card */ }
  ) {
      /* existing ride card content */
  }
  ```

**Rules (same as Task 2):**
- Preserve all existing bindings, closures, and view model calls.
- Add `.padding(.horizontal, 24).padding(.vertical, 8)` around each SwipeToConfirmButton.
- No `.frame(width:)` on SwipeToConfirmButton — it uses GeometryReader.
- Do NOT modify SOS or Cancel Ride buttons.
  </action>
  <verify>
Check each file for SwipeToConfirmButton usage:
```
grep -c "SwipeToConfirmButton" apps/ios/delivery/eatffairdelivery/Views/Rideshare/ActiveRideView.swift
grep -c "SwipeToConfirmButton" apps/ios/delivery/eatffairdelivery/Views/Rideshare/SubmitBidSheet.swift
grep -c "SwipeToConfirmButton" apps/ios/delivery/eatffairdelivery/Views/Rideshare/CounterOfferResponseSheet.swift
grep -c "TinderSwipeCard" apps/ios/delivery/eatffairdelivery/Views/Rideshare/RideshareDashboardView.swift
```
Expected: 5, 1, 2, 1 respectively.
Confirm no swipe buttons on cancel/SOS: `grep -rn "SwipeToConfirmButton" apps/ios/delivery/eatffairdelivery/Views/Rideshare/ | grep -i "cancel\|sos"` — should be empty.
  </verify>
  <done>ActiveRideView has 5 SwipeToConfirmButton usages (arrived, start, complete, rating, done). SubmitBidSheet has 1. CounterOfferResponseSheet has 2. RideshareDashboardView has 1 TinderSwipeCard. Cancel/SOS untouched.</done>
</task>

</tasks>

<verification>
After all 3 tasks complete:

1. Shared component exists and has both structs:
   `grep -n "struct SwipeToConfirmButton\|struct TinderSwipeCard" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift`

2. Customer app total swipe buttons:
   `grep -c "SwipeToConfirmButton" apps/ios/customer/eatfaircustomer/Views/RideRequestView.swift`
   Expected: >= 9

3. Driver app total swipe buttons (all files combined):
   `grep -rn "SwipeToConfirmButton\|TinderSwipeCard" apps/ios/delivery/eatffairdelivery/Views/Rideshare/`
   Expected: ActiveRideView=5, SubmitBidSheet=1, CounterOfferResponseSheet=2, RideshareDashboardView=1

4. SOS/Cancel untouched in all files:
   `grep -rn "SwipeToConfirmButton\|TinderSwipeCard" apps/ios/ | grep -i "cancel\|sos"` — must be empty

5. Haptic feedback present in component:
   `grep "UIImpactFeedbackGenerator" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift`

6. VoiceOver accessibility present:
   `grep "accessibilityLabel\|accessibilityHint" apps/ios/eatfair-ios-shared/Sources/EatFairShared/Views/SwipeToConfirmButton.swift`
</verification>

<success_criteria>
- SwipeToConfirmButton.swift created in shared library with DragGesture, 80% threshold, spring snap-back, haptic on completion, VoiceOver fallback
- TinderSwipeCard created in same file for bid-card Tinder-style swiping
- 10 customer swipe buttons wired in RideRequestView.swift (9 pill + 1 Tinder card)
- 9 driver swipe buttons wired across 4 driver files (8 pill + 1 Tinder card)
- SOS and Cancel Ride buttons remain as plain tap Buttons throughout
- All existing action closures preserved (no API calls removed or changed)
</success_criteria>

<output>
After completion, create `.planning/quick/190-build-swipetoconfirmbutton-shared-compon/190-SUMMARY.md` with:
- What was built (component API, 2 structs, params)
- Files modified and change counts
- Verification grep outputs showing button counts
- Any implementation notes (e.g., which line numbers shifted)
- CR ticket ID
</output>
