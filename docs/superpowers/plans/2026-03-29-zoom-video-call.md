# Simple 2-Way Video Call Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal 2-person video call app with screen share using WebRTC.

**Architecture:** React frontend connects to a Node.js WebSocket signaling server. Signaling server relays SDP offers/answers and ICE candidates between two peers. All media flows peer-to-peer via WebRTC — server never touches audio/video.

**Tech Stack:** React 18, TypeScript, Vite, Node.js, `ws` library, browser WebRTC APIs

**Spec:** `docs/superpowers/specs/2026-03-29-zoom-video-call-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `apps/zoom/server/package.json` | Server dependencies (ws, tsx) |
| `apps/zoom/server/tsconfig.json` | Server TypeScript config |
| `apps/zoom/server/index.ts` | WebSocket signaling — room map, message relay |
| `apps/zoom/frontend/package.json` | Frontend dependencies (react, vite) |
| `apps/zoom/frontend/tsconfig.json` | Frontend TypeScript config |
| `apps/zoom/frontend/vite.config.ts` | Vite config |
| `apps/zoom/frontend/index.html` | HTML entry point |
| `apps/zoom/frontend/src/main.tsx` | React mount |
| `apps/zoom/frontend/src/App.tsx` | Top-level: JoinScreen or CallScreen |
| `apps/zoom/frontend/src/components/JoinScreen.tsx` | Name + room code form |
| `apps/zoom/frontend/src/components/CallScreen.tsx` | Video elements + ControlBar |
| `apps/zoom/frontend/src/components/ControlBar.tsx` | Mic/Cam/Screen/End buttons |
| `apps/zoom/frontend/src/hooks/useWebRTC.ts` | WebRTC + signaling logic |
| `apps/zoom/frontend/src/styles/app.css` | Dark theme styles |

---

## Chunk 1: Signaling Server

### Task 1: Scaffold server project

**Files:**
- Create: `apps/zoom/server/package.json`
- Create: `apps/zoom/server/tsconfig.json`

- [ ] **Step 1: Create server package.json**

```json
{
  "name": "zoom-signaling",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx index.ts"
  },
  "dependencies": {
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "@types/ws": "^8.5.10",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create server tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd apps/zoom/server && npm install`
Expected: `node_modules/` created, lock file generated

- [ ] **Step 4: Commit**

```bash
git add apps/zoom/server/package.json apps/zoom/server/tsconfig.json apps/zoom/server/package-lock.json
git commit -m "feat(zoom): scaffold signaling server project"
```

---

### Task 2: Implement signaling server

**Files:**
- Create: `apps/zoom/server/index.ts`

- [ ] **Step 1: Write the signaling server**

```typescript
import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

// room name → [socket, socket]
const rooms = new Map<string, { ws: WebSocket; name: string }[]>();

wss.on('connection', (ws) => {
  let currentRoom: string | null = null;
  let currentName: string = '';

  ws.on('message', (raw) => {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'join') {
      const room = msg.room as string;
      const name = msg.name as string;
      currentRoom = room;
      currentName = name;

      if (!rooms.has(room)) rooms.set(room, []);
      const peers = rooms.get(room)!;

      if (peers.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }

      peers.push({ ws, name });

      // Notify all peers in the room about the new joiner
      for (const peer of peers) {
        if (peer.ws !== ws) {
          peer.ws.send(JSON.stringify({ type: 'peer-joined', name }));
          ws.send(JSON.stringify({ type: 'peer-joined', name: peer.name }));
        }
      }
      return;
    }

    // Relay offer, answer, ice-candidate to the other peer
    if (['offer', 'answer', 'ice-candidate'].includes(msg.type) && currentRoom) {
      const peers = rooms.get(currentRoom);
      if (!peers) return;
      for (const peer of peers) {
        if (peer.ws !== ws) {
          peer.ws.send(JSON.stringify(msg));
        }
      }
    }
  });

  ws.on('close', () => {
    if (!currentRoom) return;
    const peers = rooms.get(currentRoom);
    if (!peers) return;

    // Remove this socket from the room
    const remaining = peers.filter((p) => p.ws !== ws);
    if (remaining.length === 0) {
      rooms.delete(currentRoom);
    } else {
      rooms.set(currentRoom, remaining);
      for (const peer of remaining) {
        peer.ws.send(JSON.stringify({ type: 'peer-left' }));
      }
    }
  });
});

