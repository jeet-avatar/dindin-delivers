# EatFair Enterprise Architecture - Millions of Users

## Executive Summary

This document outlines the enterprise-level architecture to scale EatFair to **millions of concurrent users** while maintaining sub-100ms response times and 99.99% uptime.

---

## Current vs Target Architecture

### Current State (Handles ~10K users)
```
┌─────────────────────────────────────────────────────────────┐
│                      CURRENT ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   iOS Apps ──────────────► Firestore (Direct Connection)    │
│      │                          │                            │
│      └──────────────────► Cloud Functions (Event Triggers)  │
│                                 │                            │
│                                 ▼                            │
│                          Stripe / FCM                        │
│                                                              │
│   Problems:                                                  │
│   • No caching layer                                         │
│   • Full collection scans                                    │
│   • No pagination                                            │
│   • Client-side metric calculations                          │
│   • Single region deployment                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Target State (Handles 10M+ users)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENTERPRISE ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Customer App │    │Restaurant App│    │  Driver App  │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │              CLOUD LOAD BALANCER (Global)               │                │
│  │                    (Cloud Armor WAF)                    │                │
│  └─────────────────────────┬───────────────────────────────┘                │
│                            │                                                 │
│         ┌──────────────────┼──────────────────┐                             │
│         ▼                  ▼                  ▼                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │ API Gateway │    │ API Gateway │    │ API Gateway │  (Cloud Run)        │
│  │  Region US  │    │  Region EU  │    │ Region Asia │                      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         │                  │                  │                             │
│         └──────────────────┼──────────────────┘                             │
│                            ▼                                                 │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │                    REDIS CLUSTER                         │                │
│  │              (Memorystore - Multi-Region)               │                │
│  │   • Session Cache  • Rate Limiting  • Real-time Data   │                │
│  └─────────────────────────┬───────────────────────────────┘                │
│                            │                                                 │
│         ┌──────────────────┼──────────────────┐                             │
│         ▼                  ▼                  ▼                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │   Order     │    │   Driver    │    │  Analytics  │   MICROSERVICES     │
│  │  Service    │    │  Service    │    │   Service   │   (Cloud Run)       │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         │                  │                  │                             │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐                      │
│  │  Payment    │    │  Location   │    │  Metrics    │                      │
│  │  Service    │    │  Service    │    │  Service    │                      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         │                  │                  │                             │
│         └──────────────────┼──────────────────┘                             │
│                            ▼                                                 │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │                   CLOUD PUB/SUB                          │                │
│  │    (Event Bus - Decouples Services, Enables Scaling)    │                │
│  └─────────────────────────┬───────────────────────────────┘                │
│                            │                                                 │
│         ┌──────────────────┼──────────────────┐                             │
│         ▼                  ▼                  ▼                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │  Firestore  │    │  BigQuery   │    │Cloud Storage│   DATA LAYER        │
│  │  (Hot Data) │    │ (Analytics) │    │  (Archive)  │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure - Enterprise Monorepo

```
eatfair/
├── apps/                           # All client applications
│   ├── ios/
│   │   ├── customer/               # Customer iOS app
│   │   ├── restaurant/             # Restaurant iOS app
│   │   ├── delivery/               # Driver iOS app
│   │   └── shared/                 # EatFairShared Swift Package
│   ├── android/                    # Future Android apps
│   │   ├── customer/
│   │   ├── restaurant/
│   │   └── delivery/
│   └── web/
│       ├── admin/                  # Admin dashboard (React)
│       └── p2p-platform/           # Accounting platform
│
├── services/                       # Microservices (Cloud Run)
│   ├── api-gateway/                # Central API Gateway
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── validation.ts
│   │   │   ├── routes/
│   │   │   │   ├── orders.ts
│   │   │   │   ├── drivers.ts
│   │   │   │   ├── restaurants.ts
│   │   │   │   └── payments.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── order-service/              # Order management
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── createOrder.ts
│   │   │   │   ├── updateStatus.ts
│   │   │   │   └── cancelOrder.ts
│   │   │   ├── validators/
│   │   │   ├── events/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── driver-service/             # Driver management & dispatch
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── dispatch.ts
│   │   │   │   ├── location.ts
│   │   │   │   └── metrics.ts
│   │   │   ├── algorithms/
│   │   │   │   └── smartDispatch.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── payment-service/            # Stripe integration
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── createPayment.ts
│   │   │   │   ├── processRefund.ts
│   │   │   │   └── webhooks.ts
│   │   │   ├── stripe/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── notification-service/       # Push & Email
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── push.ts
│   │   │   │   ├── email.ts
│   │   │   │   └── sms.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── analytics-service/          # Metrics & Reporting
│   │   ├── src/
│   │   │   ├── aggregators/
│   │   │   │   ├── driverMetrics.ts
│   │   │   │   ├── restaurantMetrics.ts
│   │   │   │   └── platformMetrics.ts
│   │   │   ├── exporters/
│   │   │   │   └── bigquery.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── ai-service/                 # Ollama/Qwen AI
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── orderValidation.ts
│   │   │   │   ├── fraudDetection.ts
│   │   │   │   ├── driverDispatch.ts
│   │   │   │   └── customerSupport.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── location-service/           # Real-time tracking
│       ├── src/
│       │   ├── handlers/
│       │   │   ├── updateLocation.ts
│       │   │   ├── calculateETA.ts
│       │   │   └── geofence.ts
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
│
├── packages/                       # Shared packages (npm workspaces)
│   ├── shared-types/               # TypeScript types
│   │   ├── src/
│   │   │   ├── order.ts
│   │   │   ├── driver.ts
│   │   │   ├── restaurant.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-utils/               # Common utilities
│   │   ├── src/
│   │   │   ├── distance.ts
│   │   │   ├── currency.ts
│   │   │   └── validation.ts
│   │   └── package.json
│   │
│   ├── firebase-admin/             # Firebase Admin wrapper
│   │   ├── src/
│   │   │   ├── firestore.ts
│   │   │   ├── auth.ts
│   │   │   └── messaging.ts
│   │   └── package.json
│   │
│   └── redis-client/               # Redis wrapper
│       ├── src/
│       │   ├── cache.ts
│       │   ├── rateLimit.ts
│       │   └── pubsub.ts
│       └── package.json
│
├── infrastructure/                 # IaC (Terraform/Pulumi)
│   ├── terraform/
│   │   ├── environments/
│   │   │   ├── dev/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   ├── modules/
│   │   │   ├── cloud-run/
│   │   │   ├── firestore/
│   │   │   ├── redis/
│   │   │   ├── pubsub/
│   │   │   └── load-balancer/
│   │   └── main.tf
│   │
│   ├── kubernetes/                 # K8s configs (if needed)
│   │   ├── deployments/
│   │   ├── services/
│   │   └── ingress/
│   │
│   └── docker/
│       ├── base-images/
│       └── docker-compose.yml
│
├── functions/                      # Firebase Cloud Functions (triggers only)
│   ├── src/
│   │   ├── triggers/
│   │   │   ├── onOrderCreated.ts
│   │   │   ├── onOrderUpdated.ts
│   │   │   ├── onDriverLocationChanged.ts
│   │   │   └── onPaymentReceived.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── scripts/                        # DevOps & utilities
│   ├── deploy/
│   │   ├── deploy-all.sh
│   │   ├── deploy-service.sh
│   │   └── rollback.sh
│   ├── database/
│   │   ├── seed-data.js
│   │   ├── migrate.js
│   │   └── backup.sh
│   └── monitoring/
│       ├── setup-alerts.sh
│       └── health-check.sh
│
├── docs/                           # Documentation
│   ├── architecture/
│   ├── api/
│   ├── runbooks/
│   └── onboarding/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json                    # Root package.json (workspaces)
├── turbo.json                      # Turborepo config
└── README.md
```

---

## Technology Decisions

### 1. API Gateway (Cloud Run)
```typescript
// services/api-gateway/src/index.ts
import express from 'express';
import { rateLimit } from './middleware/rateLimit';
import { authenticate } from './middleware/auth';
import { validateRequest } from './middleware/validation';

