# Tier 2 Rideshare — Android Implementation Guide

> **What is this?** We built 8 new features for the rideshare part of Dollor.ai. They already work on the backend (the server) and on iOS (iPhones). This guide tells you exactly how to build the same 8 features on Android (Kotlin + Jetpack Compose).

> **Think of it like this:** The kitchen (backend) already knows how to cook 8 new dishes. The iPhone waiter already knows how to take orders for them. Now we need to teach the Android waiter the same menu.

---

## How This Guide Works

Each feature has:
1. **What it does** — plain English explanation
2. **The API** — the exact URL, what you send, what you get back (copy-paste JSON)
3. **Data classes** — the exact Kotlin code for the models
4. **API service method** — the exact function to add
5. **ViewModel** — what logic to add
6. **UI (Composable)** — what screen to build
7. **Where to put each file** — exact file paths
8. **Gotchas** — things that will break if you do them wrong

---

## Android Project Quick Reference

| Thing | Value |
|-------|-------|
| Customer app module | `:app` (package `ai.dollor.customer`) |
| Driver app module | `:driver` (package `ai.dollor.driver`) |
| Shared module | `:shared` (package `ai.dollor.shared`) |
| API base URL | `https://api.dollor.ai/api` |
| WebSocket URL | `wss://api.dollor.ai/ws/{clientType}_{entityId}` |
| Auth header | `Authorization: Bearer {token}` |
| API service (Retrofit) | `DollorApiService.kt` in `:shared` |
| API service (OkHttp) | `CustomerRideshareApiService.kt` in `:app` |
| All models | `ApiModels.kt` in `:shared` |
| Config | `AppConfig.kt` in `:shared` |
| Existing WebSocket | `ChatService.kt` and `NegotiationService.kt` in `:shared` |

### The Golden Rules

1. **Every snake_case JSON field needs `@SerializedName`** — `tip_amount` in JSON becomes `@SerializedName("tip_amount") val tipAmount: Double`
2. **Backend NEVER returns raw arrays** — always wrapped in objects like `{"bids": [...]}` or `{"rides": [...]}`
3. **Auth token comes from** `AppConfig.customerToken` (customer app) or `AppConfig.driverToken` (driver app)
4. **All network calls use** `withContext(Dispatchers.IO)` and return `Result<T>`
5. **All UI updates go to main thread** — Compose StateFlow handles this automatically

---

## Feature T2-1: Vehicle Info on Bid Cards

### What It Does

When a customer sees a list of drivers who bid on their ride, each bid card now shows the driver's car info: **make, model, year, color, and license plate**. Before, it just said "Vehicle info not available."

### The API

This is NOT a new endpoint. The existing bid endpoints now return **extra fields** on each bid object.

**Endpoint that already exists:**
```
GET /api/rides/request/{ride_id}/bids
Authorization: Bearer {customer_token}
```

**Each bid object in the response now includes these NEW fields:**
```json
{
  "id": 45,
  "driver_id": 12,
  "driver_name": "John Smith",
  "driver_rating": 4.8,
  "driver_photo_url": "https://...",
  "driver_vehicle": "2022 Toyota Camry",
  "driver_vehicle_make": "Toyota",
  "driver_vehicle_model": "Camry",
  "driver_vehicle_year": 2022,
  "driver_vehicle_color": "Silver",
  "driver_license_plate": "ABC1234",
  "driver_trips": 156,
  "proposed_price": 25.00,
  "estimated_arrival_minutes": 8,
  "status": "pending",
  "message": "I know a fast route!",
  "expires_at": "2026-02-18T10:30:00",
  "created_at": "2026-02-18T10:00:00"
}
```

### Data Classes to Add/Update

**File:** `shared/src/main/java/ai/dollor/shared/model/ApiModels.kt`

Find the existing `DriverBidForCustomer` data class and add these fields:

```kotlin
data class DriverBidForCustomer(
    val id: Int = 0,
    @SerializedName("bid_id") val bidId: String? = null,
    @SerializedName("ride_request_id") val rideRequestId: Int = 0,
    @SerializedName("driver_id") val driverId: Int = 0,
    @SerializedName("driver_name") val driverName: String? = null,
    @SerializedName("driver_rating") val driverRating: Double? = null,
    @SerializedName("driver_photo_url") val driverPhotoUrl: String? = null,
    @SerializedName("driver_vehicle") val driverVehicle: String? = null,

    // NEW — T2-1 vehicle info fields
    @SerializedName("driver_vehicle_make") val driverVehicleMake: String? = null,
    @SerializedName("driver_vehicle_model") val driverVehicleModel: String? = null,
    @SerializedName("driver_vehicle_year") val driverVehicleYear: Int? = null,
    @SerializedName("driver_vehicle_color") val driverVehicleColor: String? = null,
    @SerializedName("driver_license_plate") val driverLicensePlate: String? = null,
    @SerializedName("driver_trips") val driverTrips: Int? = null,

    @SerializedName("proposed_price") val proposedPrice: Double = 0.0,
    val message: String? = null,
    @SerializedName("estimated_arrival_minutes") val estimatedArrivalMinutes: Int? = null,
    val status: String = "pending",
    @SerializedName("customer_counter_price") val customerCounterPrice: Double? = null,
    @SerializedName("is_counter_offer") val isCounterOffer: Boolean = false,
    @SerializedName("original_price") val originalPrice: Double? = null,
    @SerializedName("customer_response") val customerResponse: String? = null,
    @SerializedName("expires_at") val expiresAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
) {
    // Helper: formatted vehicle string
    val vehicleDisplayText: String
        get() {
            val parts = listOfNotNull(
                driverVehicleYear?.toString(),
                driverVehicleColor,
                driverVehicleMake,
                driverVehicleModel
            )
            return if (parts.isNotEmpty()) parts.joinToString(" ") else driverVehicle ?: "Vehicle info not available"
        }
}
```

### UI Change

