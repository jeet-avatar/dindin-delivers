"""
Ableton Chat Bridge — Local agent that relays between cloud backend and AbletonOSC.

Install on user's machine. Connects to:
  1. AbletonOSC (UDP localhost:11000) — controls Ableton Live
  2. Cloud backend (WebSocket) — receives commands from the chatbot

Usage:
    python bridge.py --server wss://your-server.com/ws/bridge --token YOUR_TOKEN
"""

import argparse
import asyncio
import json
import logging
import signal
import struct
import sys
import time
from dataclasses import dataclass

import websockets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("bridge")

# AbletonOSC defaults
OSC_HOST = "127.0.0.1"
OSC_SEND_PORT = 11000
OSC_RECV_PORT = 11001


# --- OSC Protocol Helpers ---

def osc_string(s: str) -> bytes:
    """Encode a string as OSC string (null-terminated, padded to 4-byte boundary)."""
    encoded = s.encode("utf-8") + b"\x00"
    padding = (4 - len(encoded) % 4) % 4
    return encoded + b"\x00" * padding


def osc_int(i: int) -> bytes:
    return struct.pack(">i", i)


def osc_float(f: float) -> bytes:
    return struct.pack(">f", f)


def build_osc_message(address: str, args: list) -> bytes:
    """Build an OSC message from address and typed arguments."""
    msg = osc_string(address)
    type_tag = ","
    arg_data = b""
    for arg in args:
        if isinstance(arg, int):
            type_tag += "i"
            arg_data += osc_int(arg)
        elif isinstance(arg, float):
            type_tag += "f"
            arg_data += osc_float(arg)
        elif isinstance(arg, str):
            type_tag += "s"
            arg_data += osc_string(arg)
        else:
            raise ValueError(f"Unsupported OSC arg type: {type(arg)}")
    msg += osc_string(type_tag) + arg_data
    return msg


def parse_osc_message(data: bytes) -> tuple[str, list]:
    """Parse raw OSC bytes into (address, args)."""
    # Parse address
    end = data.index(b"\x00")
    address = data[:end].decode("utf-8")
    offset = end + 1
    offset += (4 - offset % 4) % 4

    # Parse type tag
    if offset >= len(data) or data[offset:offset + 1] != b",":
        return address, []
    tag_end = data.index(b"\x00", offset)
    type_tag = data[offset + 1:tag_end].decode("utf-8")
    offset = tag_end + 1
    offset += (4 - offset % 4) % 4

    # Parse arguments
    args = []
    for t in type_tag:
        if t == "i":
            args.append(struct.unpack(">i", data[offset:offset + 4])[0])
            offset += 4
        elif t == "f":
            args.append(struct.unpack(">f", data[offset:offset + 4])[0])
            offset += 4
        elif t == "s":
            s_end = data.index(b"\x00", offset)
            args.append(data[offset:s_end].decode("utf-8"))
            offset = s_end + 1
            offset += (4 - offset % 4) % 4
    return address, args


@dataclass
class PendingQuery:
    """Tracks a pending OSC query waiting for response."""
    request_id: str
    address: str
    future: asyncio.Future
    created_at: float


