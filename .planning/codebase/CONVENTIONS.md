# Coding Conventions

**Analysis Date:** 2026-02-18

---

## Python Backend (FastAPI)

### File Naming

- Modules use `snake_case`: `bid_routes.py`, `order_flow.py`, `rideshare_payments.py`, `main_new.py`
- Test files prefixed with `test_`: `test_auth_endpoints.py`, `test_dollor_pricing_model.py`
- Migration scripts prefixed with action: `add_driver_activation_columns.py`, `migrate_staging_to_production.py`
- Config/utility: `pricing_config.py`, `state_config.py`, `cache.py`

### Function Naming

- All functions use `snake_case`
- Route handler functions named after the resource action: `create_payment_intent`, `health_check`, `get_current_user`
- Private/internal helpers prefixed with `_`: `_notify_customer`, `_init_firebase`, `_send_fcm_direct`, `_run_startup_migrations`
- Generator functions named `generate_*`: `generate_request_id`, `generate_clean_bid_id`, `generate_invoice_number`

### Class Naming

- Pydantic request models: `PascalCase` + `Input` suffix: `CreateRideRequestInput`, `SubmitBidInput`, `RespondToBidInput`
- Pydantic response models: `PascalCase` + `Response` suffix: `PaymentResponse`, `CreatePaymentIntent`
- SQLAlchemy models: simple `PascalCase`: `User`, `Vendor`, `Driver`, `Customer`, `RideRequest`, `RideBid`
- Enum types: `PascalCase` + noun: `UserRole`, `VendorStatus`, `RideRequestStatus`, `BidStatus`, `DriverStatus`
- Factory classes in tests: `PascalCase` + `Factory`: `UserFactory`, `VendorFactory`, `DriverFactory`

### Variable Naming

- All variables use `snake_case`
- Constants use `SCREAMING_SNAKE_CASE`: `CUSTOMER_SERVICE_FEE`, `DELIVERY_PER_MILE`, `ADMIN_AUTH_EXEMPT_PATHS`
- Config-level constants defined at module top: `PRODUCTION_ORIGINS`, `STAGING_ORIGINS`, `DEVELOPMENT_ORIGINS`

### SQLAlchemy Model Pattern

```python
class RideRequest(Base):
    __tablename__ = "ride_requests"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(SQLEnum(RideRequestStatus), default=RideRequestStatus.OPEN)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Foreign keys include table name in field: customer_id, driver_id
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
```

- All tables use `snake_case` plural: `ride_requests`, `vendor_menu_items`
- Timestamps always use `datetime.utcnow` (not `datetime.now`)
- Nullable foreign keys are `nullable=True`
- Indexed columns declared with `index=True`

### Pydantic Model Pattern

```python
class CreateRideRequestInput(BaseModel):
    customer_id: int
    pickup_address: str
    pickup_latitude: float
    ride_type: str = "standard"               # Defaults inline
    customer_max_price: Optional[float] = None  # Optionals default to None
    bidding_duration_minutes: int = 5          # With inline comment
```

### FastAPI Endpoint Pattern

```python
@router.post("/request", tags=["Ride Bidding"])
async def create_ride_request(
    data: CreateRideRequestInput,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Docstring describing the endpoint."""
    ...
    return {"success": True, "ride_request": {...}}
```

- All success responses include `"success": True` key
- Error responses use `raise HTTPException(status_code=NNN, detail="message")`
- Auth passed as `authorization: Optional[str] = Header(None)` (not always a `Depends`)
- Dependency injection: `db: Session = Depends(get_db)` for database sessions
- Router prefix defined at router creation: `router = APIRouter(prefix="/api/rides", tags=["Ride Bidding"])`

### Auth Dependency Pattern

Three role-specific async dependency functions in `main_new.py`:

```python
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User
async def get_current_customer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Customer
async def get_current_driver(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Driver
async def get_current_vendor(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Vendor
```

- Each raises `HTTPException(status_code=401)` with `WWW-Authenticate: Bearer` header on failure
- Token payload uses `"sub"` for email and role-specific IDs (`customer_id`, `driver_id`, `vendor_id`)
- A middleware-level guard (`admin_auth_middleware`) blankets all `/api/admin/*` routes

