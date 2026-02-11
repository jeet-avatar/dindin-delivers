# Dollor iOS Customer App - Payment System Failure Analysis

**Document Type:** CTO-Level Technical Analysis
**Date:** 2026-01-28
**Build:** 70
**Priority:** P0 - Critical
**Status:** Under Investigation

---

## Executive Summary

Two critical payment-related issues have been identified in the Dollor iOS Customer App:

1. **Order Success Screen Not Displaying** - After successful payment, the confirmation screen fails to appear
2. **Apple Pay Regression** - Apple Pay was previously functional but is now failing

This document provides root cause analysis, technical architecture review, and remediation recommendations.

---

## Issue #1: Order Success Screen Not Displaying

### Symptom
After completing a Stripe payment, the user is not shown the `OrderSuccessView`. The payment processes successfully (money is charged), but no visual confirmation is displayed.

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MainAppView                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  .sheet(isPresented: $showCartSheet)                            │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  MultiRestaurantCartView                                 │   │   │
│  │  │  ┌─────────────────────────────────────────────────┐   │   │   │
│  │  │  │  .sheet(isPresented: $showCheckout)             │   │   │   │
│  │  │  │  ┌─────────────────────────────────────────┐   │   │   │   │
│  │  │  │  │  MultiRestaurantCheckoutView            │   │   │   │   │
│  │  │  │  │  - Processes payment                    │   │   │   │   │
│  │  │  │  │  - Sets cartVM.orderPlaced = true       │   │   │   │   │
│  │  │  │  └─────────────────────────────────────────┘   │   │   │   │
│  │  │  └─────────────────────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  .fullScreenCover(isPresented: $showOrderSuccess)                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  OrderSuccessView  ← SHOULD APPEAR BUT DOESN'T                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Root Cause Analysis

#### Primary Cause: SwiftUI Nested Sheet Dismissal Race Condition

**Location:** `MainAppView.swift` lines 88-100

```swift
.onChange(of: multiCartViewModel.orderPlaced) { _, newValue in
    if newValue {
        showCartSheet = false  // Dismisses OUTER sheet
        // Checkout sheet (INNER) is also dismissed as child
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            showOrderSuccess = true  // Tries to present fullScreenCover
            multiCartViewModel.orderPlaced = false
        }
    }
}
```

**Problem:** SwiftUI has a known limitation where presenting a `fullScreenCover` while sheets are being dismissed can fail silently. The 1.0 second delay may not be sufficient for:

1. Outer sheet (`MultiRestaurantCartView`) dismissal animation
2. Inner sheet (`MultiRestaurantCheckoutView`) dismissal animation
3. View hierarchy cleanup

#### Secondary Cause: View Lifecycle Destruction

When `showCartSheet = false` is set:
- `MultiRestaurantCartView` begins dismissal
- `MultiRestaurantCheckoutView` (nested sheet) is destroyed
- The completion handler in `placeOrder()` may not execute properly if the view is deallocated before the async callback returns

**Location:** `MultiRestaurantCheckoutView.swift` lines 1044-1064

```swift
cartVM.placeOrder(...) { result in
    DispatchQueue.main.async {
        isProcessing = false
        switch result {
        case .success:
            cartVM.orderPlaced = true  // This may not trigger onChange
        case .failure(let error):
            // Error handling
        }
    }
}
```

#### Tertiary Cause: State Observation Timing

The `@Published var orderPlaced` in `MultiRestaurantCartViewModel` triggers the `onChange` in `MainAppView`. However, if the view hierarchy is in a transitional state during sheet dismissal, SwiftUI may not properly observe or act on this state change.

### Data Flow Analysis

```
Payment Success Flow (Expected):
1. Stripe PaymentSheet completes → .completed
2. onStripePaymentCompletion() called
3. placeOrder() called
4. P2P Backend creates order
5. cartVM.placeOrder completion handler fires
6. cartVM.orderPlaced = true
7. MainAppView.onChange triggers
8. showCartSheet = false
9. After 1.0s delay: showOrderSuccess = true
10. OrderSuccessView appears

Actual Flow (Broken):
1-6. Same as expected
7. MainAppView.onChange triggers
8. showCartSheet = false (sheet dismissal begins)
9. View hierarchy is in transitional state
10. After 1.0s: showOrderSuccess = true
11. fullScreenCover FAILS to present (SwiftUI limitation with nested sheets)
```

