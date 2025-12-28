# Customer App API Endpoints

> **Source:** `eatfair-android/shared/src/main/java/com/eatfair/shared/data/remote/DollorApiService.kt`
> **Verified:** December 26, 2025

---

## Authentication Endpoints

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `auth/customer/login` | No | `username`, `password` (FormUrlEncoded) | `CustomerLoginResponse` |
| POST | `auth/customer/register` | No | `CustomerRegisterRequest` | `CustomerLoginResponse` |
| POST | `auth/customer/google` | No | `GoogleAuthRequest` | `CustomerLoginResponse` |
| POST | `auth/customer/apple-auth` | No | `AppleAuthRequest` | `CustomerLoginResponse` |
| POST | `customer/demo-login` | No | `DemoLoginRequest` | `CustomerLoginResponse` |
| DELETE | `customers/{customerId}/delete` | Yes | - | `GenericResponse` |

### Password Reset
| Method | Endpoint | Request |
|--------|----------|---------|
| POST | `customer/password-reset/request` | `ForgotPasswordRequest` |
| POST | `customer/password-reset/confirm` | `ResetPasswordWithCodeRequest` |

---

## Restaurant Endpoints

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `vendors/published` | No | `RestaurantsListResponse` |
| GET | `public/restaurants/{id}` | No | `RestaurantDetail` |

### Query Parameters for `vendors/published`
- `platform`: String (default: "android")
- `city`: String (optional)
- `cuisine`: String (optional)

---

## Order Endpoints

| Method | Endpoint | Auth | Request/Response |
|--------|----------|------|------------------|
| GET | `customer/orders` | Yes | `List<Order>` |
| GET | `customer/{customerId}/active-orders` | Yes | `ActiveOrdersResponse` |
| GET | `customer/orders/{orderId}/track` | Yes | `OrderTrackingResponse` |
| POST | `orders/create` | Yes | `CreateOrderRequest` → `CreateOrderResponse` |
| POST | `orders/{orderId}/cancel` | Yes | `CancelOrderRequest` → `GenericResponse` |
| POST | `orders/{orderId}/tip-driver` | Yes | `TipRequest` → `GenericResponse` |
| POST | `customer/orders/{orderId}/rate-driver` | Yes | `DriverRatingRequest` |
| GET | `orders/{orderId}/refund-status` | Yes | `RefundStatusResponse` |
| GET | `orders/{orderId}/modification` | Yes | `OrderModificationResponse` |
| POST | `orders/{orderId}/modification/respond` | Yes | `OrderModificationResponseRequest` |

---

## Address Endpoints

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `addresses/{customerId}` | Yes | `List<Address>` |
| GET | `addresses/{customerId}/default` | Yes | `Address` |
| POST | `addresses/{customerId}` | Yes | `Address` |
| PUT | `addresses/{customerId}/{addressId}` | Yes | `Address` |
| DELETE | `addresses/{customerId}/{addressId}` | Yes | `GenericResponse` |
| POST | `addresses/{customerId}/{addressId}/set-default` | Yes | `Address` |

---

## Favorites Endpoints

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `customer/favorites/{customerId}` | Yes | `List<Restaurant>` |
| POST | `customer/favorites/{customerId}/{vendorId}` | Yes | `GenericResponse` |
| DELETE | `customer/favorites/{customerId}/{vendorId}` | Yes | `GenericResponse` |
| GET | `customer/favorites/{customerId}/check/{vendorId}` | Yes | `FavoriteCheckResponse` |

---

## Rideshare Endpoints

| Method | Endpoint | Auth | Request/Response |
|--------|----------|------|------------------|
| POST | `rides/request` | Yes | `RideRequest` → `RideResponse` |
| GET | `customer/rides` | Yes | `CustomerRidesResponse` |
| GET | `rides/{rideId}/track` | Yes | `RideTrackingResponse` |
| POST | `rides/{rideId}/cancel` | Yes | `CancelRideRequest` |
| POST | `rides/{rideId}/rate` | Yes | `RateRideRequest` |
| POST | `rides/estimate` | No | `RideEstimateRequest` → `RideEstimateResponse` |
| POST | `erp/rides/{rideId}/customer-negotiate` | Yes | `CustomerFareOfferRequest` |
| POST | `erp/rides/{rideId}/customer-accept-fare` | Yes | `FareNegotiationResponse` |

---

## Payment Card Endpoints

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `customers/{customerId}/cards` | Yes | `SavedCardsResponse` |
| POST | `customers/{customerId}/cards` | Yes | `PaymentCard` |
| DELETE | `customers/{customerId}/cards/{cardId}` | Yes | `GenericResponse` |
| POST | `customers/{customerId}/cards/{cardId}/default` | Yes | `PaymentCard` |

---

## Promotions Endpoints

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `promotions/active` | No | Promotions list |

---

## Chat Endpoints

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `customer/orders/{orderId}/chat` | Yes |
| GET | `customer/orders/{orderId}/chat` | Yes |

---

*Last Updated: December 26, 2025*
