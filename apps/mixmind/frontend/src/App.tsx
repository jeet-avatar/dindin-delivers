// src/App.tsx
import { useState } from 'react';
import { LeftNav } from './components/LeftNav';
import { TrackTable } from './components/TrackTable';
import { AIChatSidebar } from './components/AIChatSidebar';
import { DuplicatePanel } from './components/DuplicatePanel';
import { USBPanel } from './components/USBPanel';
import { useLibrary } from './hooks/useLibrary';
import { AIPlaylistItem, Playlist } from './types/track';

type Panel = 'library' | 'playlists' | 'duplicates' | 'usb';

export default function App() {
  const [panel, setPanel] = useState<Panel>('library');
  const { tracks, loading, error, reload } = useLibrary();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbName, setUsbName] = useState<string | undefined>();

  function handlePlaylistCreated(name: string, items: AIPlaylistItem[]) {
    const matched = items.flatMap(item => {
      const found = tracks.find(t =>
        t.title.toLowerCase() === item.title.toLowerCase() &&
        t.artist.toLowerCase() === item.artist.toLowerCase()
      );
      return found ? [found] : [];
    });
    setPlaylists(prev => [...prev, {
      id: Date.now().toString(),
      name,
      tracks: matched,
    }]);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f] text-gray-100">
      <LeftNav
        active={panel}
        onChange={setPanel}
        usbConnected={usbConnected}
        usbName={usbName}
        duplicateCount={duplicateCount}
      />

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {panel === 'library' && (
          loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Loading library...
            </div>
          ) : error === 'no_library' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="text-4xl">📂</div>
              <div>
                <div className="text-gray-200 font-medium mb-2">No Rekordbox library found</div>
                <div className="text-gray-500 text-sm max-w-xs">
                  Export your library from Rekordbox:<br/>
                  <strong>File → Export Collection in xml format</strong><br/>
                  then reload MixMind.
                </div>
              </div>
              <button
                onClick={reload}
                className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-md text-sm"
              >
                Reload Library
              </button>
            </div>
          ) : error === 'connection_failed' ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Connecting to sidecar...
            </div>
          ) : (
            <TrackTable tracks={tracks} />
          )
        )}

        {panel === 'playlists' && (
          <div className="flex-1 p-4">
            <div className="text-gray-400 text-sm">
              {playlists.length === 0
                ? 'No playlists yet. Ask the AI to build one!'
                : playlists.map(p => (
                  <div key={p.id} className="mb-3 p-3 bg-white/5 rounded-md">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.tracks.length} tracks</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {panel === 'duplicates' && (
          <DuplicatePanel onCountChange={setDuplicateCount} />
        )}

        {panel === 'usb' && <USBPanel />}
      </main>

      <AIChatSidebar onPlaylistCreated={handlePlaylistCreated} />
    </div>
  );
}
