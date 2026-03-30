import { useState, useEffect } from 'react';

interface JoinScreenProps {
  onJoin: (name: string, room: string) => void;
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!room) setRoom(generateRoomCode());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && room.trim()) {
      onJoin(name.trim(), room.trim());
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
      <h1>Zietra Meet</h1>
      <p className="subtitle">Simple 2-person video calls</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="room-input">
          <input
            type="text"
            placeholder="Room code"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button type="button" onClick={() => setRoom(generateRoomCode())}>
            New
          </button>
        </div>
        <button type="submit" className="join-btn" disabled={!name.trim() || !room.trim()}>
          Join Room
        </button>
      </form>

      {room.trim() && (
        <div className="invite-section">
          <p className="invite-label">Send this link to the other person:</p>
          <div className="invite-link-box">
            <span className="invite-link">{getInviteLink(room.trim())}</span>
            <button className="copy-btn" onClick={handleCopyLink}>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {initialRoom && (
        <p className="invited-msg">You were invited to room <strong>{initialRoom}</strong>. Enter your name and join.</p>
      )}
    </div>
  );
}