### Error Handling

- Always use `raise HTTPException(status_code=NNN, detail="message")` for API errors
- Use HTTP 400 for bad input, 401 for unauth, 403 for forbidden, 404 for not found, 422 for validation, 429 for rate limit, 500 for server errors
- Internal helper functions that can fail silently use `try/except` with `logger.warning(f"...")`
- Do not silence errors in route handlers — they must surface to the client

```python
# Internal helper — fail silently
def _notify_customer(...):
    try:
        ...
    except Exception as e:
        logger.warning(f"Failed to create in-app notification: {e}")

# Route handler — raise to client
if not ride:
    raise HTTPException(status_code=404, detail="Ride not found")
```

### Logging

- Module-level logger: `logger = logging.getLogger(__name__)`
- Root logger configured: `logging.basicConfig(level=logging.INFO)` in `main_new.py`
- Use `logger.info()` for normal events, `logger.warning()` for recoverable issues, `logger.error()` for failures
- iOS-style `[ClassName]` prefix in log messages: `logger.error("[AuthViewModel] ERROR: ...")`

### Import Organization

1. Standard library imports (`os`, `json`, `logging`, `datetime`, `typing`, `enum`, `math`, `re`, `uuid`)
2. Third-party imports (`fastapi`, `sqlalchemy`, `pydantic`, `jose`, `stripe`, `passlib`)
3. Local application imports (`from database import ...`, `from models import ...`, `from email_service import ...`)

### Comments

- Docstrings on all public functions and route handlers
- Inline section dividers with `# ===== SECTION NAME =====` for long files
- Step comments in complex flows: `# ── Step 1: Fare Estimate ────────────`
- Security annotations: `# SECURITY: ...` for security-relevant code
- `# noqa` and `pragma: no cover` used sparingly for known exceptions

### Module Structure Pattern

Each route module (`bid_routes.py`, `rideshare_payments.py`, `order_flow.py`):
1. Module docstring with description
2. Imports (stdlib → third-party → local)
3. Module-level logger
4. Helper functions prefixed with `_`
5. Router declaration with `prefix` and `tags`
6. Pydantic models section (marked with `# === PYDANTIC MODELS ===`)
7. Route handlers

---

## iOS Swift

### File Naming

- Views: `PascalCase` + `View` suffix: `HomeView.swift`, `LoginView.swift`, `RideReceiptView.swift`
- ViewModels: `PascalCase` + `ViewModel` suffix: `AuthViewModel.swift`, `RideRequestViewModel.swift`
- Services: `PascalCase` + `Service` suffix: `PaymentService.swift`, `LocationManager.swift`
- Models: descriptive `PascalCase`: `MenuItem.swift`
- Shared library: `apps/ios/eatfair-ios-shared/Sources/EatFairShared/`

### MARK Sections

Every non-trivial Swift file uses `MARK` comments to organize code:

```swift
// MARK: - Configuration
// MARK: - Secure Storage Keys
// MARK: - Public Restaurant APIs (Customer App)
// MARK: - Restaurant App APIs (Menu Management)
// MARK: - Published Properties
// MARK: - Private Properties
```

### Class/Struct Pattern

- ViewModels are `class` conforming to `ObservableObject` with `@Published` properties
- Models are `struct` conforming to `Codable`, `Identifiable`, and `Sendable`
- Services are `class` with `static let shared = ServiceName()` singleton

```swift
class AuthViewModel: NSObject, ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    private let p2pService = P2PAPIService.shared
}
```

### Codable / CodingKeys Pattern

When Swift property names differ from JSON snake_case keys, use explicit `CodingKeys` enum:

```swift
struct MenuItem: Identifiable, Codable, Sendable {
    var imageUrl: String?
    var isAvailable: Bool?
    var preparationTime: Int?

    enum CodingKeys: String, CodingKey {
        case imageUrl = "image_url"
        case isAvailable = "is_available"
        case preparationTime = "prep_time_minutes"
    }
}
```

