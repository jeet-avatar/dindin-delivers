# EVENT-DRIVEN CQRS ARCHITECTURE

> Uber/DoorDash-level scale architecture for millions of users, thousands of concurrent orders/rides, and real-time tracking.

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EVENT-DRIVEN CQRS ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │   Mobile     │   │   Web        │   │   Partner    │   │   Admin      │      │
│  │   Apps       │   │   Portal     │   │   Apps       │   │   Portal     │      │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘      │
│         │                  │                  │                  │               │
│         └──────────────────┼──────────────────┼──────────────────┘               │
│                            │                  │                                   │
│                   ┌────────▼──────────────────▼────────┐                         │
│                   │           API GATEWAY              │                         │
│                   │    (Kong / AWS API Gateway)        │                         │
│                   └────────────────┬───────────────────┘                         │
│                                    │                                              │
│         ┌──────────────────────────┼──────────────────────────┐                  │
│         │                          │                          │                  │
│         ▼                          ▼                          ▼                  │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐              │
│  │  COMMAND    │          │   QUERY     │          │  REAL-TIME  │              │
│  │  SERVICES   │          │  SERVICES   │          │  SERVICES   │              │
│  │             │          │             │          │             │              │
│  │ • Orders    │          │ • Search    │          │ • Location  │              │
│  │ • Rides     │          │ • Menu      │          │ • Tracking  │              │
│  │ • Payments  │          │ • Profile   │          │ • WebSocket │              │
│  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘              │
│         │                        │                        │                      │
│         │   ┌────────────────────┼────────────────────────┘                      │
│         │   │                    │                                               │
│         ▼   ▼                    ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │                      APACHE KAFKA                                    │        │
│  │                   (Event Bus / Stream)                               │        │
│  │                                                                      │        │
│  │  Topics:                                                             │        │
│  │  • orders.created, orders.updated, orders.completed                  │        │
│  │  • rides.requested, rides.matched, rides.completed                   │        │
│  │  • payments.processed, payments.failed                               │        │
│  │  • drivers.location, drivers.status                                  │        │
│  │  • notifications.send                                                │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│         │                        │                        │                      │
│         ▼                        ▼                        ▼                      │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐              │
│  │ PostgreSQL  │          │ Elasticsearch│          │  Redis Geo  │              │
│  │  (Commands) │          │  (Queries)   │          │ (Location)  │              │
│  │             │          │              │          │             │              │
│  │ • Orders    │          │ • Search     │          │ • Driver    │              │
│  │ • Rides     │          │ • Menu       │          │   Positions │              │
│  │ • Users     │          │ • Analytics  │          │ • H3 Index  │              │
│  └─────────────┘          └─────────────┘          └─────────────┘              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## CQRS PATTERN IMPLEMENTATION

```
┌─────────────────────────────────────────────────────────────────┐
│                     CQRS FOR ORDER SERVICE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COMMAND SIDE                    │    QUERY SIDE                 │
│  (Write Operations)              │    (Read Operations)          │
│                                  │                               │
│  ┌────────────────────┐          │    ┌────────────────────┐    │
│  │ CreateOrderCommand │          │    │ GetOrderQuery      │    │
│  │ UpdateOrderCommand │          │    │ ListOrdersQuery    │    │
│  │ CancelOrderCommand │          │    │ SearchOrdersQuery  │    │
│  └─────────┬──────────┘          │    └─────────┬──────────┘    │
│            │                     │              │                │
│            ▼                     │              ▼                │
│  ┌────────────────────┐          │    ┌────────────────────┐    │
│  │  Command Handler   │          │    │   Query Handler    │    │
│  │  (Business Logic)  │          │    │   (Read Model)     │    │
│  └─────────┬──────────┘          │    └─────────┬──────────┘    │
│            │                     │              │                │
│            ▼                     │              ▼                │
│  ┌────────────────────┐          │    ┌────────────────────┐    │
│  │  PostgreSQL        │──Events──┼───▶│  Elasticsearch     │    │
│  │  (Event Store)     │   via    │    │  (Read Replica)    │    │
│  │                    │  Kafka   │    │                    │    │
│  └────────────────────┘          │    └────────────────────┘    │
│                                  │                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## EVENT STORE WITH OUTBOX PATTERN

```
┌─────────────────────────────────────────────────────────────────┐
│                     OUTBOX PATTERN                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Command arrives                                              │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  BEGIN TRANSACTION                                  │         │
│  │  ├── INSERT INTO orders (...)                       │         │
│  │  ├── INSERT INTO event_outbox (event_data)          │         │
│  │  COMMIT                                             │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     │  (Atomic - both succeed or both fail)                     │
│     ▼                                                            │
│  2. Outbox Processor (separate process)                          │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  SELECT * FROM event_outbox WHERE published = false │         │
│  │  ├── Publish to Kafka                               │         │
│  │  ├── UPDATE event_outbox SET published = true       │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     ▼                                                            │
│  3. Event consumers update read models                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## POLYGLOT PERSISTENCE STRATEGY

