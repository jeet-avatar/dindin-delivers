# 🔗 QUICK INTEGRATION GUIDE

## How to connect the new features to your existing apps

---

## 📱 CUSTOMER APP INTEGRATION

### 1. Add Rate & Tip Buttons to Order Tracking

Find your `OrderTrackingView.swift` or `OrderSuccessView.swift` and add:

```swift
import EatFairShared

struct OrderTrackingView: View {
    let order: Order
    @State private var showingRating = false
    @State private var showingTip = false
    
    var body: some View {
        VStack {
            // ... existing order tracking UI ...
            
            // Show after delivery is complete
            if order.status == "delivered" {
                VStack(spacing: 12) {
                    if !order.isRated {
                        Button {
                            showingRating = true
                        } label: {
                            HStack {
                                Image(systemName: "star.fill")
                                Text("Rate Your Driver")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                    
                    if !order.isTipped {
                        Button {
                            showingTip = true
                        } label: {
                            HStack {
                                Image(systemName: "heart.fill")
                                Text("Add Tip")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.pink)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                }
                .padding()
            }
        }
        .sheet(isPresented: $showingRating) {
            RateDriverView(order: order)
        }
        .sheet(isPresented: $showingTip) {
            TipDriverView(order: order)
        }
    }
}
```

### 2. Add Promotion Code to Checkout

Find your `CheckoutView.swift` or `CartView.swift` and add:

```swift
import EatFairShared

struct CheckoutView: View {
    @StateObject private var viewModel = CheckoutViewModel()
    @State private var promotionCode = ""
    
    var body: some View {
        Form {
            // ... existing checkout fields ...
            
            Section("Promotion Code") {
                HStack {
                    TextField("Enter code", text: $promotionCode)
                        .textInputAutocapitalization(.characters)
                    
                    Button("Apply") {
                        viewModel.applyPromotionCode(
                            code: promotionCode,
                            restaurantId: restaurant.id,
                            subtotal: cartTotal
                        )
                    }
                    .disabled(promotionCode.isEmpty)
                }
                
                if viewModel.discount > 0 {
                    HStack {
                        Text("Discount")
                        Spacer()
                        Text("-$\(String(format: "%.2f", viewModel.discount))")
                            .foregroundColor(.green)
                    }
                }
            }
            
            Section("Order Summary") {
                HStack {
                    Text("Subtotal")
                    Spacer()
                    Text("$\(String(format: "%.2f", subtotal))")
                }
                
                if viewModel.discount > 0 {
                    HStack {
                        Text("Discount")
                        Spacer()
                        Text("-$\(String(format: "%.2f", viewModel.discount))")
                            .foregroundColor(.green)
                    }
                }
                
                HStack {
                    Text("Tax (\(deliveryAddress.state) \(String(format: "%.2f", taxRate))%)")
                    Spacer()
                    Text("$\(String(format: "%.2f", tax))")
                }
                
                HStack {
                    Text("Total")
                        .fontWeight(.bold)
                    Spacer()
                    Text("$\(String(format: "%.2f", total))")
                        .fontWeight(.bold)
                }
            }
        }
    }
}

// Create CheckoutViewModel.swift if you don't have one
class CheckoutViewModel: ObservableObject {
    @Published var discount: Double = 0
    @Published var promotionCode: String?
    
    private let db = Firestore.firestore()
    
    func applyPromotionCode(code: String, restaurantId: String, subtotal: Double) {
        db.collection("promotions")
            .whereField("code", isEqualTo: code.uppercased())
            .whereField("restaurantId", isEqualTo: restaurantId)
            .whereField("isActive", isEqualTo: true)
            .getDocuments { snapshot, error in
                guard let document = snapshot?.documents.first,
                      let promotion = try? document.data(as: Promotion.self) else {
                    // Show error: Invalid code
                    return
                }
                
                if PromotionCalculator.isPromotionValid(promotion, currentTime: Date()) {
                    self.discount = PromotionCalculator.applyPromotion(
                        promotion: promotion,
                        subtotal: subtotal,
                        deliveryFee: 0,
                        total: subtotal
                    )
                    self.promotionCode = code
                }
            }
    }
}
```

---

## 🍽️ RESTAURANT APP INTEGRATION

### 1. Add Promotions Tab to Main Navigation

Find your main app file (e.g., `RestaurantDashboardView.swift` or `ContentView.swift`):

```swift
import SwiftUI

struct RestaurantDashboardView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            OrdersView()
                .tabItem {
                    Label("Orders", systemImage: "list.bullet")
                }
                .tag(0)
            
            MenuView()
                .tabItem {
                    Label("Menu", systemImage: "fork.knife")
                }
                .tag(1)
            
            // NEW: Add Promotions Tab
            PromotionsView(restaurantId: Auth.auth().currentUser?.uid ?? "")
                .tabItem {
                    Label("Promotions", systemImage: "tag.fill")
                }
                .tag(2)
            
            AnalyticsView()
                .tabItem {
                    Label("Analytics", systemImage: "chart.bar.fill")
                }
                .tag(3)
        }
    }
}
```

---

## 🚗 DELIVERY APP INTEGRATION

### 1. Add Go Online/Offline Button to Dashboard

Find your `DriverDashboardView.swift`:

