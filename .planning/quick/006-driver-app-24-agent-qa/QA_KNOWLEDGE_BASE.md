# Driver App QA Knowledge Base
**Last Updated**: 2026-02-10
**Maintained By**: Claude Code QA System
**Purpose**: Accumulated patterns, findings, and best practices from QA audits

---

## Error Message Patterns

### ✅ Excellent User-Friendly Pattern
**Used in**: RideBiddingViewModel, DeliveryViewModel, DriverLoginView

```swift
// GOOD: Clear action + reason
"Failed to accept order: Network unavailable"
"Please log in to view available rides"
"Password must be at least 8 characters with uppercase, lowercase, number, and special character"
"Unable to retrieve email from Google account. Please ensure your Google account has a valid email."
```

**Pattern Components**:
1. **Failed Action**: "Failed to [verb] [noun]"
2. **Reason**: Why it failed
3. **Suggestion**: What user should do (optional but recommended)

### ⚠️ Avoid Technical Exposure
```swift
// BAD: Exposes raw error
errorMessage = error.localizedDescription

// GOOD: Wrap with context
errorMessage = "Failed to update profile: \(error.localizedDescription)"
```

### Standard ViewModel Error Handling
```swift
@Published var errorMessage: String?
@Published var showError = false

private func showErrorMessage(_ message: String) {
    DispatchQueue.main.async {
        self.errorMessage = message
        self.showError = true
    }
}
```

### Standard View Layer Alert
```swift
.alert("Error", isPresented: $viewModel.showError) {
    Button("OK", role: .cancel) {}
} message: {
    Text(viewModel.errorMessage ?? "An error occurred")
}
```

---

## Smart Error Detection Pattern

### Context-Aware Alert Titles
**Used in**: RideshareDashboardView.swift:153-180

```swift
/// Detect specific error conditions
private var hasActiveRide: Bool {
    viewModel.errorMessage?.contains("active ride") == true
}

private var hasActiveDelivery: Bool {
    viewModel.errorMessage?.contains("active delivery") == true
}

private var isBlockingError: Bool {
    hasActiveRide || hasActiveDelivery
}

/// Smart title based on error type
private var alertTitle: String {
    if hasActiveRide {
        return "Complete Active Ride First"
    } else if hasActiveDelivery {
        return "Complete Delivery First"
    } else {
        return "Error"
    }
}
```

### Smart Alert with Action Button
```swift
.alert(alertTitle, isPresented: $viewModel.showError) {
    if isBlockingError {
        Button("View Active Work") {
            // Navigate to relevant tab
            withAnimation {
                selectedTab = .active
            }
        }
        Button("OK", role: .cancel) {}
    } else {
        Button("OK", role: .cancel) {}
    }
} message: {
    Text(viewModel.errorMessage ?? "An error occurred")
}
```

**Benefits**:
1. User understands WHY they're blocked
2. One-tap navigation to resolve the issue
3. No manual searching for active work
4. Reduces support tickets

**Backend Contract Dependency**:
- Backend MUST include "active ride" or "active delivery" in error messages
- Documented in bid_routes.py and order_flow.py

---

## Logger Pattern (os.Logger)

### Correct Implementation
**Used in**: All Driver app ViewModels

```swift
import os

private let logger = Logger(subsystem: "com.dollorai.delivery", category: "ViewModelName")
```

**Standard Subsystems**:
- `com.dollorai.delivery` - Driver app
- `com.dollorai.customer` - Customer app
- `com.dollorai.restaurant` - Restaurant app

**Category**: Should match class name (e.g., "RideBiddingViewModel")

### Debug-Only Logging
```swift
#if DEBUG
logger.info("[RideBiddingViewModel] fetchAvailableRequests error: \(error)")
#endif
```

**Benefits**:
- Stripped from release builds
- Structured logging in Console.app
- Better filtering than print()

### Migration from print()
```swift
// OLD: print statement
#if DEBUG
print("[DeliveryViewModel] fetchMyDeliveries called")
#endif

// NEW: logger
#if DEBUG
logger.info("[DeliveryViewModel] fetchMyDeliveries called")
#endif
```

**Status**: DeliveryViewModel has 18 print() statements (all DEBUG-only, non-critical)

---

## API Error Handling Pattern

### Backend Error Pass-Through for Known Errors
**Used in**: RideBiddingViewModel.swift:197-208

```swift
case .failure(let error):
    let message = error.localizedDescription
    if message.contains("active ride") || message.contains("active delivery") {
        // Backend message is clear - pass through
        self?.showErrorMessage(message)
    } else {
        // Wrap other errors with context
        self?.showErrorMessage("Failed to submit bid: \(message)")
    }
```