const app = express();

// Global middleware
app.use(rateLimit({ windowMs: 60000, max: 100 })); // 100 req/min
app.use(authenticate);
app.use(validateRequest);

// Route to microservices
app.use('/api/v1/orders', proxy('order-service'));
app.use('/api/v1/drivers', proxy('driver-service'));
app.use('/api/v1/payments', proxy('payment-service'));
app.use('/api/v1/analytics', proxy('analytics-service'));
```

### 2. Redis Caching Layer
```typescript
// packages/redis-client/src/cache.ts
export class CacheService {
  // Driver metrics - cached for 5 minutes
  async getDriverMetrics(driverId: string): Promise<DriverMetrics> {
    const cached = await redis.get(`driver:${driverId}:metrics`);
    if (cached) return JSON.parse(cached);

    const metrics = await this.calculateMetrics(driverId);
    await redis.setex(`driver:${driverId}:metrics`, 300, JSON.stringify(metrics));
    return metrics;
  }

  // Restaurant menu - cached for 1 hour
  async getRestaurantMenu(restaurantId: string): Promise<Menu> {
    const cached = await redis.get(`restaurant:${restaurantId}:menu`);
    if (cached) return JSON.parse(cached);

    const menu = await firestore.collection('restaurants').doc(restaurantId).get();
    await redis.setex(`restaurant:${restaurantId}:menu`, 3600, JSON.stringify(menu.data()));
    return menu.data() as Menu;
  }

