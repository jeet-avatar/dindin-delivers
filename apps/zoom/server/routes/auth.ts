import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { signJwt, verifyJwt } from '../auth.js';
import { getGoogleAuthUrl, exchangeGoogleCode } from '../calendar/google.js';
import { getMicrosoftAuthUrl, exchangeMicrosoftCode } from '../calendar/microsoft.js';
import { requireHostAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

const APP_URL = process.env.APP_URL || 'https://meet.vibingticket.com';

// GET /api/auth/code — exchange short code for session JWT, redirect to setup page
authRouter.get('/code', async (req, res) => {
  const { code } = req.query as { code?: string };
  if (!code) return res.status(400).json({ error: 'code_required' });
  const { rows } = await pool.query(
    `DELETE FROM magic_codes WHERE code = $1 AND expires_at > NOW() RETURNING host_id`,
    [code]
  );
  if (!rows[0]) return res.redirect(`${APP_URL}/?error=expired_link`);
  const sessionToken = signJwt({ host_id: rows[0].host_id, type: 'session' }, '7d');
  res.redirect(`${APP_URL}/?session=${sessionToken}`);
});

// POST /api/auth/magic — exchange magic JWT for session JWT (legacy, kept for compatibility)
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
