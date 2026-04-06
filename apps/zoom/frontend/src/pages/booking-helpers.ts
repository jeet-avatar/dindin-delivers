/** Returns 'YYYY-MM-DD' in the browser's local timezone (not UTC). */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Groups future ISO slot strings by local calendar date.
 * Past slots (before now) are excluded automatically.
 * Returns Map<'YYYY-MM-DD', string[]> sorted ascending within each day.
 */
export function groupByLocalDate(slots: string[]): Map<string, string[]> {
  const now = new Date();
  const map = new Map<string, string[]>();
  for (const iso of slots) {
    const date = new Date(iso);
    if (date <= now) continue;  // filter out past slots
    const key = toLocalDateKey(date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(iso);
  }
  return map;
}
