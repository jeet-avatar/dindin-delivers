import { useState, useEffect } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { CallScreen } from './components/CallScreen';

function getRoomFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string } | null>(null);
  const [initialRoom] = useState<string | null>(getRoomFromURL);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (joined) {
      url.searchParams.set('room', joined.room);
    } else {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url.toString());
  }, [joined]);

  if (!joined) {
    return <JoinScreen onJoin={(name, room) => setJoined({ name, room })} initialRoom={initialRoom} />;
  }

  return <CallScreen name={joined.name} room={joined.room} onLeave={() => setJoined(null)} />;
}
