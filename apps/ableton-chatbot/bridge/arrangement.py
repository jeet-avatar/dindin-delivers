"""Record an approved section plan from Session scenes into Live's Arrangement timeline.

Each section is one scene played for a number of bars. Scenes launch on bar boundaries with Arrangement Record on,
so the timeline receives exactly what the listener heard. Existing Arrangement clips are never recorded over.
"""

import asyncio
import json
import math
import time

MAX_SECTIONS = 32
MAX_BARS = 512
LEAD_BEATS = 2.0  # launch the next scene this far ahead; the 1-bar quantization lands it on the boundary
ONE_BAR = 4       # Live's clip trigger quantization index for 1 bar


CURVES = ("linear", "logarithmic", "exponential")
MAX_RIDES = 32


def fader_from_db(db):
    """Live's volume fader: 0.85 is 0 dB, 40 dB per unit above -18 dB, logarithmic below (as the backend uses)."""
    if db <= -70:
        return 0.0
    if db >= -18:
        return max(0.0, min(1.0, 0.85 + db / 40))
    return 0.4 * 10 ** ((db + 18) / 40)


def db_from_fader(value):
    if value <= 0:
        return -70.0
    if value >= 0.4:
        return (value - 0.85) * 40
    return 40 * math.log10(value / 0.4) - 18


def ride_db(ride, fraction):
    """Level along an entry ride, in dB: logarithmic rises fast then settles, exponential starts slowly."""
    start, end = ride["from_db"], ride["to_db"]
    shaped = {"linear": fraction, "logarithmic": 1 - (1 - fraction) ** 2, "exponential": fraction ** 2}[ride["curve"]]
    return start + (end - start) * shaped


def validate_rides(rides):
    if rides is None:
        return None
    if not isinstance(rides, list) or len(rides) > MAX_RIDES:
        return f"Give at most {MAX_RIDES} entry rides."
    for ride in rides:
        if not isinstance(ride, dict) or type(ride.get("track")) is not int or ride["track"] < 0:
            return "Each ride needs a track index."
        if type(ride.get("start_bar")) is not int or ride["start_bar"] < 1:
            return "Each ride needs a start_bar (1 is the first bar)."
        if not isinstance(ride.get("bars"), (int, float)) or not 0.25 <= ride["bars"] <= 16:
            return "Each ride lasts 0.25 to 16 bars."
        if not isinstance(ride.get("from_db"), (int, float)) or not -70 <= ride["from_db"] <= 0:
            return "from_db must be -70 (silent) to 0 dB."
        if ride.get("curve", "logarithmic") not in CURVES:
            return "curve must be linear, logarithmic or exponential."
    return None


def validate(sections):
    if not isinstance(sections, list) or not 1 <= len(sections) <= MAX_SECTIONS:
        return f"Give 1 to {MAX_SECTIONS} sections."
    for section in sections:
        if not isinstance(section, dict) or type(section.get("scene")) is not int or section["scene"] < 0:
            return "Each section needs a scene index."
        if type(section.get("bars")) is not int or not 1 <= section["bars"] <= 128:
            return "Each section needs 1 to 128 bars."
    if sum(section["bars"] for section in sections) > MAX_BARS:
        return f"The song can be at most {MAX_BARS} bars."
    return None


