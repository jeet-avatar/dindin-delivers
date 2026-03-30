import { useState } from 'react';
import { JoinScreen } from './components/JoinScreen';

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string } | null>(null);

  if (!joined) {
    return <JoinScreen onJoin={(name, room) => setJoined({ name, room })} />;
  }

  return <div>Call screen placeholder — Room: {joined.room}</div>;
}
