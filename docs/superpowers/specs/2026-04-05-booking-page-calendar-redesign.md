# Booking Page Calendar Redesign

**Date:** 2026-04-05  
**Scope:** `apps/zoom/frontend/src/pages/BookingPage.tsx` (full rewrite)  
**Trigger:** Current flat grid of 80 slots is overwhelming; browser back/forward navigation broken.

---

## Goal

Replace the flat 80-slot grid with a Calendly-style two-panel layout:
- **Left:** month calendar — click a day to load its slots
- **Right:** time slots for the selected day (vertical list)
- **Confirm panel:** replaces the right panel when a slot is picked
- **Browser back/forward:** fully functional via `pushState` + `popstate`

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  🎥  Book a call with Peter   30 min · Video call        │
├────────────────────┬────────────────────────────────────┤
│  April 2026  ‹  ›  │  Wed, Apr 9                        │
│  S M T W T F S    │  ──────────────────────────────    │
│       1  2  3  4  │  ● 9:00 AM   PDT                   │
│  6  [7][8][9]10 11│  ● 9:30 AM   PDT                   │
│ 13 14 15 16 17 18  │  ● 10:00 AM  PDT                   │
│ ...                │  ○ 11:00 AM  (busy — disabled)     │
│                    │  ● 11:30 AM  PDT                   │
│  America/LA · PDT  │                                    │
└────────────────────┴────────────────────────────────────┘
```

When a slot is selected, the right panel is replaced by the confirm form:

```
┌─────────────────────────────────────────────────────────┐
│  🎥  Book a call with Peter   30 min · Video call        │
├────────────────────┬────────────────────────────────────┤
│  (calendar stays)  │  Wed, Apr 9 · 9:00 AM PDT · 30min │
│                    │  ──────────────────────────────    │
│                    │  [ Your name           ]           │
│                    │  [ Your email          ]           │
│                    │  [ Notes (optional)    ]           │
│                    │  [ Confirm Booking     ]           │
│                    │  ← Pick a different time           │
└────────────────────┴────────────────────────────────────┘
```

---

## Component Architecture

Single file: `BookingPage.tsx`. No new files.

### State

```ts
step: 'loading' | 'pick-slot' | 'confirm' | 'done' | 'error'
hostInfo: { name: string; slot_minutes: number } | null
// only name + slot_minutes are used in the UI; calendar_connected checked on load
allSlots: string[]           // ISO strings for all loaded slots (30-day window)
loadingMore: boolean         // true while fetching slots for a new month range
selectedDate: string | null  // 'YYYY-MM-DD' in user's local timezone
selectedSlot: string | null  // ISO string of the chosen slot
viewMonth: { year: number; month: number }  // 0-indexed month
guestName: string
guestEmail: string
guestNotes: string
booking: { join_url: string; title: string; scheduled_at: string } | null
error: string
submitting: boolean
```

### Initial load

```ts
useEffect(() => {
  (async () => {
    try {
      const host = await api.getHost(slug);
      if (!host.calendar_connected) {
        setStep('error');   // shows "Booking Unavailable — host hasn't connected their calendar"
        return;
      }
      setHostInfo({ name: host.name, slot_minutes: host.slot_minutes });
      const { slots } = await api.getSlots(slug);   // server defaults to next 30 days
      setAllSlots(slots);
      // Default selectedDate to first available day in current/next month
      if (slots.length > 0) {
        const firstDay = toLocalDateKey(new Date(slots[0]));
        setSelectedDate(firstDay);
      }
      setStep('pick-slot');
    } catch {
      setStep('error');
    }
  })();
}, [slug]);
```

`calendar_connected: false` is treated as an error — the page shows "Booking Unavailable" so the user is not presented with a form that will silently fail at the booking step.

### Slot grouping (pure function)

```ts
function toLocalDateKey(date: Date): string {
  // Returns 'YYYY-MM-DD' in the browser's local timezone
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function groupByLocalDate(slots: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const iso of slots) {
    const key = toLocalDateKey(new Date(iso));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(iso);
  }
  return map;
}
```

Grouping is recalculated on each render from `allSlots` (cheap — at most ~240 slots for 30 days). Past slots are excluded by filtering `allSlots` before grouping:

```ts
const now = new Date();
const futureSlots = allSlots.filter(iso => new Date(iso) > now);
const grouped = groupByLocalDate(futureSlots);
```

This means stale slots are automatically hidden on re-render (e.g., if the page is left open overnight), with no need for a timer.

### Month calendar

Rendered from `viewMonth` and `grouped`.

- **Available days** (have entries in `grouped`): clickable, subtle highlight background, cursor pointer
- **Days without slots**: greyed text, `pointer-events: none`
- **Selected day**: accent color circle (cyan `var(--accent)`)
- **Today**: bold number if it has slots; bold + ring if no slots (visual reference only)
- **Timezone label** in calendar footer: resolved from browser using `Intl.DateTimeFormat().resolvedOptions().timeZone` and the short offset from `Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value`. Example: `"America/Los_Angeles · PDT"`
- **‹ / ›** buttons: change `viewMonth`. If the new month extends beyond loaded range, fetch more (see below).
- **Empty month**: if `grouped` has no days in `viewMonth`, reset `selectedDate` to `null` and show "No availability this month — try another month" in the right panel.

### Month navigation beyond loaded range

When `viewMonth` advances past the currently loaded window:

1. Set `loadingMore = true`
2. Fetch `api.getSlots(slug, fromStr, toStr)` for the new month range (first to last day of that month)
3. Merge new slots into `allSlots` (deduplicate by ISO string value)
4. Set `loadingMore = false`

While `loadingMore` is true: show a spinner/shimmer in the slot list area. The calendar still renders with what's known.

On fetch error: show inline "Unable to load availability for this month — try refreshing" in the right panel. Do not show a full-page error (existing months remain valid).

### Right panel — slot list

- Shows slots for `selectedDate` from `grouped`
- Vertical list, full-width buttons with left-aligned time
- Each slot formatted: `new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso))`
- If `selectedDate` is null: "Select a day to see available times"
- If `selectedDate` has no slots in the current `grouped` (empty day): "No available times on this day"
- If `loadingMore` is true: spinner replaces the slot list

**Clicking a slot:**

```ts
function handleSlotClick(iso: string) {
  setSelectedSlot(iso);
  window.history.pushState({ step: 'confirm', slot: iso }, '', window.location.pathname + window.location.search);
  setStep('confirm');
}
```

### Right panel — confirm form

- Header: formatted as `"Wed, Apr 9 · 9:00 AM PDT · 30 min"` using `Intl.DateTimeFormat`
- Fields: name (required), email (required), notes (optional textarea)
- "Confirm Booking" disabled while `submitting`; label changes to "Booking…"
- On success: `setBooking(result); setStep('done')`
- On `slot_taken` error: remove the taken slot from `allSlots` client-side (`setAllSlots(prev => prev.filter(s => s !== selectedSlot))`), show inline error message, return to `pick-slot` via `setStep`. No history manipulation needed since the user submitted — the confirm entry should stay in history so back navigation still works.
- On other error: inline "Booking failed, please try again"

**"← Pick a different time" button:**

```ts
function handleBackToSlots() {
  window.history.back();
  // popstate handler below takes care of the state update
}
```

Do NOT call `setStep('pick-slot')` here directly — the `popstate` handler is the single source of truth for this transition. Calling both would cause a double render and potential race condition.

### Browser navigation (popstate)

```ts
useEffect(() => {
  // IMPORTANT: only call state setters here — no state reads.
  // React state setter references are stable across renders so the closure is safe.
  // Reading state values (e.g. selectedDate) inside this handler would capture
  // stale values from mount time and produce bugs.
  const handler = (e: PopStateEvent) => {
    if (e.state?.step === 'confirm') {
      // Forward navigation: restore both step AND selectedSlot from history state
      setSelectedSlot(e.state.slot);
      setStep('confirm');
    } else {
      // Back navigation: return to slot picker, clear selected slot
      setSelectedSlot(null);
      setStep('pick-slot');
    }
  };
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}, []);
```

`selectedDate` is NOT cleared on back navigation — the calendar retains the selected day so the user can immediately pick a different time.

**Right panel when `selectedDate` is outside `viewMonth`:** If the user navigates to a different month (via ‹/›) while `selectedDate` is still set to a date in a previous month, treat the right panel as if no date is selected — show "Select a day to see available times." Do not attempt to display slots for an off-screen date. `selectedDate` itself is not mutated; it is only used for display when it falls within `viewMonth`.

The full navigation flow:
1. User on `/book/peter` → `step = 'pick-slot'` (no history entry pushed)
2. User picks a slot → `pushState({step:'confirm', slot:'...'})` → `step = 'confirm'`
3. Browser back → `popstate` fires with `null`/no state → `step = 'pick-slot'`, `selectedSlot = null`
4. Browser forward → `popstate` fires with `{step:'confirm', slot:'...'}` → `step = 'confirm'`, `selectedSlot` restored → confirm form renders correctly
5. Back again from pick-slot → browser navigates away from `/book/peter` (expected)

### Done state

Full-page (replaces the two-panel layout):

```
✅
Meeting confirmed!
{booking.title}
{formatted scheduled_at}
"Check your email for the calendar invite (.ics)."
[ Join Meeting ]   ← link to booking.join_url
```

### Error state

Full-page:

```
Booking Unavailable
"This booking page is not available right now."
```

If `calendar_connected === false`:
```
Booking Unavailable
"The host hasn't connected their calendar yet."
```

---

## CSS / Layout

### Body + root overflow fix (required)

`app.css` sets `body { overflow: hidden }` and `#root { height: 100dvh }` globally (needed for the video call UI). Both must be overridden on mount and restored on unmount:

