# Booking Page Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 80-slot booking grid with a Calendly-style two-panel calendar (month picker left, slot list right) with working browser back/forward navigation.

**Architecture:** Single-file React component rewrite (`BookingPage.tsx`) plus a small `booking-helpers.ts` for pure functions that need unit tests. All state management stays local to `BookingPage`. Browser history is managed via `pushState`/`popstate` — no routing library.

**Tech Stack:** React 18, TypeScript, Vite 5, vitest (added to frontend), `Intl.DateTimeFormat` for all formatting.

**Spec:** `docs/superpowers/specs/2026-04-05-booking-page-calendar-redesign.md`

---

## Chunk 1: Test infrastructure + pure helper functions

### Task 1: Add vitest to the frontend

**Files:**
- Modify: `apps/zoom/frontend/package.json`
- Modify: `apps/zoom/frontend/vite.config.ts`

- [ ] **Step 1: Install vitest**

```bash
cd apps/zoom/frontend && npm install --save-dev vitest@^2.1.0
```

Note: pin to `^2.x` — this is the last series compatible with Vite 5 (`^5.4`). The server uses vitest `^4.x` which requires Vite 6+. Do NOT install latest vitest without pinning.

Expected: `node_modules/vitest` exists at a 2.x version, `package-lock.json` updated.

- [ ] **Step 2: Add test config to vite.config.ts**

