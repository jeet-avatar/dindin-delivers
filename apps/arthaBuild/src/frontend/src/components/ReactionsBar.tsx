import { useState, useEffect } from 'react';
import axios from 'axios';

interface Props { slug: string }

const REACTIONS = [
  { key: 'insightful', emoji: '💡', label: 'Insightful' },
  { key: 'hot',        emoji: '🔥', label: 'Hot' },
  { key: 'saved',      emoji: '👏', label: 'Saved It' },
] as const;

type ReactionKey = 'insightful' | 'hot' | 'saved';

export default function ReactionsBar({ slug }: Props) {
  const [counts, setCounts] = useState<Record<ReactionKey, number>>({ insightful: 0, hot: 0, saved: 0 });
  const [active, setActive] = useState<ReactionKey | null>(null);

  useEffect(() => {
    axios.get(`/api/blog/${slug}/reactions`).then(r => setCounts(r.data)).catch(() => {});
    const stored = localStorage.getItem(`ab_rxn_${slug}`) as ReactionKey | null;
    setActive(stored);
  }, [slug]);

  function handleReact(key: ReactionKey) {
    if (active === key) return;
    setCounts(prev => ({ ...prev, [key]: prev[key] + 1 }));
    setActive(key);
    localStorage.setItem(`ab_rxn_${slug}`, key);
    axios.post(`/api/blog/${slug}/react`, { reaction: key }).catch(() => {});
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
      {REACTIONS.map(r => (
        <button
          key={r.key}
          onClick={() => handleReact(r.key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
            border: active === r.key ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
            background: active === r.key ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 18 }}>{r.emoji}</span>
          <span style={{ fontSize: 12, color: active === r.key ? '#a5b4fc' : '#94a3b8', fontWeight: active === r.key ? 700 : 400 }}>{counts[r.key]}</span>
        </button>
      ))}
    </div>
  );
}
