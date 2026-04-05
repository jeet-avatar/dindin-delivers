# Zietra Meet — Calendar Booking Feature Design

**Date:** 2026-04-04  
**Status:** Approved  
**Product:** Zietra Meet (`meet.vibingticket.com`)

---

## Overview

Add calendar-aware meeting scheduling to Zietra Meet. Hosts register once, connect their Google or Microsoft calendar (or set manual hours), and get a permanent booking link. Guests open that link, pick a free slot, and both parties receive a confirmation email with a `.ics` calendar attachment that works with any calendar app. No account required for guests.

---

## Goals

- Hosts can share a persistent booking link (e.g. `meet.vibingticket.com/book/jeet`)
- Guests pick from real available time slots — no double-booking
- Both parties get an email with `.ics` attachment (Google, Apple, Outlook compatible)
- Full audit trail stored in VibingTicket PostgreSQL (separate from Dollor.ai)
- Works for guests with no calendar account — `.ics` + direct join link in email

---

## Non-Goals

- No recurring meetings
- No payment/billing for bookings
- No video preview before joining from calendar
- No mobile app — web only
- No host dashboard to view meeting history (hosts see upcoming meetings via their connected calendar)

---

## Architecture

### Components

**Frontend (React SPA — existing app extended)**
- `JoinScreen` — adds "Schedule" tab alongside existing "Join Now"
- `ScheduleSetup` — host registration + calendar connection flow
- `BookingPage` — route `/book/:slug` — guest-facing slot picker (no auth)
- `CancelPage` — route `/cancel?nonce=` — confirms cancellation after clicking email link
- `CalendarConnect` — OAuth consent UI for Google / Microsoft
- `AvailabilityEditor` — manual hours fallback
- Confirmation screen post-booking

**Server (Node.js + TypeScript — existing server extended)**
- Existing WebSocket signaling: **unchanged**
- HTTP layer: migrate raw `http.createServer` → Express. Express's underlying `http.Server` instance is passed directly to `new WebSocketServer({ server })` so all existing WebSocket upgrade handling is preserved.
- Scheduling endpoints (see API section)
- Nodemailer → `smtp.office365.com:587` (Peter's SMTP, authorized to send from `@vibingticket.com` domain)
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
-- Host profiles
CREATE TABLE hosts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  booking_slug      TEXT NOT NULL UNIQUE,
  timezone          TEXT NOT NULL DEFAULT 'UTC',
  slot_minutes      INT NOT NULL DEFAULT 30
                      CHECK (slot_minutes IN (15, 30, 45, 60)),
  default_title     TEXT NOT NULL DEFAULT 'Meeting',  -- e.g. "Chat with Jeet"
  disabled_at       TIMESTAMPTZ,                       -- NULL = active; set to disable booking page
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth tokens — AES-256-GCM encrypted at rest
CREATE TABLE calendar_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host_id, provider)
);

-- Manual availability rules — used only when NO calendar_tokens row exists for host
-- OAuth free/busy always wins over manual rules when a calendar is connected
CREATE TABLE availability_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  CHECK (end_time > start_time)
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
  guest_notes   TEXT,
  status        TEXT NOT NULL DEFAULT 'confirmed'
                  CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  cancel_token  TEXT NOT NULL UNIQUE,          -- crypto.randomUUID(), stored permanently
  cancel_nonce  TEXT,                           -- short-lived UUID set when cancel email link is clicked, expires 30 min
  cancel_nonce_expires_at TIMESTAMPTZ,
  ics_uid       TEXT NOT NULL UNIQUE,           -- {id}@meet.vibingticket.com — used in .ics UID field
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host_id, scheduled_at)       -- exact-slot double-booking prevention
);

