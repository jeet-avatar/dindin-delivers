"""Audition an existing Arrangement range without recording or editing clips."""
import asyncio
import base64
import math

from audio_preview import confirm_stopped, helper_path, record_with_helper


async def capture_arrangement(bridge, track, start_beat, seconds):
    if type(track) is not int or track < 0:
        return {"status": "failed", "summary": "Choose an existing track."}
    if (type(start_beat) not in (int, float) or not math.isfinite(start_beat) or not 0 <= start_beat <= 32768
            or type(seconds) not in (int, float) or not 2 <= seconds <= 16):
        return {"status": "failed", "summary": "Use a valid Arrangement position and a 2-16 second preview."}
    helper = helper_path()
    if not helper.is_dir():
        return {"status": "failed", "summary": "Install the BeatMind Audio helper."}
    steps, errors, changed = [], [], False

    async def query(address, args=None):
        args = args or []
        reply = await bridge._query_osc("arrangement-preview", address, args, 4)
        steps.append({"number": len(steps) + 1, "kind": "readback", "address": address,
                      "args": args, "status": reply.get("status"), "result": reply})
        if reply.get("status") != "ok":
            raise RuntimeError("Readback failed: " + address)
        return reply["args"]

    async def command(address, args=None):
        args = args or []
        bridge._send_osc(address, args)
        steps.append({"number": len(steps) + 1, "kind": "write", "address": address, "args": args, "status": "sent"})
        await asyncio.sleep(.1)

    async def set_value(address, args):
        await command(address, args)
        for attempt in range(6):
            actual = (await query(address.replace("/set/", "/get/"), args[:-1]))[-1]
            if abs(float(actual) - float(args[-1])) <= .01:
                return
            await asyncio.sleep(.2)
        raise RuntimeError("Value not confirmed: " + address)

    result = {}
    try:
        for prop in ("is_playing", "record_mode", "session_record"):
            if (await query("/live/song/get/" + prop))[-1]:
                raise RuntimeError("Stop playback and recording before the Arrangement audition.")
        names = await query("/live/song/get/track_names")
        if track >= len(names):
            raise RuntimeError("Track no longer exists.")
        clips = await query("/live/track/get/arrangement_clips/name", [track])
        if len(clips) < 2:
            raise RuntimeError("This track has no Arrangement clips.")
        position = (await query("/live/song/get/current_song_time"))[-1]
        start_marker = (await query("/live/beatmind/get/arrangement_start"))[-1]
        loop = (await query("/live/song/get/loop"))[-1]
        solos = [(await query("/live/track/get/solo", [i]))[-1] for i in range(len(names))]
        mute = (await query("/live/track/get/mute", [track]))[-1]
        changed = True
        # Explicitly return to Arrangement; stale Session overrides must not mask its audio.
        await set_value("/live/song/set/back_to_arranger", [0])
        await set_value("/live/song/set/loop", [0])
        await set_value("/live/song/set/current_song_time", [float(start_beat)])
        await set_value("/live/beatmind/set/arrangement_start", [float(start_beat)])
        await set_value("/live/track/set/mute", [track, 0])
        for i in range(len(names)):
            await set_value("/live/track/set/solo", [i, int(i == track)])

        async def start():
            # Set the insert marker explicitly; seeking while stopped is not a start-position guarantee.
            await command("/live/song/start_playing")
            for _ in range(6):
                if (await query("/live/song/get/is_playing"))[-1]:
                    actual = float((await query("/live/song/get/current_song_time"))[-1])
                    if not start_beat - .01 <= actual <= start_beat + 4:
                        raise RuntimeError(f"Preview started at beat {actual}, not the requested beat {start_beat}.")
                    return
                await asyncio.sleep(.2)
            raise RuntimeError("Arrangement playback was not confirmed.")

        metrics, data = await record_with_helper(helper, seconds, start)
        if not metrics.get("has_signal"):
            raise RuntimeError("This Arrangement range recorded silence; no approval is available.")
        played_to = (await query("/live/song/get/current_song_time"))[-1]
        if float(played_to) <= start_beat or (await query("/live/song/get/back_to_arranger"))[-1]:
            raise RuntimeError("Arrangement playback position or source was not confirmed.")
        result = {"status": "verified", "track": track, "track_name": names[track], "scene": None,
                  "arrangement_start_beat": start_beat, "metrics": metrics,
                  "audio_base64": base64.b64encode(data).decode("ascii"),
                  "summary": "Recorded the existing Arrangement range. No clips were changed; transport stops and Arrangement remains selected. Listen before approval."}
    except Exception as error:
        result = {"status": "failed", "summary": str(error)}
    finally:
        if changed:
            async def restore(operation):
                try:
                    await operation
                except Exception as error:
                    errors.append(str(error))
            await restore(command("/live/song/stop_playing"))
            try:
                await confirm_stopped(query)
                if await query("/live/song/get/track_names") != names:
                    raise RuntimeError("Track layout changed; inspect solos manually.")
                for i, solo in enumerate(solos):
                    await restore(set_value("/live/track/set/solo", [i, int(solo)]))
                for i, solo in enumerate(solos):
                    if (await query("/live/track/get/solo", [i]))[-1] != solo:
                        errors.append(f"Solo on track {i + 1} was not restored.")
                await restore(set_value("/live/track/set/mute", [track, int(mute)]))
                await restore(set_value("/live/beatmind/set/arrangement_start", [float(start_marker)]))
            except Exception as error:
                errors.append(str(error))
            await restore(set_value("/live/song/set/loop", [int(loop)]))
            await restore(set_value("/live/song/set/current_song_time", [float(position)]))
        if errors:
            result.pop("audio_base64", None)
            result.update(status="partial", summary="Preview restoration needs attention: " + "; ".join(errors))
    return {**result, "steps": steps}
