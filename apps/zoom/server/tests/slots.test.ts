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
