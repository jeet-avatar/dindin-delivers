# Zietra Meet Calendar Booking — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add calendar-aware meeting scheduling to Zietra Meet — hosts connect their Google/Microsoft calendar, guests pick free slots, both parties receive `.ics` email invites, and the room code is pre-filled when they join.

**Architecture:** Extend the existing Node.js/TypeScript WebSocket server with Express HTTP routing, a VibingTicket PostgreSQL RDS for persistence, and new React pages for host setup (`/book/:slug` booking page, `/cancel` cancellation page). The existing WebSocket signaling layer is untouched — Express simply takes over the `http.Server` instance.

**Tech Stack:** Node 20 + TypeScript + Express + pg (PostgreSQL) + nodemailer + ical-generator + googleapis + @azure/msal-node + @microsoft/microsoft-graph-client + jsonwebtoken + Vitest (tests) | React 18 + Vite (frontend)

---

## File Map

### Server — new files
| File | Responsibility |
|------|---------------|
| `apps/zoom/server/db.ts` | PostgreSQL pool singleton + `runMigrations()` |
| `apps/zoom/server/migrations/001_initial.sql` | Full DB schema (hosts, calendar_tokens, availability_rules, meetings) |
| `apps/zoom/server/auth.ts` | `signJwt`, `verifyJwt` helpers |
| `apps/zoom/server/email.ts` | Nodemailer transport singleton + `sendEmail(to, subject, html, attachments)` |
| `apps/zoom/server/ical.ts` | `buildIcs(meeting, method)` → returns `.ics` string |
| `apps/zoom/server/slugs.ts` | `generateSlug(name, existingCheck)` — slug derivation + collision logic |
| `apps/zoom/server/calendar/google.ts` | Google OAuth token exchange + `getGoogleBusyTimes(hostId, from, to)` |
| `apps/zoom/server/calendar/microsoft.ts` | MSAL token exchange + `getMicrosoftBusyTimes(hostId, from, to)` |
| `apps/zoom/server/calendar/slots.ts` | `computeSlotsFromRules(rules, from, to, slotMinutes, timezone)`, `subtractBusyWindows(slots, busy, slotMinutes)` |
| `apps/zoom/server/routes/hosts.ts` | `POST /api/host/register`, `GET /api/host/:slug`, `PUT /api/host/me`, `POST /api/host/me/availability` (Chunk 1); `GET /api/host/:slug/slots` added in Chunk 2 Task 13 |
| `apps/zoom/server/routes/auth.ts` | `POST /api/auth/magic`, `GET /api/auth/google[/callback]`, `GET /api/auth/microsoft[/callback]` |
| `apps/zoom/server/routes/booking.ts` | `POST /api/book/:slug` |
| `apps/zoom/server/routes/cancel.ts` | `GET /api/meeting/cancel`, `GET /api/meeting/by-nonce/:nonce`, `POST /api/meeting/cancel` |
| `apps/zoom/server/middleware/requireAuth.ts` | `requireHostAuth` Express middleware |
| `apps/zoom/server/crypto.ts` | `encrypt(text)` / `decrypt(text)` — AES-256-GCM for OAuth tokens |

### Server — modified files
| File | Change |
|------|--------|
| `apps/zoom/server/index.ts` | Migrate `http.createServer` → Express; mount all route modules; call `runMigrations()` on startup |
| `apps/zoom/server/package.json` | Add all new dependencies |
| `apps/zoom/server/tsconfig.json` | Ensure `resolveJsonModule: true` |

### Server — test files
| File | Tests |
|------|-------|
| `apps/zoom/server/tests/auth.test.ts` | JWT sign/verify, magic link expiry |
| `apps/zoom/server/tests/slugs.test.ts` | Slug generation, collision handling |
| `apps/zoom/server/tests/ical.test.ts` | `.ics` output correctness |
| `apps/zoom/server/tests/slots.test.ts` | Slot computation, overlap detection |
| `apps/zoom/server/tests/booking.test.ts` | Booking endpoint: happy path, double-booking, disabled host |
| `apps/zoom/server/tests/cancel.test.ts` | Cancel nonce flow, invalid/expired nonce |

### Frontend — new files
| File | Responsibility |
|------|---------------|
| `apps/zoom/frontend/src/pages/BookingPage.tsx` | Guest-facing slot picker at `/book/:slug` |
| `apps/zoom/frontend/src/pages/CancelPage.tsx` | Cancellation confirmation at `/cancel?nonce=` |
| `apps/zoom/frontend/src/components/ScheduleTab.tsx` | Host setup tab inside JoinScreen (register + calendar connect) |
| `apps/zoom/frontend/src/components/AvailabilityEditor.tsx` | Manual hours editor inside ScheduleTab |
| `apps/zoom/frontend/src/lib/api.ts` | Typed fetch helpers for all scheduling API endpoints |

### Frontend — modified files
| File | Change |
|------|--------|
| `apps/zoom/frontend/src/App.tsx` | Add path-based routing for `/book/*` and `/cancel` |
| `apps/zoom/frontend/src/components/JoinScreen.tsx` | Add "Schedule" tab that renders `<ScheduleTab />` |

### Infrastructure
| File | Change |
|------|--------|
| `apps/zoom/deploy/Dockerfile` | Copy all `server/*.ts`, `server/calendar/`, `server/routes/`, `server/middleware/`, `server/migrations/` into image |

---

## Chunk 1: Foundation — Express + DB + Host Auth

### Task 1: Install server dependencies

**Files:**
- Modify: `apps/zoom/server/package.json`

- [ ] **Step 1: Add dependencies**

```bash
cd apps/zoom/server
npm install express pg nodemailer ical-generator jsonwebtoken googleapis @azure/msal-node @microsoft/microsoft-graph-client express-rate-limit
npm install --save-dev @types/express @types/pg @types/nodemailer @types/jsonwebtoken vitest
```

- [ ] **Step 2: Verify install**

```bash
ls node_modules | grep -E "^express$|^pg$|^nodemailer$|^vitest$"
```
Expected: all 4 names printed.

- [ ] **Step 3: Add test script to package.json**

Open `apps/zoom/server/package.json`. Add `"test": "vitest run"` to scripts. Final scripts block:
```json
"scripts": {
  "start": "tsx index.ts",
  "test": "vitest run"
}
```

- [ ] **Step 4: Commit**

```bash
cd apps/zoom/server
git add package.json package-lock.json
git commit -m "chore(zoom): add calendar booking server dependencies"
```

---

### Task 2: DB module + migration

**Files:**
- Create: `apps/zoom/server/db.ts`
- Create: `apps/zoom/server/migrations/001_initial.sql`

- [ ] **Step 1: Write the migration SQL**

Create `apps/zoom/server/migrations/001_initial.sql`:

```sql
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
```

- [ ] **Step 2: Write db.ts**

Create `apps/zoom/server/db.ts`:

```typescript
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const migrations = ['001_initial.sql'];
    for (const file of migrations) {
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [file]
      );
      if (rows.length === 0) {
        const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [file]
        );
        console.log(`Migration applied: ${file}`);
      }
    }
  } finally {
    client.release();
  }
}
```

- [ ] **Step 3: Write the test**

Create `apps/zoom/server/tests/db.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('db module', () => {
  it.skipIf(!process.env.DATABASE_URL)('exports pool and runMigrations', async () => {
    // Integration test — only runs when DATABASE_URL is set.
    // In CI this requires a real Postgres instance.
    const mod = await import('../db.js');
    expect(typeof mod.pool).toBe('object');
    expect(typeof mod.runMigrations).toBe('function');
  });
});
```

- [ ] **Step 4: Verify test is skipped when no DATABASE_URL (expected)**

```bash
cd apps/zoom/server
npx vitest run tests/db.test.ts 2>&1 | tail -10
```
Expected: `Tests 1 skipped` (DATABASE_URL not set in local unit-test environment — integration is covered by booking tests with a real DB).

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/db.ts apps/zoom/server/migrations/001_initial.sql apps/zoom/server/tests/db.test.ts
git commit -m "feat(zoom): add DB module and initial schema migration"
```

---

### Task 3: Crypto module (AES-256-GCM for OAuth tokens)

**Files:**
- Create: `apps/zoom/server/crypto.ts`
- Create: `apps/zoom/server/tests/crypto.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/zoom/server/tests/crypto.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../crypto.js';

