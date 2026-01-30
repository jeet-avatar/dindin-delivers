# Dollor.ai (EatFair) Code Conventions

This document captures the naming conventions, code patterns, and style guidelines observed throughout the eatfair-ios codebase.

---

## File Naming Conventions

### Swift Files (iOS)

| Type | Convention | Examples |
|------|------------|----------|
| Views | `PascalCase` + `View` suffix | `HomeView.swift`, `LoginView.swift`, `RestaurantDetailView.swift` |
| ViewModels | `PascalCase` + `ViewModel` suffix | `AuthViewModel.swift`, `HomeViewModel.swift`, `OrderTrackingViewModel.swift` |
| Services | `PascalCase` + `Service` suffix | `P2PAPIService.swift`, `PaymentService.swift`, `ChatService.swift` |
| Managers | `PascalCase` + `Manager` suffix | `LocationManager.swift`, `NotificationManager.swift`, `ChatManager.swift` |
| Models | `PascalCase` (entity name) | `Restaurant.swift`, `Order.swift`, `Driver.swift` |
| Utilities | `PascalCase` (descriptive) | `Calculators.swift`, `EmailValidator.swift`, `DateTimeFormatter.swift` |
| App Entry | `PascalCase` + `App` suffix | `eatfaircustomerApp.swift`, `eatffairdeliveryApp.swift` |
| Theme | `Theme` or `DollorTheme` | `Theme.swift`, `DollorTheme.swift` |

### Python Files (Backend)

| Type | Convention | Examples |
|------|------------|----------|
| Main module | `snake_case` | `main_new.py`, `database.py`, `models.py` |
| Services | `snake_case` + descriptive | `email_service.py`, `image_service.py` |
| Routes | `snake_case` + `_routes` | `bid_routes.py`, `chat_routes.py` |
| Config | `snake_case` + `_config` | `pricing_config.py`, `endpoint_config.py` |
| Utilities | `snake_case` | `auto_onboarding.py`, `menu_verification.py` |

### Configuration Files

| Type | Convention | Examples |
|------|------------|----------|
| Xcconfig | `PascalCase` | `Development.xcconfig`, `Staging.xcconfig`, `Production.xcconfig` |
| Plist | `PascalCase` with hyphens | `GoogleService-Info.plist`, `Info.plist` |
| Environment | `.env` pattern | `.env`, `.env.example` |

---

## Class & Struct Naming

### ViewModels

```swift
// Pattern: [Feature]ViewModel
class AuthViewModel: NSObject, ObservableObject { }
class HomeViewModel: ObservableObject { }
class MultiRestaurantCartViewModel: ObservableObject { }
class OrderTrackingViewModel: ObservableObject { }

// Inheritance pattern:
// - Inherit from NSObject when needed for delegates (e.g., ASAuthorizationControllerDelegate)
// - Otherwise, plain class conforming to ObservableObject
```

### Services

```swift
// Singleton pattern with shared instance
public class P2PAPIService: ObservableObject {
    public static let shared = P2PAPIService()
    private init() { }
}

public final class SecureStorage {
    public static let shared = SecureStorage()
    private init() { }
}

public class ErrorHandler: ObservableObject {
    public static let shared = ErrorHandler()
    private init() { }
}
```

### Models

```swift
// Pattern: Entity name, conforming to common protocols
public struct Restaurant: Identifiable, Codable, Sendable { }
public struct Order: Identifiable, Codable, Sendable { }
public struct MenuItem: Identifiable, Codable, Sendable { }

// P2P-specific models use P2P prefix for backend responses
public struct P2PRestaurant: Codable { }
public struct P2PMenuItem: Codable { }
public struct P2PCustomerOrder: Codable { }
```

### Theme

```swift
// Nested struct pattern for organization
public struct DollorTheme {
    public struct Brand {
        public static let green = Color(hex: "06C167")
    }
    public struct Background { }
    public struct Text { }
    public struct Status { }
}

// Usage: DollorTheme.Brand.green, DollorTheme.Status.error
```

---

## SwiftUI View Structure

### Standard View Pattern

