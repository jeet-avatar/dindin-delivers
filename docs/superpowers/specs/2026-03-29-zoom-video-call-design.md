# Simple 2-Way Video Call + Screen Share

**Date:** 2026-03-29
**Location:** `apps/zoom/`
**Status:** Approved

## Overview

A standalone, minimal Zoom-like app. Two people join a room, see/hear each other, and can share their screen. No auth, no database, no accounts.

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + TypeScript (Vite) | Single-page UI |
| Signaling | Node.js + `ws` library | Relay WebRTC offers/answers/ICE candidates |
| Media | Browser WebRTC APIs | Peer-to-peer audio, video, screen share |

## Architecture

```
┌──────────┐    WebSocket     ┌──────────────────┐    WebSocket     ┌──────────┐
│  User A  │ ◄──────────────► │ Signaling Server │ ◄──────────────► │  User B  │
│ (browser)│                  │  (Node.js :3001)  │                  │ (browser)│
└──────────┘                  └──────────────────┘                  └──────────┘
      ▲                                                                   ▲
      │                    WebRTC peer-to-peer                            │
      └───────────────── audio / video / screen ─────────────────────────┘
```

The signaling server only exchanges connection metadata. All media flows directly between browsers via WebRTC.

## User Flow

1. User opens `http://localhost:5173`
2. Enters their name and a room code (or generates one)
3. Clicks "Join" — browser requests camera + mic permission
4. Signaling server pairs them with the other participant in that room
5. WebRTC connection established — live video/audio begins
6. Either user can click "Share Screen" to replace their video with screen capture
7. Click "End Call" to disconnect

## UI Layout

### Join Screen
- Input: Display name
- Input: Room code (with "Generate" button for random code)
- Button: "Join Room"

### Call Screen
- **Center:** Remote participant video (large)
- **Corner (bottom-right):** Local video (small, picture-in-picture style)
- **Bottom bar:** Mute Mic | Mute Cam | Share Screen | End Call
- **Top:** Room code display (so user can share it)

## Project Structure

```
apps/zoom/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── JoinScreen.tsx      # Name + room code form
│       │   ├── CallScreen.tsx      # Video display + controls
│       │   └── ControlBar.tsx      # Mic/Cam/Screen/End buttons
│       ├── hooks/
│       │   └── useWebRTC.ts        # WebRTC + signaling logic
│       └── styles/
│           └── app.css             # Dark theme, minimal
└── server/
    ├── package.json
    └── index.ts                    # WebSocket signaling (~50 lines)
```

## Signaling Protocol

Messages are JSON over WebSocket:

| Message | Direction | Payload |
|---------|-----------|---------|
| `join` | Client → Server | `{ room, name }` |
| `peer-joined` | Server → Client | `{ name }` |
| `offer` | Client → Server → Client | `{ sdp }` |
| `answer` | Client → Server → Client | `{ sdp }` |
| `ice-candidate` | Client → Server → Client | `{ candidate }` |
| `peer-left` | Server → Client | `{}` |

Server holds a map of `room → [socket, socket]`. Max 2 per room.

## WebRTC Flow

1. Peer A joins room first — waits
2. Peer B joins — server sends `peer-joined` to both
3. Peer A creates RTCPeerConnection, adds local tracks, creates offer → sends via signaling
4. Peer B receives offer, sets remote description, creates answer → sends back
5. Both exchange ICE candidates via signaling
6. Connection established — media flows peer-to-peer

## Screen Share

- Click "Share Screen" calls `navigator.mediaDevices.getDisplayMedia()`
- Replace the video track on the existing RTCPeerConnection with the screen track
- When user stops sharing (browser UI or button), swap back to camera track
- No renegotiation needed — `RTCRtpSender.replaceTrack()` handles it

## Constraints

- **2 participants max** per room — no SFU/MCU needed
- **No recording** — live only
- **No chat** — voice + video + screen share only
- **No persistence** — room exists only while participants are connected
- **STUN only** — use Google's public STUN server (`stun:stun.l.google.com:19302`). No TURN server (works on same network / most NATs)

## How to Run

```bash
# Terminal 1: Signaling server
cd apps/zoom/server && npm install && npm start
# Runs on ws://localhost:3001

# Terminal 2: Frontend
cd apps/zoom/frontend && npm install && npm run dev
# Opens http://localhost:5173
```
