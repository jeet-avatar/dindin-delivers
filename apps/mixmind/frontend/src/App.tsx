// src/App.tsx
import { useState, useEffect } from 'react';
import { LeftNav } from './components/LeftNav';
import { TrackTable } from './components/TrackTable';
import { AIChatSidebar } from './components/AIChatSidebar';
import { DuplicatePanel } from './components/DuplicatePanel';
import { USBPanel } from './components/USBPanel';
import { useLibrary } from './hooks/useLibrary';
import { AIPlaylistItem, Playlist, Track } from './types/track';
import { MiniPlayer } from './components/MiniPlayer';
import { DJWaveformView } from './components/DJWaveformView';

type Panel = 'library' | 'playlists' | 'duplicates' | 'usb';

export default function App() {
  const [panel, setPanel] = useState<Panel>('library');
  const { tracks, loading, error, reload } = useLibrary();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [usbConnected] = useState(false);
  const [usbName] = useState<string | undefined>();
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);

  // ── Lifted player state (shared between DJWaveformView and MiniPlayer) ────
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration,    setPlayerDuration]    = useState(0);
  // seekTo: set by DJWaveformView, consumed by MiniPlayer to seek the audio element
  const [seekTo, setSeekTo] = useState<number | null>(null);

  // Reset player state when track changes
  useEffect(() => {
    setPlayerCurrentTime(0);
    setPlayerDuration(0);
    setSeekTo(null);
  }, [nowPlaying?.content_id]);

  function handleSeek(sec: number) {
    // Use a fresh object to guarantee useEffect fires even for same-second seeks
    setSeekTo(sec);
  }

  function handlePlaylistCreated(name: string, items: AIPlaylistItem[]) {
    const matched = items.flatMap(item => {
      const found = tracks.find(t =>
        t.title.toLowerCase() === item.title.toLowerCase() &&
        t.artist.toLowerCase() === item.artist.toLowerCase()
      );
      return found ? [found] : [];
    });
    setPlaylists(prev => [...prev, { id: Date.now().toString(), name, tracks: matched }]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-void)', overflow: 'hidden' }}>
      {/* Electron traffic-light drag region */}
      <div style={{ height: '28px', background: 'var(--bg-void)', flexShrink: 0, ...(({ WebkitAppRegion: 'drag' } as any)) }} />

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <LeftNav
          active={panel}
          onChange={setPanel}
          usbConnected={usbConnected}
          usbName={usbName}
          duplicateCount={duplicateCount}
          trackCount={tracks.length}
          playlistCount={playlists.length}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {panel === 'library' && (
            loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>Loading library…</span>
                </div>
              </div>
            ) : error === 'no_library' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px' }}>
                <div style={{ width: '52px', height: '52px', background: '#111', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.75" strokeLinecap="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#e5e7eb', marginBottom: '8px' }}>No Rekordbox library found</div>
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6', maxWidth: '300px' }}>
                    Export your library from Rekordbox:<br />
                    <strong style={{ color: '#6b7280' }}>File → Export Collection in xml format</strong>
                  </div>
                </div>
                <button onClick={reload}
                  style={{ padding: '8px 20px', background: 'rgba(124,58,237,0.15)', color: '#c084fc', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  Reload Library
                </button>
              </div>
            ) : error === 'connection_failed' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Connecting to sidecar…</span>
              </div>
            ) : (
              <TrackTable tracks={tracks} onReload={reload} onPlay={setNowPlaying} />
            )
          )}

          {panel === 'playlists' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#0d0d0d' }}>
              {playlists.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', background: '#111', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.75" strokeLinecap="round">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                      <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>No playlists yet</div>
                  <div style={{ fontSize: '12px', color: '#4b5563' }}>Ask the AI to build a set for you</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px' }}>
                  {playlists.map(p => (
                    <div key={p.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{ padding: '14px 16px', borderBottom: p.tracks.length > 0 ? '1px solid #1e1e1e' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{p.tracks.length} tracks</div>
                        </div>
                        {p.tracks.length > 0 && (
                          <button
                            onClick={() => setNowPlaying(p.tracks[0])}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', color: '#a78bfa', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                            Play all
                          </button>
                        )}
                      </div>
                      {/* Track list */}
                      {p.tracks.map((t, i) => (
                        <div
                          key={t.content_id}
                          onClick={() => t.file_path && setNowPlaying(t)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '9px 16px',
                            borderBottom: i < p.tracks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            cursor: t.file_path ? 'pointer' : 'default',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { if (t.file_path) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <span style={{ fontSize: '11px', color: '#374151', fontFeatureSettings: '"tnum"', width: '18px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                            <div style={{ fontSize: '11px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{t.artist}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{Math.round(t.bpm)}</span>
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'rgba(124,58,237,0.12)', color: '#a78bfa', flexShrink: 0 }}>{t.camelot}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === 'duplicates' && <DuplicatePanel onCountChange={setDuplicateCount} />}
          {panel === 'usb' && <USBPanel />}
        </main>

        <AIChatSidebar onPlaylistCreated={handlePlaylistCreated} />
      </div>

      {/* ── DJ Waveform View + Mini Player (shown when track is playing) ── */}
      {nowPlaying && (
        <>
          <DJWaveformView
            track={nowPlaying}
            currentTime={playerCurrentTime}
            duration={playerDuration}
            onSeek={handleSeek}
          />
          <MiniPlayer
            track={nowPlaying}
            onCurrentTimeChange={setPlayerCurrentTime}
            onDurationChange={setPlayerDuration}
            seekTo={seekTo}
            onClose={() => setNowPlaying(null)}
          />
        </>
      )}

    </div>
  );
}