In the bid card composable (wherever you show each bid to the customer), replace the "Vehicle info not available" text with:

```kotlin
// Vehicle info
Text(
    text = bid.vehicleDisplayText,
    style = MaterialTheme.typography.bodyMedium,
    color = MaterialTheme.colorScheme.onSurfaceVariant
)

// License plate (if available)
bid.driverLicensePlate?.let { plate ->
    Text(
        text = "Plate: $plate",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.outline
    )
}

// Trip count (if available)
bid.driverTrips?.let { trips ->
    Text(
        text = "$trips trips completed",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.outline
    )
}
```

### Gotchas
- All 6 new fields are **nullable** — the driver might not have filled in their vehicle info
- The old `driver_vehicle` field still exists as a fallback (single concatenated string)
- `vehicleDisplayText` computed property handles both cases

---

## Feature T2-2: Push Notification Improvements

### What It Does

The backend now sends **3 new types** of push notifications during a ride:

| Event | Who Gets It | Title | Body Example |
|-------|-------------|-------|-------------|
| Bid rejected | Driver | "Bid Not Accepted" | "Your bid for ride #123 was not accepted" |
| Payment received | Driver | "Payment Received!" | "You earned $25.00 for ride #123" |
| Driver en route | Customer | "Driver on the way!" | "John is heading to your pickup location" |

### What You Need To Do

These notifications arrive via **Firebase Cloud Messaging (FCM)**. The backend already sends them. You just need to handle them in the app when they arrive.

**File to edit (Customer app):** `app/src/main/java/ai/dollor/customer/.../MyFirebaseMessagingService.kt` (or wherever FCM is handled)

**File to edit (Driver app):** `driver/src/main/java/ai/dollor/driver/.../MyFirebaseMessagingService.kt`

### The notification payload looks like this:

```json
{
  "type": "driver_en_route",
  "ride_id": 123,
  "title": "Driver on the way!",
  "body": "John is heading to your pickup location",
  "driver_name": "John",
  "eta_minutes": 8
}
```

### Customer App — Handle these notification types:

```kotlin
// Inside onMessageReceived() or wherever you process FCM data:
when (data["type"]) {
    "new_bid" -> {
        // A driver bid on your ride — navigate to bids list
        showNotification(data["title"] ?: "New Bid", data["body"] ?: "A driver has bid on your ride")
        // Post event so if the app is open, the bid list refreshes
    }
    "bid_accepted" -> {
        // Your bid acceptance was confirmed
        showNotification(data["title"] ?: "Bid Accepted", data["body"] ?: "Your driver is confirmed")
    }
    "driver_en_route" -> {
        // Driver is on the way to pickup
        showNotification(data["title"] ?: "Driver On The Way", data["body"] ?: "Your driver is heading to you")
        // Navigate to tracking screen if app is open
    }
    "payment_processed" -> {
        // Payment was processed
        showNotification(data["title"] ?: "Payment Complete", data["body"] ?: "Your payment has been processed")
    }
}
```

### Driver App — Handle these notification types:

```kotlin
when (data["type"]) {
    "new_ride_request" -> {
        // New ride available for bidding
        showNotification(data["title"] ?: "New Ride", data["body"] ?: "A rider needs a ride nearby")
    }
    "bid_accepted" -> {
        // Customer accepted your bid!
        showNotification(data["title"] ?: "Bid Accepted!", data["body"] ?: "You've been matched with a rider")
    }
    "bid_rejected" -> {
        // Customer chose another driver
        showNotification(data["title"] ?: "Bid Not Accepted", data["body"] ?: "The rider chose another driver")
    }
    "counter_offer" -> {
        // Customer countered your price
        showNotification(data["title"] ?: "Counter-Offer", data["body"] ?: "The rider has a counter-offer")
    }
    "payment_processed" -> {
        // You got paid!
        showNotification(data["title"] ?: "Payment Received!", data["body"] ?: "Check your earnings")
    }
}
```

### Gotchas
- The `type` field is in the `data` payload, NOT in the `notification` payload
- If the app is in the **foreground**, `onMessageReceived` is called — you need to show the notification yourself
- If the app is in the **background**, Android shows it automatically from the `notification` payload
- Always use a **notification channel** for Android 8+ (create a "Rideshare" channel)

---

## Feature T2-3: WebSocket Real-Time Updates

### What It Does

Instead of polling the server every 5 seconds ("Hey server, any new bids? Hey server, any new bids?"), the app opens a WebSocket connection. The server PUSHES updates instantly. Think of it like a phone call (WebSocket) vs. sending a text every 5 seconds asking "any news?" (polling).

### The WebSocket Details

| Thing | Value |
|-------|-------|
| URL pattern | `wss://api.dollor.ai/ws/{clientType}_{entityId}` |
| Customer example | `wss://api.dollor.ai/ws/customer_42` |
| Driver example | `wss://api.dollor.ai/ws/driver_15` |
| Ping interval | Every 30 seconds |
| Reconnect | Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max) |

### Messages FROM server (incoming events):

Every message is JSON with a `"type"` field:

```json
{"type": "connected"}
{"type": "subscribed", "topic": "ride:123"}
{"type": "new_bid", "ride_request_id": 123, "bid_id": 45, "driver_id": 12, "fare": 25.0}
{"type": "ride_status_update", "ride_id": 123, "status": "driver_arrived"}
{"type": "driver_location_update", "latitude": 40.7128, "longitude": -74.0060, "eta_minutes": 3}
{"type": "eta_update", "eta_pickup_minutes": 5, "eta_destination_minutes": 12}
{"type": "bid_response", "bid_id": 45, "status": "accepted"}
{"type": "payment_update", "ride_id": 123, "status": "succeeded", "amount": 25.0}
{"type": "chat_message", "message": "I'm here!", "sender": "driver"}
```

### Messages TO server (outgoing actions):

```json
{"action": "subscribe", "topic": "ride:123"}
{"action": "unsubscribe", "topic": "ride:123"}
```

