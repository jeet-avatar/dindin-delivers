import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Props { slug: string; }

type Step = 'loading' | 'pick-slot' | 'confirm' | 'done' | 'error';

export function BookingPage({ slug }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [hostInfo, setHostInfo] = useState<{ name: string; slot_minutes: number } | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [booking, setBooking] = useState<{ join_url: string; title: string; scheduled_at: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const host = await api.getHost(slug);
        setHostInfo(host);
        const { slots: s } = await api.getSlots(slug);
        setSlots(s);
        setStep('pick-slot');
      } catch {
        setStep('error');
      }
    })();
  }, [slug]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !guestName.trim() || !guestEmail.trim()) return;
    try {
      const result = await api.bookSlot(slug, {
        scheduled_at: selectedSlot,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim(),
        guest_notes: guestNotes.trim() || undefined,
      });
      setBooking(result);
      setStep('done');
    } catch (e: any) {
      setError(e.body?.error === 'slot_taken' ? 'That slot was just taken — please pick another.' : 'Booking failed, please try again.');
      setSelectedSlot(null);
      setStep('pick-slot');
    }
  };

  const formatSlot = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

  if (step === 'loading') return <div className="join-screen"><p>Loading…</p></div>;
  if (step === 'error') return <div className="join-screen"><h1>Booking Unavailable</h1><p>This booking page is not available right now.</p></div>;

  if (step === 'done' && booking) return (
    <div className="join-screen">
      <div className="join-logo">✅</div>
      <h1>Meeting confirmed!</h1>
      <p className="subtitle">{booking.title} · {formatSlot(booking.scheduled_at)}</p>
      <p>Check your email for the calendar invite.</p>
      <a
        href={booking.join_url}
        className="join-btn"
        style={{ display: 'block', textAlign: 'center', marginTop: '1rem' }}
      >
        Join Now
      </a>
      <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Add to calendar:&nbsp;
        <a
          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.title)}&dates=${booking.scheduled_at.replace(/[-:]/g, '').split('.')[0]}Z`}
          target="_blank"
          rel="noreferrer"
        >Google Calendar</a>
        &nbsp;·&nbsp;
        <span style={{ color: 'var(--text-muted)' }}>iCal / Outlook — check your email for the .ics attachment</span>
      </p>
    </div>
  );

  if (step === 'confirm') return (
    <div className="join-screen">
      <h1>Book with {hostInfo?.name}</h1>
      <p className="subtitle">{formatSlot(selectedSlot!)}</p>
      <form onSubmit={handleBook}>
        <input
          type="text"
          placeholder="Your name"
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          autoFocus
          required
        />
        <input
          type="email"
          placeholder="Your email"
          value={guestEmail}
          onChange={e => setGuestEmail(e.target.value)}
          required
        />
        <textarea
          placeholder="Notes (optional)"
          value={guestNotes}
          onChange={e => setGuestNotes(e.target.value)}
          rows={2}
          style={{ width: '100%', marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', resize: 'vertical' }}
        />
        {error && <p style={{ color: '#f5576c', fontSize: '0.85rem' }}>{error}</p>}
        <button type="submit" className="join-btn" disabled={!guestName.trim() || !guestEmail.trim()}>
          Confirm Booking
        </button>
        <button
          type="button"
          onClick={() => setStep('pick-slot')}
          style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: '100%' }}
        >
          ← Back
        </button>
      </form>
    </div>
  );

  // pick-slot step
  return (
    <div className="join-screen">
      <div className="join-logo">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#4cc9f0" />
          <path d="M14 18a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H16a2 2 0 01-2-2V18z" fill="#1a1a2e" />
          <path d="M28 21l6-3v12l-6-3V21z" fill="#1a1a2e" />
        </svg>
      </div>
      <h1>Book a meeting with {hostInfo?.name}</h1>
      <p className="subtitle">Pick an available time slot</p>
      {error && <p style={{ color: '#f5576c', fontSize: '0.85rem' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '320px', overflowY: 'auto', marginBottom: '1rem' }}>
        {slots.map(slot => (
          <button
            key={slot}
            onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '0.82rem',
              textAlign: 'left',
            }}
          >
            {formatSlot(slot)}
          </button>
        ))}
      </div>
      {slots.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No available slots in the next 7 days.</p>}
    </div>
  );
}