class AbletonBridge:
    """Bridges WebSocket commands to AbletonOSC UDP."""

    def __init__(self, server_url: str, token: str):
        self.server_url = server_url
        self.token = token
        self.ws = None
        self.udp_transport = None
        self.pending_queries: dict[str, PendingQuery] = {}
        self.running = False
        self._recv_protocol = None

    async def start(self):
        """Start the bridge — connect to both WebSocket and UDP."""
        self.running = True
        log.info("Starting Ableton Chat Bridge...")

        # Start UDP listener for OSC responses
        loop = asyncio.get_event_loop()
        self._recv_protocol = OscReceiveProtocol(self)
        transport, _ = await loop.create_datagram_endpoint(
            lambda: self._recv_protocol,
            local_addr=(OSC_HOST, OSC_RECV_PORT),
        )
        self.udp_transport = transport
        log.info(f"Listening for OSC responses on {OSC_HOST}:{OSC_RECV_PORT}")

        # Connect to cloud backend WebSocket
        while self.running:
            try:
                await self._connect_websocket()
            except (websockets.ConnectionClosed, ConnectionRefusedError, OSError) as e:
                log.warning(f"WebSocket disconnected: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def _connect_websocket(self):
        """Connect to backend WebSocket and handle messages."""
        url = f"{self.server_url}?token={self.token}"
        log.info(f"Connecting to backend: {self.server_url}")

        async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
            self.ws = ws
            log.info("Connected to backend!")

            # Send capabilities/status
            await ws.send(json.dumps({
                "type": "bridge_hello",
                "version": "1.0.0",
                "ableton_osc": {"host": OSC_HOST, "port": OSC_SEND_PORT},
            }))

            async for message in ws:
                await self._handle_ws_message(message)

    async def _handle_ws_message(self, raw: str):
        """Handle a command from the backend."""
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            log.error(f"Invalid JSON from backend: {raw[:100]}")
            return

        msg_type = msg.get("type")
        request_id = msg.get("request_id", "unknown")

        if msg_type == "osc_send":
            # Fire-and-forget OSC message (no response expected)
            address = msg["address"]
            args = msg.get("args", [])
            self._send_osc(address, args)
            await self._reply(request_id, {"status": "sent"})

        elif msg_type == "osc_query":
            # OSC query — wait for response from Ableton
            address = msg["address"]
            args = msg.get("args", [])
            timeout = msg.get("timeout", 5.0)
            result = await self._query_osc(request_id, address, args, timeout)
            await self._reply(request_id, result)

        elif msg_type == "ping":
            await self._reply(request_id, {"status": "pong"})

        elif msg_type == "batch":
            # Execute multiple OSC commands in sequence
            results = []
            for cmd in msg.get("commands", []):
                address = cmd["address"]
                args = cmd.get("args", [])
                if cmd.get("query", False):
                    result = await self._query_osc(
                        f"{request_id}_{len(results)}", address, args, cmd.get("timeout", 5.0)
                    )
                else:
                    self._send_osc(address, args)
                    result = {"status": "sent"}
                results.append(result)
                # Small delay between commands for Ableton stability
                delay = cmd.get("delay", 0.008)
                if delay > 0:
                    await asyncio.sleep(delay)
            await self._reply(request_id, {"results": results})

        else:
            log.warning(f"Unknown message type: {msg_type}")
            await self._reply(request_id, {"error": f"unknown type: {msg_type}"})

    def _send_osc(self, address: str, args: list):
        """Send an OSC message to Ableton (fire-and-forget)."""
        # Cast args to proper types based on convention
        typed_args = self._cast_args(args)
        data = build_osc_message(address, typed_args)
        sock = self.udp_transport.get_extra_info("socket")
        # Send to Ableton's OSC port
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.sendto(data, (OSC_HOST, OSC_SEND_PORT))
        s.close()
        log.debug(f"OSC → {address} {typed_args}")

    async def _query_osc(self, request_id: str, address: str, args: list, timeout: float) -> dict:
        """Send OSC query and wait for response."""
        loop = asyncio.get_event_loop()
        future = loop.create_future()

        # Map the expected response address
        # AbletonOSC echoes back on the same address for queries
        response_addr = address.replace("/get/", "/get/").replace("/set/", "/get/")

        self.pending_queries[address] = PendingQuery(
            request_id=request_id,
            address=address,
            future=future,
            created_at=time.time(),
        )

        self._send_osc(address, args)

        try:
            result = await asyncio.wait_for(future, timeout=timeout)
            return {"status": "ok", "address": result[0], "args": result[1]}
        except asyncio.TimeoutError:
            self.pending_queries.pop(address, None)
            return {"status": "timeout", "address": address}

    def handle_osc_response(self, address: str, args: list):
        """Called when we receive an OSC message from Ableton."""
        # Check if any pending query matches this response
        if address in self.pending_queries:
            pq = self.pending_queries.pop(address)
            if not pq.future.done():
                pq.future.set_result((address, args))
            return

        # Also check for /get/ variations
        for key, pq in list(self.pending_queries.items()):
            if address.startswith(key.rsplit("/", 1)[0]):
                self.pending_queries.pop(key, None)
                if not pq.future.done():
                    pq.future.set_result((address, args))
                return

        log.debug(f"OSC ← {address} {args} (no pending query)")

    async def _reply(self, request_id: str, data: dict):
        """Send a response back to the backend."""
        if self.ws:
            response = {"request_id": request_id, **data}
            await self.ws.send(json.dumps(response))

    @staticmethod
    def _cast_args(args: list) -> list:
        """Cast JSON args to proper Python types for OSC encoding."""
        typed = []
        for a in args:
            if isinstance(a, bool):
                typed.append(int(a))
            elif isinstance(a, int):
                typed.append(a)
            elif isinstance(a, float):
                typed.append(a)
            elif isinstance(a, str):
                typed.append(a)
            else:
                typed.append(str(a))
        return typed

    async def stop(self):
        self.running = False
        if self.ws:
            await self.ws.close()
        if self.udp_transport:
            self.udp_transport.close()
        log.info("Bridge stopped.")


class OscReceiveProtocol(asyncio.DatagramProtocol):
    """Receives UDP responses from AbletonOSC."""

    def __init__(self, bridge: AbletonBridge):
        self.bridge = bridge

    def datagram_received(self, data: bytes, addr: tuple):
        try:
            address, args = parse_osc_message(data)
            # Convert float args to Python-friendly format
            clean_args = []
            for a in args:
                if isinstance(a, float):
                    clean_args.append(round(a, 6))
                else:
                    clean_args.append(a)
            self.bridge.handle_osc_response(address, clean_args)
        except Exception as e:
            log.error(f"Failed to parse OSC response: {e}")

    def error_received(self, exc):
        log.error(f"UDP error: {exc}")


async def main(args):
    bridge = AbletonBridge(server_url=args.server, token=args.token)

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(bridge.stop()))

    await bridge.start()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ableton Chat Bridge")
    parser.add_argument("--server", required=True, help="WebSocket URL of the backend (e.g., wss://api.example.com/ws/bridge)")
    parser.add_argument("--token", required=True, help="Authentication token for this session")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger("bridge").setLevel(logging.DEBUG)

    asyncio.run(main(args))
