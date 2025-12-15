# EatFair Platform - Use Cases Documentation

## Overview
EatFair is a comprehensive food delivery platform with three apps serving different user segments:
- **Customer App**: Order food from local restaurants
- **Partner App**: Restaurant management and order fulfillment
- **Driver App**: Delivery management and earnings tracking

---

## Customer App Use Cases

### UC-C01: User Registration
**Actor**: Customer
**Precondition**: User has the app installed
**Flow**:
1. User opens app and taps "Create Account"
2. User enters email, password, and name
3. System validates input (email format, password strength)
4. System creates Firebase Auth account
5. System creates user profile in Firestore
6. User is redirected to home screen

**Alternative Flow**:
- 3a. Google Sign-In: User taps "Sign in with Google", authenticates via Google, profile created automatically

**Postcondition**: User account created and logged in

---

### UC-C02: Browse Restaurants
**Actor**: Customer
**Precondition**: User is logged in
**Flow**:
1. User views home screen with restaurant list
2. System fetches restaurants from P2P API
3. User can filter by category (Pizza, Burgers, Asian, etc.)
4. User can search by restaurant name or cuisine
5. User sees restaurant cards with: name, image, rating, delivery time, distance

**Postcondition**: User can view available restaurants

---

### UC-C03: View Restaurant Menu
**Actor**: Customer
**Precondition**: User has selected a restaurant
**Flow**:
1. User taps on restaurant card
2. System fetches menu items from P2P API
3. User sees menu organized by category
4. Each item shows: name, description, price, image
5. User can tap item to see details/customization options

**Postcondition**: User can view full restaurant menu

---

### UC-C04: Add Items to Cart
**Actor**: Customer
**Precondition**: User is viewing a menu item
**Flow**:
1. User taps "Add to Cart" on menu item
2. User selects quantity
3. User adds optional customizations/notes
4. System adds item to cart
5. Cart icon updates with item count
6. Snackbar confirms item added

**Postcondition**: Item added to shopping cart

---

### UC-C05: Checkout and Payment
**Actor**: Customer
**Precondition**: Cart has items
**Flow**:
1. User taps cart icon
2. System displays cart summary with pricing breakdown:
   - Subtotal
   - Tax (8.75%)
   - Delivery fee (waived if over $35)
   - Service fee ($0.99)
   - Tip (optional)
3. User selects delivery address
4. User selects payment method (Stripe)
5. User reviews order and taps "Place Order"
6. System creates order via V3 API
7. System processes payment via Stripe
8. Order confirmation displayed

**Alternative Flow**:
- 4a. Add new payment method: User adds card via Stripe SDK

**Postcondition**: Order placed and payment processed

---

### UC-C06: Track Order
**Actor**: Customer
**Precondition**: Order has been placed
**Flow**:
1. User navigates to "My Orders"
2. User taps active order
3. System displays order status:
   - Placed
   - Preparing
   - Ready
   - Out for Delivery
   - Delivered
4. Map shows driver location (when applicable)
5. Estimated delivery time displayed
6. User can chat with driver

**Postcondition**: User can monitor order progress

---

### UC-C07: Rate Driver
**Actor**: Customer
**Precondition**: Order has been delivered
**Flow**:
1. System prompts user to rate delivery
2. User selects star rating (1-5)
3. User adds optional feedback
4. User submits rating
5. System updates driver rating

**Postcondition**: Driver rating submitted

---

### UC-C08: Tip Driver
**Actor**: Customer
**Precondition**: Order is out for delivery or delivered
**Flow**:
1. User opens active order or order history
2. User taps "Add Tip"
3. User selects tip amount (preset or custom)
4. System processes tip payment
5. Driver receives tip (100% goes to driver)

**Postcondition**: Tip sent to driver

---

### UC-C09: Manage Saved Addresses
**Actor**: Customer
**Precondition**: User is logged in
**Flow**:
1. User navigates to Profile > Addresses
2. User can add new address via:
   - Manual entry
   - Map picker with location services
3. User sets address label (Home, Work, Other)
4. User can edit or delete existing addresses
5. User can set default delivery address

**Postcondition**: Address saved to user profile

---

### UC-C10: Refer a Friend
**Actor**: Customer
**Precondition**: User is logged in
**Flow**:
1. User navigates to "Refer & Earn"
2. System generates unique referral code
3. User shares code via SMS, email, or social
4. Friend signs up using code
5. Both users receive $10 credit after friend's first order

**Postcondition**: Referral code shared

---

## Partner (Restaurant) App Use Cases

### UC-P01: Restaurant Login
**Actor**: Restaurant Owner/Manager
**Precondition**: Restaurant registered in system
**Flow**:
1. User opens Partner app
2. User enters email and password
3. System authenticates via Firebase
4. System fetches restaurant profile
5. User sees dashboard with today's orders

**Postcondition**: Restaurant user logged in

---

### UC-P02: View Incoming Orders
**Actor**: Restaurant Staff
**Precondition**: User is logged in
**Flow**:
1. Dashboard shows new orders tab
2. System listens to Firestore for new orders
3. New order notification displayed
4. Order card shows: items, customer name, total, time placed

**Postcondition**: Staff can see pending orders

---

### UC-P03: Accept/Prepare Order
**Actor**: Restaurant Staff
**Precondition**: New order received
**Flow**:
1. Staff reviews order details
2. Staff taps "Accept Order"
3. System updates order status to "Preparing"
4. System notifies customer
5. Staff prepares food
6. Staff marks order "Ready for Pickup"
7. System notifies driver (if assigned)

**Postcondition**: Order prepared and ready

---

