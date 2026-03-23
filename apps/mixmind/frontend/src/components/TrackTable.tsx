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
    <span className="text-yellow-400 text-xs">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function CueDots({ colors }: { colors: string[] }) {
  const colorMap: Record<string, string> = {
    red: '#ef4444', blue: '#3b82f6', green: '#10b981',
    yellow: '#f59e0b', orange: '#f97316', pink: '#ec4899',
    purple: '#a855f7', white: '#f9fafb',
  };
  return (
    <div className="flex gap-1 items-center">
      {colors.slice(0, 6).map((c, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: colorMap[c.toLowerCase()] || '#6b7280' }}
        />
      ))}
    </div>
  );
}

export function TrackTable({ tracks, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tracks.filter(t =>
      t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [tracks, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
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
        className={`text-left text-xs font-medium uppercase tracking-wide px-2 py-2 hover:text-purple-400 transition-colors ${active ? 'text-purple-400' : 'text-gray-500'}`}
      >
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="flex gap-2 p-3 border-b border-white/10">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tracks.length.toLocaleString()} tracks...`}
          className="flex-1 bg-white/5 rounded-md px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Column headers */}
      <div className="grid bg-black/30 border-b border-white/10 flex-shrink-0"
           style={{ gridTemplateColumns: '2fr 0.5fr 0.6fr 0.5fr 0.7fr 0.7fr 0.5fr' }}>
        <ColHeader label="Title / Artist" k="title" />
        <ColHeader label="BPM" k="bpm" />
        <ColHeader label="Key" k="key_musical" />
        <ColHeader label="Cam" k="camelot" />
        <div className="text-xs font-medium uppercase tracking-wide px-2 py-2 text-gray-500">Cues</div>
        <ColHeader label="Rating" k="rating" />
        <ColHeader label="Length" k="duration_sec" />
      </div>

      {/* Virtual rows */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(vRow => {
            const t = sorted[vRow.index];
            return (
              <div
                key={t.content_id}
                onClick={() => onSelect?.(t)}
                className="grid absolute w-full hover:bg-purple-500/5 cursor-pointer border-b border-white/5 items-center"
                style={{
                  gridTemplateColumns: '2fr 0.5fr 0.6fr 0.5fr 0.7fr 0.7fr 0.5fr',
                  top: vRow.start,
                  height: vRow.size,
                }}
              >
                <div className="px-2 min-w-0">
                  <div className="text-sm text-gray-100 truncate">{t.title}</div>
                  <div className="text-xs text-gray-500 truncate">{t.artist}</div>
                </div>
                <div className="px-2 text-green-400 text-sm font-mono">{t.bpm.toFixed(0)}</div>
                <div className="px-2 text-sm text-gray-300">{t.key_musical}</div>
                <div className="px-2">
                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono">
                    {t.camelot}
                  </span>
                </div>
                <div className="px-2">
                  <CueDots colors={t.cue_colors} />
                </div>
                <div className="px-2">
                  <RatingStars rating={t.rating} />
                </div>
                <div className="px-2 text-xs text-gray-500 font-mono">{formatDuration(t.duration_sec)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-1 text-xs text-gray-600 border-t border-white/5">
        {sorted.length.toLocaleString()} of {tracks.length.toLocaleString()} tracks
      </div>
    </div>
  );
}
