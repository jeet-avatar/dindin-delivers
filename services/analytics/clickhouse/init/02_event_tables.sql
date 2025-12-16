-- Dollor.ai - Time-Series Event Tables
-- =====================================
-- High-performance event storage for analytics

-- =============================================================================
-- ORDER EVENTS (Time-Series)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_events.order_events
(
    event_id UUID,
    event_type LowCardinality(String),
    event_time DateTime64(3) DEFAULT now64(3),

    -- Order data
    order_id UInt64,
    customer_id UInt64,
    restaurant_id UInt64,
    driver_id Nullable(UInt64),

    -- Financial
    subtotal Decimal64(2) DEFAULT 0,
    delivery_fee Decimal64(2) DEFAULT 0,
    service_fee Decimal64(2) DEFAULT 0,
    tip Decimal64(2) DEFAULT 0,
    total Decimal64(2) DEFAULT 0,

    -- Location
    pickup_lat Float64 DEFAULT 0,
    pickup_lng Float64 DEFAULT 0,
    dropoff_lat Float64 DEFAULT 0,
    dropoff_lng Float64 DEFAULT 0,
    h3_pickup_cell String DEFAULT '',
    h3_dropoff_cell String DEFAULT '',

    -- Timing
    estimated_prep_minutes UInt16 DEFAULT 0,
    estimated_delivery_minutes UInt16 DEFAULT 0,
    actual_prep_minutes Nullable(UInt16),
    actual_delivery_minutes Nullable(UInt16),

    -- Status tracking
    old_status LowCardinality(String) DEFAULT '',
    new_status LowCardinality(String) DEFAULT '',

    -- Metadata
    platform LowCardinality(String) DEFAULT 'unknown',
    app_version String DEFAULT '',
    metadata String DEFAULT '{}',

    -- Partitioning
    event_date Date DEFAULT toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type, order_id, event_time)
TTL event_date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;


-- =============================================================================
-- DRIVER LOCATION EVENTS (High-Frequency Time-Series)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_events.driver_locations
(
    driver_id UInt64,
    timestamp DateTime64(3) DEFAULT now64(3),

    -- Position
    latitude Float64,
    longitude Float64,
    h3_cell String DEFAULT '',

    -- Movement
    heading Float32 DEFAULT 0,
    speed Float32 DEFAULT 0,
    accuracy Float32 DEFAULT 0,

    -- Status
    is_available UInt8 DEFAULT 0,
    is_on_delivery UInt8 DEFAULT 0,
    current_order_id Nullable(UInt64),

    -- Partitioning
    event_date Date DEFAULT toDate(timestamp)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(event_date)
ORDER BY (event_date, driver_id, timestamp)
TTL event_date + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;


-- =============================================================================
-- RIDE EVENTS (Time-Series)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_events.ride_events
(
    event_id UUID,
    event_type LowCardinality(String),
    event_time DateTime64(3) DEFAULT now64(3),

    -- Ride data
    ride_id UInt64,
    customer_id UInt64,
    driver_id Nullable(UInt64),

    -- Financial
    base_fare Decimal64(2) DEFAULT 0,
    distance_fare Decimal64(2) DEFAULT 0,
    time_fare Decimal64(2) DEFAULT 0,
    surge_multiplier Decimal64(2) DEFAULT 1.0,
    tip Decimal64(2) DEFAULT 0,
    total Decimal64(2) DEFAULT 0,

    -- Route
    pickup_lat Float64 DEFAULT 0,
    pickup_lng Float64 DEFAULT 0,
    dropoff_lat Float64 DEFAULT 0,
    dropoff_lng Float64 DEFAULT 0,
    distance_km Float32 DEFAULT 0,
    duration_minutes Float32 DEFAULT 0,

    -- H3 cells
    h3_pickup_cell String DEFAULT '',
    h3_dropoff_cell String DEFAULT '',

    -- Status
    old_status LowCardinality(String) DEFAULT '',
    new_status LowCardinality(String) DEFAULT '',

    -- Metadata
    ride_type LowCardinality(String) DEFAULT 'standard',
    platform LowCardinality(String) DEFAULT 'unknown',
    metadata String DEFAULT '{}',

    -- Partitioning
    event_date Date DEFAULT toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type, ride_id, event_time)
TTL event_date + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;


-- =============================================================================
-- PAYMENT EVENTS (Time-Series)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_events.payment_events
(
    event_id UUID,
    event_type LowCardinality(String),
    event_time DateTime64(3) DEFAULT now64(3),

    -- Payment data
    payment_id UInt64,
    order_id Nullable(UInt64),
    ride_id Nullable(UInt64),
    customer_id UInt64,

    -- Financial
    amount Decimal64(2),
    currency LowCardinality(String) DEFAULT 'USD',
    payment_method LowCardinality(String) DEFAULT 'card',

    -- Status
    old_status LowCardinality(String) DEFAULT '',
    new_status LowCardinality(String) DEFAULT '',

    -- Provider
    provider LowCardinality(String) DEFAULT 'stripe',
    provider_transaction_id String DEFAULT '',

    -- Metadata
    platform LowCardinality(String) DEFAULT 'unknown',
    metadata String DEFAULT '{}',

    -- Partitioning
    event_date Date DEFAULT toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type, payment_id, event_time)
TTL event_date + INTERVAL 3 YEAR
SETTINGS index_granularity = 8192;


-- =============================================================================
-- USER ACTIVITY EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_events.user_activity
(
    event_id UUID,
    event_type LowCardinality(String),
    event_time DateTime64(3) DEFAULT now64(3),

    -- User data
    user_id UInt64,
    user_type LowCardinality(String) DEFAULT 'customer',

    -- Session
    session_id String DEFAULT '',
    platform LowCardinality(String) DEFAULT 'unknown',
    device_type LowCardinality(String) DEFAULT 'unknown',
    app_version String DEFAULT '',

    -- Location
    latitude Nullable(Float64),
    longitude Nullable(Float64),
    h3_cell String DEFAULT '',

    -- Activity details
    action LowCardinality(String) DEFAULT '',
    entity_type LowCardinality(String) DEFAULT '',
    entity_id Nullable(UInt64),

    -- Metadata
    metadata String DEFAULT '{}',

    -- Partitioning
    event_date Date DEFAULT toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_type, user_id, event_time)
TTL event_date + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;


-- =============================================================================
-- SEARCH EVENTS (For Recommendations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dollor_events.search_events
(
    event_id UUID,
    event_time DateTime64(3) DEFAULT now64(3),

    -- User
    user_id UInt64,
    session_id String DEFAULT '',

    -- Search
    query String DEFAULT '',
    search_type LowCardinality(String) DEFAULT 'restaurant',
    filters String DEFAULT '{}',

    -- Results
    results_count UInt32 DEFAULT 0,
    clicked_position Nullable(UInt16),
    clicked_entity_id Nullable(UInt64),

    -- Location context
    latitude Float64 DEFAULT 0,
    longitude Float64 DEFAULT 0,

    -- Metadata
    platform LowCardinality(String) DEFAULT 'unknown',

    -- Partitioning
    event_date Date DEFAULT toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id, event_time)
TTL event_date + INTERVAL 6 MONTH
SETTINGS index_granularity = 8192;
