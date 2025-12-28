-- ============================================================================
-- WYOMING TNC COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Compliance: Wyoming Statutes Title 31, Chapter 20
-- Version: 1.0.0
-- Date: December 24, 2024
-- ============================================================================

-- ============================================================================
-- 1. WYOMING DRIVERS TABLE
-- ============================================================================
-- Compliant with W.S. 31-20-106 (Driver Requirements)
-- Compliant with W.S. 31-20-107 (Insurance Requirements)
-- Compliant with W.S. 31-20-110 (Independent Contractor)

CREATE TABLE IF NOT EXISTS wyoming_drivers (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,

    -- Wyoming Address (ZIP must be 82xxx or 83xxx)
    address_street VARCHAR(255) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    address_state VARCHAR(2) DEFAULT 'WY' CHECK (address_state = 'WY'),
    address_zip VARCHAR(10) NOT NULL CHECK (
        address_zip ~ '^82[0-9]{3}$' OR
        address_zip ~ '^83[0-9]{3}$'
    ),

    -- Driver License (W.S. 31-20-106)
    license_number VARCHAR(50) NOT NULL,
    license_state VARCHAR(2) NOT NULL,
    license_expiry DATE NOT NULL,
    license_verified BOOLEAN DEFAULT FALSE,
    license_verified_at TIMESTAMP,

    -- Vehicle Information (W.S. 31-20-104)
    vehicle_make VARCHAR(100) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_year INTEGER NOT NULL CHECK (vehicle_year >= 2010),
    vehicle_color VARCHAR(50) NOT NULL,
    vehicle_license_plate VARCHAR(20) NOT NULL,
    vehicle_vin VARCHAR(17),

    -- Background Check (W.S. 31-20-106)
    background_check_status VARCHAR(20) DEFAULT 'pending'
        CHECK (background_check_status IN ('pending', 'passed', 'failed', 'expired')),
    background_check_date DATE,
    background_check_provider VARCHAR(100),
    background_check_reference VARCHAR(100),

    -- Background Check Components (W.S. 31-20-106(a))
    bg_criminal_local BOOLEAN DEFAULT FALSE,
    bg_criminal_national BOOLEAN DEFAULT FALSE,
    bg_criminal_multistate BOOLEAN DEFAULT FALSE,
    bg_sex_offender_registry BOOLEAN DEFAULT FALSE,
    bg_driving_history BOOLEAN DEFAULT FALSE,

    -- Disqualifying Factors (W.S. 31-20-106(b))
    has_violent_felony BOOLEAN DEFAULT FALSE,
    has_sexual_offense BOOLEAN DEFAULT FALSE,
    dui_within_7_years BOOLEAN DEFAULT FALSE,
    moving_violations_3_years INTEGER DEFAULT 0,

    -- Insurance (W.S. 31-20-107)
    insurance_company VARCHAR(255) NOT NULL,
    insurance_policy_number VARCHAR(100) NOT NULL,
    insurance_expiry DATE NOT NULL,
    insurance_liability_amount DECIMAL(12, 2) NOT NULL CHECK (insurance_liability_amount >= 1000000),
    insurance_is_commercial BOOLEAN DEFAULT TRUE,
    insurance_covers_tnc BOOLEAN DEFAULT TRUE,
    insurance_verified BOOLEAN DEFAULT FALSE,
    insurance_verified_at TIMESTAMP,
    insurance_document_url VARCHAR(500),

    -- Period 1 Coverage (W.S. 31-20-107(a)(i))
    insurance_period1_per_person DECIMAL(12, 2) DEFAULT 50000 CHECK (insurance_period1_per_person >= 50000),
    insurance_period1_per_incident DECIMAL(12, 2) DEFAULT 100000 CHECK (insurance_period1_per_incident >= 100000),
    insurance_period1_property DECIMAL(12, 2) DEFAULT 25000 CHECK (insurance_period1_property >= 25000),

    -- Period 2-3 Coverage (W.S. 31-20-107(a)(ii))
    insurance_period23_combined DECIMAL(12, 2) DEFAULT 1000000 CHECK (insurance_period23_combined >= 1000000),
    insurance_um_uim_coverage BOOLEAN DEFAULT TRUE,

    -- Trade Dress (W.S. 31-20-104)
    trade_dress_received BOOLEAN DEFAULT FALSE,
    trade_dress_received_at TIMESTAMP,

    -- Independent Contractor Agreement (W.S. 31-20-110)
    ic_agreement_signed BOOLEAN DEFAULT FALSE,
    ic_agreement_signed_at TIMESTAMP,
    ic_agreement_version VARCHAR(20),
    ic_agreement_document_url VARCHAR(500),

    -- Direct Payment Info (for customer to pay driver)
    payment_venmo_username VARCHAR(100),
    payment_zelle_phone VARCHAR(20),
    payment_zelle_email VARCHAR(255),
    payment_cashapp_username VARCHAR(100),
    payment_accepts_cash BOOLEAN DEFAULT TRUE,

    -- Bank Account for Payouts
    bank_account_last4 VARCHAR(4),
    bank_routing_last4 VARCHAR(4),
    stripe_account_id VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'suspended', 'deactivated')),
    approved_at TIMESTAMP,
    approved_by INTEGER,

    -- Performance
    rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
    total_rides INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Compliance Confirmation
    wyoming_tnc_compliant BOOLEAN GENERATED ALWAYS AS (
        background_check_status = 'passed' AND
        insurance_verified = TRUE AND
        ic_agreement_signed = TRUE AND
        license_verified = TRUE AND
        NOT has_violent_felony AND
        NOT has_sexual_offense AND
        NOT dui_within_7_years AND
        moving_violations_3_years <= 3 AND
        insurance_expiry > CURRENT_DATE AND
        license_expiry > CURRENT_DATE
    ) STORED
);

