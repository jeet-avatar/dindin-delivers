// src/components/TrackTable.tsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Track } from '../types/track';
import { sidecarGet } from '../hooks/useSidecar';

type SortKey = 'title' | 'artist' | 'bpm' | 'key_musical' | 'camelot' | 'rating' | 'duration_sec' | 'genre' | 'date_added' | 'play_count';
type SortDir = 'asc' | 'desc';
type Filter = 'all' | 'major' | 'minor' | 'slow' | 'mid' | 'fast' | string;

interface Props {
  tracks: Track[];
  onSelect?: (track: Track) => void;
  onReload?: () => void;
  onPlay?: (track: Track) => void;
  onAddToSet?: (track: Track) => void;
  playedIds?: Set<string>;
  compatibleKeys?: string[];
  nowPlayingId?: string;
}

// ── Helpers ──────────────────────────────────────────────────

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function energyLabel(bpm: number): string {
  if (bpm < 90)  return 'Ambient';
  if (bpm < 110) return 'Hip-Hop';
  if (bpm < 118) return 'Soulful';
  if (bpm < 122) return 'Deep';
  if (bpm < 126) return 'Tech';
  if (bpm < 130) return 'House';
  if (bpm < 135) return 'Peak';
  if (bpm < 140) return 'Techno';
  return 'Hard';
}

// Extract camelot number (e.g. "8B" -> "8", "11A" -> "11")
function camelotNum(c: string): string {
  return c.replace(/[AB]/i, '').trim();
}

// Camelot -> badge color
const CAMELOT_COLORS: Record<string, { bg: string; text: string }> = {
  '1':  { bg: 'rgba(96,165,250,0.12)',   text: '#93c5fd' },
  '2':  { bg: 'rgba(167,139,250,0.12)',  text: '#c4b5fd' },
  '3':  { bg: 'rgba(244,114,182,0.12)',  text: '#f9a8d4' },
  '4':  { bg: 'rgba(251,146,60,0.12)',   text: '#fdba74' },
  '5':  { bg: 'rgba(250,204,21,0.12)',   text: '#fde68a' },
  '6':  { bg: 'rgba(74,222,128,0.12)',   text: '#86efac' },
  '7':  { bg: 'rgba(45,212,191,0.12)',   text: '#5eead4' },
  '8':  { bg: 'rgba(34,211,238,0.12)',   text: '#67e8f9' },
  '9':  { bg: 'rgba(56,189,248,0.12)',   text: '#7dd3fc' },
  '10': { bg: 'rgba(129,140,248,0.12)',  text: '#a5b4fc' },
  '11': { bg: 'rgba(248,113,113,0.12)',  text: '#fca5a5' },
  '12': { bg: 'rgba(251,113,133,0.12)', text: '#fda4af' },
};

function KeyBadge({ camelot }: { camelot: string }) {
  const num = camelotNum(camelot);
  const color = CAMELOT_COLORS[num] ?? { bg: 'rgba(255,255,255,0.07)', text: '#9ca3af' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px',
      letterSpacing: '0.02em', background: color.bg, color: color.text,
      fontFeatureSettings: '"tnum"',
    }}>
      {camelot}
    </span>
  );
}

function BpmBadge({ bpm }: { bpm: number }) {
  return (
    <span style={{
      fontSize: '12px', fontWeight: 600,
      fontFeatureSettings: '"tnum"',
      color: '#a78bfa',
      background: 'rgba(124,58,237,0.15)',
      padding: '2px 7px', borderRadius: '5px',
      display: 'inline-block',
    }}>
      {Math.round(bpm)}
    </span>
  );
}

// ── Genre badge with hash-based color ──────────────────────────

