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
    (pool.query as any)
      .mockResolvedValueOnce({ rows: [{
        id: 'mtg-1', title: 'Product Review', scheduled_at: '2026-04-10T14:00:00Z',
        duration_min: 30, host_name: 'Jeet', host_email: 'host@example.com',
        guest_name: 'Alice Guest', guest_email: 'guest@example.com',
        ics_uid: icsUid, room_code: 'ABC123',
        cancel_nonce_expires_at: new Date(Date.now() + 300_000),
      }] })
      .mockResolvedValueOnce({ rows: [] });

    const { cancelRouter } = await import('../routes/cancel.js');
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const app = express();
    app.use(express.json());
    app.use('/', cancelRouter);

    const res = await supertest(app).post('/cancel').send({ nonce: 'valid-nonce' });
    expect(res.status).toBe(200);
    expect(buildIcs).toHaveBeenCalledWith(
      expect.objectContaining({ ics_uid: icsUid }),
      'CANCEL'
    );
  });
});