```swift
import SwiftUI
import EatFairShared

struct HomeView: View {
    // MARK: - State & Environment
    @StateObject var viewModel = HomeViewModel()
    @EnvironmentObject var addressViewModel: AddressViewModel
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel
    @State private var showLocationPicker = false
    @State private var searchText = ""

    // MARK: - Computed Properties
    var filteredRestaurants: [Restaurant] { }

    // MARK: - Body
    var body: some View {
        ZStack(alignment: .bottom) {
            // Background
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            // Main content
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // MARK: - Header
                    headerSection

                    // MARK: - Categories
                    categoriesSection

                    // MARK: - Featured
                    featuredRestaurantsSection
                }
            }

            // Floating elements
            if viewModel.hasActiveOrder {
                activeOrderTracker
            }
        }
        .onAppear {
            viewModel.fetchRestaurants()
        }
        .sheet(isPresented: $showLocationPicker) {
            LocationPickerView()
        }
    }

    // MARK: - View Components (extracted as computed properties)
    private var headerSection: some View {
        VStack(spacing: 0) {
            // Header content
        }
    }

    private var categoriesSection: some View {
        // Categories content
    }
}
```

### Key Patterns Observed

1. **MARK comments** for section organization
2. **Extracted components** as private computed properties (`headerSection`, `categoriesSection`)
3. **State ordering**: `@StateObject` > `@EnvironmentObject` > `@State` > `@Binding`
4. **Lifecycle modifiers** at end of body (`.onAppear`, `.sheet`, `.alert`)

---

## ViewModel Structure

### Standard ViewModel Pattern

```swift
import SwiftUI
import Combine
import EatFairShared
import os.log

private let logger = Logger(subsystem: "com.dollorai.customer", category: "HomeViewModel")

class HomeViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var restaurants: [Restaurant] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var hasActiveOrder: Bool = false

    // MARK: - Private Properties
    private let p2pAPI = P2PAPIService.shared
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Computed Properties
    var featuredRestaurants: [Restaurant] {
        restaurants.sorted { $0.rating > $1.rating }.prefix(5).map { $0 }
    }

    // MARK: - Public Methods
    func fetchRestaurants() {
        isLoading = true
        errorMessage = nil
        logger.info("Fetching restaurants...")

        p2pAPI.fetchRestaurants { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let restaurants):
                    self?.restaurants = restaurants
                    logger.info("Loaded \(restaurants.count) restaurants")
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    logger.error("Failed: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Private Methods
    private func processData() { }
}
```

### Key Patterns

1. **Logger initialization** at file scope with category
2. **@Published properties** for all observable state
3. **Weak self** in closures to prevent retain cycles
4. **DispatchQueue.main.async** for UI updates from callbacks
5. **Result type** handling with switch statement

---

## API Endpoint Naming (Backend)

### URL Patterns

```python
# Pattern: /api/{resource}/{action or id}

# Public endpoints (no auth)
GET  /api/public/restaurants/{vendor_id}     # Restaurant details
GET  /api/vendors/published                   # Published restaurants

# Authentication
POST /api/customers/login                     # Customer login
POST /api/customers/register                  # Customer register
POST /api/customers/google-auth               # Google OAuth
POST /api/customers/apple-auth                # Apple OAuth
POST /api/drivers/login                       # Driver login
POST /api/vendors/login                       # Vendor login

# Resource CRUD
GET  /api/vendors/{id}/menu                   # Get menu items
POST /api/vendors/{id}/menu                   # Create menu item
PUT  /api/vendors/{id}/menu/{item_id}         # Update menu item
DELETE /api/vendors/{id}/menu/{item_id}       # Delete menu item

# Orders
POST /api/orders/create                       # Create order
GET  /api/orders/{id}/status                  # Get order status
PUT  /api/orders/{id}/status                  # Update status
GET  /api/customers/{id}/orders               # Customer's orders

# Health checks
GET  /health                                  # Basic health
GET  /api/health/ready                        # Readiness probe
GET  /api/health/live                         # Liveness probe
```

### Response Patterns

```python
# Success response
{
    "success": True,
    "data": { ... },
    "message": "Optional success message"
}

# List response
{
    "restaurants": [...],
    "total": 50,
    "page": 1,
    "per_page": 20
}

# Error response
{
    "detail": "Error description"
}
# HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 429 (rate limit)
```

---

## Error Handling Patterns

