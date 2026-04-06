import { describe, it, expect } from 'vitest';
import { toLocalDateKey, groupByLocalDate } from './booking-helpers';

describe('toLocalDateKey', () => {
  it('returns YYYY-MM-DD using local time for a mid-day slot', () => {
    const date = new Date(2026, 3, 9, 10, 0, 0); // Apr 9 2026 10:00 AM local
    expect(toLocalDateKey(date)).toBe('2026-04-09');
  });

  it('pads month and day with leading zeros', () => {
    const date = new Date(2026, 0, 5, 9, 0, 0); // Jan 5 2026
    expect(toLocalDateKey(date)).toBe('2026-01-05');
  });

  it('uses local date not UTC date near midnight (proves local not UTC)', () => {
    // 11:30 PM local time on Apr 9 — UTC date may be Apr 10 in UTC+ zones,
    // but toLocalDateKey must always return the LOCAL calendar date.
    const date = new Date(2026, 3, 9, 23, 30, 0); // Apr 9, 11:30 PM local
    expect(toLocalDateKey(date)).toBe('2026-04-09');
    // Verify: a UTC-based implementation (toISOString().slice(0,10)) would
    // return '2026-04-10' in UTC+ timezones, failing this test.
  });
});

describe('groupByLocalDate', () => {
  it('groups ISO strings by local date key', () => {
    // Use dates far in the future so past-slot filtering doesn't interfere
    const slot1 = new Date(2030, 3, 9, 9, 0, 0).toISOString();
    const slot2 = new Date(2030, 3, 9, 9, 30, 0).toISOString();
    const slot3 = new Date(2030, 3, 10, 9, 0, 0).toISOString();

    const result = groupByLocalDate([slot1, slot2, slot3]);

    expect(result.size).toBe(2);
    expect(result.get('2030-04-09')).toEqual([slot1, slot2]);
    expect(result.get('2030-04-10')).toEqual([slot3]);
  });

  it('returns empty map for empty input', () => {
    expect(groupByLocalDate([]).size).toBe(0);
  });

  it('excludes past slots (groupByLocalDate filters internally)', () => {
    // Note: groupByLocalDate filters past slots itself — callers pass allSlots directly.
    const pastSlot = new Date(2020, 0, 1, 9, 0, 0).toISOString();
    const futureSlot = new Date(2030, 0, 1, 9, 0, 0).toISOString();

    const result = groupByLocalDate([pastSlot, futureSlot]);

    expect(result.size).toBe(1);
    expect(result.has('2020-01-01')).toBe(false);
  });
});
