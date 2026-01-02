# Shared Module Reference

## Location: `/shared/src/main/java/com/eatfair/shared/`

## ALWAYS Check Here First Before Creating New Code

### Models (`model/`)
| File | Purpose | Used By |
|------|---------|---------|
| `order/OrderDto.kt` | Order data transfer | All apps |
| `order/OrderEntity.kt` | Order database entity | All apps |
| `order/OrderModification.kt` | Order changes | Customer, Partner |
| `order/MultiRestaurantOrder.kt` | Multi-vendor orders | Customer |
| `restaurant/Restaurant.kt` | Restaurant model | Customer, Partner |
| `restaurant/MenuItem.kt` | Menu items | Customer, Partner |
| `restaurant/CartItem.kt` | Cart items | Customer |
| `driver/Driver.kt` | Driver model | Driver, Customer |
| `driver/DriverSession.kt` | Driver session | Driver |
| `driver/DriverEarnings.kt` | Earnings data | Driver |
| `payment/PaymentSheetKeys.kt` | Stripe keys | Customer |
| `ApiModels.kt` | Common API responses | All apps |

### Config (`config/`)
| File | Purpose |
|------|---------|
| `AppConfig.kt` | Environment config, API URLs, pricing |

### Auth (`auth/`)
| File | Purpose |
|------|---------|
| `GoogleSignInHelper.kt` | Google Sign-In flow |

### Network (`network/`)
| File | Purpose |
|------|---------|
| `TokenRefreshInterceptor.kt` | JWT token refresh |

### UI (`ui/`)
| File | Purpose |
|------|---------|
| `LegalAcceptanceScreen.kt` | Terms/Privacy acceptance |

### DI (`di/`)
| File | Purpose |
|------|---------|
| `SharedModule.kt` | Hilt dependency injection |

### Utils (`util/`)
| File | Purpose |
|------|---------|
| `OrderNumberFormatter.kt` | Format order numbers |

### Constants (`constants/`)
| File | Purpose |
|------|---------|
| `EnumConst.kt` | Shared enums |

## Adding New Shared Code
1. Create in appropriate subfolder
2. Use `api()` in shared/build.gradle.kts for exposure
3. Document in this file
