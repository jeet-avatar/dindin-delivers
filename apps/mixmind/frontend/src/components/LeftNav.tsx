// src/components/LeftNav.tsx
type Panel = 'library' | 'playlists' | 'duplicates' | 'usb';

interface Props {
  active: Panel;
  onChange: (panel: Panel) => void;
  usbConnected: boolean;
  usbName?: string;
  duplicateCount: number;
}

const icons: Record<Panel, JSX.Element> = {
  library: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  playlists: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
    </svg>
  ),
  duplicates: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  usb: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4-4-4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>
    </svg>
  ),
};

export function LeftNav({ active, onChange, usbConnected, usbName, duplicateCount }: Props) {
  const items: { id: Panel; label: string }[] = [
    { id: 'library', label: 'Library' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'duplicates', label: 'Duplicates' },
    { id: 'usb', label: 'USB Export' },
  ];

  return (
    <nav className="w-52 flex-shrink-0 flex flex-col" style={{ background: '#111111', borderRight: '1px solid #1e1e1e' }}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">MixMind</span>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 pt-4 space-y-0.5">
        <p className="text-xs font-medium px-2 mb-2" style={{ color: '#4a4a4a', letterSpacing: '0.06em' }}>LIBRARY</p>
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-all cursor-pointer"
              style={{
                color: isActive ? '#c084fc' : '#6b7280',
                background: isActive ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              <span style={{ color: isActive ? '#a855f7' : '#4b5563' }}>
                {icons[item.id]}
              </span>
              <span>{item.label}</span>
              {item.id === 'duplicates' && duplicateCount > 0 && (
                <span className="ml-auto text-xs font-semibold rounded-full px-1.5 py-0.5"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '10px' }}>
                  {duplicateCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* USB status */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #1e1e1e' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: usbConnected ? '#22c55e' : '#374151' }} />
          <span className="text-xs truncate" style={{ color: usbConnected ? '#86efac' : '#4b5563' }}>
            {usbConnected ? (usbName || 'USB Connected') : 'No USB'}
          </span>
        </div>
      </div>
    </nav>
  );
}
