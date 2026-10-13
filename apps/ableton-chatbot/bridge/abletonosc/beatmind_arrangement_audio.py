"""Identity-checked transport for recording a real Arrangement section."""

import math


def execute(song, data, set_id):
    if data.get("set_id") != set_id:
        raise ValueError("Live Set changed during the preview. Stop and inspect the current project.")
    def state():
        return {"status": "observed", "set_id": set_id, "start": float(song.start_time),
                "position": float(song.current_song_time), "loop": bool(song.loop),
                "is_playing": bool(song.is_playing), "recording": bool(song.record_mode or song.session_record),
                "session_override": bool(song.back_to_arranger), "solo": any(t.solo for t in song.tracks),
                "bpm": float(song.tempo)}
    if data["action"] == "preview_state":
        return state()
    if song.is_playing or song.record_mode or song.session_record:
        raise ValueError("Stop playback and recording before changing the preview position.")
    if data["action"] == "preview_start":
        beat = data.get("beat")
        if type(beat) not in (int, float) or not math.isfinite(beat) or not 0 <= beat < song.song_length:
            raise ValueError("The requested preview position is outside the Arrangement.")
        if song.back_to_arranger or any(t.solo for t in song.tracks):
            raise ValueError("Return to Arrangement playback and clear solos before recording the full section.")
        song.loop = False
        song.start_time = float(beat)
        song.start_playing()
        return {"status": "observed", "summary": "Playback requested. The Bridge must verify its actual position."}
    if data["action"] == "preview_restore":
        if any(type(data.get(k)) not in (int, float) or not math.isfinite(data[k]) or data[k] < 0
               for k in ("start", "position")) or type(data.get("loop")) is not bool:
            raise ValueError("Invalid transport restoration state.")
        song.start_time = float(data["start"])
        song.current_song_time = float(data["position"])
        song.loop = data["loop"]
        return {"status": "observed", "summary": "Transport restoration sent; readback is required."}
    raise ValueError("Unknown Arrangement preview operation.")
