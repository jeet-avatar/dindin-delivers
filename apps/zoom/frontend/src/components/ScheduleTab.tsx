import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AvailabilityEditor } from './AvailabilityEditor';

type SetupStep = 'register' | 'check-email' | 'setup';

interface Props { initialToken?: string; }

export function ScheduleTab({ initialToken }: Props) {
  const [token, setToken] = useState(initialToken || localStorage.getItem('zm_host_token') || '');
  const [slug, setSlug] = useState('');
  const [step, setStep] = useState<SetupStep>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [calendarSetup, setCalendarSetup] = useState<'none' | 'manual'>('none');

  // When token is set, fetch host profile for the booking slug
  useEffect(() => {
    if (!token) return;
    api.getHostMe(token)
      .then(({ booking_slug }) => { setSlug(booking_slug); setStep('setup'); })
      .catch(() => {});
  }, [token]);

  // When initialToken prop changes (magic link exchange in parent), update state
  useEffect(() => {
    if (initialToken && initialToken !== token) {
      setToken(initialToken);
      localStorage.setItem('zm_host_token', initialToken);
    }
  }, [initialToken]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.registerHost(name, email);
      setStep('check-email');
    } catch { setError('Registration failed. Please try again.'); }
  };

  const APP_URL = window.location.origin;

  if (step === 'setup') return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Your booking link:</p>
      <div className="invite-link-box" style={{ marginBottom: '1rem' }}>
        <span className="invite-link">{APP_URL}/book/{slug || '…'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <a
          href="/api/auth/google"
          className="join-btn"
          style={{ textAlign: 'center' }}
        >Connect Google Calendar</a>
        <a
          href="/api/auth/microsoft"
          className="join-btn"
          style={{ textAlign: 'center', background: 'var(--bg-card)', color: 'var(--text)' }}
        >Connect Microsoft Calendar</a>
        <button
          onClick={() => setCalendarSetup(calendarSetup === 'manual' ? 'none' : 'manual')}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text)', cursor: 'pointer' }}
        >Set manual hours</button>
      </div>
      {calendarSetup === 'manual' && (
        <div style={{ marginTop: '1rem' }}>
          <AvailabilityEditor token={token} onSaved={() => setCalendarSetup('none')} />
        </div>
      )}
    </div>
  );

  if (step === 'check-email') return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📧</p>
      <p><strong>Check your email!</strong></p>
      <p className="subtitle">We sent a login link to <strong>{email}</strong>.</p>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Click the link to continue setting up your booking page.</p>
    </div>
  );

  return (
    <form onSubmit={handleRegister}>
      <p className="subtitle" style={{ marginBottom: '1rem' }}>Set up your booking page so others can schedule time with you.</p>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        maxLength={100}
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      {error && <p style={{ color: '#f5576c', fontSize: '0.85rem' }}>{error}</p>}
      <button type="submit" className="join-btn" disabled={!name.trim() || !email.trim()}>
        Get my booking link →
      </button>
    </form>
  );
}
