# Dollor.ai - Google Play Data Safety Declaration

This document provides the information needed to complete the Google Play Console Data Safety form for all three Dollor.ai apps.

---

## Customer App (ai.dollor.customer)

### Data Collection Summary

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Name | Yes | Yes (drivers/restaurants) | Yes | Account, delivery |
| Email | Yes | No | Yes | Account, communications |
| Phone | Yes | Yes (drivers) | Yes | Delivery coordination |
| Address | Yes | Yes (drivers) | Yes | Delivery location |
| Payment info | Yes | No (Stripe handles) | Yes | Process transactions |
| Location | Yes | Yes (drivers) | Yes | Delivery/pickup tracking |
| Order history | Yes | No | No | Personalization |
| Device ID | Yes | No | No | Analytics, security |

### Data Sharing Details

**With whom is data shared?**
- **Restaurants**: Name, order details (for food preparation)
- **Drivers**: Name, phone, delivery address (for delivery)
- **Payment processor (Stripe)**: Payment details (for transaction processing)

**Why is data shared?**
- To facilitate peer-to-peer transactions between customers, restaurants, and drivers
- Payment processing requires sharing with Stripe

### Security Practices
- [x] Data encrypted in transit (TLS 1.2+)
- [x] Data encrypted at rest
- [x] Users can request data deletion
- [x] Committed to Play Families Policy (if applicable): No

### Account Deletion
- Users can delete their account via: Settings > Account > Delete Account
- Data deletion timeline: Within 90 days
- Data retained for legal purposes: Transaction records (7 years for tax compliance)

---

## Driver App (ai.dollor.driver)

### Data Collection Summary

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Name | Yes | Yes (customers) | Yes | Identification |
| Email | Yes | No | Yes | Account, communications |
| Phone | Yes | Yes (customers) | Yes | Delivery coordination |
| Profile photo | Yes | Yes (customers) | Yes | Identification |
| Driver's license | Yes | No | Yes | Verification |
| Vehicle info | Yes | No | Yes | Service eligibility |
| Location | Yes | Yes (customers) | Yes | Real-time tracking |
| Background location | Yes | No | Yes | Active delivery tracking |
| Earnings data | Yes | No | No | Payment processing |
| Device ID | Yes | No | No | Analytics, security |

### Data Sharing Details

**With whom is data shared?**
- **Customers**: Name, photo, vehicle info, real-time location (for tracking)
- **Restaurants**: Name (for pickup coordination)
- **Background check provider**: Personal info (for verification)

**Why is data shared?**
- Customer needs to track and identify driver
- Safety verification requirements

### Background Location Use
- **Purpose**: Track driver location during active deliveries only
- **When collected**: Only while delivery/ride is in progress
- **Not collected**: When app is closed or driver is offline

### Security Practices
- [x] Data encrypted in transit (TLS 1.2+)
- [x] Data encrypted at rest
- [x] Users can request data deletion
- [x] Committed to Play Families Policy (if applicable): No

### Account Deletion
- Drivers can delete their account via: Settings > Account > Delete Account
- Data deletion timeline: Within 90 days
- Data retained: Tax documents (7 years), trip records for legal disputes

---

## Partner/Restaurant App (ai.dollor.partner)

### Data Collection Summary

| Data Type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Business name | Yes | Yes (customers) | Yes | Business listing |
| Business address | Yes | Yes (customers) | Yes | Restaurant location |
| Contact email | Yes | No | Yes | Communications |
| Contact phone | Yes | No | Yes | Support |
| Business license | Yes | No | Yes | Verification |
| Health permit | Yes | No | Yes | Compliance |
| Menu data | Yes | Yes (customers) | Yes | Order placement |
| Financial data | Yes | No | Yes | Payouts |
| Device ID | Yes | No | No | Analytics |

### Data Sharing Details

**With whom is data shared?**
- **Customers**: Business name, address, menu, ratings
- **Drivers**: Restaurant name, pickup location

**Why is data shared?**
- Customers need restaurant info to place orders
- Drivers need pickup location for delivery

### Security Practices
- [x] Data encrypted in transit (TLS 1.2+)
- [x] Data encrypted at rest
- [x] Users can request data deletion
- [x] Committed to Play Families Policy (if applicable): No

### Account Deletion
- Partners can delete their account by contacting: partners@dollor.ai
- Data deletion timeline: Within 90 days
- Data retained: Transaction records (7 years for tax/legal compliance)

---

## Common Responses for All Apps

### Data Collection Practices

**Is data collected?** Yes

**Is data encrypted in transit?** Yes (TLS 1.2+)

**Can users request data deletion?** Yes

**Do you collect any sensitive data types?**
- Financial info: Yes (payment processing via Stripe)
- Location: Yes (delivery/ride functionality)
- Personal identifiers: Yes (name, email, phone)

### Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Stripe | Payment processing | Payment info |
| Google Maps | Navigation, location | Location data |
| Firebase | Push notifications, analytics | Device tokens, usage data |
| Persona/Onfido | Identity verification (drivers) | ID documents |

### Privacy Policy URL
https://dollor.ai/privacy

### Contact for Privacy Inquiries
privacy@dollor.ai

---

## Play Console Form Quick Reference

When completing the Data Safety form in Google Play Console:

1. **Does your app collect or share any of the required user data types?** Yes

2. **Is all user data encrypted in transit?** Yes

3. **Do you provide a way for users to request that their data be deleted?** Yes

4. **Location data** (Customer & Driver apps):
   - Collected: Yes
   - Shared: Yes (with other platform users for service delivery)
   - Purpose: App functionality (delivery tracking)
   - Required: Yes

5. **Financial info** (All apps):
   - Collected: Yes
   - Shared: With payment processor only
   - Purpose: Process transactions
   - Required: Yes

6. **Personal identifiers** (All apps):
   - Collected: Yes
   - Shared: With relevant parties for P2P transactions
   - Purpose: Account management, service delivery
   - Required: Yes

---

## Compliance Notes

1. **CCPA**: California users can opt-out of data sale (we don't sell data)
2. **GDPR**: EU users have right to access, rectify, and delete data
3. **Children**: Apps not directed at children under 13
4. **Background location**: Only Driver app; justified for delivery tracking

Last Updated: January 2026
