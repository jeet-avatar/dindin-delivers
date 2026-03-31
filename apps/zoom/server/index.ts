import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001');
const STATIC_DIR = join(__dirname, '..', 'frontend', 'dist');

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// HTTP server — serves the built frontend
const server = createServer((req, res) => {
  let filePath = join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url!);

  if (!existsSync(filePath)) {
    filePath = join(STATIC_DIR, 'index.html'); // SPA fallback
  }

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket signaling on /ws path
const wss = new WebSocketServer({ server, path: '/ws' });

// Log upgrade attempts
server.on('upgrade', (req) => {
  console.log(`WS upgrade: ${req.url} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
});

const rooms = new Map<string, { ws: WebSocket; name: string }[]>();

// Heartbeat to keep ALB from killing idle connections
const PING_INTERVAL = 30_000;

wss.on('connection', (ws) => {
  console.log(`WS connected. Total clients: ${wss.clients.size}`);
  let currentRoom: string | null = null;
  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, PING_INTERVAL);
  ws.on('message', (raw) => {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    console.log(`WS msg: ${msg.type} ${msg.type === 'join' ? `room=${msg.room} name=${msg.name}` : ''}`);

    if (msg.type === 'join') {
      const room = msg.room as string;
      const name = msg.name as string;
      currentRoom = room;

      if (!rooms.has(room)) rooms.set(room, []);
      const peers = rooms.get(room)!;

      if (peers.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }

      peers.push({ ws, name });

      for (const peer of peers) {
        if (peer.ws !== ws) {
          peer.ws.send(JSON.stringify({ type: 'peer-joined', name }));
          ws.send(JSON.stringify({ type: 'peer-joined', name: peer.name }));
        }
      }
      return;
    }

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
    clearInterval(pingTimer);
    console.log(`WS disconnected. Total clients: ${wss.clients.size}`);
    if (!currentRoom) return;
    const peers = rooms.get(currentRoom);
    if (!peers) return;

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

server.listen(PORT, () => {
  console.log(`Zietra Meet running at http://localhost:${PORT}`);
});
