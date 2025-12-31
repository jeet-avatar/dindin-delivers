# Dollor.ai - 100 Comprehensive Test Cases

> **Platform**: iOS, Android, Web
> **Test Execution**: 10 iterations per test case
> **Total Tests**: 100 cases x 10 iterations = 1,000 test executions

---

## TEST SUITE A: AUTHENTICATION (20 Test Cases)

### Customer Authentication (TC-A01 to TC-A07)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-A01 | Customer registration with valid email/password | iOS, Android, Web | Account created, JWT token returned |
| TC-A02 | Customer registration with invalid email format | iOS, Android, Web | Error: Invalid email format |
| TC-A03 | Customer registration with weak password (<6 chars) | iOS, Android, Web | Error: Password too weak |
| TC-A04 | Customer login with valid credentials | iOS, Android, Web | JWT token returned, redirect to dashboard |
| TC-A05 | Customer login with wrong password | iOS, Android, Web | Error: Invalid credentials |
| TC-A06 | Customer Google OAuth login | iOS, Android, Web | Account created/linked, token returned |
| TC-A07 | Customer password reset flow | iOS, Android, Web | Reset email sent, password updated |

### Driver Authentication (TC-A08 to TC-A14)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-A08 | Driver registration with valid details | iOS, Android, Web | Account created, pending verification |
| TC-A09 | Driver registration with missing license | iOS, Android, Web | Warning: License required for activation |
| TC-A10 | Driver login with valid credentials | iOS, Android | JWT token returned, redirect to dashboard |
| TC-A11 | Driver login with unverified account | iOS, Android | Login allowed, restricted features |
| TC-A12 | Driver document upload (license) | iOS, Android, Web | Document stored, status: pending_review |
| TC-A13 | Driver document upload (insurance) | iOS, Android, Web | Document stored, status: pending_review |
| TC-A14 | Driver Google OAuth login | iOS, Android | Account linked, token returned |

### Restaurant/Vendor Authentication (TC-A15 to TC-A20)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-A15 | Restaurant registration via application form | Web | Application submitted, status: pending |
| TC-A16 | Restaurant login with approved account | iOS, Android, Web | JWT token, access to dashboard |
| TC-A17 | Restaurant login with pending account | Web | Login blocked, "pending approval" message |
| TC-A18 | Restaurant password reset | Web | Reset email sent |
| TC-A19 | Admin approve restaurant application | Web | Restaurant status: approved, email sent |
| TC-A20 | Admin reject restaurant application | Web | Restaurant status: rejected, email sent |

---

## TEST SUITE B: FOOD ORDER FLOW (25 Test Cases)

### Menu & Restaurant Discovery (TC-B01 to TC-B08)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-B01 | Browse restaurants list | iOS, Android, Web | List of restaurants with ratings displayed |
| TC-B02 | Filter restaurants by cuisine | iOS, Android, Web | Filtered results returned |
| TC-B03 | Search restaurant by name | iOS, Android, Web | Matching restaurants displayed |
| TC-B04 | View restaurant menu | iOS, Android, Web | Menu items with prices displayed |
| TC-B05 | View menu item details | iOS, Android, Web | Item description, price, options shown |
| TC-B06 | Sort restaurants by rating | iOS, Android, Web | Restaurants sorted highest to lowest |
| TC-B07 | Sort restaurants by distance | iOS, Android | Restaurants sorted by proximity |
| TC-B08 | View restaurant hours/availability | iOS, Android, Web | Operating hours displayed |

### Cart & Checkout (TC-B09 to TC-B17)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-B09 | Add item to cart | iOS, Android, Web | Item added, cart updated |
| TC-B10 | Add item with customizations | iOS, Android, Web | Customizations saved with item |
| TC-B11 | Update item quantity in cart | iOS, Android, Web | Quantity and total updated |
| TC-B12 | Remove item from cart | iOS, Android, Web | Item removed, total recalculated |
| TC-B13 | View cart summary | iOS, Android, Web | All items, subtotal, fees displayed |
| TC-B14 | Apply promo code (valid) | iOS, Android, Web | Discount applied to total |
| TC-B15 | Apply promo code (invalid/expired) | iOS, Android, Web | Error: Invalid promo code |
| TC-B16 | Add delivery address | iOS, Android, Web | Address saved and selected |
| TC-B17 | Calculate delivery fee | iOS, Android, Web | Fee calculated based on distance |