async def record_arrangement(bridge, sections, rides=None, replace_existing=False):
    problem = validate(sections) or validate_rides(rides)
    if problem:
        return {"status": "failed", "error": problem, "summary": problem}
    steps, restore_errors = [], []

    async def query(address, args=()):
        result = await bridge._query_osc("arrangement", address, list(args), 4)
        steps.append({"number": len(steps) + 1, "kind": "read", "address": address,
                      "args": list(args), "status": result.get("status"), "elapsed_ms": 0})
        if result.get("status") != "ok":
            raise RuntimeError(f"Could not verify {address}")
        return result["args"]

    def send(address, args=()):
        bridge._send_osc(address, list(args))
        steps.append({"number": len(steps) + 1, "kind": "write", "address": address,
                      "args": list(args), "status": "sent", "elapsed_ms": 0})

    async def song_time():
        return float((await query("/live/song/get/current_song_time"))[-1])

    async def extension(payload):
        reply = await bridge._query_osc("arrangement", "/live/beatmind/arrangement", [json.dumps(payload)], 8)
        steps.append({"number": len(steps) + 1, "kind": "write" if payload.get("action") != "state" else "read",
                      "address": "/live/beatmind/arrangement", "args": [payload], "status": reply.get("status"), "elapsed_ms": 0})
        if reply.get("status") != "ok" or not reply.get("args"):
            raise RuntimeError("The BeatMind Ableton extension did not answer; install the 1.3.5 extension files and restart Ableton.")
        answer = json.loads(reply["args"][0])
        if answer.get("status") == "failed":
            raise RuntimeError(answer.get("summary") or "Ableton refused the Arrangement change.")
        return answer

    changed = False
    recording = False
    result = {}
    automation_arm = None
    active = []
    try:
        if (await query("/live/song/get/is_playing"))[-1]:
            raise RuntimeError("Stop Ableton playback before recording the Arrangement.")
        for mode in ("record_mode", "session_record"):
            if (await query(f"/live/song/get/{mode}"))[-1]:
                raise RuntimeError("Turn off Ableton recording before recording the Arrangement.")
        names = await query("/live/song/get/track_names")
        num_scenes = (await query("/live/song/get/num_scenes"))[-1]
        scene_names = {}
        for section in sections:
            scene = section["scene"]
            if scene >= num_scenes:
                raise RuntimeError(f"Scene {scene + 1} no longer exists.")
            if scene not in scene_names:
                if not any([(await query("/live/clip_slot/get/has_clip", [i, scene]))[-1] for i in range(len(names))]):
                    raise RuntimeError(f"Scene {scene + 1} has no clips.")
                scene_names[scene] = (await query("/live/scene/get/name", [scene]))[-1] or f"Scene {scene + 1}"
        occupied = [names[i] for i in range(len(names)) if len((await query("/live/track/get/arrangement_clips/name", [i]))[1:])]
        if occupied and replace_existing:
            cleared = await extension({"action": "clear"})
            steps.append({"number": len(steps) + 1, "kind": "note", "summary": cleared.get("summary"), "status": "ok", "elapsed_ms": 0})
            await asyncio.sleep(0.5)
            occupied = [names[i] for i in range(len(names)) if len((await query("/live/track/get/arrangement_clips/name", [i]))[1:])]
        if occupied:
            raise RuntimeError("The Arrangement already has clips on " + ", ".join(occupied) +
                               ". Open a new Live Set or clear the Arrangement first; BeatMind never records over it.")
        numerator = (await query("/live/song/get/signature_numerator"))[-1]
        denominator = (await query("/live/song/get/signature_denominator"))[-1]
        tempo = float((await query("/live/song/get/tempo"))[-1])
        beats_per_bar = numerator * 4 / denominator
        quantization = (await query("/live/song/get/clip_trigger_quantization"))[-1]
        loop = (await query("/live/song/get/loop"))[-1]
        arms = [(await query("/live/track/get/arm", [i]))[-1] if (await query("/live/track/get/can_be_armed", [i]))[-1] else None
                for i in range(len(names))]

        for ride in rides or []:
            if ride["track"] >= len(names):
                raise RuntimeError(f"Ride track {ride['track'] + 1} does not exist.")
            level = float((await query("/live/track/get/volume", [ride["track"]]))[-1])
            active.append({**ride, "curve": ride.get("curve", "logarithmic"), "native": level, "to_db": db_from_fader(level),
                           "start": (ride["start_bar"] - 1) * beats_per_bar,
                           "end": (ride["start_bar"] - 1 + ride["bars"]) * beats_per_bar, "last": None})
        if active:
            automation_arm = (await extension({"action": "state"}))["automation_arm"]

        changed = True
        send("/live/song/stop_all_clips")
        send("/live/song/set/loop", [0])
        send("/live/song/set/clip_trigger_quantization", [ONE_BAR])
        for i, armed in enumerate(arms):
            if armed:
                send("/live/track/set/arm", [i, 0])  # an armed MIDI track would record a new take instead of its clip
        send("/live/song/set/current_song_time", [0.0])
        await asyncio.sleep(0.4)

        boundaries, beat = [], 0.0
        for section in sections:
            boundaries.append(beat)
            beat += section["bars"] * beats_per_bar
        end = beat

        def ride_faders(now):
            # Before a ride starts its track sits at the ride's start level; after it ends, at its real level.
            for ride in active:
                if now < ride["start"] - beats_per_bar or ride["last"] == "done":
                    continue
                fraction = min(1.0, max(0.0, (now - ride["start"]) / (ride["end"] - ride["start"])))
                value = ride["native"] if fraction >= 1 else fader_from_db(ride_db(ride, fraction))
                if ride["last"] is None or abs(value - ride["last"]) > 0.002 or fraction >= 1:
                    bridge._send_osc("/live/track/set/volume", [ride["track"], float(value)])
                    ride["last"] = "done" if fraction >= 1 else value

        async def wait_until(target):
            while True:
                now = await song_time()
                ride_faders(now)
                if now >= target:
                    return
                if time.monotonic() > deadline:
                    raise RuntimeError("Playback stalled before the Arrangement finished.")
                await asyncio.sleep(0.03 if active else 0.05)

        if active:
            await extension({"action": "arm", "on": True})  # Automation Arm: the rides record as Arrangement automation
            for ride in active:
                if ride["start"] < beats_per_bar:
                    bridge._send_osc("/live/track/set/volume", [ride["track"], float(fader_from_db(ride["from_db"]))])
        send("/live/scene/fire", [sections[0]["scene"]])
        await asyncio.sleep(0.3)
        send("/live/song/set/record_mode", [1])
        recording = True
        await asyncio.sleep(0.2)
        send("/live/song/start_playing")
        started = time.monotonic()
        deadline = started + end * 60 / tempo + 30
        for section, boundary in zip(sections[1:], boundaries[1:]):
            await wait_until(boundary - LEAD_BEATS)
            send("/live/scene/fire", [section["scene"]])
        await wait_until(end - LEAD_BEATS)
        send("/live/song/stop_all_clips")
        await wait_until(end + 0.25)
        send("/live/song/set/record_mode", [0])
        recording = False
        await asyncio.sleep(0.2)
        send("/live/song/stop_playing")
        await asyncio.sleep(0.4)

        # Live reports a recorded clip's loop length, not its length on the timeline, so report where clips start.
        recorded = {}
        for i, name in enumerate(names):
            starts = (await query("/live/track/get/arrangement_clips/start_time", [i]))[1:]
            if starts:
                recorded[name] = {"clips": len(starts), "start_bars": [int(float(v) / beats_per_bar) + 1 for v in starts]}
        if not recorded:
            raise RuntimeError("Live did not record any Arrangement clips.")
        plan = [{"scene": s["scene"], "name": scene_names[s["scene"]], "bars": s["bars"],
                 "start_bar": int(b / beats_per_bar) + 1} for s, b in zip(sections, boundaries)]
        seconds = end * 60 / tempo
        result = {"status": "verified",
                  "summary": f"Recorded {int(end / beats_per_bar)} bars ({int(seconds // 60)}:{int(seconds % 60):02d}) into the Arrangement: "
                             + ", ".join(f"{p['name']} {p['bars']}" for p in plan) + ".",
                  "sections": plan, "bars": int(end / beats_per_bar), "duration_seconds": round(seconds, 1),
                  "tempo": tempo, "tracks": recorded,
                  **({"rides": [{"track": names[r["track"]], "start_bar": r["start_bar"], "bars": r["bars"],
                                 "from_db": r["from_db"], "to_db": round(r["to_db"], 1), "curve": r["curve"]} for r in active]}
                     if active else {})}
        if active:
            result["summary"] += f" Recorded {len(active)} entry ride(s) as Arrangement automation."
    except Exception as error:
        result = {"status": "failed", "error": str(error), "summary": str(error)}
    finally:
        if changed:
            try:
                if recording:
                    send("/live/song/set/record_mode", [0])
                send("/live/song/stop_playing")
                send("/live/song/stop_all_clips")
                send("/live/song/set/clip_trigger_quantization", [int(quantization)])
                send("/live/song/set/loop", [int(loop)])
                for i, armed in enumerate(arms):
                    if armed:
                        send("/live/track/set/arm", [i, 1])
                for ride in active:  # every ridden fader ends at its real level
                    send("/live/track/set/volume", [ride["track"], float(ride["native"])])
                if automation_arm is not None:
                    await extension({"action": "arm", "on": bool(automation_arm)})
                    await extension({"action": "re_enable"})
                send("/live/song/set/current_song_time", [0.0])
                await asyncio.sleep(0.4)
                # Last: stopping Session clips re-enables Back to Arrangement, so switch to the Arrangement after it.
                send("/live/song/set/back_to_arranger", [0])
                await asyncio.sleep(0.2)
                if (await query("/live/song/get/record_mode"))[-1]:
                    restore_errors.append("Arrangement Record is still on.")
                if (await query("/live/song/get/is_playing"))[-1]:
                    restore_errors.append("Transport did not stop.")
                if result.get("status") == "verified" and (await query("/live/song/get/back_to_arranger"))[-1]:
                    restore_errors.append("Live is still playing the Session; click Back to Arrangement in Ableton.")
            except Exception as error:
                restore_errors.append(str(error))
        if restore_errors:
            result.update(status="partial", error="; ".join(restore_errors),
                          summary=(result.get("summary") or "") + " Session restoration needs attention.")
    result["steps"] = steps
    return result