  // Real-time driver locations - cached for 10 seconds
  async getActiveDriverLocations(region: string): Promise<DriverLocation[]> {
    return redis.georadius(`drivers:${region}:locations`, lng, lat, 10, 'km');
  }
}
```

### 3. Pub/Sub Event Bus
```typescript
// packages/shared-utils/src/events.ts
export enum EventType {
  ORDER_CREATED = 'order.created',
  ORDER_ACCEPTED = 'order.accepted',
  ORDER_READY = 'order.ready',
  ORDER_PICKED_UP = 'order.picked_up',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  DRIVER_LOCATION_UPDATED = 'driver.location.updated',
  PAYMENT_RECEIVED = 'payment.received',
  PAYOUT_PROCESSED = 'payout.processed',
}

// services/order-service/src/handlers/createOrder.ts
export async function createOrder(req: Request, res: Response) {
  const order = await orderRepository.create(req.body);

  // Publish event - other services react
  await pubsub.publish(EventType.ORDER_CREATED, {
    orderId: order.id,
    restaurantId: order.restaurantId,
    customerId: order.customerId,
    total: order.total,
    timestamp: Date.now(),
  });

  return res.json(order);
}

// services/notification-service/src/subscribers/orderEvents.ts
pubsub.subscribe(EventType.ORDER_CREATED, async (event) => {
  // Send push to restaurant
  await sendPush(event.restaurantId, 'restaurant', {
    title: 'New Order!',
    body: `Order #${event.orderId.slice(-6)} - $${event.total}`,
  });

  // Send confirmation to customer
  await sendPush(event.customerId, 'customer', {
    title: 'Order Confirmed',
    body: 'Your order has been placed!',
  });
});
```

### 4. Driver Metrics Aggregation
```typescript
// services/analytics-service/src/aggregators/driverMetrics.ts
export class DriverMetricsAggregator {
  // Run every 5 minutes via Cloud Scheduler
  async aggregateAllDriverMetrics() {
    const drivers = await firestore.collection('drivers')
      .where('isActive', '==', true)
      .get();

    const batch = firestore.batch();

    for (const driver of drivers.docs) {
      const metrics = await this.calculateMetrics(driver.id);

      // Update driver document with pre-calculated metrics
      batch.update(driver.ref, {
        cachedMetrics: metrics,
        metricsUpdatedAt: FieldValue.serverTimestamp(),
      });

      // Also cache in Redis for fast access
      await redis.setex(
        `driver:${driver.id}:metrics`,
        300,
        JSON.stringify(metrics)
      );
    }

    await batch.commit();
  }

  private async calculateMetrics(driverId: string): Promise<DriverMetrics> {
    const [orders, sessions, ratings] = await Promise.all([
      this.getOrderStats(driverId),
      this.getSessionStats(driverId),
      this.getRatingStats(driverId),
    ]);

    return {
      totalDeliveries: orders.total,
      weeklyDeliveries: orders.weekly,
      completionRate: orders.completed / orders.total * 100,
      acceptanceRate: orders.accepted / orders.offered * 100,
      averageRating: ratings.average,
      totalRatings: ratings.count,
      weeklyEarnings: orders.weeklyEarnings,
      totalEarnings: orders.totalEarnings,
      weeklyOnlineHours: sessions.weeklyHours,
      totalOnlineHours: sessions.totalHours,
      weeklyDistance: orders.weeklyDistance,
    };
  }
}
```

---

## Scaling Strategies

### 1. Database Sharding (Firestore)
```
orders/
├── orders_2024_01/     # Monthly sharding
├── orders_2024_02/
├── orders_2024_03/
└── orders_current/     # Hot data (last 7 days)

Archive Strategy:
- Orders older than 7 days → orders_YYYY_MM collection
- Orders older than 90 days → BigQuery + Cloud Storage
- Reduces Firestore costs by 80%
```

### 2. Connection Pooling
```typescript
// packages/firebase-admin/src/firestore.ts
class FirestorePool {
  private pool: Firestore[];
  private current = 0;

  constructor(size: number = 10) {
    this.pool = Array(size).fill(null).map(() =>
      admin.initializeApp(config, `app-${Date.now()}`).firestore()
    );
  }