### Evidence

| Component | Expected | Actual |
|-----------|----------|--------|
| Payment charged | Yes | Yes |
| `orderPlaced` set to `true` | Yes | Yes (verified) |
| Cart sheet dismissed | Yes | Yes |
| Success screen appears | Yes | **NO** |

---

## Issue #2: Apple Pay Not Working

### Symptom
Apple Pay was previously functional but now fails. Stripe PaymentSheet (card payments) works correctly.

### Technical Architecture

```
Apple Pay Flow:
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  processApplePay()   │────▶│  PaymentService      │────▶│  Backend API         │
│  (CheckoutView)      │     │  .createPaymentIntent│     │  /api/erp/payments   │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────┐     ┌──────────────────────┐
│  StripeApplePayHandler│────▶│  STPApplePayContext  │
│  .handleApplePay()   │     │  (Stripe SDK)        │
└──────────────────────┘     └──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  PKPaymentSheet      │
│  (Apple Pay UI)      │
└──────────────────────┘
```

### Root Cause Analysis

#### Potential Cause #1: Merchant ID Configuration Mismatch

**Historical Issue (FIXED in Build 70):**

| File | Previous Value | Current Value |
|------|----------------|---------------|
| `eatfaircustomer.entitlements` | `merchant.com.dolloraiai` | `merchant.com.dollorai.customer` |
| `eatfaircustomerDebug.entitlements` | `merchant.com.dolloraiai` | `merchant.com.dollorai.customer` |
| `CheckoutView.swift` | `merchant.com.dolloraiai` | `merchant.com.dollorai.customer` |
| `MultiRestaurantCheckoutView.swift` | `merchant.com.dollorai.customer` | `merchant.com.dollorai.customer` |

**Source of Truth:** `CUSTOMER_APP_SOURCE_OF_TRUTH.md` specifies `merchant.com.dollorai.customer`

**Status:** Entitlements and code now match. This should be resolved.

#### Potential Cause #2: Stripe Configuration in Backend

The Apple Pay flow requires:
1. Backend returns `PaymentIntent` with correct merchant ID
2. Stripe Dashboard has merchant ID configured
3. Apple Pay certificate uploaded to Stripe

**Backend Endpoint:** `/api/erp/payments/intent`

If the backend is not configured with the Apple Pay merchant ID, the payment will fail.

#### Potential Cause #3: STPApplePayContext Presentation

**Location:** `PaymentService.swift` lines 222-232

```swift
guard let applePayContext = STPApplePayContext(paymentRequest: request, delegate: self) else {
    resetPaymentState()
    completion(false, NSError(...))
    return
}

DispatchQueue.main.async {
    applePayContext.presentApplePay()
}
```

The `STPApplePayContext` requires:
- Valid merchant ID in entitlements
- Apple Pay capability enabled in Xcode project
- Device has Apple Pay configured with valid cards

#### Potential Cause #4: Certificate/Key Expiration

Apple Pay requires:
1. **Merchant Identity Certificate** - May have expired
2. **Payment Processing Certificate** - Must be valid in Stripe Dashboard

### Verification Checklist

| Item | Status | Notes |
|------|--------|-------|
| Entitlements match Source of Truth | ✅ Fixed | `merchant.com.dollorai.customer` |
| Code matches Source of Truth | ✅ Fixed | All files updated |
| Stripe Dashboard Apple Pay enabled | ⚠️ Verify | Check Stripe Dashboard |
| Apple Pay certificate valid | ⚠️ Verify | Check Apple Developer Portal |
| Backend returns correct PaymentIntent | ⚠️ Verify | Test API response |

---

## Recommended Remediation

### For Issue #1: Success Screen Not Showing

