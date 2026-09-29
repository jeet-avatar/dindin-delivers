"""Typed automation operations shared by chat and the Live extension."""

import asyncio
import json
import math
from jsonschema import Draft202012Validator

PATH = {"type": "array", "items": {"type": "integer", "minimum": 0, "maximum": 4096}, "minItems": 1, "maxItems": 9}
TARGET = {"track": {"type": "integer", "minimum": 0}, "path": PATH}
PAGING = {"offset": {"type": "integer", "minimum": 0}, "limit": {"type": "integer", "minimum": 1, "maximum": 32}}
AUTOMATION_TOOLS = []
for name, operation, description, properties, required in [
    ("load_library_item", "load_item", "Load an exact discovered browser path, including plug-ins. No filename fallback. Use an empty track for plug-ins and never replace existing instruments. Verifies the appended device chain and type.",
     {"track": {"type": "integer", "minimum": 0}, "kind": {"type": "string", "enum": ["instrument", "effect"]},
      "category": {"type": "string", "enum": ["instruments", "audio_effects", "midi_effects", "plugins", "drums", "sounds"]},
      "folders": {"type": "array", "items": {"type": "string", "minLength": 1, "maxLength": 300}, "minItems": 1, "maxItems": 12}},
     ["track", "kind", "category", "folders"]),
    ("get_library_catalog", "catalog", "Browse the ACTUAL instrument, effect, plug-in and preset folders. Follow next_offset and folder entries to discover all choices. Never claim one page is a complete library.",
     {"category": {"type": "string", "enum": ["instruments", "audio_effects", "midi_effects", "plugins", "drums", "sounds", "samples", "packs", "user_library"]},
      "folders": {"type": "array", "items": {"type": "string", "minLength": 1, "maxLength": 300}, "minItems": 0, "maxItems": 12}, **PAGING}, ["category"]),
    ("get_track_device_tree", "device_tree", "Discover nested instrument/effect racks and POPULATED drum-pad notes from Live. Device paths alternate device, chain, device indices. Never infer pad mappings from General MIDI.",
     {"track": {"type": "integer", "minimum": 0}}, ["track"]),
    ("get_device_control_map", "control_map", "Map a real device's exposed filter, envelope, effect and plug-in controls, their native ranges, display units, enum choices, aliases and automation states. Use returned map_id for writes; follow pagination when reviewing all controls. Hidden plug-in controls are NOT mapped.",
     {**TARGET, **PAGING, "query": {"type": "string", "maxLength": 200}}, ["track", "path"]),
    ("set_device_control", "set_control", "Set a discovered control using its exact name or an unambiguous alias. Converts Hz/kHz, ms/s, dB, %, native values, normalized continuous values or enum labels WITHOUT probing by writes. Rejects stale maps, ambiguous names, disabled controls and existing automation. Reads back independently.",
     {**TARGET, "map_id": {"type": "string", "pattern": "^[a-f0-9]{24}$"},
      "control": {"type": "string", "minLength": 1, "maxLength": 200}, "value": {"type": ["number", "string"]},
      "unit": {"type": "string", "enum": ["Hz", "kHz", "ms", "s", "dB", "%", "ratio", "native", "normalized", "label"],
               "description": "Match Live's display: Hz/kHz, ms/s, dB, %, ratio for displays like '4.00 : 1' (value 4), label only for controls that list choices."}},
     ["track", "path", "map_id", "control", "value", "unit"]),
    ("write_clip_automation", "clip_envelope", "Store an automation ramp INSIDE a Session clip (a filter opening over a Build, a high-pass sweep before the Drop, a reverb or delay throw). It plays every time the clip plays and is recorded into the Arrangement. Points are beats from the clip start with values in the control's display unit; each point's curve shapes the move to the next point (default linear). Every automation needs a purpose and a reset. Replaces any earlier envelope for that control in that clip.",
     {"track": {"type": "integer", "minimum": 0}, "path": TARGET["path"], "scene": {"type": "integer", "minimum": 0},
      "map_id": {"type": "string", "pattern": "^[a-f0-9]{24}$"},
      "mixer": {"type": "string", "enum": ["volume", "pan", "send"],
                "description": "Automate the track's mixer instead of a device: volume, pan, or send (with 'send': 0 for return A, 1 for return B). Omit path/map_id/control for mixer targets; sends and volume use dB."},
      "send": {"type": "integer", "minimum": 0},
      "control": {"type": "string", "minLength": 1, "maxLength": 200},
      "unit": {"type": "string", "enum": ["Hz", "kHz", "ms", "s", "dB", "%", "ratio", "native", "normalized"]},
      "points": {"type": "array", "minItems": 2, "maxItems": 64, "items": {"type": "object", "properties": {
          "beat": {"type": "number", "minimum": 0}, "value": {"type": ["number", "string"]},
          "curve": {"type": "string", "enum": ["linear", "exponential", "logarithmic", "step"],
                    "description": "Shape from this point to the next: exponential for filter sweeps and risers, logarithmic for natural fades, step for gated or rhythmic moves, linear otherwise."}},
          "required": ["beat", "value"], "additionalProperties": False}},
      "steps_per_beat": {"type": "integer", "minimum": 1, "maximum": 16},
      "purpose": {"type": "string", "enum": ["tension", "release", "introduce", "remove", "clarity", "movement"],
                  "description": "The musical reason for this automation."},
      "reset": {"type": "string", "minLength": 3, "maxLength": 200,
                "description": "Where the control returns to its normal value (for example 'Drop clip holds 20 kHz'). Never assume it resets by itself."}},
     ["track", "scene", "unit", "points", "purpose", "reset"]),
    ("get_sidechain_sources", "sidechain", "List the tracks that can feed a Compressor's sidechain and its current source. Read-only.",
     {"track": {"type": "integer", "minimum": 0}, "device": {"type": "integer", "minimum": 0}}, ["track", "device"]),
    ("set_sidechain", "sidechain", "Route another track (normally the Kick) into a Compressor's sidechain input so the kick ducks this part. Use a source name exactly as get_sidechain_sources lists it; the routing is read back. Then switch the Compressor's sidechain on and set ratio, attack, release and threshold with set_device_control.",
     {"track": {"type": "integer", "minimum": 0}, "device": {"type": "integer", "minimum": 0},
      "source": {"type": "string", "minLength": 1, "maxLength": 120}}, ["track", "device", "source"]),
]:
    AUTOMATION_TOOLS.append({"name": name, "description": description, "operation": operation,
                             "input_schema": {"type": "object", "properties": properties, "required": required, "additionalProperties": False}})


