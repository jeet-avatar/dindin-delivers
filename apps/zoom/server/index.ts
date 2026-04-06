import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { runMigrations } from './db.js';
import { hostsRouter } from './routes/hosts.js';
import { authRouter } from './routes/auth.js';
import { bookingRouter } from './routes/booking.js';
import { cancelRouter } from './routes/cancel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001');
const STATIC_DIR = join(__dirname, '..', 'frontend', 'dist');
const MAX_ROOM_SIZE = 8;

// ── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 100, skip: () => false }));

// Mount scheduling API routes
app.use('/api/host', hostsRouter);
app.use('/api/auth', authRouter);
app.use('/api/book', bookingRouter);
app.use('/api/meeting', cancelRouter);

// Serve static frontend (catch-all — must be last)
const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

app.use((req, res) => {
  let filePath = join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);
  if (!existsSync(filePath)) filePath = join(STATIC_DIR, 'index.html');
  try {
    const content = readFileSync(filePath);
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.end(content);
  } catch {
    res.status(404).send('Not found');
  }
});

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
// Express's http.Server is passed to WebSocketServer — WS upgrade handling unchanged
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const PING_INTERVAL = 30_000;

// ── Room state ───────────────────────────────────────────────────────────────
interface Peer { id: string; ws: WebSocket; name: string; }

interface TranscriptMessage {
  speaker: string;
  text: string;
  timestamp: string;
}

interface Room {
  peers: Peer[];
  password: string | null;
  hostId: string;
  transcript: TranscriptMessage[];  // accumulated during meeting
  dealId?: string;                  // BrandMonkz deal ID (set on room creation)
  launchosUserId?: string;          // for entitlement tracking
}

const rooms = new Map<string, Room>();