**When to Pass Through**:
- Backend message is user-friendly and actionable
- Contains specific business logic explanation (e.g., blocking conditions)

**When to Wrap**:
- Generic errors (network, timeout, 500)
- Need context about what action failed

### Standard API Call Pattern
```swift
p2pService.methodName(params) { [weak self] result in
    DispatchQueue.main.async {
        self?.isLoading = false

        switch result {
        case .success(let response):
            // Update UI state
            self?.refreshData()

        case .failure(let error):
            self?.showErrorMessage("Failed to [action]: \(error.localizedDescription)")
        }
    }
}
```

**Critical Elements**:
1. `[weak self]` - Prevent retain cycles
2. `DispatchQueue.main.async` - UI updates on main thread
3. `isLoading = false` - Always clear loading state
4. Graceful error handling

---

## Advanced Patterns (DeliveryViewModel)

### Thread-Safe State Management
```swift
private let stateQueue = DispatchQueue(label: "com.dollor.driver.deliveryvm.state")

// Example usage for rate limiting
let isAlreadyInProgress = stateQueue.sync { () -> Bool in
    if orderAcceptanceInProgress.contains(orderId) {
        return true
    }
    orderAcceptanceInProgress.insert(orderId)
    return false
}
```

**Use Cases**:
- Rate limiting (prevent double-tap)
- Shared state access from multiple threads
- Atomic operations

### Rate Limiting (Prevent Double-Tap)
```swift
private var orderAcceptanceInProgress: Set<String> = []
private let rateLimitInterval: TimeInterval = 2.0

// In action handler
guard !isAlreadyInProgress else { return }

// After API call completes
DispatchQueue.main.asyncAfter(deadline: .now() + rateLimitInterval) {
    self.stateQueue.sync { _ = self.orderAcceptanceInProgress.remove(orderId) }
}
```

**Benefits**:
- Prevents duplicate API calls
- Protects backend from race conditions
- Better UX (no accidental double orders)

### Network Offline Handling
```swift
private var isNetworkAvailable: Bool = true
private var pendingActions: [(action: () -> Void, description: String)] = []

private func handleNetworkChange(isAvailable: Bool) {
    if isAvailable && wasOffline {
        // Network restored - retry pending actions
        let actions = pendingActions
        pendingActions.removeAll()
        for pending in actions {
            pending.action()
        }
    }
}
```

**Benefits**:
- Automatic retry when network returns
- No lost actions
- Better offline UX

### Location Update Throttling
```swift
private var lastLocationUpdate: Date = .distantPast
private let locationUpdateMinInterval: TimeInterval = 3.0

func updateDriverLocationOnOrder(...) {
    let now = Date()
    guard now.timeIntervalSince(lastLocationUpdate) >= locationUpdateMinInterval else {
        return // Throttled
    }
    lastLocationUpdate = now

    // Proceed with update
}
```

**Benefits**:
- Reduces API calls (saves backend costs)
- Prevents rate limiting
- Battery efficient

### Input Validation & Sanitization
```swift
guard let orderId = order.id,
      !orderId.isEmpty,
      let orderIdInt = Int(orderId),
      orderIdInt > 0 else {
    showErrorMessage("Invalid order ID. Please try again.")
    return
}
```

**Validation Checklist**:
1. ✅ Not nil
2. ✅ Not empty
3. ✅ Correct type (Int conversion succeeds)
4. ✅ Valid range (positive integer)

---

## ViewModels Audit Summary

| ViewModel | Error Messages | Logger | Thread Safety | API Alignment | Rating |
|-----------|---------------|--------|---------------|---------------|--------|
| RideBiddingViewModel | ✅ Excellent | ✅ Compliant | N/A | ✅ 7/7 endpoints | 10/10 |
| DeliveryViewModel | ✅ Excellent | ⚠️ 18 print() | ✅ Serial queue | ✅ 10/10 endpoints | 9/10 |
| EarningsViewModel | ✅ Good | ✅ Compliant | N/A | ✅ 2/2 endpoints | 9/10 |
| DriverProfileViewModel | ⚠️ 4 raw errors | ✅ Compliant | N/A | ✅ 3/3 endpoints | 8/10 |

**Overall Driver App Quality**: 9.0/10 - World-class

---

## Known Issues & Resolutions

