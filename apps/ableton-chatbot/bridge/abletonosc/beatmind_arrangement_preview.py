"""Checked playback start marker for Arrangement auditions; no replay tools."""
import math


def register(handler, app):
    def get_start(params):
        return (float(handler.song.start_time),)

    def set_start(params):
        value = float(params[0])
        if not math.isfinite(value) or not 0 <= value <= 32768:
            raise ValueError("Invalid Arrangement start marker")
        if handler.song.is_playing or handler.song.record_mode or handler.song.session_record:
            raise ValueError("Stop playback and recording before moving the start marker")
        handler.song.start_time = value
        return (float(handler.song.start_time),)

    handler.osc_server.add_handler("/live/beatmind/get/arrangement_start", get_start)
    handler.osc_server.add_handler("/live/beatmind/set/arrangement_start", set_start)
