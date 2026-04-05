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
    const newRefresh = tokenData.refresh_token || refreshToken;
    await pool.query(
      `UPDATE calendar_tokens SET access_token=$1, refresh_token=$2, expires_at=$3 WHERE host_id=$4 AND provider='microsoft'`,
      [encrypt(accessToken), encrypt(newRefresh), newExpiry, hostId]
    );
  }

  const graphClient = Client.init({ authProvider: done => done(null, accessToken) });
  const events = await graphClient
    .api('/me/calendarView')
    .header('Prefer', 'outlook.timezone="UTC"')
    .query({ startDateTime: from.toISOString(), endDateTime: to.toISOString() })
    .select('start,end')
    .get();

  // With Prefer: outlook.timezone="UTC", dateTime values are UTC — safe to append 'Z'
  return (events.value || []).map((e: any) => ({
    start: new Date(e.start.dateTime + 'Z'),
    end: new Date(e.end.dateTime + 'Z'),
  }));
}
