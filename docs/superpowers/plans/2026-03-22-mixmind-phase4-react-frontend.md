# MixMind Phase 4 — React Frontend (3-Panel UI)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** Phase 1–3 complete — sidecar API working, Electron shell loading.

**Goal:** Build the complete React frontend: 3-panel layout (left nav, track table, AI chat sidebar), playlist panel, duplicate finder panel, and USB ready panel.

**Architecture:** React 18 + TypeScript, Tailwind CSS for styling, @tanstack/react-virtual for virtual scroll on large libraries, fetch against `localhost:{port}` (port passed via Electron IPC). No Redux — useState + useContext for simplicity.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, @tanstack/react-virtual, Vite (dev) / electron-builder (prod)

---

## Chunk 1: Project scaffold + track table

### File Structure
```
apps/mixmind/frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types/track.ts          — Track type definition
    ├── hooks/
    │   ├── useSidecar.ts       — API client (base URL from Electron IPC)
    │   └── useLibrary.ts       — fetch + cache library tracks
    └── components/
        ├── LeftNav.tsx
        ├── TrackTable.tsx      — Virtual scroll, 7 columns, sortable
        ├── AIChatSidebar.tsx
        ├── PlaylistPanel.tsx
        ├── DuplicatePanel.tsx
        └── USBPanel.tsx
```

---

### Task 1: React scaffold

**Files:**
- Create: `apps/mixmind/frontend/package.json`
- Create: `apps/mixmind/frontend/tsconfig.json`
- Create: `apps/mixmind/frontend/vite.config.ts`
- Create: `apps/mixmind/frontend/tailwind.config.js`
- Create: `apps/mixmind/frontend/index.html`
- Create: `apps/mixmind/frontend/src/main.tsx`

- [ ] **Step 1.1: Create package.json**

```json
{
  "name": "mixmind-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-virtual": "^3.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 1.2: Install and verify**

```bash
cd apps/mixmind/frontend
npm install
npm run build 2>&1 | head -5
```

Expected: build fails with "No entry point" or similar — that's fine, we haven't created `src/` yet. No `node_modules` errors.

- [ ] **Step 1.3: Create config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // Required for Electron file:// loading
  build: { outDir: 'build' },
  server: { port: 3000 },
});
```

`tailwind.config.js`:
```javascript
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MixMind</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { margin: 0; background: #0f0f0f; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
```

- [ ] **Step 1.4: Create types/track.ts**

```typescript
// src/types/track.ts
export interface Track {
  content_id: string;
  source: 'db' | 'xml';
  title: string;
  artist: string;
  bpm: number;
  key_musical: string;
  camelot: string;
  rating: number;        // 0-5
  duration_sec: number;
  cue_count: number;
  cue_colors: string[];  // e.g. ['red', 'blue']
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface DuplicatePair {
  track_a: Omit<Track, 'cue_count' | 'cue_colors'>;
  track_b: Omit<Track, 'cue_count' | 'cue_colors'>;
  similarity_score: number;
}

export interface AIPlaylistItem {
  title: string;
  artist: string;
  reason: string;
}
```

- [ ] **Step 1.5: Create hooks/useSidecar.ts**

```typescript
// src/hooks/useSidecar.ts
import { useState, useEffect } from 'react';

// Port is sent from Electron main via IPC, or use default for browser dev
const DEFAULT_PORT = 8765;

let _port: number = DEFAULT_PORT;

// Listen for port from Electron IPC
if (typeof window !== 'undefined' && (window as any).mixmind?.onSidecarPort) {
  (window as any).mixmind.onSidecarPort((port: number) => { _port = port; });
}

export function sidecarUrl(path: string): string {
  return `http://127.0.0.1:${_port}${path}`;
}