console.log('Signaling server running on ws://localhost:3001');
```

- [ ] **Step 2: Start server and verify it runs**

Run: `cd apps/zoom/server && npm start &`
Expected: Console prints "Signaling server running on ws://localhost:3001"
Then kill the background process.

- [ ] **Step 3: Commit**

```bash
git add apps/zoom/server/index.ts
git commit -m "feat(zoom): implement WebSocket signaling server"
```

---

## Chunk 2: Frontend Scaffold + Join Screen

### Task 3: Scaffold frontend project

**Files:**
- Create: `apps/zoom/frontend/package.json`
- Create: `apps/zoom/frontend/tsconfig.json`
- Create: `apps/zoom/frontend/vite.config.ts`
- Create: `apps/zoom/frontend/index.html`
- Create: `apps/zoom/frontend/src/main.tsx`

- [ ] **Step 1: Create frontend package.json**

```json
{
  "name": "zoom-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zoom</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Install dependencies**

Run: `cd apps/zoom/frontend && npm install`

- [ ] **Step 7: Commit**

```bash
git add apps/zoom/frontend/package.json apps/zoom/frontend/tsconfig.json apps/zoom/frontend/vite.config.ts apps/zoom/frontend/index.html apps/zoom/frontend/src/main.tsx apps/zoom/frontend/package-lock.json
git commit -m "feat(zoom): scaffold frontend with Vite + React + TypeScript"
```

---

### Task 4: Build JoinScreen component

**Files:**
- Create: `apps/zoom/frontend/src/components/JoinScreen.tsx`
- Create: `apps/zoom/frontend/src/App.tsx`

- [ ] **Step 1: Create JoinScreen.tsx**

```tsx
import { useState } from 'react';

interface JoinScreenProps {
  onJoin: (name: string, room: string) => void;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && room.trim()) {
      onJoin(name.trim(), room.trim());
    }
  };

  return (
    <div className="join-screen">
      <h1>Zoom</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="room-input">
          <input
            type="text"
            placeholder="Room code"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button type="button" onClick={() => setRoom(generateRoomCode())}>
            Generate
          </button>
        </div>
        <button type="submit" disabled={!name.trim() || !room.trim()}>
          Join Room
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create App.tsx**

```tsx
import { useState } from 'react';
import { JoinScreen } from './components/JoinScreen';

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string } | null>(null);

  if (!joined) {
    return <JoinScreen onJoin={(name, room) => setJoined({ name, room })} />;
  }

  return <div>Call screen placeholder — Room: {joined.room}</div>;
}
```

- [ ] **Step 3: Verify it renders**

Run: `cd apps/zoom/frontend && npm run dev`
Expected: Opens at localhost:5173, shows join form with name input, room code input, Generate button, Join button.

- [ ] **Step 4: Commit**

```bash
git add apps/zoom/frontend/src/App.tsx apps/zoom/frontend/src/components/JoinScreen.tsx
git commit -m "feat(zoom): add JoinScreen with name and room code"
```

---

## Chunk 3: WebRTC Hook + Call Screen

### Task 5: Implement useWebRTC hook

**Files:**
- Create: `apps/zoom/frontend/src/hooks/useWebRTC.ts`

This is the core logic — manages WebSocket signaling + RTCPeerConnection.

- [ ] **Step 1: Create useWebRTC.ts**

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

const SIGNALING_URL = 'ws://localhost:3001';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

interface UseWebRTCOptions {
  room: string;
  name: string;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerName: string | null;
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  toggleMute: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;
  endCall: () => void;
  error: string | null;
}

export function useWebRTC({ room, name }: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Send message through signaling
  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Create peer connection and set up handlers
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Send ICE candidates to remote peer
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: 'ice-candidate', candidate: e.candidate });
      }
    };

    // Receive remote tracks
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => remote.addTrack(track));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    // Add local tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [send]);

  // Initialize: get media, connect to signaling
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);

        // Connect to signaling server
        const ws = new WebSocket(SIGNALING_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          send({ type: 'join', room, name });
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          if (msg.type === 'peer-joined') {
            setPeerName(msg.name);
            // If we're the one who was already in the room, create offer
            const pc = pcRef.current || createPeerConnection();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ type: 'offer', sdp: pc.localDescription });
          }

          if (msg.type === 'offer') {
            const pc = pcRef.current || createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ type: 'answer', sdp: pc.localDescription });
          }

          if (msg.type === 'answer') {
            await pcRef.current?.setRemoteDescription(
              new RTCSessionDescription(msg.sdp)
            );
          }

          if (msg.type === 'ice-candidate') {
            await pcRef.current?.addIceCandidate(
              new RTCIceCandidate(msg.candidate)
            );
          }

          if (msg.type === 'peer-left') {
            setPeerName(null);
            setRemoteStream(null);
            pcRef.current?.close();
            pcRef.current = null;
          }

          if (msg.type === 'error') {
            setError(msg.message as string);
          }
        };
      } catch (err) {
        setError('Could not access camera/microphone');
        console.error(err);
      }
    }

    init();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      wsRef.current?.close();
    };
  }, [room, name, send, createPeerConnection]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCam = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOff(!videoTrack.enabled);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        await sender.replaceTrack(screenTrack);
        setIsScreenSharing(true);

        // When user stops sharing via browser UI
        screenTrack.onended = async () => {
          if (cameraTrackRef.current) {
            await sender.replaceTrack(cameraTrackRef.current);
          }
          setIsScreenSharing(false);
        };
      } catch {
        // User cancelled screen share picker
      }
    } else {
      if (cameraTrackRef.current) {
        await sender.replaceTrack(cameraTrackRef.current);
      }
      setIsScreenSharing(false);
    }
  }, [isScreenSharing]);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    setLocalStream(null);
    setRemoteStream(null);
    setPeerName(null);
  }, []);

  return {
    localStream,
    remoteStream,
    peerName,
    isMuted,
    isCamOff,
    isScreenSharing,
    toggleMute,
    toggleCam,
    toggleScreenShare,
    endCall,
    error,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/frontend/src/hooks/useWebRTC.ts
git commit -m "feat(zoom): implement useWebRTC hook with signaling and media"
```

