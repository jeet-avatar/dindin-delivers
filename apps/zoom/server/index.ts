import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001');
const STATIC_DIR = join(__dirname, '..', 'frontend', 'dist');
const MAX_ROOM_SIZE = 8;

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

interface Peer {
  id: string;
  ws: WebSocket;
  name: string;
}

interface Room {
  peers: Peer[];
  password: string | null;
  hostId: string;
}

const rooms = new Map<string, Room>();

const server = createServer((req, res) => {
  let filePath = join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url!);
  if (!existsSync(filePath)) filePath = join(STATIC_DIR, 'index.html');
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });
const PING_INTERVAL = 30_000;

server.on('upgrade', (req) => {
  console.log(`WS upgrade: ${req.url} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
});

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
        if (room.password && room.password !== pwd) {
          sendTo(ws, { type: 'error', message: 'Incorrect room password' });
          return;
        }
        if (room.peers.length >= MAX_ROOM_SIZE) {
          sendTo(ws, { type: 'error', message: `Room is full (max ${MAX_ROOM_SIZE})` });
          return;
        }
      } else {
        room = { peers: [], password: pwd, hostId: peerId };
        rooms.set(roomCode, room);
      }

      currentRoom = roomCode;
      console.log(`[${peerId.slice(0, 8)}] joined room ${roomCode} as "${peerName}" (${room.peers.length + 1} peers)`);

      // Tell joiner about existing peers
      sendTo(ws, {
        type: 'joined',
        peerId,
        isHost: room.hostId === peerId,
        hasPassword: !!room.password,
        peers: room.peers.map(p => ({ id: p.id, name: p.name })),
      });

      // Tell existing peers about new joiner
      for (const peer of room.peers) {
        sendTo(peer.ws, { type: 'peer-joined', peerId, name: peerName });
      }

      room.peers.push({ id: peerId, ws, name: peerName });
      return;
    }

    // Signaling — route to specific peer
    if (['offer', 'answer', 'ice-candidate'].includes(msg.type) && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;
      const target = room.peers.find(p => p.id === msg.targetId);
      if (target) {
        const forwarded = { ...msg, fromId: peerId } as Record<string, unknown>;
        delete forwarded.targetId;
        sendTo(target.ws, forwarded);
      }
      return;
    }

    // Chat — broadcast to all in room
    if (msg.type === 'chat' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      const chatMsg = {
        type: 'chat',
        fromId: peerId,
        fromName: sender?.name || 'Unknown',
        text: (msg.text as string).slice(0, 2000),
        timestamp: Date.now(),
      };
      for (const peer of room.peers) sendTo(peer.ws, chatMsg);
      return;
    }

    // Annotations — broadcast to others
    if (msg.type === 'annotation' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;
      for (const peer of room.peers) {
        if (peer.ws !== ws) {
          sendTo(peer.ws, { type: 'annotation', fromId: peerId, data: msg.data });
        }
      }
      return;
    }

    // Set room password (host only)
    if (msg.type === 'set-password' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room || room.hostId !== peerId) return;
      room.password = (msg.password as string) || null;
      for (const peer of room.peers) {
        sendTo(peer.ws, { type: 'room-updated', hasPassword: !!room.password });
      }
      return;
    }

    // Kick peer (host only)
    if (msg.type === 'kick' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room || room.hostId !== peerId) return;
      const targetId = msg.targetId as string;
      const target = room.peers.find(p => p.id === targetId);
      if (target) {
        sendTo(target.ws, { type: 'kicked' });
        target.ws.close();
      }
      return;
    }

    // Raise hand — broadcast to all
    if (msg.type === 'hand-raise' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;
      for (const peer of room.peers) {
        sendTo(peer.ws, { type: 'hand-raise', peerId, raised: !!msg.raised });
      }
      return;
    }

    // Emoji reaction — broadcast to all
    if (msg.type === 'reaction' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      for (const peer of room.peers) {
        sendTo(peer.ws, {
          type: 'reaction',
          fromId: peerId,
          fromName: sender?.name || 'Unknown',
          emoji: (msg.emoji as string).slice(0, 4),
        });
      }
      return;
    }

    // Recording state — broadcast to all
    if (msg.type === 'recording-start' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;
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
      const room = rooms.get(currentRoom);
      if (!room) return;
      const sender = room.peers.find(p => p.id === peerId);
      for (const peer of room.peers) {
        sendTo(peer.ws, {
          type: 'recording-consent',
          peerId,
          peerName: sender?.name || 'Unknown',
          consented: !!msg.consented,
        });
      }
      return;
    }

    if (msg.type === 'recording-stop' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room) return;
      console.log(`[${peerId.slice(0, 8)}] stopped recording in ${currentRoom}`);
      for (const peer of room.peers) {
        sendTo(peer.ws, { type: 'recording-stop', recorderId: peerId });
      }
      return;
    }

    // End meeting for all (host only)
    if (msg.type === 'end-meeting' && currentRoom) {
      const room = rooms.get(currentRoom);
      if (!room || room.hostId !== peerId) return;
      for (const peer of room.peers) {
        sendTo(peer.ws, { type: 'meeting-ended' });
        peer.ws.close();
      }
      rooms.delete(currentRoom);
      console.log(`Room ${currentRoom} ended by host [${peerId.slice(0, 8)}]`);
      return;
    }
  });

  ws.on('close', () => {
    clearInterval(pingTimer);
    console.log(`WS disconnected [${peerId.slice(0, 8)}]. Total: ${wss.clients.size}`);
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.peers = room.peers.filter(p => p.id !== peerId);

    if (room.peers.length === 0) {
      rooms.delete(currentRoom);
      console.log(`Room ${currentRoom} deleted (empty)`);
    } else {
      if (room.hostId === peerId) {
        room.hostId = room.peers[0].id;
        sendTo(room.peers[0].ws, { type: 'host-transfer' });
        console.log(`Host transferred to [${room.peers[0].id.slice(0, 8)}] in ${currentRoom}`);
      }
      for (const peer of room.peers) {
        sendTo(peer.ws, { type: 'peer-left', peerId });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Zietra Meet running at http://localhost:${PORT} (max ${MAX_ROOM_SIZE}/room)`);
});
