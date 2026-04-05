export interface BusyWindow { start: Date; end: Date; }
export interface AvailabilityRule { day_of_week: number; start_time: string; end_time: string; }

/** Remove slots whose window [slot, slot+slotMin) overlaps any busy window */
export function subtractBusyWindows(slots: Date[], busy: BusyWindow[], slotMinutes: number): Date[] {
  return slots.filter(slot => {
    const slotEnd = new Date(slot.getTime() + slotMinutes * 60_000);
    return !busy.some(b => slot < b.end && slotEnd > b.start);
  });
}

/** Generate all slot start times within [from, to] based on day-of-week rules */
export function computeSlotsFromRules(
  rules: AvailabilityRule[],
  from: Date,
  to: Date,
  slotMinutes: number,
  timezone: string,
): Date[] {
  const slots: Date[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= to) {
    // Get day of week in host's timezone using Intl
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(cursor);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[dayName];

    for (const rule of rules) {
      if (rule.day_of_week !== dayOfWeek) continue;
      const [sh, sm] = rule.start_time.split(':').map(Number);
      const [eh, em] = rule.end_time.split(':').map(Number);
      const dayStart = new Date(cursor);
      dayStart.setUTCHours(sh, sm, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setUTCHours(eh, em, 0, 0);

      let t = new Date(dayStart);
      while (new Date(t.getTime() + slotMinutes * 60_000) <= dayEnd) {
        slots.push(new Date(t));
        t = new Date(t.getTime() + slotMinutes * 60_000);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return slots;
}