  getConnection(): Firestore {
    const conn = this.pool[this.current];
    this.current = (this.current + 1) % this.pool.length;
    return conn;
  }
}
```

### 3. Rate Limiting
```typescript
// services/api-gateway/src/middleware/rateLimit.ts
export const rateLimits = {
  // Per user limits
  user: {
    orders: { windowMs: 60000, max: 10 },      // 10 orders/min
    locations: { windowMs: 1000, max: 2 },     // 2 location updates/sec
    general: { windowMs: 60000, max: 100 },    // 100 requests/min
  },
  // Per restaurant limits
  restaurant: {
    menuUpdates: { windowMs: 60000, max: 20 }, // 20 menu updates/min
    statusUpdates: { windowMs: 1000, max: 10 }, // 10 status updates/sec
  },
  // Global limits
  global: {
    unauthenticated: { windowMs: 60000, max: 20 },
  },
};
```

### 4. Circuit Breaker Pattern
```typescript
// packages/shared-utils/src/circuitBreaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailure: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > 30000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

---

## Deployment Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm run test:all

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api-gateway, order-service, driver-service, payment-service]
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker image
        run: |
          docker build -t gcr.io/$PROJECT_ID/${{ matrix.service }}:${{ github.sha }} \
            ./services/${{ matrix.service }}
          docker push gcr.io/$PROJECT_ID/${{ matrix.service }}:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Cloud Run
        run: |
          for service in api-gateway order-service driver-service payment-service; do
            gcloud run deploy $service \
              --image gcr.io/$PROJECT_ID/$service:${{ github.sha }} \
              --region us-central1 \
              --min-instances 2 \
              --max-instances 100 \
              --memory 1Gi \
              --cpu 2
          done
```

---

## Cost Optimization

### Estimated Costs at Scale

| Users | Firestore | Cloud Run | Redis | Pub/Sub | Total/Month |
|-------|-----------|-----------|-------|---------|-------------|
| 10K | $50 | $100 | $50 | $10 | ~$200 |
| 100K | $500 | $500 | $200 | $50 | ~$1,250 |
| 1M | $2,000 | $2,000 | $500 | $200 | ~$5,000 |
| 10M | $10,000 | $10,000 | $2,000 | $1,000 | ~$25,000 |

### Cost Reduction Strategies
1. **Caching**: Reduces Firestore reads by 70%
2. **Aggregation**: Pre-calculate metrics instead of on-demand
3. **Archival**: Move old data to cheaper storage
4. **Auto-scaling**: Scale down during off-peak hours
5. **Reserved capacity**: 30% discount for committed use

---

## Monitoring & Observability

```typescript
// packages/shared-utils/src/monitoring.ts
import { Monitoring } from '@google-cloud/monitoring';

export const metrics = {
  orderLatency: new Histogram('order_processing_latency_ms'),
  activeDrivers: new Gauge('active_drivers_count'),
  ordersPerMinute: new Counter('orders_per_minute'),
  paymentErrors: new Counter('payment_errors'),
  cacheHitRate: new Gauge('cache_hit_rate'),
};

// Alert thresholds
export const alerts = {
  orderLatency: { warn: 500, critical: 2000 },  // ms
  errorRate: { warn: 1, critical: 5 },          // %
  activeDrivers: { min: 10 },                   // minimum drivers
  cacheHitRate: { min: 80 },                    // %
};
```

---

## Migration Path

### Phase 1: Foundation (Week 1-2)
- [ ] Set up monorepo structure
- [ ] Create shared packages
- [ ] Deploy Redis cluster
- [ ] Set up Pub/Sub topics

### Phase 2: API Gateway (Week 3-4)
- [ ] Build API Gateway service
- [ ] Implement authentication middleware
- [ ] Add rate limiting
- [ ] Deploy to Cloud Run

### Phase 3: Microservices (Week 5-8)
- [ ] Extract order-service from Cloud Functions
- [ ] Extract driver-service
- [ ] Extract payment-service
- [ ] Extract notification-service

### Phase 4: Optimization (Week 9-10)
- [ ] Implement caching layer
- [ ] Add metrics aggregation
- [ ] Set up monitoring/alerts
- [ ] Performance testing

### Phase 5: Multi-Region (Week 11-12)
- [ ] Deploy to EU region
- [ ] Deploy to Asia region
- [ ] Set up global load balancer
- [ ] Test failover

---

## Summary

This architecture transforms EatFair from a single-region Firebase app to a globally distributed, event-driven microservices platform capable of handling millions of concurrent users while maintaining:

- **Sub-100ms latency** via Redis caching and edge deployment
- **99.99% uptime** via multi-region deployment and circuit breakers
- **Linear cost scaling** via caching, aggregation, and archival
- **Developer productivity** via monorepo and shared packages
