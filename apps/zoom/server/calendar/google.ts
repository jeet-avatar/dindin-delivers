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