CREATE INDEX ON meetings(host_id, scheduled_at);
```

---

## Host Authentication

Hosts authenticate via **email-based JWT sessions** (no passwords):

1. `POST /api/host/register` with `{ name, email }` → server creates or looks up host record, emails a magic link
2. Magic link is `https://meet.vibingticket.com/schedule/setup?magic={jwt}` — a short-lived JWT (15 min, signed with `JWT_SECRET`) containing `{ host_id, type: 'magic' }`
3. Frontend at `/schedule/setup` detects `?magic=` query param, calls `POST /api/auth/magic` with the token
4. Server verifies JWT, issues a session JWT (7 days, `{ host_id, type: 'session' }`), returns `{ token }` as JSON
5. Frontend stores session JWT in `localStorage` under `zm_host_token`. *Security note: localStorage is chosen for simplicity (no cookie CORS complexity); the app does not execute user-supplied HTML, minimising XSS surface.*
6. Host-protected endpoints require `Authorization: Bearer {token}` header
7. `POST /api/host/register` is idempotent — calling with an existing email resends the magic link without creating a duplicate

---

## Slug Generation

Derived from host name at registration:
1. Lowercase, replace spaces with `-`, strip all non-`[a-z0-9-]` chars, truncate to 20 chars
2. If slug is taken: append `-2`, `-3`, … up to `-99` until unique; if all taken return `400 slug_exhausted`
3. Example: `"Jeet Nair"` → `jeet-nair`; if taken → `jeet-nair-2`
4. Allowed charset: `[a-z0-9-]`, length 2–20 (suffix appending does not exceed 20 chars — truncate base slug to 17 before appending)

---

## OAuth Flow (Google + Microsoft)

### CSRF Protection
- On `GET /api/auth/google?host_id=`, server issues a signed state JWT: `{ host_id, provider: 'google', nonce: uuid, exp: now+10min }` signed with `JWT_SECRET`
- State JWT is passed as the `state` param to the OAuth provider
- On callback, server verifies state JWT signature and expiry before processing — invalid or expired state returns `400`

### Token Storage
- `access_token` and `refresh_token` AES-256-GCM encrypted using `TOKEN_ENCRYPT_KEY` before DB storage
- Stored via `INSERT INTO calendar_tokens ... ON CONFLICT (host_id, provider) DO UPDATE SET access_token=..., refresh_token=..., expires_at=...` — reconnecting overwrites previous tokens cleanly

### Token Refresh
Every function that calls Google/Microsoft APIs:
1. Decrypt stored token; check `expires_at`
2. If within 5 minutes of expiry: call token refresh endpoint, `UPDATE calendar_tokens` with new values
3. If refresh fails (token revoked or missing): `DELETE FROM calendar_tokens WHERE host_id=... AND provider=...`, return `{ error: 'calendar_disconnected' }` so frontend prompts reconnect

---

## Timezone Handling

- `hosts.timezone` stores the host's IANA timezone — set during registration, editable via `PUT /api/host/me`
- `GET /api/host/:slug/slots` query params: `from` and `to` are ISO 8601 **date strings** (`YYYY-MM-DD`), optional — defaults to today through +7 days in host's timezone
- Returned slot datetimes are always **UTC ISO 8601** strings (e.g. `2026-04-10T14:00:00Z`)
- Frontend formats them for display using `Intl.DateTimeFormat` with the guest's local timezone
- `.ics` `DTSTART`/`DTEND` written in UTC with `Z` suffix

---

## Double-Booking Prevention

`POST /api/book/:slug` runs at `SERIALIZABLE` isolation level to prevent concurrent overlap:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT id FROM hosts WHERE booking_slug = $1 AND disabled_at IS NULL FOR UPDATE;
-- Interval overlap check: conflict if [existing_start, existing_end) overlaps [req_start, req_end)
-- existing_start < req_end  AND  existing_end > req_start
SELECT id FROM meetings
  WHERE host_id = $2
    AND status = 'confirmed'
    AND scheduled_at < ($requested_at::timestamptz + $slot_minutes * interval '1 minute')
    AND (scheduled_at + duration_min * interval '1 minute') > $requested_at::timestamptz;
