# P2P Rideshare Bidding - Complete Technical Documentation

> **Last Updated:** February 6, 2026
> **Customer Build:** 1043
> **Driver Build:** 139
> **Backend Version:** 1.0.6
> **Status:** Implemented and Tested

---

## Overview

Dollor.ai's P2P (Peer-to-Peer) rideshare bidding allows drivers to submit competitive bids on customer ride requests. Unlike traditional rideshare where prices are fixed, customers can view multiple driver offers and choose based on price, rating, ETA, and driver message.

---

## Architecture

### Database Tables

```sql
-- Ride Requests Table
CREATE TABLE ride_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    pickup_address TEXT,
    pickup_latitude FLOAT,
    pickup_longitude FLOAT,
    dropoff_address TEXT,
    dropoff_latitude FLOAT,
    dropoff_longitude FLOAT,
    suggested_price FLOAT,
    distance_km FLOAT,
    duration_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Ride Bids Table
CREATE TABLE ride_bids (
    id SERIAL PRIMARY KEY,
    bid_id VARCHAR(50) UNIQUE NOT NULL,
    ride_request_id INTEGER REFERENCES ride_requests(id),
    driver_id INTEGER REFERENCES drivers(id),
    driver_name VARCHAR(255),
    driver_rating FLOAT,
    driver_photo_url VARCHAR(500),
    driver_vehicle VARCHAR(255),
    proposed_price FLOAT NOT NULL,
    message TEXT,
    estimated_arrival_minutes INTEGER,
    is_counter_offer BOOLEAN DEFAULT FALSE,
    original_price FLOAT,
    status VARCHAR(20) DEFAULT 'pending',
    customer_response TEXT,
    customer_counter_price FLOAT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP
);
```

### Status Enums

```python
class BidStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTERED = "countered"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"

class RideRequestStatus(str, Enum):
    OPEN = "open"
    BIDDING = "bidding"
    MATCHED = "matched"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
```

---

## API Endpoints

### 1. Customer Creates Ride Request

**Endpoint:** `POST /api/rides/request`

**Request:**
```json
{
  "pickup": {
    "address": "123 Main St, San Diego, CA",
    "lat": 32.7157,
    "lng": -117.1611
  },
  "dropoff": {
    "address": "456 Broadway, San Diego, CA",
    "lat": 32.7197,
    "lng": -117.1628
  },
  "notes": "Please wait at the corner",
  "preferred_price": 25.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ride request created",
  "ride_request": {
    "id": 123,
    "request_id": "RR-20260206-001",
    "status": "open",
    "suggested_price": 28.50,
    "pickup": { "address": "...", "latitude": 32.7157, "longitude": -117.1611 },
    "dropoff": { "address": "...", "latitude": 32.7197, "longitude": -117.1628 }
  }
}
```

---

### 2. Driver Fetches Available Rides

**Endpoint:** `GET /api/rides/available?driver_id={id}&latitude={lat}&longitude={lng}`

**Response:**
```json
{
  "available_requests": [
    {
      "id": 123,
      "request_id": "RR-20260206-001",
      "pickup": { "address": "123 Main St", "latitude": 32.7157, "longitude": -117.1611 },
      "dropoff": { "address": "456 Broadway", "latitude": 32.7197, "longitude": -117.1628 },
      "distance_km": 5.2,
      "duration_minutes": 15,
      "suggested_price": 28.50,
      "current_bids": 2,
      "status": "open"
    }
  ]
}
```

---

### 3. Driver Submits Bid

**Endpoint:** `POST /api/rides/request/{request_id}/bid`

**Request:**
```json
{
  "proposed_price": 25.00,
  "message": "I'm 5 minutes away with a clean Toyota Camry!",
  "estimated_arrival_minutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bid submitted successfully",
  "bid": {
    "id": 456,
    "bid_id": "BID-20260206143022-48",
    "ride_request_id": 123,
    "driver_id": 48,
    "driver_name": "Demo Driver",
    "driver_rating": 4.9,
    "driver_photo_url": "/uploads/driver_documents/48/photo_verified.png",
    "driver_vehicle": "Toyota Camry",
    "proposed_price": 25.00,
    "message": "I'm 5 minutes away with a clean Toyota Camry!",
    "estimated_arrival_minutes": 5,
    "status": "pending",
    "expires_at": "2026-02-06T22:40:22Z",
    "created_at": "2026-02-06T22:30:22Z"
  }
}
```

