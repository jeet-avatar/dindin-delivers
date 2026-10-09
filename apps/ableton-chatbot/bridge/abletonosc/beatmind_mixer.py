"""Read Live's actual fader display curve; reject stale targets and automation."""
import hashlib
import json
import math


def register(handler, app):
    def inspect(data):
        index = data["track"]
        if type(index) is not int or not 0 <= index < len(handler.song.tracks):
            raise ValueError("Track no longer exists.")
        track = handler.song.tracks[index]
        instruments = [device for device in track.devices if device.type == 1]
        if len(instruments) != 1 or not getattr(instruments[0], "sample", None):
            raise ValueError("Exact sample mapping requires one exposed sample instrument.")
        parameter = track.mixer_device.volume
        sample_path = str(instruments[0].sample.file_path)
        identity = [str(getattr(handler.song, "_live_ptr", id(handler.song))),
                    str(getattr(track, "_live_ptr", id(track))), track.name, sample_path]
        token = hashlib.sha256(json.dumps(identity).encode()).hexdigest()
        curve = [{"value": parameter.min + (parameter.max - parameter.min) * i / 200,
                  "display": parameter.str_for_value(parameter.min + (parameter.max - parameter.min) * i / 200)} for i in range(201)]
        return track, parameter, {"status": "observed", "track_name": track.name, "sample_path": sample_path,
                                 "value": parameter.value, "display": parameter.str_for_value(parameter.value),
                                 "enabled": bool(parameter.is_enabled), "automation_state": int(parameter.automation_state),
                                 "state": int(getattr(parameter, "state", 0)), "map_id": token, "curve": curve}

    def callback(params):
        written = False
        try:
            data = json.loads(params[0])
            track, parameter, result = inspect(data)
            if data.get("operation") == "set":
                if data.get("map_id") != result["map_id"]:
                    raise ValueError("Track or sample changed. Refresh the fader map.")
                if not math.isclose(float(data["expected_value"]), parameter.value, abs_tol=1e-5):
                    raise ValueError("The fader changed in Ableton. Refresh before applying.")
                if not parameter.is_enabled or parameter.automation_state != 0 or getattr(parameter, "state", 0) != 0:
                    raise ValueError("Fader is disabled or automated. No override was made.")
                value = data["value"]
                if type(value) not in (int, float) or not math.isfinite(value) or not parameter.min <= value <= parameter.max:
                    raise ValueError("Fader value is outside Live's range.")
                written = True
                parameter.value = value
                _, _, result = inspect(data)
                if not math.isclose(result["value"], value, abs_tol=1e-5):
                    raise ValueError("Fader readback differs; inspect before retrying.")
                result.update(status="verified", summary="Track fader read back as " + result["display"])
            return (json.dumps(result),)
        except Exception as error:
            return (json.dumps({"status": "partial" if written else "failed", "summary": str(error)}),)
    handler.osc_server.add_handler("/live/beatmind/mixer", callback)