-- Indexes for Wyoming drivers
CREATE INDEX idx_wy_drivers_zip ON wyoming_drivers(address_zip);
CREATE INDEX idx_wy_drivers_status ON wyoming_drivers(status);
CREATE INDEX idx_wy_drivers_compliant ON wyoming_drivers(wyoming_tnc_compliant);
CREATE INDEX idx_wy_drivers_insurance_expiry ON wyoming_drivers(insurance_expiry);
CREATE INDEX idx_wy_drivers_license_expiry ON wyoming_drivers(license_expiry);

-- ============================================================================
-- 2. WYOMING RIDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wyoming_riders (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,

    -- Wyoming Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(2) DEFAULT 'WY',
    address_zip VARCHAR(10) CHECK (
        address_zip IS NULL OR
        address_zip ~ '^82[0-9]{3}$' OR
        address_zip ~ '^83[0-9]{3}$'
    ),

    -- Saved Locations
    home_address TEXT,
    home_lat DECIMAL(10, 8),
    home_lng DECIMAL(11, 8),
    work_address TEXT,
    work_lat DECIMAL(10, 8),
    work_lng DECIMAL(11, 8),

    -- Payment
    stripe_customer_id VARCHAR(100),
    default_payment_method_id VARCHAR(100),

    -- Terms Acceptance
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    terms_version VARCHAR(20),
    privacy_accepted BOOLEAN DEFAULT FALSE,
    privacy_accepted_at TIMESTAMP,
    privacy_version VARCHAR(20),

    -- Status
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deactivated')),

    -- Performance
    rating DECIMAL(3, 2) DEFAULT 5.00,
    total_rides INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wy_riders_zip ON wyoming_riders(address_zip);
CREATE INDEX idx_wy_riders_status ON wyoming_riders(status);

-- ============================================================================
-- 3. WYOMING PLATFORM FEE TIERS TABLE
-- ============================================================================
-- Distance-based pricing (NOT fare-based)

CREATE TABLE IF NOT EXISTS wyoming_platform_fee_tiers (
    id SERIAL PRIMARY KEY,
    tier_number INTEGER NOT NULL,
    tier_label VARCHAR(50) NOT NULL,
    min_miles DECIMAL(10, 2) NOT NULL,
    max_miles DECIMAL(10, 2), -- NULL means unlimited
    platform_fee DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Wyoming platform fee tiers
INSERT INTO wyoming_platform_fee_tiers (tier_number, tier_label, min_miles, max_miles, platform_fee, effective_date, is_active)
VALUES
    (1, 'Local (<10 mi)', 0.00, 9.99, 1.00, '2024-12-24', TRUE),
    (2, 'Regional (10-25 mi)', 10.00, 24.99, 2.00, '2024-12-24', TRUE),
    (3, 'Long Distance (>25 mi)', 25.00, NULL, 3.00, '2024-12-24', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. WYOMING AIRPORT FEES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wyoming_airport_fees (
    id SERIAL PRIMARY KEY,
    airport_code VARCHAR(10) NOT NULL UNIQUE,
    airport_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    fee_amount DECIMAL(10, 2) NOT NULL,
    fee_type VARCHAR(20) DEFAULT 'pickup_dropoff',
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Wyoming airport fees
INSERT INTO wyoming_airport_fees (airport_code, airport_name, city, fee_amount, effective_date, is_active)
VALUES
    ('JAC', 'Jackson Hole Airport', 'Jackson', 2.00, '2024-12-24', TRUE),
    ('CYS', 'Cheyenne Regional Airport', 'Cheyenne', 1.50, '2024-12-24', TRUE),
    ('CPR', 'Casper-Natrona County International Airport', 'Casper', 1.50, '2024-12-24', TRUE),
    ('RIW', 'Riverton Regional Airport', 'Riverton', 1.00, '2024-12-24', TRUE),
    ('SHR', 'Sheridan County Airport', 'Sheridan', 1.00, '2024-12-24', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. WYOMING RIDE REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wyoming_ride_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,

    -- Rider
    rider_id INTEGER NOT NULL REFERENCES wyoming_riders(id),

    -- Pickup Location (W.S. 31-20-105)
    pickup_address TEXT NOT NULL,
    pickup_city VARCHAR(100) NOT NULL,
    pickup_state VARCHAR(2) DEFAULT 'WY',
    pickup_zip VARCHAR(10) NOT NULL,
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,

    -- Dropoff Location (W.S. 31-20-105)
    dropoff_address TEXT NOT NULL,
    dropoff_city VARCHAR(100) NOT NULL,
    dropoff_state VARCHAR(2) DEFAULT 'WY',
    dropoff_zip VARCHAR(10) NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,

    -- Distance & Time (W.S. 31-20-105)
    distance_miles DECIMAL(10, 2) NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,

    -- Platform Fee Tier
    platform_fee_tier INTEGER NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,

    -- Airport Fee (if applicable)
    airport_code VARCHAR(10),
    airport_fee DECIMAL(10, 2) DEFAULT 0.00,

    -- Fare Disclosure (W.S. 31-20-103)
    fare_disclosed_at TIMESTAMP NOT NULL,
    fare_accepted_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'bidding', 'matched', 'in_progress', 'completed', 'cancelled')),

    -- Bidding
    bidding_expires_at TIMESTAMP,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wy_rides_status ON wyoming_ride_requests(status);
CREATE INDEX idx_wy_rides_rider ON wyoming_ride_requests(rider_id);
CREATE INDEX idx_wy_rides_pickup_zip ON wyoming_ride_requests(pickup_zip);

-- ============================================================================
-- 6. WYOMING RIDE BIDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wyoming_ride_bids (
    id SERIAL PRIMARY KEY,
    bid_id VARCHAR(50) UNIQUE NOT NULL,

    -- References
    ride_request_id INTEGER NOT NULL REFERENCES wyoming_ride_requests(id),
    driver_id INTEGER NOT NULL REFERENCES wyoming_drivers(id),

    -- Driver's Proposed Fare
    proposed_fare DECIMAL(10, 2) NOT NULL,
    message TEXT,
    estimated_arrival_minutes INTEGER NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),

    -- Timestamps
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wy_bids_ride ON wyoming_ride_bids(ride_request_id);
CREATE INDEX idx_wy_bids_driver ON wyoming_ride_bids(driver_id);
CREATE INDEX idx_wy_bids_status ON wyoming_ride_bids(status);

-- ============================================================================
-- 7. WYOMING COMPLETED RIDES TABLE
-- ============================================================================
-- Electronic Receipt Data (W.S. 31-20-105)

CREATE TABLE IF NOT EXISTS wyoming_completed_rides (
    id SERIAL PRIMARY KEY,
    ride_id VARCHAR(50) UNIQUE NOT NULL,
    receipt_id VARCHAR(50) UNIQUE NOT NULL,

    -- References
    ride_request_id INTEGER NOT NULL REFERENCES wyoming_ride_requests(id),
    rider_id INTEGER NOT NULL REFERENCES wyoming_riders(id),
    driver_id INTEGER NOT NULL REFERENCES wyoming_drivers(id),

    -- Origin (W.S. 31-20-105)
    origin_address TEXT NOT NULL,
    origin_lat DECIMAL(10, 8) NOT NULL,
    origin_lng DECIMAL(11, 8) NOT NULL,

    -- Destination (W.S. 31-20-105)
    destination_address TEXT NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,

    -- Trip Time (W.S. 31-20-105)
    trip_start_time TIMESTAMP NOT NULL,
    trip_end_time TIMESTAMP NOT NULL,
    total_time_minutes INTEGER NOT NULL,

    -- Trip Distance (W.S. 31-20-105)
    total_distance_miles DECIMAL(10, 2) NOT NULL,

    -- Itemized Fare (W.S. 31-20-105)
    base_fare DECIMAL(10, 2) NOT NULL,
    distance_charge DECIMAL(10, 2) NOT NULL,
    time_charge DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    platform_fee_tier INTEGER NOT NULL,
    airport_fee DECIMAL(10, 2) DEFAULT 0.00,
    tip_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_charged DECIMAL(10, 2) NOT NULL,

    -- Driver Earnings
    driver_fare DECIMAL(10, 2) NOT NULL,
    driver_tip DECIMAL(10, 2) DEFAULT 0.00,
    driver_total_earnings DECIMAL(10, 2) NOT NULL,

    -- Platform Revenue
    platform_revenue DECIMAL(10, 2) NOT NULL,

    -- Payment
    payment_method VARCHAR(20) NOT NULL,
    stripe_payment_intent_id VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
    payment_captured_at TIMESTAMP,

    -- Driver Payout
    driver_payout_status VARCHAR(20) DEFAULT 'pending'
        CHECK (driver_payout_status IN ('pending', 'scheduled', 'paid', 'failed')),
    driver_payout_date DATE,
    driver_payout_reference VARCHAR(100),

    -- Receipt Delivery (W.S. 31-20-105)
    receipt_sent_at TIMESTAMP NOT NULL,
    receipt_delivery_method VARCHAR(20) DEFAULT 'email',
    receipt_email VARCHAR(255),

    -- Ratings
    rider_rating_for_driver DECIMAL(3, 2),
    driver_rating_for_rider DECIMAL(3, 2),

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wy_completed_driver ON wyoming_completed_rides(driver_id);
CREATE INDEX idx_wy_completed_rider ON wyoming_completed_rides(rider_id);
CREATE INDEX idx_wy_completed_date ON wyoming_completed_rides(trip_start_time);
CREATE INDEX idx_wy_completed_payment ON wyoming_completed_rides(payment_status);

-- ============================================================================
-- 8. WYOMING DRIVER COMPLIANCE LOG
-- ============================================================================
-- Audit trail for compliance verification

CREATE TABLE IF NOT EXISTS wyoming_driver_compliance_log (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES wyoming_drivers(id),

    -- Compliance Check
    check_type VARCHAR(50) NOT NULL,
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_result VARCHAR(20) NOT NULL,
    check_details JSONB,

    -- Statute Reference
    statute_reference VARCHAR(50),

    -- Performed By
    performed_by VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wy_compliance_driver ON wyoming_driver_compliance_log(driver_id);
CREATE INDEX idx_wy_compliance_type ON wyoming_driver_compliance_log(check_type);

-- ============================================================================
-- 9. WYOMING TERMS ACCEPTANCE LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS wyoming_terms_acceptance (
    id SERIAL PRIMARY KEY,

    -- User
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('driver', 'rider')),
    user_id INTEGER NOT NULL,

    -- Document
    document_type VARCHAR(50) NOT NULL,
    document_version VARCHAR(20) NOT NULL,

    -- Acceptance
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,

    -- Acknowledgments
    acknowledged_items JSONB
);

CREATE INDEX idx_wy_terms_user ON wyoming_terms_acceptance(user_type, user_id);

-- ============================================================================
-- 10. WYOMING INSURANCE VERIFICATION LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS wyoming_insurance_verification_log (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES wyoming_drivers(id),

    -- Verification
    verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_method VARCHAR(50),
    verification_provider VARCHAR(100),
    verification_reference VARCHAR(100),

    -- Result
    is_valid BOOLEAN NOT NULL,
    policy_number VARCHAR(100),
    policy_expiry DATE,
    coverage_amount DECIMAL(12, 2),

    -- Details
    details JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wy_insurance_driver ON wyoming_insurance_verification_log(driver_id);

-- ============================================================================
-- 11. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to get platform fee based on distance
CREATE OR REPLACE FUNCTION get_wyoming_platform_fee(distance_miles DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    fee DECIMAL;
BEGIN
    SELECT platform_fee INTO fee
    FROM wyoming_platform_fee_tiers
    WHERE is_active = TRUE
      AND min_miles <= distance_miles
      AND (max_miles IS NULL OR max_miles >= distance_miles)
    LIMIT 1;

    RETURN COALESCE(fee, 3.00); -- Default to Tier 3 if not found
END;
$$ LANGUAGE plpgsql;

-- Function to validate Wyoming ZIP code
CREATE OR REPLACE FUNCTION is_wyoming_zip(zip VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN zip ~ '^82[0-9]{3}$' OR zip ~ '^83[0-9]{3}$';
END;
$$ LANGUAGE plpgsql;

-- Function to check driver compliance
CREATE OR REPLACE FUNCTION check_driver_wyoming_compliance(driver_id_param INTEGER)
RETURNS TABLE (
    is_compliant BOOLEAN,
    issues TEXT[]
) AS $$
DECLARE
    driver_record RECORD;
    issue_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT * INTO driver_record FROM wyoming_drivers WHERE id = driver_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, ARRAY['Driver not found'];
        RETURN;
    END IF;

    -- Check background (W.S. 31-20-106)
    IF driver_record.background_check_status != 'passed' THEN
        issue_list := array_append(issue_list, 'Background check not passed (W.S. 31-20-106)');
    END IF;

    -- Check insurance (W.S. 31-20-107)
    IF NOT driver_record.insurance_verified THEN
        issue_list := array_append(issue_list, 'Insurance not verified (W.S. 31-20-107)');
    END IF;

    IF driver_record.insurance_expiry <= CURRENT_DATE THEN
        issue_list := array_append(issue_list, 'Insurance expired (W.S. 31-20-107)');
    END IF;

    -- Check IC agreement (W.S. 31-20-110)
    IF NOT driver_record.ic_agreement_signed THEN
        issue_list := array_append(issue_list, 'IC agreement not signed (W.S. 31-20-110)');
    END IF;

    -- Check license
    IF driver_record.license_expiry <= CURRENT_DATE THEN
        issue_list := array_append(issue_list, 'License expired');
    END IF;

    -- Check disqualifying factors (W.S. 31-20-106(b))
    IF driver_record.has_violent_felony THEN
        issue_list := array_append(issue_list, 'Disqualified: Violent felony (W.S. 31-20-106(b))');
    END IF;

    IF driver_record.has_sexual_offense THEN
        issue_list := array_append(issue_list, 'Disqualified: Sexual offense (W.S. 31-20-106(b))');
    END IF;

    IF driver_record.dui_within_7_years THEN
        issue_list := array_append(issue_list, 'Disqualified: DUI within 7 years (W.S. 31-20-106(b))');
    END IF;

    IF driver_record.moving_violations_3_years > 3 THEN
        issue_list := array_append(issue_list, 'Disqualified: >3 moving violations in 3 years (W.S. 31-20-106(b))');
    END IF;

    RETURN QUERY SELECT (array_length(issue_list, 1) IS NULL OR array_length(issue_list, 1) = 0), issue_list;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wyoming_drivers_timestamp
    BEFORE UPDATE ON wyoming_drivers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_wyoming_riders_timestamp
    BEFORE UPDATE ON wyoming_riders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_wyoming_ride_requests_timestamp
    BEFORE UPDATE ON wyoming_ride_requests
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 12. VIEWS
-- ============================================================================

-- View: Compliant Wyoming Drivers
CREATE OR REPLACE VIEW wyoming_compliant_drivers AS
SELECT
    id,
    first_name,
    last_name,
    email,
    phone,
    address_city,
    address_zip,
    vehicle_make,
    vehicle_model,
    vehicle_year,
    vehicle_color,
    vehicle_license_plate,
    rating,
    total_rides,
    insurance_expiry,
    license_expiry
FROM wyoming_drivers
WHERE wyoming_tnc_compliant = TRUE
  AND status = 'approved';

-- View: Today's Wyoming Revenue
CREATE OR REPLACE VIEW wyoming_daily_revenue AS
SELECT
    DATE(trip_start_time) as ride_date,
    COUNT(*) as total_rides,
    SUM(total_charged) as gross_revenue,
    SUM(platform_revenue) as platform_revenue,
    SUM(driver_total_earnings) as driver_payouts,
    AVG(total_distance_miles) as avg_distance_miles,
    SUM(tip_amount) as total_tips
FROM wyoming_completed_rides
WHERE payment_status = 'captured'
GROUP BY DATE(trip_start_time)
ORDER BY ride_date DESC;

-- View: Platform Fee Distribution
CREATE OR REPLACE VIEW wyoming_fee_distribution AS
SELECT
    platform_fee_tier,
    COUNT(*) as ride_count,
    SUM(platform_fee) as total_fees,
    AVG(total_distance_miles) as avg_distance
FROM wyoming_completed_rides
GROUP BY platform_fee_tier
ORDER BY platform_fee_tier;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE wyoming_drivers IS 'Wyoming TNC drivers compliant with W.S. Title 31, Chapter 20';
COMMENT ON TABLE wyoming_riders IS 'Wyoming TNC riders';
COMMENT ON TABLE wyoming_platform_fee_tiers IS 'Distance-based platform fee tiers for Wyoming';
COMMENT ON TABLE wyoming_completed_rides IS 'Completed rides with electronic receipt data per W.S. 31-20-105';
COMMENT ON COLUMN wyoming_drivers.wyoming_tnc_compliant IS 'Computed compliance status based on all W.S. 31-20 requirements';
COMMENT ON COLUMN wyoming_drivers.insurance_period23_combined IS 'W.S. 31-20-107(a)(ii) requires $1M during engaged ride';
COMMENT ON COLUMN wyoming_ride_requests.fare_disclosed_at IS 'W.S. 31-20-103 requires fare disclosure before confirmation';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