### New File to Create

**File:** `shared/src/main/java/ai/dollor/shared/data/remote/RideshareWebSocketService.kt`

You already have `ChatService.kt` with WebSocket code. Follow the SAME pattern:

```kotlin
@Singleton
class RideshareWebSocketService @Inject constructor() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MINUTES)  // No read timeout for WebSocket
        .pingInterval(30, TimeUnit.SECONDS) // Keep-alive ping
        .build()

    private var webSocket: WebSocket? = null
    private var shouldReconnect = false
    private var reconnectDelay = 1000L  // Start at 1 second
    private val maxReconnectDelay = 30000L
    private val subscribedTopics = mutableSetOf<String>()
    private val gson = Gson()

    // --- State flows (observe these in ViewModels) ---

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _newBids = MutableSharedFlow<Map<String, Any>>(extraBufferCapacity = 10)
    val newBids: SharedFlow<Map<String, Any>> = _newBids

    private val _rideStatusUpdates = MutableSharedFlow<Map<String, Any>>(extraBufferCapacity = 10)
    val rideStatusUpdates: SharedFlow<Map<String, Any>> = _rideStatusUpdates

    private val _driverLocationUpdates = MutableSharedFlow<Map<String, Any>>(extraBufferCapacity = 10)
    val driverLocationUpdates: SharedFlow<Map<String, Any>> = _driverLocationUpdates

    private val _etaUpdates = MutableSharedFlow<Map<String, Any>>(extraBufferCapacity = 10)
    val etaUpdates: SharedFlow<Map<String, Any>> = _etaUpdates

    private val _bidResponses = MutableSharedFlow<Map<String, Any>>(extraBufferCapacity = 10)
    val bidResponses: SharedFlow<Map<String, Any>> = _bidResponses

    private val _paymentUpdates = MutableSharedFlow<Map<String, Any>>(extraBufferCapacity = 10)
    val paymentUpdates: SharedFlow<Map<String, Any>> = _paymentUpdates

    // --- Connect ---

    fun connect(clientType: String, entityId: Int) {
        if (_connectionState.value == ConnectionState.CONNECTED) return

        shouldReconnect = true
        val url = "wss://api.dollor.ai/ws/${clientType}_${entityId}"

        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {

            override fun onOpen(ws: WebSocket, response: Response) {
                _connectionState.value = ConnectionState.CONNECTED
                reconnectDelay = 1000L
                // Re-subscribe to saved topics
                subscribedTopics.forEach { topic ->
                    val msg = JSONObject().put("action", "subscribe").put("topic", topic)
                    ws.send(msg.toString())
                }
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val type = json.optString("type", "")
                    val map = gson.fromJson<Map<String, Any>>(text, object : TypeToken<Map<String, Any>>() {}.type)

                    when (type) {
                        "new_bid"                -> _newBids.tryEmit(map)
                        "ride_status_update"     -> _rideStatusUpdates.tryEmit(map)
                        "driver_location_update" -> _driverLocationUpdates.tryEmit(map)
                        "eta_update"             -> _etaUpdates.tryEmit(map)
                        "bid_response"           -> _bidResponses.tryEmit(map)
                        "payment_update"         -> _paymentUpdates.tryEmit(map)
                        "connected"              -> { /* server acknowledged */ }
                        "subscribed"             -> { /* topic confirmed */ }
                    }
                } catch (e: Exception) {
                    Log.e("RideshareWS", "Parse error: ${e.message}")
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                _connectionState.value = ConnectionState.DISCONNECTED
                scheduleReconnect(clientType, entityId)
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                _connectionState.value = ConnectionState.DISCONNECTED
                if (shouldReconnect) scheduleReconnect(clientType, entityId)
            }
        })
    }

    // --- Disconnect ---

    fun disconnect() {
        shouldReconnect = false
        webSocket?.close(1000, "Client disconnect")
        webSocket = null
        subscribedTopics.clear()
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    // --- Subscribe/Unsubscribe ---

    fun subscribe(topic: String) {
        subscribedTopics.add(topic)
        if (_connectionState.value == ConnectionState.CONNECTED) {
            val msg = JSONObject().put("action", "subscribe").put("topic", topic)
            webSocket?.send(msg.toString())
        }
    }

    fun unsubscribe(topic: String) {
        subscribedTopics.remove(topic)
        if (_connectionState.value == ConnectionState.CONNECTED) {
            val msg = JSONObject().put("action", "unsubscribe").put("topic", topic)
            webSocket?.send(msg.toString())
        }
    }

    // --- Reconnect with exponential backoff ---

    private fun scheduleReconnect(clientType: String, entityId: Int) {
        if (!shouldReconnect) return
        Handler(Looper.getMainLooper()).postDelayed({
            if (shouldReconnect) connect(clientType, entityId)
        }, reconnectDelay)
        reconnectDelay = (reconnectDelay * 2).coerceAtMost(maxReconnectDelay)
    }

    val isConnected: Boolean get() = _connectionState.value == ConnectionState.CONNECTED

    enum class ConnectionState { DISCONNECTED, CONNECTING, CONNECTED, ERROR }
}
```

### How to Use in Customer ViewModel

```kotlin
// In your RideRequestViewModel:

private val wsService = RideshareWebSocketService()

fun startListeningForBids(rideId: Int) {
    val customerId = AppConfig.currentCustomerId ?: return

    // Connect WebSocket
    wsService.connect("customer", customerId)
    wsService.subscribe("ride:$rideId")

    // Listen for new bids
    viewModelScope.launch {
        wsService.newBids.collect { data ->
            val bidRideId = (data["ride_request_id"] as? Double)?.toInt()
            if (bidRideId == rideId) {
                fetchBids(rideId)  // Refresh bids from API
            }
        }
    }

    // Listen for ride status changes
    viewModelScope.launch {
        wsService.rideStatusUpdates.collect { data ->
            val status = data["status"] as? String
            if (status == "driver_arrived") {
                _driverHasArrived.value = true
            }
        }
    }

    // Listen for ETA updates
    viewModelScope.launch {
        wsService.etaUpdates.collect { data ->
            val eta = (data["eta_pickup_minutes"] as? Double)?.toInt()
            eta?.let { _driverETA.value = it }
        }
    }
}

fun stopListening() {
    wsService.disconnect()
}
```

