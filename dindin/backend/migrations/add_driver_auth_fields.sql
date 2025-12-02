-- Migration: Add Driver Authentication Fields
-- Date: 2024-12-01
-- Description: Adds password_hash to drivers table and driver_location to orders table

-- Add password_hash column to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add driver_location column to orders table for real-time tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_location TEXT;

-- Create index on driver email for faster login lookups
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);

-- Verify changes
SELECT
    'drivers' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'drivers'
AND column_name = 'password_hash'

UNION ALL

SELECT
    'orders' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'driver_location';
