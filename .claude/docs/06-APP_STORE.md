# APP STORE REQUIREMENTS

> Requirements and checklists for iOS App Store and Google Play Store submission.
> **GOAL**: Build Uber/DoorDash quality apps that pass review on first submission.

---

## APPLE APP STORE REQUIREMENTS

### Required for Submission

| Requirement | Status |
|-------------|--------|
| App Privacy Policy URL (in app and App Store Connect) | Required |
| Terms of Service URL | Required |
| Contact information (support email) | Required |
| Age rating questionnaire completed | Required |
| App category selected (Food & Drink / Travel) | Required |
| Screenshots for all device sizes | Required |
| App icon (1024x1024 without alpha) | Required |
| App description (4000 chars max) | Required |
| Keywords (100 chars max) | Required |

### Location Services (CRITICAL)

| Permission | Customer App | Driver App | Restaurant App |
|------------|--------------|------------|----------------|
| NSLocationWhenInUseUsageDescription | Yes | Yes | No |
| NSLocationAlwaysUsageDescription | No | Yes | No |
| Background location justification | No | Required | No |

**Purpose strings must clearly explain why location is needed.**

### Payment Processing

- Physical goods/services = **Stripe OK** (no Apple IAP required)
- Clear pricing displayed before purchase
- Refund policy clearly stated

### Push Notifications

- Request permission at appropriate time (not on launch)
- Clear explanation of notification types
- Respect user's notification preferences

### Data Collection (App Privacy Labels)

| Data Type | Purpose |
|-----------|---------|
| Contact Info (name, email, phone) | Account creation |
| Location | Order delivery / Driver tracking |
| Payment Info | Stripe processing |
| Usage Data | Analytics |
| Identifiers | Device ID for push notifications |

### Common Rejection Reasons to Avoid

- ✗ Incomplete app (must be fully functional)
- ✗ Placeholder content
- ✗ Crashes or bugs
- ✗ Broken links
- ✗ Missing login credentials for review
- ✗ Requesting unnecessary permissions
- ✗ Background location without justification

---

## GOOGLE PLAY STORE REQUIREMENTS

### Required for Submission

| Requirement | Status |
|-------------|--------|
| Privacy Policy URL | Required |
| App access (demo credentials if login required) | Required |
| Content rating questionnaire | Required |
| Target audience and content | Required |
| Data safety section completed | Required |
| Financial features declaration | Required |

### Location Permissions

| Permission | Customer App | Driver App | Restaurant App |
|------------|--------------|------------|----------------|
| ACCESS_FINE_LOCATION | Yes | Yes | No |
| ACCESS_BACKGROUND_LOCATION | No | Yes (with declaration) | No |
| Prominent disclosure | Yes | Yes | No |

### Data Safety Section

| Category | Details |
|----------|---------|
| Data collected | Location, Personal info, Financial info |
| Data shared | Payment processors (Stripe) |
| Security practices | Encryption in transit |
| Data deletion | User can request deletion |

### Sensitive Permissions Declaration

- SMS/Call Log - **NOT NEEDED** (don't request)
- Background location - Driver app only with justification
- Camera - Profile photos only

### Common Rejection Reasons to Avoid

- ✗ Deceptive behavior
- ✗ Malicious behavior
- ✗ Policy violations
- ✗ Impersonation
- ✗ Intellectual property violations
- ✗ Privacy violations
- ✗ Requesting unnecessary permissions

---

## APP SUBMISSION CHECKLIST

| Item | Customer App | Driver App | Restaurant App |
|------|--------------|------------|----------------|
| **Privacy Policy** | Required | Required | Required |
| **Terms of Service** | Required | Required | Required |
| **Location (Foreground)** | Yes | Yes | No |
| **Location (Background)** | No | Yes (justified) | No |
| **Push Notifications** | Yes | Yes | Yes |
| **Camera** | Optional | Yes (profile) | No |
| **Payment Processing** | Stripe | No | Stripe |
| **Demo Account** | Required | Required | Required |

---

## DEMO ACCOUNTS FOR APP REVIEW

Provide these credentials to Apple/Google reviewers:

### Customer App
```
Email: demo.customer@dollor.ai
Password: DemoCustomer2025!
```

### Driver App
```
Email: demo.driver@dollor.ai
Password: DemoDriver2025!
```

### Restaurant App
```
Email: demo.restaurant@dollor.ai
Password: DemoRestaurant2025!
```

### Account Configuration Requirements

Each demo account must be pre-configured with:
- Verified status (no document upload required)
- Sample order history
- Working location (San Francisco area)
- Stripe test mode enabled

### Create Demo Accounts

```bash
# API endpoint to create demo accounts
curl -X POST https://d3kuu45w6kl8hr.cloudfront.net/api/demo/setup
```

---

## APP STORE METADATA

### App Name
```
Dollor.ai - Food & Rides
```

### Subtitle
```
Matchmaking for Delivery
```

### Description
```
Dollor.ai connects you with local restaurants and independent delivery
partners. Order food from your favorite restaurants and get it delivered
by independent drivers in your area.

✓ Simple $1 matchmaking fee
✓ No hidden charges
✓ 100% of tips go to drivers
✓ Real-time order tracking
✓ Multiple restaurant orders
```

### Keywords (100 chars max)
```
food delivery, restaurant, order food, delivery, matchmaking
```

---

## PRICING DISPLAY

All apps must display consistent pricing:

### Fee Display in Apps

**Food Order Receipt:**
```
─────────────────────────────────
Subtotal                   $45.00
Delivery Fee (to driver)    $5.99
Matchmaking Fee             $1.00  ← Platform fee
Tip (100% to driver)        $5.00
─────────────────────────────────
Total                      $56.99
```

**Ride Receipt:**
```
─────────────────────────────────
Ride Fare (to driver)      $15.00
Matchmaking Fee             $1.00  ← Platform fee
Tip (100% to driver)        $3.00
─────────────────────────────────
Total                      $19.00
```

---

## PRE-SUBMISSION TESTING

### iOS Testing Checklist

- [ ] Test on iPhone SE (smallest screen)
- [ ] Test on iPhone 15 Pro Max (largest screen)
- [ ] Test on iPad (if supported)
- [ ] Test location permissions flow
- [ ] Test push notification permissions
- [ ] Test payment flow with test card
- [ ] Test all deep links
- [ ] Test app backgrounding/foregrounding
- [ ] Verify privacy policy loads
- [ ] Verify terms of service loads

### Android Testing Checklist

- [ ] Test on small screen device
- [ ] Test on tablet (if supported)
- [ ] Test location permissions flow
- [ ] Test push notification permissions
- [ ] Test payment flow with test card
- [ ] Test all deep links
- [ ] Test app backgrounding/foregrounding
- [ ] Verify privacy policy loads
- [ ] Verify terms of service loads
- [ ] Test different API levels (26-34)

---

*Last Updated: December 26, 2025*