### iOS Error Types

```swift
// Standardized error enum
public enum EatFairError: LocalizedError {
    // Network Errors
    case networkUnavailable
    case serverError(String)
    case timeout

    // Authentication Errors
    case notAuthenticated
    case sessionExpired
    case invalidCredentials

    // Order Errors
    case orderNotFound
    case orderCreationFailed(String)
    case paymentFailed(String)

    // With descriptions
    public var errorDescription: String? {
        switch self {
        case .networkUnavailable:
            return "No internet connection."
        case .serverError(let message):
            return "Server error: \(message)"
        // ...
        }
    }

    public var isRetryable: Bool {
        switch self {
        case .networkUnavailable, .timeout, .serverError:
            return true
        default:
            return false
        }
    }
}
```

### Error Handling in Services

```swift
// API error enum
public enum P2PAPIError: Error {
    case invalidURL
    case noData
    case httpError(Int)
    case decodingError(String)
    case unauthorized
}

// Usage in API calls
func fetchRestaurants(completion: @escaping (Result<[P2PRestaurant], Error>) -> Void) {
    guard let url = URL(string: "\(baseURL)/vendors/published") else {
        completion(.failure(P2PAPIError.invalidURL))
        return
    }

    URLSession.shared.dataTask(with: url) { data, response, error in
        if let error = error {
            completion(.failure(error))
            return
        }

        if let httpResponse = response as? HTTPURLResponse {
            guard (200...299).contains(httpResponse.statusCode) else {
                completion(.failure(P2PAPIError.httpError(httpResponse.statusCode)))
                return
            }
        }

        guard let data = data else {
            completion(.failure(P2PAPIError.noData))
            return
        }

        do {
            let response = try JSONDecoder().decode(P2PRestaurantsResponse.self, from: data)
            completion(.success(response.restaurants))
        } catch {
            completion(.failure(error))
        }
    }.resume()
}
```

---

## Logging Patterns

### iOS Logging

```swift
import os.log

// Module-level logger
private let logger = Logger(subsystem: "com.dollorai.customer", category: "AuthViewModel")

// Usage patterns
logger.info("User logged in successfully")
logger.error("Login failed: \(error.localizedDescription)")
logger.debug("Processing \(items.count) items")

// Conditional debug logging
#if DEBUG
print("[AuthViewModel] Debug info: \(debugData)")
#endif
```

### Python Logging

```python
import logging

# Module configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Usage
logger.info(f"Processing order {order_id}")
logger.error(f"Failed to process: {str(e)}")
logger.warning(f"Deprecated endpoint called: {endpoint}")
```

---

## Input Validation Patterns

### Email Validation

```swift
// Shared validator in Utilities
public struct EmailValidator {
    public static func isValid(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    public static func getErrorMessage(_ email: String) -> String? {
        if email.isEmpty { return "Email is required" }
        if !isValid(email) { return "Please enter a valid email" }
        return nil
    }
}

// Usage in ViewModel
private func isValidEmail(_ email: String) -> Bool {
    return EmailValidator.isValid(email)
}
```

### Password Validation

```swift
// Pattern: minimum length + character requirements
private var isValidPassword: Bool {
    let specialCharacters = CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;':\",./<>?")
    return password.count >= 8 &&
        password.rangeOfCharacter(from: .uppercaseLetters) != nil &&
        password.rangeOfCharacter(from: .lowercaseLetters) != nil &&
        password.rangeOfCharacter(from: .decimalDigits) != nil &&
        password.rangeOfCharacter(from: specialCharacters) != nil
}
```

### Phone Validation

```swift
// E.164 format support
private var isValidPhone: Bool {
    let cleanPhone = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)
    if cleanPhone.hasPrefix("+") {
        let digitsOnly = cleanPhone.dropFirst()
        return digitsOnly.count >= 10 && digitsOnly.count <= 15
    } else {
        return cleanPhone.count >= 10 && cleanPhone.count <= 15
    }
}
```

---

## Security Patterns

### Keychain Storage

```swift
// Use SecureStorage for all tokens
// Pattern: Enum-based keys, proper access control

public final class SecureStorage {
    public enum Key: String {
        case customerAccessToken = "customer_access_token"
        case driverAccessToken = "driver_access_token"
        case vendorAccessToken = "vendor_access_token"
    }

    @discardableResult
    public func save(_ value: String, for key: Key) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            // Security: Only accessible when unlocked, not backed up
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        // ...
    }
}
```