describe('crypto', () => {
  it('roundtrips plaintext through encrypt/decrypt', () => {
    const original = 'super-secret-token-abc123';
    const ciphertext = encrypt(original);
    expect(ciphertext).not.toBe(original);
    expect(decrypt(ciphertext)).toBe(original);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const a = encrypt('hello');
    const b = encrypt('hello');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd apps/zoom/server
TOKEN_ENCRYPT_KEY=0000000000000000000000000000000000000000000000000000000000000000 npx vitest run tests/crypto.test.ts 2>&1 | head -30
```
Expected: FAIL with "Cannot find module '../crypto.js'"

- [ ] **Step 3: Implement crypto.ts**

Create `apps/zoom/server/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY_HEX = process.env.TOKEN_ENCRYPT_KEY || '';
if (!KEY_HEX) throw new Error('TOKEN_ENCRYPT_KEY is required');
const KEY = Buffer.from(KEY_HEX, 'hex');
if (KEY.length !== 32) throw new Error('TOKEN_ENCRYPT_KEY must be 32 bytes (64 hex chars)');

const ALGO = 'aes-256-gcm';

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv(24 hex) + authTag(32 hex) + ciphertext(hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
}

export function decrypt(data: string): string {
  const iv = Buffer.from(data.slice(0, 24), 'hex');
  const authTag = Buffer.from(data.slice(24, 56), 'hex');
  const ciphertext = Buffer.from(data.slice(56), 'hex');
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
TOKEN_ENCRYPT_KEY=0000000000000000000000000000000000000000000000000000000000000000 npx vitest run tests/crypto.test.ts 2>&1 | tail -10
```
Expected: `Tests 2 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/crypto.ts apps/zoom/server/tests/crypto.test.ts
git commit -m "feat(zoom): add AES-256-GCM encrypt/decrypt for OAuth token storage"
```

---

### Task 4: JWT auth helpers

**Files:**
- Create: `apps/zoom/server/auth.ts`
- Create: `apps/zoom/server/tests/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/zoom/server/tests/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../auth.js';

describe('auth', () => {
  it('signs and verifies a JWT', () => {
    const token = signJwt({ host_id: 'abc', type: 'session' }, '7d');
    const payload = verifyJwt(token);
    expect(payload).not.toBeNull();
    expect((payload as any).host_id).toBe('abc');
    expect((payload as any).type).toBe('session');
  });

  it('returns null for tampered token', () => {
    const token = signJwt({ host_id: 'abc', type: 'session' }, '7d');
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(verifyJwt(tampered)).toBeNull();
  });

  it('returns null for expired token', async () => {
    const token = signJwt({ host_id: 'abc', type: 'magic' }, '1ms');
    await new Promise(r => setTimeout(r, 10));
    expect(verifyJwt(token)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
JWT_SECRET=test-secret npx vitest run tests/auth.test.ts 2>&1 | head -20
```
Expected: FAIL with "Cannot find module '../auth.js'"

- [ ] **Step 3: Implement auth.ts**

Create `apps/zoom/server/auth.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export function signJwt(payload: object, expiresIn: string): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string): object | null {
  try {
    return jwt.verify(token, JWT_SECRET) as object;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
JWT_SECRET=test-secret npx vitest run tests/auth.test.ts 2>&1 | tail -10
```
Expected: `Tests 3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/auth.ts apps/zoom/server/tests/auth.test.ts
git commit -m "feat(zoom): add JWT sign/verify helpers for host auth"
```

---

### Task 5: Slug generation

**Files:**
- Create: `apps/zoom/server/slugs.ts`
- Create: `apps/zoom/server/tests/slugs.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/zoom/server/tests/slugs.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { deriveSlug, generateUniqueSlug } from '../slugs.js';

describe('deriveSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(deriveSlug('Jeet Nair')).toBe('jeet-nair');
  });

  it('strips non-alphanumeric chars', () => {
    expect(deriveSlug('John O\'Brien')).toBe('john-obrien');
  });

  it('truncates to 17 chars (leaving room for -99 suffix)', () => {
    expect(deriveSlug('Abcdefghijklmnopqrstuvwxyz')).toHaveLength(17);
  });
});

describe('generateUniqueSlug', () => {
  it('returns base slug when not taken', async () => {
    const slug = await generateUniqueSlug('Jeet Nair', async () => false);
    expect(slug).toBe('jeet-nair');
  });

  it('appends -2 when base is taken', async () => {
    let calls = 0;
    const slug = await generateUniqueSlug('Jeet Nair', async (s) => {
      calls++;
      return s === 'jeet-nair'; // only first one is taken
    });
    expect(slug).toBe('jeet-nair-2');
    expect(calls).toBe(2);
  });

  it('throws after 99 attempts', async () => {
    await expect(
      generateUniqueSlug('Jeet', async () => true) // always taken
    ).rejects.toThrow('slug_exhausted');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/slugs.test.ts 2>&1 | head -20
```
Expected: FAIL with "Cannot find module '../slugs.js'"

- [ ] **Step 3: Implement slugs.ts**

Create `apps/zoom/server/slugs.ts`:

```typescript
export function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 17); // leave room for "-99" suffix
}

export async function generateUniqueSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = deriveSlug(name);
  if (!(await isTaken(base))) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('slug_exhausted');
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/slugs.test.ts 2>&1 | tail -10
```
Expected: `Tests 6 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/slugs.ts apps/zoom/server/tests/slugs.test.ts
git commit -m "feat(zoom): add slug generation with collision handling"
```

---

### Task 6: Auth middleware + host registration routes

**Files:**
- Create: `apps/zoom/server/middleware/requireAuth.ts`
- Create: `apps/zoom/server/routes/hosts.ts`

- [ ] **Step 1: Create requireAuth middleware**

Create `apps/zoom/server/middleware/requireAuth.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../auth.js';

export function requireHostAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }
  const token = header.slice(7);
  const payload = verifyJwt(token) as { host_id?: string; type?: string } | null;
  if (!payload || payload.type !== 'session' || !payload.host_id) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  (req as any).hostId = payload.host_id;
  next();
}
```

- [ ] **Step 2: Create host registration route**

Create `apps/zoom/server/routes/hosts.ts`:

```typescript
import { Router } from 'express';
import { pool } from '../db.js';
import { signJwt } from '../auth.js';
import { generateUniqueSlug } from '../slugs.js';
import { requireHostAuth } from '../middleware/requireAuth.js';
import { sendEmail } from '../email.js';

export const hostsRouter = Router();

// POST /api/host/register — idempotent, sends magic link
hostsRouter.post('/register', async (req, res) => {
  const { name, email } = req.body as { name?: string; email?: string };
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  let host = (await pool.query('SELECT id FROM hosts WHERE email = $1', [email.toLowerCase()])).rows[0];

  if (!host) {
    const slug = await generateUniqueSlug(name, async (s) => {
      const r = await pool.query('SELECT id FROM hosts WHERE booking_slug = $1', [s]);
      return r.rows.length > 0;
    });
    const result = await pool.query(
      `INSERT INTO hosts (name, email, booking_slug) VALUES ($1, $2, $3) RETURNING id`,
      [name.trim(), email.toLowerCase().trim(), slug]
    );
    host = result.rows[0];
  }

  const magicToken = signJwt({ host_id: host.id, type: 'magic' }, '15m');
  const magicLink = `${process.env.APP_URL || 'https://meet.vibingticket.com'}/schedule/setup?magic=${magicToken}`;

  await sendEmail({
    to: email,
    subject: 'Your Zietra Meet login link',
    html: `<p>Hi ${name},</p>
<p>Click below to set up your booking page:</p>
<p><a href="${magicLink}">Set up my booking page</a></p>
<p>This link expires in 15 minutes.</p>`,
  });

  res.json({ message: 'magic_link_sent' });
});

// GET /api/host/me — fetch own profile (includes booking_slug for display)
// IMPORTANT: must be registered BEFORE GET /:slug to avoid "me" being treated as a slug
hostsRouter.get('/me', requireHostAuth, async (req, res) => {
  const hostId = (req as any).hostId;
  const { rows } = await pool.query(
    'SELECT id, name, email, booking_slug, timezone, slot_minutes FROM hosts WHERE id = $1',
    [hostId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'host_not_found' });
  res.json(rows[0]);
});

// GET /api/host/:slug — public host info (must be after /me)
hostsRouter.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { rows } = await pool.query(
    `SELECT h.id, h.name, h.timezone, h.slot_minutes, h.default_title, h.disabled_at,
            EXISTS(SELECT 1 FROM calendar_tokens ct WHERE ct.host_id = h.id) AS calendar_connected
     FROM hosts h WHERE h.booking_slug = $1`,
    [slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'host_not_found' });
  if (rows[0].disabled_at) return res.status(403).json({ error: 'booking_disabled' });
  const { disabled_at, ...public_data } = rows[0];
  res.json(public_data);
});

// PUT /api/host/me — update profile
hostsRouter.put('/me', requireHostAuth, async (req, res) => {
  const hostId = (req as any).hostId;
  const { name, timezone, slot_minutes, default_title, disabled_at } = req.body;
  await pool.query(
    `UPDATE hosts SET
      name = COALESCE($1, name),
      timezone = COALESCE($2, timezone),
      slot_minutes = COALESCE($3, slot_minutes),
      default_title = COALESCE($4, default_title),
      disabled_at = $5
     WHERE id = $6`,
    [name, timezone, slot_minutes, default_title, disabled_at ?? null, hostId]
  );
  res.json({ ok: true });
});

// POST /api/host/me/availability — full-replace manual rules
hostsRouter.post('/me/availability', requireHostAuth, async (req, res) => {
  const hostId = (req as any).hostId;
  const { rules } = req.body as { rules: { day_of_week: number; start_time: string; end_time: string }[] };
  if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules must be an array' });

  // Validate each rule's end_time > start_time
  for (const rule of rules) {
    if (rule.end_time <= rule.start_time) {
      return res.status(400).json({ error: 'invalid_rule', detail: 'end_time must be after start_time' });
    }
  }

  // Validate no overlapping windows for the same day
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      if (rules[i].day_of_week === rules[j].day_of_week) {
        const aStart = rules[i].start_time, aEnd = rules[i].end_time;
        const bStart = rules[j].start_time, bEnd = rules[j].end_time;
        if (aStart < bEnd && aEnd > bStart) {
          return res.status(400).json({ error: 'overlapping_rules', day: rules[i].day_of_week });
        }
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM availability_rules WHERE host_id = $1', [hostId]);
    for (const rule of rules) {
      await client.query(
        'INSERT INTO availability_rules (host_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [hostId, rule.day_of_week, rule.start_time, rule.end_time]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/zoom/server/middleware/ apps/zoom/server/routes/hosts.ts
git commit -m "feat(zoom): add host registration, auth middleware, and profile routes"
```

---

### Task 7: Email module

**Files:**
- Create: `apps/zoom/server/email.ts`

- [ ] **Step 1: Create email.ts**

Create `apps/zoom/server/email.ts`:

```typescript
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  await transport.sendMail({
    from: `Zietra Meet <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
    attachments: opts.attachments,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/server/email.ts
git commit -m "feat(zoom): add nodemailer email module via Peter SMTP"
```

---

### Task 8: Migrate index.ts to Express

**Files:**
- Create: `apps/zoom/server/routes/auth.ts` (stub — full implementation in Chunk 2 Task 13)
- Create: `apps/zoom/server/routes/booking.ts` (stub — full implementation in Chunk 3 Task 14)
- Create: `apps/zoom/server/routes/cancel.ts` (stub — full implementation in Chunk 3 Task 15)
- Modify: `apps/zoom/server/index.ts`

- [ ] **Step 1: Create stub route files**

These stubs are required so `index.ts` can import them immediately. They will be replaced in full in Chunk 2/3.

Create `apps/zoom/server/routes/auth.ts`:
```typescript
import { Router } from 'express';
export const authRouter = Router();
// Full implementation added in Chunk 2 Task 13
```

Create `apps/zoom/server/routes/booking.ts`:
```typescript
import { Router } from 'express';
export const bookingRouter = Router();
// Full implementation added in Chunk 3 Task 14
```

Create `apps/zoom/server/routes/cancel.ts`:
```typescript
import { Router } from 'express';
export const cancelRouter = Router();
// Full implementation added in Chunk 3 Task 15
```

- [ ] **Step 2: Read current index.ts first**

Read `apps/zoom/server/index.ts` to understand the existing structure before editing.

- [ ] **Step 3: Rewrite index.ts to use Express**

Replace the content of `apps/zoom/server/index.ts` with:

```typescript
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { runMigrations } from './db.js';
import { hostsRouter } from './routes/hosts.js';
import { authRouter } from './routes/auth.js';
import { bookingRouter } from './routes/booking.js';
import { cancelRouter } from './routes/cancel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001');
const STATIC_DIR = join(__dirname, '..', 'frontend', 'dist');
const MAX_ROOM_SIZE = 8;

// ── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 100, skip: () => false }));

// Mount scheduling API routes
app.use('/api/host', hostsRouter);
app.use('/api/auth', authRouter);
app.use('/api/book', bookingRouter);
app.use('/api/meeting', cancelRouter);

// Serve static frontend (catch-all — must be last)
const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

app.use((req, res) => {
  let filePath = join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);
  if (!existsSync(filePath)) filePath = join(STATIC_DIR, 'index.html');
  try {
    const content = readFileSync(filePath);
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.end(content);
  } catch {
    res.status(404).send('Not found');
  }
});

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
// Express's http.Server is passed to WebSocketServer — WS upgrade handling unchanged
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const PING_INTERVAL = 30_000;

// ── Room state ───────────────────────────────────────────────────────────────
interface Peer { id: string; ws: WebSocket; name: string; }
interface Room { peers: Peer[]; password: string | null; hostId: string; }
const rooms = new Map<string, Room>();

server.on('upgrade', (req) => {
  console.log(`WS upgrade: ${req.url} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
});

// ── WebSocket handler (identical to original) ────────────────────────────────
wss.on('connection', (ws) => {
  const peerId = randomUUID();
  let currentRoom: string | null = null;
  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, PING_INTERVAL);
  const sendTo = (target: WebSocket, msg: Record<string, unknown>) => {
    if (target.readyState === WebSocket.OPEN) target.send(JSON.stringify(msg));
  };
  console.log(`WS connected [${peerId.slice(0, 8)}]. Total: ${wss.clients.size}`);

  ws.on('message', async (raw) => {
    let msg: { type: string; [key: string]: unknown };
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'join') {
      const roomCode = msg.room as string;
      const peerName = msg.name as string;
      const pwd = (msg.password as string) || null;
      let room = rooms.get(roomCode);
      if (room) {
        if (room.password && room.password !== pwd) { sendTo(ws, { type: 'error', message: 'Incorrect room password' }); return; }
        if (room.peers.length >= MAX_ROOM_SIZE) { sendTo(ws, { type: 'error', message: `Room is full (max ${MAX_ROOM_SIZE})` }); return; }
      } else {
        room = { peers: [], password: pwd, hostId: peerId };
        rooms.set(roomCode, room);
      }
      currentRoom = roomCode;
      console.log(`[${peerId.slice(0, 8)}] joined room ${roomCode} as "${peerName}" (${room.peers.length + 1} peers)`);
      sendTo(ws, { type: 'joined', peerId, isHost: room.hostId === peerId, hasPassword: !!room.password, peers: room.peers.map(p => ({ id: p.id, name: p.name })) });
      for (const peer of room.peers) sendTo(peer.ws, { type: 'peer-joined', peerId, name: peerName });
      room.peers.push({ id: peerId, ws, name: peerName });
      return;
    }
    if (['offer', 'answer', 'ice-candidate'].includes(msg.type) && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const target = room.peers.find(p => p.id === msg.targetId);
      if (target) { const fwd = { ...msg, fromId: peerId } as Record<string, unknown>; delete fwd.targetId; sendTo(target.ws, fwd); }
      return;
    }
    if (msg.type === 'chat' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      const chatMsg = { type: 'chat', fromId: peerId, fromName: sender?.name || 'Unknown', text: (msg.text as string).slice(0, 2000), timestamp: Date.now() };
      for (const peer of room.peers) sendTo(peer.ws, chatMsg);
      return;
    }
    if (msg.type === 'annotation' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      for (const peer of room.peers) { if (peer.ws !== ws) sendTo(peer.ws, { type: 'annotation', fromId: peerId, data: msg.data }); }
      return;
    }
    if (msg.type === 'set-password' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room || room.hostId !== peerId) return;
      room.password = (msg.password as string) || null;
      for (const peer of room.peers) sendTo(peer.ws, { type: 'room-updated', hasPassword: !!room.password });
      return;
    }
    if (msg.type === 'kick' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room || room.hostId !== peerId) return;
      const target = room.peers.find(p => p.id === msg.targetId as string);
      if (target) { sendTo(target.ws, { type: 'kicked' }); target.ws.close(); }
      return;
    }
    if (msg.type === 'hand-raise' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      for (const peer of room.peers) sendTo(peer.ws, { type: 'hand-raise', peerId, raised: !!msg.raised });
      return;
    }
    if (msg.type === 'screen-share' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      for (const peer of room.peers) sendTo(peer.ws, { type: 'screen-share', peerId, sharing: !!msg.sharing });
      return;
    }
    if (msg.type === 'reaction' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      for (const peer of room.peers) sendTo(peer.ws, { type: 'reaction', fromId: peerId, fromName: sender?.name || 'Unknown', emoji: (msg.emoji as string).slice(0, 4) });
      return;
    }
    if (msg.type === 'recording-start' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      for (const peer of room.peers) sendTo(peer.ws, { type: 'recording-start', recorderId: peerId, recorderName: sender?.name || 'Unknown', timestamp: Date.now() });
      return;
    }
    if (msg.type === 'recording-consent' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      for (const peer of room.peers) sendTo(peer.ws, { type: 'recording-consent', peerId, peerName: sender?.name || 'Unknown', consented: !!msg.consented });
      return;
    }
    if (msg.type === 'recording-stop' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      for (const peer of room.peers) sendTo(peer.ws, { type: 'recording-stop', recorderId: peerId });
      return;
    }
    if (msg.type === 'end-meeting' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room || room.hostId !== peerId) return;
      for (const peer of room.peers) { sendTo(peer.ws, { type: 'meeting-ended' }); peer.ws.close(); }
      rooms.delete(currentRoom);
      return;
    }
  });

  ws.on('close', () => {
    clearInterval(pingTimer);
    if (!currentRoom) return;
    const room = rooms.get(currentRoom); if (!room) return;
    room.peers = room.peers.filter(p => p.id !== peerId);
    if (room.peers.length === 0) {
      rooms.delete(currentRoom);
    } else {
      if (room.hostId === peerId) {
        room.hostId = room.peers[0].id;
        sendTo(room.peers[0].ws, { type: 'host-transfer' });
      }
      for (const peer of room.peers) sendTo(peer.ws, { type: 'peer-left', peerId });
    }
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
runMigrations()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Zietra Meet running at http://localhost:${PORT} (max ${MAX_ROOM_SIZE}/room)`);
    });
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
```

- [ ] **Step 4: Verify server starts locally (if DATABASE_URL is available)**

```bash
cd apps/zoom/server
DATABASE_URL='' JWT_SECRET=test TOKEN_ENCRYPT_KEY=0000000000000000000000000000000000000000000000000000000000000000 SMTP_USER=x SMTP_PASSWORD=x tsx index.ts &
sleep 2
curl -s http://localhost:3001/ | head -5
kill %1
```
Expected: HTML from the frontend served, or `Not found` if no dist build — no crash.

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/routes/auth.ts apps/zoom/server/routes/booking.ts apps/zoom/server/routes/cancel.ts apps/zoom/server/index.ts
git commit -m "feat(zoom): migrate server to Express; mount scheduling API routes (stub routes)"
```

---

## Chunk 2: Calendar Integration + Slot Computation

### Task 9: iCal generation

**Files:**
- Create: `apps/zoom/server/ical.ts`
- Create: `apps/zoom/server/tests/ical.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/zoom/server/tests/ical.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildIcs } from '../ical.js';

const meeting = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ics_uid: '550e8400-e29b-41d4-a716-446655440000@meet.vibingticket.com',
  title: 'Product Review',
  scheduled_at: new Date('2026-04-10T14:00:00Z'),
  duration_min: 30,
  room_code: 'ABC123',
  host_email: 'peter@techcloudpro.com',
  guest_email: 'guest@example.com',
};

describe('buildIcs', () => {
  it('includes the correct UID', () => {
    const ics = buildIcs(meeting, 'REQUEST');
    expect(ics).toContain('UID:550e8400-e29b-41d4-a716-446655440000@meet.vibingticket.com');
  });

  it('includes METHOD:REQUEST for booking', () => {
    expect(buildIcs(meeting, 'REQUEST')).toContain('METHOD:REQUEST');
  });

  it('includes METHOD:CANCEL for cancellation', () => {
    expect(buildIcs(meeting, 'CANCEL')).toContain('METHOD:CANCEL');
  });

  it('includes the join URL', () => {
    const ics = buildIcs(meeting, 'REQUEST');
    expect(ics).toContain('meet.vibingticket.com/?room=ABC123');
  });

  it('DTEND is 30 min after DTSTART', () => {
    const ics = buildIcs(meeting, 'REQUEST');
    expect(ics).toContain('DTSTART:20260410T140000Z');
    expect(ics).toContain('DTEND:20260410T143000Z');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/ical.test.ts 2>&1 | head -20
```
Expected: FAIL with "Cannot find module '../ical.js'"

- [ ] **Step 3: Implement ical.ts**

Create `apps/zoom/server/ical.ts`:

```typescript
function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

interface MeetingForIcs {
  ics_uid: string;
  title: string;
  scheduled_at: Date;
  duration_min: number;
  room_code: string;
  host_email: string;
  guest_email: string;
}

export function buildIcs(meeting: MeetingForIcs, method: 'REQUEST' | 'CANCEL'): string {
  const start = new Date(meeting.scheduled_at);
  const end = new Date(start.getTime() + meeting.duration_min * 60_000);
  const joinUrl = `https://meet.vibingticket.com/?room=${meeting.room_code}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zietra Meet//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${meeting.ics_uid}`,
    `SUMMARY:${meeting.title}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `DESCRIPTION:Join: ${joinUrl}\\nRoom code: ${meeting.room_code}`,
    `URL:${joinUrl}`,
    `ORGANIZER:mailto:${meeting.host_email}`,
    `ATTENDEE:mailto:${meeting.guest_email}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/ical.test.ts 2>&1 | tail -10
```
Expected: `Tests 5 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/ical.ts apps/zoom/server/tests/ical.test.ts
git commit -m "feat(zoom): add .ics calendar file generation"
```

---

### Task 10: Slot computation

**Files:**
- Create: `apps/zoom/server/calendar/slots.ts`
- Create: `apps/zoom/server/tests/slots.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/zoom/server/tests/slots.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { subtractBusyWindows, computeSlotsFromRules } from '../calendar/slots.js';

describe('subtractBusyWindows', () => {
  it('removes slots that fall within a busy window', () => {
    const slots = [
      new Date('2026-04-10T09:00:00Z'),
      new Date('2026-04-10T09:30:00Z'),
      new Date('2026-04-10T10:00:00Z'),
    ];
    const busy = [{ start: new Date('2026-04-10T09:15:00Z'), end: new Date('2026-04-10T09:45:00Z') }];
    const result = subtractBusyWindows(slots, busy, 30);
    // 09:00 slot: end = 09:30, overlaps busy 09:15–09:45? yes (09:00 < 09:45 AND 09:30 > 09:15)
    // 09:30 slot: end = 10:00, overlaps busy 09:15–09:45? yes (09:30 < 09:45 AND 10:00 > 09:15)
    // 10:00 slot: end = 10:30, overlaps busy 09:15–09:45? no (10:00 >= 09:45)
    expect(result).toHaveLength(1);
    expect(result[0].toISOString()).toBe('2026-04-10T10:00:00.000Z');
  });

  it('keeps all slots when no busy windows', () => {
    const slots = [new Date('2026-04-10T09:00:00Z'), new Date('2026-04-10T09:30:00Z')];
    expect(subtractBusyWindows(slots, [], 30)).toHaveLength(2);
  });
});

describe('computeSlotsFromRules', () => {
  it('generates slots within a working window', () => {
    // Monday (day 1), 09:00–11:00, 30-min slots
    const rules = [{ day_of_week: 1, start_time: '09:00', end_time: '11:00' }];
    // 2026-04-06 is a Monday
    const from = new Date('2026-04-06T00:00:00Z');
    const to = new Date('2026-04-06T23:59:59Z');
    const slots = computeSlotsFromRules(rules, from, to, 30, 'UTC');
    // Expect slots: 09:00, 09:30, 10:00, 10:30
    expect(slots).toHaveLength(4);
    expect(slots[0].toISOString()).toBe('2026-04-06T09:00:00.000Z');
    expect(slots[3].toISOString()).toBe('2026-04-06T10:30:00.000Z');
  });

  it('returns no slots on days without rules', () => {
    const rules = [{ day_of_week: 1, start_time: '09:00', end_time: '11:00' }]; // Mon only
    // 2026-04-07 is a Tuesday
    const from = new Date('2026-04-07T00:00:00Z');
    const to = new Date('2026-04-07T23:59:59Z');
    expect(computeSlotsFromRules(rules, from, to, 30, 'UTC')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/slots.test.ts 2>&1 | head -20
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement calendar/slots.ts**

Create `apps/zoom/server/calendar/slots.ts`:

```typescript
export interface BusyWindow { start: Date; end: Date; }
export interface AvailabilityRule { day_of_week: number; start_time: string; end_time: string; }

/** Remove slots whose window [slot, slot+slotMin) overlaps any busy window */
export function subtractBusyWindows(slots: Date[], busy: BusyWindow[], slotMinutes: number): Date[] {
  return slots.filter(slot => {
    const slotEnd = new Date(slot.getTime() + slotMinutes * 60_000);
    return !busy.some(b => slot < b.end && slotEnd > b.start);
  });
}

/** Generate all slot start times within [from, to] based on day-of-week rules */
export function computeSlotsFromRules(
  rules: AvailabilityRule[],
  from: Date,
  to: Date,
  slotMinutes: number,
  timezone: string,
): Date[] {
  const slots: Date[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= to) {
    // Get day of week in host's timezone using Intl
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(cursor);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[dayName];

    for (const rule of rules) {
      if (rule.day_of_week !== dayOfWeek) continue;
      const [sh, sm] = rule.start_time.split(':').map(Number);
      const [eh, em] = rule.end_time.split(':').map(Number);
      const dayStart = new Date(cursor);
      dayStart.setUTCHours(sh, sm, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setUTCHours(eh, em, 0, 0);

      let t = new Date(dayStart);
      while (new Date(t.getTime() + slotMinutes * 60_000) <= dayEnd) {
        slots.push(new Date(t));
        t = new Date(t.getTime() + slotMinutes * 60_000);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return slots;
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/slots.test.ts 2>&1 | tail -10
```
Expected: `Tests 4 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/calendar/slots.ts apps/zoom/server/tests/slots.test.ts
git commit -m "feat(zoom): add slot computation from availability rules"
```

---

### Task 11: Google Calendar OAuth + free/busy

**Files:**
- Create: `apps/zoom/server/calendar/google.ts`
- Create: `apps/zoom/server/routes/auth.ts` (partial — Google section)

- [ ] **Step 1: Create google.ts**

Create `apps/zoom/server/calendar/google.ts`:

```typescript
import { google } from 'googleapis';
import { pool } from '../db.js';
import { encrypt, decrypt } from '../crypto.js';
import type { BusyWindow } from './slots.js';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'https://meet.vibingticket.com'}/api/auth/google/callback`
  );
}

export function getGoogleAuthUrl(stateJwt: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.freebusy', 'https://www.googleapis.com/auth/calendar.readonly'],
    state: stateJwt,
    prompt: 'consent',
  });
}

export async function exchangeGoogleCode(code: string, hostId: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) throw new Error('missing_tokens');
  await pool.query(
    `INSERT INTO calendar_tokens (host_id, provider, access_token, refresh_token, expires_at)
     VALUES ($1, 'google', $2, $3, $4)
     ON CONFLICT (host_id, provider) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at`,
    [hostId, encrypt(tokens.access_token), encrypt(tokens.refresh_token), new Date(tokens.expiry_date!)]
  );
}

export async function getGoogleBusyTimes(hostId: string, from: Date, to: Date): Promise<BusyWindow[]> {
  const { rows } = await pool.query(
    `SELECT access_token, refresh_token, expires_at FROM calendar_tokens WHERE host_id = $1 AND provider = 'google'`,
    [hostId]
  );
  if (!rows[0]) throw new Error('calendar_disconnected');

  const client = getOAuth2Client();
  // Refresh if within 5 minutes of expiry
  const expiresAt = new Date(rows[0].expires_at);
  const needsRefresh = expiresAt.getTime() - Date.now() < 5 * 60_000;
  if (needsRefresh) {
    client.setCredentials({ refresh_token: decrypt(rows[0].refresh_token) });
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      await pool.query('DELETE FROM calendar_tokens WHERE host_id = $1 AND provider = $2', [hostId, 'google']);
      throw new Error('calendar_disconnected');
    }
    await pool.query(
      `UPDATE calendar_tokens SET access_token=$1, expires_at=$2 WHERE host_id=$3 AND provider='google'`,
      [encrypt(credentials.access_token), new Date(credentials.expiry_date!), hostId]
    );
    client.setCredentials({ access_token: credentials.access_token });
  } else {
    client.setCredentials({ access_token: decrypt(rows[0].access_token) });
  }

  const calendar = google.calendar({ version: 'v3', auth: client });
  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  const windows = data.calendars?.primary?.busy || [];
  return windows.map(w => ({ start: new Date(w.start!), end: new Date(w.end!) }));
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/server/calendar/google.ts
git commit -m "feat(zoom): add Google Calendar OAuth + freebusy integration"
```

---

### Task 12: Microsoft Calendar OAuth + calendar view

**Files:**
- Create: `apps/zoom/server/calendar/microsoft.ts`

- [ ] **Step 1: Create microsoft.ts**

Create `apps/zoom/server/calendar/microsoft.ts`:

```typescript
import * as msal from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { pool } from '../db.js';
import { encrypt, decrypt } from '../crypto.js';
import type { BusyWindow } from './slots.js';

const SCOPES = ['Calendars.Read', 'offline_access'];

function getMsalApp() {
  return new msal.ConfidentialClientApplication({
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authority: 'https://login.microsoftonline.com/common',
    },
  });
}

export function getMicrosoftAuthUrl(stateJwt: string): string {
  const redirectUri = `${process.env.APP_URL || 'https://meet.vibingticket.com'}/api/auth/microsoft/callback`;
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES.join(' '))}&state=${stateJwt}&prompt=consent`;
}

export async function exchangeMicrosoftCode(code: string, hostId: string): Promise<void> {
  const app = getMsalApp();
  const redirectUri = `${process.env.APP_URL || 'https://meet.vibingticket.com'}/api/auth/microsoft/callback`;
  const result = await app.acquireTokenByCode({ code, scopes: SCOPES, redirectUri });
  if (!result?.accessToken) throw new Error('missing_tokens');
  const refreshToken = (result as any).refreshToken || '';
  const expiresAt = result.expiresOn ? new Date(result.expiresOn) : new Date(Date.now() + 3600_000);
  await pool.query(
    `INSERT INTO calendar_tokens (host_id, provider, access_token, refresh_token, expires_at)
     VALUES ($1, 'microsoft', $2, $3, $4)
     ON CONFLICT (host_id, provider) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at`,
    [hostId, encrypt(result.accessToken), encrypt(refreshToken), expiresAt]
  );
}

export async function getMicrosoftBusyTimes(hostId: string, from: Date, to: Date): Promise<BusyWindow[]> {
  const { rows } = await pool.query(
    `SELECT access_token, refresh_token, expires_at FROM calendar_tokens WHERE host_id = $1 AND provider = 'microsoft'`,
    [hostId]
  );
  if (!rows[0]) throw new Error('calendar_disconnected');

  let accessToken = decrypt(rows[0].access_token);
  const expiresAt = new Date(rows[0].expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60_000) {
    // MSAL does not expose acquireTokenByRefreshToken publicly — call the token endpoint directly
    const refreshToken = decrypt(rows[0].refresh_token);
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: SCOPES.join(' '),
        }).toString(),
      }
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      await pool.query('DELETE FROM calendar_tokens WHERE host_id = $1 AND provider = $2', [hostId, 'microsoft']);
      throw new Error('calendar_disconnected');
    }
    accessToken = tokenData.access_token;
    const newExpiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : new Date(Date.now() + 3600_000);
    // Persist refreshed tokens
    const newRefresh = tokenData.refresh_token || refreshToken;
    await pool.query(
      `UPDATE calendar_tokens SET access_token=$1, refresh_token=$2, expires_at=$3 WHERE host_id=$4 AND provider='microsoft'`,
      [encrypt(accessToken), encrypt(newRefresh), newExpiry, hostId]
    );
  }

  const graphClient = Client.init({ authProvider: done => done(null, accessToken) });
  const events = await graphClient
    .api('/me/calendarView')
    .header('Prefer', 'outlook.timezone="UTC"')  // Ensures dateTime values are returned in UTC
    .query({ startDateTime: from.toISOString(), endDateTime: to.toISOString() })
    .select('start,end')
    .get();

  // With Prefer: outlook.timezone="UTC", dateTime values are UTC — safe to append 'Z'
  return (events.value || []).map((e: any) => ({
    start: new Date(e.start.dateTime + 'Z'),
    end: new Date(e.end.dateTime + 'Z'),
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/server/calendar/microsoft.ts
git commit -m "feat(zoom): add Microsoft Calendar OAuth + calendarView integration"
```

---

### Task 13: Auth routes (magic link + OAuth callbacks)

**Files:**
- Create: `apps/zoom/server/routes/auth.ts`

- [ ] **Step 1: Create auth routes**

Create `apps/zoom/server/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { signJwt, verifyJwt } from '../auth.js';
import { getGoogleAuthUrl, exchangeGoogleCode } from '../calendar/google.js';
import { getMicrosoftAuthUrl, exchangeMicrosoftCode } from '../calendar/microsoft.js';
import { requireHostAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

const APP_URL = process.env.APP_URL || 'https://meet.vibingticket.com';

// POST /api/auth/magic — exchange magic JWT for session JWT
authRouter.post('/magic', (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ error: 'token_required' });
  const payload = verifyJwt(token) as { host_id?: string; type?: string } | null;
  if (!payload || payload.type !== 'magic' || !payload.host_id) {
    return res.status(401).json({ error: 'invalid_or_expired_magic_link' });
  }
  const sessionToken = signJwt({ host_id: payload.host_id, type: 'session' }, '7d');
  res.json({ token: sessionToken });
});

// GET /api/auth/google — start Google OAuth
authRouter.get('/google', requireHostAuth, (req, res) => {
  const hostId = (req as any).hostId;
  const state = signJwt({ host_id: hostId, provider: 'google', nonce: randomUUID() }, '10m');
  res.redirect(getGoogleAuthUrl(state));
});

// GET /api/auth/google/callback
authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) return res.status(400).json({ error: 'missing_params' });
  const payload = verifyJwt(state) as { host_id?: string; provider?: string } | null;
  if (!payload || payload.provider !== 'google' || !payload.host_id) {
    return res.status(400).json({ error: 'invalid_state' });
  }
  try {
    await exchangeGoogleCode(code, payload.host_id);
    res.redirect(`${APP_URL}/schedule/setup?calendar=connected`);
  } catch {
    res.redirect(`${APP_URL}/schedule/setup?calendar=error`);
  }
});

// GET /api/auth/microsoft — start Microsoft OAuth
authRouter.get('/microsoft', requireHostAuth, (req, res) => {
  const hostId = (req as any).hostId;
  const state = signJwt({ host_id: hostId, provider: 'microsoft', nonce: randomUUID() }, '10m');
  res.redirect(getMicrosoftAuthUrl(state));
});

// GET /api/auth/microsoft/callback
authRouter.get('/microsoft/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) return res.status(400).json({ error: 'missing_params' });
  const payload = verifyJwt(state) as { host_id?: string; provider?: string } | null;
  if (!payload || payload.provider !== 'microsoft' || !payload.host_id) {
    return res.status(400).json({ error: 'invalid_state' });
  }
  try {
    await exchangeMicrosoftCode(code, payload.host_id);
    res.redirect(`${APP_URL}/schedule/setup?calendar=connected`);
  } catch {
    res.redirect(`${APP_URL}/schedule/setup?calendar=error`);
  }
});
```

- [ ] **Step 2: Add slots endpoint to hosts.ts**

Open `apps/zoom/server/routes/hosts.ts` and add at the bottom:

```typescript
import { computeSlotsFromRules } from '../calendar/slots.js';
import { getGoogleBusyTimes } from '../calendar/google.js';
import { getMicrosoftBusyTimes } from '../calendar/microsoft.js';

// GET /api/host/:slug/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
hostsRouter.get('/:slug/slots', async (req, res) => {
  const { slug } = req.params;
  const hostRow = (await pool.query(
    'SELECT id, timezone, slot_minutes, disabled_at FROM hosts WHERE booking_slug = $1',
    [slug]
  )).rows[0];
  if (!hostRow) return res.status(404).json({ error: 'host_not_found' });
  if (hostRow.disabled_at) return res.status(403).json({ error: 'booking_disabled' });

  // Parse date range
  const now = new Date();
  const fromStr = req.query.from as string | undefined;
  const toStr = req.query.to as string | undefined;
  const from = fromStr ? new Date(fromStr + 'T00:00:00Z') : new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
  const to = toStr ? new Date(toStr + 'T23:59:59Z') : new Date(from.getTime() + 7 * 24 * 3600_000);
  if (to.getTime() - from.getTime() > 30 * 24 * 3600_000) {
    return res.status(400).json({ error: 'max_range_30_days' });
  }

  // Get free/busy from calendar or manual rules
  let busyWindows: { start: Date; end: Date }[] = [];
  let slots: Date[] = [];

  const tokenRow = (await pool.query(
    'SELECT provider FROM calendar_tokens WHERE host_id = $1 LIMIT 1',
    [hostRow.id]
  )).rows[0];

  // Helper to fetch already-booked meeting windows from DB
  const fetchBookedWindows = async (hostId: string) => {
    const booked = (await pool.query(
      `SELECT scheduled_at, duration_min FROM meetings WHERE host_id=$1 AND status='confirmed' AND scheduled_at BETWEEN $2 AND $3`,
      [hostId, from, to]
    )).rows;
    return booked.map((r: any) => ({
      start: new Date(r.scheduled_at),
      end: new Date(new Date(r.scheduled_at).getTime() + r.duration_min * 60_000),
    }));
  };

  if (tokenRow?.provider === 'google') {
    try {
      busyWindows = await getGoogleBusyTimes(hostRow.id, from, to);
    } catch {
      return res.status(503).json({ error: 'calendar_unavailable' });
    }
    const { subtractBusyWindows: sub, computeSlotsFromRules: compute } = await import('../calendar/slots.js');
    const rules = (await pool.query('SELECT day_of_week, start_time, end_time FROM availability_rules WHERE host_id = $1', [hostRow.id])).rows;
    if (rules.length === 0) return res.json({ slots: [], warning: 'host_no_availability_set' });
    const allBusy = [...busyWindows, ...(await fetchBookedWindows(hostRow.id))];
    slots = sub(compute(rules, from, to, hostRow.slot_minutes, hostRow.timezone), allBusy, hostRow.slot_minutes);
  } else if (tokenRow?.provider === 'microsoft') {
    try {
      busyWindows = await getMicrosoftBusyTimes(hostRow.id, from, to);
    } catch {
      return res.status(503).json({ error: 'calendar_unavailable' });
    }
    const { subtractBusyWindows: sub, computeSlotsFromRules: compute } = await import('../calendar/slots.js');
    const rules = (await pool.query('SELECT day_of_week, start_time, end_time FROM availability_rules WHERE host_id = $1', [hostRow.id])).rows;
    if (rules.length === 0) return res.json({ slots: [], warning: 'host_no_availability_set' });
    const allBusy = [...busyWindows, ...(await fetchBookedWindows(hostRow.id))];
    slots = sub(compute(rules, from, to, hostRow.slot_minutes, hostRow.timezone), allBusy, hostRow.slot_minutes);
  } else {
    // Manual rules only
    const rules = (await pool.query('SELECT day_of_week, start_time, end_time FROM availability_rules WHERE host_id = $1', [hostRow.id])).rows;
    if (rules.length === 0) return res.json({ slots: [], warning: 'host_no_availability_set' });
    const { computeSlotsFromRules: compute, subtractBusyWindows: sub } = await import('../calendar/slots.js');
    const allSlots = compute(rules, from, to, hostRow.slot_minutes, hostRow.timezone);
    slots = sub(allSlots, await fetchBookedWindows(hostRow.id), hostRow.slot_minutes);
  }

  res.json({ slots: slots.map(s => s.toISOString()) });
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/zoom/server/routes/auth.ts apps/zoom/server/routes/hosts.ts
git commit -m "feat(zoom): add OAuth auth routes and /slots endpoint"
```

---

## Chunk 3: Booking + Email + Cancel Flow (Tasks 14–15)

### Task 14: Booking endpoint

**Files:**
- Create: `apps/zoom/server/routes/booking.ts`
- Create: `apps/zoom/server/tests/booking.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/zoom/server/tests/booking.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB, email, and ical modules
vi.mock('../db.js', () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}));
vi.mock('../email.js', () => ({ sendEmail: vi.fn() }));
vi.mock('../ical.js', () => ({ buildIcs: vi.fn(() => 'BEGIN:VCALENDAR...END:VCALENDAR') }));

import { pool } from '../db.js';
import { sendEmail } from '../email.js';

describe('POST /api/book/:slug', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 404 when host slug not found', async () => {
    (pool.query as any).mockResolvedValueOnce({ rows: [] }); // host lookup
    const { bookingRouter } = await import('../routes/booking.js');
    const express = (await import('express')).default;
    const app = express();
    app.use(express.json());
    app.use('/', bookingRouter);
    const supertest = (await import('supertest')).default;
    const res = await supertest(app).post('/unknown-slug').send({
      scheduled_at: '2026-04-10T14:00:00Z',
      guest_name: 'Alice',
      guest_email: 'alice@example.com',
    });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test — verify it fails (or skips due to missing supertest)**

```bash
npm install --save-dev supertest @types/supertest 2>/dev/null
npx vitest run tests/booking.test.ts 2>&1 | head -30
```
Expected: FAIL with "Cannot find module '../routes/booking.js'"

- [ ] **Step 3: Implement routes/booking.ts**

Create `apps/zoom/server/routes/booking.ts`:

```typescript
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { sendEmail } from '../email.js';
import { buildIcs } from '../ical.js';

export const bookingRouter = Router();

bookingRouter.post('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { scheduled_at, guest_name, guest_email, guest_notes } = req.body as {
    scheduled_at?: string;
    guest_name?: string;
    guest_email?: string;
    guest_notes?: string;
  };

  if (!scheduled_at || !guest_name?.trim() || !guest_email?.trim()) {
    return res.status(400).json({ error: 'scheduled_at, guest_name, guest_email are required' });
  }

  // Look up host
  const hostResult = await pool.query(
    'SELECT id, name, email, timezone, slot_minutes, default_title, disabled_at FROM hosts WHERE booking_slug = $1',
    [slug]
  );
  if (!hostResult.rows[0]) return res.status(404).json({ error: 'host_not_found' });
  const host = hostResult.rows[0];
  if (host.disabled_at) return res.status(403).json({ error: 'booking_disabled' });

  const scheduledAt = new Date(scheduled_at);
  const roomCode = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  const cancelToken = randomUUID();
  const meetingId = randomUUID();
  const icsUid = `${meetingId}@meet.vibingticket.com`;
  const title = host.default_title || 'Meeting';

  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock host row
    await client.query('SELECT id FROM hosts WHERE id = $1 FOR UPDATE', [host.id]);

    // Check for overlap: existing confirmed meeting's window overlaps requested slot
    const conflict = await client.query(
      `SELECT id FROM meetings
       WHERE host_id = $1 AND status = 'confirmed'
         AND scheduled_at < $2::timestamptz + $3 * interval '1 minute'
         AND (scheduled_at + duration_min * interval '1 minute') > $2::timestamptz`,
      [host.id, scheduledAt, host.slot_minutes]
    );
    if (conflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'slot_taken' });
    }

    await client.query(
      `INSERT INTO meetings
         (id, host_id, room_code, title, scheduled_at, duration_min, guest_name, guest_email, guest_notes, cancel_token, ics_uid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [meetingId, host.id, roomCode, title, scheduledAt, host.slot_minutes, guest_name.trim(), guest_email.trim(), guest_notes || null, cancelToken, icsUid]
    );

    await client.query('COMMIT');
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.code === '40001') return res.status(409).json({ error: 'slot_taken' }); // serialization failure
    throw e;
  } finally {
    client.release();
  }

  // Build .ics
  const meetingForIcs = {
    ics_uid: icsUid,
    title,
    scheduled_at: scheduledAt,
    duration_min: host.slot_minutes,
    room_code: roomCode,
    host_email: host.email,
    guest_email: guest_email.trim(),
  };
  const icsContent = buildIcs(meetingForIcs, 'REQUEST');
  const icsAttachment = [{ filename: 'invite.ics', content: icsContent, contentType: 'text/calendar' }];
  const cancelLink = `${process.env.APP_URL || 'https://meet.vibingticket.com'}/api/meeting/cancel?token=${cancelToken}`;
  const joinLink = `${process.env.APP_URL || 'https://meet.vibingticket.com'}/?room=${roomCode}`;

  const timeStr = scheduledAt.toUTCString();

  // Send guest confirmation
  await sendEmail({
    to: guest_email.trim(),
    subject: `Confirmed: ${title}`,
    replyTo: host.email,
    html: `<h2>Meeting confirmed!</h2>
<p><strong>${title}</strong></p>
<p><strong>When:</strong> ${timeStr}</p>
<p><strong>Duration:</strong> ${host.slot_minutes} minutes</p>
<p><a href="${joinLink}" style="background:#4cc9f0;padding:10px 20px;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;">Join Meeting</a></p>
<p>Add to calendar: <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${scheduledAt.toISOString().replace(/[-:]/g, '').split('.')[0]}Z">Google</a> | Download .ics below</p>
<p><a href="${cancelLink}">Cancel this meeting</a></p>`,
    attachments: icsAttachment,
  });

  // Send host notification
  await sendEmail({
    to: host.email,
    subject: `New booking: ${title} — ${guest_name}`,
    replyTo: guest_email.trim(),
    html: `<h2>New meeting booked!</h2>
<p><strong>${guest_name}</strong> booked <strong>${title}</strong></p>
<p><strong>When:</strong> ${timeStr}</p>
${guest_notes ? `<p><strong>Notes:</strong> ${guest_notes}</p>` : ''}
<p><a href="${joinLink}" style="background:#4cc9f0;padding:10px 20px;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;">Join Meeting</a></p>`,
    attachments: icsAttachment,
  });

  res.status(201).json({
    id: meetingId,
    room_code: roomCode,
    title,
    scheduled_at: scheduledAt.toISOString(),
    join_url: joinLink,
  });
});
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/booking.test.ts 2>&1 | tail -10
```
Expected: `Tests 1 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/routes/booking.ts apps/zoom/server/tests/booking.test.ts
git commit -m "feat(zoom): add booking endpoint with serializable transaction and email"
```

---

### Task 15: Cancel flow

**Files:**
- Create: `apps/zoom/server/routes/cancel.ts`
- Create: `apps/zoom/server/tests/cancel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/zoom/server/tests/cancel.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db.js', () => ({ pool: { query: vi.fn() } }));
vi.mock('../email.js', () => ({ sendEmail: vi.fn() }));
vi.mock('../ical.js', () => ({ buildIcs: vi.fn(() => 'BEGIN:VCALENDAR\nMETHOD:CANCEL\nUID:test-uid\nEND:VCALENDAR') }));

import { pool } from '../db.js';
import { buildIcs } from '../ical.js';

describe('GET /api/meeting/cancel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 for unknown cancel token', async () => {
    (pool.query as any).mockResolvedValueOnce({ rows: [] });
    const { cancelRouter } = await import('../routes/cancel.js');
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const app = express();
    app.use(express.json());
    app.use('/', cancelRouter);
    const res = await supertest(app).get('/cancel?token=unknown-token');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/meeting/cancel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls buildIcs with METHOD:CANCEL and matching ics_uid', async () => {
    const icsUid = 'meeting-uid-123@meet.vibingticket.com';
    // Mock: nonce lookup → meeting row
    (pool.query as any)
      .mockResolvedValueOnce({ rows: [{
        id: 'mtg-1', title: 'Product Review', scheduled_at: '2026-04-10T14:00:00Z',
        duration_min: 30, host_name: 'Jeet', host_email: 'host@example.com',
        guest_name: 'Alice Guest', guest_email: 'guest@example.com',
        ics_uid: icsUid, room_code: 'ABC123',
        cancel_nonce_expires_at: new Date(Date.now() + 300_000),
      }] })
      // Mock: UPDATE status to cancelled
      .mockResolvedValueOnce({ rows: [] });

    const { cancelRouter } = await import('../routes/cancel.js');
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const app = express();
    app.use(express.json());
    app.use('/', cancelRouter);

    const res = await supertest(app).post('/cancel').send({ nonce: 'valid-nonce' });
    expect(res.status).toBe(200);
    // Verify buildIcs was called with CANCEL method and correct ics_uid
    expect(buildIcs).toHaveBeenCalledWith(
      expect.objectContaining({ ics_uid: icsUid }),
      'CANCEL'
    );
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/cancel.test.ts 2>&1 | head -20
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement routes/cancel.ts**

Create `apps/zoom/server/routes/cancel.ts`:

```typescript
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { sendEmail } from '../email.js';
import { buildIcs } from '../ical.js';

export const cancelRouter = Router();

const APP_URL = process.env.APP_URL || 'https://meet.vibingticket.com';

// GET /api/meeting/cancel?token={cancelToken}
// Validates cancel token, sets a short-lived nonce, redirects to /cancel?nonce=
cancelRouter.get('/cancel', async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: 'token_required' });

  const { rows } = await pool.query(
    `SELECT m.id FROM meetings m WHERE m.cancel_token = $1 AND m.status = 'confirmed'`,
    [token]
  );
  if (!rows[0]) return res.status(404).json({ error: 'meeting_not_found' });

  const nonce = randomUUID();
  const nonceExpiry = new Date(Date.now() + 30 * 60_000); // 30 min
  await pool.query(
    `UPDATE meetings SET cancel_nonce = $1, cancel_nonce_expires_at = $2 WHERE id = $3`,
    [nonce, nonceExpiry, rows[0].id]
  );

  res.redirect(`${APP_URL}/cancel?nonce=${nonce}`);
});

// GET /api/meeting/by-nonce/:nonce — fetch meeting info for cancel confirmation page
cancelRouter.get('/by-nonce/:nonce', async (req, res) => {
  const { nonce } = req.params;
  const { rows } = await pool.query(
    `SELECT m.id, m.title, m.scheduled_at, m.duration_min, h.name AS host_name
     FROM meetings m
     JOIN hosts h ON h.id = m.host_id
     WHERE m.cancel_nonce = $1 AND m.cancel_nonce_expires_at > NOW() AND m.status = 'confirmed'`,
    [nonce]
  );
  if (!rows[0]) return res.status(404).json({ error: 'nonce_invalid_or_expired' });
  res.json(rows[0]);
});

// POST /api/meeting/cancel — body: { nonce }
cancelRouter.post('/cancel', async (req, res) => {
  const { nonce } = req.body as { nonce?: string };
  if (!nonce) return res.status(400).json({ error: 'nonce_required' });

  const { rows } = await pool.query(
    `SELECT m.id, m.title, m.scheduled_at, m.duration_min, m.room_code, m.guest_name, m.guest_email, m.ics_uid,
            h.name AS host_name, h.email AS host_email
     FROM meetings m
     JOIN hosts h ON h.id = m.host_id
     WHERE m.cancel_nonce = $1 AND m.cancel_nonce_expires_at > NOW() AND m.status = 'confirmed'`,
    [nonce]
  );
  if (!rows[0]) return res.status(404).json({ error: 'nonce_invalid_or_expired' });

  const meeting = rows[0];

  await pool.query(
    `UPDATE meetings SET status = 'cancelled', cancel_nonce = NULL, cancel_nonce_expires_at = NULL WHERE id = $1`,
    [meeting.id]
  );

  // Build cancel .ics
  const cancelIcs = buildIcs({
    ics_uid: meeting.ics_uid,
    title: meeting.title,
    scheduled_at: new Date(meeting.scheduled_at),
    duration_min: meeting.duration_min,
    room_code: meeting.room_code,
    host_email: meeting.host_email,
    guest_email: meeting.guest_email,
  }, 'CANCEL');
  const icsAttachment = [{ filename: 'cancel.ics', content: cancelIcs, contentType: 'text/calendar' }];

  // Notify guest
  await sendEmail({
    to: meeting.guest_email,
    subject: `Cancelled: ${meeting.title}`,
    html: `<p>Your meeting <strong>${meeting.title}</strong> on ${new Date(meeting.scheduled_at).toUTCString()} has been cancelled.</p>`,
    attachments: icsAttachment,
  });

  // Notify host
  await sendEmail({
    to: meeting.host_email,
    subject: `Booking cancelled: ${meeting.title} — ${meeting.guest_name}`,
    replyTo: meeting.guest_email,
    html: `<p><strong>${meeting.guest_name}</strong> cancelled <strong>${meeting.title}</strong> on ${new Date(meeting.scheduled_at).toUTCString()}.</p>`,
    attachments: icsAttachment,
  });

  res.json({ ok: true });
});
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/cancel.test.ts 2>&1 | tail -10
```
Expected: `Tests 2 passed` (404 test + cancel happy-path test)

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/server/routes/cancel.ts apps/zoom/server/tests/cancel.test.ts
git commit -m "feat(zoom): add cancel flow with nonce redirect and email notifications"
```

---

## Chunk 4: Frontend + Dockerfile + Deploy

### Task 16: Frontend routing

**Files:**
- Modify: `apps/zoom/frontend/src/App.tsx`

- [ ] **Step 1: Add path-based routing to App.tsx**

Open `apps/zoom/frontend/src/App.tsx` and replace the content with:

```tsx
import { useState, useEffect } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { CallScreen } from './components/CallScreen';
import { BookingPage } from './pages/BookingPage';
import { CancelPage } from './pages/CancelPage';

function getRoomFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

function getPath(): string {
  return window.location.pathname;
}

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string; password?: string } | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [initialRoom] = useState<string | null>(getRoomFromURL);
  const [path] = useState(getPath);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (joined) {
      url.searchParams.set('room', joined.room);
      window.history.pushState({ inMeeting: true }, '', url.toString());
    } else {
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  }, [joined]);

  // Route: /book/:slug
  const bookMatch = path.match(/^\/book\/([a-z0-9-]+)$/);
  if (bookMatch) return <BookingPage slug={bookMatch[1]} />;

  // Route: /cancel
  if (path === '/cancel') return <CancelPage />;

  if (!joined) {
    return (
      <JoinScreen
        onJoin={(name, room, password) => setJoined({ name, room, password })}
        initialRoom={initialRoom}
      />
    );
  }

  return (
    <CallScreen
      name={joined.name}
      room={joined.room}
      password={joined.password}
      key={sessionKey}
      onLeave={() => { setJoined(null); setSessionKey(k => k + 1); }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/frontend/src/App.tsx
git commit -m "feat(zoom-frontend): add path-based routing for /book/:slug and /cancel"
```

---

### Task 17: API helper module

**Files:**
- Create: `apps/zoom/frontend/src/lib/api.ts`

- [ ] **Step 1: Create api.ts**

Create `apps/zoom/frontend/src/lib/api.ts`:

```typescript
const BASE = '';  // same origin

async function req<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw Object.assign(new Error(err.error || 'request_failed'), { status: res.status, body: err });
  }
  return res.json();
}

export const api = {
  registerHost: (name: string, email: string) =>
    req('POST', '/api/host/register', { name, email }),

  exchangeMagic: (token: string) =>
    req<{ token: string }>('POST', '/api/auth/magic', { token }),

  getHost: (slug: string) =>
    req<{ id: string; name: string; timezone: string; slot_minutes: number; default_title: string; calendar_connected: boolean }>('GET', `/api/host/${slug}`),

  getSlots: (slug: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return req<{ slots: string[]; warning?: string }>('GET', `/api/host/${slug}/slots?${params}`);
  },

  getHostMe: (token: string) =>
    req<{ id: string; name: string; email: string; booking_slug: string; timezone: string; slot_minutes: number }>('GET', '/api/host/me', undefined, token),

  updateProfile: (data: object, token: string) =>
    req('PUT', '/api/host/me', data, token),

  setAvailability: (rules: { day_of_week: number; start_time: string; end_time: string }[], token: string) =>
    req('POST', '/api/host/me/availability', { rules }, token),

  bookSlot: (slug: string, data: { scheduled_at: string; guest_name: string; guest_email: string; guest_notes?: string }) =>
    req<{ id: string; room_code: string; join_url: string; title: string; scheduled_at: string }>('POST', `/api/book/${slug}`, data),

  getMeetingByNonce: (nonce: string) =>
    req<{ id: string; title: string; scheduled_at: string; duration_min: number; host_name: string }>('GET', `/api/meeting/by-nonce/${nonce}`),

  cancelMeeting: (nonce: string) =>
    req('POST', '/api/meeting/cancel', { nonce }),
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/frontend/src/lib/api.ts
git commit -m "feat(zoom-frontend): add typed API helper module"
```

---

### Task 18: BookingPage component

**Files:**
- Create: `apps/zoom/frontend/src/pages/BookingPage.tsx`

- [ ] **Step 1: Create BookingPage.tsx**

Create `apps/zoom/frontend/src/pages/BookingPage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Props { slug: string; }

type Step = 'loading' | 'pick-slot' | 'confirm' | 'done' | 'error';

export function BookingPage({ slug }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [hostInfo, setHostInfo] = useState<{ name: string; slot_minutes: number } | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [booking, setBooking] = useState<{ join_url: string; title: string; scheduled_at: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const host = await api.getHost(slug);
        setHostInfo(host);
        const { slots: s } = await api.getSlots(slug);
        setSlots(s);
        // Always go to pick-slot; empty-slots message shown inside that step
        setStep('pick-slot');
      } catch (e: any) {
        // 403 = booking disabled, 404 = host not found, 503 = calendar API down
        setStep('error');
      }
    })();
  }, [slug]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !guestName.trim() || !guestEmail.trim()) return;
    try {
      const result = await api.bookSlot(slug, {
        scheduled_at: selectedSlot,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim(),
        guest_notes: guestNotes.trim() || undefined,
      });
      setBooking(result);
      setStep('done');
    } catch (e: any) {
      setError(e.body?.error === 'slot_taken' ? 'That slot was just taken — please pick another.' : 'Booking failed, please try again.');
      setSelectedSlot(null);
      setStep('pick-slot');
    }
  };

  const formatSlot = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

  if (step === 'loading') return <div className="join-screen"><p>Loading…</p></div>;
  if (step === 'error') return <div className="join-screen"><h1>Booking Unavailable</h1><p>This booking page is not available right now.</p></div>;

  if (step === 'done' && booking) return (
    <div className="join-screen">
      <div className="join-logo">✅</div>
      <h1>Meeting confirmed!</h1>
      <p className="subtitle">{booking.title} · {formatSlot(booking.scheduled_at)}</p>
      <p>Check your email for the calendar invite.</p>
      <a href={booking.join_url} className="join-btn" style={{ display: 'block', textAlign: 'center', marginTop: '1rem' }}>
        Join Now
      </a>
      <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Add to calendar:&nbsp;
        <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.title)}&dates=${booking.scheduled_at.replace(/[-:]/g,'').split('.')[0]}Z`} target="_blank" rel="noreferrer">Google Calendar</a>
        &nbsp;·&nbsp;
        <span style={{ color: 'var(--text-muted)' }}>iCal / Outlook — check your email for the .ics attachment</span>
      </p>
    </div>
  );

  if (step === 'confirm') return (
    <div className="join-screen">
      <h1>Book with {hostInfo?.name}</h1>
      <p className="subtitle">{formatSlot(selectedSlot!)}</p>
      <form onSubmit={handleBook}>
        <input type="text" placeholder="Your name" value={guestName} onChange={e => setGuestName(e.target.value)} autoFocus required />
        <input type="email" placeholder="Your email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} required />
        <textarea placeholder="Notes (optional)" value={guestNotes} onChange={e => setGuestNotes(e.target.value)} rows={2} style={{ width: '100%', marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', resize: 'vertical' }} />
        {error && <p style={{ color: '#f5576c', fontSize: '0.85rem' }}>{error}</p>}
        <button type="submit" className="join-btn" disabled={!guestName.trim() || !guestEmail.trim()}>Confirm Booking</button>
        <button type="button" onClick={() => setStep('pick-slot')} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: '100%' }}>← Back</button>
      </form>
    </div>
  );

  // pick-slot
  return (
    <div className="join-screen">
      <div className="join-logo">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#4cc9f0" />
          <path d="M14 18a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H16a2 2 0 01-2-2V18z" fill="#1a1a2e" />
          <path d="M28 21l6-3v12l-6-3V21z" fill="#1a1a2e" />
        </svg>
      </div>
      <h1>Book a meeting with {hostInfo?.name}</h1>
      <p className="subtitle">Pick an available time slot</p>
      {error && <p style={{ color: '#f5576c', fontSize: '0.85rem' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '320px', overflowY: 'auto', marginBottom: '1rem' }}>
        {slots.map(slot => (
          <button
            key={slot}
            onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '10px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.82rem', textAlign: 'left',
            }}
          >
            {formatSlot(slot)}
          </button>
        ))}
      </div>
      {slots.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No available slots in the next 7 days.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/frontend/src/pages/BookingPage.tsx
git commit -m "feat(zoom-frontend): add guest BookingPage with slot picker and confirmation"
```

---

### Task 19: CancelPage component

**Files:**
- Create: `apps/zoom/frontend/src/pages/CancelPage.tsx`

- [ ] **Step 1: Create CancelPage.tsx**

Create `apps/zoom/frontend/src/pages/CancelPage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function CancelPage() {
  const nonce = new URLSearchParams(window.location.search).get('nonce');
  const [meeting, setMeeting] = useState<{ title: string; scheduled_at: string; host_name: string } | null>(null);
  const [status, setStatus] = useState<'loading' | 'confirm' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!nonce) { setStatus('error'); return; }
    api.getMeetingByNonce(nonce).then(m => { setMeeting(m); setStatus('confirm'); }).catch(() => setStatus('error'));
  }, [nonce]);

  const handleCancel = async () => {
    try {
      await api.cancelMeeting(nonce!);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const format = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

  if (status === 'loading') return <div className="join-screen"><p>Loading…</p></div>;
  if (status === 'error') return <div className="join-screen"><h1>Link expired</h1><p>This cancellation link is invalid or has already been used.</p></div>;
  if (status === 'done') return (
    <div className="join-screen">
      <h1>Meeting cancelled</h1>
      <p className="subtitle">Both you and {meeting?.host_name} have been notified.</p>
      <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: 'var(--accent)' }}>Return to Zietra Meet</a>
    </div>
  );

  return (
    <div className="join-screen">
      <h1>Cancel meeting?</h1>
      <p className="subtitle">{meeting?.title}</p>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{format(meeting!.scheduled_at)} with {meeting?.host_name}</p>
      <button className="leave-confirm-leave" style={{ width: '100%' }} onClick={handleCancel}>
        Yes, cancel this meeting
      </button>
      <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No, keep it</a>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/frontend/src/pages/CancelPage.tsx
git commit -m "feat(zoom-frontend): add CancelPage with nonce-based confirmation"
```

---

### Task 20: ScheduleTab + JoinScreen update

**Files:**
- Create: `apps/zoom/frontend/src/components/ScheduleTab.tsx`
- Create: `apps/zoom/frontend/src/components/AvailabilityEditor.tsx`
- Modify: `apps/zoom/frontend/src/components/JoinScreen.tsx`

- [ ] **Step 1: Create AvailabilityEditor.tsx**

Create `apps/zoom/frontend/src/components/AvailabilityEditor.tsx`:

```tsx
import { useState } from 'react';
import { api } from '../lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Rule { day_of_week: number; start_time: string; end_time: string; }
interface Props { token: string; onSaved: () => void; }

export function AvailabilityEditor({ token, onSaved }: Props) {
  const [rules, setRules] = useState<Rule[]>([{ day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addRule = () => setRules(r => [...r, { day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
  const removeRule = (i: number) => setRules(r => r.filter((_, idx) => idx !== i));
  const updateRule = (i: number, field: keyof Rule, value: string | number) =>
    setRules(r => r.map((rule, idx) => idx === i ? { ...rule, [field]: value } : rule));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.setAvailability(rules, token);
      onSaved();
    } catch (e: any) {
      setError(e.body?.error === 'overlapping_rules' ? 'Two rules overlap on the same day.' : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {rules.map((rule, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
          <select value={rule.day_of_week} onChange={e => updateRule(i, 'day_of_week', Number(e.target.value))}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--text)', flex: 1 }}>
            {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
          </select>
          <input type="time" value={rule.start_time} onChange={e => updateRule(i, 'start_time', e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--text)' }} />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input type="time" value={rule.end_time} onChange={e => updateRule(i, 'end_time', e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--text)' }} />
          <button onClick={() => removeRule(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
        </div>
      ))}
      <button onClick={addRule} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '6px', padding: '6px 12px', color: 'var(--text-muted)', cursor: 'pointer', width: '100%', marginBottom: '12px' }}>+ Add time slot</button>
      {error && <p style={{ color: '#f5576c', fontSize: '0.82rem' }}>{error}</p>}
      <button className="join-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save hours'}</button>
    </div>
  );
}
```

- [ ] **Step 2: Create ScheduleTab.tsx**

Create `apps/zoom/frontend/src/components/ScheduleTab.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AvailabilityEditor } from './AvailabilityEditor';

type SetupStep = 'register' | 'check-email' | 'setup' | 'done';

interface Props { initialToken?: string; }

export function ScheduleTab({ initialToken }: Props) {
  // Token prop takes priority over localStorage (avoids stale-closure bug when JoinScreen sets it)
  const [token, setToken] = useState(initialToken || localStorage.getItem('zm_host_token') || '');
  const [slug, setSlug] = useState('');
  const [step, setStep] = useState<SetupStep>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [calendarSetup, setCalendarSetup] = useState<'none' | 'manual' | 'google' | 'microsoft'>('none');

  // When token changes (magic link exchange), fetch host profile to get slug
  useEffect(() => {
    if (!token) return;
    api.getHostMe(token).then(({ booking_slug }) => setSlug(booking_slug)).catch(() => {});
  }, [token]);

  // If session token exists, go straight to setup
  const hasToken = !!token;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.registerHost(name, email);
      setStep('check-email');
    } catch { setError('Registration failed. Please try again.'); }
  };

  // Called when user lands back on /schedule/setup?magic=...
  // (handled in index.html/App via URL param — ScheduleTab reads localStorage token)
  const APP_URL = window.location.origin;

  if (hasToken && step === 'register') {
    // Already have a token — show setup/done
    return (
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Your booking link:</p>
        <div className="invite-link-box" style={{ marginBottom: '1rem' }}>
          <span className="invite-link">{APP_URL}/book/{slug || '…'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a href={`/api/auth/google`} className="join-btn" style={{ textAlign: 'center' }}>Connect Google Calendar</a>
          <a href={`/api/auth/microsoft`} className="join-btn" style={{ textAlign: 'center', background: 'var(--bg-card)' }}>Connect Microsoft Calendar</a>
          <button onClick={() => setCalendarSetup('manual')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text)', cursor: 'pointer' }}>Set manual hours instead</button>
        </div>
        {calendarSetup === 'manual' && (
          <div style={{ marginTop: '1rem' }}>
            <AvailabilityEditor token={token} onSaved={() => setCalendarSetup('none')} />
          </div>
        )}
      </div>
    );
  }

  if (step === 'check-email') return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📧</p>
      <p><strong>Check your email!</strong></p>
      <p className="subtitle">We sent a login link to <strong>{email}</strong>.</p>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Click the link to continue setting up your booking page.</p>
    </div>
  );

  return (
    <form onSubmit={handleRegister}>
      <p className="subtitle" style={{ marginBottom: '1rem' }}>Set up your booking page so others can schedule time with you.</p>
      <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
      <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} required />
      {error && <p style={{ color: '#f5576c', fontSize: '0.85rem' }}>{error}</p>}
      <button type="submit" className="join-btn" disabled={!name.trim() || !email.trim()}>Get my booking link →</button>
    </form>
  );
}
```

- [ ] **Step 3: Update JoinScreen to handle magic link + schedule tab**

Open `apps/zoom/frontend/src/components/JoinScreen.tsx`. Add the following:

At the top, add the import:
```tsx
import { ScheduleTab } from './ScheduleTab';
```

Add state inside `JoinScreen`:
```tsx
const [activeTab, setActiveTab] = useState<'join' | 'schedule'>('join');
const [scheduleToken, setScheduleToken] = useState<string | undefined>(undefined);
```

Add magic link handler inside `useEffect`:
```tsx
useEffect(() => {
  if (!room) setRoom(generateRoomCode());
  // Handle magic link return from email
  const magic = new URLSearchParams(window.location.search).get('magic');
  if (magic) {
    fetch('/api/auth/magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: magic }),
    }).then(r => r.json()).then(({ token }) => {
      if (token) {
        localStorage.setItem('zm_host_token', token);
        window.history.replaceState({}, '', window.location.pathname);
        setScheduleToken(token);  // Pass fresh token as prop — avoids stale closure in ScheduleTab
        setActiveTab('schedule');
      }
    }).catch(() => {});
  }
}, []);
```

Replace the outer return JSX to include the tab switcher above the form. The join form stays exactly as-is; the schedule tab renders `<ScheduleTab initialToken={scheduleToken} />`. The tab bar goes right below the `<h1>`:

```tsx
{/* Tab bar */}
<div style={{ display: 'flex', gap: '4px', background: 'var(--bg-deep, #12122a)', borderRadius: '8px', padding: '4px', marginBottom: '1.5rem' }}>
  <button
    type="button"
    onClick={() => setActiveTab('join')}
    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'join' ? 600 : 400, background: activeTab === 'join' ? '#4cc9f0' : 'transparent', color: activeTab === 'join' ? '#000' : 'var(--text-muted, #aaa)' }}
  >Join Now</button>
  <button
    type="button"
    onClick={() => setActiveTab('schedule')}
    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'schedule' ? 600 : 400, background: activeTab === 'schedule' ? '#4cc9f0' : 'transparent', color: activeTab === 'schedule' ? '#000' : 'var(--text-muted, #aaa)' }}
  >Schedule</button>
