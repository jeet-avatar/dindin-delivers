import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { sendEmail } from '../email.js';
import { buildIcs } from '../ical.js';

export const cancelRouter = Router();

const APP_URL = process.env.APP_URL || 'https://meet.vibingticket.com';

// GET /api/meeting/cancel?token={cancelToken}
cancelRouter.get('/cancel', async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: 'token_required' });

  const { rows } = await pool.query(
    `SELECT m.id FROM meetings m WHERE m.cancel_token = $1 AND m.status = 'confirmed'`,
    [token]
  );
  if (!rows[0]) return res.status(404).json({ error: 'meeting_not_found' });

  const nonce = randomUUID();
  const nonceExpiry = new Date(Date.now() + 30 * 60_000);
  await pool.query(
    `UPDATE meetings SET cancel_nonce = $1, cancel_nonce_expires_at = $2 WHERE id = $3`,
    [nonce, nonceExpiry, rows[0].id]
  );

  res.redirect(`${APP_URL}/cancel?nonce=${nonce}`);
});

// GET /api/meeting/by-nonce/:nonce
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

  await sendEmail({
    to: meeting.guest_email,
    subject: `Cancelled: ${meeting.title}`,
    html: `<p>Your meeting <strong>${meeting.title}</strong> on ${new Date(meeting.scheduled_at).toUTCString()} has been cancelled.</p>`,
    attachments: icsAttachment,
  });

  await sendEmail({
    to: meeting.host_email,
    subject: `Booking cancelled: ${meeting.title} — ${meeting.guest_name}`,
    replyTo: meeting.guest_email,
    html: `<p><strong>${meeting.guest_name}</strong> cancelled <strong>${meeting.title}</strong> on ${new Date(meeting.scheduled_at).toUTCString()}.</p>`,
    attachments: icsAttachment,
  });

  res.json({ ok: true });
});
