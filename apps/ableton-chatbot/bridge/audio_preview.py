"""Capture an isolated Live clip through the user-authorized macOS app."""

import asyncio
import base64
import json
import os
import sys
from pathlib import Path
import tempfile
import time


async def capture_part(bridge, track, scene, seconds):
    if type(track) is not int or track < 0 or type(scene) is not int or scene < 0:
        return {"status": "failed", "error": "Invalid clip coordinates."}
    if not isinstance(seconds, (int, float)) or not 2 <= seconds <= 16:
        return {"status": "failed", "error": "Preview length must be 2 to 16 seconds."}
    bundled_helper = Path(sys.executable).resolve().parents[1] / "Helpers/BeatMind Audio.app"
    default_helper = bundled_helper if getattr(sys, "frozen", False) else Path.home() / "Applications/BeatMind Audio.app"
    helper = Path(os.getenv("BEATMIND_AUDIO_APP", str(default_helper)))
    if not helper.is_dir():
        return {"status": "failed", "error": "Install the BeatMind Audio capture helper on the bridge Mac."}
    steps, restore_errors = [], []

    async def query(address, args):
        result = await bridge._query_osc("preview", address, args, 4)
        steps.append({"number": len(steps) + 1, "kind": "read", "address": address,
                      "args": args, "status": result.get("status"), "result": result, "elapsed_ms": 0})
        if result.get("status") != "ok":
            raise RuntimeError(f"Could not verify {address}")
        return result["args"]

    async def set_value(address, args, expected):
        bridge._send_osc(address, args)
        steps.append({"number": len(steps) + 1, "kind": "write", "address": address,
                      "args": args, "status": "sent", "elapsed_ms": 0})
        # Live applies transport seeks asynchronously. Retry reads, never the write.
        for attempt in range(6):
            await asyncio.sleep(0.1 if attempt == 0 else 0.2)
            result = await query(address.replace("/set/", "/get/"), args[:-1])
            if abs(float(result[-1]) - float(expected)) <= 0.01:
                return
        raise RuntimeError(f"Readback mismatch for {address}")

    async def command(address, args):
        bridge._send_osc(address, args)
        steps.append({"number": len(steps) + 1, "kind": "write", "address": address,
                      "args": args, "status": "sent", "elapsed_ms": 0})
        await asyncio.sleep(0.1)

    changed = False
    result = {}
    try:
        if (await query("/live/song/get/is_playing", []))[-1]:
            raise RuntimeError("Stop Ableton playback before requesting an isolated preview.")
        for recording_mode in ("record_mode", "session_record"):
            if (await query(f"/live/song/get/{recording_mode}", []))[-1]:
                raise RuntimeError("Turn off Ableton recording before requesting an audition.")
        names = await query("/live/song/get/track_names", [])
        if track >= len(names):
            raise RuntimeError("Track no longer exists.")
        if not (await query("/live/clip_slot/get/has_clip", [track, scene]))[-1]:
            raise RuntimeError("There is no clip to preview in that slot.")
        position = (await query("/live/song/get/current_song_time", []))[-1]
        quantization = (await query("/live/song/get/clip_trigger_quantization", []))[-1]
        solos = [(await query("/live/track/get/solo", [i]))[-1] for i in range(len(names))]
        mute = (await query("/live/track/get/mute", [track]))[-1]
        changed = True
        await set_value("/live/song/set/clip_trigger_quantization", [0], 0)
        await set_value("/live/track/set/mute", [track, 0], 0)
        for i in range(len(names)):
            await set_value("/live/track/set/solo", [i, int(i == track)], int(i == track))
        with tempfile.TemporaryDirectory(prefix="beatmind-audition-") as directory:
            root = Path(directory)
            output, errors, audio = root / "events.jsonl", root / "errors.log", root / "preview.m4a"
            # LaunchServices gives TCC the helper's identity, not the terminal's identity.
            process = await asyncio.create_subprocess_exec(
                "/usr/bin/open", "-n", "--stdout", str(output), "--stderr", str(errors),
                str(helper), "--args", str(audio), str(seconds),
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
            if await process.wait() != 0:
                raise RuntimeError("macOS could not launch BeatMind Audio.")
            deadline = time.monotonic() + seconds + 20
            ready = False
            complete = None
            while time.monotonic() < deadline:
                events = []
                if output.exists():
                    for line in output.read_text().splitlines():
                        try:
                            events.append(json.loads(line))
                        except json.JSONDecodeError:
                            pass
                for event in events:
                    if "error" in event:
                        raise RuntimeError(event["error"])
                    if event.get("type") == "ready" and not ready:
                        ready = True
                        await command("/live/clip/fire", [track, scene])
                        if not (await query("/live/clip/get/is_playing", [track, scene]))[-1]:
                            raise RuntimeError("Clip did not start playing.")
                    if event.get("type") == "complete":
                        complete = event
                if complete:
                    break
                await asyncio.sleep(0.05)
            if not complete or not audio.exists():
                raise RuntimeError("Audio capture did not finish before its deadline.")
            metrics = complete["metrics"]
            if not metrics.get("has_signal"):
                raise RuntimeError("The actual Ableton recording is silent. Check the instrument and audio routing; no successful preview was produced.")
            if audio.stat().st_size > 900000:
                raise RuntimeError("Recording exceeds the preview size limit.")
            result = {"status": "verified", "summary": "Recorded actual Ableton audio. Listen before approving the sound.",
                      "metrics": metrics, "track_name": names[track], "track": track, "scene": scene,
                      "audio_base64": base64.b64encode(audio.read_bytes()).decode("ascii")}
    except Exception as error:
        result = {"status": "failed", "error": str(error), "summary": str(error)}
    finally:
        if changed:
            async def restore(operation):
                try:
                    await operation
                except Exception as error:
                    restore_errors.append(str(error))

            await restore(command("/live/clip/stop", [track, scene]))
            await restore(command("/live/song/stop_playing", []))
            try:
                if (await query("/live/song/get/is_playing", []))[-1]:
                    restore_errors.append("Transport did not stop.")
                if await query("/live/song/get/track_names", []) != names:
                    raise RuntimeError("Track list changed during recording; inspect the solo states manually.")
                for i, solo in enumerate(solos):
                    await restore(set_value("/live/track/set/solo", [i, int(solo)], solo))
                for i, solo in enumerate(solos):
                    if (await query("/live/track/get/solo", [i]))[-1] != solo:
                        restore_errors.append(f"Solo state on track {i + 1} needs attention.")
                await restore(set_value("/live/track/set/mute", [track, int(mute)], mute))
            except Exception as error:
                restore_errors.append(str(error))
            await restore(set_value("/live/song/set/clip_trigger_quantization", [int(quantization)], quantization))
            await restore(set_value("/live/song/set/current_song_time", [float(position)], position))
        if restore_errors:
            result.pop("audio_base64", None)
            result.update(status="partial", error="; ".join(restore_errors), summary="Recording ended, but session restoration needs attention.")
    result["steps"] = steps
    return result
