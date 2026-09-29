"""One verified execution path for the desktop runner and WebSocket backend."""

import asyncio
import math
import os
import time

from jsonschema import Draft202012Validator

from claude_tools import ABLETON_TOOLS, tool_to_osc, fader_from_db, db_from_fader


VALIDATORS = {t["name"]: Draft202012Validator(t["input_schema"]) for t in ABLETON_TOOLS}
READ_TOOLS = {name for name in VALIDATORS if name.startswith("get_")} | {"list_browser", "inspect_track"}
BAD_STATUSES = {"failed", "partial", "unverified"}
MAX_PRODUCTION_ROUNDS = max(1, min(100, int(os.getenv("BEATMIND_MAX_ROUNDS", "60"))))


class ExecutionError(Exception):
    def __init__(self, message, **details):
        super().__init__(message)
        self.details = details


def response_ids(address, args):
    """AbletonOSC prefixes object replies with IDs, but not browser/song replies."""
    if address.startswith("/live/device/get/parameter/"):
        return args[:3]
    if address.startswith(("/live/device/", "/live/clip/", "/live/clip_slot/")):
        return args[:2]
    if address == "/live/track/get/send":
        return args[:2]
    if address.startswith(("/live/track/", "/live/scene/")):
        return args[:1]
    return []


def notes_from_values(values):
    if len(values) % 5:
        raise ExecutionError("Incomplete MIDI note reply; cannot verify this pattern.")
    return [{"pitch": values[i], "start": values[i + 1], "duration": values[i + 2],
             "velocity": values[i + 3], "muted": bool(values[i + 4])}
            for i in range(0, len(values), 5)]


def same_value(actual, expected):
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return math.isclose(actual, expected, rel_tol=1e-5, abs_tol=1e-4)
    return actual == expected


def compare_notes(actual, expected):
    """Match multisets, preserving duplicate-note counts and float tolerance."""
    remaining = list(actual)
    missing = []
    for note in expected:
        match = next((i for i, candidate in enumerate(remaining)
                      if all(same_value(candidate[k], note[k]) for k in ("pitch", "start", "duration", "velocity"))
                      and candidate.get("muted", False) == note.get("muted", False)), None)
        if match is None:
            missing.append(note)
        else:
            remaining.pop(match)
    return missing, remaining


def _finite(value):
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, dict):
        return all(_finite(v) for v in value.values())
    if isinstance(value, list):
        return all(_finite(v) for v in value)
    return True


