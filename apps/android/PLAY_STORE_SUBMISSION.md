# Google Play Store Submission Guide - Dollor.AI Apps

## Pre-Submission Checklist

### 1. Generate Release Keystore
```bash
# Generate a release keystore (do this ONCE, keep it safe!)
keytool -genkey -v -keystore dollor-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias dollor

# Then add to local.properties:
RELEASE_KEYSTORE_PATH=/path/to/dollor-release.jks
RELEASE_KEYSTORE_PASSWORD=your_password
RELEASE_KEY_ALIAS=dollor
RELEASE_KEY_PASSWORD=your_key_password
```

### 2. Build Release APK/AAB
```bash
# Build all release bundles
./gradlew :app:bundleRelease
./gradlew :partner:bundleRelease
./gradlew :orderapp:bundleRelease

# Output locations:
# app/build/outputs/bundle/release/app-release.aab
# partner/build/outputs/bundle/release/partner-release.aab
# orderapp/build/outputs/bundle/release/orderapp-release.aab
```

---

## Data Safety Form Responses

### Customer App (com.eatfair.app)

**Data Collected:**
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name | Yes | No | Account creation, order delivery |
| Email | Yes | No | Account login, receipts |
| Phone | Yes | Yes (with restaurants/drivers) | Order coordination |
| Address | Yes | Yes (with drivers) | Delivery location |
| Payment info | Yes | No | Process payments via Stripe |
| Precise location | Yes | Yes (with drivers) | Real-time delivery tracking |
| Purchase history | Yes | No | Order history, recommendations |

**Security Practices:**
- Data encrypted in transit (HTTPS only)
- Data encrypted at rest (server-side)
- Users can request data deletion
- Payment data handled by Stripe (PCI compliant)

---

### Driver App (com.eatfair.orderapp)

**Data Collected:**
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name | Yes | Yes (with customers) | Driver identification |
| Email | Yes | No | Account login |
| Phone | Yes | Yes (with customers) | Order coordination |
| Driver's license | Yes | No | Identity verification |
| Vehicle info | Yes | No | Delivery verification |
| Precise location | Yes | Yes (with customers) | Real-time tracking |
| Earnings data | Yes | No | Payment processing |

**Security Practices:**
- Background location used only during active deliveries
- Data encrypted in transit (HTTPS only)
- Users can request data deletion
- Financial data handled securely

---

### Restaurant Partner App (com.eatfair.partner)

**Data Collected:**
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Business name | Yes | Yes (with customers) | Restaurant listing |
| Business email | Yes | No | Account management |
| Business phone | Yes | Yes (with customers) | Order coordination |
| Business address | Yes | Yes (with customers) | Restaurant location |
| Tax ID/EIN | Yes | No | Payment verification |
| Bank account | Yes | No | Payout processing |
| Menu/pricing | Yes | Yes (with customers) | Menu display |

**Security Practices:**
- Data encrypted in transit (HTTPS only)
- Financial data handled securely
- Business can request data deletion

---

## Content Rating Questionnaire

### All Three Apps:

**Violence:** None
**Sexual Content:** None
**Language:** None (no user-generated content)
**Controlled Substances:** None
**Gambling:** None

**Interactive Elements:**
- Users Interact: Yes (ordering, messaging)
- Shares Location: Yes (delivery tracking)
- Digital Purchases: Yes (food ordering)

**Target Audience:** 18+ (payment/financial transactions)

---

## App Descriptions

### Customer App
**Short Description (80 chars):**
Order food with $1-$3 flat delivery fees. No hidden charges, real savings.

**Full Description:**
Dollor.AI revolutionizes food delivery with transparent, flat-rate pricing.

KEY FEATURES:
• $1-$3 flat delivery fees (no percentage-based charges)
• Real-time order tracking with live driver location
• Support local restaurants - they keep more profits
• Multiple payment options including Apple Pay & Google Pay
• Order from multiple restaurants in one checkout
• Rideshare integration for pickup discounts

WHY DOLLOR.AI?
Traditional delivery apps charge restaurants 25-35% commission. We charge a flat $1-$3 fee, so restaurants keep more and can offer better prices. Everyone wins.

TRANSPARENT PRICING:
• Orders ≤$35: $1 delivery fee
• Orders $35-$70: $2 delivery fee
• Orders >$70: $3 delivery fee

---

### Driver App
**Short Description (80 chars):**
Earn more per delivery. Keep 100% of tips. Flexible schedule, fair pay.

**Full Description:**
Join Dollor.AI as a delivery driver and earn more per delivery than traditional platforms.

DRIVER BENEFITS:
• Keep 100% of customer tips
• Competitive base pay + per-mile compensation
• Real-time earnings tracking
• Flexible schedule - work when you want
• Instant payouts available
• Rideshare opportunities for extra income

FAIR EARNINGS MODEL:
We don't take a cut of your tips. Our drivers earn:
• Base pay: $3-$5 per delivery (based on order size)
• Per mile: $0.50-$0.75
• 100% of tips

---

### Restaurant Partner App
**Short Description (80 chars):**
Grow your restaurant with $1-$3 flat fees. Keep more profit, reach more customers.

**Full Description:**
Partner with Dollor.AI and keep more of your hard-earned revenue.

RESTAURANT BENEFITS:
• Flat $1-$3 platform fee (not 25-35% commission!)
• Real-time order management
• Menu customization
• Analytics and insights
• Promotional tools
• Direct customer communication

COMPARE THE SAVINGS:
On a $50 order:
• Traditional platforms: $12.50-$17.50 fee (25-35%)
• Dollor.AI: $2.00 flat fee
• You save: $10.50-$15.50 per order!

---

## Privacy Policy URL
https://api.dollor.ai/privacy

## Terms of Service URL
https://api.dollor.ai/terms

## Support Email
support@dollor.ai

## Developer Contact
Dollor.AI Inc.
contact@dollor.ai