Open `apps/zoom/frontend/vite.config.ts`. Replace the entire file with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5180,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  test: {
    environment: 'happy-dom',  // matches browser environment; 'node' would break any DOM tests
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Open `apps/zoom/frontend/package.json`. The `"scripts"` section currently has `"dev"` and `"build"`. Add `"test"`:

```json
{
  "name": "zoom-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  ...
}
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

```bash
cd apps/zoom/frontend && npm test
```

Expected output: `No test files found` or `0 tests`. Exit code 0 or 1 depending on vitest version — either is fine at this stage.

---

### Task 2: Pure helper functions with tests

These are the two core functions that all calendar logic depends on. Test them first, then implement.

**Files:**
- Create: `apps/zoom/frontend/src/pages/booking-helpers.ts`
- Create: `apps/zoom/frontend/src/pages/booking-helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/zoom/frontend/src/pages/booking-helpers.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — verify they FAIL**

```bash
cd apps/zoom/frontend && npm test
```

Expected: errors like `Cannot find module './booking-helpers'` or `toLocalDateKey is not a function`.

- [ ] **Step 3: Implement booking-helpers.ts**

Create `apps/zoom/frontend/src/pages/booking-helpers.ts`:

```ts
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
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
cd apps/zoom/frontend && npm test
```

Expected: `5 tests passed`.

- [ ] **Step 5: Commit**

```bash
cd apps/zoom/frontend && npm run build 2>&1 | tail -3
```
Expected: build succeeds (these files are not imported yet so no impact).

```bash
cd /Users/jeet/doordash-p2p && git add apps/zoom/frontend/package.json apps/zoom/frontend/package-lock.json apps/zoom/frontend/vite.config.ts apps/zoom/frontend/src/pages/booking-helpers.ts apps/zoom/frontend/src/pages/booking-helpers.test.ts && git commit -m "feat(zietra-meet): add vitest + booking helper functions with tests"
```

---

## Chunk 2: BookingPage component — layout skeleton + overflow fix

### Task 3: Rewrite BookingPage — skeleton, state, and body/root override

This task establishes the full component structure with all state variables, the body/root overflow fix, and the mobile detection effect. The page will render "Loading…" initially — actual calendar rendering comes in the next task.

**Files:**
- Modify: `apps/zoom/frontend/src/pages/BookingPage.tsx` (full rewrite)

- [ ] **Step 1: Replace BookingPage.tsx with the skeleton**

Replace the entire contents of `apps/zoom/frontend/src/pages/BookingPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { toLocalDateKey, groupByLocalDate } from './booking-helpers';

// ── Types ────────────────────────────────────────────────────────────────────
type Step = 'loading' | 'pick-slot' | 'confirm' | 'done' | 'error';

interface HostInfo {
  name: string;
  slot_minutes: number;
}

interface Booking {
  join_url: string;
  title: string;
  scheduled_at: string;
}

interface ViewMonth {
  year: number;
  month: number; // 0-indexed
}

interface Props {
  slug: string;
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

function formatSlotFull(iso: string, slot_minutes: number): string {
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
  return `${datePart} · ${timePart} · ${slot_minutes} min`;
}

function getTimezoneLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const short = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value ?? '';
  return `${tz} · ${short}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '2rem 1rem',
    boxSizing: 'border-box' as const,
  },
  panel: {
    width: '100%',
    maxWidth: '720px',
    background: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid #333',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #333',
    textAlign: 'center' as const,
  },
  twoCol: (isMobile: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
  }),
  calendarCol: (isMobile: boolean): React.CSSProperties => ({
    flex: isMobile ? 'unset' : '0 0 260px',
    borderRight: isMobile ? 'none' : '1px solid #333',
    borderBottom: isMobile ? '1px solid #333' : 'none',
    padding: '20px',
  }),
  slotsCol: {
    flex: 1,
    padding: '20px',
    minHeight: '360px',
  },
  errorPage: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    textAlign: 'center' as const,
    color: 'var(--text)',
    maxWidth: '400px',
    padding: '2rem',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function BookingPage({ slug }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<ViewMonth>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');  // inline error (slot_taken, booking failure, etc.)
  const [isMobile, setIsMobile] = useState(false);

  // Fix body+root overflow (these are set for the video call UI)
  useEffect(() => {
    const root = document.getElementById('root') as HTMLElement;
    const prevBodyOverflow = document.body.style.overflow;
    const prevRootOverflow = root.style.overflow;
    const prevRootHeight = root.style.height;
    document.body.style.overflow = 'auto';
    root.style.overflow = 'auto';
    root.style.height = 'auto';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      root.style.overflow = prevRootOverflow;
      root.style.height = prevRootHeight;
    };
  }, []);

  // Mobile detection via matchMedia
  useEffect(() => {
    const mq = window.matchMedia('(max-width:600px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // popstate handler — state setters ONLY, no state reads (avoids stale closure)
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (e.state?.step === 'confirm') {
        setSelectedSlot(e.state.slot);
        setStep('confirm');
      } else {
        setSelectedSlot(null);
        setStep('pick-slot');
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Initial data load
  useEffect(() => {
    (async () => {
      try {
        const host = await api.getHost(slug);
        if (!host.calendar_connected) {
          setErrorMsg("The host hasn't connected their calendar yet.");
          setStep('error');
          return;
        }
        setHostInfo({ name: host.name, slot_minutes: host.slot_minutes });
        const { slots } = await api.getSlots(slug);
        setAllSlots(slots);
        // Use the first FUTURE slot for initial date/month (not slots[0] which may be past)
        const firstFuture = slots.find(s => new Date(s) > new Date());
        if (firstFuture) {
          setSelectedDate(toLocalDateKey(new Date(firstFuture)));
          const d = new Date(firstFuture);
          setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
        }
        setStep('pick-slot');
      } catch {
        setErrorMsg('');
        setStep('error');
      }
    })();
  }, [slug]);

  // Grouped slots (recomputed on every render — cheap, ~240 items max)
  const grouped = groupByLocalDate(allSlots);

  // Handlers (defined here, used by sub-renders below)
  const handleSlotClick = useCallback((iso: string) => {
    setSelectedSlot(iso);
    window.history.pushState(
      { step: 'confirm', slot: iso },
      '',
      window.location.pathname + window.location.search
    );
    setStep('confirm');
  }, []);

  const handleBackToSlots = useCallback(() => {
    window.history.back();
    // popstate handler updates step and selectedSlot — do NOT call setStep here
  }, []);

  const handleBook = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !guestName.trim() || !guestEmail.trim() || submitting) return;
    setSubmitting(true);
    try {
      const result = await api.bookSlot(slug, {
        scheduled_at: selectedSlot,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim(),
        guest_notes: guestNotes.trim() || undefined,
      });
      setBooking(result);
      setStep('done');
    } catch (err: any) {
      if (err.body?.error === 'slot_taken') {
        setAllSlots(prev => prev.filter(s => s !== selectedSlot));
        setSelectedSlot(null);  // prevent re-submission of the removed slot via browser forward
        setErrorMsg('That slot was just taken — please pick another time.');
      } else {
        setErrorMsg('Booking failed, please try again.');
      }
      setStep('pick-slot');
    } finally {
      setSubmitting(false);
    }
  }, [selectedSlot, guestName, guestEmail, guestNotes, submitting, slug]);

  // ── Render: error ──
  if (step === 'error') {
    return (
      <div style={styles.errorPage}>
        <div style={styles.errorCard}>
          <h1 style={{ marginBottom: '0.5rem' }}>Booking Unavailable</h1>
          <p style={{ color: '#888' }}>
            {errorMsg || 'This booking page is not available right now.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Render: done ──
  if (step === 'done' && booking) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.panel, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>Meeting confirmed!</h1>
          <p style={{ marginBottom: '0.25rem', color: 'var(--text)' }}>{booking.title}</p>
          <p style={{ color: '#888', marginBottom: '1.5rem' }}>{formatSlotFull(booking.scheduled_at, hostInfo?.slot_minutes ?? 30)}</p>
          <p style={{ color: 'var(--text)', marginBottom: '1.5rem' }}>Check your email for the calendar invite (.ics).</p>
          <a href={booking.join_url} style={{
            display: 'block', textAlign: 'center', background: 'var(--accent)',
            color: '#000', padding: '12px', borderRadius: '8px', fontWeight: 700,
            textDecoration: 'none',
          }}>
            Join Meeting
          </a>
        </div>
      </div>
    );
  }

  // ── Render: loading ──
  if (step === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.panel}>
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>
            Loading…
          </div>
        </div>
      </div>
    );
  }

  // ── Render: pick-slot / confirm ──
  // Calendar and slot panels are rendered in Task 4 and 5.
  // For now, render a placeholder so we can verify the layout and overflow fix work.
  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ fontSize: '2rem', marginBottom: '4px' }}>🎥</div>
          <h2 style={{ margin: '0 0 4px', color: 'var(--text)', fontSize: '1.3rem' }}>
            Book a call with {hostInfo?.name}
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>
            {hostInfo?.slot_minutes} min · Video call
          </p>
        </div>

        {/* Two-column layout (calendar + slots) */}
        <div style={styles.twoCol(isMobile)}>
          <div style={styles.calendarCol(isMobile)}>
            {/* Calendar — Task 4 */}
            <p style={{ color: '#888' }}>Calendar placeholder</p>
          </div>
          <div style={styles.slotsCol}>
            {/* Slots / Confirm — Task 5 */}
            <p style={{ color: '#888' }}>Slots placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd apps/zoom/frontend && npm run build 2>&1 | tail -10
