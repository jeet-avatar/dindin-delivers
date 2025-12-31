# Driver Service (Port 8003)

> **Source:** `services/core/driver-service/main.py`
> **Error Prefix:** DRV

---

## Profile Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/driver/profile?driver_id={id}` | Yes | Get driver profile |
| PUT | `/api/driver/profile?driver_id={id}` | Yes | Update driver profile |

---

## Location Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/api/driver/location?driver_id={id}` | Yes | Update real-time location |
| GET | `/api/driver/location?driver_id={id}` | Yes | Get current location |
| POST | `/api/driver/nearby` | Yes | Find nearby drivers |

---

## Status Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/api/driver/online?driver_id={id}` | Yes | Update online/offline status |
| GET | `/api/driver/status?driver_id={id}` | Yes | Get driver status |
| PUT | `/api/driver/fcm-token?driver_id={id}` | Yes | Update FCM token |

---

## Document Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/driver/documents?driver_id={id}` | Yes | Get all documents |
| POST | `/api/driver/documents?driver_id={id}` | Yes | Upload document |

---

## Earnings Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/driver/earnings?driver_id={id}&period=today` | Yes | Get earnings summary |
| GET | `/api/driver/earnings/history?driver_id={id}` | Yes | Get earnings history |

---

## ERP/Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/erp/drivers` | Admin | List all drivers |
| PATCH | `/erp/drivers/{driver_id}/status` | Admin | Update approval status |

---

## Enums

### DriverStatus
```python
class DriverStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
```

### VehicleType
```python
class VehicleType(str, Enum):
    CAR = "car"
    MOTORCYCLE = "motorcycle"
    BICYCLE = "bicycle"
    SCOOTER = "scooter"
    VAN = "van"
```

### DocumentType
```python
class DocumentType(str, Enum):
    DRIVERS_LICENSE = "drivers_license"
    VEHICLE_REGISTRATION = "vehicle_registration"
    INSURANCE = "insurance"
    BACKGROUND_CHECK = "background_check"
    PROFILE_PHOTO = "profile_photo"
```

---

## Request Models

### DriverProfileUpdate
```python
class DriverProfileUpdate(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    street: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    vehicle_type: Optional[VehicleType]
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    vehicle_year: Optional[int]
    vehicle_color: Optional[str]
    license_plate: Optional[str]
    photo_url: Optional[str]
```

### LocationUpdate
```python
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    heading: Optional[float]
    speed: Optional[float]
    accuracy: Optional[float]
```

### OnlineStatusUpdate
```python
class OnlineStatusUpdate(BaseModel):
    is_online: bool
```

### NearbyDriversQuery
```python
class NearbyDriversQuery(BaseModel):
    latitude: float
    longitude: float
    radius_km: Optional[float] = 10
    vehicle_type: Optional[VehicleType]
    limit: int = 20
```

---

## Response Models

### DriverProfileResponse
```python
class DriverProfileResponse(BaseModel):
    id: int
    driver_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    status: str  # DriverStatus enum value
    rating: float
    total_deliveries: int
    vehicle_type: Optional[str]
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    license_plate: Optional[str]
    is_online: bool
    photo_url: Optional[str]
    stripe_onboarded: bool
    documents_verified: bool
    created_at: datetime
```

### DriverLocationResponse
```python
class DriverLocationResponse(BaseModel):
    driver_id: str
    latitude: float
    longitude: float
    is_online: bool
    last_updated: datetime
```

### DriverEarningsResponse
```python
class DriverEarningsResponse(BaseModel):
    driver_id: str
    period: str  # today, week, month, all
    total_deliveries: int
    delivery_earnings: float
    tips: float
    bonuses: float
    deductions: float
    net_earnings: float
```

---

## Error Codes

| Code | Message |
|------|---------|
| DRV-101 | Driver not found |
| DRV-102 | Invalid profile data |
| DRV-201 | Invalid location coordinates |
| DRV-202 | Location not available |
| DRV-301 | Driver not approved (cannot go online) |
| DRV-302 | Invalid status value |
| DRV-401 | Invalid document type |

---

*Last Updated: December 26, 2025*
