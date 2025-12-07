# Dollor AI Platform - Use Cases

## Overview
This document outlines the key use cases for the Dollor AI platform, covering both Food Delivery and Rideshare services. The platform's unique selling point is the **$1 + $1 = $2 platform fee model** for rideshare, making it significantly cheaper than competitors like Uber ($5-10+) and Lyft.

---

## Food Delivery Use Cases

### Use Case 1: Standard Food Order with Live Tracking

**Actor:** Customer (Sarah)

**Scenario:**
Sarah is hungry and wants to order dinner from her favorite Thai restaurant.

**Flow:**
1. Sarah opens the Dollor AI customer app
2. She browses restaurants near her location
3. She selects "Thai Basil Kitchen" and views the menu
4. She adds Pad Thai ($14.99) and Spring Rolls ($6.99) to her cart
5. She proceeds to checkout:
   - Subtotal: $21.98
   - Delivery Fee: $3.99
   - Service Fee: $2.50
   - Tax: $1.98
   - **Total: $30.45**
6. She enters her delivery address and special instructions ("Leave at door, ring doorbell")
7. She pays with her saved credit card via Stripe
8. Order is sent to the restaurant

**Restaurant Side:**
- Restaurant receives the order notification
- Kitchen staff prepares the food (est. 20 min)
- Staff marks order as "Ready for Pickup"

**Driver Side:**
- Driver (in Food Delivery mode) sees the order in "Available Orders"
- Order shows: Thai Basil Kitchen → 2.3 miles → $6.50 earnings
- Driver accepts the order
- Driver navigates to restaurant, picks up food
- Driver marks "Picked Up" - customer gets notification
- Driver navigates to Sarah's address
- Driver marks "Delivered" - order complete

**Customer Tracking:**
- Sarah sees real-time driver location on map
- ETA updates as driver moves
- She receives push notifications at each status change

**Outcome:** Sarah receives her food in 35 minutes, tips driver $5 in app.

---

### Use Case 2: Multi-Restaurant Order (Party Order)

**Actor:** Customer (Mike)

**Scenario:**
Mike is hosting a small party and wants food from multiple restaurants.

**Flow:**
1. Mike opens the app and adds items from 3 different restaurants:
   - **Pizza Palace:** 2 Large Pizzas ($28.00)
   - **Taco Town:** 20-piece Taco Pack ($35.00)
   - **Sweet Treats:** Dessert Platter ($22.00)

2. App shows multi-restaurant checkout:
   - Subtotal: $85.00
   - Delivery Fees: $3.99 × 3 = $11.97
   - Service Fee: $4.25
   - Tax: $7.65
   - **Total: $108.87**

3. Mike confirms the order

**System Behavior:**
- System creates 3 separate orders for each restaurant
- Each restaurant receives their portion
- 3 different drivers can accept each order (parallel delivery)
- OR one driver can batch accept all 3 if routes align

**Driver Optimization:**
- Driver sees batched order opportunity: "3 pickups, 1 dropoff - $18.50"
- Smart routing: Pizza Palace → Taco Town → Sweet Treats → Mike's house
- Total distance optimized by the app

**Outcome:** Mike receives all 3 orders within 10 minutes of each other.

---

### Use Case 3: Priority Delivery with Real-Time Issue Resolution

**Actor:** Customer (Lisa), Driver (James), Restaurant (Burger Joint)

**Scenario:**
Lisa is extremely hungry and selects Priority Delivery for faster service.

**Flow:**
1. Lisa orders a burger combo ($15.99)
2. She selects "Priority Delivery" (+$2.99)
3. Order goes to top of restaurant queue
4. Priority orders appear highlighted for drivers with higher payout

**Issue Occurs:**
- James picks up the order
- En route, he realizes the drink is missing
- He uses in-app chat to contact restaurant
- Restaurant confirms they forgot the drink

**Resolution Options:**
1. **Return to Restaurant:** James goes back (compensated for time)
2. **Partial Refund:** Lisa gets refund for missing drink
3. **Redelivery:** Restaurant prepares drink, another driver delivers

**Lisa chooses Option 2:**
- She accepts partial refund ($3.50 for drink)
- James continues delivery
- Lisa leaves feedback: "Food was great, driver was professional about the issue"

**Outcome:**
- Lisa receives burger in 18 minutes (priority)
- Gets automatic refund for missing item
- James receives full delivery payment + priority bonus
- Restaurant flagged for order accuracy review

---

## Rideshare Use Cases

### Use Case 1: Standard Ride with $2 Platform Fee

**Actor:** Customer (David)

**Scenario:**
David needs a ride from downtown to the airport.

**Flow:**
1. David opens the app and switches to "Rides" tab
2. He enters:
   - Pickup: "123 Main St, Downtown"
   - Dropoff: "City International Airport"
3. App calculates:
   - Distance: 15.2 miles
   - Estimated fare: **$18.00** (goes to driver)
   - Platform fee: **$1.00** (David) + **$1.00** (Driver)
   - **David pays: $19.00**
   - **Driver receives: $17.00**

4. David confirms the ride request
5. Request goes to nearby drivers

**Driver Side (Maria):**
- Maria (in Rideshare mode) sees the request
- Shows: Downtown → Airport, 15.2 mi, **$17.00 earnings**
- Maria accepts the ride
- She navigates to David's pickup location

**Ride Progress:**
1. Maria arrives → David gets "Driver Arrived" notification
2. David gets in → Maria marks "Passenger Picked Up"
3. Maria navigates to airport
4. Arrival → Maria marks "Ride Complete"
5. Payment automatically processed

