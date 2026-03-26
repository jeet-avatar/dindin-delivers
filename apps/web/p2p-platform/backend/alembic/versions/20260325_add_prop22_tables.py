"""Add Prop 22 compliance tables and columns

Revision ID: 20260325_prop22_tables
Revises: 20260321_rr_accessibility
Create Date: 2026-03-25

Adds 5 nullable columns to ride_requests, 5 nullable columns to orders,
and creates 4 new tables:
  - prop22_config          (legally mandated rates)
  - prop22_city_wages      (per-city minimum wages, GPS-based lookup)
  - prop22_earning_periods (one row per driver per 14-day period)
  - prop22_earnings_statement (BPC 7454(b)(2) disclosure records, 4-year retention)

All new columns are nullable so existing rows are unaffected.
All CREATE TABLE / INSERT statements use IF NOT EXISTS / ON CONFLICT DO NOTHING for idempotency.
"""
from alembic import op

revision = "20260325_prop22_tables"
down_revision = "20260321_rr_accessibility"
branch_labels = None
depends_on = None


def upgrade():
    # -------------------------------------------------------------------------
    # ride_requests — 5 new Prop 22 columns (nullable; old code ignores them)
    # -------------------------------------------------------------------------
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_acceptance_lat FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_acceptance_lon FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_engaged_hours FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_engaged_miles FLOAT")
    op.execute("ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS prop22_floor_amount FLOAT")

    # -------------------------------------------------------------------------
    # orders — 5 new Prop 22 columns (parallel structure to ride_requests)
    # -------------------------------------------------------------------------
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_acceptance_lat FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_acceptance_lon FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_engaged_hours FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_engaged_miles FLOAT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS prop22_floor_amount FLOAT")

    # -------------------------------------------------------------------------
    # prop22_config — legally mandated rates (never hardcode in application logic)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS prop22_config (
            id SERIAL PRIMARY KEY,
            state VARCHAR(10) NOT NULL,
            effective_date DATE NOT NULL,
            min_wage_multiplier FLOAT NOT NULL,
            mile_rate FLOAT NOT NULL,
            healthcare_hours_threshold FLOAT DEFAULT 15.0,
            healthcare_stipend_weekly FLOAT DEFAULT 0.0
        )
    """)
    # Seed: 2026 CA rates (BPC 7453 — 120% min wage + $0.37/mile)
    op.execute("""
        INSERT INTO prop22_config (state, effective_date, min_wage_multiplier, mile_rate)
        VALUES ('CA', '2026-01-01', 1.20, 0.37)
        ON CONFLICT DO NOTHING
    """)

    # -------------------------------------------------------------------------
    # prop22_city_wages — per-city minimum wages (GPS-based lookup at ride acceptance)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS prop22_city_wages (
            id SERIAL PRIMARY KEY,
            city VARCHAR(50) NOT NULL,
            effective_date DATE NOT NULL,
            min_wage FLOAT NOT NULL
        )
    """)
    # 2026 seed data: CA statewide + SF + LA with July 1 step-up increases
    op.execute("""
        INSERT INTO prop22_city_wages (city, effective_date, min_wage) VALUES
        ('CA',            '2026-01-01', 16.90),
        ('SAN_FRANCISCO', '2026-01-01', 18.67),
        ('SAN_FRANCISCO', '2026-07-01', 19.61),
        ('LOS_ANGELES',   '2026-01-01', 17.87),
        ('LOS_ANGELES',   '2026-07-01', 18.42)
        ON CONFLICT DO NOTHING
    """)

    # -------------------------------------------------------------------------
    # prop22_earning_periods — one row per driver per 14-day pay period
    # UniqueConstraint on (driver_id, period_start) prevents duplicate periods
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS prop22_earning_periods (
            id SERIAL PRIMARY KEY,
            driver_id INTEGER NOT NULL REFERENCES drivers(id),
            period_start TIMESTAMP WITH TIME ZONE NOT NULL,
            period_end TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            service_type VARCHAR(20) NOT NULL DEFAULT 'RIDESHARE',
            engaged_hours FLOAT NOT NULL DEFAULT 0.0,
            engaged_miles FLOAT NOT NULL DEFAULT 0.0,
            net_earnings FLOAT NOT NULL DEFAULT 0.0,
            prop22_floor FLOAT NOT NULL DEFAULT 0.0,
            top_up_amount FLOAT NOT NULL DEFAULT 0.0,
            top_up_stripe_id VARCHAR(255),
            deadline_at TIMESTAMP WITH TIME ZONE,
            is_archived BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT uq_prop22_period_driver_start UNIQUE (driver_id, period_start)
        )
    """)

    # -------------------------------------------------------------------------
    # prop22_earnings_statement — BPC 7454(b)(2) disclosure records (4-year retention)
    # One statement row per period per driver; never DELETE (is_archived soft-delete)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS prop22_earnings_statement (
            id SERIAL PRIMARY KEY,
            driver_id INTEGER NOT NULL REFERENCES drivers(id),
            period_id INTEGER NOT NULL REFERENCES prop22_earning_periods(id),
            period_engaged_hours FLOAT NOT NULL DEFAULT 0.0,
            qtd_engaged_hours FLOAT NOT NULL DEFAULT 0.0,
            period_engaged_miles FLOAT NOT NULL DEFAULT 0.0,
            net_earnings FLOAT NOT NULL DEFAULT 0.0,
            prop22_floor FLOAT NOT NULL DEFAULT 0.0,
            top_up_amount FLOAT NOT NULL DEFAULT 0.0,
            top_up_stripe_id VARCHAR(255),
            is_archived BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS prop22_earnings_statement")
    op.execute("DROP TABLE IF EXISTS prop22_earning_periods")
    op.execute("DROP TABLE IF EXISTS prop22_city_wages")
    op.execute("DROP TABLE IF EXISTS prop22_config")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS prop22_floor_amount")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS prop22_engaged_miles")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS prop22_engaged_hours")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS prop22_acceptance_lon")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS prop22_acceptance_lat")
    op.execute("ALTER TABLE ride_requests DROP COLUMN IF EXISTS prop22_floor_amount")
    op.execute("ALTER TABLE ride_requests DROP COLUMN IF EXISTS prop22_engaged_miles")
    op.execute("ALTER TABLE ride_requests DROP COLUMN IF EXISTS prop22_engaged_hours")
    op.execute("ALTER TABLE ride_requests DROP COLUMN IF EXISTS prop22_acceptance_lon")
    op.execute("ALTER TABLE ride_requests DROP COLUMN IF EXISTS prop22_acceptance_lat")