class VerifiedExecutor:
    def __init__(self, send_command):
        self.send_command = send_command
        self.steps = []
        self.mutations = 0

    async def command(self, address, args, query=False, timeout=5.0):
        step = {"number": len(self.steps) + 1, "address": address, "args": args,
                "kind": "readback" if query else "write", "status": "running"}
        self.steps.append(step)
        started = time.monotonic()
        if not query:
            self.mutations += 1
        try:
            result = await self.send_command(address, args, query, timeout)
            step["result"] = result
            if result.get("error") or result.get("status") not in ({"ok"} if query else {"sent", "ok"}):
                raise ExecutionError(f"Ableton did not confirm {address}: {result.get('error') or result.get('status', 'missing response')}.")
            values = result.get("args", [])
            if query:
                ids = response_ids(address, args)
                if result.get("address") != address or values[:len(ids)] != ids:
                    raise ExecutionError(f"Reply does not match the requested object at {address}.")
                if values and values[0] in ("error", "not_found"):
                    raise ExecutionError(f"Ableton returned {values[0]}: {values[1:]}.")
                step["status"] = "observed"
                return values[len(ids):]
            step["status"] = "sent"
            return []
        except (ExecutionError, OSError, TimeoutError) as exc:
            step["status"] = "failed"
            step["error"] = str(exc)
            raise ExecutionError(str(exc)) from exc
        finally:
            step["elapsed_ms"] = round((time.monotonic() - started) * 1000)

    async def read(self, address, args=None):
        return await self.command(address, args or [], True)

    async def scalar(self, address, args=None):
        values = await self.read(address, args)
        if len(values) != 1:
            raise ExecutionError(f"Expected one value from {address}, received {len(values)}.")
        return values[0]

    async def expect(self, address, args, expected):
        # Retry only observations. Never replay a creation, note insertion or browser load.
        for attempt in range(3):
            actual = await self.scalar(address, args)
            if same_value(actual, expected):
                self.steps[-1]["status"] = "verified"
                self.steps[-1]["expected"] = expected
                return actual
            if attempt < 2:
                await asyncio.sleep(0.12)
        raise ExecutionError(f"Readback mismatch at {address}: expected {expected!r}, received {actual!r}. Do not repeat the write blindly.")

    async def notes(self, track, scene):
        # AbletonOSC never answers a notes query for an empty slot, so check the slot first.
        if not await self.scalar("/live/clip_slot/get/has_clip", [track, scene]):
            return []
        return notes_from_values(await self.read("/live/clip/get/notes", [track, scene, 0, 128, -8192.0, 32768.0]))

    async def pattern_matches(self, track, scene, expected):
        for attempt in range(3):
            actual = await self.notes(track, scene)
            missing, extra = compare_notes(actual, expected)
            if not missing and not extra:
                self.steps[-1]["status"] = "verified"
                return actual
            if attempt < 2:
                await asyncio.sleep(0.12)
        raise ExecutionError(f"MIDI readback differs: {len(missing)} missing or changed notes, {len(extra)} unexpected notes. Inspect get_clip_notes before repairing; do not re-add the whole batch.",
                             notes=actual, missing_notes=missing, unexpected_notes=extra)

    async def check_target(self, data):
        for key in ("track", "target_track"):
            if key in data:
                count = await self.scalar("/live/song/get/num_tracks")
                if data[key] >= count:
                    raise ExecutionError(f"{key} {data[key]} does not exist ({count} tracks).")
        for key in ("scene", "target_scene"):
            if key in data:
                count = await self.scalar("/live/song/get/num_scenes")
                if data[key] >= count:
                    raise ExecutionError(f"{key} {data[key]} does not exist ({count} scenes).")

    async def execute(self, name, data):
        started = time.monotonic()
        result = {"status": "failed", "summary": "", "steps": self.steps}
        try:
            if name not in VALIDATORS:
                raise ExecutionError(f"Unknown tool: {name}")
            errors = list(VALIDATORS[name].iter_errors(data))
            if errors or not _finite(data):
                raise ExecutionError(f"Invalid command: {errors[0].message if errors else 'all numbers must be finite'}")
            if name == "set_track_send" and not 0 <= data["value"] <= 1:
                raise ExecutionError("Send level must be between 0 and 1.")
            await self.check_target(data)
            details = await self.perform(name, data)
            result.update(details)
        except (ExecutionError, ValueError, KeyError, IndexError, TypeError) as exc:
            result.update(status="partial" if self.mutations else "failed", summary=str(exc), error=str(exc))
            if isinstance(exc, ExecutionError):
                result.update(exc.details)
        result["elapsed_ms"] = round((time.monotonic() - started) * 1000)
        return result

    async def perform(self, name, data):
        t, s = data.get("track"), data.get("scene")
        if name == "describe_sound":
            inspection = await self.perform("inspect_track", {"track": t})
            notes = await self.notes(t, s)
            return {"status": "observed", "summary": f"{data['role']}: {data['character']}",
                    "sound": {**data, "basis": "Sound-design intent; audio has not been analyzed.",
                              "devices": inspection["observations"].get("/live/track/get/devices/name", []),
                              "notes": notes, "note_count": len(notes),
                              "inspection": inspection["observations"]}}

        if name == "delete_device":
            names = await self.read("/live/track/get/devices/name", [t])
            index = data["device"]
            if index >= len(names) or names[index] != data["expected_name"]:
                raise ExecutionError(f"Device {index + 1} on track {t + 1} is not {data['expected_name']!r}; nothing was removed.")
            self.mutations += 1
            await self.command("/live/track/delete_device", [t, index], False, 5)
            await asyncio.sleep(0.2)
            after = await self.read("/live/track/get/devices/name", [t])
            if len(after) != len(names) - 1 or after != names[:index] + names[index + 1:]:
                raise ExecutionError("Device removal could not be verified; inspect the track's devices.")
            return {"status": "verified", "summary": f"Removed {data['expected_name']} from track {t + 1}.",
                    "devices": after, "steps": self.steps}

        if name == "get_clip_notes" and not await self.scalar("/live/clip_slot/get/has_clip", [t, s]):
            return {"status": "observed", "summary": f"Track {t + 1}, scene {s + 1} has no clip yet.", "notes": [],
                    "has_clip": False, "observations": {}}

        if name in READ_TOOLS:
            observations = {}
            for cmd in tool_to_osc(name, data):
                observations[cmd["address"]] = await self.command(cmd["address"], cmd.get("args", []), True, cmd.get("timeout", 5))
            result = {"status": "observed", "summary": name.replace("_", " ").capitalize(), "observations": observations}
            if name == "get_track_volume":
                value = float(observations["/live/track/get/volume"][-1])
                result["volume"] = value
                result["volume_db"] = db_from_fader(value)
                result["summary"] = f"Track {t + 1} fader is at {result['volume_db']} dB (native {value:.3f})."
            if name == "get_clip_notes":
                result["notes"] = notes_from_values(observations["/live/clip/get/notes"])
                result["summary"] = f"Read {len(result['notes'])} MIDI notes from track {t + 1}, scene {s + 1}."
            if name == "get_device_parameters":
                fields = ["name", "value", "min", "max", "is_quantized"]
                arrays = [observations[f"/live/device/get/parameters/{field}"] for field in fields]
                if len({len(a) for a in arrays}) != 1:
                    raise ExecutionError("Device changed during parameter discovery; inspect it again.")
                result["parameters"] = [{"index": i, **dict(zip(fields, values))} for i, values in enumerate(zip(*arrays))]
            return result

        before_notes = None
        expected_notes = None
        count_address = None
        before_count = None
        load_names = None
        source_devices = None
        clip_length = None
        scene_tracks = []
        scene_track_names = None
        if name == "fire_scene":
            scene_track_names = await self.read("/live/song/get/track_names")
            for index in range(len(scene_track_names)):
                if await self.scalar("/live/clip_slot/get/has_clip", [index, s]):
                    scene_tracks.append(index)
            if not scene_tracks:
                raise ExecutionError("This scene has no clips to play. A named scene is not a completed musical section; build or copy the intended clips first. No launch was sent.")
        if name in {"create_midi_track", "create_audio_track", "duplicate_track", "delete_track", "create_scene", "duplicate_scene", "delete_scene"}:
            count_address = "/live/song/get/num_scenes" if "scene" in name else "/live/song/get/num_tracks"
            before_count = await self.scalar(count_address)
            if data.get("index", -1) > before_count:
                raise ExecutionError("Insertion index exceeds the current session size.")
            if name == "duplicate_track":
                source_devices = await self.read("/live/track/get/devices/name", [t])
        if name == "create_return_track":
            before_count = len(await self.read("/live/song/get/return_track_names"))
        if name in {"create_clip", "duplicate_clip"}:
            target = [data["target_track"], data["target_scene"]] if name == "duplicate_clip" else [t, s]
            if await self.scalar("/live/clip_slot/get/has_clip", target):
                raise ExecutionError("Destination clip slot is occupied. Choose an empty slot; existing music was not overwritten.")
            if name == "create_clip" and not await self.scalar("/live/track/get/has_midi_input", [t]):
                raise ExecutionError("MIDI clips require a MIDI track.")
        if name in {"add_notes", "clear_notes", "remove_notes", "duplicate_clip"}:
            clip_length = await self.scalar("/live/clip/get/length", [t, s])
            if not await self.scalar("/live/clip/get/is_midi_clip", [t, s]):
                raise ExecutionError("This operation requires a MIDI clip.")
            before_notes = await self.notes(t, s)
            expected_notes = before_notes
            if name == "add_notes":
                if any(note["start"] >= clip_length for note in data["notes"]):
                    raise ExecutionError("A note starts outside the clip. Extend the clip or correct the timing first.")
                expected_notes = before_notes + [{**n, "muted": False} for n in data["notes"]]
            elif name == "clear_notes":
                expected_notes = []
            elif name == "remove_notes":
                low, high = data.get("pitch_low", 0), data.get("pitch_high", 127)
                end = data["start"] + data["length"]
                expected_notes = [n for n in before_notes
                                  if not (low <= n["pitch"] <= high and data["start"] - 1e-6 <= n["start"] < end - 1e-6)]
                if len(expected_notes) == len(before_notes):
                    # Already empty is the requested end state, not a failure; say so and note held notes.
                    held = [n for n in before_notes if low <= n["pitch"] <= high and n["start"] < data["start"]
                            and n["start"] + n["duration"] > data["start"] + 1e-6]
                    return {"status": "observed", "notes": before_notes, "steps": self.steps,
                            "summary": "No notes start in that range, so nothing needed removing." + (
                                f" {len(held)} earlier note(s) still sound into it; shorten them to empty the range."
                                if held else "")}
        if name in {"set_device_parameter", "automate_parameter"}:
            params = (await self.perform("get_device_parameters", {"track": t, "device": data["device"]}))["parameters"]
            if data["parameter"] >= len(params):
                raise ExecutionError("Parameter index does not exist on this device.")
            param = params[data["parameter"]]
            values = [data["value"]] if name == "set_device_parameter" else [data["from_value"], data["to_value"]]
            if any(not param["min"] <= v <= param["max"] or (param["is_quantized"] and int(v) != v) for v in values):
                raise ExecutionError(f"{param['name']} requires {'integer ' if param['is_quantized'] else ''}values between {param['min']} and {param['max']}.")
            if name == "automate_parameter":
                if param["is_quantized"]:
                    raise ExecutionError("Continuous ramps are not supported for discrete parameters.")
                await self.expect("/live/song/get/is_playing", [], 1)
        if name in {"load_instrument", "load_effect", "load_sample"}:
            load_names = await self.read("/live/track/get/devices/name", [t])
            if name != "load_effect":
                types = await self.read("/live/track/get/devices/type", [t])
                if 1 in types:
                    raise ExecutionError("This track already has an instrument. Use a new MIDI track to avoid replacing its sound.")
                await self.expect("/live/track/get/has_midi_input", [t], 1)

        for cmd in tool_to_osc(name, data):
            # Browser loads mutate state even though their protocol includes a reply.
            if cmd["address"].startswith("/live/browser/load"):
                self.mutations += 1
            reply = await self.command(cmd["address"], cmd.get("args", []), cmd.get("query", False), cmd.get("timeout", 5))
            if cmd["address"].startswith("/live/browser/load") and (not reply or reply[0] != "loaded"):
                raise ExecutionError("The browser did not confirm loading the requested sound.")
            if cmd["address"] == "/live/view/set/selected_track":
                await self.expect("/live/view/get/selected_track", [], t)
            await asyncio.sleep(cmd.get("delay", 0.05 if name == "add_notes" else 0.008))

        summary = f"{name.replace('_', ' ').capitalize()} verified in Ableton."
        result = {"status": "verified", "summary": summary}
        setters = {"set_tempo": ("/live/song/get/tempo", [], data.get("bpm")),
                   "play": ("/live/song/get/is_playing", [], 1), "stop": ("/live/song/get/is_playing", [], 0),
                   "set_track_name": ("/live/track/get/name", [t], data.get("name")),
                   "set_track_volume": ("/live/track/get/volume", [t], fader_from_db(data["volume_db"]) if "volume_db" in data else data.get("volume")),
                   "set_track_pan": ("/live/track/get/panning", [t], data.get("pan")),
                   "set_track_mute": ("/live/track/get/mute", [t], data.get("muted")),
                   "set_track_arm": ("/live/track/get/arm", [t], data.get("armed")),
                   "set_track_solo": ("/live/track/get/solo", [t], data.get("soloed")),
                   "set_track_send": ("/live/track/get/send", [t, data.get("send")], data.get("value")),
                   "set_track_monitoring": ("/live/track/get/current_monitoring_state", [t], data.get("state")),
                   "set_clip_looping": ("/live/clip/get/looping", [t, s], data.get("looping")),
                   "set_clip_name": ("/live/clip/get/name", [t, s], data.get("name")),
                   "set_scene_name": ("/live/scene/get/name", [s], data.get("name")),
                   "set_device_parameter": ("/live/device/get/parameter/value", [t, data.get("device"), data.get("parameter")], data.get("value"))}
        if name in setters:
            await self.expect(*setters[name])
        elif count_address:
            expected = before_count + (-1 if name.startswith("delete") else 1)
            await self.expect(count_address, [], expected)
            result["index"] = data.get("index", -1)
            if name.startswith("create") and result["index"] == -1:
                result["index"] = before_count
            if name.startswith("duplicate"):
                result["index"] = (s if "scene" in name else t) + 1
            if source_devices is not None:
                copied = await self.read("/live/track/get/devices/name", [t + 1])
                if copied != source_devices:
                    raise ExecutionError("Duplicated track device chain differs from the source.")
            result["summary"] = f"{name.replace('_', ' ').capitalize()}: count changed from {before_count} to {expected}."
        elif name == "create_return_track":
            names = await self.read("/live/song/get/return_track_names")
            if len(names) != before_count + 1:
                raise ExecutionError("Return track count did not increase.")
            result["index"] = before_count
        elif name == "create_clip":
            await self.expect("/live/clip_slot/get/has_clip", [t, s], 1)
            await self.expect("/live/clip/get/length", [t, s], data["length_beats"])
        elif name == "delete_clip":
            await self.expect("/live/clip_slot/get/has_clip", [t, s], 0)
        elif expected_notes is not None:
            target_t, target_s = (data["target_track"], data["target_scene"]) if name == "duplicate_clip" else (t, s)
            if name == "duplicate_clip":
                await self.expect("/live/clip/get/length", [target_t, target_s], clip_length)
            notes = await self.pattern_matches(target_t, target_s, expected_notes)
            result.update(notes=notes, note_count=len(notes),
                          summary=f"Verified {len(notes)} notes on track {target_t + 1}, scene {target_s + 1}: pitch, timing, duration, velocity and mute state match.")
        elif load_names is not None:
            names = await self.read("/live/track/get/devices/name", [t])
            if len(names) <= len(load_names) or names[:len(load_names)] != load_names:
                raise ExecutionError("Browser replied, but the expected appended device chain was not observed. Inspect the track before continuing.")
            result.update(devices=names, summary=f"Loaded on track {t + 1}; observed chain: {', '.join(names)}.")
        elif name == "fire_clip":
            playing = await self.scalar("/live/clip/get/is_playing", [t, s])
            if not playing:
                triggered = await self.scalar("/live/clip/get/is_triggered", [t, s])
                result.update(status="unverified", summary="Clip launch is queued by quantization." if triggered else "Clip playback was not observed yet.")
        elif name == "fire_scene":
            playing = []
            for attempt in range(12):
                playing = [track for track in scene_tracks if await self.scalar("/live/clip/get/is_playing", [track, s])]
                if len(playing) == len(scene_tracks):
                    break
                if attempt < 11:
                    await asyncio.sleep(0.25)
            if await self.read("/live/song/get/track_names") != scene_track_names:
                raise ExecutionError("Track list changed during scene launch. Inspect playback before continuing; do not relaunch blindly.")
            result["playing_tracks"] = playing
            result["expected_tracks"] = scene_tracks
            result["audio_verified"] = False
            if len(playing) == len(scene_tracks):
                result["summary"] = f"Playback observed on all {len(playing)} clips in scene {s + 1}. Audible output still requires an audition."
            else:
                result.update(status="unverified", summary=f"Launch sent once; playback observed on {len(playing)} of {len(scene_tracks)} clips. Quantization or playback state still needs inspection; no relaunch was attempted.")
        elif name == "automate_parameter":
            await self.expect("/live/device/get/parameter/value", [t, data["device"], data["parameter"]], data["to_value"])
            result.update(status="unverified", summary="Ramp endpoint verified. Intermediate timing and audible movement are not verified; no automation envelope was saved.")
        else:
            result.update(status="unverified", summary="Command sent; this operation has no readback verification yet.")
        return result


async def execute_verified(name, data, send_command):
    return await VerifiedExecutor(send_command).execute(name, data)
