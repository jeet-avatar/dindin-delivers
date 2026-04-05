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