```

Expected: build succeeds, new bundle hash in `dist/assets/`.

- [ ] **Step 3: Commit**

```bash
cd /Users/jeet/doordash-p2p && git add apps/zoom/frontend/src/pages/BookingPage.tsx && git commit -m "feat(zietra-meet): booking page skeleton with state, overflow fix, nav handlers"
```

---

## Chunk 3: Month calendar grid

### Task 4: Calendar grid rendering

The calendar shows a month grid. Available days (with future slots) are highlighted and clickable. Implements the `‹ / ›` month navigation including fetching additional months when needed.

**Files:**
- Modify: `apps/zoom/frontend/src/pages/BookingPage.tsx` — replace "Calendar placeholder" section

- [ ] **Step 1: Add `calendarDays` helper above the component**

Add this function at the top of `BookingPage.tsx`, after the `styles` object:

```tsx
/** Returns all Date objects to render in a month grid (including leading/trailing blanks as null). */
function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}
```

- [ ] **Step 2: Add calendar rendering inside the component (temporary — will be superseded by Task 5 Step 3)**

Replace the `{/* Calendar — Task 4 */}` placeholder `<p>` tag with:

```tsx
{/* ── Month calendar ── */}
<MonthCalendar
  viewMonth={viewMonth}
  grouped={grouped}
  selectedDate={selectedDate}
  loadingMore={loadingMore}
  onSelectDate={(dateKey) => { setSelectedDate(dateKey); setErrorMsg(''); }}
  onPrevMonth={() => navigateMonth(-1)}
  onNextMonth={() => navigateMonth(1)}
