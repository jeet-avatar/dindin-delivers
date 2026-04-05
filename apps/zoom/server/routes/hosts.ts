import { Router } from 'express';
import { randomBytes } from 'crypto';
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

  // Short code (32 hex chars) stored in DB — avoids long JWT URLs that break in email clients
  const code = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await pool.query(
    `INSERT INTO magic_codes (code, host_id, expires_at) VALUES ($1, $2, $3)
     ON CONFLICT (code) DO UPDATE SET host_id = EXCLUDED.host_id, expires_at = EXCLUDED.expires_at`,
    [code, host.id, expiresAt]
  );
  const magicLink = `${process.env.APP_URL || 'https://meet.vibingticket.com'}/api/auth/code?code=${code}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Your Zietra Meet login link',
      html: `<p>Hi ${name},</p><p>Click the link below to set up your booking page:</p><p><a href="${magicLink}" style="background:#4cc9f0;padding:10px 20px;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">Set up my booking page</a></p><p style="color:#888;font-size:12px">Or copy this URL: ${magicLink}</p><p style="color:#888;font-size:12px">This link expires in 15 minutes.</p>`,
    });
  } catch (err) {
    console.error('Magic link email failed:', (err as Error).message);
  }

  res.json({ message: 'magic_link_sent' });
});

// GET /api/host/me — fetch own profile (MUST be before /:slug)
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

// GET /api/host/:slug/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
hostsRouter.get('/:slug/slots', async (req, res) => {
  const { slug } = req.params;
  const hostRow = (await pool.query(
    'SELECT id, timezone, slot_minutes, disabled_at FROM hosts WHERE booking_slug = $1',
    [slug]
  )).rows[0];
  if (!hostRow) return res.status(404).json({ error: 'host_not_found' });
  if (hostRow.disabled_at) return res.status(403).json({ error: 'booking_disabled' });

  const now = new Date();
  const fromStr = req.query.from as string | undefined;
  const toStr = req.query.to as string | undefined;
  const from = fromStr ? new Date(fromStr + 'T00:00:00Z') : new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
  const to = toStr ? new Date(toStr + 'T23:59:59Z') : new Date(from.getTime() + 7 * 24 * 3600_000);
  if (to.getTime() - from.getTime() > 30 * 24 * 3600_000) {
    return res.status(400).json({ error: 'max_range_30_days' });
  }

  const { computeSlotsFromRules, subtractBusyWindows } = await import('../calendar/slots.js');
  const { getGoogleBusyTimes } = await import('../calendar/google.js');
  const { getMicrosoftBusyTimes } = await import('../calendar/microsoft.js');

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

  const tokenRow = (await pool.query(
    'SELECT provider FROM calendar_tokens WHERE host_id = $1 LIMIT 1',
    [hostRow.id]
  )).rows[0];

  const rules = (await pool.query(
    'SELECT day_of_week, start_time, end_time FROM availability_rules WHERE host_id = $1',
    [hostRow.id]
  )).rows;
  if (rules.length === 0) return res.json({ slots: [], warning: 'host_no_availability_set' });

  let busyWindows: { start: Date; end: Date }[] = [];
  let slots: Date[] = [];

  if (tokenRow?.provider === 'google') {
    try {
      busyWindows = await getGoogleBusyTimes(hostRow.id, from, to);
    } catch {
      return res.status(503).json({ error: 'calendar_unavailable' });
    }
    const allBusy = [...busyWindows, ...(await fetchBookedWindows(hostRow.id))];
    slots = subtractBusyWindows(computeSlotsFromRules(rules, from, to, hostRow.slot_minutes, hostRow.timezone), allBusy, hostRow.slot_minutes);
  } else if (tokenRow?.provider === 'microsoft') {
    try {
      busyWindows = await getMicrosoftBusyTimes(hostRow.id, from, to);
    } catch {
      return res.status(503).json({ error: 'calendar_unavailable' });
    }
    const allBusy = [...busyWindows, ...(await fetchBookedWindows(hostRow.id))];
    slots = subtractBusyWindows(computeSlotsFromRules(rules, from, to, hostRow.slot_minutes, hostRow.timezone), allBusy, hostRow.slot_minutes);
  } else {
    const allSlots = computeSlotsFromRules(rules, from, to, hostRow.slot_minutes, hostRow.timezone);
    slots = subtractBusyWindows(allSlots, await fetchBookedWindows(hostRow.id), hostRow.slot_minutes);
  }

  res.json({ slots: slots.map(s => s.toISOString()) });
});