### API Key Management

```swift
// Load from plist, never hardcode
private var googleClientID: String {
    guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
          let plist = NSDictionary(contentsOfFile: path),
          let clientID = plist["CLIENT_ID"] as? String else {
        logger.error("Could not load CLIENT_ID from GoogleService-Info.plist")
        return ""
    }
    return clientID
}

// Environment-based URLs from xcconfig
public var p2pAPIBaseURL: String = {
    if let url = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String, !url.isEmpty {
        return url
    }
    return "https://api.dollor.ai"  // Production fallback
}()
```

---

## Theme & Color Patterns

### Color Definition

```swift
// Centralized in DollorTheme.swift
public struct DollorTheme {
    public struct Brand {
        public static let green = Color(hex: "06C167")       // Primary
        public static let orange = Color(hex: "F2994A")      // Secondary
        public static let blue = Color(hex: "3B82F6")        // Info
        public static let gold = Color(hex: "FFD700")        // Premium
        public static let purple = Color(hex: "8B5CF6")      // AI features
    }
}

// Color extension for hex support
extension Color {
    init(hex: String) {
        // Implementation
    }
}
```

### Usage Pattern

```swift
// Direct access
Text("Welcome")
    .foregroundColor(DollorTheme.Brand.green)

// Background
Theme.brandGrey.edgesIgnoringSafeArea(.all)

// Status colors
Circle()
    .fill(order.status == .delivered ? DollorTheme.Status.success : DollorTheme.Status.pending)
```

---

## Comment Conventions

### File Headers

```swift
//
//  eatfaircustomerApp.swift
//  Dollor Customer App
//
//  Main entry point for the Dollor Customer iOS application.
//
//  Created by Dollor.ai Team
//  Copyright (c) 2024-2026 Dollor.ai. All rights reserved.
//
```

### MARK Comments

```swift
// MARK: - Properties
// MARK: - Initialization
// MARK: - Public Methods
// MARK: - Private Methods
// MARK: - View Components
// MARK: - ASAuthorizationControllerDelegate
```

### Documentation Comments

```swift
/// Customer Authentication ViewModel
/// Uses Google Sign-In SDK directly + P2P backend (no Firebase)
class AuthViewModel: NSObject, ObservableObject {

/// Fetch all published/approved restaurants for customer apps
/// Uses /api/vendors/published endpoint which returns only approved and published restaurants
public func fetchRestaurants(completion: @escaping (Result<[P2PRestaurant], Error>) -> Void) {
```

---

## Backend Patterns (Python)

### Pydantic Models

```python
from pydantic import BaseModel, EmailStr, Field, field_validator

class CustomerCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    phone: Optional[str] = None

    @field_validator('phone')
    def validate_phone(cls, v):
        if v and not re.match(r'^\+?[0-9]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v
```

### Endpoint Structure

```python
@app.post("/api/customers/register")
async def customer_register(
    request: Request,
    customer: CustomerCreate,
    db: Session = Depends(get_db)
):
    # Rate limiting
    check_rate_limit(request, registration_rate_limiter, "customer_register")

    # Business logic
    existing = db.query(Customer).filter(Customer.email == customer.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create entity
    new_customer = Customer(
        email=customer.email,
        password_hash=pwd_context.hash(customer.password),
        full_name=customer.full_name
    )
    db.add(new_customer)
    db.commit()

    # Return response
    return {
        "success": True,
        "customer_id": new_customer.id,
        "message": "Registration successful"
    }
```

---

## Testing Conventions

### Unit Test Files

```
// Naming: [Module]Tests.swift
eatfaircustomerTests.swift
eatffairdeliveryTests.swift
eatffairrestaurantTests.swift
```

### Test Structure

```swift
import XCTest
@testable import eatfaircustomer

final class eatfaircustomerTests: XCTestCase {

    func testExample() throws {
        // Test implementation
    }

    func testPerformanceExample() throws {
        measure {
            // Performance test
        }
    }
}
```

---

*Last Updated: January 29, 2026*