```swift
import SwiftUI

struct DriverDashboardView: View {
    @StateObject private var earningsVM = EarningsViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Go Online/Offline Button
                Button {
                    if earningsVM.isOnline {
                        earningsVM.endSession()
                    } else {
                        earningsVM.startSession()
                    }
                } label: {
                    HStack {
                        Image(systemName: earningsVM.isOnline ? "pause.circle.fill" : "play.circle.fill")
                        Text(earningsVM.isOnline ? "Go Offline" : "Go Online")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(earningsVM.isOnline ? Color.red : Color.green)
                    .cornerRadius(12)
                }
                .padding()
                
                // NEW: Add Driver Stats Card
                DriverStatsCard()
                    .padding(.horizontal)
                
                // ... existing dashboard content ...
            }
        }
    }
}
```

### 2. Add Tip Notifications to Delivery Completion

Create a tip listener in your `EarningsViewModel.swift`:

```swift
class EarningsViewModel: ObservableObject {
    @Published var recentTips: [Tip] = []
    private var tipListener: ListenerRegistration?
    
    func listenForTips() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        
        tipListener = db.collection("tips")
            .whereField("driverId", isEqualTo: uid)
            .order(by: "createdAt", descending: true)
            .limit(to: 5)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }
                
                self?.recentTips = documents.compactMap { doc in
                    try? doc.data(as: Tip.self)
                }
            }
    }
    
    deinit {
        tipListener?.remove()
    }
}
```

Then in your dashboard, show tip notifications:

```swift
// In DriverDashboardView
ForEach(earningsVM.recentTips.prefix(3)) { tip in
    TipNotificationView(tip: tip)
        .padding(.horizontal)
}
```

---

## 🔥 FIREBASE CONSOLE SETUP

### Step-by-Step:

#### 1. Create Collections
```
Firebase Console → Firestore Database → Data → Start collection
```

Create these 5 new collections:
- `ratings`
- `driver_sessions`
- `promotions`
- `tips`
- `promotion_usage`

Add a dummy document to each (will be deleted after first real data).

#### 2. Create Indexes
```
Firebase Console → Firestore Database → Indexes → Create Index
```

For each index in `FIRESTORE_DEPLOYMENT.md`, click "Create Index" and wait for it to build.

#### 3. Update Security Rules
```
Firebase Console → Firestore Database → Rules → Edit Rules
```

Copy the complete rules from `FIRESTORE_DEPLOYMENT.md` and click "Publish".

#### 4. Update Existing Collections

In `drivers` collection, add to each driver document:
```json
{
  "stats": {
    "rating": 0.0,
    "totalDeliveries": 0,
    "completedDeliveries": 0,
    "totalEarnings": 0.0,
    "totalDistance": 0.0,
    "totalOnlineTime": 0.0,
    "acceptanceRate": 0.0,
    "completionRate": 0.0,
    "onTimeRate": 0.0,
    "weeklyDeliveries": 0,
    "weeklyEarnings": 0.0
  },
  "currentSessionId": null,
  "isOnline": false
}
```

---

## 🧪 TESTING CHECKLIST

### Customer App:
- [ ] Apply promo code "SAVE20" → see discount
- [ ] Place order → tax calculated correctly
- [ ] After delivery → rate driver button shows
- [ ] After delivery → tip driver button shows
- [ ] Submit rating → rating saved to Firestore
- [ ] Add tip → tip saved and driver notified

### Restaurant App:
- [ ] Open Promotions tab
- [ ] Create promotion with code "FIRST10"
- [ ] Set 10% off, min $20
- [ ] Toggle active/inactive
- [ ] View usage count

### Delivery App:
- [ ] Tap "Go Online" → session starts
- [ ] Complete a delivery
- [ ] See tip notification
- [ ] Send thank-you message
- [ ] Tap "Go Offline" → session ends
- [ ] View stats card → numbers update

---

## 📱 BUILD & RUN

```bash
# Build all iOS apps
cd /Users/jeet/StudioProjects/eatfair-ios

# Customer App
xcodebuild -workspace EatFair.xcworkspace -scheme eatfaircustomer -configuration Debug

# Restaurant App
xcodebuild -workspace EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug

# Delivery App
xcodebuild -workspace EatFair.xcworkspace -scheme eatffairdelivery -configuration Debug
```

Or just open Xcode and run each app on the simulator!

---

## ⚠️ COMMON ISSUES

### Issue: "Missing index" error
**Fix:** Go to Firebase Console → Indexes, wait for all indexes to build (5-10 min)

### Issue: "Permission denied"
**Fix:** Make sure security rules are deployed in Firebase Console

### Issue: Import errors in Xcode
**Fix:** In Xcode, go to File → Packages → Update to Latest Package Versions

### Issue: Can't find EatFairShared models
**Fix:** Make sure the eatfair-ios-shared package is added to each app target

---

## 🎉 YOU'RE DONE!

All features are implemented and ready to test. Follow the integration steps above to connect them to your existing UI.

**Files to integrate:**
- Customer: `RateDriverView.swift`, `TipDriverView.swift`
- Restaurant: `PromotionsView.swift`, `CreatePromotionView.swift`
- Delivery: `TipNotificationView.swift`, `DriverStatsCard.swift`

**Next:** Deploy Firestore changes and test end-to-end!