### How to Use in Driver ViewModel

```kotlin
fun startListeningForRides() {
    val driverId = AppConfig.currentDriverId ?: return

    wsService.connect("driver", driverId)
    wsService.subscribe("driver:$driverId")

    viewModelScope.launch {
        wsService.newBids.collect {
            fetchAvailableRequests()  // Refresh from API
        }
    }

    viewModelScope.launch {
        wsService.bidResponses.collect {
            fetchMyBids()  // Refresh from API
        }
    }
}
```

### Gotchas
- **Don't disconnect in `onCleared()` if using singleton** — other ViewModels might be using it
- **JSON numbers come as `Double`** from Gson — cast to `Int` with `(value as? Double)?.toInt()`
- **Keep polling as fallback** — if WebSocket is connected, skip HTTP polls; if not, poll every 5s
- OkHttp WebSocket already handles ping/pong if you set `.pingInterval(30, TimeUnit.SECONDS)`
- You already have `ChatService.kt` — follow that exact same pattern

---

## Feature T2-4: ETA Display

### What It Does

Shows the customer an estimated time of arrival (ETA) in minutes. "Your driver arrives in ~8 min." The backend uses Haversine distance / 30 km/h as a starting estimate. When the driver is en route, the tracking endpoint returns updated ETA.

### The API

This uses the **existing tracking endpoint** which now returns ETA fields:

```
GET /api/rides/request/{ride_id}/track
Authorization: Bearer {customer_token}
```

**Response now includes:**
```json
{
  "status": "driver_en_route",
  "driver_location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "eta_pickup_minutes": 8,
  "eta_destination_minutes": null,
  "driver_arrived_at": null
}
```

### What to Add in the UI

In your tracking/active ride screen, show the ETA:

```kotlin
// In your ActiveRideScreen composable:

val etaMinutes by viewModel.driverETA.collectAsState()

if (etaMinutes != null) {
    Box(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(12.dp))
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "${etaMinutes}",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "min",
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}
```

### Data Class Update

Make sure your tracking response model has these fields:

```kotlin
data class RideTrackingResponse(
    val status: String = "",
    @SerializedName("driver_location") val driverLocation: DriverLocationData? = null,
    @SerializedName("eta_pickup_minutes") val etaPickupMinutes: Int? = null,
    @SerializedName("eta_destination_minutes") val etaDestinationMinutes: Int? = null,
    @SerializedName("driver_arrived_at") val driverArrivedAt: String? = null
)

data class DriverLocationData(
    val latitude: Double = 0.0,
    val longitude: Double = 0.0
)
```

### Gotchas
- `eta_pickup_minutes` is shown BEFORE pickup (driver heading to customer)
- `eta_destination_minutes` is shown AFTER pickup (driver heading to dropoff)
- Both can be `null` — always use `?.let { }` or `?:` for display
- WebSocket `eta_update` events supplement this — if WS is connected, update ETA from WS too

---

## Feature T2-5: Ride Receipt / Invoice

### What It Does

After a ride is completed, the customer can tap "View Receipt" and see a full breakdown: fare, platform fee, tip, total, driver info, route, and timestamps. They can also tap "Email Receipt" to get it sent to their email.

### The APIs

**1. Get receipt:**
```
GET /api/rides/request/{ride_id}/receipt
Authorization: Bearer {customer_token}
```

**Response:**
```json
{
  "success": true,
  "receipt": {
    "ride_id": 123,
    "request_id": "RR-ABC123",
    "status": "completed",
    "route": {
      "pickup_address": "123 Main St, New York, NY",
      "dropoff_address": "456 Broadway, New York, NY",
      "distance_miles": 3.2,
      "duration_minutes": 15
    },
    "fare_breakdown": {
      "base_fare": 18.50,
      "platform_fee": 1.00,
      "tip": 3.00,
      "total": 22.50
    },
    "payment": {
      "status": "succeeded",
      "paid_at": "2026-02-18T09:45:00"
    },
    "driver": {
      "id": 12,
      "name": "John Smith",
      "photo_url": "https://...",
      "rating": 4.8,
      "vehicle": "2022 Toyota Camry",
      "license_plate": "ABC1234"
    },
    "timestamps": {
      "requested_at": "2026-02-18T09:00:00",
      "matched_at": "2026-02-18T09:05:00",
      "completed_at": "2026-02-18T09:30:00"
    },
    "rating": {
      "customer_rating": 5,
      "customer_comment": "Great driver!"
    }
  }
}
```

**2. Email receipt:**
```
POST /api/rides/request/{ride_id}/email-receipt
Authorization: Bearer {customer_token}
```

**Response:**
```json
{"success": true, "message": "Receipt email sent"}
```

### Data Classes

**File:** `shared/src/main/java/ai/dollor/shared/model/ApiModels.kt`

