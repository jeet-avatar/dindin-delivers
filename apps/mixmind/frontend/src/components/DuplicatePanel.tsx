// src/components/DuplicatePanel.tsx
import { useState } from 'react';
import { sidecarGet, sidecarPost } from '../hooks/useSidecar';
import { DuplicatePair } from '../types/track';

interface ScanResponse { pairs: DuplicatePair[]; count: number; }
interface Props { onCountChange: (n: number) => void; }

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export function DuplicatePanel({ onCountChange }: Props) {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  async function scan() {
    setLoading(true);
    try {
      const data = await sidecarGet<ScanResponse>('/api/duplicates/scan');
      setPairs(data.pairs);
      onCountChange(data.count);
      setScanned(true);
    } finally { setLoading(false); }
  }

  async function hideTrack(content_id: string, source: string) {
    await sidecarPost('/api/duplicates/hide', { content_id, source });
    const next = pairs.filter(p => p.track_a.content_id !== content_id && p.track_b.content_id !== content_id);
    setPairs(next);
    onCountChange(next.length);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div>
          <h2 className="text-sm font-semibold text-white">Duplicate Tracks</h2>
          <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
            {scanned ? `${pairs.length} duplicate pair${pairs.length !== 1 ? 's' : ''} found` : 'Scan your library to find duplicates'}
          </p>
        </div>
        <button
          onClick={scan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
          style={{ background: loading ? '#1a1a1a' : 'rgba(124,58,237,0.15)', color: loading ? '#4b5563' : '#c084fc', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          {loading ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Scanning…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Scan Library
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {pairs.length === 0 && !loading && scanned && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#161616' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-white">No duplicates found</p>
            <p className="text-xs" style={{ color: '#4b5563' }}>Your library is clean</p>
          </div>
        )}

        {pairs.map((pair, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                {pair.similarity_score.toFixed(0)}% match
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              {[pair.track_a, pair.track_b].map((t, j) => (
                <div key={j} className="rounded-lg p-3" style={{ background: '#0d0d0d' }}>
                  <div className="text-sm font-medium truncate text-white">{t.title}</div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: '#4b5563' }}>{t.artist}</div>
                  <div className="text-xs mt-2 font-mono" style={{ color: '#374151' }}>
                    {t.bpm} BPM · {t.camelot} · {fmt(t.duration_sec)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => hideTrack(pair.track_b.content_id, pair.track_b.source)}
                className="flex-1 text-xs py-1.5 rounded-lg cursor-pointer font-medium transition-colors"
                style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)' }}>
                Keep Left
              </button>
              <button onClick={() => hideTrack(pair.track_a.content_id, pair.track_a.source)}
                className="flex-1 text-xs py-1.5 rounded-lg cursor-pointer font-medium transition-colors"
                style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)' }}>
                Keep Right
              </button>
              <button onClick={() => { setPairs(prev => prev.filter((_, idx) => idx !== i)); onCountChange(Math.max(0, pairs.length - 1)); }}
                className="flex-1 text-xs py-1.5 rounded-lg cursor-pointer font-medium transition-colors"
                style={{ background: '#161616', color: '#6b7280', border: '1px solid #222' }}>
                Keep Both
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
