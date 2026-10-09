"""Bind fader edits and fresh auditions to the exact recorded sample."""
import asyncio
import hashlib
import json
from pathlib import Path
from audio_preview import capture_part


async def require_awake_display():
    process = await asyncio.create_subprocess_exec(
        "/usr/sbin/system_profiler", "SPDisplaysDataType", "-json",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        output, _ = await asyncio.wait_for(process.communicate(), 8)
    except asyncio.TimeoutError:
        process.kill()
        await process.communicate()
        raise ValueError("Display readiness check timed out. No fader was changed.")
    if process.returncode:
        raise ValueError("Display readiness could not be checked. No fader was changed.")
    displays = [display for gpu in json.loads(output).get("SPDisplaysDataType", []) for display in gpu.get("spdisplays_ndrvs", [])]
    if not any(display.get("spdisplays_online") == "spdisplays_yes" and display.get("spdisplays_asleep") != "spdisplays_yes" for display in displays):
        raise ValueError("Wake and unlock the Mac, and leave Ableton visible before recording. No fader was changed.")


async def mixer_preview(bridge, operation, data):
    async def call(payload):
        response = await bridge._query_osc("mixer", "/live/beatmind/mixer", [json.dumps(payload)], 4)
        if response.get("status") != "ok" or len(response.get("args", [])) != 1:
            raise ValueError("The fader mapping extension is unavailable. Reload AbletonOSC before adjusting.")
        result = json.loads(response["args"][0])
        if result.get("status") not in {"observed", "verified"}:
            raise ValueError(result.get("summary", "Fader mapping failed."))
        return result

    changed = False
    try:
        current = await call({"track": data["track"]})
        if current["track_name"] != data["track_name"]:
            raise ValueError("This recording no longer matches the current track. No fader was changed.")
        path = Path(current["sample_path"])
        digest = await asyncio.to_thread(lambda: hashlib.sha256(path.read_bytes()).hexdigest())
        if digest != data.get("sha256"):
            raise ValueError("The loaded sample differs from this recording. No fader was changed.")
        current["sample_sha256"] = digest
        if operation == "inspect":
            return current
        if operation != "record":
            raise ValueError("Unsupported fader action.")
        if current["map_id"] != data["map_id"] or abs(current["value"] - data["expected_value"]) > 1e-5:
            raise ValueError("The track, source or fader changed. Refresh the map before applying.")
        await require_awake_display()
        # Refuse before a fader write if the audition cannot safely start.
        for prop in ("is_playing", "record_mode", "session_record"):
            state = await bridge._query_osc("mixer-check", f"/live/song/get/{prop}", [], 4)
            if state.get("status") != "ok" or not state.get("args") or state["args"][-1]:
                raise ValueError("Stop playback and recording in Ableton before applying and auditioning.")
        clip = await bridge._query_osc("mixer-clip", "/live/clip_slot/get/has_clip", [data["track"], data["scene"]], 4)
        if clip.get("status") != "ok" or not clip.get("args") or not clip["args"][-1]:
            raise ValueError("The recorded clip is no longer present. No fader was changed.")
        changed = True
        mapped = await call({"track": data["track"], "operation": "set", "map_id": current["map_id"],
                             "expected_value": current["value"], "value": data["value"]})
        result = await capture_part(bridge, data["track"], data["scene"], 8)
        after = await call({"track": data["track"]})
        if after["map_id"] != mapped["map_id"] or abs(after["value"] - mapped["value"]) > 1e-5:
            result.pop("audio_base64", None)
            result.update(status="partial", summary="Track, source or fader changed during capture. Inspect before making another recording.")
        result["mixer"] = mapped
        result["previous_fader"] = {"value": current["value"], "display": current["display"]}
        if result.get("status") != "verified":
            result["summary"] = "Fader changed to " + mapped["display"] + ", but the fresh recording failed. " + result.get("summary", "Inspect Ableton before retrying.")
        return result
    except Exception as error:
        return {"status": "unverified" if changed else "failed", "summary": str(error)}
