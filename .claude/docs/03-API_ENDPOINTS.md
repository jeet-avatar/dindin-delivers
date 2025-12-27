# Dollor.ai API Reference

---

## Environments

| Environment | URL |
|-------------|-----|
| **Staging** | `https://d3kuu45w6kl8hr.cloudfront.net` |
| **Production** | `https://api.dollor.ai` |

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | demo@dollor.ai | demo123 |
| Driver | demodriver@dollor.ai | demo123 |
| Vendor | demobusiness@dollor.ai | demo123 |

---

## Customer Endpoints

### Authentication
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/auth/customer/login` | POST | No |
| `/api/customer/login` | POST | No |
| `/api/auth/customer/register` | POST | No |
| `/api/auth/customer/google` | POST | No |
| `/api/auth/customer/apple-auth` | POST | No |
| `/api/auth/customer/me` | GET | Yes |

### Restaurants
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/vendors/published` | GET | No |
| `/api/vendors/{id}/menu` | GET | No |
| `/api/vendors/nearby` | GET | No |

### Orders
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/orders/create` | POST | Yes |
| `/api/customer/orders` | GET | Yes |
| `/api/customer/orders/{id}/track` | GET | Yes |
| `/api/orders/{id}/cancel` | POST | Yes |

### Rideshare
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/rides/estimate` | POST | Yes |
| `/api/rides/request` | POST | Yes |
| `/api/rides/{id}/cancel` | POST | Yes |
| `/api/rides/{id}/track` | GET | Yes |

### Addresses
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/addresses/{customer_id}` | GET | Yes |
| `/api/addresses` | POST | Yes |
| `/api/addresses/{id}` | DELETE | Yes |

---

## Driver Endpoints

### Authentication
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/auth/driver/login` | POST | No |
| `/api/driver/login` | POST | No |
| `/api/auth/driver/register` | POST | No |
| `/api/auth/driver/google` | POST | No |

### Profile
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/drivers/{id}` | GET/PUT | Yes |
| `/api/drivers/{id}/location` | PUT | Yes |
| `/api/drivers/{id}/documents` | POST | Yes |

### Orders/Rides
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/driver/orders/available` | GET | Yes |
| `/api/driver/orders/{id}/accept` | POST | Yes |
| `/api/driver/orders/{id}/delivered` | POST | Yes |
| `/api/driver/rides/available` | GET | Yes |

---

## Vendor Endpoints

### Authentication
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/auth/vendor/login` | POST | No |
| `/api/vendor/login` | POST | No |
| `/api/auth/vendor/register` | POST | No |

### Restaurant
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/restaurants/{id}` | GET/PUT | Yes |
| `/api/restaurants/{id}/menu` | GET | Yes |
| `/api/restaurants/{id}/menu/items` | POST | Yes |

### Orders
| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/vendor/orders` | GET | Yes |
| `/api/vendor/orders/{id}/accept` | POST | Yes |
| `/api/vendor/orders/{id}/ready` | POST | Yes |

---

## Payment Endpoints

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/payments/methods` | GET | Yes |
| `/api/payments/intent` | POST | Yes |
| `/api/stripe/setup-intent` | POST | Yes |

---

## WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/ws/order/{order_id}` | Order tracking |
| `/ws/ride/{ride_id}` | Ride tracking |
| `/ws/chat/{conversation_id}` | Real-time chat |

---

## Legal

| Endpoint | Method |
|----------|--------|
| `/api/legal/terms` | GET |
| `/api/legal/privacy` | GET |