---

### 4. Customer Fetches Incoming Bids

**Endpoint:** `GET /api/rides/request/{request_id}/bids`

**Response:**
```json
{
  "request_id": 123,
  "bids": [
    {
      "id": 456,
      "bid_id": "BID-20260206143022-48",
      "driver_id": 48,
      "driver_name": "Demo Driver",
      "driver_rating": 4.9,
      "driver_photo_url": "/uploads/driver_documents/48/photo_verified.png",
      "driver_vehicle": "Toyota Camry",
      "proposed_price": 25.00,
      "message": "I'm 5 minutes away!",
      "estimated_arrival_minutes": 5,
      "status": "pending",
      "expires_at": "2026-02-06T22:40:22Z",
      "created_at": "2026-02-06T22:30:22Z"
    },
    {
      "id": 457,
      "bid_id": "BID-20260206143045-52",
      "driver_id": 52,
      "driver_name": "John Smith",
      "driver_rating": 4.7,
      "driver_photo_url": null,
      "driver_vehicle": "Honda Civic",
      "proposed_price": 22.00,
      "message": "Available now, great reviews!",
      "estimated_arrival_minutes": 8,
      "status": "pending"
    }
  ],
  "total_bids": 2,
  "bidding_open": true,
  "bidding_ends_at": "2026-02-06T22:40:22Z"
}
```

---

### 5. Customer Accepts Bid

**Endpoint:** `POST /api/rides/bid/{bid_id}/respond`

**Request:**
```json
{
  "action": "accept"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bid accepted - ride matched!",
  "ride_id": 123,
  "driver": {
    "id": 48,
    "name": "Demo Driver",
    "phone": "+1-555-123-4567",
    "rating": 4.9,
    "photo_url": "/uploads/driver_documents/48/photo_verified.png",
    "vehicle_make": "Toyota",
    "vehicle_model": "Camry",
    "vehicle_color": "Silver",
    "vehicle_year": 2022,
    "license_plate": "ABC1234",
    "vehicle_photo_url": "/uploads/driver_documents/48/vehicle.png"
  },
  "pickup": {
    "address": "123 Main St, San Diego, CA",
    "latitude": 32.7157,
    "longitude": -117.1611
  },
  "dropoff": {
    "address": "456 Broadway, San Diego, CA",
    "latitude": 32.7197,
    "longitude": -117.1628
  },
  "estimated_arrival_minutes": 5,
  "fare": 25.00,
  "status": "accepted"
}
```

---

### 6. Customer Rejects Bid

**Endpoint:** `POST /api/rides/bid/{bid_id}/respond`

**Request:**
```json
{
  "action": "reject"
}
```

---

### 7. Customer Counter-Offers

**Endpoint:** `POST /api/rides/bid/{bid_id}/respond`

**Request:**
```json
{
  "action": "counter",
  "counter_price": 20.00,
  "message": "Would you do $20?"
}
```

---

## iOS Implementation

### Models (P2PAPIService.swift)

```swift
/// Customer's ride request bids response (incoming driver bids)
public struct CustomerRideBidsResponse: Codable {
    public let request_id: Int
    public let bids: [RideBid]
    public let total_bids: Int
    public let bidding_open: Bool
    public let bidding_ends_at: String?
}

/// Accepted ride details with driver info for customer
public struct AcceptedRideDetails: Codable {
    public let success: Bool
    public let message: String
    public let ride_id: Int?
    public let driver: AcceptedDriverInfo?
    public let pickup: AcceptedRideLocation?
    public let dropoff: AcceptedRideLocation?
    public let estimated_arrival_minutes: Int?
    public let fare: Double?
    public let status: String?
}

public struct AcceptedDriverInfo: Codable {
    public let id: Int
    public let name: String?
    public let phone: String?
    public let rating: Double?
    public let photo_url: String?
    public let vehicle_make: String?
    public let vehicle_model: String?
    public let vehicle_color: String?
    public let vehicle_year: Int?
    public let license_plate: String?
    public let vehicle_photo_url: String?

    public init(...) // Memberwise initializer required for public use
}
```

### ViewModel (RideRequestViewModel.swift)

