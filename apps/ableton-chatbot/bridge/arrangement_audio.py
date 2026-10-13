"""Capture a bounded Arrangement excerpt and verify its real playback position."""

import asyncio
import base64
import json
import math
import time

from audio_preview import helper_path, record_with_helper


async def capture(bridge, data):
    seconds, beat = data.get("seconds", 8), data.get("beat")
    if (any(type(v) not in (int, float) or not math.isfinite(v) for v in (seconds, beat))
            or not 4 <= seconds <= 16 or beat < 0 or not isinstance(data.get("set_id"), str)):
        return {"status": "failed", "summary": "Invalid Arrangement preview request."}
    helper = helper_path()
    if not helper.is_dir():
        return {"status": "failed", "summary": "BeatMind Audio capture helper is not installed."}
    steps, changed, previous, result = [], False, None, {}

    async def operation(action, **values):
        request = {"action": action, "set_id": data["set_id"], **values}
        reply = await bridge._query_osc("arrangement-preview", "/live/beatmind/arrangement", [json.dumps(request)], 4)
        if reply.get("status") != "ok" or not reply.get("args"):
            raise RuntimeError("Arrangement preview did not respond. No command was retried.")
        response = json.loads(reply["args"][0])
        steps.append({"kind": "read" if action == "preview_state" else "write", "action": action, "result": response})
        if response.get("status") not in {"observed", "verified"}:
            raise RuntimeError(response.get("summary", "Arrangement preview failed."))
        return response

    try:
        previous = await operation("preview_state")
        if previous["is_playing"] or previous["recording"] or previous["session_override"] or previous["solo"]:
            raise RuntimeError("Stop playback and recording, return to Arrangement, and clear solos before this full-section preview.")
        started = None
        async def start():
            nonlocal changed, started
            changed = True
            started = time.monotonic()
            await operation("preview_start", beat=beat)
            await asyncio.sleep(0.15)
            observed = await operation("preview_state")
            elapsed = time.monotonic() - started
            if (not observed["is_playing"] or observed["loop"] or observed["session_override"]
                    or not beat - 0.1 <= observed["position"] <= beat + (elapsed + 0.5) * previous["bpm"] / 60):
                raise RuntimeError("Live started at a different position. This section recording was not verified.")

        metrics, audio = await record_with_helper(helper, seconds, start)
        observed = await operation("preview_state")
        elapsed = time.monotonic() - started
        expected = beat + elapsed * previous["bpm"] / 60
        if (not observed["is_playing"] or observed["loop"] or observed["session_override"]
                or observed["bpm"] != previous["bpm"] or abs(observed["position"] - expected) > previous["bpm"] / 60):
            raise RuntimeError("Arrangement playback changed during capture. No verified section recording is available.")
        if not metrics.get("has_signal"):
            raise RuntimeError("The captured Arrangement section is silent. Check its material and routing before retrying.")
        result = {"status": "verified", "summary": "Actual Arrangement audio recorded at the checked section position. Listen before approving.",
                  "kind": "arrangement", "track": -1, "scene": -1, "track_name": data.get("section_name", "Arrangement section"),
                  "section_id": data.get("section_id"), "start_beat": beat, "metrics": metrics,
                  "audio_base64": base64.b64encode(audio).decode("ascii")}
    except Exception as error:
        result = {"status": "failed", "summary": str(error)}
    finally:
        if changed:
            try:
                # Inspect identity before stopping; never stop a different set after a user switches projects.
                current = await operation("preview_state")
                if current["recording"]:
                    raise RuntimeError("Recording was enabled during the preview; inspect transport manually.")
                bridge._send_osc("/live/song/stop_playing", [])
                for _ in range(10):
                    await asyncio.sleep(0.1)
                    if not (await operation("preview_state"))["is_playing"]:
                        break
                else:
                    raise RuntimeError("Transport did not stop after the preview.")
                await operation("preview_restore", start=previous["start"], position=previous["position"], loop=previous["loop"])
                for _ in range(10):
                    await asyncio.sleep(0.1)
                    current = await operation("preview_state")
                    if (abs(current["position"] - previous["position"]) < 0.01
                            and abs(current["start"] - previous["start"]) < 0.01
                            and current["loop"] == previous["loop"] and not current["is_playing"]):
                        break
                else:
                    raise RuntimeError("Transport restoration could not be verified.")
            except Exception as error:
                result.pop("audio_base64", None)
                result.update(status="partial", summary="Preview restoration needs attention: " + str(error))
    result["steps"] = steps
    return result