-- If any row returned → ROLLBACK, return 409 Conflict
-- Otherwise → INSERT meeting
COMMIT;
```

`SERIALIZABLE` isolation ensures that if two transactions both pass the overlap SELECT concurrently, one will receive a serialization failure (Postgres error 40001) and must retry — eliminating the TOCTOU race. The `UNIQUE (host_id, scheduled_at)` constraint remains as a final safety net for exact-time collisions.

The `UNIQUE (host_id, scheduled_at)` constraint is the final safety net for exact-match collisions.

---

## Room Code Generation

Same format as existing rooms:
```ts
crypto.randomBytes(3).toString('hex').toUpperCase()  // e.g. "A3F9C2" — 6 hex chars
```
Generated server-side at booking time, stored in `meetings.room_code`. No pre-registration in the WebSocket layer needed — rooms are created on first join, as today.

---

## Free/Busy Logic

`GET /api/host/:slug/slots?from=YYYY-MM-DD&to=YYYY-MM-DD`:

1. Reject if `hosts.disabled_at IS NOT NULL` → `403`
2. If host has `calendar_tokens` row with `provider = 'google'` → call `calendar.freebusy.query`
3. Else if `provider = 'microsoft'` → call Microsoft Graph `/me/calendarView`
4. If calendar API fails (timeout, quota, revoked token): return `503 { error: 'calendar_unavailable' }` — **do NOT fall back to showing all slots**, as this would expose times the host is busy on their real calendar
5. If neither OAuth nor rules exist: return empty slots array with `{ warning: 'host_no_availability_set' }`
6. Compute all possible slots in the date range using `host.slot_minutes` and `hosts.timezone`
7. Remove busy windows from external calendar (step 2/3)
8. Remove confirmed meetings from DB: `WHERE host_id = $1 AND status = 'confirmed' AND scheduled_at BETWEEN $from AND $to`
9. Return array of UTC ISO 8601 slot strings

---

## API Endpoints

### Rate Limiting
- `POST /api/host/register`: 5 requests per email per hour
- `POST /api/book/:slug`: 10 requests per IP per hour
- All other endpoints: standard Express rate limit (100/min per IP)

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/host/register` | None | Register host or resend magic link — body: `{ name, email }` |
| `POST` | `/api/auth/magic` | None | Exchange magic JWT → session JWT — body: `{ token }` |
| `GET` | `/api/auth/google` | Host JWT | Start Google OAuth — redirects to Google with state JWT |
| `GET` | `/api/auth/google/callback` | state JWT | Handle callback, verify state, upsert tokens → redirect to `/schedule/setup` |
| `GET` | `/api/auth/microsoft` | Host JWT | Start Microsoft OAuth |
| `GET` | `/api/auth/microsoft/callback` | state JWT | Handle callback → redirect to `/schedule/setup` |

### Host Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/host/:slug` | None | Public host info: `{ name, timezone, slot_minutes, default_title, calendar_connected: bool }` |
| `PUT` | `/api/host/me` | Host JWT | Update profile — body: `{ name?, timezone?, slot_minutes?, default_title?, disabled_at? }` |
| `POST` | `/api/host/me/availability` | Host JWT | Full-replace manual rules — body: `{ rules: [{ day_of_week: 0-6, start_time: "HH:MM", end_time: "HH:MM" }] }` — server validates no two rules for the same `day_of_week` have overlapping time windows before delete+insert transaction; returns `400` if overlap detected |
| `GET` | `/api/host/:slug/slots` | None | Available slots — query: `from=YYYY-MM-DD&to=YYYY-MM-DD` (default: today to +7 days; max range 30 days → 400 if exceeded) |

### Booking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/book/:slug` | None | Book a slot — body: `{ scheduled_at, guest_name, guest_email, guest_notes? }` |
| `GET` | `/api/meeting/cancel` | None | Cancel landing page redirect — query: `?token={cancel_token}` — validates token, sets short-lived nonce on meeting row, returns `302` to `/cancel?nonce={nonce}` |
| `GET` | `/api/meeting/by-nonce/:nonce` | None | Fetch meeting title+time for cancel confirmation page (nonce must be valid and unexpired) |
| `POST` | `/api/meeting/cancel` | None | Confirm cancellation — body: `{ nonce }` — validates nonce, cancels meeting, sends emails, invalidates nonce |

*Note: `GET /api/meeting/:id` is not exposed publicly. Meeting data is only accessed via the cancel flow using the cancel_token.*

---

## Email Flow

All emails sent via `smtp.office365.com:587`, auth: `peter@techcloudpro.com` — same SMTP credentials already used by BrandMonkz TechCloudPro campaigns. No new O365 configuration needed. `From` address uses the authenticated domain `techcloudpro.com` to pass SPF/DKIM.

