// src/components/LeftNav.tsx
type Panel = 'library' | 'playlists' | 'duplicates' | 'usb' | 'setbuilder';

interface Props {
  active: Panel;
  onChange: (panel: Panel) => void;
  usbConnected: boolean;
  usbName?: string;
  duplicateCount: number;
  trackCount?: number;
  playlistCount?: number;
  setTrackCount?: number;
}

const icons: Record<Panel, JSX.Element> = {
  library: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  playlists: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
    </svg>
  ),
  duplicates: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  usb: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/>
      <path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4-4-4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>
    </svg>
  ),
  setbuilder: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
      <line x1="6" y1="2" x2="6" y2="15"/>
    </svg>
  ),
};

export function LeftNav({ active, onChange, usbConnected, usbName, duplicateCount, trackCount, playlistCount, setTrackCount }: Props) {
  const items: { id: Panel; label: string; badge?: string | number; badgeOrange?: boolean }[] = [
    { id: 'library',    label: 'Library',    badge: trackCount ? trackCount.toLocaleString() : undefined },
    { id: 'playlists',  label: 'Playlists',  badge: playlistCount || undefined },
    { id: 'duplicates', label: 'Duplicates', badge: duplicateCount > 0 ? duplicateCount : undefined, badgeOrange: true },
    { id: 'usb',        label: 'USB Export' },
    { id: 'setbuilder', label: 'Set Builder', badge: setTrackCount && setTrackCount > 0 ? setTrackCount : undefined },
  ];

  return (
    <nav style={{
      width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-base)', borderRight: '1px solid var(--border)',
      padding: '12px 10px', gap: '2px',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px 16px', marginBottom: '4px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>MixMind</span>
      </div>

      {/* Section label */}
      <div style={{
        fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-tertiary)',
        padding: '4px 10px 6px',
      }}>Library</div>

      {/* Nav items */}
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '8px 10px', borderRadius: '7px',
              fontSize: '13px', fontWeight: 500,
              color: isActive ? '#c4b5fd' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-soft)' : 'transparent',
              border: 'none', cursor: 'pointer', width: '100%',
              textAlign: 'left', transition: 'all 0.15s', userSelect: 'none',
              fontFamily: 'var(--font)',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-overlay)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }
            }}
          >
            <span style={{ color: isActive ? '#a78bfa' : 'var(--text-secondary)', flexShrink: 0 }}>
              {icons[item.id]}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge !== undefined && (
              <span style={{
                fontSize: '10px', fontWeight: 600,
                padding: '1px 6px', borderRadius: '20px',
                background: item.badgeOrange ? 'rgba(245,158,11,0.15)' : 'var(--accent-soft)',
                color: item.badgeOrange ? '#f59e0b' : '#a78bfa',
                flexShrink: 0,
              }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* USB status */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '7px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
            background: usbConnected ? 'var(--green)' : 'var(--text-tertiary)',
            boxShadow: usbConnected ? '0 0 6px var(--green-glow)' : 'none',
          }} />
          <span style={{ fontSize: '12px', color: usbConnected ? '#86efac' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {usbConnected ? (usbName || 'USB Connected') : 'No USB connected'}
          </span>
        </div>
      </div>
    </nav>
  );
}
