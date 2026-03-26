// src/components/TrackTable.tsx
import { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Track } from '../types/track';

type SortKey = keyof Pick<Track, 'title' | 'bpm' | 'key_musical' | 'camelot' | 'rating' | 'duration_sec'>;
type SortDir = 'asc' | 'desc';

interface Props {
  tracks: Track[];
  onSelect?: (track: Track) => void;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i < rating ? '#facc15' : 'none'}
          stroke={i < rating ? '#facc15' : '#374151'} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

const cueColorMap: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#10b981',
  yellow: '#f59e0b', orange: '#f97316', pink: '#ec4899',
  purple: '#a855f7', white: '#f9fafb',
};

function CueDots({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-1 items-center">
      {colors.slice(0, 6).map((c, i) => (
        <div key={i} className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: cueColorMap[c.toLowerCase()] || '#374151' }} />
      ))}
    </div>
  );
}

const COLS = '2fr 0.5fr 0.55fr 0.45fr 0.65fr 0.65fr 0.5fr';

export function TrackTable({ tracks, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? tracks.filter(t =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    ) : tracks;
  }, [tracks, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function ColHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wider px-3 py-2.5 transition-colors cursor-pointer"
        style={{ color: active ? '#c084fc' : '#4b5563', letterSpacing: '0.06em' }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#4b5563'; }}
      >
        {label}
        {active && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {sortDir === 'asc'
              ? <polyline points="18 15 12 9 6 15"/>
              : <polyline points="6 9 12 15 18 9"/>}
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0d0d0d' }}>
      {/* Search bar */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1a1a1a', background: '#0f0f0f' }}>
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: '#161616', border: '1px solid #222' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tracks.length.toLocaleString()} tracks…`}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#d1d5db' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="cursor-pointer" style={{ color: '#4b5563' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <span className="text-xs tabular-nums flex-shrink-0" style={{ color: '#374151' }}>
          {sorted.length.toLocaleString()} tracks
        </span>
      </div>

      {/* Column headers */}
      <div className="grid flex-shrink-0 select-none" style={{
        gridTemplateColumns: COLS,
        background: '#111111',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <ColHeader label="Title" k="title" />
        <ColHeader label="BPM" k="bpm" />
        <ColHeader label="Key" k="key_musical" />
        <ColHeader label="Cam" k="camelot" />
        <div className="text-xs font-medium uppercase tracking-wider px-3 py-2.5" style={{ color: '#4b5563', letterSpacing: '0.06em' }}>Cues</div>
        <ColHeader label="Rating" k="rating" />
        <ColHeader label="Time" k="duration_sec" />
      </div>

      {/* Virtual rows */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(vRow => {
            const t = sorted[vRow.index];
            const isEven = vRow.index % 2 === 0;
            return (
              <div
                key={t.content_id}
                onClick={() => onSelect?.(t)}
                className="grid absolute w-full items-center cursor-pointer group"
                style={{
                  gridTemplateColumns: COLS,
                  top: vRow.start,
                  height: vRow.size,
                  background: isEven ? 'transparent' : 'rgba(255,255,255,0.01)',
                  borderBottom: '1px solid #141414',
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isEven ? 'transparent' : 'rgba(255,255,255,0.01)'; }}
              >
                <div className="px-3 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#e5e7eb' }}>{t.title}</div>
                  <div className="text-xs truncate mt-0.5" style={{ color: '#4b5563' }}>{t.artist}</div>
                </div>
                <div className="px-3 text-sm font-mono font-medium" style={{ color: '#34d399' }}>
                  {t.bpm.toFixed(0)}
                </div>
                <div className="px-3 text-sm" style={{ color: '#d1d5db' }}>{t.key_musical}</div>
                <div className="px-3">
                  <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                    {t.camelot}
                  </span>
                </div>
                <div className="px-3"><CueDots colors={t.cue_colors} /></div>
                <div className="px-3"><RatingStars rating={t.rating} /></div>
                <div className="px-3 text-xs font-mono tabular-nums" style={{ color: '#4b5563' }}>
                  {formatDuration(t.duration_sec)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
