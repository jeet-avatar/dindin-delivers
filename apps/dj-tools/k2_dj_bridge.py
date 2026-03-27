"""
K2 DJ Bridge — bridges Xone K2 MIDI controller to Ableton Live 12 via AbletonOSC.

Usage:
    pip install mido python-rtmidi
    python k2_dj_bridge.py

Requires:
    - Ableton Live 12 open with AbletonOSC enabled (Preferences → MIDI → Control Surface)
    - Xone K2 connected via USB on Layer A
    - Deck 1 and Deck 2 audio tracks with Auto Filter as first device
"""

import socket
import struct
import time
import threading
import queue
import logging

log = logging.getLogger("k2_bridge")
logging.basicConfig(level=logging.INFO, format="[K2 Bridge] %(message)s")

# ── Config ────────────────────────────────────────────────────────────────────

CONFIG = {
    "deck1_name": "Deck 1",
    "deck2_name": "Deck 2",
    "reverb_return": 0,
    "delay_return": 1,
    "hpf_param_index": 1,       # Auto Filter: 0=Device On, 1=Frequency
    "hpf_min_norm": 0.0,        # 20Hz fully open (verified: value 0.0 = 20Hz)
    "hpf_max_norm": 0.667,      # ~2000Hz (verified: logarithmic scale, 20 * 1000^value)
    "enc_sensitivity": 0.01,
    "osc_send_port": 11000,
    "osc_recv_port": 11001,
    "osc_host": "127.0.0.1",
}

# ── State ─────────────────────────────────────────────────────────────────────

state = {
    "deck1_track": 0,
    "deck2_track": 1,
    "deck1_clips": 4,
    "deck2_clips": 4,
    "deck1_hpf_freq": 0.0,
    "deck2_hpf_freq": 0.0,
}

# ── OSC Helpers ───────────────────────────────────────────────────────────────

def _pad4(data: bytes) -> bytes:
    """Pad bytes to next 4-byte boundary."""
    remainder = len(data) % 4
    return data + b"\x00" * ((4 - remainder) % 4)


def build_osc_msg(address: str, *args) -> bytes:
    """Build a raw OSC message from address and typed arguments."""
    msg = _pad4(address.encode() + b"\x00")
    type_tag = ","
    payload = b""
    for arg in args:
        if isinstance(arg, int):
            type_tag += "i"
            payload += struct.pack(">i", arg)
        elif isinstance(arg, float):
            type_tag += "f"
            payload += struct.pack(">f", arg)
        elif isinstance(arg, str):
            type_tag += "s"
            payload += _pad4(arg.encode() + b"\x00")
    msg += _pad4(type_tag.encode() + b"\x00")
    msg += payload
    return msg


_osc_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
_osc_recv_sock = None
_osc_response_queue: queue.Queue = queue.Queue()


def _start_osc_listener():
    """Start background thread to receive OSC responses on port 11001."""
    global _osc_recv_sock
    _osc_recv_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    _osc_recv_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    _osc_recv_sock.bind((CONFIG["osc_host"], CONFIG["osc_recv_port"]))
    _osc_recv_sock.settimeout(0.1)

    def _listen():
        while True:
            try:
                data, _ = _osc_recv_sock.recvfrom(4096)
                _osc_response_queue.put(data)
            except socket.timeout:
                continue
            except Exception:
                break

    t = threading.Thread(target=_listen, daemon=True)
    t.start()


def send_osc(address: str, *args):
    """Fire-and-forget OSC command."""
    msg = build_osc_msg(address, *args)
    _osc_sock.sendto(msg, (CONFIG["osc_host"], CONFIG["osc_send_port"]))


def await_osc(address: str, *args, timeout: float = 2.0):
    """Send OSC command and wait for response. Returns parsed first value or None."""
    # Clear stale responses
    while not _osc_response_queue.empty():
        _osc_response_queue.get_nowait()

    send_osc(address, *args)

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            data = _osc_response_queue.get(timeout=0.1)
            return _parse_osc_first_value(data)
        except queue.Empty:
            continue
    log.warning(f"OSC timeout waiting for response to {address}")
    return None


def _parse_osc_first_value(data: bytes):
    """Parse the first value from an OSC response message."""
    try:
        # Find type tag (starts with ',')
        idx = data.index(b",")
        type_tag = data[idx:].split(b"\x00")[0].decode()
        # Skip past address + type tag (both padded to 4 bytes)
        addr_end = data.index(b"\x00")
        addr_padded = ((addr_end // 4) + 1) * 4
        tag_raw = data[addr_padded:]
        tag_end = tag_raw.index(b"\x00")
        tag_padded = ((tag_end // 4) + 1) * 4
        payload = tag_raw[tag_padded:]

        if len(type_tag) < 2:
            return None
        first_type = type_tag[1]
        if first_type == "i":
            return struct.unpack(">i", payload[:4])[0]
        elif first_type == "f":
            return struct.unpack(">f", payload[:4])[0]
        elif first_type == "s":
            return payload.split(b"\x00")[0].decode("utf-8", errors="ignore")
    except Exception:
        return None
