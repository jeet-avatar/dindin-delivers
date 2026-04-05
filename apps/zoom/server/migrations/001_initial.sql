CREATE TABLE IF NOT EXISTS hosts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  booking_slug      TEXT NOT NULL UNIQUE,
  timezone          TEXT NOT NULL DEFAULT 'UTC',
  slot_minutes      INT NOT NULL DEFAULT 30
                      CHECK (slot_minutes IN (15, 30, 45, 60)),
  default_title     TEXT NOT NULL DEFAULT 'Meeting',
  disabled_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host_id, provider)
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS meetings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id                 UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  room_code               TEXT NOT NULL,
  title                   TEXT NOT NULL,
  scheduled_at            TIMESTAMPTZ NOT NULL,
  duration_min            INT NOT NULL DEFAULT 30,
  guest_name              TEXT NOT NULL,
  guest_email             TEXT NOT NULL,
  guest_notes             TEXT,
  status                  TEXT NOT NULL DEFAULT 'confirmed'
                            CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  cancel_token            TEXT NOT NULL UNIQUE,
  cancel_nonce            TEXT,
  cancel_nonce_expires_at TIMESTAMPTZ,
  ics_uid                 TEXT NOT NULL UNIQUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host_id, scheduled_at)
);

CREATE INDEX IF NOT EXISTS meetings_host_scheduled ON meetings(host_id, scheduled_at);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