# Enforced limits: (control name keywords, unit, maximum, why).
LIMITS = [(("feedback",), "%", 75.0, "delay feedback above 75% can run away"),
          (("resonance",), "%", 70.0, "high resonance creates sharp peaks while the filter moves"),
          (("dry/wet",), "%", 60.0, "a device wetter than 60% washes the part out; use a send for big throws")]
LOW_END_WORDS = ("kick", "bass", "sub")


def safety_problem(name, data, track_name=""):
    """Why this write is refused, or None."""
    control = str(data.get("control") or "").casefold()
    values = [p["value"] for p in data.get("points", []) if isinstance(p.get("value"), (int, float))]
    if isinstance(data.get("value"), (int, float)):
        values.append(data["value"])
    for words, unit, maximum, why in LIMITS:
        if any(w in control for w in words) and data.get("unit") == unit and values and max(values) > maximum:
            return f"{data['control']} is limited to {maximum:g}{unit}: {why}."
    if name != "write_clip_automation":
        return None
    if data.get("mixer") in ("send", "pan") and any(w in track_name.casefold() for w in LOW_END_WORDS):
        return (f"{track_name} carries the low end, so it stays dry and centred (no send or pan automation). "
                "Move the parts around it instead.")
    if (data.get("mixer") == "volume" and len(values) >= 2 and max(values) - min(values) > 2
            and data.get("purpose") not in ("introduce", "remove")):
        return "Volume rides stay within 2 dB; a bigger change must be an entry or exit fade (purpose introduce or remove)."
    return None


DENSITY_LIMIT = 5


def note_density(registry, data, result):
    """Record the automated control and warn when one section has too many moving at once."""
    target = data.get("control") or (f"send {data.get('send', 0)}" if data.get("mixer") == "send" else data.get("mixer"))
    controls = registry.setdefault(data["scene"], set())
    controls.add((data["track"], target))
    if len(controls) > DENSITY_LIMIT:
        result = {**result, "density_warning": (
            f"{len(controls)} controls are now automated in this section. More than {DENSITY_LIMIT} moving at once "
            "sounds busy and blurs the build; keep one or two primary moves and make the rest subtle or remove them.")}
    return result