/>
```

**Note:** Task 5 Step 3 replaces the entire two-column content block — it will include the `<MonthCalendar>` call again. That step supersedes this one. The purpose of this step is to let you verify the calendar renders before wiring up the slot panel.

- [ ] **Step 3: Add `navigateMonth` handler inside the component** (before the return statement)

```tsx
const navigateMonth = useCallback(async (delta: number) => {
  const newMonth = viewMonth.month + delta;
  const newYear = viewMonth.year + (newMonth < 0 ? -1 : newMonth > 11 ? 1 : 0);
  const normalizedMonth = ((newMonth % 12) + 12) % 12;
  const newView = { year: newYear, month: normalizedMonth };
  setViewMonth(newView);

  // Reset selectedDate if it's outside the new month
  if (selectedDate) {
    const [sy, sm] = selectedDate.split('-').map(Number);
    if (sy !== newYear || sm - 1 !== normalizedMonth) {
      setSelectedDate(null);
    }
  }

  // Check if we have data for this month already.
  // Build prefix directly from year/month to avoid UTC-conversion issues with toISOString().
  const prefix = `${newYear}-${String(normalizedMonth + 1).padStart(2, '0')}`;
  const hasData = allSlots.some(iso => iso.startsWith(prefix));
  if (!hasData) {
    setLoadingMore(true);
    try {
      const mm = String(normalizedMonth + 1).padStart(2, '0');
      const from = `${newYear}-${mm}-01`;
      const lastDay = new Date(newYear, normalizedMonth + 1, 0).getDate();
      const to = `${newYear}-${mm}-${String(lastDay).padStart(2, '0')}`;
      const { slots: newSlots } = await api.getSlots(slug, from, to);
      // Merge and deduplicate
      setAllSlots(prev => {
        const existing = new Set(prev);
        return [...prev, ...newSlots.filter(s => !existing.has(s))];
      });
    } catch {
      setErrorMsg('Unable to load availability for this month — try refreshing.');
    } finally {
      setLoadingMore(false);
    }
  }
}, [viewMonth, selectedDate, allSlots, slug]);
```

- [ ] **Step 4: Add the `MonthCalendar` sub-component** (outside the main component, after the `styles` object)

```tsx
interface MonthCalendarProps {
  viewMonth: ViewMonth;
  grouped: Map<string, string[]>;
  selectedDate: string | null;
  loadingMore: boolean;
  onSelectDate: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function MonthCalendar({ viewMonth, grouped, selectedDate, loadingMore, onSelectDate, onPrevMonth, onNextMonth }: MonthCalendarProps) {
  const { year, month } = viewMonth;
  const cells = getCalendarDays(year, month);
  const today = toLocalDateKey(new Date());
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button onClick={onPrevMonth} style={{ background: 'none', border: '1px solid #333', color: 'var(--accent)', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>‹</button>
        <span style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>{monthLabel}</span>
        <button onClick={onNextMonth} style={{ background: 'none', border: '1px solid #333', color: 'var(--accent)', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: '6px' }}>
        {DAY_HEADERS.map((h, i) => (
          <span key={i} style={{ color: '#555', fontSize: '10px' }}>{h}</span>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', textAlign: 'center' }}>
        {cells.map((date, i) => {
          if (!date) return <span key={i} />;
          const key = toLocalDateKey(date);
          const hasSlots = grouped.has(key);
          const isSelected = key === selectedDate;
          const isToday = key === today;

          return (
            <button
              key={i}
              onClick={() => hasSlots && onSelectDate(key)}
              disabled={!hasSlots}
              style={{
                background: isSelected ? 'var(--accent)' : 'transparent',
                color: isSelected ? '#000' : hasSlots ? 'var(--text)' : '#444',
                border: isToday && !isSelected ? '1px solid var(--accent)' : 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                minHeight: '36px',
                cursor: hasSlots ? 'pointer' : 'default',
                fontSize: '12px',
                fontWeight: isSelected || isToday ? 700 : 400,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Timezone label */}
      <div style={{ marginTop: '16px', fontSize: '10px', color: '#555', textAlign: 'center' }}>
        {loadingMore ? 'Loading…' : getTimezoneLabel()}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build and verify**

```bash
cd apps/zoom/frontend && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/jeet/doordash-p2p && git add apps/zoom/frontend/src/pages/BookingPage.tsx && git commit -m "feat(zietra-meet): month calendar grid with navigation and slot highlighting"
```

---

## Chunk 4: Slots panel + confirm form

### Task 5: Slot list and confirm form

**Files:**
- Modify: `apps/zoom/frontend/src/pages/BookingPage.tsx`

- [ ] **Step 1: Add `SlotList` sub-component** (after `MonthCalendar`)

```tsx
interface SlotListProps {
  selectedDate: string | null;
  viewMonth: ViewMonth;
  grouped: Map<string, string[]>;
  loadingMore: boolean;
  onSlotClick: (iso: string) => void;
}

function SlotList({ selectedDate, viewMonth, grouped, loadingMore, onSlotClick }: SlotListProps) {
  // If selectedDate is outside viewMonth, treat as nothing selected
  const dateInView = selectedDate
    ? (() => {
        const [y, m] = selectedDate.split('-').map(Number);
        return y === viewMonth.year && m - 1 === viewMonth.month;
      })()
    : false;

  const dayLabel = selectedDate && dateInView
    ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(
        new Date(selectedDate + 'T12:00:00') // noon avoids DST ambiguity
      )
    : null;

  const slots = (selectedDate && dateInView) ? (grouped.get(selectedDate) ?? []) : null;

  if (loadingMore) {
    return (
      <div style={{ color: '#888', fontSize: '13px', paddingTop: '12px' }}>
        Loading availability…
      </div>
    );
  }

  if (!selectedDate || !dateInView) {
    return (
      <div style={{ color: '#888', fontSize: '13px', paddingTop: '12px' }}>
        Select a day to see available times
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{dayLabel}</div>
        <div style={{ color: '#888', fontSize: '13px' }}>No available times on this day.</div>
      </>
    );
  }

  return (
    <>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>{dayLabel}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {slots.map(iso => (
          <button
            key={iso}
            onClick={() => onSlotClick(iso)}
            style={{
              background: 'var(--bg)',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '0 14px',
              height: '44px',
              color: 'var(--accent)',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {formatSlotTime(iso)}
          </button>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add `ConfirmForm` sub-component** (after `SlotList`)

```tsx
// Note: ConfirmForm does NOT receive errorMsg. Booking errors (slot_taken, etc.)
// always transition back to pick-slot where the error is shown above SlotList.
// If the form ever needs inline errors in future, add the prop then.
interface ConfirmFormProps {
  selectedSlot: string;
  slot_minutes: number;
  guestName: string;
  guestEmail: string;
  guestNotes: string;
  submitting: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

function ConfirmForm({
  selectedSlot, slot_minutes, guestName, guestEmail, guestNotes,
  submitting, onNameChange, onEmailChange, onNotesChange,
  onSubmit, onBack,
}: ConfirmFormProps) {
  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', marginBottom: '10px',
    padding: '10px 14px', background: 'var(--bg)', border: '1px solid #333',
    borderRadius: '8px', color: 'var(--text)', fontSize: '14px',
    boxSizing: 'border-box',
  };

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
        {formatSlotFull(selectedSlot, slot_minutes)}
      </div>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={guestName}
          onChange={e => onNameChange(e.target.value)}
          required
          autoFocus
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Your email"
          value={guestEmail}
          onChange={e => onEmailChange(e.target.value)}
          required
          style={inputStyle}
        />
        <textarea
          placeholder="Notes (optional)"
          value={guestNotes}
          onChange={e => onNotesChange(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <button
          type="submit"
          disabled={!guestName.trim() || !guestEmail.trim() || submitting}
          style={{
            width: '100%', background: 'var(--accent)', border: 'none',
            color: '#000', padding: '12px', borderRadius: '8px',
            fontSize: '14px', fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
            opacity: (!guestName.trim() || !guestEmail.trim() || submitting) ? 0.6 : 1,
          }}
        >
          {submitting ? 'Booking…' : 'Confirm Booking'}
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '10px', background: 'none', border: 'none',
            color: '#888', fontSize: '13px', cursor: 'pointer', width: '100%',
          }}
        >
          ← Pick a different time
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Wire sub-components into the main render**

In the main component's `return`, replace the two placeholder `<p>` tags inside the two-column layout with:

```tsx
{/* Left: calendar */}
<div style={styles.calendarCol(isMobile)}>
  <MonthCalendar
    viewMonth={viewMonth}
    grouped={grouped}
    selectedDate={selectedDate}
    loadingMore={loadingMore}
    onSelectDate={(dateKey) => { setSelectedDate(dateKey); setErrorMsg(''); }}
    onPrevMonth={() => navigateMonth(-1)}
    onNextMonth={() => navigateMonth(1)}
  />
</div>

{/* Right: slots or confirm */}
<div style={styles.slotsCol}>
  {errorMsg && step === 'pick-slot' && (
    <p style={{ color: '#f5576c', fontSize: '13px', marginBottom: '12px' }}>{errorMsg}</p>
  )}
  {step === 'confirm' && selectedSlot ? (
    <ConfirmForm
      selectedSlot={selectedSlot}
      slot_minutes={hostInfo?.slot_minutes ?? 30}
      guestName={guestName}
      guestEmail={guestEmail}
      guestNotes={guestNotes}
      submitting={submitting}
      onNameChange={setGuestName}
      onEmailChange={setGuestEmail}
      onNotesChange={setGuestNotes}
      onSubmit={handleBook}
      onBack={handleBackToSlots}
    />
  ) : (
    <SlotList
      selectedDate={selectedDate}
      viewMonth={viewMonth}
      grouped={grouped}
      loadingMore={loadingMore}
      onSlotClick={handleSlotClick}
    />
  )}
</div>
```

- [ ] **Step 4: Verify no duplicates**

Task 5 Step 3 is a **full replacement** of the entire two-column content (both the calendar column from Task 4 Step 2 and the slot column placeholder). After applying Step 3, search the file for `<MonthCalendar` — there should be exactly **one** occurrence. If there are two (one from Task 4 Step 2 and one from Step 3), delete the Task 4 one.

- [ ] **Step 5: Run tests — ensure helpers still pass**

```bash
cd apps/zoom/frontend && npm test
```

Expected: `5 tests passed`.

- [ ] **Step 6: Build**

```bash
cd apps/zoom/frontend && npm run build 2>&1 | tail -5
```

Expected: build succeeds with new bundle hash.

- [ ] **Step 7: Commit**

```bash
cd /Users/jeet/doordash-p2p && git add apps/zoom/frontend/src/pages/BookingPage.tsx && git commit -m "feat(zietra-meet): slot list and confirm form panels wired into calendar layout"
```

---

## Chunk 5: Deploy and verify

### Task 6: Deploy and end-to-end verification

- [ ] **Step 1: Run full build one more time**

```bash
cd apps/zoom/frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built in <Xms>`, no errors.

- [ ] **Step 2: Verify bundle uses absolute asset paths**

```bash
grep 'src="/' apps/zoom/frontend/dist/index.html
```

Expected: output contains `src="/assets/index-....js"` (absolute path, not `./assets/`).

- [ ] **Step 3: Commit and push**

```bash
cd /Users/jeet/doordash-p2p && git push origin main
```

- [ ] **Step 4: Deploy to production**

```bash
gh workflow run deploy-zietra-meet.yml --ref main
```

- [ ] **Step 5: Monitor deployment**

```bash
sleep 5 && gh run list --workflow=deploy-zietra-meet.yml --limit 1
```

Then watch it:
```bash
gh run watch $(gh run list --workflow=deploy-zietra-meet.yml --limit 1 --json databaseId --jq '.[0].databaseId') 2>&1 | tail -10
```

Expected: `✓ Build and Deploy Zietra Meet in Xm Xs`

- [ ] **Step 6: Smoke test the live page**

```bash
# New bundle deployed?
curl -s https://meet.vibingticket.com/book/peter | grep -o 'index-[^"]*\.js'
```

Expected: new hash (different from `index-DKn1QU_K.js`).

```bash
# API still works?
curl -s https://meet.vibingticket.com/api/host/peter | python3 -m json.tool
```

Expected: JSON with `name`, `slot_minutes`, `calendar_connected`.

```bash
# Slots still work?
curl -s "https://meet.vibingticket.com/api/host/peter/slots" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"slots\"])} slots')"
```

Expected: `N slots` (> 0).

- [ ] **Step 7: Manual browser verification checklist**

Open `https://meet.vibingticket.com/book/peter` and verify:

1. **Page loads** — header shows "Book a call with Peter", two-column layout visible
2. **Calendar grid** — month displayed, weekdays Mon–Fri highlighted with slots, weekends grey
3. **Day selection** — click a day → slots appear on right
4. **Slot click** — click a slot → confirm form appears, showing date/time/duration
5. **Browser back** — press ← → confirm form disappears, slot list returns, same day still selected
6. **Browser forward** — press → → confirm form returns with same slot (no blank/crash)
7. **"← Pick a different time"** — works the same as browser back
8. **Month navigation** — click › → next month renders; days with slots are highlighted
9. **No 80-slot dump** — the old flat grid is gone
10. **Mobile** — resize browser to < 600px → calendar stacks on top of slot list

---

## Notes for the implementor

- **Order matters in Task 4:** `getCalendarDays` and `MonthCalendar` must be defined BEFORE the main `BookingPage` component uses them. Place them above the component in the file.
- **`navigateMonth` deps array:** it is memoized with `useCallback([viewMonth, selectedDate, allSlots, slug])`. Do NOT remove `allSlots` from the deps array — it is required so the closure always merges against the latest loaded slots. Removing it would cause a stale-closure bug where fetched months are merged against a stale snapshot.
- **No routing library:** all navigation is via `window.location.pathname` + `pushState`/`popstate`. Do not add react-router.
- **TypeScript strict mode is ON:** all props must be typed, no implicit `any`.
- **`api.getSlots` range params:** the function signature is `getSlots(slug, from?, to?)` where `from`/`to` are `YYYY-MM-DD` strings. The server interprets them as `T00:00:00Z` and `T23:59:59Z` respectively (see `routes/hosts.ts:157-158`).
