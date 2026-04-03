import { useEffect, useState } from 'react';

export interface Reaction {
  id: string;
  emoji: string;
  fromName: string;
  timestamp: number;
}

interface EmojiReactionsProps {
  reactions: Reaction[];
}

export function EmojiReactions({ reactions }: EmojiReactionsProps) {
  const [visible, setVisible] = useState<Reaction[]>([]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const latest = reactions[reactions.length - 1];
    setVisible(prev => [...prev, latest]);
    const timer = setTimeout(() => {
      setVisible(prev => prev.filter(r => r.id !== latest.id));
    }, 3000);
    return () => clearTimeout(timer);
  }, [reactions.length]);

  if (visible.length === 0) return null;

  return (
    <div className="reaction-overlay">
      {visible.map((r, i) => (
        <div
          key={r.id}
          className="reaction-bubble"
          style={{ left: `${20 + (i * 15) % 60}%`, animationDelay: `${(i % 3) * 0.1}s` }}
        >
          <span className="reaction-emoji">{r.emoji}</span>
          <span className="reaction-name">{r.fromName}</span>
        </div>
      ))}
    </div>
  );
}
