import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Props { slug: string; }

type Step = 'loading' | 'pick-slot' | 'confirm' | 'done' | 'error';

const page: React.CSSProperties = {
  height: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  justifyContent: 'center',
  padding: '2rem 1rem',
  overflowY: 'auto',
};
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  textAlign: 'center',
  color: 'var(--text)',
};

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
  const [submitting, setSubmitting] = useState(false);

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
    } catch (e: any) {
      setError(e.body?.error === 'slot_taken' ? 'That slot was just taken — please pick another.' : 'Booking failed, please try again.');
      setSelectedSlot(null);
      setStep('pick-slot');
    } finally {
      setSubmitting(false);
    }
  };

  const formatSlot = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

  if (step === 'loading') return (
    <div style={page}><div style={card}><p>Loading…</p></div></div>
  );

  if (step === 'error') return (
    <div style={page}><div style={card}>
      <h1 style={{ marginBottom: '0.5rem' }}>Booking Unavailable</h1>
      <p style={{ color: '#888' }}>This booking page is not available right now.</p>
    </div></div>
  );

  if (step === 'done' && booking) return (
    <div style={page}><div style={card}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
      <h1 style={{ marginBottom: '0.5rem' }}>Meeting confirmed!</h1>
      <p style={{ marginBottom: '0.25rem' }}>{booking.title}</p>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>{formatSlot(booking.scheduled_at)}</p>
      <p style={{ marginBottom: '1rem' }}>Check your email for the calendar invite (.ics).</p>
      <a href={booking.join_url} className="join-btn" style={{ display: 'block', textAlign: 'center' }}>
        Join Meeting
      </a>
    </div></div>
  );

  if (step === 'confirm') return (
    <div style={page}><div style={card}>
      <h1 style={{ marginBottom: '0.25rem' }}>Book with {hostInfo?.name}</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>{formatSlot(selectedSlot!)}</p>
      <form onSubmit={handleBook}>
        <input
          type="text"
          placeholder="Your name"
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          autoFocus
          required
          style={{ display: 'block', width: '100%', marginBottom: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-card)', border: '1px solid #333', borderRadius: '8px', color: 'var(--text)', fontSize: '1rem' }}
        />
        <input
          type="email"
          placeholder="Your email"
          value={guestEmail}
          onChange={e => setGuestEmail(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-card)', border: '1px solid #333', borderRadius: '8px', color: 'var(--text)', fontSize: '1rem' }}
        />
        <textarea
          placeholder="Notes (optional)"
          value={guestNotes}
          onChange={e => setGuestNotes(e.target.value)}
          rows={2}
          style={{ display: 'block', width: '100%', marginBottom: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-card)', border: '1px solid #333', borderRadius: '8px', color: 'var(--text)', fontSize: '1rem', resize: 'vertical' }}
        />
        {error && <p style={{ color: '#f5576c', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" className="join-btn" disabled={!guestName.trim() || !guestEmail.trim() || submitting} style={{ width: '100%' }}>
          {submitting ? 'Booking…' : 'Confirm Booking'}
        </button>
        <button type="button" onClick={() => setStep('pick-slot')}
          style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', width: '100%' }}>
          ← Pick a different time
        </button>
      </form>
    </div></div>
  );

  // pick-slot
  return (
    <div style={page}><div style={card}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: '1rem' }}>
        <rect width="48" height="48" rx="12" fill="#4cc9f0" />
        <path d="M14 18a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H16a2 2 0 01-2-2V18z" fill="#1a1a2e" />
        <path d="M28 21l6-3v12l-6-3V21z" fill="#1a1a2e" />
      </svg>
      <h1 style={{ marginBottom: '0.25rem' }}>Book a call with {hostInfo?.name}</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>Pick an available time — {hostInfo?.slot_minutes} min</p>
      {error && <p style={{ color: '#f5576c', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
      {slots.length === 0
        ? <p style={{ color: '#888' }}>No available slots in the next 7 days.</p>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {slots.map(slot => (
              <button key={slot} onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
                style={{ background: 'var(--bg-card)', border: '1px solid #333', borderRadius: '8px', padding: '10px 8px', cursor: 'pointer', color: 'var(--text)', fontSize: '0.82rem', textAlign: 'left' }}>
                {formatSlot(slot)}
              </button>
            ))}
          </div>
      }
    </div></div>
  );
}
