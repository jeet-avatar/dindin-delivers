import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function CancelPage() {
  const nonce = new URLSearchParams(window.location.search).get('nonce');
  const [meeting, setMeeting] = useState<{ title: string; scheduled_at: string; host_name: string } | null>(null);
  const [status, setStatus] = useState<'loading' | 'confirm' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!nonce) { setStatus('error'); return; }
    api.getMeetingByNonce(nonce)
      .then(m => { setMeeting(m); setStatus('confirm'); })
      .catch(() => setStatus('error'));
  }, [nonce]);

  const handleCancel = async () => {
    try {
      await api.cancelMeeting(nonce!);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const format = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

  if (status === 'loading') return <div className="join-screen"><p>Loading…</p></div>;

  if (status === 'error') return (
    <div className="join-screen">
      <h1>Link expired</h1>
      <p>This cancellation link is invalid or has already been used.</p>
      <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: 'var(--accent)' }}>Return to Zietra Meet</a>
    </div>
  );

  if (status === 'done') return (
    <div className="join-screen">
      <h1>Meeting cancelled</h1>
      <p className="subtitle">Both you and {meeting?.host_name} have been notified.</p>
      <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: 'var(--accent)' }}>Return to Zietra Meet</a>
    </div>
  );

  return (
    <div className="join-screen">
      <h1>Cancel meeting?</h1>
      <p className="subtitle">{meeting?.title}</p>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{format(meeting!.scheduled_at)} with {meeting?.host_name}</p>
      <button className="leave-confirm-leave" style={{ width: '100%' }} onClick={handleCancel}>
        Yes, cancel this meeting
      </button>
      <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No, keep it
      </a>
    </div>
  );
}
