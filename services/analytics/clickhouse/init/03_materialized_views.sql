-- Dollor.ai - Materialized Views for Real-Time Analytics
-- ======================================================
-- Pre-aggregated metrics for dashboard performance

-- =============================================================================
-- HOURLY ORDER METRICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_analytics.orders_hourly
(
    hour DateTime,
    restaurant_id UInt64,
    h3_cell String,

    -- Counts
    total_orders UInt64,
    completed_orders UInt64,
    cancelled_orders UInt64,

    -- Revenue
    total_revenue Decimal64(2),
    total_delivery_fees Decimal64(2),
    total_tips Decimal64(2),
    avg_order_value Decimal64(2),

    -- Timing
    avg_prep_minutes Float32,
    avg_delivery_minutes Float32,
    total_prep_minutes UInt64,
    total_delivery_minutes UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, restaurant_id, h3_cell);

CREATE MATERIALIZED VIEW IF NOT EXISTS dollor_analytics.orders_hourly_mv
TO dollor_analytics.orders_hourly
AS SELECT
    toStartOfHour(event_time) AS hour,
    restaurant_id,
    h3_pickup_cell AS h3_cell,

    countIf(event_type = 'ORDER_CREATED') AS total_orders,
    countIf(new_status = 'delivered') AS completed_orders,
    countIf(new_status = 'cancelled') AS cancelled_orders,

    sumIf(total, event_type = 'ORDER_CREATED') AS total_revenue,
    sumIf(delivery_fee, event_type = 'ORDER_CREATED') AS total_delivery_fees,
    sumIf(tip, new_status = 'delivered') AS total_tips,
    avgIf(total, event_type = 'ORDER_CREATED') AS avg_order_value,

    avgIf(actual_prep_minutes, actual_prep_minutes > 0) AS avg_prep_minutes,
    avgIf(actual_delivery_minutes, actual_delivery_minutes > 0) AS avg_delivery_minutes,
    sumIf(actual_prep_minutes, actual_prep_minutes > 0) AS total_prep_minutes,
    sumIf(actual_delivery_minutes, actual_delivery_minutes > 0) AS total_delivery_minutes
FROM dollor_events.order_events
GROUP BY hour, restaurant_id, h3_cell;


