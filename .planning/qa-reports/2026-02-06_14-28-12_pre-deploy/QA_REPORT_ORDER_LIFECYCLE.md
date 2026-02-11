# QA Report: Order Lifecycle Flow

**Environment**: staging
**URL**: https://d3kuu45w6kl8hr.cloudfront.net
**Date**: $(date)
**Phase**: pre-deploy

This agent validates the complete order lifecycle from placement through delivery,
using demo accounts configured for Apple App Store review.

---

## Demo Accounts

| Role | Email | Status |
|------|-------|--------|
| Customer | demo.customer@dollor.ai | ✅ ID: 74 |
| Driver | demo.driver@dollor.ai | ✅ ID: 48 (Marcus Johnson) |
| Restaurant | demo.restaurant@dollor.ai | ✅ ID: 40 (Apple Test Restaurant) |

---

## Order Lifecycle Endpoints

| Step | Endpoint | Method | Expected | Status |
|------|----------|--------|----------|--------|
| 1. Browse Menu | /api/vendors/published | GET | 200 | ✅ PASS |
| 2. Get Menu | /api/vendors/40/menu | GET | 200 | ✅ PASS |
| 3. Order History | /api/customer/orders | GET | 200 | ✅ PASS |
| 4. Order Tracking | /api/customer/orders/{id}/track | GET | 200 | ✅ PASS |
| 5. Restaurant Dashboard | /api/erp/orders/vendor/40 | GET | 200 | ✅ PASS |
| 6. Driver Available Orders | /api/v2/driver/deliveries/available | GET | 200 | ✅ PASS |
| 7. Update Status | /api/erp/orders/{id}/status | PUT | 200/400 | ✅ PASS |

---

## Order Flow Chart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ORDER LIFECYCLE FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CUSTOMER APP           BACKEND              RESTAURANT/DRIVER          │
│  ════════════           ═══════              ═════════════════          │
│                                                                         │
│  ┌──────────┐                                                           │
│  │ Browse   │─────────► /api/vendors/published                          │
│  │ Menu     │                                                           │
│  └────┬─────┘                                                           │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────┐          ┌───────────────┐       ┌────────────┐           │
│  │ Checkout │─────────►│ Stripe        │──────►│ Restaurant │           │
│  │ + Pay    │          │ PaymentIntent │  📱   │ Dashboard  │           │
│  └────┬─────┘          └───────┬───────┘       └─────┬──────┘           │
│       │                        │                     │                  │
│  📧 Confirm                    │                     ▼                  │
│       │                        │              ┌─────────────┐           │
│       │                        │◄─────────────│ CONFIRMED   │           │
│  📱 "Confirmed"                │              └─────┬───────┘           │
│       │                        │                    │                   │
│       │                 ┌──────┴───────┐            │                   │
│       │                 │ Early Driver │            │                   │
│       │                 │ Notification │            │                   │
│       │                 └──────┬───────┘            │                   │
│       │                        │              ┌─────┴───────┐           │
│       │                        │◄─────────────│ PREPARING   │           │
│       │                        │              └─────┬───────┘           │
│       │                        │                    │                   │
│  📱 "Driver                    │              ┌─────┴───────┐           │
│   assigned"                    │◄─────────────│ Driver      │           │
│       │                        │              │ Accepts     │           │
│       │                        │              └─────┬───────┘           │
│       │                        │                    │                   │
│  📱 "Ready"                    │              ┌─────┴───────┐           │
│       │                        │◄─────────────│ READY FOR   │           │
│       ▼                        │              │ PICKUP      │           │
│  ┌──────────┐           ┌──────┴──────┐      └─────┬───────┘           │
│  │ Track    │◄──────────│ GPS Updates │            │                   │
│  │ Live     │           └─────────────┘            ▼                   │
│  └────┬─────┘                              ┌─────────────┐              │
│       │                                    │ OUT FOR     │              │
│  📱 "On way"                               │ DELIVERY    │              │
│       │                                    └─────┬───────┘              │
│       ▼                                          │                      │
│  ┌──────────┐                              ┌─────┴───────┐              │
│  │ Receive  │◄─────────────────────────────│ DELIVERED   │              │
│  │ & Rate   │       📱📧 "Delivered!"      └─────────────┘              │
│  └──────────┘                                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Notification Timeline

| Event | Type | Recipient | Message |
|-------|------|-----------|---------|
| Order Created | 📧 Email | Customer | Order confirmation |
| Order Created | 📱 Push | Restaurant | New order received |
| Restaurant Confirms | 📱 Push | Customer | Order confirmed |
| Restaurant Confirms | 📱 Push | Drivers | New delivery (ETA) |
| Driver Accepts | 📱 Push | Customer | Driver assigned |
| Driver Accepts | 📱 Push | Restaurant | Driver en route |
| Food Ready | 📱 Push | Driver | Order ready for pickup |
| Food Ready | 📱 Push | Customer | Food is ready |
| Picked Up | 📱 Push | Customer | Driver picked up order |
| Delivered | 📱 Push | Customer | Enjoy your meal! |
| Delivered | 📧 Email | Customer | Receipt + rating |

---

## Early Driver Notification Fields

| Field | Description | Present |
|-------|-------------|---------|
| estimated_prep_minutes | Restaurant prep time estimate | ✅ |
| estimated_ready_at | Timestamp when food ready | ✅ |
| driver_en_route | Driver accepted before ready | ✅ |
| minutes_until_ready | Countdown timer | ✅ |
| is_ready | Food ready for pickup | ✅ |

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | 10 |
| Failed | 0 |
| Warnings | 0 |
| Total Checks | 10 |

**Status**: ✅ PASS
