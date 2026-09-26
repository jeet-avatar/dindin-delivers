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
      "unit": {"type": "string", "enum": ["Hz", "kHz", "ms", "s", "dB", "%", "native", "normalized", "label"]}},
     ["track", "path", "map_id", "control", "value", "unit"]),
]:
    AUTOMATION_TOOLS.append({"name": name, "description": description, "operation": operation,
                             "input_schema": {"type": "object", "properties": properties, "required": required, "additionalProperties": False}})


async def execute_automation(name, data, send):
    definition = next(item for item in AUTOMATION_TOOLS if item["name"] == name)
    errors = list(Draft202012Validator(definition["input_schema"]).iter_errors(data))
    if errors or ("path" in data and len(data["path"]) % 2 == 0):
        return {"status": "failed", "summary": errors[0].message if errors else "Invalid nested device path.", "steps": []}
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
        if definition["operation"] in {"set_control", "load_item"}:
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
