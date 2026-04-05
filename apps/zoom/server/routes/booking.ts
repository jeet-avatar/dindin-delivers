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
    if (e.code === '40001') return res.status(409).json({ error: 'slot_taken' });
    throw e;
  } finally {
    client.release();
  }

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

  await sendEmail({
    to: guest_email.trim(),
    subject: `Confirmed: ${title}`,
    replyTo: host.email,
    html: `<h2>Meeting confirmed!</h2>
<p><strong>${title}</strong></p>
<p><strong>When:</strong> ${timeStr}</p>
<p><strong>Duration:</strong> ${host.slot_minutes} minutes</p>
<p><a href="${joinLink}" style="background:#4cc9f0;padding:10px 20px;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;">Join Meeting</a></p>
<p><a href="${cancelLink}">Cancel this meeting</a></p>`,
    attachments: icsAttachment,
  });

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