```ts
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
```

This is safe — the booking page is only rendered when the URL matches `/book/:slug`, never alongside the video call UI. Without resetting `#root` height, `#root { height: 100dvh }` clips content even after body overflow is fixed.

### Page wrapper

```ts
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  alignItems: 'flex-start',   // content starts from top, not centered
  justifyContent: 'center',
  padding: '2rem 1rem',
  boxSizing: 'border-box',
};
```

`minHeight` (not `height`) is used here because the body overflow is fixed above, so the page can grow naturally beyond the viewport and the body scrolls it. No `overflowY` needed on this wrapper.

### Two-panel container

```ts
const panelStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '720px',
  background: 'var(--bg-card)',
  borderRadius: '12px',
  border: '1px solid #333',
  overflow: 'hidden',
};
```

Two-panel split (`display: flex`, row):
- Left: `flex: 0 0 260px`, `border-right: 1px solid #333`, `padding: 20px`
- Right: `flex: 1`, `padding: 20px`, `minHeight: 360px`

### Mobile layout

Mobile breakpoint at 600px is detected via `window.matchMedia`. The initial value is set inside a `useEffect` (not the `useState` initializer) to avoid crashing in non-browser environments:

```ts
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(max-width:600px)');
  setIsMobile(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

When `isMobile` is true: panels stack vertically (`flexDirection: 'column'`), calendar on top, slots below. Left panel drops the `border-right` and gets a `border-bottom` instead. Minimum tap target: slot buttons ≥ 44px height, calendar day cells ≥ 36px × 36px.

---

## What Does NOT Change

- `api.ts` — no changes; `getSlots(slug, from?, to?)` signature used as-is
- `App.tsx` — no changes
- Server routes — no changes
- `CancelPage.tsx`, `JoinScreen.tsx` — no changes

---

## Acceptance Criteria

1. **Calendar renders** — correct month grid, days with available future slots highlighted, days without slots greyed
2. **Day selection** — clicking an available day shows only that day's slots in the right panel
3. **Empty month** — navigating to a month with no slots resets `selectedDate` and shows "No availability this month"
4. **Slot selection** — clicking a slot transitions to confirm form; `pushState` fires; URL stays `/book/:slug`
5. **Confirm form** — shows formatted date/time/duration, accepts name+email+notes, submits correctly
6. **Browser back from confirm** — `popstate` fires, `step` returns to `'pick-slot'`, `selectedSlot` clears, calendar still shows same day
7. **Browser forward after back** — `popstate` fires with `{step:'confirm', slot}`, confirm form re-renders with the correct slot (no null crash)
8. **"← Pick a different time"** — calls `history.back()` only; `popstate` handler handles state; no double render
9. **calendar_connected: false** — shows "Booking Unavailable — host hasn't connected their calendar"
10. **Month navigation beyond 30 days** — fetches new range, shows spinner during fetch, merges results, shows inline error on failure
11. **Stale slots** — past slots are filtered out before grouping; page left open overnight doesn't show past times
12. **Mobile** — stacked layout, all slot buttons ≥ 44px, calendar day cells ≥ 36px
13. **No flat grid** — the old 2-column 80-slot dump is gone
