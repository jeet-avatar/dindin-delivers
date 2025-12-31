# Dollor.ai Feature Comparison: iOS vs Android

## App Naming Convention
- **App Name**: Dollor.ai (or "Dollor - $1 Delivery")
- **Brand Color**: Green (#4CAF50 / Theme.brandGreen)
- **Backend**: api.dollor.ai (P2P API)

---

# 1. CUSTOMER APP - Feature List

## 1.1 Authentication Flow
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Email/Password Login | ✅ | ⬜ | POST /api/customer/login |
| Email/Password Register | ✅ | ⬜ | POST /api/customer/register |
| Google Sign-In | ✅ | ⬜ | POST /api/customer/google-auth |
| Apple Sign-In | ✅ | ⬜ | POST /api/customer/apple-auth |
| Forgot Password | ✅ | ⬜ | POST /api/customer/forgot-password |
| Reset Password | ✅ | ⬜ | POST /api/customer/reset-password |
| Logout | ✅ | ⬜ | Local (clear tokens) |
| Delete Account | ✅ | ⬜ | DELETE /api/customer/{id} |

## 1.2 Main Navigation (5 Tabs)
| Tab | iOS | Android | Description |
|-----|-----|---------|-------------|
| Home | ✅ | ⬜ | Restaurant feed, deals, categories |
| Search | ✅ | ⬜ | Search restaurants/dishes |
| Deals | ✅ | ⬜ | Featured promotions |
| Orders | ✅ | ⬜ | Order history |
| Profile | ✅ | ⬜ | User settings |

## 1.3 Home Screen Features
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Delivery Address Selector | ✅ | ⬜ | GET /api/addresses/{user_id} |
| Address Dropdown/Change | ✅ | ⬜ | - |
| Notification Bell (with badge) | ✅ | ⬜ | - |
| Profile Icon Link | ✅ | ⬜ | - |
| Search Bar | ✅ | ⬜ | - |
| Voice Search Button | ✅ | ⬜ | iOS Speech Recognition |
| Service Selection (Food/Ride) | ✅ | ⬜ | - |
| Category Chips (horizontal scroll) | ✅ | ⬜ | Dynamic from restaurants |
| AI Recommendation Banner | ✅ | ⬜ | - |
| Featured Deals Section | ✅ | ⬜ | GET /api/promotions/featured |
| Multi-Restaurant Promo Banner | ✅ | ⬜ | - |
| Featured Restaurants (horizontal) | ✅ | ⬜ | GET /api/public/restaurants |
| All Restaurants List | ✅ | ⬜ | GET /api/public/restaurants |
| Sort Options (Recommended/Rating/Fastest/Nearest) | ✅ | ⬜ | - |
| Active Order Tracker (floating) | ✅ | ⬜ | GET /api/orders/customer/{id}/active |
| Pull to Refresh | ✅ | ⬜ | - |

## 1.4 Restaurant Detail Screen
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Restaurant Header Image | ✅ | ⬜ | - |
| Back Button | ✅ | ⬜ | - |
| Menu Search Button | ✅ | ⬜ | - |
| Restaurant Name & Info | ✅ | ⬜ | GET /api/public/restaurants/{id} |
| Rating Display | ✅ | ⬜ | - |
| Delivery Time | ✅ | ⬜ | - |
| Address with Map Link | ✅ | ⬜ | - |
| Phone Number | ✅ | ⬜ | - |
| Active Promotions Section | ✅ | ⬜ | GET /api/promotions/vendor/{id} |
| Menu Categories (tabs/sections) | ✅ | ⬜ | - |
| Menu Items List | ✅ | ⬜ | GET /api/vendors/{id}/menu |
| Menu Item Card (name, desc, price, image) | ✅ | ⬜ | - |
| ADD Button | ✅ | ⬜ | - |
| Item Customization Sheet | ✅ | ⬜ | - |
| Floating Cart Button | ✅ | ⬜ | - |

## 1.5 Menu Item Customization
| Feature | iOS | Android | Backend |
|---------|-----|---------|---------|
| Item Image | ✅ | ⬜ | - |
| Item Name & Description | ✅ | ⬜ | - |
| Base Price | ✅ | ⬜ | - |
| Quantity Selector (+/-) | ✅ | ⬜ | - |
| Special Instructions | ✅ | ⬜ | - |
| Spice Level Selection | ✅ | ⬜ | - |
| Add-ons/Modifiers | ✅ | ⬜ | - |
| Add to Cart Button | ✅ | ⬜ | - |

## 1.6 Cart & Checkout
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Multi-Restaurant Cart | ✅ | ⬜ | - |
| Cart Items by Restaurant | ✅ | ⬜ | - |
| Quantity Adjustment | ✅ | ⬜ | - |
| Swipe to Delete | ✅ | ⬜ | - |
| Delivery Address Section | ✅ | ⬜ | - |
| Map Preview | ✅ | ⬜ | - |
| Change Address Button | ✅ | ⬜ | - |
| Delivery Instructions | ✅ | ⬜ | - |
| Payment Method Selection | ✅ | ⬜ | - |
| - Cash on Delivery | ✅ | ⬜ | - |
| - Credit/Debit Card | ✅ | ⬜ | Stripe |
| - Bank Account (ACH) | ✅ | ⬜ | Stripe |
| - Apple Pay | ✅ | ⬜ | Apple Pay |
| Promo Code Input | ✅ | ⬜ | POST /api/promotions/validate |
| Apply Promo Button | ✅ | ⬜ | - |
| **Fee Breakdown (Transparent)** | ✅ | ⬜ | - |
| - Food Items Total | ✅ | ⬜ | - |
| - Delivery Fee (Base + Distance) | ✅ | ⬜ | - |
| - Taxes (State, City, District) | ✅ | ⬜ | - |
| - Platform Fee ($1-$3 tiered) | ✅ | ⬜ | - |
| - Payment Processing Fee | ✅ | ⬜ | - |
| - Small Order Fee | ✅ | ⬜ | - |
| - Discounts Applied | ✅ | ⬜ | - |
| Driver Tip Selection ($0/$2/$3/$5) | ✅ | ⬜ | - |
| Custom Tip Input | ✅ | ⬜ | - |
| Money Flow Summary | ✅ | ⬜ | - |
| Fee Transparency Detail Sheet | ✅ | ⬜ | - |
| Place Order Button | ✅ | ⬜ | POST /api/orders/create |

## 1.7 Order Flow
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Order Success Screen | ✅ | ⬜ | - |
| Confetti Animation | ✅ | ⬜ | - |
| Order Confirmation Details | ✅ | ⬜ | - |
| Estimated Delivery Time | ✅ | ⬜ | - |
| Track Order Button | ✅ | ⬜ | - |
| Order Tracking Screen | ✅ | ⬜ | GET /api/orders/{id} |
| Live Map with Driver | ✅ | ⬜ | WebSocket |
| Order Status Timeline | ✅ | ⬜ | - |
| Driver Info Card | ✅ | ⬜ | - |
| Call Driver Button | ✅ | ⬜ | - |
| Chat with Driver | ✅ | ⬜ | - |
| Rate Driver Screen | ✅ | ⬜ | POST /api/orders/{id}/rate |
| Tip Driver Screen | ✅ | ⬜ | POST /api/orders/{id}/tip |

## 1.8 Order History
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Orders List | ✅ | ⬜ | GET /api/orders/customer/{id} |
| Order Card (restaurant, items, total, date) | ✅ | ⬜ | - |
| Order Status Badge | ✅ | ⬜ | - |
| Reorder Button | ✅ | ⬜ | - |
| Order Details Screen | ✅ | ⬜ | GET /api/orders/{id} |
| Receipt/Invoice View | ✅ | ⬜ | - |

## 1.9 Search Screen
| Feature | iOS | Android | Backend |
|---------|-----|---------|---------|
| Search Input | ✅ | ⬜ | - |
| Clear Button | ✅ | ⬜ | - |
| Cuisine Filter Chips | ✅ | ⬜ | - |
| Sort Dropdown | ✅ | ⬜ | - |
| Search Results List | ✅ | ⬜ | - |
| Recent Searches | ✅ | ⬜ | - |
| Popular Searches | ✅ | ⬜ | - |

## 1.10 Deals Screen
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Featured Deals Banner | ✅ | ⬜ | GET /api/promotions/featured |
| Deal Cards | ✅ | ⬜ | - |
| Deal Type Icons | ✅ | ⬜ | - |
| Promo Code Display | ✅ | ⬜ | - |
| Min Order Amount | ✅ | ⬜ | - |
| Expiry Date | ✅ | ⬜ | - |
| Apply Deal Button | ✅ | ⬜ | - |

## 1.11 Profile Screen
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Profile Header (name, email) | ✅ | ⬜ | UserDefaults |
| Edit Profile | ✅ | ⬜ | PUT /api/customer/{id} |
| Saved Addresses | ✅ | ⬜ | GET /api/addresses/{user_id} |
| Add New Address | ✅ | ⬜ | POST /api/addresses/{user_id} |
| Edit Address | ✅ | ⬜ | PUT /api/addresses/{user_id}/{addr_id} |
| Delete Address | ✅ | ⬜ | DELETE /api/addresses/{user_id}/{addr_id} |
| Set Default Address | ✅ | ⬜ | PUT /api/addresses/{user_id}/{addr_id}/default |
| Payment Methods | ✅ | ⬜ | GET /api/stripe/cards/{user_id} |
| Add Card | ✅ | ⬜ | POST /api/stripe/card |
| Delete Card | ✅ | ⬜ | DELETE /api/stripe/card/{card_id} |
| Favorites | ✅ | ⬜ | Local storage |
| Notifications Settings | ✅ | ⬜ | - |
| Privacy Policy | ✅ | ⬜ | WebView |
| Terms & Conditions | ✅ | ⬜ | WebView |
| Help/Support | ✅ | ⬜ | - |
| Logout | ✅ | ⬜ | - |
| Delete Account | ✅ | ⬜ | DELETE /api/customer/{id} |

## 1.12 Address Management
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Address List | ✅ | ⬜ | GET /api/addresses/{user_id} |
| Add Address Screen | ✅ | ⬜ | - |
| Address Search (Google Places) | ✅ | ⬜ | Google Places API |
| Map Pin Selection | ✅ | ⬜ | - |
| Address Form Fields | ✅ | ⬜ | - |
| - Street | ✅ | ⬜ | - |
| - Unit/Apt | ✅ | ⬜ | - |
| - City | ✅ | ⬜ | - |
| - State | ✅ | ⬜ | - |
| - Zip Code | ✅ | ⬜ | - |
| - Label (Home/Work/Other) | ✅ | ⬜ | - |
| - Delivery Instructions | ✅ | ⬜ | - |
| Save Address Button | ✅ | ⬜ | POST /api/addresses/{user_id} |
| Geocoding | ✅ | ⬜ | CLGeocoder |

## 1.13 Rideshare Features
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Ride Request Screen | ✅ | ⬜ | - |
| Pickup Location | ✅ | ⬜ | - |
| Dropoff Location | ✅ | ⬜ | - |
| Fare Estimate | ✅ | ⬜ | POST /api/rides/estimate |
| Request Ride Button | ✅ | ⬜ | POST /api/rides/request |
| Trip Board (nearby rides) | ✅ | ⬜ | GET /api/trips/board |

---

# 2. DELIVERY/DRIVER APP - Feature List

## 2.1 Authentication Flow
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Email/Password Login | ✅ | ⬜ | POST /api/driver/login |
| Email/Password Register | ✅ | ⬜ | POST /api/driver/register |
| Google Sign-In | ✅ | ⬜ | POST /api/driver/google-auth |
| Apple Sign-In | ✅ | ⬜ | POST /api/driver/apple-auth |
| Document Upload (Onboarding) | ✅ | ⬜ | POST /api/driver/documents |
| Logout | ✅ | ⬜ | - |
| Delete Account | ✅ | ⬜ | DELETE /api/driver/{id} |

## 2.2 Main Navigation (5 Tabs)
| Tab | iOS | Android | Description |
|-----|-----|---------|-------------|
| Home/Map | ✅ | ⬜ | Available orders, active delivery |
| Orders | ✅ | ⬜ | Order history |
| Earnings | ✅ | ⬜ | Earnings dashboard |
| Profile | ✅ | ⬜ | Driver profile & settings |

## 2.3 Home Screen (Driver)
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Online/Offline Toggle | ✅ | ⬜ | PUT /api/driver/{id}/status |
| Live Map | ✅ | ⬜ | - |
| Driver Location (Blue Pulsing) | ✅ | ⬜ | - |
| Available Orders List | ✅ | ⬜ | GET /api/orders/available |
| Order Card | ✅ | ⬜ | - |
| - Restaurant Name | ✅ | ⬜ | - |
| - Items Count | ✅ | ⬜ | - |
| - Distance to Restaurant | ✅ | ⬜ | - |
| - Route Visualization | ✅ | ⬜ | - |
| - Estimated Time | ✅ | ⬜ | - |
| - Total Earnings | ✅ | ⬜ | - |
| Accept Order Button | ✅ | ⬜ | POST /api/orders/{id}/accept |
| Service Mode Toggle (Food/Rideshare) | ✅ | ⬜ | - |
| Filter Chips (All/Nearby/High Pay/Quick) | ✅ | ⬜ | - |
| List/Map View Toggle | ✅ | ⬜ | - |

## 2.4 Rideshare Mode (Driver)
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Available Rides List | ✅ | ⬜ | GET /api/rides/available |
| Ride Card | ✅ | ⬜ | - |
| - Earnings Badge | ✅ | ⬜ | - |
| - Pickup Location | ✅ | ⬜ | - |
| - Dropoff Location | ✅ | ⬜ | - |
| - Customer Name | ✅ | ⬜ | - |
| Accept Ride Button | ✅ | ⬜ | POST /api/rides/{id}/accept |
| Negotiate Fare Button | ✅ | ⬜ | POST /api/rides/{id}/negotiate |
| Fare Negotiation Sheet | ✅ | ⬜ | - |
| - Customer Offer Display | ✅ | ⬜ | - |
| - Custom Price Input | ✅ | ⬜ | - |
| - Send Counter Offer | ✅ | ⬜ | - |
| $1 Connection Fee Badge | ✅ | ⬜ | - |

## 2.5 Active Delivery Screen
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Expandable Map | ✅ | ⬜ | - |
| Driver Location Marker | ✅ | ⬜ | - |
| Pickup Marker (Orange) | ✅ | ⬜ | - |
| Dropoff Marker (Green) | ✅ | ⬜ | - |
| Route Line | ✅ | ⬜ | - |
| Order Status Card | ✅ | ⬜ | - |
| Timeline View (4 steps) | ✅ | ⬜ | - |
| Pickup Location Card | ✅ | ⬜ | - |
| Navigate to Restaurant | ✅ | ⬜ | Open in Maps |
| Delivery Location Card | ✅ | ⬜ | - |
| Navigate to Customer | ✅ | ⬜ | Open in Maps |
| Order Items List | ✅ | ⬜ | - |
| Delivery Instructions | ✅ | ⬜ | - |
| Earnings Summary | ✅ | ⬜ | - |
| Contact Customer Button | ✅ | ⬜ | - |
| Chat with Customer | ✅ | ⬜ | - |
| Mark Picked Up Button | ✅ | ⬜ | PUT /api/orders/{id}/pickup |
| Mark Delivered Button | ✅ | ⬜ | PUT /api/orders/{id}/deliver |

## 2.6 My Deliveries Screen
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Active Delivery Hero Card | ✅ | ⬜ | - |
| Live Map Preview | ✅ | ⬜ | - |
| ETA Display | ✅ | ⬜ | - |
| Distance Display | ✅ | ⬜ | - |
| Earnings Display | ✅ | ⬜ | - |
| Customer Info | ✅ | ⬜ | - |
| Chat Button | ✅ | ⬜ | - |
| Call Button | ✅ | ⬜ | - |
| Navigate Button | ✅ | ⬜ | - |
| Complete Button | ✅ | ⬜ | - |
| Pending Pickups Section | ✅ | ⬜ | - |
| Today's Progress Summary | ✅ | ⬜ | - |

## 2.7 Earnings Screen
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Today's Earnings | ✅ | ⬜ | GET /api/driver/{id}/earnings |
| This Week Earnings | ✅ | ⬜ | - |
| Total Earnings | ✅ | ⬜ | - |
| Earnings Chart | ✅ | ⬜ | - |
| Period Selector (Day/Week/Month) | ✅ | ⬜ | - |
| Deliveries Count | ✅ | ⬜ | - |
| Tips Total | ✅ | ⬜ | - |
| Hourly Rate | ✅ | ⬜ | - |
| Payout History | ✅ | ⬜ | - |
| Earnings Breakdown | ✅ | ⬜ | - |

## 2.8 Driver Profile Screen
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Profile Header | ✅ | ⬜ | - |
| Profile Photo | ✅ | ⬜ | - |
| Driver Name | ✅ | ⬜ | - |
| Rating Display | ✅ | ⬜ | - |
| Approval Status Badge | ✅ | ⬜ | - |
| Stats Overview Card | ✅ | ⬜ | GET /api/driver/{id}/stats |
| - Rating | ✅ | ⬜ | - |
| - Deliveries | ✅ | ⬜ | - |
| - Acceptance Rate | ✅ | ⬜ | - |
| - On Time Rate | ✅ | ⬜ | - |
| **Profile Tabs** | ✅ | ⬜ | - |
| **Personal Info Tab** | ✅ | ⬜ | - |
| - Full Name | ✅ | ⬜ | - |
| - Email | ✅ | ⬜ | - |
| - Phone | ✅ | ⬜ | - |
| - Date of Birth | ✅ | ⬜ | - |
| - Address | ✅ | ⬜ | - |
| **Documents Tab** | ✅ | ⬜ | GET /api/driver/{id}/verification |
| - Verification Status | ✅ | ⬜ | - |
| - Driver's License | ✅ | ⬜ | - |
| - License Upload | ✅ | ⬜ | - |
| - Vehicle Info | ✅ | ⬜ | - |
| - Vehicle Photos | ✅ | ⬜ | - |
| - Insurance | ✅ | ⬜ | - |
| **Earnings Tab** | ✅ | ⬜ | - |
| - Earnings Summary | ✅ | ⬜ | - |
| - Bank Account | ✅ | ⬜ | - |
| - Payout History | ✅ | ⬜ | - |
| **Settings Tab** | ✅ | ⬜ | - |
| - Push Notifications | ✅ | ⬜ | - |
| - Sound Effects | ✅ | ⬜ | - |
| - Accept Cash Orders | ✅ | ⬜ | - |
| - Max Delivery Distance | ✅ | ⬜ | - |
| - Terms of Service | ✅ | ⬜ | - |
| - Privacy Policy | ✅ | ⬜ | - |
| - Contact Support | ✅ | ⬜ | - |
| - Logout | ✅ | ⬜ | - |
| - Delete Account | ✅ | ⬜ | - |

---

# 3. RESTAURANT/PARTNER APP - Feature List

## 3.1 Authentication Flow
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Email/Password Login | ✅ | ⬜ | POST /api/vendor/login |
| Email/Password Register | ✅ | ⬜ | POST /api/vendor/register |
| Apple Sign-In | ✅ | ⬜ | POST /api/vendor/apple-auth |
| Logout | ✅ | ⬜ | - |
| Delete Account | ✅ | ⬜ | DELETE /api/vendor/{id} |

## 3.2 Main Navigation (5-6 Tabs)
| Tab | iOS | Android | Description |
|-----|-----|---------|-------------|
| Orders | ✅ | ⬜ | Order management |
| Menu | ✅ | ⬜ | Menu management |
| Promotions | ✅ | ⬜ | Deals & promos |
| Analytics | ✅ | ⬜ | Business insights |
| Settings | ✅ | ⬜ | Restaurant settings |

## 3.3 Orders Dashboard
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Accepting Orders Toggle | ✅ | ⬜ | PUT /api/vendor/{id}/status |
| New Orders Section | ✅ | ⬜ | GET /api/orders/vendor/{id} |
| Order Count Badge | ✅ | ⬜ | - |
| In Progress Section | ✅ | ⬜ | - |
| Order Card | ✅ | ⬜ | - |
| - Order ID | ✅ | ⬜ | - |
| - Timestamp | ✅ | ⬜ | - |
| - Items List | ✅ | ⬜ | - |
| - Price Breakdown | ✅ | ⬜ | - |
| Accept Order Button | ✅ | ⬜ | PUT /api/orders/{id}/status |
| Reject Order Button | ✅ | ⬜ | - |
| Mark Ready Button | ✅ | ⬜ | PUT /api/orders/{id}/ready |
| Items Unavailable Button | ✅ | ⬜ | - |
| Order Sound Notification | ✅ | ⬜ | - |

## 3.4 Menu Management
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Menu Items List | ✅ | ⬜ | GET /api/vendors/{id}/menu |
| Menu Stats Bar | ✅ | ⬜ | - |
| - Total Items | ✅ | ⬜ | - |
| - Available Items | ✅ | ⬜ | - |
| - Out of Stock | ✅ | ⬜ | - |
| - Categories | ✅ | ⬜ | - |
| Search Menu | ✅ | ⬜ | - |
| Category Tabs | ✅ | ⬜ | GET /api/vendors/{id}/categories |
| Menu Item Card | ✅ | ⬜ | - |
| - Item Image | ✅ | ⬜ | - |
| - Name & Description | ✅ | ⬜ | - |
| - Price | ✅ | ⬜ | - |
| - Category | ✅ | ⬜ | - |
| - Availability Toggle | ✅ | ⬜ | PUT /api/menu/{item_id}/availability |
| Add Menu Item | ✅ | ⬜ | POST /api/vendors/{id}/menu |
| Edit Menu Item | ✅ | ⬜ | PUT /api/menu/{item_id} |
| Delete Menu Item | ✅ | ⬜ | DELETE /api/menu/{item_id} |
| Image Upload | ✅ | ⬜ | - |
| Mark Items Unavailable (Bulk) | ✅ | ⬜ | - |

## 3.5 Promotions Management
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Promotions List | ✅ | ⬜ | GET /api/promotions/vendor/{id} |
| Analytics Summary | ✅ | ⬜ | - |
| - Total Promotions | ✅ | ⬜ | - |
| - Active Promotions | ✅ | ⬜ | - |
| - Redemptions | ✅ | ⬜ | - |
| - Discount Given | ✅ | ⬜ | - |
| AI Suggestions Section | ✅ | ⬜ | - |
| Create Promotion | ✅ | ⬜ | POST /api/promotions/create |
| Edit Promotion | ✅ | ⬜ | PUT /api/promotions/{id} |
| Delete Promotion | ✅ | ⬜ | DELETE /api/promotions/{id} |
| Activate/Deactivate Toggle | ✅ | ⬜ | - |
| Promotion Card | ✅ | ⬜ | - |
| - Code | ✅ | ⬜ | - |
| - Title | ✅ | ⬜ | - |
| - Discount Type | ✅ | ⬜ | - |
| - Usage Stats | ✅ | ⬜ | - |
| - Validity Dates | ✅ | ⬜ | - |

## 3.6 Analytics Dashboard
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Period Selector | ✅ | ⬜ | - |
| Revenue Chart | ✅ | ⬜ | GET /api/vendor/{id}/analytics |
| Key Metrics | ✅ | ⬜ | - |
| - Total Revenue | ✅ | ⬜ | - |
| - Total Orders | ✅ | ⬜ | - |
| - Avg Order Value | ✅ | ⬜ | - |
| - Avg Prep Time | ✅ | ⬜ | - |
| Orders by Status | ✅ | ⬜ | - |
| Top Selling Items | ✅ | ⬜ | - |
| Peak Hours Chart | ✅ | ⬜ | - |
| Performance Summary | ✅ | ⬜ | - |

## 3.7 AI Insights (Enhanced)
| Feature | iOS | Android | Backend |
|---------|-----|---------|---------|
| Demand Forecast | ✅ | ⬜ | - |
| Inventory Insights | ✅ | ⬜ | - |
| Pricing Insights | ✅ | ⬜ | - |
| Staffing Optimization | ✅ | ⬜ | - |
| Smart Recommendations | ✅ | ⬜ | - |

## 3.8 Restaurant Settings
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Restaurant Profile Card | ✅ | ⬜ | - |
| Quick Actions | ✅ | ⬜ | - |
| - Accept Orders Toggle | ✅ | ⬜ | - |
| - Delivery Orders Toggle | ✅ | ⬜ | - |
| - Pickup Orders Toggle | ✅ | ⬜ | - |
| Operating Hours | ✅ | ⬜ | PUT /api/vendor/{id}/hours |
| Prep Time Buffer | ✅ | ⬜ | - |
| Notifications Settings | ✅ | ⬜ | - |
| Business Documents | ✅ | ⬜ | - |
| Payment & Payouts | ✅ | ⬜ | - |
| Platform Fee Info | ✅ | ⬜ | - |
| AI Features Toggles | ✅ | ⬜ | - |
| Terms of Service | ✅ | ⬜ | - |
| Privacy Policy | ✅ | ⬜ | - |
| Sign Out | ✅ | ⬜ | - |
| Delete Account | ✅ | ⬜ | - |

## 3.9 Earnings View
| Feature | iOS | Android | Backend Endpoint |
|---------|-----|---------|------------------|
| Total Revenue | ✅ | ⬜ | GET /api/vendor/{id}/earnings |
| Total Orders | ✅ | ⬜ | - |
| Platform Fee Breakdown | ✅ | ⬜ | - |
| Recent Orders List | ✅ | ⬜ | - |
| Payout History | ✅ | ⬜ | - |

---

# 4. CROSS-PLATFORM FLOW (iOS Driver + Android Customer)

## How it Works:
1. **Same Backend**: Both iOS and Android connect to `api.dollor.ai`
2. **Real-time Updates**: WebSocket/polling for order status
3. **Database Sync**: All data stored in PostgreSQL on backend

## Order Flow:
```
Customer (Android) → Places Order → Backend → Available to Driver (iOS)
                                      ↓
Driver (iOS) → Accepts Order → Backend → Customer sees "Driver Assigned"
                                 ↓
Driver (iOS) → Picks Up → Backend → Customer sees "On the Way"
                           ↓
Driver (iOS) → Delivers → Backend → Customer sees "Delivered"
```

## Key Integration Points:
| Action | Customer App | Driver App | Backend |
|--------|-------------|------------|---------|
| Place Order | POST /api/orders/create | - | Creates order |
| View Available | - | GET /api/orders/available | Returns pending |
| Accept Order | Sees update | POST /api/orders/{id}/accept | Updates status |
| Pickup | Sees update | PUT /api/orders/{id}/pickup | Updates status |
| Deliver | Sees update | PUT /api/orders/{id}/deliver | Updates status |
| Track Location | GET driver location | POST location updates | Stores location |

---

# 5. NAMING & BRANDING REQUIREMENTS

## App Names:
- Customer App: **Dollor - $1 Delivery** (Display: Dollor.ai)
- Driver App: **Dollor Driver**
- Restaurant App: **Dollor Partner**

## Package/Bundle IDs:
- Customer: `ai.dollor.customer`
- Driver: `ai.dollor.driver`
- Restaurant: `ai.dollor.partner`

## Brand Colors:
- Primary Green: #4CAF50
- Orange: #FF9800
- Black: #000000
- Grey: #F5F5F5
- Red (Accent): #F44336

## API Base URL:
- Production: `https://api.dollor.ai`
- Config: `https://api.dollor.ai/api/config`

---

**Legend:**
- ✅ = Implemented
- ⬜ = Not Implemented / Needs Update
- 🔄 = Partially Implemented