```swift
// Published properties for P2P bidding
@Published var incomingBids: [RideBid] = []
@Published var selectedBid: RideBid?
@Published var showBidsSheet = false
@Published var acceptedDriver: AcceptedDriverInfo?
@Published var driverETA: Int?

// Polling timer
private var bidPollingTimer: Timer?

// Start polling when ride is requested
func startBidPolling() {
    guard let requestId = activeRide?.rideId else { return }

    fetchIncomingBids(requestId: requestId)

    bidPollingTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
        // Stop if driver accepted
        if self.acceptedDriver != nil { self.stopBidPolling(); return }
        self.fetchIncomingBids(requestId: requestId)
    }
}

func acceptBid(_ bid: RideBid) {
    p2pService.acceptDriverBid(bidId: bid.id) { result in
        switch result {
        case .success(let response):
            self.acceptedDriver = response.driver
            self.driverETA = response.estimated_arrival_minutes
            self.currentStep = .driverEnRoute
        case .failure(let error):
            self.showErrorMessage("Failed to accept: \(error)")
        }
    }
}
```

### UI Components (RideRequestView.swift)

1. **DriverBidsSheet** - Full-screen sheet showing all incoming bids
2. **DriverBidCard** - Individual bid card with driver info and actions
3. **AcceptedDriver section** - Shows driver details after acceptance

---

## Backend Implementation (main_new.py)

### Submit Bid Handler

```python
@app.post("/api/rides/request/{request_id}/bid")
def submit_ride_bid(request_id: int, bid_request: RideBidRequest, db: Session, current_user: User):
    from models import RideBid, BidStatus, RideRequest as RideRequestDB

    # Verify ride request exists
    ride_request = db.query(RideRequestDB).filter(RideRequestDB.id == request_id).first()
    if not ride_request:
        raise HTTPException(status_code=404, detail="Ride request not found")

    # Check for existing pending bid
    existing = db.query(RideBid).filter(
        RideBid.ride_request_id == request_id,
        RideBid.driver_id == current_user.driver_id,
        RideBid.status == BidStatus.PENDING
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already have pending bid")

    # Create and save bid
    new_bid = RideBid(
        bid_id=f"BID-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{current_user.driver_id}",
        ride_request_id=request_id,
        driver_id=current_user.driver_id,
        driver_name=f"{driver.first_name} {driver.last_name}",
        driver_rating=driver.rating,
        proposed_price=bid_request.proposed_price,
        message=bid_request.message,
        estimated_arrival_minutes=bid_request.estimated_arrival_minutes,
        status=BidStatus.PENDING,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(new_bid)
    db.commit()

    return {"success": True, "bid": {...}}
```

---

## Testing Checklist

### QA Agent Validation

- [ ] Customer can create ride request (saved to DB)
- [ ] Driver can view available ride requests
- [ ] Driver can submit bid (saved to DB)
- [ ] Customer sees incoming bids (polling works)
- [ ] Customer can accept bid (status updates)
- [ ] Customer can reject bid (removed from list)
- [ ] Driver details shown after acceptance
- [ ] License plate prominently displayed
- [ ] ETA shown to customer
- [ ] Photos load correctly (driver + vehicle)

### Manual Testing Steps

1. **Login as Demo Customer** (demo.customer@dollor.ai)
2. Request a ride from pickup to dropoff
3. **Login as Demo Driver** (demo.driver@dollor.ai) on another device/simulator
4. View available rides and submit a bid
5. **Back to Customer** - verify bid appears in sheet
6. Accept bid - verify driver details shown
7. Verify license plate, ETA, call button work

---

## Known Issues / Future Work

1. **Counter-offer flow**: UI for customer counter-offers not yet implemented
2. **Bid expiration**: Expired bids should auto-remove from list
3. **Push notifications**: Driver should get push when bid accepted
4. **Android parity**: Android app needs matching P2P bidding UI

---

## Commits

| Commit | Description |
|--------|-------------|
| `251cd524` | Backend: Persist bids to database |
| `1aac7996` | iOS: Add bid polling, DriverBidsSheet, AcceptedDriver UI |
| `0d42c30f` | Fix: Compilation errors, add AcceptedDriverInfo initializer |
| `5cde6363` | Docs: Update build guide |

---

*Document maintained by QA Agent System v2.0*