```kotlin
// --- T2-5: Receipt models ---

data class RideReceiptResponse(
    val success: Boolean = false,
    val receipt: RideReceipt? = null
)

data class RideReceipt(
    @SerializedName("ride_id") val rideId: Int = 0,
    @SerializedName("request_id") val requestId: String? = null,
    val status: String = "",
    val route: ReceiptRoute = ReceiptRoute(),
    @SerializedName("fare_breakdown") val fareBreakdown: ReceiptFareBreakdown = ReceiptFareBreakdown(),
    val payment: ReceiptPayment = ReceiptPayment(),
    val driver: ReceiptDriver? = null,
    val timestamps: ReceiptTimestamps = ReceiptTimestamps(),
    val rating: ReceiptRating? = null
)

data class ReceiptRoute(
    @SerializedName("pickup_address") val pickupAddress: String = "",
    @SerializedName("dropoff_address") val dropoffAddress: String = "",
    @SerializedName("distance_miles") val distanceMiles: Double = 0.0,
    @SerializedName("duration_minutes") val durationMinutes: Int? = null
)

data class ReceiptFareBreakdown(
    @SerializedName("base_fare") val baseFare: Double = 0.0,
    @SerializedName("platform_fee") val platformFee: Double = 0.0,
    val tip: Double = 0.0,
    val total: Double = 0.0
)

data class ReceiptPayment(
    val status: String? = null,
    @SerializedName("paid_at") val paidAt: String? = null
)

data class ReceiptDriver(
    val id: Int? = null,
    val name: String? = null,
    @SerializedName("photo_url") val photoUrl: String? = null,
    val rating: Double? = null,
    val vehicle: String? = null,
    @SerializedName("license_plate") val licensePlate: String? = null
)

data class ReceiptTimestamps(
    @SerializedName("requested_at") val requestedAt: String? = null,
    @SerializedName("matched_at") val matchedAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null
)

data class ReceiptRating(
    @SerializedName("customer_rating") val customerRating: Int? = null,
    @SerializedName("customer_comment") val customerComment: String? = null
)

data class EmailReceiptResponse(
    val success: Boolean = false,
    val message: String? = null
)
```

### API Method

**File:** `app/src/main/java/ai/dollor/customer/data/CustomerRideshareApiService.kt`

```kotlin
suspend fun fetchRideReceipt(rideId: Int): Result<RideReceipt> = withContext(Dispatchers.IO) {
    try {
        val request = Request.Builder()
            .url("$BASE_URL/api/rides/request/$rideId/receipt")
            .get()
            .withCustomerAuth()
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string()

        if (response.isSuccessful && body != null) {
            val wrapper = gson.fromJson(body, RideReceiptResponse::class.java)
            if (wrapper.success && wrapper.receipt != null) {
                Result.success(wrapper.receipt)
            } else {
                Result.failure(Exception("Receipt not available"))
            }
        } else {
            Result.failure(Exception("Failed: ${response.code}"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}

suspend fun emailRideReceipt(rideId: Int): Result<EmailReceiptResponse> = withContext(Dispatchers.IO) {
    try {
        val request = Request.Builder()
            .url("$BASE_URL/api/rides/request/$rideId/email-receipt")
            .post("{}".toRequestBody("application/json".toMediaType()))
            .withCustomerAuth()
            .build()

        val response = client.newCall(request).execute()
        val body = response.body?.string()

        if (response.isSuccessful && body != null) {
            Result.success(gson.fromJson(body, EmailReceiptResponse::class.java))
        } else {
            Result.failure(Exception("Failed: ${response.code}"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### UI — New Composable Screen

**File:** `app/src/main/java/ai/dollor/customer/ui/rideshare/RideReceiptScreen.kt`

Build a screen that shows:
1. **Route summary** — pickup address -> dropoff address with a dotted line between green and red dots
2. **Fare breakdown table** — Base Fare, Platform Fee, Tip, **Total** (bold)
3. **Driver card** — photo, name, rating, vehicle, plate
4. **Timestamps** — Requested, Matched, Completed
5. **"Email Receipt" button** at the bottom
6. **"Report Issue" button** — navigates to DisputeRideScreen (T2-7)

### Where to Navigate From

Add a "View Receipt" button in the **ride history list** (completed rides only):

```kotlin
if (ride.status == "completed") {
    TextButton(onClick = { navController.navigate("receipt/${ride.id}") }) {
        Text("View Receipt")
    }
}
```

### Gotchas
- Receipt is ONLY available for `status == "completed"` rides — backend returns 400 otherwise
- The `total` field now includes `base_fare + platform_fee + tip` (not just fare + tip)
- `email-receipt` POST needs an empty JSON body `{}`, not an empty body

---

## Feature T2-6: Driver Payout Dashboard

### What It Does

Drivers can see a detailed breakdown of every ride they completed and how much they earned. It shows: gross fare, platform fee deducted, tips, net payout, and whether Stripe has paid them yet.

### The API

```
GET /api/rides/driver/{driver_id}/payout-history?period=week
Authorization: Bearer {driver_token}
```

**Query parameters:**
| Param | Values | Default |
|-------|--------|---------|
| `period` | `today`, `week`, `month` | `week` |
| `start_date` | ISO date string | (computed from period) |
| `end_date` | ISO date string | (computed from period) |

**Response:**
```json
{
  "success": true,
  "period": "week",
  "start_date": "2026-02-11T00:00:00",
  "end_date": "2026-02-18T10:00:00",
  "summary": {
    "total_gross": 245.00,
    "total_fees": 8.00,
    "total_tips": 32.00,
    "total_net": 269.00,
    "ride_count": 12,
    "avg_per_ride": 22.42
  },
  "rides": [
    {
      "ride_id": 123,
      "request_id": "RR-ABC123",
      "date": "2026-02-18T09:30:00",
      "pickup_address": "123 Main St",
      "dropoff_address": "456 Broadway",
      "fare": 25.00,
      "platform_fee": 1.00,
      "tip": 5.00,
      "net_payout": 29.00,
      "stripe_status": "paid"
    }
  ]
}
```

### Data Classes

```kotlin
// --- T2-6: Payout models ---

data class PayoutHistoryResponse(
    val success: Boolean = false,
    val period: String = "",
    @SerializedName("start_date") val startDate: String? = null,
    @SerializedName("end_date") val endDate: String? = null,
    val summary: PayoutSummary = PayoutSummary(),
    val rides: List<PayoutRideItem> = emptyList()
)