-- =============================================================================
-- DAILY ORDER METRICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_analytics.orders_daily
(
    day Date,
    restaurant_id UInt64,

    -- Counts
    total_orders UInt64,
    completed_orders UInt64,
    cancelled_orders UInt64,
    unique_customers UInt64,

    -- Revenue
    total_revenue Decimal64(2),
    total_delivery_fees Decimal64(2),
    total_service_fees Decimal64(2),
    total_tips Decimal64(2),
    avg_order_value Decimal64(2),
    max_order_value Decimal64(2),

    -- Timing
    avg_prep_minutes Float32,
    avg_delivery_minutes Float32,
    p95_delivery_minutes Float32
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, restaurant_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS dollor_analytics.orders_daily_mv
TO dollor_analytics.orders_daily
AS SELECT
    toDate(event_time) AS day,
    restaurant_id,

    countIf(event_type = 'ORDER_CREATED') AS total_orders,
    countIf(new_status = 'delivered') AS completed_orders,
    countIf(new_status = 'cancelled') AS cancelled_orders,
    uniqIf(customer_id, event_type = 'ORDER_CREATED') AS unique_customers,

    sumIf(total, event_type = 'ORDER_CREATED') AS total_revenue,
    sumIf(delivery_fee, event_type = 'ORDER_CREATED') AS total_delivery_fees,
    sumIf(service_fee, event_type = 'ORDER_CREATED') AS total_service_fees,
    sumIf(tip, new_status = 'delivered') AS total_tips,
    avgIf(total, event_type = 'ORDER_CREATED') AS avg_order_value,
    maxIf(total, event_type = 'ORDER_CREATED') AS max_order_value,

    avgIf(actual_prep_minutes, actual_prep_minutes > 0) AS avg_prep_minutes,
    avgIf(actual_delivery_minutes, actual_delivery_minutes > 0) AS avg_delivery_minutes,
    quantileIf(0.95)(actual_delivery_minutes, actual_delivery_minutes > 0) AS p95_delivery_minutes
FROM dollor_events.order_events
GROUP BY day, restaurant_id;


-- =============================================================================
-- HOURLY RIDE METRICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_analytics.rides_hourly
(
    hour DateTime,
    h3_pickup_cell String,
    ride_type LowCardinality(String),

    -- Counts
    total_rides UInt64,
    completed_rides UInt64,
    cancelled_rides UInt64,

    -- Revenue
    total_revenue Decimal64(2),
    total_tips Decimal64(2),
    avg_fare Decimal64(2),
    avg_surge Decimal64(2),

    -- Distance/Duration
    total_distance_km Float64,
    total_duration_minutes Float64,
    avg_distance_km Float32,
    avg_duration_minutes Float32
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, h3_pickup_cell, ride_type);

CREATE MATERIALIZED VIEW IF NOT EXISTS dollor_analytics.rides_hourly_mv
TO dollor_analytics.rides_hourly
AS SELECT
    toStartOfHour(event_time) AS hour,
    h3_pickup_cell,
    ride_type,

    countIf(event_type = 'RIDE_REQUESTED') AS total_rides,
    countIf(new_status = 'completed') AS completed_rides,
    countIf(new_status = 'cancelled') AS cancelled_rides,

    sumIf(total, event_type = 'RIDE_REQUESTED') AS total_revenue,
    sumIf(tip, new_status = 'completed') AS total_tips,
    avgIf(total, event_type = 'RIDE_REQUESTED') AS avg_fare,
    avgIf(surge_multiplier, event_type = 'RIDE_REQUESTED') AS avg_surge,

    sumIf(distance_km, new_status = 'completed') AS total_distance_km,
    sumIf(duration_minutes, new_status = 'completed') AS total_duration_minutes,
    avgIf(distance_km, new_status = 'completed') AS avg_distance_km,
    avgIf(duration_minutes, new_status = 'completed') AS avg_duration_minutes
FROM dollor_events.ride_events
GROUP BY hour, h3_pickup_cell, ride_type;


-- =============================================================================
-- DRIVER ACTIVITY AGGREGATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_analytics.driver_activity_hourly
(
    hour DateTime,
    driver_id UInt64,
    h3_cell String,

    -- Activity
    location_updates UInt64,
    online_minutes Float32,
    available_minutes Float32,
    on_delivery_minutes Float32,

    -- Movement
    total_distance_km Float64,
    avg_speed Float32,
    max_speed Float32
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, driver_id, h3_cell);

CREATE MATERIALIZED VIEW IF NOT EXISTS dollor_analytics.driver_activity_hourly_mv
TO dollor_analytics.driver_activity_hourly
AS SELECT
    toStartOfHour(timestamp) AS hour,
    driver_id,
    h3_cell,

    count() AS location_updates,
    count() / 12.0 AS online_minutes,  -- Assuming 5-second updates
    countIf(is_available = 1) / 12.0 AS available_minutes,
    countIf(is_on_delivery = 1) / 12.0 AS on_delivery_minutes,

    -- Approximate distance from speed
    sum(speed * (1.0/12.0/60.0)) AS total_distance_km,
    avg(speed) AS avg_speed,
    max(speed) AS max_speed
FROM dollor_events.driver_locations
GROUP BY hour, driver_id, h3_cell;


-- =============================================================================
-- PAYMENT AGGREGATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_analytics.payments_daily
(
    day Date,
    payment_method LowCardinality(String),
    currency LowCardinality(String),

    -- Counts
    total_transactions UInt64,
    successful_transactions UInt64,
    failed_transactions UInt64,
    refunded_transactions UInt64,

    -- Amounts
    total_amount Decimal64(2),
    total_refunded Decimal64(2),
    avg_amount Decimal64(2),
    max_amount Decimal64(2)
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, payment_method, currency);

CREATE MATERIALIZED VIEW IF NOT EXISTS dollor_analytics.payments_daily_mv
TO dollor_analytics.payments_daily
AS SELECT
    toDate(event_time) AS day,
    payment_method,
    currency,

    countIf(event_type = 'PAYMENT_INITIATED') AS total_transactions,
    countIf(new_status = 'completed') AS successful_transactions,
    countIf(new_status = 'failed') AS failed_transactions,
    countIf(new_status = 'refunded') AS refunded_transactions,

    sumIf(amount, new_status = 'completed') AS total_amount,
    sumIf(amount, new_status = 'refunded') AS total_refunded,
    avgIf(amount, new_status = 'completed') AS avg_amount,
    maxIf(amount, new_status = 'completed') AS max_amount
FROM dollor_events.payment_events
GROUP BY day, payment_method, currency;


-- =============================================================================
-- H3 CELL HEATMAP DATA
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_analytics.h3_heatmap_hourly
(
    hour DateTime,
    h3_cell String,

    -- Demand
    order_count UInt64,
    ride_count UInt64,
    search_count UInt64,

    -- Supply
    driver_count UInt64,
    avg_available_drivers Float32,

    -- Pricing
    avg_surge Float32,
    max_surge Float32
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, h3_cell);


-- =============================================================================
-- PLATFORM HEALTH METRICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_analytics.platform_metrics_minute
(
    minute DateTime,
    platform LowCardinality(String),

    -- Active users
    active_customers UInt64,
    active_drivers UInt64,

    -- Transactions
    orders_created UInt64,
    rides_requested UInt64,
    payments_processed UInt64,

    -- Errors
    error_count UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(minute)
ORDER BY (minute, platform)
TTL minute + INTERVAL 7 DAY;
