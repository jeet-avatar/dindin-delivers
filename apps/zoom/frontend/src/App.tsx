import { useState } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { CallScreen } from './components/CallScreen';

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string } | null>(null);

  if (!joined) {
    return <JoinScreen onJoin={(name, room) => setJoined({ name, room })} />;
  }

  return (
    <CallScreen
      name={joined.name}
      room={joined.room}
      onLeave={() => setJoined(null)}
    />
  );
}