data class PayoutSummary(
    @SerializedName("total_gross") val totalGross: Double = 0.0,
    @SerializedName("total_fees") val totalFees: Double = 0.0,
    @SerializedName("total_tips") val totalTips: Double = 0.0,
    @SerializedName("total_net") val totalNet: Double = 0.0,
    @SerializedName("ride_count") val rideCount: Int = 0,
    @SerializedName("avg_per_ride") val avgPerRide: Double = 0.0
)

data class PayoutRideItem(
    @SerializedName("ride_id") val rideId: Int = 0,
    @SerializedName("request_id") val requestId: String? = null,
    val date: String? = null,
    @SerializedName("pickup_address") val pickupAddress: String? = null,
    @SerializedName("dropoff_address") val dropoffAddress: String? = null,
    val fare: Double = 0.0,
    @SerializedName("platform_fee") val platformFee: Double = 0.0,
    val tip: Double = 0.0,
    @SerializedName("net_payout") val netPayout: Double = 0.0,
    @SerializedName("stripe_status") val stripeStatus: String? = null
)
```

### API Method (Driver App)

Add to the driver's API service or `DollorApiService.kt`:

```kotlin
// In DollorApiService.kt (Retrofit):
@GET("rides/driver/{driverId}/payout-history")
suspend fun getPayoutHistory(
    @Path("driverId") driverId: Int,
    @Query("period") period: String = "week",
    @Header("Authorization") token: String
): PayoutHistoryResponse
```

### UI — New Screen

**File:** `driver/src/main/java/ai/dollor/driver/ui/rideshare/PayoutDashboardScreen.kt`

1. **Period selector** — 3 chips: Today / This Week / This Month
2. **Summary card** — 4 boxes showing Gross, Fees, Tips, Net (big green number)
3. **Ride list** — each row shows date, addresses, fare, fee, tip, net, and a colored dot for stripe_status (green = paid, yellow = pending, red = failed, blue = demo)
4. **"Manage Bank Account" button** — calls existing `getStripeDashboardLink()` and opens in browser

### Gotchas
- `stripe_status` values: `"paid"`, `"pending"`, `"demo"` — show different colors
- The driver can only see their OWN payouts — backend returns 403 if driver_id doesn't match JWT
- `net_payout` = `driver_payout + tip` (this is what they actually receive)
- Platform fee is what was deducted FROM the fare ($1/$2/$3 based on fare tier)

---

## Feature T2-7: Payment Dispute / Refund

### What It Does

After a completed ride, if the customer has a problem (wrong route, overcharged, safety concern), they can file a dispute. The dispute goes to admin for review. The admin can issue a refund through Stripe.

### The APIs

**1. Create dispute (customer only):**
```
POST /api/rides/dispute
Authorization: Bearer {customer_token}
Content-Type: application/json

{
  "ride_request_id": 123,
  "reason": "overcharged",
  "description": "The fare was much higher than the estimate"
}
```

**Valid reasons:** `"wrong_route"`, `"overcharged"`, `"safety_concern"`, `"driver_behavior"`, `"other"`

**Response:**
```json
{
  "success": true,
  "message": "Dispute submitted successfully. We'll review within 24-48 hours.",
  "dispute": {
    "id": 7,
    "ride_request_id": 123,
    "reason": "overcharged",
    "description": "The fare was much higher than the estimate",
    "status": "submitted",
    "created_at": "2026-02-18T10:00:00"
  }
}
```

**2. Get dispute status:**
```
GET /api/rides/dispute/{dispute_id}
Authorization: Bearer {customer_token}
```

**3. List my disputes:**
```
GET /api/rides/customer/{customer_id}/disputes
Authorization: Bearer {customer_token}
```

**Response:**
```json
{
  "success": true,
  "disputes": [
    {
      "id": 7,
      "ride_request_id": 123,
      "reason": "overcharged",
      "status": "submitted",
      "refund_amount": null,
      "created_at": "2026-02-18T10:00:00"
    }
  ]
}
```

### Data Classes

```kotlin
// --- T2-7: Dispute models ---

data class CreateDisputeRequest(
    @SerializedName("ride_request_id") val rideRequestId: Int,
    val reason: String,
    val description: String? = null
)

data class CreateDisputeResponse(
    val success: Boolean = false,
    val message: String? = null,
    val dispute: DisputeDetail? = null
)

data class DisputeDetail(
    val id: Int = 0,
    @SerializedName("ride_request_id") val rideRequestId: Int = 0,
    val reason: String = "",
    val description: String? = null,
    val status: String = "",
    @SerializedName("refund_amount") val refundAmount: Double? = null,
    @SerializedName("resolved_at") val resolvedAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)

data class DisputeStatusResponse(
    val success: Boolean = false,
    val dispute: DisputeDetail? = null
)