---

### Task 6: Build ControlBar component

**Files:**
- Create: `apps/zoom/frontend/src/components/ControlBar.tsx`

- [ ] **Step 1: Create ControlBar.tsx**

```tsx
interface ControlBarProps {
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export function ControlBar({
  isMuted,
  isCamOff,
  isScreenSharing,
  onToggleMute,
  onToggleCam,
  onToggleScreenShare,
  onEndCall,
}: ControlBarProps) {
  return (
    <div className="control-bar">
      <button
        className={isMuted ? 'control-btn active' : 'control-btn'}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🎤'}
      </button>
      <button
        className={isCamOff ? 'control-btn active' : 'control-btn'}
        onClick={onToggleCam}
        title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        {isCamOff ? '📷' : '📹'}
      </button>
      <button
        className={isScreenSharing ? 'control-btn active' : 'control-btn'}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        🖥️
      </button>
      <button className="control-btn end-call" onClick={onEndCall} title="End Call">
        📞
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/frontend/src/components/ControlBar.tsx
git commit -m "feat(zoom): add ControlBar with mic/cam/screen/end buttons"
```

---

### Task 7: Build CallScreen component

**Files:**
- Create: `apps/zoom/frontend/src/components/CallScreen.tsx`

- [ ] **Step 1: Create CallScreen.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { ControlBar } from './ControlBar';

interface CallScreenProps {
  name: string;
  room: string;
  onLeave: () => void;
}