def numeric_value(data):
    """The model sometimes sends numbers as text ("4000", "2.5"); Live's extension needs a real number."""
    value = data.get("value")
    if data.get("unit") not in (None, "label") and isinstance(value, str):
        try:
            number = float(value.strip().replace(",", ""))
        except ValueError:
            return data
        if math.isfinite(number):
            return {**data, "value": number}
    return data


async def execute_automation(name, data, send, track_name=""):
    definition = next(item for item in AUTOMATION_TOOLS if item["name"] == name)
    data = numeric_value(data)
    if name == "write_clip_automation" and not data.get("mixer") and not all(k in data for k in ("path", "map_id", "control")):
        return {"status": "failed", "summary": "A device automation needs path, map_id and control (or use mixer: volume, pan or send).", "steps": []}
    if name == "write_clip_automation":
        data = {**data, "points": [{**point, "value": numeric_value({"value": point["value"], "unit": data["unit"]})["value"]}
                                   for point in data["points"]]}
    errors = list(Draft202012Validator(definition["input_schema"]).iter_errors(data))
    if errors or ("path" in data and len(data["path"]) % 2 == 0):
        return {"status": "failed", "summary": errors[0].message if errors else "Invalid nested device path.", "steps": []}
    problem = safety_problem(name, data, track_name) if name in ("write_clip_automation", "set_device_control") else None
    if problem:
        return {"status": "failed", "summary": "Not written: " + problem, "steps": []}
    steps = []
    written = False

    async def call(operation, payload):
        address = "/live/beatmind/" + operation
        response = await send(address, [json.dumps(payload)], True, 8)
        steps.append({"number": len(steps) + 1, "kind": "command" if operation in {"set_control", "load_item"} else "readback",
                      "address": address, "args": [payload], "result": response, "status": response.get("status"), "elapsed_ms": 0})
        if response.get("status") != "ok" or response.get("address") != address or len(response.get("args", [])) != 1:
            raise ValueError("The Live automation extension did not respond. Reload AbletonOSC; no fallback mapping was used.")
        return json.loads(response["args"][0])

    try:
        if name == "set_sidechain":
            data = {**data, "operation": "set"}
        if definition["operation"] in {"set_control", "load_item", "clip_envelope"} or name == "set_sidechain":
            # A reply can be lost after a write, so uncertainty must remain explicit.
            written = True
        result = await call(definition["operation"], data)
        if name == "load_library_item" and result.get("status") == "sent":
            devices = []
            for _ in range(6):
                await asyncio.sleep(0.2)
                tree = await call("device_tree", {"track": data["track"]})
                devices = tree.get("devices", [])
                if len(devices) == len(result["before"]) + 1:
                    break
            if (len(devices) != len(result["before"]) + 1
                    or [device["name"] for device in devices[:-1]] != result["before"]
                    or (devices[-1]["type"] == 1) != (data["kind"] == "instrument")):
                raise ValueError("Loaded device chain/type did not match the request. Inspect before retrying.")
            result.update(status="verified", devices=devices,
                          summary="Exact source loaded and device chain verified: " + " / ".join(result["source_path"]))
        if name == "set_sidechain" and result.get("status") == "observed":
            if result.get("source") != data["source"]:
                raise ValueError(f"Sidechain source reads back as {result.get('source')!r}, not {data['source']!r}.")
            result.update(status="verified", summary=f"Sidechain source set to {data['source']} and read back from Live.")
        if name == "set_device_control" and result.get("status") == "verified":
            await asyncio.sleep(0.15)
            control = result["control"]
            observed = await call("control_map", {"track": data["track"], "path": data["path"], "query": control["name"]})
            matches = [p for p in observed.get("parameters", []) if p["index"] == control["index"]]
            if (observed.get("map_id") != data["map_id"] or len(matches) != 1
                    or not math.isclose(matches[0]["value"], control["value"], rel_tol=1e-5, abs_tol=1e-4)):
                raise ValueError("Independent control readback did not match. Inspect before repeating the write.")
            result["control"]["readback_display"] = matches[0]["display"]
        return {**result, "steps": steps}
    except (ValueError, KeyError, TypeError) as error:
        return {"status": "partial" if written else "failed", "summary": str(error), "error": str(error), "steps": steps}
