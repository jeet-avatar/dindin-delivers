import { useState } from 'react';

interface JoinScreenProps {
  onJoin: (name: string, room: string) => void;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && room.trim()) {
      onJoin(name.trim(), room.trim());
    }
  };

  return (
    <div className="join-screen">
      <h1>Zoom</h1>
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
            Generate
          </button>
        </div>
        <button type="submit" disabled={!name.trim() || !room.trim()}>
          Join Room
        </button>
      </form>
    </div>
  );
}
