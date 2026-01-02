# API Reference - Staging

## Base URL
```
https://d3kuu45w6kl8hr.cloudfront.net
```

## Authentication
- All authenticated endpoints require: `Authorization: Bearer <jwt_token>`
- Token refresh handled by `TokenRefreshInterceptor.kt`

## Endpoints

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/api/health` | No | API health with DB status |

### Customers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/customers/register` | No | Register new customer |
| POST | `/api/customers/login` | No | Login, returns JWT |
| GET | `/api/customers/profile` | Yes | Get customer profile |
| PUT | `/api/customers/profile` | Yes | Update profile |
| POST | `/api/customers/google-login` | No | Google OAuth login |

### Vendors/Restaurants
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vendors` | Yes | List all vendors |
| GET | `/api/vendors/{id}` | Yes | Get vendor details |
| GET | `/api/vendors/{id}/menu` | Yes | Get vendor menu |
| GET | `/api/vendors/nearby` | Yes | Nearby vendors |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | Yes | Create order |
| GET | `/api/orders` | Yes | List user orders |
| GET | `/api/orders/{id}` | Yes | Get order details |
| PUT | `/api/orders/{id}/status` | Yes | Update order status |
| POST | `/api/orders/{id}/cancel` | Yes | Cancel order |

### Drivers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/drivers/register` | No | Register driver |
| POST | `/api/drivers/login` | No | Driver login |
| GET | `/api/drivers/profile` | Yes | Driver profile |
| PUT | `/api/drivers/location` | Yes | Update location |
| GET | `/api/drivers/orders` | Yes | Available orders |
| POST | `/api/drivers/orders/{id}/accept` | Yes | Accept order |

### Rideshare
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/rideshare/request` | Yes | Request ride |
| POST | `/api/rideshare/estimate` | No | Get fare estimate (params: pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, state_code) |
| PUT | `/api/rideshare/{id}/status` | Yes | Update ride status |
| GET | `/api/rideshare/rides` | Yes | Get user's ride history |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | Get user notifications |
| PUT | `/api/notifications/{id}/read` | Yes | Mark notification as read |
| DELETE | `/api/notifications` | Yes | Clear all notifications |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/create-intent` | Yes | Create Stripe PaymentIntent |
| GET | `/api/payments/methods` | Yes | List payment methods |

## Database Schema (Key Tables)
```
customers: id, email, name, phone, firebase_uid, created_at
vendors: id, name, address, latitude, longitude, cuisine_type, rating
menu_items: id, vendor_id, name, price, description, category
orders: id, customer_id, vendor_id, driver_id, status, total, created_at
drivers: id, email, name, phone, password_hash, vehicle_type, is_online
```

## Status Enums
```kotlin
OrderStatus: PENDING, CONFIRMED, PREPARING, READY, PICKED_UP, DELIVERED, CANCELLED
DriverStatus: OFFLINE, ONLINE, ON_DELIVERY
```
