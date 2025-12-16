-- Dollor.ai - ClickHouse Analytics Database Setup
-- ================================================
-- Phase 4: Analytics Pipeline - Database Initialization

-- Create analytics database
CREATE DATABASE IF NOT EXISTS dollor_analytics;

-- Create events database for raw event storage
CREATE DATABASE IF NOT EXISTS dollor_events;
