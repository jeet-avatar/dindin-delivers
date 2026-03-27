# apps/dj-tools/tests/test_k2_bridge.py
"""Unit tests for k2_dj_bridge pure functions."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import struct
from k2_dj_bridge import build_osc_msg

def test_osc_address_padded_to_4_bytes():
    msg = build_osc_msg("/live/test")
    # Address "/live/test" = 10 chars + null = 11, padded to 12
    assert msg[:12] == b"/live/test\x00\x00"

def test_osc_no_args_type_tag():
    msg = build_osc_msg("/live/test")
    # type tag ",\x00\x00\x00" follows address
    assert b",\x00\x00\x00" in msg

def test_osc_int_arg_encoded_big_endian():
    msg = build_osc_msg("/x", 42)
    assert struct.pack(">i", 42) in msg

def test_osc_float_arg_encoded_big_endian():
    msg = build_osc_msg("/x", 0.5)
    assert struct.pack(">f", 0.5) in msg

def test_osc_string_arg_null_padded():
    msg = build_osc_msg("/x", "hello")
    assert b"hello\x00\x00\x00" in msg

def test_osc_multiple_args():
    msg = build_osc_msg("/live/clip_slot/fire", 0, 1)
    assert struct.pack(">i", 0) in msg
    assert struct.pack(">i", 1) in msg

def test_parse_osc_first_value_int_roundtrip():
    """build_osc_msg + _parse_osc_first_value should round-trip an int."""
    from k2_dj_bridge import _parse_osc_first_value
    msg = build_osc_msg("/live/song/get/num_tracks", 4)
    assert _parse_osc_first_value(msg) == 4

def test_parse_osc_first_value_float_roundtrip():
    from k2_dj_bridge import _parse_osc_first_value
    msg = build_osc_msg("/live/device/get/parameter/value", 0.5)
    result = _parse_osc_first_value(msg)
    assert abs(result - 0.5) < 0.001

def test_parse_osc_first_value_string_roundtrip():
    from k2_dj_bridge import _parse_osc_first_value
    msg = build_osc_msg("/live/track/get/name", "Deck 1")
    assert _parse_osc_first_value(msg) == "Deck 1"

# ── Encoder delta tests ───────────────────────────────────────────────────────
from k2_dj_bridge import encoder_delta

def test_encoder_clockwise_small():
    assert encoder_delta(65) == 1   # +1 step

def test_encoder_clockwise_fast():
    assert encoder_delta(127) == 63  # +63 steps

def test_encoder_counterclockwise_small():
    assert encoder_delta(63) == -1  # -1 step

def test_encoder_counterclockwise_fast():
    assert encoder_delta(0) == -64  # -64 steps

def test_encoder_no_movement():
    assert encoder_delta(64) == 0   # center = no movement

# ── MIDI normalization tests ──────────────────────────────────────────────────
from k2_dj_bridge import midi_to_norm

def test_midi_zero_maps_to_zero():
    assert midi_to_norm(0) == 0.0

def test_midi_127_maps_to_one():
    assert abs(midi_to_norm(127) - 1.0) < 0.01

def test_midi_64_maps_to_half():
    assert abs(midi_to_norm(64) - 0.504) < 0.01
