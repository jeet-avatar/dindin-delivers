import { useState, useEffect } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { CallScreen } from './components/CallScreen';

function getRoomFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string; password?: string } | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [initialRoom] = useState<string | null>(getRoomFromURL);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (joined) {
      url.searchParams.set('room', joined.room);
      // pushState creates a real history entry so the back button can be intercepted
      window.history.pushState({ inMeeting: true }, '', url.toString());
    } else {
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  }, [joined]);

  if (!joined) {
    return (
      <JoinScreen
        onJoin={(name, room, password) => setJoined({ name, room, password })}
        initialRoom={initialRoom}
      />
    );
  }

  return (
    <CallScreen
      name={joined.name}
      room={joined.room}
      password={joined.password}
      key={sessionKey}
      onLeave={() => { setJoined(null); setSessionKey(k => k + 1); }}
    />
  );
}