#### Option A: Increase Delay (Quick Fix)
```swift
DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
    showOrderSuccess = true
}
```
**Risk:** May still fail on slower devices or network conditions.

#### Option B: Use Transaction Callback (Recommended)
```swift
.onChange(of: multiCartViewModel.orderPlaced) { _, newValue in
    if newValue {
        showCartSheet = false
    }
}

// Separate handler for sheet dismissal completion
.onChange(of: showCartSheet) { _, isShowing in
    if !isShowing && multiCartViewModel.orderPlaced {
        // Sheet fully dismissed, safe to present
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            showOrderSuccess = true
            multiCartViewModel.orderPlaced = false
        }
    }
}
```

#### Option C: Navigate Within Checkout (Most Reliable)
Instead of dismissing sheets and presenting fullScreenCover, navigate to success screen within the checkout flow:

```swift
// In MultiRestaurantCheckoutView
@State private var showSuccess = false

.fullScreenCover(isPresented: $showSuccess) {
    OrderSuccessView()
        .environmentObject(cartVM)
}

// After payment success:
showSuccess = true
```

### For Issue #2: Apple Pay Not Working

#### Step 1: Verify Stripe Dashboard
1. Login to Stripe Dashboard
2. Go to Settings → Payment Methods → Apple Pay
3. Verify merchant ID is `merchant.com.dollorai.customer`
4. Check certificate is valid and not expired

#### Step 2: Verify Apple Developer Portal
1. Login to Apple Developer Portal
2. Go to Certificates, Identifiers & Profiles
3. Check Merchant IDs → `merchant.com.dollorai.customer`
4. Verify certificate is valid

#### Step 3: Test Backend API
```bash
curl -X POST https://api.dollor.ai/api/erp/payments/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 1000, "currency": "usd"}'
```

Verify response contains valid `clientSecret` and `publishableKey`.

#### Step 4: Add Debug Logging
```swift
// In StripeApplePayHandler
func applePayContext(_ context: STPApplePayContext,
                     didCompleteWith status: STPPaymentStatus,
                     error: Error?) {
    #if DEBUG
    print("Apple Pay Status: \(status)")
    if let error = error {
        print("Apple Pay Error: \(error.localizedDescription)")
    }
    #endif
    // ... existing code
}
```

---

## Testing Protocol

### Pre-Release Checklist

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Stripe Card Payment | Select card, complete payment | Success screen appears |
| Apple Pay Payment | Select Apple Pay, authenticate | Success screen appears |
| Payment Cancellation | Start payment, cancel | Return to checkout |
| Network Failure | Disable network mid-payment | Error message shown |
| Empty Cart | Try to checkout empty cart | Error message shown |

### Regression Testing

1. Place order with Stripe card
2. Place order with Apple Pay
3. Verify success screen appears for both
4. Verify order appears in Order History
5. Verify order appears in Restaurant App
6. Verify order appears in Driver App

---

## Appendix A: File References

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `MainAppView.swift` | Success screen presentation | 82-100 |
| `MultiRestaurantCheckoutView.swift` | Payment processing | 860-930, 1044-1064 |
| `MultiRestaurantCartView.swift` | Checkout sheet presentation | 125-127 |
| `PaymentService.swift` | Stripe/Apple Pay integration | 189-294 |
| `MultiRestaurantCartViewModel.swift` | Order placement | 271-367 |
| `eatfaircustomer.entitlements` | Apple Pay merchant ID | 11-14 |

## Appendix B: Configuration Values

| Config | Value | Source |
|--------|-------|--------|
| Merchant ID | `merchant.com.dollorai.customer` | Source of Truth |
| Bundle ID | `com.dollorai.customer` | Source of Truth |
| Team ID | `PRKZ4UVCD7` | Source of Truth |
| API Base URL | `https://api.dollor.ai` | AppConfig.swift |

---

**Document Prepared By:** AI Engineering Analysis
**Review Required By:** CTO, Lead iOS Engineer
**Next Review Date:** Upon issue resolution
