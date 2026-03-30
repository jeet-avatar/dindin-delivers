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