</div>

{activeTab === 'join' ? (
  /* existing join form JSX */ <> ... </>
) : (
  <ScheduleTab initialToken={scheduleToken} />
)}
```

- [ ] **Step 4: Build frontend to check for TypeScript errors**

```bash
cd apps/zoom/frontend
npm run build 2>&1 | tail -20
```
Expected: build succeeds with no type errors. Fix any reported errors before committing.

- [ ] **Step 5: Commit**

```bash
git add apps/zoom/frontend/src/components/JoinScreen.tsx apps/zoom/frontend/src/components/ScheduleTab.tsx apps/zoom/frontend/src/components/AvailabilityEditor.tsx
git commit -m "feat(zoom-frontend): add Schedule tab with host setup, calendar connect, and manual hours"
```

---

### Task 21: Update Dockerfile

**Files:**
- Modify: `apps/zoom/deploy/Dockerfile`

- [ ] **Step 1: Update Dockerfile to copy all server source files**

Replace `apps/zoom/deploy/Dockerfile` content with:

```dockerfile
FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g tsx

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --production

COPY server/index.ts ./server/
COPY server/db.ts server/auth.ts server/email.ts server/ical.ts server/slugs.ts server/crypto.ts ./server/
COPY server/migrations/ ./server/migrations/
COPY server/routes/ ./server/routes/
COPY server/middleware/ ./server/middleware/
COPY server/calendar/ ./server/calendar/
COPY frontend/dist ./frontend/dist