const GENRE_COLORS = [
  { bg: 'rgba(96,165,250,0.14)',  text: '#93c5fd', border: 'rgba(96,165,250,0.25)' },
  { bg: 'rgba(167,139,250,0.14)', text: '#c4b5fd', border: 'rgba(167,139,250,0.25)' },
  { bg: 'rgba(244,114,182,0.14)', text: '#f9a8d4', border: 'rgba(244,114,182,0.25)' },
  { bg: 'rgba(251,146,60,0.14)',  text: '#fdba74', border: 'rgba(251,146,60,0.25)' },
  { bg: 'rgba(74,222,128,0.14)',  text: '#86efac', border: 'rgba(74,222,128,0.25)' },
  { bg: 'rgba(45,212,191,0.14)',  text: '#5eead4', border: 'rgba(45,212,191,0.25)' },
  { bg: 'rgba(250,204,21,0.14)',  text: '#fde68a', border: 'rgba(250,204,21,0.25)' },
];

function genreColorIndex(genre: string): number {
  let h = 0;
  for (let i = 0; i < genre.length; i++) {
    h = (h * 31 + genre.charCodeAt(i)) & 0xffff;
  }
  return h % 7;
}

function GenreBadge({ genre, bpm }: { genre?: string; bpm: number }) {
  const energy = energyLabel(bpm);
  if (!genre) {
    return (
      <span style={{
        fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px',
        background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
      }}>
        {energy}
      </span>
    );
  }
  const c = GENRE_COLORS[genreColorIndex(genre)];
  const displayGenre = genre.length > 12 ? genre.slice(0, 12) + '\u2026' : genre;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{
        fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
        background: c.bg, color: c.text, border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px',
      }}>
        {displayGenre}
      </span>
      <span style={{
        fontSize: '9px', fontWeight: 500, padding: '1px 5px', borderRadius: '3px',
        background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
      }}>
        {energy}
      </span>
    </span>
  );
}

function RatingDots({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: i < rating ? '#7c3aed' : 'var(--border)',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

function WaveformIcon() {
  const heights = [10, 16, 8, 14, 12, 10, 16];
  const delays  = [0, 0.15, 0.3, 0.05, 0.2, 0.1, 0.25];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5px', height: '18px', padding: '0 2px' }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: '2px', height: `${h}px`, borderRadius: '2px',
          background: '#a78bfa', opacity: 0.7,
          animation: `wave 1.2s ease-in-out infinite alternate`,
          animationDelay: `${delays[i]}s`,
          transformOrigin: 'center',
        }} />
      ))}
    </div>
  );
}

// ── Sort arrow ────────────────────────────────────────────────