### Order Placement & Payment (TC-B18 to TC-B25)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-B18 | Place order with saved card | iOS, Android, Web | Order created, payment processed |
| TC-B19 | Place order with new card | iOS, Android, Web | Card saved, order created |
| TC-B20 | Payment failure handling | iOS, Android, Web | Error displayed, order not created |
| TC-B21 | Order confirmation displayed | iOS, Android, Web | Order ID, ETA, details shown |
| TC-B22 | Order sent to restaurant | iOS, Android | Restaurant receives notification |
| TC-B23 | Customer receives order confirmation email | All | Email with order details received |
| TC-B24 | Multi-restaurant order | iOS, Android, Web | Orders split per restaurant, $1 each |
| TC-B25 | Pickup order (no delivery fee) | iOS, Android, Web | Order created without delivery fee |

---

## TEST SUITE C: DRIVER OPERATIONS (20 Test Cases)

### Availability & Order Acceptance (TC-C01 to TC-C08)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-C01 | Driver goes online | iOS, Android | Status updated, receives orders |
| TC-C02 | Driver goes offline | iOS, Android | Status updated, no new orders |
| TC-C03 | Driver receives order notification | iOS, Android | Push notification with order details |
| TC-C04 | Driver accepts order | iOS, Android | Order assigned to driver |
| TC-C05 | Driver declines order | iOS, Android | Order returned to pool |
| TC-C06 | Order timeout (no response) | iOS, Android | Order auto-assigned to next driver |
| TC-C07 | View order details (pickup address) | iOS, Android | Restaurant address, items displayed |
| TC-C08 | View order details (delivery address) | iOS, Android | Customer address displayed |

### Delivery Execution (TC-C09 to TC-C16)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-C09 | Navigate to restaurant | iOS, Android | Maps opened with directions |
| TC-C10 | Mark arrived at restaurant | iOS, Android | Status updated, customer notified |
| TC-C11 | Mark order picked up | iOS, Android | Status updated, customer notified |
| TC-C12 | Navigate to customer | iOS, Android | Maps opened with directions |
| TC-C13 | Mark delivered | iOS, Android | Order completed, earnings updated |
| TC-C14 | Customer not available handling | iOS, Android | Timer starts, support contact option |
| TC-C15 | Contact customer (masked number) | iOS, Android | Call connected via Twilio |
| TC-C16 | Delivery photo upload | iOS, Android | Photo saved with delivery record |

### Earnings & History (TC-C17 to TC-C20)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-C17 | View today's earnings | iOS, Android | Earnings breakdown displayed |
| TC-C18 | View delivery history | iOS, Android | List of completed deliveries |
| TC-C19 | View weekly earnings summary | iOS, Android | Weekly total with daily breakdown |
| TC-C20 | Earnings cashout request | iOS, Android | Payout initiated (if eligible) |

---

## TEST SUITE D: RIDESHARE FLOW (15 Test Cases)

### Ride Request (TC-D01 to TC-D07)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-D01 | Enter pickup location | iOS, Android | Location validated, shown on map |
| TC-D02 | Enter destination | iOS, Android | Route calculated, fare estimated |
| TC-D03 | View fare estimate breakdown | iOS, Android | Base fare, distance, time, platform fee |
| TC-D04 | Request ride | iOS, Android | Request sent to nearby drivers |
| TC-D05 | Driver accepts ride | iOS, Android | Driver info shown, ETA displayed |
| TC-D06 | No drivers available | iOS, Android | "No drivers nearby" message |
| TC-D07 | Cancel ride before pickup | iOS, Android | Ride cancelled, no charge (if within time) |

### Ride Execution (TC-D08 to TC-D12)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-D08 | Track driver location to pickup | iOS, Android | Real-time driver location on map |
| TC-D09 | Driver arrives at pickup | iOS, Android | Push notification sent |
| TC-D10 | Ride started | iOS, Android | Meter starts, tracking begins |
| TC-D11 | Ride completed | iOS, Android | Fare finalized, payment processed |
| TC-D12 | Rate driver after ride | iOS, Android | Rating saved, affects driver score |

### Ride Payments (TC-D13 to TC-D15)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-D13 | Automatic payment on completion | iOS, Android | Card charged, receipt sent |
| TC-D14 | Add tip after ride | iOS, Android | Tip added to driver earnings |
| TC-D15 | View ride receipt | iOS, Android | Full breakdown: fare + platform fee + tip |

---

## TEST SUITE E: RESTAURANT OPERATIONS (10 Test Cases)

