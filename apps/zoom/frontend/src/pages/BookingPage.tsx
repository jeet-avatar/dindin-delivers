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

// ── Calendar days helper ──────────────────────────────────────────────────────
/** Returns all Date objects to render in a month grid (including leading/trailing blanks as null). */
function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

// ── MonthCalendar sub-component ───────────────────────────────────────────────
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

// ── SlotList sub-component ────────────────────────────────────────────────────
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

// ── ConfirmForm sub-component ─────────────────────────────────────────────────
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

  // navigateMonth handler
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

  // Handlers
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

        {/* Two-column layout */}
        <div style={styles.twoCol(isMobile)}>
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
        </div>
      </div>
    </div>
  );
}