function SortArrow({ dir }: { dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {dir === 'asc' ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
    </svg>
  );
}

// ── Column header widths (table-layout: fixed) ────────────────
//  #  | title+artist | bpm | key | genre+energy | rating | dur | plays | added | actions
const COL_WIDTHS = ['44px', 'auto', '70px', '70px', '130px', '72px', '70px', '50px', '58px', '48px'];

// ── Main component ────────────────────────────────────────────

export function TrackTable({ tracks, onSelect, onReload, onPlay, onAddToSet }: Props) {
  const [sortKey, setSortKey]   = useState<SortKey>('bpm');
  const [sortDir, setSortDir]   = useState<SortDir>('asc');
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<Filter>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch available genres from sidecar
  useEffect(() => {
    sidecarGet<{ genres: string[] }>('/api/library/genres')
      .then(r => setAvailableGenres(r.genres))
      .catch(() => {});
  }, []);

  // ── Derived data ────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = tracks;

    // Search
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.key_musical.toLowerCase().includes(q) ||
      t.camelot.toLowerCase().includes(q) ||
      (t.genre?.toLowerCase().includes(q) ?? false)
    );

    // Filter chips
    if (filter === 'major') list = list.filter(t => t.camelot.toUpperCase().endsWith('B'));
    if (filter === 'minor') list = list.filter(t => t.camelot.toUpperCase().endsWith('A'));
    if (filter === 'slow')  list = list.filter(t => t.bpm <= 120);
    if (filter === 'mid')   list = list.filter(t => t.bpm > 120 && t.bpm <= 124);
    if (filter === 'fast')  list = list.filter(t => t.bpm > 124);

    // Genre filter
    if (genreFilter !== 'all') list = list.filter(t => t.genre === genreFilter);

    return list;
  }, [tracks, search, filter, genreFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' || typeof bv === 'number'
        ? ((av as number ?? 0) - (bv as number ?? 0))
        : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Aggregate stats
  const avgBpm = useMemo(() => {
    if (!sorted.length) return 0;
    return sorted.reduce((s, t) => s + t.bpm, 0) / sorted.length;
  }, [sorted]);

  const totalSec = useMemo(() => sorted.reduce((s, t) => s + t.duration_sec, 0), [sorted]);
  const totalTime = (() => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function handleRowClick(t: Track) {
    setActiveId(t.content_id);
    onSelect?.(t);
    if (t.file_path) onPlay?.(t);
  }

  // ── Render ──────────────────────────────────────────────────

  const S: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-base)', overflow: 'hidden',
    },

    // Header
    header: {
      padding: '16px 20px 0', flexShrink: 0,
    },
    headerTop: {
      display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px',
    },
    headerTitle: {
      fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)',
    },
    headerCount: {
      fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)',
      background: 'var(--bg-overlay)', border: '1px solid var(--border)',
      padding: '2px 8px', borderRadius: '20px',
    },
    headerActions: {
      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
    },

    // Toolbar
    toolbar: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '0 20px 14px', flexShrink: 0,
    },
    searchWrap: { position: 'relative', flex: 1, maxWidth: '340px' },
    searchIcon: {
      position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)',
      color: 'var(--text-secondary)', pointerEvents: 'none',
    },
    searchInput: {
      width: '100%',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '7px 32px 7px 34px',
      fontSize: '13px', fontFamily: 'var(--font)', color: 'var(--text-primary)',
      outline: 'none', transition: 'all 0.15s',
    },
    chips: { display: 'flex', alignItems: 'center', gap: '6px' },
    sortInfo: {
      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '11px', color: 'var(--text-secondary)',
    },

    // Table
    tableWrap: { flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 },
    tableHead: {
      position: 'sticky', top: 0, zIndex: 10,
      display: 'grid', background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      gridTemplateColumns: COL_WIDTHS.join(' '),
    },
    th: {
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '9px 12px', fontSize: '11px', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      color: 'var(--text-secondary)', cursor: 'pointer',
      border: 'none', background: 'none', fontFamily: 'var(--font)',
      transition: 'color 0.15s', userSelect: 'none', whiteSpace: 'nowrap',
    },

    // Status bar
    statusBar: {
      height: '28px', flexShrink: 0,
      background: 'var(--bg-base)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 20px',
      gap: '16px', fontSize: '11px', color: 'var(--text-secondary)',
    },
  };

  function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick?: () => void; primary?: boolean }) {
    const [hover, setHover] = useState(false);
    return (
      <button onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: 500,
          padding: '6px 12px', borderRadius: '7px',
          cursor: 'pointer', border: 'none', outline: 'none',
          transition: 'all 0.15s', fontFamily: 'var(--font)',
          background: primary
            ? (hover ? '#6d28d9' : '#7c3aed')
            : (hover ? 'var(--bg-overlay)' : 'transparent'),
          color: primary ? '#fff' : (hover ? 'var(--text-primary)' : 'var(--text-secondary)'),
          ...(primary ? {} : { border: '1px solid var(--border)' }),
        }}>
        {children}
      </button>
    );
  }

  function Chip({ id, label, dot }: { id: Filter; label: string; dot?: string }) {
    const isActive = filter === id;
    const [hover, setHover] = useState(false);
    return (
      <button
        onClick={() => setFilter(id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          fontSize: '11px', fontWeight: 500,
          padding: '5px 10px', borderRadius: '6px',
          cursor: 'pointer', fontFamily: 'var(--font)',
          transition: 'all 0.15s', userSelect: 'none',
          background: isActive ? 'var(--accent-soft)' : (hover ? 'var(--bg-overlay)' : 'transparent'),
          border: isActive ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--border)',
          color: isActive ? '#c4b5fd' : (hover ? 'var(--text-primary)' : 'var(--text-secondary)'),
        }}>
        {dot && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', marginRight: '5px', verticalAlign: 'middle', background: dot }} />}
        {label}
      </button>
    );
  }

  function ColHeader({ label, sortK, first }: { label: React.ReactNode; sortK?: SortKey; first?: boolean }) {
    const isActive = sortK && sortKey === sortK;
    return (
      <button
        onClick={() => sortK && toggleSort(sortK)}
        style={{
          ...S.th,
          paddingLeft: first ? '20px' : '12px',
          color: isActive ? '#c4b5fd' : 'var(--text-secondary)',
          cursor: sortK ? 'pointer' : 'default',
        }}
        onMouseEnter={e => { if (sortK && !isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
      >
        {label}
        {isActive && <SortArrow dir={sortDir} />}
      </button>
    );
  }

  return (
    <div style={S.root}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <span style={S.headerTitle}>Library</span>
          <span style={S.headerCount}>{tracks.length.toLocaleString()} tracks</span>
          <div style={S.headerActions}>
            <Btn>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </Btn>
            <Btn onClick={onReload} primary>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.42"/>
              </svg>
              Reload
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        {/* Search */}
        <div style={S.searchWrap}>
          <svg style={S.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tracks, artists, keys, genres..."
            style={S.searchInput}
            onFocus={e => {
              (e.target as HTMLInputElement).style.borderColor = 'rgba(124,58,237,0.5)';
              (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)';
              (e.target as HTMLInputElement).style.background = 'var(--bg-elevated)';
            }}
            onBlur={e => {
              (e.target as HTMLInputElement).style.borderColor = 'var(--border)';
              (e.target as HTMLInputElement).style.boxShadow = 'none';
              (e.target as HTMLInputElement).style.background = 'var(--bg-surface)';
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div style={S.chips}>
          <Chip id="all"   label="All" />
          <Chip id="major" label="Major" dot="#a78bfa" />
          <Chip id="minor" label="Minor" dot="#60a5fa" />
          <Chip id="slow"  label="<=120" dot="#34d399" />
          <Chip id="mid"   label="121-124" dot="#f59e0b" />
          <Chip id="fast"  label="125+" dot="#f472b6" />
        </div>

        {/* Sort info */}
        <div style={S.sortInfo}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/>
          </svg>
          Sorted by {sortKey === 'duration_sec' ? 'Duration' : sortKey === 'key_musical' ? 'Key' : sortKey === 'play_count' ? 'Plays' : sortKey === 'date_added' ? 'Added' : sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}
        </div>
      </div>

      {/* ── Genre filter chips ── */}
      {availableGenres.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px',
          padding: '0 20px 10px', flexShrink: 0,
        }}>
          <button
            onClick={() => setGenreFilter('all')}
            style={{
              fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '20px',
              cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s', userSelect: 'none',
              background: genreFilter === 'all' ? 'var(--accent-soft)' : 'transparent',
              border: genreFilter === 'all' ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--border)',
              color: genreFilter === 'all' ? '#c4b5fd' : 'var(--text-secondary)',
            }}
          >
            All Genres
          </button>
          {availableGenres.map(g => {
            const isActive = genreFilter === g;
            const gc = GENRE_COLORS[genreColorIndex(g)];
            return (
              <button
                key={g}
                onClick={() => setGenreFilter(g)}
                style={{
                  fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '20px',
                  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s', userSelect: 'none',
                  background: isActive ? gc.bg : 'transparent',
                  border: isActive ? `1px solid ${gc.border}` : '1px solid var(--border)',
                  color: isActive ? gc.text : 'var(--text-secondary)',
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Column headers ── */}
      <div style={S.tableHead}>
        <div style={{ ...S.th, paddingLeft: '20px', cursor: 'default' }}>#</div>
        <ColHeader label="Title"    sortK="title" />
        <ColHeader label="BPM"      sortK="bpm" />
        <ColHeader label="Key"      sortK="camelot" />
        <ColHeader label="Genre"    sortK="genre" />
        <ColHeader label="Rating"   sortK="rating" />
        <ColHeader label={
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg> as any
        } sortK="duration_sec" />
        <ColHeader label="Plays" sortK="play_count" />
        <ColHeader label="Added" sortK="date_added" />
        <div style={{ ...S.th, cursor: 'default' }}></div>
      </div>

      {/* ── Virtual rows ── */}
      <div ref={parentRef} style={S.tableWrap}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', background: 'var(--bg-surface)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.75" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No tracks found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Try a different search or filter</div>
          </div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(vRow => {
              const t = sorted[vRow.index];
              const isPlaying = t.content_id === activeId;

              return (
                <div
                  key={t.content_id}
                  onClick={() => handleRowClick(t)}
                  style={{
                    position: 'absolute', top: vRow.start, width: '100%',
                    height: vRow.size,
                    display: 'grid',
                    gridTemplateColumns: COL_WIDTHS.join(' '),
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: isPlaying ? 'rgba(124,58,237,0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => {
                    if (!isPlaying) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isPlaying) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* # / waveform */}
                  <div style={{ paddingLeft: '20px', paddingRight: '12px', display: 'flex', alignItems: 'center' }}>
                    {isPlaying ? (
                      <WaveformIcon />
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"' }}>
                        {vRow.index + 1}
                      </span>
                    )}
                  </div>

                  {/* Title + Artist */}
                  <div style={{ padding: '0 12px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '13px', fontWeight: 500, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: isPlaying ? '#c4b5fd' : 'var(--text-primary)',
                    }}>
                      {t.title}
                    </div>
                    <div style={{
                      fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', color: 'var(--text-secondary)', marginTop: '1px',
                    }}>
                      {t.artist}
                    </div>
                  </div>

                  {/* BPM */}
                  <div style={{ padding: '0 12px' }}>
                    <BpmBadge bpm={t.bpm} />
                  </div>

                  {/* Key (Camelot) */}
                  <div style={{ padding: '0 12px' }}>
                    <KeyBadge camelot={t.camelot} />
                  </div>

                  {/* Genre + Energy + Color dot + Comment */}
                  <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                    {t.color_hex && (
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                        background: t.color_hex,
                      }} />
                    )}
                    <GenreBadge genre={t.genre} bpm={t.bpm} />
                    {t.comment && (
                      <span title={t.comment} style={{
                        cursor: 'help', flexShrink: 0, display: 'inline-flex', alignItems: 'center',
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  <div style={{ padding: '0 12px' }}>
                    <RatingDots rating={t.rating} />
                  </div>

                  {/* Duration */}
                  <div style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"' }}>
                    {formatDuration(t.duration_sec)}
                  </div>

                  {/* Play Count */}
                  <div style={{ padding: '0 8px', fontSize: '10px', color: '#a78bfa', fontFeatureSettings: '"tnum"' }}>
                    {(t.play_count ?? 0) > 0 && (
                      <span>{t.play_count} &#9654;</span>
                    )}
                  </div>

                  {/* Date Added */}
                  <div style={{ padding: '0 8px', fontSize: '10px', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"' }}>
                    {t.date_added?.slice(0, 7) ?? ''}
                  </div>

                  {/* Actions */}
                  <div className="row-action" style={{ padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    {onAddToSet && (
                      <button
                        onClick={e => { e.stopPropagation(); onAddToSet(t); }}
                        style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                          background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                          border: '1px solid rgba(124,58,237,0.2)', cursor: 'pointer',
                          fontFamily: 'var(--font)', flexShrink: 0, fontWeight: 500,
                        }}
                      >
                        + Set
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); }}
                      style={{
                        width: '26px', height: '26px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', borderRadius: '5px', cursor: 'pointer',
                        color: 'var(--text-secondary)', background: 'none', border: 'none',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={S.statusBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px var(--green-glow)' }} />
          Rekordbox library synced
        </div>
        <div>{sorted.length.toLocaleString()} {search || filter !== 'all' || genreFilter !== 'all' ? 'results' : 'tracks'}</div>
        {availableGenres.length > 0 && <div>{availableGenres.length} genres</div>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          {sorted.length > 0 && <span>Avg BPM: {avgBpm.toFixed(1)}</span>}
          {totalSec > 0 && <span>Total: {totalTime}</span>}
        </div>
      </div>
    </div>
  );
}
