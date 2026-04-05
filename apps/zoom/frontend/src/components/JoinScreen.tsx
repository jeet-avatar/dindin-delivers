import { useState, useEffect } from 'react';
import { ScheduleTab } from './ScheduleTab';

interface JoinScreenProps {
  onJoin: (name: string, room: string, password?: string) => void;
  initialRoom: string | null;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getInviteLink(room: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', room);
  return url.toString();
}

export function JoinScreen({ onJoin, initialRoom }: JoinScreenProps) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState(initialRoom || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'join' | 'schedule'>('join');
  const [scheduleToken, setScheduleToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!room) setRoom(generateRoomCode());
    // Magic link lands here as /?session=<token> after server exchanges the short code
    const session = new URLSearchParams(window.location.search).get('session');
    if (session) {
      localStorage.setItem('zm_host_token', session);
      window.history.replaceState({}, '', window.location.pathname);
      setScheduleToken(session);
      setActiveTab('schedule');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && room.trim()) {
      onJoin(name.trim(), room.trim(), password || undefined);
    }
  };

  const handleCopyLink = async () => {
    if (!room.trim()) return;
    await navigator.clipboard.writeText(getInviteLink(room.trim()));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="join-screen">
      <div className="join-logo">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#4cc9f0" />
          <path d="M14 18a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H16a2 2 0 01-2-2V18z" fill="#1a1a2e" />
          <path d="M28 21l6-3v12l-6-3V21z" fill="#1a1a2e" />
        </svg>
      </div>
      <h1>Zietra Meet</h1>
      <p className="subtitle">Video calls for up to 8 people</p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-deep, #12122a)', borderRadius: '8px', padding: '4px', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('join')}
          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'join' ? 600 : 400, background: activeTab === 'join' ? '#4cc9f0' : 'transparent', color: activeTab === 'join' ? '#000' : 'var(--text-muted, #aaa)' }}
        >Join Now</button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'schedule' ? 600 : 400, background: activeTab === 'schedule' ? '#4cc9f0' : 'transparent', color: activeTab === 'schedule' ? '#000' : 'var(--text-muted, #aaa)' }}
        >Schedule</button>
      </div>

      {activeTab === 'schedule' ? (
        <ScheduleTab initialToken={scheduleToken} />
      ) : (
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={40}
        />
        <div className="room-input">
          <input
            type="text"
            placeholder="Room code"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button type="button" onClick={() => setRoom(generateRoomCode())}>New</button>
        </div>

        <div className="password-section">
          <label className="password-toggle">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => {
                setShowPassword(e.target.checked);
                if (!e.target.checked) setPassword('');
              }}
            />
            <span>Password-protect room</span>
          </label>
          {showPassword && (
            <input
              type="password"
              placeholder="Room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>

        <p className="terms-notice">
          By joining, you agree to our{' '}
          <a href="https://www.zietra.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          {' '}and{' '}
          <a href="https://www.zietra.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          Meetings may be recorded by participants with consent.
        </p>
        <button type="submit" className="join-btn" disabled={!name.trim() || !room.trim()}>
          Join Room
        </button>
      </form>
      )}

      {activeTab === 'join' && room.trim() && (
        <div className="invite-section">
          <p className="invite-label">Send this link to invite others:</p>
          <div className="invite-link-box">
            <span className="invite-link">{getInviteLink(room.trim())}</span>
            <button className="copy-btn" onClick={handleCopyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'join' && initialRoom && (
        <p className="invited-msg">You were invited to room <strong>{initialRoom}</strong></p>
      )}
    </div>
  );
}