export function CallScreen({ name, room, onLeave }: CallScreenProps) {
  const {
    localStream,
    remoteStream,
    peerName,
    isMuted,
    isCamOff,
    isScreenSharing,
    toggleMute,
    toggleCam,
    toggleScreenShare,
    endCall,
    error,
  } = useWebRTC({ room, name });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall();
    onLeave();
  };

  return (
    <div className="call-screen">
      <div className="room-info">Room: {room}</div>

      {error && <div className="error">{error}</div>}

      <div className="video-container">
        <video
          ref={remoteVideoRef}
          className="remote-video"
          autoPlay
          playsInline
        />
        {!peerName && !error && (
          <div className="waiting">Waiting for someone to join...</div>
        )}
        {peerName && (
          <div className="peer-name">{peerName}</div>
        )}
        <video
          ref={localVideoRef}
          className="local-video"
          autoPlay
          playsInline
          muted
        />
      </div>

      <ControlBar
        isMuted={isMuted}
        isCamOff={isCamOff}
        isScreenSharing={isScreenSharing}
        onToggleMute={toggleMute}
        onToggleCam={toggleCam}
        onToggleScreenShare={toggleScreenShare}
        onEndCall={handleEndCall}
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire CallScreen into App.tsx**

Update `apps/zoom/frontend/src/App.tsx`:

```tsx
import { useState } from 'react';
import { JoinScreen } from './components/JoinScreen';
import { CallScreen } from './components/CallScreen';

export default function App() {
  const [joined, setJoined] = useState<{ name: string; room: string } | null>(null);

  if (!joined) {
    return <JoinScreen onJoin={(name, room) => setJoined({ name, room })} />;
  }

  return (
    <CallScreen
      name={joined.name}
      room={joined.room}
      onLeave={() => setJoined(null)}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/zoom/frontend/src/components/CallScreen.tsx apps/zoom/frontend/src/App.tsx
git commit -m "feat(zoom): add CallScreen with remote/local video and controls"
```

---

## Chunk 4: Styling + Final Verification

### Task 8: Add dark theme CSS

**Files:**
- Create: `apps/zoom/frontend/src/styles/app.css`

- [ ] **Step 1: Create app.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #1a1a2e;
  color: #eee;
  height: 100vh;
  overflow: hidden;
}

#root {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Join Screen */
.join-screen {
  text-align: center;
  padding: 2rem;
}

.join-screen h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #4cc9f0;
}

.join-screen form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 320px;
}

.join-screen input {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #333;
  background: #16213e;
  color: #eee;
  font-size: 1rem;
  outline: none;
}

.join-screen input:focus {
  border-color: #4cc9f0;
}

.room-input {
  display: flex;
  gap: 0.5rem;
}

.room-input input {
  flex: 1;
}

.room-input button {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: none;
  background: #333;
  color: #eee;
  cursor: pointer;
  font-size: 0.85rem;
}

.join-screen form > button[type='submit'] {
  padding: 0.75rem;
  border-radius: 8px;
  border: none;
  background: #4cc9f0;
  color: #1a1a2e;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.join-screen form > button[type='submit']:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Call Screen */
.call-screen {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f0f23;
}

.room-info {
  padding: 0.75rem 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
  background: #16213e;
}

.error {
  padding: 0.5rem;
  text-align: center;
  background: #e63946;
  color: white;
  font-size: 0.85rem;
}

.video-container {
  flex: 1;
  position: relative;
  background: #000;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.local-video {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 200px;
  border-radius: 8px;
  border: 2px solid #333;
  object-fit: cover;
}

.waiting {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  color: #888;
}

.peer-name {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(0, 0, 0, 0.6);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

/* Control Bar */
.control-bar {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background: #16213e;
}

.control-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #333;
  color: #eee;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.control-btn:hover {
  background: #444;
}

.control-btn.active {
  background: #e63946;
}

.control-btn.end-call {
  background: #e63946;
}

.control-btn.end-call:hover {
  background: #c62828;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/zoom/frontend/src/styles/app.css
git commit -m "feat(zoom): add dark theme CSS for join and call screens"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Start signaling server**

Run: `cd apps/zoom/server && npm start`
Expected: "Signaling server running on ws://localhost:3001"

- [ ] **Step 2: Start frontend**

Run: `cd apps/zoom/frontend && npm run dev`
Expected: Vite dev server at localhost:5173

- [ ] **Step 3: Test join flow**

Open `http://localhost:5173` in two browser tabs.
- Tab 1: enter name "Alice", generate room code, click Join
- Tab 2: enter name "Bob", enter same room code, click Join
- Verify: both see each other's video and hear audio

- [ ] **Step 4: Test controls**

- Click Mute — verify mic muted (audio stops for remote)
- Click Camera Off — verify video stops for remote
- Click Share Screen — verify screen replaces video for remote
- Click End Call — verify returns to join screen

- [ ] **Step 5: Final commit**

```bash
git add -A apps/zoom/
git commit -m "feat(zoom): complete 2-way video call app with screen share"
```
