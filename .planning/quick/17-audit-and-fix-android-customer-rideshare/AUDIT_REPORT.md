# Android Customer Rideshare API Audit Report

**Date:** 2026-02-23
**Auditor:** Claude Opus 4.6
**Backend Source of Truth:** bid_routes.py (prefix `/api/rides`), main_new.py, rideshare_payments.py (prefix `/api/payments/ride`)

---

## CustomerRideshareApiService.kt (OkHttp Layer)

| # | Method | Android Path | Backend Route | Status | Notes |
|---|--------|-------------|---------------|--------|-------|
| 1 | `createRideRequest` | POST `/api/rides/request` | bid_routes.py:300 `@router.post("/request")` | MATCH | Fields match `CreateRideRequestInput`: pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, customer_id, pickup_address, dropoff_address, ride_type, bidding_duration_minutes, customer_preferred_price, special_requests. Auth included. |
| 2 | `getMyRideRequests` | GET `/api/rides/customer/{id}/requests` | bid_routes.py:474 `@router.get("/customer/{customer_id}/requests")` | MATCH | Wrapper `RideRequestsWrapper` correct for `{"success": true, "requests": [...]}`. Auth included. |
| 3 | `getBidsForRide` | GET `/api/rides/request/{id}/bids` | bid_routes.py:503 `@router.get("/request/{request_id}/bids")` | MATCH | Wrapper `BidsResponseWrapper` correct for `{"bids": [...], "total_bids": N, "bidding_open": true}`. Auth included. |
| 4 | `acceptBid` | POST `/api/rides/bid/{id}/respond` body:`{"action":"accept"}` | bid_routes.py:534 `@router.post("/bid/{bid_id}/respond")` | MATCH | Action matches `RespondToBidInput`. Auth included. |
| 5 | `rejectBid` | POST `/api/rides/bid/{id}/respond` body:`{"action":"reject"}` | bid_routes.py:534 (same) | MATCH | Auth included. |
| 6 | `counterBid` | POST `/api/rides/bid/{id}/respond` body:`{"action":"counter","counter_price":X}` | bid_routes.py:534 (same) | MATCH | Auth included. |
| 7 | `customerSubmitFareOffer` | POST `/api/erp/rides/{id}/customer-negotiate?proposed_fare=X` | main_new.py:14723 | MATCH | Query param `proposed_fare` matches `Query(default=0.0)`. Auth included. |
| 8 | `customerAcceptDriverFare` | POST `/api/erp/rides/{id}/customer-accept-fare?accepted_fare=X` | main_new.py:14764 | MATCH | Query param `accepted_fare` matches `Query(default=0.0)`. Auth included. |
| 9 | `getRideNegotiationStatus` | GET `/api/erp/rides/{id}/negotiation-status` | main_new.py:14792 | MATCH | Auth included. |
| 10 | `cancelRideRequest` | POST `/api/rides/request/{id}/cancel` | bid_routes.py:881 `@router.post("/request/{request_id}/cancel")` | MATCH | Auth included. |
| 11 | `trackRide` | GET `/api/rides/{id}/track` | main_new.py:15168 `@app.get("/api/rides/{ride_id}/track")` | MATCH | Auth included. |
| 12 | `fetchChatMessages` | GET `/api/p2p/ride-requests/{id}/chat` | main_new.py:15847 / 21049 | MATCH | Wrapper `ChatMessagesWrapper` correct. Auth included. |
| 13 | `sendChatMessage` | POST `/api/p2p/ride-requests/{id}/chat` | main_new.py:15877 / 21050 | MATCH | Body `{"message":..., "sender_type":"customer"}` matches. Auth included. |
| 14 | `submitRideRating` | POST `/api/rides/{id}/rate` | main_new.py:15529 | MATCH | Body `{"rating": N, "comment": "..."}` matches `RideRatingRequest`. Auth included. |
| 15 | `submitRideTip` | POST `/api/rides/{id}/tip` | main_new.py:15597 | MATCH | Body `{"tip_amount": X}` matches `RideTipRequest`. Auth included. |
| 16 | `createRidePaymentIntent` | POST `/api/payments/ride/create-intent` | rideshare_payments.py:65 | MATCH | Body `{"ride_request_id": N}` matches. Auth included. |
| 17 | `getRideReceipt` | GET `/api/rides/request/{id}/receipt` | bid_routes.py:2310 `@router.get("/request/{request_id}/receipt")` | MATCH | Auth included. |
| 18 | `emailRideReceipt` | POST `/api/rides/request/{id}/email-receipt` | bid_routes.py:2378 `@router.post("/request/{request_id}/email-receipt")` | MATCH | Auth included. |
| 19 | `createDispute` | POST `/api/rides/dispute` | bid_routes.py:2534 `@router.post("/dispute")` | MATCH | Body matches. Auth included. |
| 20 | `getMyDisputes` | GET `/api/rides/customer/{id}/disputes` | bid_routes.py:2626 `@router.get("/customer/{customer_id}/disputes")` | MATCH | Auth included. |
| 21 | `createRecurringRide` | POST `/api/rides/customer/{id}/recurring-rides` | bid_routes.py:2784 `@router.post("/customer/{customer_id}/recurring-rides")` | MATCH | Auth included. |
| 22 | `getRecurringRides` | GET `/api/rides/customer/{id}/recurring-rides` | bid_routes.py:2853 `@router.get("/customer/{customer_id}/recurring-rides")` | MATCH | Auth included. |
| 23 | `deleteRecurringRide` | DELETE `/api/rides/recurring-rides/{id}` | bid_routes.py:2916 `@router.delete("/recurring-rides/{ride_id}")` | MATCH | Auth included. |
| 24 | `getFareEstimate` | POST `/api/rides/estimate` | main_new.py:19320 (Android) / bid_routes.py:2092 (authenticated) | MATCH | Body `{pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude}` matches. No auth (public). |