EXPOSE 3001
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

WORKDIR /app/server
CMD ["tsx", "index.ts"]
```

- [ ] **Step 2: Test Docker build locally**

```bash
cd apps/zoom
docker build --platform linux/amd64 -f deploy/Dockerfile -t zietra-meet-test . 2>&1 | tail -10
```
Expected: `Successfully built ...` or similar success message.

- [ ] **Step 3: Commit**

```bash
git add apps/zoom/deploy/Dockerfile
git commit -m "chore(zoom): update Dockerfile to copy all calendar booking server files"
```

---

### Task 22: Run all server tests + deploy

**Files:** none new

- [ ] **Step 1: Run the full server test suite**

```bash
cd apps/zoom/server
JWT_SECRET=test-secret TOKEN_ENCRYPT_KEY=0000000000000000000000000000000000000000000000000000000000000000 npx vitest run 2>&1 | tail -20
```
Expected: All tests pass. Fix any failures before continuing.

- [ ] **Step 2: Run frontend build**

```bash
cd apps/zoom/frontend
npm run build 2>&1 | tail -10
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Update ECS task definition with new environment variables**

Before deploying, ensure all 9 secrets are stored in AWS Secrets Manager under `vibingticket/*` and injected into the ECS task definition. Locate the task definition JSON (check `apps/zoom/deploy/` or run `aws ecs describe-task-definition --task-definition zietra-meet`). Add the following `secrets` and `environment` entries:

```json
"secrets": [
  { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/db" },
  { "name": "SMTP_USER", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/smtp::SMTP_USER:" },
  { "name": "SMTP_PASSWORD", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/smtp::SMTP_PASSWORD:" },
  { "name": "GOOGLE_CLIENT_ID", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/google-oauth::GOOGLE_CLIENT_ID:" },
  { "name": "GOOGLE_CLIENT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/google-oauth::GOOGLE_CLIENT_SECRET:" },
  { "name": "MICROSOFT_CLIENT_ID", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/microsoft-oauth::MICROSOFT_CLIENT_ID:" },
  { "name": "MICROSOFT_CLIENT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/microsoft-oauth::MICROSOFT_CLIENT_SECRET:" },
  { "name": "TOKEN_ENCRYPT_KEY", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/app::TOKEN_ENCRYPT_KEY:" },
  { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:vibingticket/app::JWT_SECRET:" }
],
"environment": [
  { "name": "APP_URL", "value": "https://meet.vibingticket.com" }
]
```

Register the updated task definition:
```bash
aws ecs register-task-definition --cli-input-json file://apps/zoom/deploy/task-definition.json
```

Commit the updated task definition JSON before deploying.

- [ ] **Step 4: Push to remote**

```bash
cd /Users/jeet/doordash-p2p
git push origin main
```