### UC-P04: Manage Menu
**Actor**: Restaurant Owner
**Precondition**: User is logged in
**Flow**:
1. User navigates to Menu tab
2. User can add new menu item:
   - Name, description, price
   - Category
   - Image upload
3. User can edit existing items
4. User can toggle item availability
5. User can delete items
6. System syncs with P2P API

**Postcondition**: Menu updated

---

### UC-P05: View Analytics
**Actor**: Restaurant Owner
**Precondition**: User is logged in
**Flow**:
1. User navigates to Analytics tab
2. System displays metrics:
   - Today's orders
   - Today's revenue
   - Average rating
   - Top selling items
3. User can view trends over time

**Postcondition**: Analytics displayed

---

### UC-P06: Mark Items Unavailable
**Actor**: Restaurant Staff
**Precondition**: User is logged in
**Flow**:
1. User views menu
2. User toggles item availability off
3. System updates item in real-time
4. Item shows as unavailable in customer app

**Postcondition**: Item marked unavailable

---

## Driver App Use Cases

### UC-D01: Driver Registration
**Actor**: Prospective Driver
**Precondition**: App installed
**Flow**:
1. User opens Driver app
2. User enters email, password, name, phone
3. User uploads required documents:
   - Driver's license
   - Vehicle registration
   - Insurance
4. System submits for verification
5. Driver account created (pending approval)

**Postcondition**: Driver account created

---

### UC-D02: Go Online
**Actor**: Driver
**Precondition**: Driver is approved and logged in
**Flow**:
1. Driver taps "Go Online" toggle
2. System starts location tracking
3. Driver appears available for deliveries
4. System begins sending nearby order requests

**Postcondition**: Driver is active

---

### UC-D03: Accept Delivery
**Actor**: Driver
**Precondition**: Driver is online
**Flow**:
1. System sends order request notification
2. Request shows: restaurant, delivery address, earnings, distance
3. Driver has limited time to accept
4. Driver taps "Accept"
5. System assigns order to driver
6. Navigation starts to restaurant

**Postcondition**: Order assigned to driver

---

### UC-D04: Complete Pickup
**Actor**: Driver
**Precondition**: Order assigned
**Flow**:
1. Driver navigates to restaurant
2. Driver arrives and picks up order
3. Driver taps "Picked Up"
4. System updates order status
5. Customer notified
6. Navigation starts to customer

**Postcondition**: Order picked up

---

### UC-D05: Complete Delivery
**Actor**: Driver
**Precondition**: Order picked up
**Flow**:
1. Driver navigates to customer address
2. Driver delivers order
3. Driver taps "Delivered"
4. System updates order status
5. Customer notified
6. Earnings credited to driver account

**Postcondition**: Delivery completed

---

### UC-D06: Chat with Customer
**Actor**: Driver
**Precondition**: Order in progress
**Flow**:
1. Driver opens order details
2. Driver taps chat icon
3. Real-time messaging with customer
4. Driver can send text messages
5. Customer receives push notification

**Postcondition**: Message sent

---

### UC-D07: View Earnings
**Actor**: Driver
**Precondition**: Driver logged in
**Flow**:
1. Driver navigates to Earnings tab
2. System displays:
   - Today's earnings
   - Weekly earnings
   - Delivery breakdown (base + tips)
   - Number of deliveries
3. Driver can view payment history

**Postcondition**: Earnings displayed

---

### UC-D08: Trip Board (Rideshare)
**Actor**: Driver
**Precondition**: Driver is online
**Flow**:
1. Driver views Trip Board
2. System shows available ride requests
3. Driver can accept rideshare trips
4. Similar flow to food delivery
5. Separate earnings tracking

**Postcondition**: Rideshare trip accepted

---

## System Use Cases

### UC-S01: Real-time Order Updates
**Actor**: System
**Flow**:
1. Order status changes in Firestore
2. Firestore triggers real-time listeners
3. All connected clients receive update
4. UI updates automatically
5. Push notifications sent

---

### UC-S02: Payment Processing
**Actor**: System
**Flow**:
1. Order created via V3 API
2. Stripe Payment Intent created
3. Payment split calculated:
   - Restaurant: Subtotal + Tax - 15% commission
   - Driver: Delivery fee + Tips
   - Platform: Commission + Service fee
4. Stripe processes payment
5. Funds distributed to connected accounts

---

### UC-S03: Push Notifications
**Actor**: System
**Flow**:
1. Event triggers notification (new order, status change)
2. System determines recipients
3. Firebase Cloud Messaging sends notification
4. Device receives and displays notification

---

## Payment Breakdown (V3 Model)

| Component | Recipient | Amount |
|-----------|-----------|--------|
| Subtotal | Restaurant | 85% |
| Tax | Restaurant | 100% |
| Commission | Platform | 15% of subtotal |
| Service Fee | Platform | $0.99 |
| Delivery Fee | Driver | Base + per-mile |
| Tip | Driver | 100% |

**Free Delivery**: Orders over $35 qualify for free delivery.

---

## Test Scenarios

### Scenario 1: Complete Order Flow
1. Customer browses restaurants
2. Customer adds items to cart
3. Customer completes checkout
4. Restaurant receives and accepts order
5. Restaurant marks order ready
6. Driver accepts and picks up order
7. Driver delivers to customer
8. Customer rates and tips driver

### Scenario 2: Address Management
1. Customer adds new address via map
2. Customer sets as default
3. Customer places order to new address
4. Address appears in order history

### Scenario 3: Menu Update
1. Restaurant adds new menu item
2. Item appears in customer app
3. Restaurant marks item unavailable
4. Customer cannot order unavailable item

---

## Version History
- v1.0: Initial use cases documentation
- Platform: iOS + Android
- Last Updated: December 2024
