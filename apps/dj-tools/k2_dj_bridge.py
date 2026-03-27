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
