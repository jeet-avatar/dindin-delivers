# Zietra Meet — Calendar Booking Feature Design

**Date:** 2026-04-04  
**Status:** Approved  
**Product:** Zietra Meet (`meet.vibingticket.com`)

---

## Overview

Add calendar-aware meeting scheduling to Zietra Meet. Hosts connect their Google or Microsoft calendar (or set manual hours) to expose real availability. Guests open a booking link, pick a free slot, and both parties receive a confirmation email with a `.ics` calendar attachment that works with any calendar app. No account required for guests.

---

## Goals

- Hosts can share a persistent booking link (e.g. `meet.vibingticket.com/book/jeet`)
- Guests pick from real available time slots — no double-booking
- Both parties get an email with `.ics` attachment (Google, Apple, Outlook compatible)
- Guest email appears to come from the host (Peter's SMTP is invisible)
- Full audit trail stored in VibingTicket PostgreSQL (separate from Dollor.ai)
- Works for guests with no calendar account — `.ics` + direct join link in email

---

## Non-Goals

- No recurring meetings
- No payment/billing for bookings
- No video preview before joining from calendar
- No mobile app — web only

---

## Architecture

### Components

**Frontend (React SPA — existing app extended)**
- `JoinScreen` — adds "Schedule" tab alongside existing "Join Now"
- `ScheduleSetup` — host registration + calendar connection flow
- `BookingPage` — route `/book/:slug` — guest-facing slot picker (no auth)
- `CalendarConnect` — OAuth consent UI for Google / Microsoft
- `AvailabilityEditor` — manual hours fallback
- Confirmation screen post-booking

**Server (Node.js + TypeScript — existing server extended)**
- Existing WebSocket signaling: **unchanged**
- New HTTP layer: migrate raw `http.createServer` → Express for routing
- Scheduling endpoints (see API section)
- Nodemailer → `smtp.office365.com:587` (Peter's SMTP)
- `.ics` generation via `ical-generator`
- Google Calendar OAuth + free/busy via `googleapis`
- Microsoft Graph Calendar OAuth via `@microsoft/microsoft-graph-client`
- PostgreSQL via `pg` → VibingTicket RDS

**Database: VibingTicket PostgreSQL RDS**
- `db.t3.micro`, `us-east-1`, fully separate from Dollor.ai RDS
- Secrets in AWS Secrets Manager under `vibingticket/*`

---

## Database Schema

```sql
-- Host profiles with unique booking slug
CREATE TABLE hosts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  booking_slug  TEXT NOT NULL UNIQUE,  -- e.g. "jeet" → /book/jeet
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth tokens (Google + Microsoft) — access/refresh tokens AES-encrypted at rest
CREATE TABLE calendar_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual availability rules (used when no calendar is connected)
CREATE TABLE availability_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  slot_minutes  INT NOT NULL DEFAULT 30,
  timezone      TEXT NOT NULL DEFAULT 'UTC'
);

-- Booked meetings
CREATE TABLE meetings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  room_code     TEXT NOT NULL,
  title         TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_min  INT NOT NULL DEFAULT 30,
  guest_name    TEXT NOT NULL,
  guest_email   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'confirmed'
                  CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  cancel_token  TEXT NOT NULL UNIQUE,  -- unguessable token for cancellation link
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON meetings(host_id, scheduled_at);
CREATE INDEX ON meetings(cancel_token);
```

---

## API Endpoints

### Host Setup

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/host/register` | Create host profile + booking slug |
| `GET` | `/api/host/:slug` | Get host info (name, calendar connected, timezone) |
| `POST` | `/api/host/:slug/availability` | Set manual availability rules |
| `GET` | `/api/host/:slug/slots?date=YYYY-MM-DD` | Return available 30-min slots for a given date range |

### OAuth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/google?host_id=` | Redirect to Google OAuth consent |
| `GET` | `/api/auth/google/callback` | Exchange code → store tokens |
| `GET` | `/api/auth/microsoft?host_id=` | Redirect to Microsoft OAuth consent |
| `GET` | `/api/auth/microsoft/callback` | Exchange code → store tokens |

### Booking

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/book/:slug` | Book a slot — validates free/busy, saves meeting, sends emails |
| `GET` | `/api/meeting/:id` | Get meeting details |
| `DELETE` | `/api/meeting/:cancelToken` | Cancel meeting via token in email |

---

## Free/Busy Logic

When `GET /api/host/:slug/slots` is called:

1. If host has a connected Google Calendar → call `calendar.freebusy.query` for the requested date range
2. If host has a connected Microsoft Calendar → call Microsoft Graph `/me/calendarView`
3. If neither → use `availability_rules` to compute slots
4. Subtract already-booked meetings from `meetings` table
5. Return list of available ISO 8601 datetime slots

---

## Email Flow

### After a booking is confirmed, two emails are sent:

**Guest email (confirmation)**
- `From:` `{host_name} <{host_email}>` — appears to come from the host
- `Reply-To:` `{host_email}`
- SMTP auth: `peter@techcloudpro.com` via `smtp.office365.com:587` (never visible)
- `Subject:` `Confirmed: {title}`
- Body: meeting time, duration, direct join link, cancel link, "Add to Calendar" buttons
- Attachment: `invite.ics` — VEVENT with meeting URL in DESCRIPTION and URL fields

**Host email (new booking notification)**
- `From:` `{guest_name} <{guest_email}>`
- SMTP auth: same Peter SMTP
- `Subject:` `New booking: {title} — {guest_name}`
- Body: guest name, time, join link
- Attachment: `invite.ics`

### .ics content
- `SUMMARY:` meeting title
- `DTSTART:` / `DTEND:` in UTC
- `DESCRIPTION:` join link + room code
- `URL:` direct join link `https://meet.vibingticket.com/?room={room_code}`
- `ORGANIZER:` host email

---

## UI Flow

### Host first-time setup (accessed from JoinScreen → Schedule tab)
1. Enter name + email → server creates `hosts` record + auto-generates `booking_slug`
2. Choose: Connect Google Calendar | Connect Microsoft Calendar | Set Manual Hours
3. OAuth flow (Google/Microsoft) OR availability hours editor
4. Host gets their permanent booking link: `meet.vibingticket.com/book/{slug}`

### Guest booking flow (no auth required)
1. Open `meet.vibingticket.com/book/{slug}`
2. See host's name + available slots for next 7 days
3. Click a slot → enter name + email → Confirm
4. See confirmation screen with join link + "Add to Calendar" buttons
5. Receive confirmation email with `.ics` attachment

### Join from calendar
- Calendar invite URL field → opens `https://meet.vibingticket.com/?room={room_code}`
- Room code pre-filled, user enters name → joins instantly

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP routing (replaces raw `http.createServer`) |
| `pg` | PostgreSQL client |
| `nodemailer` | Email sending via SMTP |
| `ical-generator` | Generate `.ics` calendar files |
| `googleapis` | Google Calendar OAuth + free/busy API |
| `@microsoft/microsoft-graph-client` | Microsoft Outlook Calendar API |
| `isomorphic-fetch` | Required by Microsoft Graph client |

---

## Infrastructure (One-Time Setup)

### VibingTicket RDS
- Engine: PostgreSQL 15
- Instance: `db.t3.micro`
- Region: `us-east-1`
- DB name: `vibingticket`
- Separate from Dollor.ai — no shared resources

### AWS Secrets Manager
| Secret path | Contents |
|-------------|---------|
| `vibingticket/db` | `DATABASE_URL` |
| `vibingticket/smtp` | `SMTP_USER`, `SMTP_PASSWORD` |
| `vibingticket/google-oauth` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `vibingticket/microsoft-oauth` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| `vibingticket/app` | `TOKEN_ENCRYPT_KEY` (AES key for OAuth token encryption) |

### Google Cloud Setup
- Project: `vibingticket-meet`
- Enable: Google Calendar API
- OAuth consent screen: external, scopes: `calendar.readonly`
- Authorized redirect URI: `https://meet.vibingticket.com/api/auth/google/callback`

### Microsoft Azure Setup
- App registration in Azure AD
- Scopes: `Calendars.Read`, `offline_access`
- Redirect URI: `https://meet.vibingticket.com/api/auth/microsoft/callback`

### ECS Task Definition
- Add all `vibingticket/*` secrets as environment variables
- No other ECS changes needed

---

## Security

- OAuth tokens stored AES-256 encrypted in `calendar_tokens` — plaintext never in DB
- Cancel tokens are `crypto.randomUUID()` — unguessable
- No guest authentication required — booking slug is the access control
- Peter's SMTP credentials never exposed to frontend
- All secrets via AWS Secrets Manager, not env files

---

## Testing Plan

- Unit: slot generation logic (free/busy subtraction)
- Unit: `.ics` file content (DTSTART, URL, ORGANIZER correct)
- Unit: email `From` header masking
- Integration: full booking flow (register host → set availability → book slot → check DB + email sent)
- Manual: import `.ics` into Google Calendar, Apple Calendar, Outlook — verify event appears correctly
- Manual: click join link from calendar → verify room code pre-filled