### Booking confirmation — two emails:

**Guest confirmation**
- `From:` `Zietra Meet <peter@techcloudpro.com>`
- `Reply-To:` `{host_email}`
- `Subject:` `Confirmed: {title}`
- Body: time (formatted in guest's timezone), duration, join link, cancel link (`https://meet.vibingticket.com/api/meeting/cancel?token={cancel_token}`), "Add to Calendar" buttons
- Attachment: `invite.ics` with `METHOD:REQUEST`

**Host notification**
- `From:` `Zietra Meet <peter@techcloudpro.com>`
- `Reply-To:` `{guest_email}`
- `Subject:` `New booking: {title} — {guest_name}`
- Body: guest name, notes (if any), time, join link
- Attachment: `invite.ics` with `METHOD:REQUEST`

### Cancellation — two emails (on `POST /api/meeting/cancel`):

- `Subject:` `Cancelled: {title}` → guest
- `Subject:` `Booking cancelled: {title} — {guest_name}` → host
- Both `From: Zietra Meet <peter@techcloudpro.com>`
- Attachment: `cancel.ics` with `METHOD:CANCEL` and matching `UID` field

### `.ics` content

```
METHOD: REQUEST (or CANCEL)
UID: {meetings.ics_uid}          ← MUST match between booking and cancel .ics
SUMMARY: {title}
DTSTART: {scheduled_at as UTC DATE-TIME, e.g. 20260410T140000Z}
DTEND: {(new Date(scheduled_at.getTime() + duration_min * 60_000)) as UTC DATE-TIME, e.g. 20260410T143000Z}
DESCRIPTION: Join: https://meet.vibingticket.com/?room={room_code}\nRoom: {room_code}
URL: https://meet.vibingticket.com/?room={room_code}
ORGANIZER: mailto:peter@techcloudpro.com
ATTENDEE: mailto:{guest_email}
```

`ical-generator` accepts JavaScript `Date` objects for `start` and `end`. Pass `new Date(scheduled_at)` and `new Date(scheduled_at.getTime() + duration_min * 60_000)` — the library formats them as RFC 5545 UTC DATE-TIME values automatically.

`ics_uid` is generated at booking time as `{meeting_id}@meet.vibingticket.com` and stored in the `meetings` table so the cancel `.ics` can reference the same UID for proper calendar removal.

---

## UI Flow

### Host first-time setup
1. JoinScreen → Schedule tab → "Set up your booking page"
2. Enter name + email → "Check your email for a login link"
3. Click magic link in email → `/schedule/setup?magic={jwt}` → frontend exchanges token → stored in localStorage
4. Setup screen: enter timezone, slot duration, default meeting title
5. Choose: Connect Google Calendar | Connect Microsoft Calendar | Set Manual Hours
6. OAuth (Google/Microsoft) or availability editor
7. Host sees their booking link: `meet.vibingticket.com/book/{slug}`

### Guest booking flow
1. Open `meet.vibingticket.com/book/{slug}`
2. See host name + available slots for next 7 days (in guest's local timezone)
3. Click slot → enter name, email, optional notes → Confirm
4. Confirmation screen: join link + "Add to Calendar" buttons (Google Calendar deeplink, Apple `.ics` download, Outlook `.ics` download)
5. Receive confirmation email with `.ics`

### Cancel from email
1. Guest clicks cancel link in email → `GET /api/meeting/cancel?token={cancel_token}`
2. Server validates `cancel_token`, generates a short-lived **cancel nonce** (UUID, stored in `meetings.cancel_nonce`, expires 30 min), returns `302` to `/cancel?nonce={cancel_nonce}`
3. The nonce (not the cancel_token) appears in the browser URL bar and access logs — the permanent cancel_token is never exposed in a redirect
4. Frontend `/cancel` page calls `GET /api/meeting/by-nonce/{nonce}` to fetch meeting title/time for display
5. User clicks "Confirm Cancellation" → `POST /api/meeting/cancel` with body `{ nonce }` → server looks up cancel_token via nonce, cancels meeting, sends emails, invalidates nonce

### Join from calendar
- Calendar event URL → `https://meet.vibingticket.com/?room={room_code}`
- Room code pre-filled in JoinScreen; user enters name → joins instantly

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP routing (WS server receives Express's `http.Server`) |
| `express-rate-limit` | Rate limiting on public endpoints |
| `pg` | PostgreSQL client |
| `nodemailer` | SMTP email |
| `ical-generator` | `.ics` file generation |
| `googleapis` | Google Calendar OAuth + freebusy |
| `@microsoft/microsoft-graph-client` | Microsoft Graph API calls (calendar reads) |
| `@azure/msal-node` | Microsoft OAuth token acquisition (required auth provider for Graph client) |
| `jsonwebtoken` | Magic link + session JWTs, OAuth state |

*Node 20 has native fetch — `isomorphic-fetch` not needed.*

---

## Infrastructure (One-Time Setup)

### VibingTicket RDS
- Engine: PostgreSQL 15, `db.t3.micro`, `us-east-1`, DB name: `vibingticket`

### SMTP — No Setup Required
- Reuse existing BrandMonkz SMTP: `smtp.office365.com:587`, auth: `peter@techcloudpro.com`
- Store credentials in `vibingticket/smtp` in AWS Secrets Manager (copy values from BrandMonkz `.env`)
- `From: Zietra Meet <peter@techcloudpro.com>` is within the authenticated domain — no O365 changes needed

### AWS Secrets Manager
| Secret path | Contents |
|-------------|---------|
| `vibingticket/db` | `DATABASE_URL` |
| `vibingticket/smtp` | `SMTP_USER`, `SMTP_PASSWORD` |
| `vibingticket/google-oauth` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `vibingticket/microsoft-oauth` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| `vibingticket/app` | `TOKEN_ENCRYPT_KEY` (32-byte hex), `JWT_SECRET` |

### Google Cloud
- Project: `vibingticket-meet`, enable: Google Calendar API
- OAuth consent: external, scopes: `calendar.readonly`, `calendar.freebusy`
- Redirect URI: `https://meet.vibingticket.com/api/auth/google/callback`

### Microsoft Azure
- App registration, scopes: `Calendars.Read`, `offline_access`
- Redirect URI: `https://meet.vibingticket.com/api/auth/microsoft/callback`

---

## Security

- OAuth tokens AES-256-GCM encrypted at rest — plaintext never stored
- OAuth CSRF protected by signed state JWT (10 min expiry)
- Cancel token in POST body only — never in server access logs from a GET
- Cancel page: `GET /api/meeting/cancel?token={cancel_token}` sets a short-lived nonce on the meeting row, then returns `302` to `/cancel?nonce={nonce}` — the permanent cancel_token never appears in the redirect URL or browser history
- Rate limiting on all unauthenticated email-sending endpoints
- All secrets via AWS Secrets Manager

---

## Testing Plan

### Unit Tests
- Slot computation with free/busy subtraction (exact match + interval overlap)
- Slug generation: collision handling
- `.ics` output: `UID`, `DTSTART`, `METHOD`, `URL` correct
- From/Reply-To headers match spec for all email types
- Token refresh: triggers within 5 min of expiry; revocation returns `calendar_disconnected`
- State JWT: expired rejected with 400

### Integration Tests
- Full happy path: register → magic link → setup → book → DB row + 2 emails
- Double-booking: concurrent requests for same slot → one 409, one success
- Overlap detection: booking at 2:15 PM blocked by existing 2:00 PM 30-min meeting
- Cancel flow: POST cancel → status updated → 2 emails with METHOD:CANCEL .ics

### Negative-Path Tests
- Book already-taken slot → 409
- Book on disabled host page → 403
- Invalid cancel token → 404
- Expired OAuth token with revoked refresh → 402 `calendar_disconnected`
- Expired magic link → 401
- Invalid state JWT on OAuth callback → 400
- `POST /api/host/me/availability` with `end_time <= start_time` → 400

### Manual Tests
- Import `.ics` into Google Calendar, Apple Calendar, Outlook → event appears with correct time and join link
- Cancel → `METHOD:CANCEL` `.ics` removes event from calendar apps
- Click join link from calendar → room code pre-filled
- SMTP delivery: confirm `From: Zietra Meet <peter@techcloudpro.com>` arrives correctly (same auth path as BrandMonkz — no new verification needed)