- When encoding outward (POST), use `encoder.keyEncodingStrategy = .convertToSnakeCase`
- When decoding inward (GET), use `decoder.keyDecodingStrategy = .convertFromSnakeCase`
- For ambiguous/multi-source fields (e.g. `paymentIntent` vs `clientSecret`), use custom `init(from decoder:)`

### Network Call Pattern (P2PAPIService)

All API calls follow this structure:

```swift
public func fetchX(param: T, completion: @escaping (Result<ResponseType, Error>) -> Void) {
    guard let url = URL(string: "\(baseURL)/endpoint") else {
        completion(.failure(P2PAPIError.invalidURL))
        return
    }
    isLoading = true
    URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
        DispatchQueue.main.async {
            self?.isLoading = false
            if let error = error {
                self?.error = error.localizedDescription
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
                let response = try JSONDecoder().decode(ResponseType.self, from: data)
                completion(.success(response))
            } catch {
                #if DEBUG
                logger.error("Decode error: \(error)")
                #endif
                completion(.failure(error))
            }
        }
    }.resume()
}
```

- **Always** call `DispatchQueue.main.async` before updating `@Published` properties
- Use `[weak self]` in all closures that capture `self`
- Debug logging wrapped in `#if DEBUG` blocks
- Auth tokens from `SecureStorage.shared.*` (Keychain), not `UserDefaults`

### Logging (iOS)

```swift
private let logger = Logger(subsystem: "com.dollorai.customer", category: "AuthViewModel")
logger.error("[AuthViewModel] ERROR: Could not load CLIENT_ID")
logger.info("fetchRestaurants response (\(data.count) bytes): \(jsonString.prefix(500))")
```

- Module-level `private let logger` using `os.log.Logger`
- Subsystem is the bundle ID, category is the class name

### Error Handling (iOS)

```swift
enum P2PAPIError: Error {
    case invalidURL
    case noData
    case httpError(Int)
    case serverError(String)
}
```

- All API errors map to `P2PAPIError` cases
- Error detail parsed from `P2PErrorResponse.detail` (matches backend `{"detail": "..."}`)
- User-visible error messages are human-readable strings set on `@Published var errorMessage: String?`

---

## Response Format Conventions

**All successful API responses** include `"success": true`:

```json
{"success": true, "ride_request": {...}}
{"success": true, "count": 3, "available_requests": [...]}
{"success": true, "bids": [...], "total_bids": 1, "bidding_open": true}
```

**All error responses** use FastAPI default `{"detail": "message"}` format:

```json
{"detail": "Ride not found"}
{"detail": "Could not validate credentials"}
```

---

## Android Kotlin (from project memory — read access restricted)

Based on project memory and CLAUDE.md, the key conventions are:

### Gson / @SerializedName Pattern

Every multi-word field that differs from camelCase MUST have `@SerializedName`:

```kotlin
data class NegotiationStatusResponse(
    @SerializedName("current_fare") val currentFare: Double,
    @SerializedName("customer_offer") val customerOffer: Double?,
    @SerializedName("driver_offer") val driverOffer: Double?
)
```

- Backend NEVER returns raw arrays — always wraps in objects
- Wrapper classes required for list responses: `BidsResponseWrapper`, `RideRequestsWrapper`, `ChatMessagesWrapper`
- Use plain `Gson()` (not custom adapter) — relies on `@SerializedName` for every snake_case field

### Retrofit Service Pattern

```kotlin
interface CustomerRideshareApiService {
    @POST("rides/request")
    suspend fun createRideRequest(@Body request: RideRequestBody): Response<RideRequestResponse>

    @GET("rides/available")
    suspend fun getAvailableRides(
        @Query("driver_id") driverId: Int?,
        @Query("latitude") latitude: Double?,
        @Query("longitude") longitude: Double?
    ): Response<AvailableRidesResponse>
}
```

### MVVM Structure

- `Activity`/`Fragment` → `ViewModel` → `Repository` → `ApiService`
- Modules: `:app` (customer), `:driver` (driver), `:partner` (restaurant), `:shared` (library)
- Earnings calculation uses `calculateDriverEarnings()` helper (NOT `fare * 0.96`)

---

*Convention analysis: 2026-02-18*