**OkHttp Summary: 24/24 MATCH. All endpoints verified against backend.**

---

## DollorApiService.kt (Retrofit Layer)

| # | Method | Retrofit Path (prefixed by baseUrl `/api/`) | Backend Route | Status | Notes |
|---|--------|----------------------------------------------|---------------|--------|-------|
| 1 | `requestRide` | POST `rides/request` | bid_routes.py:300 | **MISMATCH** | `RideRequest` model sends `pickup_lat`/`pickup_lng`/`dropoff_lat`/`dropoff_lng` but backend expects `pickup_latitude`/`pickup_longitude`/`dropoff_latitude`/`dropoff_longitude`. |
| 2 | `getCustomerRides` | GET `customer/rides/history` | main_new.py:6537 | MATCH | Auth included. |
| 3 | `trackRide` | GET `rides/{rideId}/track` | main_new.py:15168 | **MISMATCH** | `RideTrackingResponse` model has `ride_id`, `eta` fields, but backend returns `ride_request_id`, `eta_minutes`, `driver_location.latitude`/`.longitude` (not `lat`/`lng`). `DriverLocation` model uses `lat`/`lng` but backend returns `latitude`/`longitude`. |
| 4 | `cancelRide` | POST `rides/request/{rideId}/cancel` | bid_routes.py:881 | MATCH | Auth included. |
| 5 | `rateRide` | POST `rides/{rideId}/rate` | main_new.py:15529 | MATCH | `RateRideRequest` matches. Auth included. |
| 6 | `estimateRideFare` | POST `rides/estimate` | main_new.py:19320 | **MISMATCH** | `RideEstimateRequest` sends correct field names (`pickup_latitude` via `@SerializedName`), but `RideEstimateResponse` expects `distance_miles`, `estimated_fare`, `estimated_time`, `breakdown.base`/`breakdown.distance`/`breakdown.platform_fee`. Backend at main_new.py:19360 returns `fare_estimate`, `total_fare`, `distance_miles`, `duration_minutes`, `base_fare`, `distance_fee`, `time_fee` (flat, not wrapped). |
| 7 | `customerSubmitFareOffer` | POST `erp/rides/{rideId}/customer-negotiate` | main_new.py:14723 | **MISMATCH** | Sends `@Body CustomerFareOfferRequest` with `offered_fare`, but backend expects `proposed_fare` as `Query()` param (not body). |
| 8 | `customerAcceptDriverFare` | POST `erp/rides/{rideId}/customer-accept-fare` | main_new.py:14764 | **MISMATCH** | No way to pass `accepted_fare` -- backend expects it as `Query()` param. Currently sends empty POST. |

### DollorApiService Model Issues