**Comparison to Uber:**
| Platform | Fare | Platform Fee | Customer Pays | Driver Gets |
|----------|------|--------------|---------------|-------------|
| **Dollor AI** | $18.00 | $2.00 total | $19.00 | $17.00 |
| Uber | $18.00 | $5.40 (30%) | $23.40 | $12.60 |
| Lyft | $18.00 | $4.50 (25%) | $22.50 | $13.50 |

**Outcome:** David saves $4+ compared to Uber, Maria earns $4+ more.

---

### Use Case 2: Fare Negotiation (Unique Feature)

**Actor:** Customer (Emma), Driver (Carlos)

**Scenario:**
Emma needs a ride but thinks the suggested fare is too high during surge period.

**Flow:**
1. Emma requests a ride:
   - Pickup: "University Campus"
   - Dropoff: "Shopping Mall" (5.2 miles)
2. App suggests surge fare: **$22.00** (high demand)
3. Emma sets her **budget: $15.00**
4. She submits ride request with her offer

**Negotiation Process:**

**Round 1:**
- Carlos sees the request: "$15 offer for 5.2 mi ride"
- He thinks it's too low
- Carlos submits **counter-offer: $20.00**
- Emma receives notification: "Driver offered $20"

**Round 2:**
- Emma can:
  - ✅ Accept $20
  - 💬 Counter with another amount
  - ❌ Cancel and try another driver
- Emma submits **counter-offer: $17.00**
- Carlos receives: "Customer offered $17"

**Round 3:**
- Carlos accepts $17.00
- Fare is locked in

**Final Breakdown:**
- Agreed fare: $17.00
- Platform fee: $1 (Emma) + $1 (Carlos) = $2
- **Emma pays: $18.00**
- **Carlos receives: $16.00**

**Both Sides Win:**
- Emma: Pays less than surge price
- Carlos: Gets a fare he's comfortable with
- Platform: Fair $2 fee regardless of fare amount

**Outcome:** Ride completes successfully at negotiated price.

---

### Use Case 3: Ride Cancellation with Tiered Fees

**Actor:** Customer (Alex), Driver (Nina)

**Scenario:**
Alex requests a ride but circumstances change.

**Cancellation Fee Schedule:**
| Timing | Fee | Reason |
|--------|-----|--------|
| Within 2 minutes | **FREE** | No driver assigned yet |
| After driver assigned | **$5** | Driver already en route to pickup |
| After driver arrives/en route | **$10** | Significant driver commitment |

---

**Scenario A: Free Cancellation**
1. Alex requests ride at 3:00 PM
2. At 3:01 PM (1 minute later), Alex realizes he doesn't need the ride
3. Alex cancels → **No fee charged**
4. No driver was assigned yet

---

**Scenario B: $5 Cancellation**
1. Alex requests ride at 3:00 PM
2. Nina accepts at 3:01 PM, starts driving to pickup
3. At 3:04 PM, Alex cancels (meeting got rescheduled)
4. App shows: "Cancellation fee: $5 (Driver was en route)"
5. Alex confirms cancellation
6. **$5 charged to Alex, $4 goes to Nina** (compensation for time/gas)

---

**Scenario C: $10 Cancellation (Driver Arrived)**
1. Alex requests ride at 3:00 PM
2. Nina accepts and drives 10 minutes to pickup
3. Nina arrives at 3:12 PM, marks "Arrived"
4. Alex is nowhere to be found
5. After 5-minute wait, Alex messages: "Sorry, got picked up by friend"
6. Alex cancels → **$10 fee charged**
7. **$9 goes to Nina** for wasted trip

**Driver Protection:**
- Nina's time is compensated
- Her driver rating is not affected
- Cancellation reason logged for future reference

---

## Platform Advantages Summary

### For Customers:
1. **Lower fees** - Only $1 platform fee vs $5-10+ on competitors
2. **Fare negotiation** - Set your budget, negotiate with drivers
3. **Transparent pricing** - Know exactly where your money goes
4. **Multi-service** - Food delivery + rideshare in one app

### For Drivers:
1. **Higher earnings** - Keep 95%+ of fare vs 70-75% on competitors
2. **Dual income modes** - Switch between delivery and rideshare
3. **Fair cancellation compensation** - Get paid when customers cancel late
4. **Negotiation power** - Accept fares that work for you

### For Restaurants:
1. **Lower commission** - Competitive rates vs DoorDash/UberEats
2. **Direct customer relationship** - Own your customer data
3. **AI Employees** - Automated order management
4. **Real-time analytics** - Track performance and trends

---

## Technical Implementation Notes

### API Endpoints Used:

**Food Delivery:**
```
POST /api/orders - Create order
GET /api/orders/{id}/status - Track order
PUT /api/delivery/orders/{id}/accept - Driver accepts
PUT /api/delivery/orders/{id}/pickup - Mark picked up
PUT /api/delivery/orders/{id}/complete - Mark delivered
```

**Rideshare:**
```
POST /api/rides - Request ride
POST /api/rides/{id}/negotiate - Submit fare offer
PUT /api/rides/{id}/accept - Driver accepts
PUT /api/rides/{id}/pickup - Passenger picked up
PUT /api/rides/{id}/complete - Ride complete
DELETE /api/rides/{id} - Cancel ride
POST /api/rides/{id}/payment-intent - Stripe payment
```

**Real-time Updates:**
- Polling every 10 seconds for status updates
- Push notifications via FCM for critical events
- Driver location updates every 5 seconds during active delivery/ride
