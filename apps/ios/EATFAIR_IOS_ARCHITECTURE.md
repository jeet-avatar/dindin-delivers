# EatFair iOS Platform Architecture

## Complete Technical Documentation

**Version:** 1.0.0
**Last Updated:** December 9, 2024
**Platform:** iOS 17.0+
**Architecture:** MVVM with SwiftUI
**Backend:** Dollor.ai P2P API

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Repository Structure](#repository-structure)
3. [Shared Module (EatFairShared)](#shared-module-eatfairshared)
4. [Customer App](#customer-app-eatfaircustomer)
5. [Delivery App](#delivery-app-eatffairdelivery)
6. [Restaurant App](#restaurant-app-eatffairrestaurant)
7. [Backend Integration](#backend-integration)
8. [Data Flow Architecture](#data-flow-architecture)
9. [Security Architecture](#security-architecture)
10. [Build & Deployment](#build--deployment)

---

## Platform Overview

EatFair is a comprehensive food delivery platform consisting of three iOS applications sharing a common Swift Package for business logic, models, and services.

### Apps at a Glance

| App | Bundle ID | Purpose | Users |
|-----|-----------|---------|-------|
| Customer | com.eatfair.customer | Order food, track deliveries | Consumers |
| Delivery | com.eatfair.delivery | Accept/deliver orders | Drivers |
| Restaurant | com.eatfair.restaurant | Manage orders & menu | Vendors |

### Technology Stack

- **Language:** Swift 5.9+
- **UI Framework:** SwiftUI
- **Architecture:** MVVM (Model-View-ViewModel)
- **Maps:** Google Maps SDK
- **Payments:** Stripe SDK
- **Authentication:** Apple Sign-In, Email/Password
- **Backend:** Dollor.ai P2P REST API
- **Local Storage:** CoreData (legacy), UserDefaults, Keychain

---

## Repository Structure

```
eatfair-ios/
├── apps/
│   └── ios/
│       ├── customer/                    # Customer iOS App
│       │   ├── eatfaircustomer/
│       │   ├── eatfaircustomer.xcodeproj
│       │   └── eatfaircustomer.xcworkspace
│       │
│       ├── delivery/                    # Delivery Driver iOS App
│       │   ├── eatffairdelivery/
│       │   ├── eatffairdelivery.xcodeproj
│       │   └── eatffairdelivery.xcworkspace
│       │
│       ├── restaurant/                  # Restaurant iOS App
│       │   ├── eatffairrestaurant/
│       │   ├── eatffairrestaurant.xcodeproj
│       │   └── eatffairrestaurant.xcworkspace
│       │
│       ├── eatfair-ios-shared/          # Shared Swift Package
│       │   ├── Package.swift
│       │   └── Sources/EatFairShared/
│       │
│       └── EatFair.xcworkspace          # Combined Workspace
│
└── apps/web/p2p-platform/
    ├── backend/                         # Python FastAPI Backend
    │   ├── main_new.py
    │   ├── models.py
    │   └── requirements.txt
    └── frontend/                        # React Admin Portal
        └── src/app/screens/
```

---

## Shared Module (EatFairShared)

The shared Swift Package contains all common code used across all three apps.

### Package Structure

```
eatfair-ios-shared/
├── Package.swift
└── Sources/
    └── EatFairShared/
        ├── AppConfig.swift              # Environment configuration
        ├── Theme.swift                  # Shared UI theme/colors
        ├── NotificationManager.swift    # Push notification handling
        ├── ErrorHandler.swift           # Centralized error handling
        │
        ├── Config/
        │   └── GoogleMapsConfig.swift   # Google Maps API configuration
        │
        ├── Models/
        │   ├── Address.swift            # Address model with geocoding
        │   ├── AIEmployee.swift         # AI employee configuration
        │   ├── Driver.swift             # Driver/delivery partner model
        │   ├── EnhancedModels.swift     # Extended P2P response models
        │   ├── Order.swift              # Order and OrderItem models
        │   └── Restaurant.swift         # Restaurant/vendor model
        │
        ├── Security/
        │   ├── NetworkSecurity.swift    # SSL pinning, request signing
        │   └── SecureStorage.swift      # Keychain wrapper
        │
        ├── Services/
        │   ├── P2PAPIService.swift      # Main API service (50+ endpoints)
        │   ├── AIEmployeeService.swift  # AI employee management
        │   ├── EnterpriseNetworkLayer.swift  # Retry logic, error handling
        │   └── GoogleMapsService.swift  # Google Maps integration
        │
        ├── Utilities/
        │   ├── Calculators.swift        # Price/distance calculators
        │   └── DateTimeFormatter.swift  # Date formatting utilities
        │
        └── Views/
            ├── GoogleMapView.swift      # Reusable map component
            └── GooglePlacesSearchView.swift  # Address autocomplete
```

### Key Shared Components

#### P2PAPIService.swift (Core API Service)

The central API service handling all backend communication:

```swift
class P2PAPIService {
    static let shared = P2PAPIService()

    // Authentication
    func login(email:password:completion:)
    func register(email:password:name:phone:completion:)
    func logout(completion:)
    func deleteAccount(completion:)

    // Customer APIs
    func getRestaurants(completion:)
    func searchRestaurants(query:completion:)
    func getRestaurantMenu(restaurantId:completion:)
    func placeOrder(order:completion:)
    func getCustomerOrders(customerId:completion:)
    func trackOrder(orderId:completion:)

    // Driver APIs
    func getAvailableOrders(driverId:lat:lng:completion:)
    func acceptOrder(orderId:driverId:completion:)
    func updateOrderStatus(orderId:status:completion:)
    func getDriverEarnings(driverId:completion:)
    func getDriverDocuments(driverId:completion:)

    // Restaurant APIs
    func getVendorOrders(vendorId:completion:)
    func updateMenuItemAvailability(itemId:available:completion:)
    func createMenuItem(vendorId:item:completion:)
    func getPromotions(vendorId:completion:)
    func createPromotion(vendorId:promo:completion:)

    // Address APIs
    func getAddresses(userId:completion:)
    func addAddress(address:completion:)
    func deleteAddress(addressId:completion:)

    // Payment APIs
    func getPaymentMethods(customerId:completion:)
    func addPaymentMethod(customerId:token:completion:)
    func processPayment(orderId:amount:method:completion:)
}
```

#### Theme.swift (Shared UI Theme)

```swift
public struct Theme {
    public static let brandOrange = Color(hex: "#FF6B35")
    public static let brandGreen = Color(hex: "#4CAF50")
    public static let brandBlue = Color(hex: "#2196F3")
    public static let brandPurple = Color(hex: "#9C27B0")

    public static let backgroundPrimary = Color(.systemBackground)
    public static let backgroundSecondary = Color(.secondarySystemBackground)
    public static let textPrimary = Color(.label)
    public static let textSecondary = Color(.secondaryLabel)
}
```

#### Key Models

**Order.swift:**
```swift
struct Order: Codable, Identifiable {
    let id: Int
    let customerId: Int
    let vendorId: Int
    let driverId: Int?
    let status: String
    let total: Double
    let deliveryFee: Double
    let tip: Double
    let items: [OrderItem]
    let deliveryAddress: String
    let placedAt: Int64
    let preparedAt: Int64?
    let deliveredAt: Int64?
}
```

**Address.swift:**
```swift
struct Address: Codable, Identifiable {
    let id: String
    let userId: String
    let locationName: String
    let street: String
    let unit: String
    let city: String
    let state: String
    let zipCode: String
    let instructions: String
    let type: String
    let latitude: Double
    let longitude: Double
    let phoneNumber: String
    let isDefault: Bool
}
```

---

## Customer App (eatfaircustomer)

### App Structure

```
eatfaircustomer/
├── eatfaircustomerApp.swift         # App entry point
├── ContentView.swift                 # Root view with auth routing
├── Persistence.swift                 # CoreData stack (legacy)
├── Info.plist                        # App configuration
├── PrivacyInfo.xcprivacy            # Privacy manifest
├── eatfaircustomer.entitlements     # App capabilities
│
├── Models/
│   └── MenuItem.swift               # Local menu item model
│
├── Theme/
│   └── Theme.swift                  # App-specific theme extensions
│
├── Services/
│   ├── LocationManager.swift        # Location tracking
│   ├── PaymentService.swift         # Stripe payment integration
│   ├── ACHPaymentService.swift      # ACH/bank payment support
│   ├── VoiceSearchService.swift     # Voice search capability
│   └── DatabaseSeeder.swift         # Demo data seeding
│
├── ViewModels/
│   ├── AuthViewModel.swift          # Authentication state
│   ├── HomeViewModel.swift          # Home screen data
│   ├── MenuViewModel.swift          # Restaurant menu
│   ├── CartViewModel.swift          # Shopping cart
│   ├── MultiRestaurantCartViewModel.swift  # Multi-vendor cart
│   ├── AddressViewModel.swift       # Address management
│   ├── AddressSearchViewModel.swift # Address autocomplete
│   ├── OrderHistoryViewModel.swift  # Past orders
│   ├── OrderTrackingViewModel.swift # Live order tracking
│   └── RideRequestViewModel.swift   # Rideshare requests
│
└── Views/
    ├── MainAppView.swift            # Tab bar navigation
    ├── LoginView.swift              # Authentication UI
    ├── HomeView.swift               # Restaurant discovery
    ├── RestaurantDetailView.swift   # Restaurant page
    ├── MenuItemCustomizationView.swift  # Item customization
    ├── CartView.swift               # Single cart view
    ├── MultiRestaurantCartView.swift    # Multi-vendor cart
    ├── CheckoutView.swift           # Single checkout
    ├── MultiRestaurantCheckoutView.swift  # Multi-vendor checkout
    ├── OrderSuccessView.swift       # Order confirmation
    ├── OrderHistoryView.swift       # Past orders list
    ├── DeliveryTrackingView.swift   # Live order tracking
    ├── DriverChatView.swift         # Chat with driver
    ├── RateDriverView.swift         # Driver rating
    ├── TipDriverView.swift          # Post-delivery tipping
    ├── ProfileView.swift            # User profile
    ├── AddressListView.swift        # Saved addresses
    ├── AddressSearchView.swift      # Address autocomplete
    ├── PaymentMethodsView.swift     # Payment cards
    ├── FavoritesView.swift          # Favorite restaurants
    ├── RideRequestView.swift        # Rideshare booking
    ├── LocationPickerView.swift     # Map location picker
    ├── MapView.swift                # Google Maps wrapper
    ├── ScheduleDeliveryView.swift   # Schedule future orders
    └── PlaceholderViews.swift       # Notifications, Help views
```

### User Flow Diagram

```
┌─────────────┐
│   Launch    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐     ┌─────────────────┐
│  LoginView      │────▶│   MainAppView   │
│  (Auth Check)   │     │   (Tab Bar)     │
└─────────────────┘     └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   HomeView    │      │  OrderHistory │      │  ProfileView  │
│  (Discovery)  │      │    View       │      │  (Settings)   │
└───────┬───────┘      └───────────────┘      └───────────────┘
        │
        ▼
┌───────────────────┐
│ RestaurantDetail  │
│      View         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ MenuItemCustom    │
│   izationView     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌───────────────────┐
│    CartView /     │────▶│  CheckoutView /   │
│ MultiRestaurant   │     │ MultiRestaurant   │
│    CartView       │     │  CheckoutView     │
└───────────────────┘     └─────────┬─────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │ OrderSuccessView  │
                          └─────────┬─────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │ DeliveryTracking  │
                          │      View         │
                          └─────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │DriverChat │   │RateDriver │   │TipDriver  │
            │   View    │   │   View    │   │   View    │
            └───────────┘   └───────────┘   └───────────┘
```

### Key ViewModels

#### AuthViewModel.swift
```swift
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: P2PCustomer?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func login(email: String, password: String)
    func register(email: String, password: String, name: String, phone: String)
    func signInWithApple(credential: ASAuthorizationAppleIDCredential)
    func logout()
    func deleteAccount()
    func resetPassword(email: String)
}
```

#### CartViewModel.swift
```swift
class CartViewModel: ObservableObject {
    @Published var items: [CartItem] = []
    @Published var selectedRestaurant: P2PVendor?
    @Published var deliveryAddress: Address?
    @Published var deliveryFee: Double = 0
    @Published var tip: Double = 0

    var subtotal: Double
    var total: Double

    func addItem(_ item: MenuItem, quantity: Int, customizations: [String])
    func removeItem(_ item: CartItem)
    func updateQuantity(_ item: CartItem, quantity: Int)
    func clearCart()
    func checkout(paymentMethodId: String, completion: @escaping (Result<Order, Error>) -> Void)
}
```

---

## Delivery App (eatffairdelivery)

### App Structure

```
eatffairdelivery/
├── eatffairdeliveryApp.swift        # App entry point
├── ContentView.swift                 # Root view with auth routing
├── DriverLoginView.swift            # Driver authentication
├── DriverDashboardView.swift        # Main dashboard
├── Persistence.swift                # CoreData stack (legacy)
├── Theme.swift                      # App-specific theme
├── Info.plist                       # App configuration
├── eatffairdelivery.entitlements   # App capabilities
│
├── Services/
│   ├── LocationManager.swift        # Background location tracking
│   ├── AuthManager.swift            # Driver authentication
│   ├── ChatManager.swift            # Customer chat service
│   └── VoiceAssistantManager.swift  # Hands-free voice control
│
├── ViewModels/
│   ├── DeliveryViewModel.swift      # Active deliveries
│   ├── DriverProfileViewModel.swift # Driver profile & documents
│   └── EarningsViewModel.swift      # Earnings & statistics
│
└── Views/
    ├── AvailableOrdersView.swift    # Nearby orders to accept
    ├── ActiveDeliveryDetailView.swift  # Current delivery details
    ├── MyDeliveriesView.swift       # Delivery history
    ├── PickupDropoffView.swift      # Navigation to pickup/dropoff
    ├── OrderMapDetailView.swift     # Map with route
    ├── DriverProfileView.swift      # Profile & settings
    ├── DriverStatsCard.swift        # Stats widget
    ├── ChatView.swift               # Chat with customer
    ├── TipNotificationView.swift    # Tip received notification
    ├── VoiceAssistantButton.swift   # Voice control button
    └── TermsAndConditionsView.swift # Legal terms
```

### Driver Flow Diagram

```
┌─────────────┐
│   Launch    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐     ┌─────────────────┐
│ DriverLoginView │────▶│   ContentView   │
│   (Auth Check)  │     │  (Dashboard)    │
└─────────────────┘     └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Available    │      │ MyDeliveries  │      │ DriverProfile │
│  OrdersView   │      │     View      │      │     View      │
└───────┬───────┘      └───────────────┘      └───────────────┘
        │
        │ Accept Order
        ▼
┌───────────────────┐
│ ActiveDelivery    │
│   DetailView      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  PickupDropoff    │
│      View         │
│  (Navigation)     │
└─────────┬─────────┘
          │
          ├──── Picked Up ────▶ Navigate to Customer
          │
          ▼
┌───────────────────┐
│    Delivered!     │
│ TipNotification   │
└───────────────────┘
```

### Key ViewModels

#### DeliveryViewModel.swift
```swift
class DeliveryViewModel: ObservableObject {
    @Published var availableOrders: [Order] = []
    @Published var activeDelivery: Order?
    @Published var isOnline = false
    @Published var isLoading = false

    func goOnline()
    func goOffline()
    func fetchAvailableOrders()
    func acceptOrder(_ order: Order)
    func markPickedUp(_ order: Order)
    func markDelivered(_ order: Order)
    func updateLocation(lat: Double, lng: Double)
}
```

#### DriverProfileViewModel.swift
```swift
class DriverProfileViewModel: ObservableObject {
    @Published var profile: DriverProfile?
    @Published var documentsResponse: DriverDocumentsResponse?
    @Published var vehicleInfo: VehicleInfo?
    @Published var isLoadingDocuments = false

    func fetchProfile()
    func updateProfile(_ profile: DriverProfile)
    func fetchDriverDocuments(driverId: Int)
    func uploadDocument(type: DocumentType, data: Data)
}
```

#### EarningsViewModel.swift
```swift
class EarningsViewModel: ObservableObject {
    @Published var todayEarnings: Double = 0
    @Published var weekEarnings: Double = 0
    @Published var totalDeliveries: Int = 0
    @Published var earningsHistory: [EarningsEntry] = []

    func fetchEarnings(driverId: Int)
    func fetchEarningsHistory(driverId: Int, period: TimePeriod)
}
```

---

## Restaurant App (eatffairrestaurant)

### App Structure

```
eatffairrestaurant/
├── eatffairrestaurantApp.swift      # App entry point
├── ContentView.swift                 # Root view with auth routing
├── Persistence.swift                # CoreData stack (legacy)
├── Theme.swift                      # RestaurantTheme colors
├── Info.plist                       # App configuration
├── eatffairrestaurant.entitlements # App capabilities
│
├── ViewModels/
│   ├── RestaurantViewModel.swift    # Restaurant profile
│   ├── OrdersViewModel.swift        # Order management
│   ├── RestaurantMenuViewModel.swift # Menu CRUD
│   ├── PromotionsViewModel.swift    # Promotions management
│   ├── AnalyticsViewModel.swift     # Analytics calculations
│   └── AddressSearchViewModel.swift # Address autocomplete
│
└── Views/
    ├── LoginView.swift              # Restaurant authentication
    ├── RestaurantDashboardView.swift # Legacy dashboard
    ├── EnhancedDashboardView.swift  # Modern dashboard
    ├── EnhancedMenuView.swift       # Menu management
    ├── MenuView.swift               # Legacy menu view
    ├── AnalyticsView.swift          # Analytics dashboard
    ├── PromotionsView.swift         # Promotions list
    ├── CreatePromotionView.swift    # Create/edit promotion
    ├── AIEmployeesView.swift        # AI employees config
    ├── AIInsightsView.swift         # AI-generated insights
    ├── ReviewsView.swift            # Customer reviews
    ├── RestaurantSettingsView.swift # Restaurant settings
    ├── RestaurantDocumentsView.swift # Business documents
    ├── DeliveryMapView.swift        # Active deliveries map
    ├── AddressSearchView.swift      # Address search
    └── ImagePicker.swift            # Photo picker utility
```

### Restaurant Flow Diagram

```
┌─────────────┐
│   Launch    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐     ┌─────────────────┐
│   LoginView     │────▶│   ContentView   │
│  (Auth Check)   │     │  (Tab Bar)      │
└─────────────────┘     └────────┬────────┘
                                 │
    ┌────────────────┬───────────┼───────────┬────────────────┐
    │                │           │           │                │
    ▼                ▼           ▼           ▼                ▼
┌────────┐    ┌──────────┐  ┌────────┐  ┌─────────┐    ┌──────────┐
│ Orders │    │   Menu   │  │Analytics│  │Promotions│   │ Settings │
│  View  │    │   View   │  │  View   │  │  View   │    │   View   │
└───┬────┘    └────┬─────┘  └─────────┘  └────┬────┘    └──────────┘
    │              │                          │
    ▼              ▼                          ▼
┌────────┐    ┌──────────┐              ┌──────────┐
│ Order  │    │ Add/Edit │              │ Create   │
│ Detail │    │ MenuItem │              │ Promotion│
└────────┘    └──────────┘              └──────────┘
```

### Key ViewModels

#### OrdersViewModel.swift
```swift
class OrdersViewModel: ObservableObject {
    @Published var allOrders: [Order] = []
    @Published var isLoading = false

    var newOrders: [Order]           // Status: Placed
    var preparingOrders: [Order]     // Status: Preparing
    var readyOrders: [Order]         // Status: Ready
    var completedOrders: [Order]     // Status: Delivered/Picked Up

    func fetchOrders(vendorId: Int)
    func acceptOrder(_ order: Order)
    func markPreparing(_ order: Order)
    func markReady(_ order: Order)
    func cancelOrder(_ order: Order, reason: String)
}
```

#### RestaurantMenuViewModel.swift
```swift
class RestaurantMenuViewModel: ObservableObject {
    @Published var categories: [MenuCategory] = []
    @Published var items: [P2PMenuItem] = []
    @Published var isLoading = false

    func fetchMenu(vendorId: Int)
    func addItem(_ item: P2PMenuItem)
    func updateItem(_ item: P2PMenuItem)
    func deleteItem(_ item: P2PMenuItem)
    func toggleAvailability(_ item: P2PMenuItem)
}
```

#### AnalyticsViewModel.swift
```swift
class AnalyticsViewModel: ObservableObject {
    @Published var totalRevenue: Double = 0
    @Published var totalOrders: Int = 0
    @Published var averageOrderValue: Double = 0
    @Published var averagePrepTime: Int = 20
    @Published var hourlyData: [HourlyAnalytics] = []
    @Published var popularItems: [PopularItemAnalytics] = []

    func updateFromOrders(_ orders: [Order], period: TimePeriod)
    func fetchPromotionAnalytics()
}
```

---

## Backend Integration

### API Base URL

```swift
// Production
let baseURL = "https://api.dollor.ai/api"

// Development
let baseURL = "http://localhost:8000/api"
```

### Authentication Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │    │   API    │    │ Database │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     │  POST /login  │               │
     │──────────────▶│               │
     │               │  Verify Creds │
     │               │──────────────▶│
     │               │◀──────────────│
     │  JWT Token    │               │
     │◀──────────────│               │
     │               │               │
     │ GET /orders   │               │
     │ Auth: Bearer  │               │
     │──────────────▶│               │
     │               │  Query Data   │
     │               │──────────────▶│
     │               │◀──────────────│
     │  Order Data   │               │
     │◀──────────────│               │
```

### Key API Endpoints

#### Customer Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Customer login |
| POST | /auth/register | Customer registration |
| GET | /vendors | List restaurants |
| GET | /vendors/{id}/menu | Restaurant menu |
| POST | /orders | Place order |
| GET | /customers/{id}/orders | Order history |
| GET | /orders/{id}/track | Track order |

#### Driver Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /drivers/login | Driver login |
| GET | /drivers/{id}/available-orders | Nearby orders |
| POST | /orders/{id}/accept | Accept order |
| PUT | /orders/{id}/status | Update status |
| GET | /drivers/{id}/earnings | Earnings data |
| GET | /drivers/{id}/documents | Document status |

#### Restaurant Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /vendors/login | Vendor login |
| GET | /vendors/{id}/orders | Incoming orders |
| PUT | /orders/{id}/status | Update order |
| GET | /vendors/{id}/menu | Get menu |
| POST | /vendors/{id}/menu | Add item |
| PUT | /menu/{id} | Update item |
| GET | /vendors/{id}/promotions | Get promotions |

---

## Data Flow Architecture

### Order Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CUSTOMER   │     │  RESTAURANT │     │   DRIVER    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  Places Order     │                   │
       │──────────────────▶│                   │
       │                   │                   │
       │                   │  Accepts Order    │
       │                   │◀──────────────────│
       │                   │                   │
       │   Order Accepted  │                   │
       │◀──────────────────│                   │
       │                   │                   │
       │                   │  Starts Preparing │
       │   Preparing       │──────────────────▶│
       │◀──────────────────│                   │
       │                   │                   │
       │                   │  Order Ready      │
       │   Ready           │──────────────────▶│
       │◀──────────────────│                   │
       │                   │                   │
       │                   │                   │  Driver Picks Up
       │   Picked Up       │                   │◀─────────────────
       │◀──────────────────┼───────────────────│
       │                   │                   │
       │                   │                   │  Driver Delivers
       │   Delivered       │                   │◀─────────────────
       │◀──────────────────┼───────────────────│
       │                   │                   │
       │  Rate & Tip       │                   │
       │───────────────────┼──────────────────▶│
```

### Real-time Location Updates

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Driver  │    │   API    │    │ Customer │
│   App    │    │  Server  │    │   App    │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     │ Update Location               │
     │──────────────▶│               │
     │               │  Store/Notify │
     │               │──────────────▶│
     │               │               │
     │               │  Poll Location│
     │               │◀──────────────│
     │               │               │
     │               │  Return       │
     │               │──────────────▶│
     │               │               │
```

---

## Security Architecture

### Data Protection

```swift
// Keychain Storage for Sensitive Data
SecureStorage.shared.save(key: "auth_token", value: token)
SecureStorage.shared.save(key: "user_id", value: String(userId))

// Network Security
NetworkSecurity.shared.configureSSLPinning()
NetworkSecurity.shared.signRequest(request)
```

### App Store Compliance

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Privacy Manifest | ✅ | PrivacyInfo.xcprivacy |
| Account Deletion | ✅ | AuthViewModel.deleteAccount() |
| Sign in with Apple | ✅ | LoginView Apple Sign-In |
| Location Permissions | ✅ | Info.plist descriptions |
| Camera/Photos | ✅ | Info.plist descriptions |

### Entitlements

**Customer App:**
- Push Notifications
- Associated Domains (Apple Sign-In)
- Apple Pay (merchant capability)

**Delivery App:**
- Push Notifications
- Background Location
- Background Modes (location)

**Restaurant App:**
- Push Notifications
- Associated Domains

---

## Build & Deployment

### Build Commands

```bash
# Customer App - Release Build
cd apps/ios/customer
xcodebuild -workspace eatfaircustomer.xcworkspace \
  -scheme eatfaircustomer \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  build

# Delivery App - Release Build
cd apps/ios/delivery
xcodebuild -workspace eatffairdelivery.xcworkspace \
  -scheme eatffairdelivery \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  build

# Restaurant App - Release Build
cd apps/ios/restaurant
xcodebuild -workspace eatffairrestaurant.xcworkspace \
  -scheme eatffairrestaurant \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  build
```

### Environment Configuration

```swift
// AppConfig.swift
struct AppConfig {
    static var environment: Environment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }

    static var apiBaseURL: String {
        switch environment {
        case .development:
            return "http://localhost:8000/api"
        case .production:
            return "https://api.dollor.ai/api"
        }
    }
}
```

### TestFlight Distribution

1. Archive each app in Xcode
2. Upload to App Store Connect
3. Configure TestFlight groups
4. Submit for TestFlight review

### App Store Submission Checklist

- [ ] All apps build in Release configuration
- [ ] Privacy manifests included
- [ ] Account deletion implemented
- [ ] Sign in with Apple working
- [ ] No hardcoded API keys in Release
- [ ] All required Info.plist entries present
- [ ] Screenshots for all device sizes
- [ ] App preview videos (optional)
- [ ] Privacy policy URL
- [ ] Support URL

---

## File Reference Quick Links

### Customer App Key Files
- Entry Point: `eatfaircustomer/eatfaircustomerApp.swift`
- Auth: `eatfaircustomer/ViewModels/AuthViewModel.swift`
- Home: `eatfaircustomer/Views/HomeView.swift`
- Cart: `eatfaircustomer/ViewModels/CartViewModel.swift`
- Checkout: `eatfaircustomer/Views/MultiRestaurantCheckoutView.swift`

### Delivery App Key Files
- Entry Point: `eatffairdelivery/eatffairdeliveryApp.swift`
- Auth: `eatffairdelivery/DriverLoginView.swift`
- Orders: `eatffairdelivery/Views/AvailableOrdersView.swift`
- Profile: `eatffairdelivery/ViewModels/DriverProfileViewModel.swift`
- Earnings: `eatffairdelivery/ViewModels/EarningsViewModel.swift`

### Restaurant App Key Files
- Entry Point: `eatffairrestaurant/eatffairrestaurantApp.swift`
- Auth: `eatffairrestaurant/Views/LoginView.swift`
- Orders: `eatffairrestaurant/ViewModels/OrdersViewModel.swift`
- Menu: `eatffairrestaurant/ViewModels/RestaurantMenuViewModel.swift`
- Analytics: `eatffairrestaurant/ViewModels/AnalyticsViewModel.swift`

### Shared Module Key Files
- API Service: `EatFairShared/Services/P2PAPIService.swift`
- Models: `EatFairShared/Models/*.swift`
- Theme: `EatFairShared/Theme.swift`
- Security: `EatFairShared/Security/*.swift`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 9, 2024 | Complete P2P backend integration, App Store ready |
| 0.9.0 | Dec 5, 2024 | Driver documents verification, analytics dashboard |
| 0.8.0 | Dec 1, 2024 | Multi-restaurant cart, voice search |
| 0.7.0 | Nov 30, 2024 | Apple Sign-In, Stripe payments |

---

**Documentation Generated:** December 9, 2024
**Repository:** https://github.com/jeet-avatar/dindin-delivers
**Branch:** feature/dollar-ai-deployment