| Model | Status | Issue |
|-------|--------|-------|
| `RideRequest` (ApiModels.kt:677) | **MISMATCH** | `pickup_lat`/`pickup_lng`/`dropoff_lat`/`dropoff_lng` -- backend expects `pickup_latitude`/`pickup_longitude`/`dropoff_latitude`/`dropoff_longitude` |
| `RideResponse` (ApiModels.kt:687) | **MISMATCH** | Has `ride_id`, `status`, `estimated_fare`, `estimated_time`, `distance_miles` -- backend returns `{"success": true, "message": "...", "ride_request_id": N, "ride_request": {...}}` |
| `RideTrackingResponse` (ApiModels.kt:723) | **MISMATCH** | Has `ride_id`, `eta` -- backend returns `ride_request_id`, `eta_minutes`, `status`, `driver` (nested), `driver_location` (nested with `latitude`/`longitude`) |
| `DriverLocation` (ApiModels.kt:731) | **MISMATCH** | Uses `lat`/`lng` -- backend returns `latitude`/`longitude` |
| `RideEstimateResponse` (ApiModels.kt:773) | **MISMATCH** | Expects wrapped response with `distance_miles`, `estimated_fare`, `estimated_time`, `breakdown` -- but main_new.py:19320 returns flat `fare_estimate`, `total_fare`, etc. |
| `FareBreakdown` (ApiModels.kt:780) | **MISMATCH** | Has `base`, `distance`, `platform_fee` -- neither backend response uses these exact field names. bid_routes returns `base_fare`, `distance_cost`, `time_cost`; main_new returns `base_fare`, `distance_fee`, `time_fee`. |
| `FareNegotiationResponse` (ApiModels.kt:1641) | **MISMATCH** | Has `ride_id`, `negotiation_status`, `current_fare`, `platform_suggested_fare`, `is_accepted` -- backend returns `success`, `status`, `customer_offer`, `driver_offer`, `platform_fee_driver`, `platform_fee_customer`, `message`. No `ride_id`, `negotiation_status`, `platform_suggested_fare`, `is_accepted` in backend response. |
| `CustomerFareOfferRequest` (ApiModels.kt:1632) | **MISMATCH** | Has `offered_fare` -- backend expects `proposed_fare` as Query param (not body field). Model unused after fix. |

**Retrofit Summary: 3/8 MATCH, 5/8 MISMATCH. 7 model mismatches found.**

---

## Summary

| Layer | Total APIs | Match | Mismatch | Missing |
|-------|-----------|-------|----------|---------|
| OkHttp (CustomerRideshareApiService) | 24 | 24 | 0 | 0 |
| Retrofit (DollorApiService) | 8 | 3 | 5 | 0 |
| Models (ApiModels.kt) | 7 checked | 0 | 7 | 0 |
| **Total** | **32+7** | **27** | **12** | **0** |

---

## Fixes Required

1. **RideRequest model** -- Change `pickup_lat`/`pickup_lng`/`dropoff_lat`/`dropoff_lng` to `pickup_latitude`/`pickup_longitude`/`dropoff_latitude`/`dropoff_longitude`
2. **RideResponse model** -- Change to match backend `{"success", "message", "ride_request_id", "ride_request"}`
3. **RideTrackingResponse model** -- Change `ride_id` to `ride_request_id`, `eta` to `eta_minutes`, add `driver_location`, `pickup`, `dropoff`, `final_price`
4. **DriverLocation model** -- Change `lat`/`lng` to `latitude`/`longitude`
5. **RideEstimateResponse model** -- Change to match main_new.py:19360 flat response: `fare_estimate`, `distance_miles`, `duration_minutes`, etc.
6. **FareBreakdown model** -- Change field names to match backend (`base_fare`, `distance_fee`/`distance_cost`, `time_fee`/`time_cost`)
7. **FareNegotiationResponse model** -- Remove `ride_id`, `negotiation_status`, `platform_suggested_fare`, `is_accepted`; add `success`, `status`, `customer_offer`, `driver_offer`, `platform_fee_driver`, `platform_fee_customer`, `message`
8. **customerSubmitFareOffer** -- Change from `@Body` to `@Query("proposed_fare")`
9. **customerAcceptDriverFare** -- Add `@Query("accepted_fare")` parameter
10. **CustomerFareOfferRequest model** -- Deprecate (no longer used after #8)
11. **DollorRepository.requestRide** -- Update to use new field names
12. **DollorRepository.estimateRideFare** -- Update to handle new response shape