data class CustomerDisputesResponse(
    val success: Boolean = false,
    val disputes: List<DisputeDetail> = emptyList()
)
```

### API Methods

```kotlin
suspend fun createDispute(rideRequestId: Int, reason: String, description: String?): Result<CreateDisputeResponse> =
    withContext(Dispatchers.IO) {
        try {
            val body = gson.toJson(CreateDisputeRequest(rideRequestId, reason, description))
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/dispute")
                .post(body.toRequestBody("application/json".toMediaType()))
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                Result.success(gson.fromJson(responseBody, CreateDisputeResponse::class.java))
            } else {
                Result.failure(Exception("Failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

suspend fun fetchMyDisputes(customerId: Int): Result<CustomerDisputesResponse> =
    withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/customer/$customerId/disputes")
                .get()
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string()

            if (response.isSuccessful && body != null) {
                Result.success(gson.fromJson(body, CustomerDisputesResponse::class.java))
            } else {
                Result.failure(Exception("Failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
```

### UI — New Screen

**File:** `app/src/main/java/ai/dollor/customer/ui/rideshare/DisputeRideScreen.kt`

1. **Reason picker** — 5 options as radio buttons or chips:
   - Wrong route
   - Overcharged
   - Safety concern
   - Driver behavior
   - Other
2. **Description text field** — optional, max 500 chars
3. **Submit button** — shows loading, then success message
4. **After submit** — show status tracker: Submitted -> Under Review -> Resolved

### Where to Navigate From

Add a "Report Issue" button on the receipt screen and on completed rides in history.

### Gotchas
- Only **customers** can create disputes (not drivers) — backend returns 403 for driver tokens
- Only **one dispute per ride** — backend returns 400 if dispute already exists
- The `reason` must be one of the 5 exact strings — backend returns 400 with valid options if wrong
- Dispute `status` values: `"submitted"`, `"under_review"`, `"resolved_refund"`, `"resolved_no_refund"`, `"closed"`

---

## Feature T2-8: Recurring Ride Matching

### What It Does

A customer can save a ride pattern: "Every Monday and Wednesday at 8:30 AM, take me from home to work." The system saves it and can match them with their preferred driver automatically.

### The APIs

**1. Create recurring ride:**
```
POST /api/rides/customer/{customer_id}/recurring-rides
Authorization: Bearer {customer_token}
Content-Type: application/json

{
  "pickup_address": "123 Main St, New York, NY",
  "pickup_latitude": 40.7128,
  "pickup_longitude": -74.0060,
  "dropoff_address": "456 Broadway, New York, NY",
  "dropoff_latitude": 40.7580,
  "dropoff_longitude": -73.9855,
  "schedule_days": "mon,wed,fri",
  "schedule_time": "08:30",
  "timezone": "America/New_York",
  "max_price": 30.00,
  "preferred_driver_id": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recurring ride created",
  "recurring_ride": {
    "id": 5,
    "customer_id": 42,
    "pickup_address": "123 Main St, New York, NY",
    "pickup_latitude": 40.7128,
    "pickup_longitude": -74.006,
    "dropoff_address": "456 Broadway, New York, NY",
    "dropoff_latitude": 40.758,
    "dropoff_longitude": -73.9855,
    "schedule_days": "mon,wed,fri",
    "schedule_time": "08:30",
    "timezone": "America/New_York",
    "preferred_driver_id": null,
    "max_price": 30.0,
    "ride_type": "standard",
    "is_active": true,
    "last_triggered_at": null,
    "created_at": "2026-02-18T10:00:00"
  }
}
```

**2. List my recurring rides:**
```
GET /api/rides/customer/{customer_id}/recurring-rides
Authorization: Bearer {customer_token}
```

**3. Update recurring ride:**
```
PUT /api/rides/recurring-rides/{ride_id}
Authorization: Bearer {customer_token}
Content-Type: application/json

{
  "schedule_days": "mon,tue,wed,thu,fri",
  "is_active": false
}
```

**4. Delete recurring ride:**
```
DELETE /api/rides/recurring-rides/{ride_id}
Authorization: Bearer {customer_token}
```

### Data Classes

```kotlin
// --- T2-8: Recurring ride models ---

data class CreateRecurringRideRequest(
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("pickup_latitude") val pickupLatitude: Double,
    @SerializedName("pickup_longitude") val pickupLongitude: Double,
    @SerializedName("dropoff_address") val dropoffAddress: String,
    @SerializedName("dropoff_latitude") val dropoffLatitude: Double,
    @SerializedName("dropoff_longitude") val dropoffLongitude: Double,
    @SerializedName("schedule_days") val scheduleDays: String,
    @SerializedName("schedule_time") val scheduleTime: String,
    val timezone: String = "America/New_York",
    @SerializedName("preferred_driver_id") val preferredDriverId: Int? = null,
    @SerializedName("max_price") val maxPrice: Double? = null,
    @SerializedName("ride_type") val rideType: String = "standard"
)

data class UpdateRecurringRideRequest(
    @SerializedName("schedule_days") val scheduleDays: String? = null,
    @SerializedName("schedule_time") val scheduleTime: String? = null,
    @SerializedName("preferred_driver_id") val preferredDriverId: Int? = null,
    @SerializedName("max_price") val maxPrice: Double? = null,
    @SerializedName("is_active") val isActive: Boolean? = null
)

data class RecurringRide(
    val id: Int = 0,
    @SerializedName("customer_id") val customerId: Int = 0,
    @SerializedName("pickup_address") val pickupAddress: String = "",
    @SerializedName("pickup_latitude") val pickupLatitude: Double = 0.0,
    @SerializedName("pickup_longitude") val pickupLongitude: Double = 0.0,
    @SerializedName("dropoff_address") val dropoffAddress: String = "",
    @SerializedName("dropoff_latitude") val dropoffLatitude: Double = 0.0,
    @SerializedName("dropoff_longitude") val dropoffLongitude: Double = 0.0,
    @SerializedName("schedule_days") val scheduleDays: String = "",
    @SerializedName("schedule_time") val scheduleTime: String = "",
    val timezone: String = "America/New_York",
    @SerializedName("preferred_driver_id") val preferredDriverId: Int? = null,
    @SerializedName("max_price") val maxPrice: Double? = null,
    @SerializedName("ride_type") val rideType: String = "standard",
    @SerializedName("is_active") val isActive: Boolean = true,
    @SerializedName("last_triggered_at") val lastTriggeredAt: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
) {
    // Helper: formatted days
    val formattedDays: String
        get() = scheduleDays.split(",").joinToString(", ") { day ->
            when (day.trim().lowercase()) {
                "mon" -> "Mon"
                "tue" -> "Tue"
                "wed" -> "Wed"
                "thu" -> "Thu"
                "fri" -> "Fri"
                "sat" -> "Sat"
                "sun" -> "Sun"
                else -> day
            }
        }
}

data class RecurringRideResponse(
    val success: Boolean = false,
    val message: String? = null,
    @SerializedName("recurring_ride") val recurringRide: RecurringRide? = null
)

data class RecurringRidesListResponse(
    val success: Boolean = false,
    @SerializedName("recurring_rides") val recurringRides: List<RecurringRide> = emptyList()
)
```

### API Methods

```kotlin
suspend fun createRecurringRide(customerId: Int, data: CreateRecurringRideRequest): Result<RecurringRideResponse> =
    withContext(Dispatchers.IO) {
        try {
            val body = gson.toJson(data).toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/customer/$customerId/recurring-rides")
                .post(body)
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                Result.success(gson.fromJson(responseBody, RecurringRideResponse::class.java))
            } else {
                Result.failure(Exception("Failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

suspend fun fetchRecurringRides(customerId: Int): Result<RecurringRidesListResponse> =
    withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/customer/$customerId/recurring-rides")
                .get()
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val body = response.body?.string()

            if (response.isSuccessful && body != null) {
                Result.success(gson.fromJson(body, RecurringRidesListResponse::class.java))
            } else {
                Result.failure(Exception("Failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

suspend fun updateRecurringRide(rideId: Int, data: UpdateRecurringRideRequest): Result<RecurringRideResponse> =
    withContext(Dispatchers.IO) {
        try {
            val body = gson.toJson(data).toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/recurring-rides/$rideId")
                .put(body)
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful && responseBody != null) {
                Result.success(gson.fromJson(responseBody, RecurringRideResponse::class.java))
            } else {
                Result.failure(Exception("Failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

suspend fun deleteRecurringRide(rideId: Int): Result<Boolean> =
    withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$BASE_URL/api/rides/recurring-rides/$rideId")
                .delete()
                .withCustomerAuth()
                .build()

            val response = client.newCall(request).execute()
            Result.success(response.isSuccessful)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
```

### UI — New Screen

**File:** `app/src/main/java/ai/dollor/customer/ui/rideshare/RecurringRidesScreen.kt`

**List screen:**
1. Show all recurring rides as cards
2. Each card: pickup -> dropoff, days (Mon, Wed, Fri), time (8:30 AM), active/inactive toggle
3. Swipe to delete or tap to edit
4. FAB button "+" to add new

**Setup sheet (bottom sheet or new screen):**
1. Pickup address field (use Google Places autocomplete — you already have the API key)
2. Dropoff address field (same autocomplete)
3. Day picker — 7 toggleable chips (Mon through Sun)
4. Time picker — Android TimePickerDialog
5. Max price field (optional)
6. Preferred driver toggle (optional — pick from past drivers)
7. Save button

### Important: You Need Lat/Lng

The backend REQUIRES `pickup_latitude`, `pickup_longitude`, `dropoff_latitude`, `dropoff_longitude`. When the user types an address, you must geocode it to get coordinates.

**Two options:**
1. **Google Places Autocomplete** — returns lat/lng with the place selection (best option since you already have the API key)
2. **Android Geocoder** — `Geocoder(context).getFromLocationName(address, 1)` returns `Address` objects with latitude/longitude

### Where to Navigate From

Add "My Recurring Rides" in the customer's profile or ride history screen.

### Gotchas
- Max 20 recurring rides per customer — backend returns 400 if exceeded
- `schedule_days` must be lowercase comma-separated: `"mon,wed,fri"` — NOT `"Monday,Wednesday,Friday"`
- `schedule_time` must be `"HH:MM"` 24-hour format: `"08:30"` — NOT `"8:30 AM"`
- `max_price` must be positive if provided — backend returns 400 for 0 or negative
- Coordinates must be valid ranges: lat -90 to 90, lng -180 to 180
- The DELETE endpoint returns `{"success": true, "message": "Recurring ride deleted"}` — no body to parse

---

## Summary: All New Files to Create

### Customer App (`:app`)

| File | Purpose |
|------|---------|
| `ui/rideshare/RideReceiptScreen.kt` | T2-5 receipt view |
| `ui/rideshare/DisputeRideScreen.kt` | T2-7 dispute form + status |
| `ui/rideshare/RecurringRidesScreen.kt` | T2-8 list + create/edit |

### Driver App (`:driver`)

| File | Purpose |
|------|---------|
| `ui/rideshare/PayoutDashboardScreen.kt` | T2-6 payout breakdown |

### Shared Module (`:shared`)

| File | Purpose |
|------|---------|
| `data/remote/RideshareWebSocketService.kt` | T2-3 WebSocket client |

### Files to Edit (add data classes)

| File | What to Add |
|------|-------------|
| `shared/.../model/ApiModels.kt` | T2-1 vehicle fields on `DriverBidForCustomer`, T2-5 receipt models, T2-6 payout models, T2-7 dispute models, T2-8 recurring ride models |
| `app/.../data/CustomerRideshareApiService.kt` | T2-5 receipt methods, T2-7 dispute methods, T2-8 recurring ride methods |
| `shared/.../data/remote/DollorApiService.kt` | T2-6 payout history endpoint (Retrofit) |
| FCM service (both apps) | T2-2 notification type handling |
| Existing tracking response model | T2-4 ETA fields |
| Bid card composable | T2-1 vehicle info display |
| Tracking/active ride composable | T2-4 ETA display |
| Ride history list | Navigation to receipt + dispute |
| Profile/settings | Navigation to recurring rides |
| Driver earnings section | Navigation to payout dashboard |

---

## Implementation Order (Do Them In This Order)

1. **T2-1** (Vehicle Info) — smallest change, just add fields to existing model
2. **T2-4** (ETA) — add fields to existing tracking model + small UI
3. **T2-2** (Push Notifications) — edit existing FCM handler
4. **T2-3** (WebSocket) — new file, follow ChatService.kt pattern
5. **T2-5** (Receipt) — new screen + 2 API methods
6. **T2-6** (Payout Dashboard) — new screen + 1 API method (driver app)
7. **T2-7** (Dispute) — new screen + 2 API methods
8. **T2-8** (Recurring Rides) — new screen + 4 API methods (most complex)

Total: **3 new customer screens, 1 new driver screen, 1 new shared WebSocket service, ~15 new API methods, ~20 new data classes**.