server.on('upgrade', (req) => {
  console.log(`WS upgrade: ${req.url} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
});

// ── WebSocket handler ────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const peerId = randomUUID();
  let currentRoom: string | null = null;
  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, PING_INTERVAL);
  const sendTo = (target: WebSocket, msg: Record<string, unknown>) => {
    if (target.readyState === WebSocket.OPEN) target.send(JSON.stringify(msg));
  };
  console.log(`WS connected [${peerId.slice(0, 8)}]. Total: ${wss.clients.size}`);

  ws.on('message', async (raw) => {
    let msg: { type: string; [key: string]: unknown };
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'join') {
      const roomCode = msg.room as string;
      const peerName = msg.name as string;
      const pwd = (msg.password as string) || null;
      let room = rooms.get(roomCode);
      if (room) {
        if (room.password && room.password !== pwd) { sendTo(ws, { type: 'error', message: 'Incorrect room password' }); return; }
        if (room.peers.length >= MAX_ROOM_SIZE) { sendTo(ws, { type: 'error', message: `Room is full (max ${MAX_ROOM_SIZE})` }); return; }
      } else {
        const dealId = (msg.dealId as string) || undefined;
        const launchosUserId = (msg.launchosUserId as string) || undefined;
        room = { peers: [], password: pwd, hostId: peerId, transcript: [], dealId, launchosUserId };
        rooms.set(roomCode, room);
      }
      currentRoom = roomCode;
      console.log(`[${peerId.slice(0, 8)}] joined room ${roomCode} as "${peerName}" (${room.peers.length + 1} peers)`);
      sendTo(ws, { type: 'joined', peerId, isHost: room.hostId === peerId, hasPassword: !!room.password, peers: room.peers.map(p => ({ id: p.id, name: p.name })) });
      for (const peer of room.peers) sendTo(peer.ws, { type: 'peer-joined', peerId, name: peerName });
      room.peers.push({ id: peerId, ws, name: peerName });
      return;
    }
    if (['offer', 'answer', 'ice-candidate'].includes(msg.type) && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const target = room.peers.find(p => p.id === msg.targetId);
      if (target) { const fwd = { ...msg, fromId: peerId } as Record<string, unknown>; delete fwd.targetId; sendTo(target.ws, fwd); }
      return;
    }
    if (msg.type === 'chat' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      const chatMsg = { type: 'chat', fromId: peerId, fromName: sender?.name || 'Unknown', text: (msg.text as string).slice(0, 2000), timestamp: Date.now() };
      for (const peer of room.peers) sendTo(peer.ws, chatMsg);
      return;
    }
    if (msg.type === 'transcript' && currentRoom) {
      // Client sends: { type: 'transcript', text: string, speaker: string }
      const room = rooms.get(currentRoom); if (!room) return;
      if (msg.text) {
        const sender = room.peers.find(p => p.id === peerId);
        room.transcript.push({
          speaker: (msg.speaker as string) || sender?.name || 'Unknown',
          text: (msg.text as string).slice(0, 5000),
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }
    if (msg.type === 'annotation' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      for (const peer of room.peers) { if (peer.ws !== ws) sendTo(peer.ws, { type: 'annotation', fromId: peerId, data: msg.data }); }
      return;
    }
    if (msg.type === 'set-password' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room || room.hostId !== peerId) return;
      room.password = (msg.password as string) || null;
      for (const peer of room.peers) sendTo(peer.ws, { type: 'room-updated', hasPassword: !!room.password });
      return;
    }
    if (msg.type === 'kick' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room || room.hostId !== peerId) return;
      const target = room.peers.find(p => p.id === msg.targetId as string);
      if (target) { sendTo(target.ws, { type: 'kicked' }); target.ws.close(); }
      return;
    }
    if (msg.type === 'hand-raise' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      for (const peer of room.peers) sendTo(peer.ws, { type: 'hand-raise', peerId, raised: !!msg.raised });
      return;
    }
    if (msg.type === 'screen-share' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      for (const peer of room.peers) sendTo(peer.ws, { type: 'screen-share', peerId, sharing: !!msg.sharing });
      return;
    }
    if (msg.type === 'reaction' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      for (const peer of room.peers) sendTo(peer.ws, { type: 'reaction', fromId: peerId, fromName: sender?.name || 'Unknown', emoji: (msg.emoji as string).slice(0, 4) });
      return;
    }
    if (msg.type === 'recording-start' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      console.log(`[${peerId.slice(0, 8)}] started recording in ${currentRoom}`);
      for (const peer of room.peers) {
        sendTo(peer.ws, {
          type: 'recording-start',
          recorderId: peerId,
          recorderName: sender?.name || 'Unknown',
          timestamp: Date.now(),
        });
      }
      return;
    }
    if (msg.type === 'recording-consent' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      for (const peer of room.peers) sendTo(peer.ws, { type: 'recording-consent', peerId, peerName: sender?.name || 'Unknown', consented: !!msg.consented });
      return;
    }
    if (msg.type === 'recording-stop' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room) return;
      console.log(`[${peerId.slice(0, 8)}] stopped recording in ${currentRoom}`);
      for (const peer of room.peers) sendTo(peer.ws, { type: 'recording-stop', recorderId: peerId });
      return;
    }
    if (msg.type === 'end-meeting' && currentRoom) {
      const room = rooms.get(currentRoom); if (!room || room.hostId !== peerId) return;
      for (const peer of room.peers) { sendTo(peer.ws, { type: 'meeting-ended' }); peer.ws.close(); }
      rooms.delete(currentRoom);
      console.log(`Room ${currentRoom} ended by host [${peerId.slice(0, 8)}]`);
      return;
    }
  });

  ws.on('close', () => {
    clearInterval(pingTimer);
    console.log(`WS disconnected [${peerId.slice(0, 8)}]. Total: ${wss.clients.size}`);
    if (!currentRoom) return;
    const room = rooms.get(currentRoom); if (!room) return;
    room.peers = room.peers.filter(p => p.id !== peerId);
    if (room.peers.length === 0) {
      // Capture transcript and dealId before deleting room
      const transcriptSnapshot = [...room.transcript];
      const dealId = room.dealId;
      // Clear transcript from memory immediately (PII protection)
      room.transcript = [];
      rooms.delete(currentRoom);
      console.log(`Room ${currentRoom} deleted (empty)`);

      // Fire async summary if transcript exists and dealId is set
      if (transcriptSnapshot.length > 0 && dealId) {
        const roomCode = currentRoom;
        setImmediate(async () => {
          try {
            const { summarizeMeeting } = await import('./services/meetingSummary.js');
            const summary = await summarizeMeeting(transcriptSnapshot);
            if (!summary) { console.log(`[meeting-summary] Empty summary for room ${roomCode}`); return; }
            const serviceToken = jwt.sign(
              { service: 'zietra-meet', iat: Math.floor(Date.now() / 1000) },
              process.env.LAUNCHOS_JWT_SECRET!,
              { expiresIn: '60s' },
            );
            const brandmonkzUrl = process.env.BRANDMONKZ_API_URL || 'https://brandmonkz.com';
            const resp = await fetch(
              `${brandmonkzUrl}/api/deals/${dealId}/meeting-notes`,
              {
                method: 'PATCH',
                headers: {
                  'x-launchos-token': serviceToken,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: summary, meeting_ended_at: new Date().toISOString() }),
              },
            );
            if (!resp.ok) {
              const body = await resp.text();
              console.error(`[meeting-summary] BrandMonkz returned ${resp.status}: ${body}`);
            } else {
              console.log(`[meeting-summary] Summary posted to deal ${dealId} (room ${roomCode})`);
            }
          } catch (err: any) {
            console.error('[meeting-summary] Failed:', err.message);
          }
        });
      }
    } else {
      if (room.hostId === peerId) {
        room.hostId = room.peers[0].id;
        sendTo(room.peers[0].ws, { type: 'host-transfer' });
        console.log(`Host transferred to [${room.peers[0].id.slice(0, 8)}] in ${currentRoom}`);
      }
      for (const peer of room.peers) sendTo(peer.ws, { type: 'peer-left', peerId });
    }
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
runMigrations()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Zietra Meet running at http://localhost:${PORT} (max ${MAX_ROOM_SIZE}/room)`);
    });
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
