"""Generate spoken-word vocals using Piper TTS (open-source, runs on CPU)."""

import json
import os
import subprocess
import uuid
import wave
from datetime import datetime, timezone
from pathlib import Path

VOICE_DIR = Path(os.getenv("BEATMIND_VOICE_DIR", "/opt/beatmind-voices"))
RECORDINGS_DIR = Path(os.getenv("BEATMIND_RECORDINGS_DIR", "/tmp/beatmind-recordings"))

_voice = None


def _load_voice():
    global _voice
    if _voice is not None:
        return _voice
    model = next(VOICE_DIR.glob("*.onnx"), None)
    if not model or model.name.endswith(".json"):
        candidates = [p for p in VOICE_DIR.glob("*.onnx") if not p.name.endswith(".json")]
        model = candidates[0] if candidates else None
    if not model:
        return None
    from piper import PiperVoice
    _voice = PiperVoice.load(str(model), str(model) + ".json")
    return _voice


def generate(text: str, user_id: int, speed: float = 1.0) -> dict:
    voice = _load_voice()
    if not voice:
        return {"status": "failed", "error": "No voice model installed. Voice generation is not available."}

    RECORDINGS_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    recording_id = uuid.uuid4().hex
    wav_path = RECORDINGS_DIR / f"{recording_id}.wav"
    m4a_path = RECORDINGS_DIR / f"{recording_id}.m4a"

    with wave.open(str(wav_path), "wb") as wav_file:
        voice.synthesize(text, wav_file, length_scale=1.0 / max(0.5, min(2.0, speed)))

    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), "-c:a", "aac", "-b:a", "128k", str(m4a_path)],
        capture_output=True, timeout=30,
    )
    wav_path.unlink(missing_ok=True)

    if result.returncode != 0 or not m4a_path.is_file():
        return {"status": "failed", "error": "Audio conversion failed."}

    duration = 0.0
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", str(m4a_path)],
            capture_output=True, text=True, timeout=10,
        )
        duration = float(json.loads(probe.stdout)["format"]["duration"])
    except Exception:
        pass

    file_size = m4a_path.stat().st_size
    peak = -6.0
    try:
        vol = subprocess.run(
            ["ffmpeg", "-i", str(m4a_path), "-af", "volumedetect", "-f", "null", "-"],
            capture_output=True, text=True, timeout=10,
        )
        for line in vol.stderr.splitlines():
            if "max_volume" in line:
                peak = float(line.split("max_volume:")[1].strip().split()[0])
                break
    except Exception:
        pass

    metadata = {
        "id": recording_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "track_name": "Voice",
        "track": -1,
        "scene": -1,
        "metrics": {"duration_s": round(duration, 1), "peak_dbfs": round(peak, 1), "file_bytes": file_size},
        "source": "Piper TTS",
        "decision": "pending",
        "kind": "voice",
        "text": text[:500],
    }
    (RECORDINGS_DIR / f"{recording_id}.json").write_text(json.dumps(metadata))

    truncated = text[:60] + "..." if len(text) > 60 else text
    return {
        "status": "verified",
        "recording": metadata,
        "summary": f'Generated {round(duration, 1)}s spoken vocal: "{truncated}"',
    }
