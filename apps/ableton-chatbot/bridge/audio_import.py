"""Decode a base64 WAV and place it on a new Ableton audio track."""

import base64
import tempfile
from pathlib import Path


async def import_audio_file(bridge, wav_b64, track_name="Voice", recording_id=None):
    steps = []

    async def query(address, args, timeout=5):
        result = await bridge._query_osc("audio-import", address, args, timeout)
        steps.append({"number": len(steps) + 1, "address": address, "status": result.get("status")})
        if result.get("status") != "ok":
            raise RuntimeError(f"Ableton did not confirm {address}.")
        return result["args"]

    try:
        if not wav_b64:
            raise RuntimeError("No audio data received.")

        tmp = Path(tempfile.gettempdir()) / f"beatmind_vocal_{recording_id or 'clip'}.wav"
        tmp.write_bytes(base64.b64decode(wav_b64))

        if "stem_import_v1" not in await query("/live/song/beatmind_stem_capabilities", []):
            raise RuntimeError("Audio import needs Ableton Live 12 and the updated BeatMind extension.")

        before = await query("/live/song/get/track_names", [])
        result = await query("/live/song/beatmind_import_stems", ["Vocal", str(tmp), track_name], timeout=15)
        if result[0] != "imported":
            raise RuntimeError(result[-1] if len(result) > 1 else "Ableton did not import the audio.")

        after = await query("/live/song/get/track_names", [])
        added = after[len(before):]

        tmp.unlink(missing_ok=True)

        return {"status": "verified",
                "summary": f'Placed vocal "{track_name}" on a new audio track in Ableton.',
                "tracks": added, "steps": steps}
    except Exception as error:
        return {"status": "failed", "error": str(error), "summary": str(error), "steps": steps}
