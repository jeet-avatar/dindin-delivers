---
created: 2026-03-14T00:00:00Z
title: "main_new.py chat IDOR — verify sender identity and order participation"
area: security/idor
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/main_new.py
---

## Problem

Chat endpoints in `main_new.py` accept `sender_id` from the request body without verifying it matches the authenticated user. Any authenticated user can:
1. Send messages impersonating any other user
2. Read chat messages from any order they're not part of

## Affected Endpoints

| Endpoint | Line (approx) | Issue |
|----------|------|-------|
| `POST /api/chat/send` | ~17795 | Accepts `sender_id` from body — no verification against auth token |
| `GET /api/chat/messages/{order_id}` | ~17861 | No check that user is an order participant |
| `POST /api/chat/messages/{ride_id}` | stub | No auth participant check |
| `GET /api/customer/orders/{id}/chat` | ~15769 | No customer ownership check |
| `POST /api/customer/orders/{id}/chat` | ~15800 | No customer ownership check |
| `GET /api/p2p/ride-requests/{id}/chat` | ~15700 | No ride participant check |

## Solution

1. For `POST /api/chat/send`: Extract user ID from JWT token, use THAT as sender_id instead of accepting from body
2. For all chat read endpoints: Look up the order/ride, verify the authenticated user is a participant (customer_id, vendor_id, or driver_id matches)
3. Ignore `sender_id` from request body entirely — always use the authenticated identity
