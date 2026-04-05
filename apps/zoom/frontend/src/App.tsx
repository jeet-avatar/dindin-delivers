import { useState, useEffect } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { CallScreen } from './components/CallScreen';
import { BookingPage } from './pages/BookingPage';
import { CancelPage } from './pages/CancelPage';

function getRoomFromURL(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

function getPath(): string {
  return window.location.pathname;
}

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string; password?: string } | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [initialRoom] = useState<string | null>(getRoomFromURL);
  const [path] = useState(getPath);

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

  // Route: /book/:slug
  const bookMatch = path.match(/^\/book\/([a-z0-9-]+)$/);
  if (bookMatch) return <BookingPage slug={bookMatch[1]} />;

  // Route: /cancel
  if (path === '/cancel') return <CancelPage />;

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