### Order Management (TC-E01 to TC-E07)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-E01 | View incoming orders | iOS, Android, Web | List of pending orders displayed |
| TC-E02 | Accept order | iOS, Android, Web | Order status: confirmed, customer notified |
| TC-E03 | Reject order (out of stock) | iOS, Android, Web | Order cancelled, customer refunded |
| TC-E04 | Mark order ready for pickup | iOS, Android, Web | Driver notified, status updated |
| TC-E05 | View order details | iOS, Android, Web | All items, special instructions shown |
| TC-E06 | Update prep time estimate | iOS, Android, Web | Customer/driver notified of new ETA |
| TC-E07 | View order history | iOS, Android, Web | Past orders with status displayed |

### Menu Management (TC-E08 to TC-E10)
| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-E08 | Add new menu item | Web | Item added to menu |
| TC-E09 | Update item price | Web | Price updated, reflects in app |
| TC-E10 | Mark item unavailable | Web | Item hidden from customer menu |

---

## TEST SUITE F: NOTIFICATIONS & REAL-TIME (5 Test Cases)

| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-F01 | Push notification delivery | iOS, Android | Notification received within 5 seconds |
| TC-F02 | Order status update notification | iOS, Android | Customer notified on each status change |
| TC-F03 | Email notification (order confirmation) | All | Email delivered within 1 minute |
| TC-F04 | Real-time location tracking | iOS, Android | Driver location updates every 5 seconds |
| TC-F05 | WebSocket connection stability | Web | Connection maintained during session |

---

## TEST SUITE G: ERROR HANDLING & EDGE CASES (5 Test Cases)

| ID | Test Case | Platform | Expected Result |
|----|-----------|----------|-----------------|
| TC-G01 | Network disconnection during order | iOS, Android | Order state preserved, retry on reconnect |
| TC-G02 | App backgrounded during delivery | iOS, Android | Location tracking continues |
| TC-G03 | Payment retry after failure | iOS, Android, Web | User can retry with same/different card |
| TC-G04 | Session expiry handling | All | User redirected to login, state preserved |
| TC-G05 | Concurrent order updates | All | Latest state always reflected |

---

## EXECUTION MATRIX

### Platform Coverage
| Platform | Test Cases | Iterations | Total Executions |
|----------|------------|------------|------------------|
| iOS Customer | 65 | 10 | 650 |
| iOS Driver | 45 | 10 | 450 |
| iOS Restaurant | 20 | 10 | 200 |
| Android Customer | 65 | 10 | 650 |
| Android Driver | 45 | 10 | 450 |
| Android Restaurant | 20 | 10 | 200 |
| Web Portal | 40 | 10 | 400 |
| **TOTAL** | **100 unique** | **10 each** | **3,000** |

### Test Execution Schedule
```
Phase 1: Authentication Tests (TC-A01 to TC-A20)
Phase 2: Food Order Flow Tests (TC-B01 to TC-B25)
Phase 3: Driver Operations Tests (TC-C01 to TC-C20)
Phase 4: Rideshare Flow Tests (TC-D01 to TC-D15)
Phase 5: Restaurant Operations Tests (TC-E01 to TC-E10)
Phase 6: Notifications & Real-Time Tests (TC-F01 to TC-F05)
Phase 7: Error Handling Tests (TC-G01 to TC-G05)
```

---

## API ENDPOINTS TO TEST

### Authentication Endpoints
```
POST /api/auth/customer/register
POST /api/auth/customer/login
POST /api/auth/customer/google
POST /api/auth/driver/register
POST /api/auth/driver/login
POST /api/auth/driver/google
POST /api/auth/vendor/register
POST /api/auth/vendor/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Order Endpoints
```
GET  /api/restaurants
GET  /api/restaurants/{id}
GET  /api/restaurants/{id}/menu
POST /api/orders
GET  /api/orders/{id}
PUT  /api/orders/{id}/status
POST /api/orders/{id}/cancel
```

### Driver Endpoints
```
PUT  /api/drivers/{id}/status
GET  /api/drivers/{id}/orders
PUT  /api/drivers/{id}/location
GET  /api/drivers/{id}/earnings
```

### Ride Endpoints
```
POST /api/rides/estimate
POST /api/rides
GET  /api/rides/{id}
PUT  /api/rides/{id}/status
POST /api/rides/{id}/rate
```

---

*Generated: December 2025*
*Platform: Dollor.ai*
*Version: 1.0*