### Issue #1: Print Statements in DeliveryViewModel
**Status**: ⚠️ MINOR - All wrapped in #if DEBUG
**Impact**: None in production
**Recommendation**: Migrate to logger for consistency
**Priority**: P3 (optional cleanup)

### Issue #2: Raw error.localizedDescription in DriverProfileViewModel
**Status**: ⚠️ MINOR - Profile editing only
**Impact**: Low - Usually validation errors
**Lines**: 298, 587, 663, 705
**Recommendation**: Wrap with context
**Priority**: P3 (optional cleanup)

### Issue #3: Backend Contract for Bid Blocking
**Status**: ✅ DOCUMENTED
**Dependency**: Backend MUST include "active ride" or "active delivery" in error messages
**iOS Files**: RideBiddingViewModel.swift:200, RideshareDashboardView.swift:157-162
**Backend Files**: bid_routes.py, order_flow.py
**Priority**: P1 (critical - do not change without coordinating)

---

## Testing Checklists

### Error Message Testing
- [ ] All errors show user-friendly messages
- [ ] No technical jargon (API, 500, stack traces)
- [ ] Messages include action context
- [ ] Messages include recovery suggestion
- [ ] Alert dismissal doesn't leave app in bad state

### Smart Alert Testing (Bid Blocking)
- [ ] "active ride" error shows "Complete Active Ride First" title
- [ ] "active delivery" error shows "Complete Delivery First" title
- [ ] "View Active Work" button navigates to Active tab
- [ ] Generic errors show standard "Error" title
- [ ] Generic errors only show "OK" button (no navigation)

### Logger Testing
- [ ] All ViewModels declare logger with correct subsystem
- [ ] All ViewModels import os
- [ ] No print() statements outside #if DEBUG blocks
- [ ] Release build has no debug logging

### API Contract Testing
- [ ] All endpoints return expected response types
- [ ] Error messages are user-friendly
- [ ] Blocking errors include "active ride" or "active delivery"
- [ ] Success responses trigger correct UI updates

---

## Best Practices for Future Development

### When Adding New ViewModels
1. Import os and declare logger
2. Use standard error handling pattern (@Published errorMessage + showError)
3. Wrap all error.localizedDescription with action context
4. Use #if DEBUG for all debug logging
5. Add comprehensive input validation

### When Adding New Errors
1. Use "Failed to [action]: [reason]" format
2. Include recovery suggestion if possible
3. Never expose API/technical details
4. Test on device to verify message readability

### When Adding Smart Alerts
1. Detect specific error strings from backend
2. Provide context-aware alert title
3. Offer action button to resolve the issue
4. Document backend contract dependency

### When Calling Backend APIs
1. Always use `[weak self]` in closures
2. Always dispatch UI updates to main thread
3. Always clear loading states
4. Always show user-friendly errors
5. Consider optimistic UI updates for better UX

---

## Performance Considerations

### API Call Optimization
- ✅ Rate limiting prevents duplicate calls (2 second interval)
- ✅ Location updates throttled (3 second minimum)
- ✅ Network offline detection prevents wasted calls
- ✅ Silent polling failures (no alert fatigue)

### Memory Management
- ✅ All API closures use `[weak self]`
- ✅ Proper deinit cleanup (timers, listeners)
- ✅ Cancellables cleaned up

### Battery Efficiency
- ✅ Location updates throttled to 3 seconds
- ✅ Polling uses 5-10 second intervals (not real-time WebSocket)
- ✅ Background tasks minimal

---

## Related Documentation

**Internal**:
- `.planning/quick/006-driver-app-24-agent-qa/006-REPORT.md` - Full QA report
- `.planning/CROSS_PLATFORM_QA_AGENTS.md` - 24 QA agent definitions
- `.planning/qa-challenger-reports/2026-02-06_FULL_QA_REPORT.md` - Previous full audit

**Backend**:
- `apps/web/p2p-platform/backend/bid_routes.py` - Rideshare bidding endpoints
- `apps/web/p2p-platform/backend/order_flow.py` - Food delivery endpoints
- `apps/web/p2p-platform/backend/driver_routes.py` - Driver profile endpoints

**Shared Types**:
- `packages/eatfair-shared/Sources/EatFairShared/Models/RideBid.swift`
- `packages/eatfair-shared/Sources/EatFairShared/Models/P2PDeliveryOrder.swift`
- `packages/eatfair-shared/Sources/EatFairShared/Services/P2PAPIService.swift`

---

**Maintained By**: Claude Code QA Agent
**Last Audit**: Quick Task 006 (2026-02-10)
**Next Audit**: On-demand or before major releases
