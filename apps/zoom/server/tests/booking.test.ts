import { describe, it, expect, vi, beforeEach } from 'vitest';

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