- [ ] **Step 5: Deploy to staging**

```bash
gh workflow run deploy-zietra-meet.yml --ref main
```

- [ ] **Step 6: Monitor deployment**

```bash
gh run list --workflow=deploy-zietra-meet.yml --limit 3
# Copy the run ID from the output, then:
gh run watch <run-id>
```
Expected: All steps green, `Zietra Meet deployed successfully → https://meet.vibingticket.com`

- [ ] **Step 7: Smoke test the live deployment**

```bash
# Check server health
curl -s https://meet.vibingticket.com/ | head -5

# Check host register endpoint exists
curl -s -X POST https://meet.vibingticket.com/api/host/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}' | head -5
```
Expected: First returns HTML. Second returns `{"message":"magic_link_sent"}` or an error about SMTP (SMTP not yet configured in ECS secrets — that's acceptable at this stage, means the route exists and DB is reachable).

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat(zoom): calendar booking feature complete — host auth, slot picker, .ics emails, cancel flow"
```

---

## Environment Variables Required in ECS

Add the following to the `zietra-meet-service` ECS task definition from AWS Secrets Manager:

| Secret path | Env var name |
|-------------|-------------|
| `vibingticket/db` → `DATABASE_URL` | `DATABASE_URL` |
| `vibingticket/smtp` → `SMTP_USER` | `SMTP_USER` |
| `vibingticket/smtp` → `SMTP_PASSWORD` | `SMTP_PASSWORD` |
| `vibingticket/google-oauth` → `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| `vibingticket/google-oauth` → `GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` |
| `vibingticket/microsoft-oauth` → `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_ID` |
| `vibingticket/microsoft-oauth` → `MICROSOFT_CLIENT_SECRET` | `MICROSOFT_CLIENT_SECRET` |
| `vibingticket/app` → `TOKEN_ENCRYPT_KEY` | `TOKEN_ENCRYPT_KEY` |
| `vibingticket/app` → `JWT_SECRET` | `JWT_SECRET` |

Also set: `APP_URL=https://meet.vibingticket.com`
