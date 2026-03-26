// src/components/USBPanel.tsx
import { useState, useEffect } from 'react';
import { sidecarGet } from '../hooks/useSidecar';

interface USBInfo { connected: boolean; name?: string; path?: string; }

const steps = [
  { n: 1, text: 'Build your playlist using AI or from the library' },
  { n: 2, text: 'Save it to Playlists in MixMind' },
  { n: 3, text: 'Open Rekordbox and sync your playlist to USB' },
];

export function USBPanel() {
  const [usb, setUsb] = useState<USBInfo>({ connected: false });

  useEffect(() => {
    const poll = async () => {
      try { setUsb(await sidecarGet<USBInfo>('/api/usb/status')); } catch {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  function openRekordbox() {
    (window as any).mixmind?.openExternal?.('file:///Applications/rekordbox.app');
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: '#0d0d0d' }}>
      <div className="max-w-md space-y-5">
        {/* USB Status */}
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: usb.connected ? 'rgba(34,197,94,0.06)' : '#111', border: `1px solid ${usb.connected ? 'rgba(34,197,94,0.15)' : '#1e1e1e'}` }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: usb.connected ? 'rgba(34,197,94,0.12)' : '#161616' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={usb.connected ? '#22c55e' : '#374151'} strokeWidth="1.75" strokeLinecap="round">
              <path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/>
              <path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4-4-4 4"/>
              <path d="M16 18a4 4 0 0 0-8 0"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: usb.connected ? '#86efac' : '#6b7280' }}>
              {usb.connected ? (usb.name || 'USB Drive') : 'No USB detected'}
            </div>
            {usb.path && <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{usb.path}</div>}
            {!usb.connected && (
              <div className="text-xs mt-0.5" style={{ color: '#374151' }}>Plug in a USB drive to export your set</div>
            )}
          </div>
          {usb.connected && (
            <div className="ml-auto w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e88' }} />
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-xl p-4 space-y-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <h3 className="text-sm font-semibold text-white">How to export to USB</h3>
          <div className="space-y-3">
            {steps.map(s => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(124,58,237,0.15)', color: '#a855f7' }}>
                  {s.n}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{s.text}</p>
              </div>
            ))}
          </div>
          <button
            onClick={openRekordbox}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all mt-2"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#c084fc', border: '1px solid rgba(124,58,237,0.2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.12)'; }}
          >
            Open Rekordbox
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