| Data Type | Storage | Use Case | Scale |
|-----------|---------|----------|-------|
| **Transactional** | PostgreSQL | Orders, Rides, Users, Payments | ACID, consistency |
| **Search/Analytics** | Elasticsearch | Menu search, Order history | Full-text, aggregations |
| **Real-time Location** | Redis Geo + H3 | Driver positions, ETA | Sub-second updates |
| **Time-series** | ClickHouse | Metrics, analytics, reporting | Billions of rows |
| **Cache** | Redis | Sessions, hot data | Low latency |
| **Events** | Kafka | All domain events | High throughput |

---

## REAL-TIME LOCATION SYSTEM (H3 HEXAGONAL GRID)

```
┌─────────────────────────────────────────────────────────────────┐
│              REAL-TIME LOCATION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Driver App                                                      │
│     │                                                            │
│     │ GPS Update (every 3-5 seconds)                             │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Location Service                                   │         │
│  │  ├── Convert lat/lng to H3 hexagon (resolution 9)   │         │
│  │  ├── GEOADD driver:positions {lng} {lat} {driver_id}│         │
│  │  ├── SET driver:{id}:h3 {h3_index}                  │         │
│  │  └── Publish to Kafka: drivers.location             │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Matching Service (for new orders/rides)            │         │
│  │  ├── Get customer H3 hexagon                        │         │
│  │  ├── Find nearby H3 cells (k-ring neighbors)        │         │
│  │  ├── GEORADIUS driver:positions {lng} {lat} 5 km    │         │
│  │  └── Rank by: distance, rating, acceptance rate     │         │
│  └────────────────────────────────────────────────────┘         │
│     │                                                            │
│     ▼                                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  WebSocket Server (real-time updates)               │         │
│  │  ├── Subscribe to Kafka: drivers.location           │         │
│  │  ├── Filter by active order/ride                    │         │
│  │  └── Push to customer app via WebSocket             │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
│  H3 Hexagon Benefits:                                           │
│  • Consistent cell sizes (no distortion at poles)               │
│  • Efficient neighbor lookups (k-ring algorithm)                │
│  • Resolution 9 = ~0.1 km² cells (perfect for delivery)         │
│  • Used by Uber, DoorDash, Lyft                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## KAFKA TOPICS STRUCTURE

| Topic | Partitions | Purpose | Retention |
|-------|------------|---------|-----------|
| `orders.commands` | 12 | Order create/update/cancel commands | 7 days |
| `orders.events` | 12 | Order domain events | 30 days |
| `rides.commands` | 12 | Ride request/match/complete commands | 7 days |
| `rides.events` | 12 | Ride domain events | 30 days |
| `payments.events` | 6 | Payment processed/failed events | 90 days |
| `drivers.location` | 24 | Driver GPS updates (high volume) | 1 hour |
| `drivers.status` | 12 | Driver online/offline/busy status | 7 days |
| `notifications.send` | 6 | Push/SMS/Email triggers | 3 days |

---

## EVENT SCHEMA (CLOUDEVENTS STANDARD)

```json
{
  "specversion": "1.0",
  "type": "dollor.orders.created",
  "source": "/services/food-order-service",
  "id": "A234-1234-1234",
  "time": "2025-12-15T12:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "order_id": "ord_123",
    "customer_id": "cust_456",
    "restaurant_id": "rest_789",
    "items": [...],
    "total": 45.99
  }
}
```

---

## ERROR CODE SYSTEM

**Format**: `{SERVICE}-{CATEGORY}{NUMBER}`

| Category | Meaning | Example |
|----------|---------|---------|
| 1xx | Validation | `ORD-101` Invalid items |
| 2xx | Auth | `AUTH-201` Invalid credentials |
| 3xx | Not Found | `DRV-301` Driver not found |
| 4xx | Business Logic | `ORD-401` Cannot cancel |
| 5xx | External Service | `PAY-501` Stripe error |

### Common Error Codes

**Auth Service (AUTH):**
- `AUTH-101`: Invalid email format
- `AUTH-102`: Password too weak
- `AUTH-201`: Invalid credentials
- `AUTH-202`: Account not verified
- `AUTH-301`: User not found

**Driver Service (DRV):**
- `DRV-101`: Invalid phone format
- `DRV-103`: Email already registered
- `DRV-201`: Invalid credentials
- `DRV-202`: Account not active
- `DRV-301`: Driver not found

**Order Service (ORD):**
- `ORD-101`: Invalid items
- `ORD-102`: Restaurant closed
- `ORD-301`: Order not found
- `ORD-401`: Cannot cancel (already picked up)
- `ORD-501`: Payment failed

**Vendor Service (VENDOR):**
- `VENDOR-103`: Email already registered
- `VENDOR-104`: Restaurant name required
- `VENDOR-201`: Invalid credentials
- `VENDOR-202`: Account not approved
- `VENDOR-301`: Vendor not found

---

## IMPLEMENTATION STATUS

All phases complete:

- [x] **Phase 1**: Event Infrastructure (Kafka, Zookeeper, CloudEvents)
- [x] **Phase 2**: CQRS for Order Service (Commands, Queries, Projections)
- [x] **Phase 3**: Real-time Location (H3, Redis Geo, WebSocket, Matching)
- [x] **Phase 4**: Analytics Pipeline (ClickHouse, Materialized Views)

---

*Last Updated: December 26, 2025*