export async function sidecarGet<T>(path: string): Promise<T> {
  const res = await fetch(sidecarUrl(path));
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function sidecarPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(sidecarUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function sidecarDelete(path: string): Promise<void> {
  const res = await fetch(sidecarUrl(path), { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}
```

- [ ] **Step 1.6: Create hooks/useLibrary.ts**

```typescript
// src/hooks/useLibrary.ts
import { useState, useEffect, useCallback } from 'react';
import { Track } from '../types/track';
import { sidecarGet } from './useSidecar';

interface LibraryResponse {
  tracks: Track[];
  source: string;
  total: number;
  error?: string;
}

export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sidecarGet<LibraryResponse>('/api/library');
      setTracks(data.tracks);
      setSource(data.source);
      if (data.error === 'no_library_found') {
        setError('no_library');
      }
    } catch (e) {
      setError('connection_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { tracks, source, loading, error, reload: load };
}
```

- [ ] **Step 1.7: Commit scaffold**

```bash
git add apps/mixmind/frontend/
git commit -m "feat(mixmind): React frontend scaffold — Vite, TypeScript, Tailwind, track types, sidecar hooks"
```

---

### Task 2: TrackTable component

**Files:**
- Create: `apps/mixmind/frontend/src/components/TrackTable.tsx`

- [ ] **Step 2.1: Implement TrackTable.tsx**

```tsx
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
      {/* Search + filters */}
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
```

- [ ] **Step 2.2: Commit**

```bash
git add apps/mixmind/frontend/src/components/TrackTable.tsx
git commit -m "feat(mixmind): TrackTable — 7 columns, virtual scroll, sortable, live search"
```

---

### Task 3: LeftNav, AIChatSidebar, App shell

**Files:**
- Create: `apps/mixmind/frontend/src/components/LeftNav.tsx`
- Create: `apps/mixmind/frontend/src/components/AIChatSidebar.tsx`
- Create: `apps/mixmind/frontend/src/App.tsx`

- [ ] **Step 3.1: Implement LeftNav.tsx**

```tsx
// src/components/LeftNav.tsx
type Panel = 'library' | 'playlists' | 'duplicates' | 'usb';

interface Props {
  active: Panel;
  onChange: (panel: Panel) => void;
  usbConnected: boolean;
  usbName?: string;
  duplicateCount: number;
}

export function LeftNav({ active, onChange, usbConnected, usbName, duplicateCount }: Props) {
  const items: { id: Panel; label: string; icon: string }[] = [
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'playlists', label: 'Playlists', icon: '🎵' },
    { id: 'duplicates', label: `Duplicates${duplicateCount > 0 ? ` (${duplicateCount})` : ''}`, icon: '🔍' },
    { id: 'usb', label: 'USB Ready', icon: '💾' },
  ];

  return (
    <nav className="w-32 bg-black/30 border-r border-white/10 flex flex-col flex-shrink-0">
      <div className="px-3 py-4">
        <div className="text-purple-400 font-bold text-sm mb-4">MIXMIND</div>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full text-left px-2 py-2 rounded-md text-xs mb-1 transition-colors ${
              active === item.id
                ? 'bg-purple-500/20 text-purple-300'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>
      <div className="mt-auto px-3 py-3 border-t border-white/10">
        <div className={`text-xs ${usbConnected ? 'text-green-400' : 'text-gray-600'}`}>
          {usbConnected ? `● ${usbName || 'USB'}` : '○ No USB'}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3.2: Implement AIChatSidebar.tsx**

```tsx
// src/components/AIChatSidebar.tsx
import { useState, useRef, useEffect } from 'react';
import { sidecarPost } from '../hooks/useSidecar';
import { AIPlaylistItem } from '../types/track';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  playlist?: AIPlaylistItem[];
}

interface Props {
  onPlaylistCreated: (name: string, items: AIPlaylistItem[]) => void;
}

export function AIChatSidebar({ onPlaylistCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await sidecarPost<{ reply: string; playlist: AIPlaylistItem[] }>(
        '/api/ai/chat', { message: msg }
      );
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.reply,
        playlist: res.playlist,
      }]);
      if (res.playlist.length > 0) {
        const name = `AI Set — ${new Date().toLocaleDateString()}`;
        onPlaylistCreated(name, res.playlist);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'AI is offline. Check your connection.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-60 bg-black/20 border-l border-white/10 flex flex-col flex-shrink-0">
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-purple-400 text-xs font-bold">🤖 AI ASSISTANT</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs">
            Ask anything about your library. Try: "Build a 2hr dark techno set at 128 BPM"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-xs rounded-md p-2 ${
            m.role === 'user'
              ? 'bg-white/5 text-gray-300'
              : 'bg-purple-500/10 text-purple-200'
          }`}>
            {m.text}
            {m.playlist && m.playlist.length > 0 && (
              <div className="mt-1 text-green-400 text-xs">
                ✓ {m.playlist.length} tracks added to Playlists
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-purple-400 text-xs animate-pulse">Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask AI..."
          className="flex-1 bg-white/5 rounded-md px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          onClick={send}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-md px-2 py-1.5 text-xs text-white"
        >
          →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.3: Implement App.tsx (main 3-panel shell)**

```tsx
// src/App.tsx
import { useState } from 'react';
import { LeftNav } from './components/LeftNav';
import { TrackTable } from './components/TrackTable';
import { AIChatSidebar } from './components/AIChatSidebar';
import { useLibrary } from './hooks/useLibrary';
import { AIPlaylistItem, Playlist } from './types/track';

type Panel = 'library' | 'playlists' | 'duplicates' | 'usb';

export default function App() {
  const [panel, setPanel] = useState<Panel>('library');
  const { tracks, loading, error, reload } = useLibrary();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  function handlePlaylistCreated(name: string, items: AIPlaylistItem[]) {
    // Match AI items to library tracks by title+artist
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
        usbConnected={false}
        duplicateCount={0}
      />

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Main panel content */}
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
          <div className="flex-1 p-4 text-gray-500 text-sm">
            Duplicate finder — Phase 2 integration (connect to /api/duplicates/scan)
          </div>
        )}

        {panel === 'usb' && (
          <div className="flex-1 p-4 text-gray-500 text-sm">
            USB Ready panel — save playlist to Rekordbox, then export from Rekordbox.
          </div>
        )}
      </main>

      <AIChatSidebar onPlaylistCreated={handlePlaylistCreated} />
    </div>
  );
}
```

- [ ] **Step 3.4: Build and verify**

```bash
cd apps/mixmind/frontend
npm run build
```

Expected: `build/` directory created with `index.html` and JS bundles. No TypeScript errors.

- [ ] **Step 3.5: Test in browser dev mode with mocked sidecar**

```bash
# Start the Python sidecar
cd apps/mixmind/sidecar && source venv/bin/activate && python main.py &
sleep 2

# Start frontend dev server
cd apps/mixmind/frontend && npm run dev
```

Open `http://localhost:3000` — expected: dark UI with left nav, track table (empty/error because no XML yet), AI sidebar.

- [ ] **Step 3.6: Commit**

```bash
git add apps/mixmind/frontend/src/
git commit -m "feat(mixmind): React 3-panel UI — LeftNav, TrackTable (virtual scroll), AIChatSidebar, App shell"
```

---

### Task 4: Duplicate panel + USB panel (wiring)

**Files:**
- Create: `apps/mixmind/frontend/src/components/DuplicatePanel.tsx`
- Create: `apps/mixmind/frontend/src/components/USBPanel.tsx`
- Modify: `apps/mixmind/frontend/src/App.tsx`

- [ ] **Step 4.1: Implement DuplicatePanel.tsx**

```tsx
// src/components/DuplicatePanel.tsx
import { useState, useEffect } from 'react';
import { sidecarGet, sidecarPost, sidecarDelete } from '../hooks/useSidecar';
import { DuplicatePair } from '../types/track';

interface ScanResponse {
  pairs: DuplicatePair[];
  count: number;
}

interface Props {
  onCountChange: (n: number) => void;
}

export function DuplicatePanel({ onCountChange }: Props) {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    try {
      const data = await sidecarGet<ScanResponse>('/api/duplicates/scan');
      setPairs(data.pairs);
      onCountChange(data.count);
    } finally {
      setLoading(false);
    }
  }

  async function hideTrack(content_id: string, source: string) {
    await sidecarPost('/api/duplicates/hide', { content_id, source });
    setPairs(prev => prev.filter(
      p => p.track_a.content_id !== content_id && p.track_b.content_id !== content_id
    ));
    onCountChange(pairs.length - 1);
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Duplicate Tracks</h2>
        <button
          onClick={scan}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-3 py-1.5 rounded-md text-sm"
        >
          {loading ? 'Scanning...' : 'Scan Library'}
        </button>
      </div>

      {pairs.length === 0 && !loading && (
        <p className="text-gray-500 text-sm">No duplicates found. Click "Scan Library" to check.</p>
      )}

      {pairs.map((pair, i) => (
        <div key={i} className="bg-white/5 rounded-md p-3 mb-3">
          <div className="grid grid-cols-2 gap-3 mb-2 text-sm">
            <div>
              <div className="font-medium truncate">{pair.track_a.title}</div>
              <div className="text-xs text-gray-500">{pair.track_a.artist}</div>
              <div className="text-xs text-gray-500 mt-1">
                {pair.track_a.bpm} BPM · {pair.track_a.camelot} · {Math.floor(pair.track_a.duration_sec / 60)}:{String(pair.track_a.duration_sec % 60).padStart(2,'0')}
              </div>
            </div>
            <div>
              <div className="font-medium truncate">{pair.track_b.title}</div>
              <div className="text-xs text-gray-500">{pair.track_b.artist}</div>
              <div className="text-xs text-gray-500 mt-1">
                {pair.track_b.bpm} BPM · {pair.track_b.camelot} · {Math.floor(pair.track_b.duration_sec / 60)}:{String(pair.track_b.duration_sec % 60).padStart(2,'0')}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 mb-2">
            Match: {pair.similarity_score.toFixed(0)}% similar
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => hideTrack(pair.track_b.content_id, pair.track_b.source)}
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs py-1 rounded"
            >
              Keep Left
            </button>
            <button
              onClick={() => hideTrack(pair.track_a.content_id, pair.track_a.source)}
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs py-1 rounded"
            >
              Keep Right
            </button>
            <button
              onClick={() => {
                // Keep Both: just remove this pair from view (both tracks stay visible)
                setPairs(prev => prev.filter((_, idx) => idx !== i));
                onCountChange(Math.max(0, pairs.length - 1));
              }}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs py-1 rounded"
            >
              Keep Both
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4.2: Implement USBPanel.tsx**

```tsx
// src/components/USBPanel.tsx
import { useState, useEffect } from 'react';
import { sidecarGet } from '../hooks/useSidecar';

interface USBInfo {
  connected: boolean;
  name?: string;
  path?: string;
}

export function USBPanel() {
  const [usb, setUsb] = useState<USBInfo>({ connected: false });

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await sidecarGet<USBInfo>('/api/usb/status');
        setUsb(data);
      } catch { /* sidecar might not be ready */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  function openRekordbox() {
    // Use IPC to spawn `open -a rekordbox` in main process via a dedicated handler.
    // Do NOT use shell.openExternal('rekordbox://') — that URL scheme is not
    // guaranteed to be registered on all systems and will silently fail.
    // Add to Electron main.js: ipcMain.handle('open-rekordbox', () => spawn('open', ['-a', 'rekordbox']))
    if ((window as any).mixmind?.openExternal) {
      // Fallback for dev: try the URL scheme, but main process handler is preferred
      (window as any).mixmind.openExternal('file:///Applications/rekordbox.app');
    }
  }

  return (
    <div className="flex-1 p-4">
      <h2 className="font-medium mb-4">USB Ready</h2>

      <div className={`p-3 rounded-md mb-4 text-sm ${usb.connected ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
        {usb.connected ? `● ${usb.name} connected` : '○ No USB drive detected'}
      </div>

      <div className="bg-white/5 rounded-md p-4 text-sm text-gray-400 space-y-3">
        <div className="font-medium text-gray-200">How to export your set to USB:</div>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Build your playlist using AI or drag from the library</li>
          <li>Click "Save to Playlists" to save it in MixMind</li>
          <li>Open Rekordbox and sync your playlist to USB</li>
        </ol>
        <button
          onClick={openRekordbox}
          className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 py-2 rounded-md text-sm mt-2"
        >
          Open Rekordbox →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.3: Add USB status endpoint to sidecar**

In `apps/mixmind/sidecar/`, create `usb.py`:

```python
"""USB drive detection — polls /Volumes/ for Pioneer-formatted drives."""
import os
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api/usb")


def detect_pioneer_usb() -> dict:
    """Scan /Volumes/ for a directory containing a PIONEER/ subfolder."""
    volumes = Path("/Volumes")
    if not volumes.exists():
        return {"connected": False}
    for volume in volumes.iterdir():
        pioneer_dir = volume / "PIONEER"
        if pioneer_dir.exists() and pioneer_dir.is_dir():
            stat = os.statvfs(str(volume))
            total_gb = (stat.f_blocks * stat.f_frsize) / (1024 ** 3)
            return {
                "connected": True,
                "name": volume.name,
                "path": str(volume),
                "total_gb": round(total_gb, 1),
            }
    return {"connected": False}


@router.get("/status")
async def usb_status():
    return detect_pioneer_usb()
```

Add to `main.py`:
```python
from usb import router as usb_router
app.include_router(usb_router)
```

- [ ] **Step 4.4: Wire DuplicatePanel and USBPanel into App.tsx**

Update `App.tsx` panel sections:
```tsx
import { DuplicatePanel } from './components/DuplicatePanel';
import { USBPanel } from './components/USBPanel';

// In state:
const [duplicateCount, setDuplicateCount] = useState(0);

// Replace panel === 'duplicates' section:
{panel === 'duplicates' && (
  <DuplicatePanel onCountChange={setDuplicateCount} />
)}

// Replace panel === 'usb' section:
{panel === 'usb' && <USBPanel />}

// Pass duplicateCount to LeftNav:
<LeftNav duplicateCount={duplicateCount} ... />
```

- [ ] **Step 4.5: Final build + integration test**

```bash
# Start sidecar
cd apps/mixmind/sidecar && source venv/bin/activate && python main.py &
sleep 2

# Build frontend
cd apps/mixmind/frontend && npm run build
```

Then run in Electron:
```bash
cd apps/mixmind/electron && npx electron .
```

Expected: Full 3-panel app loads. Library tab shows "No Rekordbox library found" if no XML present. Duplicates tab shows "Scan Library" button. USB tab shows USB status.

- [ ] **Step 4.6: Commit**

```bash
git add apps/mixmind/frontend/src/components/DuplicatePanel.tsx
git add apps/mixmind/frontend/src/components/USBPanel.tsx
git add apps/mixmind/frontend/src/App.tsx
git add apps/mixmind/sidecar/usb.py
git add apps/mixmind/sidecar/main.py
git commit -m "feat(mixmind): DuplicatePanel, USBPanel, USB status endpoint — full 3-panel UI complete"
```
