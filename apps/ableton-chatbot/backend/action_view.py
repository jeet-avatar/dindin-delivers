"""Keep musical execution and verified on-screen selection separate."""

import json

VIEWS_TOOL = {
    "name": "show_live_view",
    "description": "Show and independently verify an exact Ableton track, device, clip, automation lane, Session or Arrangement view. Changes selection only, never notes, sound, playback or approval. Musical tools automatically follow their targets.",
    "input_schema": {"type": "object", "additionalProperties": False, "properties": {
        "view": {"type": "string", "enum": ["track", "device", "clip", "automation", "arrangement", "session"]},
        "scope": {"type": "string", "enum": ["track", "return", "master"]},
        "track": {"type": "integer", "minimum": 0},
        "scene": {"type": "integer", "minimum": 0},
        "arrangement_clip": {"type": "integer", "minimum": 0},
        "path": {"type": "array", "minItems": 1, "maxItems": 9, "items": {"type": "integer", "minimum": 0}},
        "control": {"type": "string", "minLength": 1},
        "mixer": {"type": "string", "enum": ["volume", "pan", "send"]},
        "send": {"type": "integer", "minimum": 0}
    }, "required": ["view"]}
}


def target_for(name, data, result=None):
    after = result is not None
    if name == "show_live_view":
        return dict(data)
    if name.startswith(("create_", "duplicate_")) and name.endswith(("track", "scene")):
        if not after:
            source = {key: data[key] for key in ("track", "scene") if key in data}
            return {"view": "session", **source}
        if type(result.get("index")) is not int:
            return None
        index = result["index"]
        return ({"view": "session", "scene": index} if name.endswith("scene") else
                {"view": "track", "track": index, "scope": "return" if name == "create_return_track" else "track"})
    if name.startswith("delete_") and after:
        return None
    if name == "stop":
        return None  # A missing display extension must never prevent stopping playback.
    track = data.get("target_track", data.get("track"))
    scene = data.get("target_scene", data.get("scene"))
    target = {"track": track} if type(track) is int and track >= 0 else {}
    if "arrangement" in name:
        return {"view": "arrangement", **target}
    if name in {"apply_master_chain", "mix_check", "compare_bus_to_reference"}:
        return {"view": "device", "scope": "master"}
    if type(scene) is int and scene >= 0:
        target["scene"] = scene
        if "track" not in target or name == "fire_scene":
            return {"view": "session", **target}
        if name in {"get_clip_info", "get_clip_notes"} and (not after or result.get("has_clip") is False):
            return {"view": "session", **target}
        if name in {"create_clip", "duplicate_clip"} and not after:
            return {"view": "session", **target}
        target["view"] = "clip"
        if name == "write_clip_automation" and after:
            target["view"] = "automation"
            for field in ("path", "control", "mixer", "send"):
                if field in data:
                    target[field] = data[field]
            if result.get("control", {}).get("name"):
                target["control"] = result["control"]["name"]
        return target
    if "track" not in target:
        return None
    target["view"] = "track"
    if "path" in data:
        target.update(view="device", path=data["path"])
    elif type(data.get("device")) is int:
        target.update(view="device", path=[data["device"]])
    elif name.startswith("load_") or "device" in name or name == "inspect_track":
        target["view"] = "device"
    return target


async def focus_target(send, target):
    if target is None:
        return None
    try:
        # A second read proves the requested selection remained visible after the write.
        for operation in ("focus_view", "inspect_view"):
            address = "/live/beatmind/" + operation
            reply = await send(address, [json.dumps(target)], True, 4)
            if reply.get("status") != "ok" or reply.get("address") != address or len(reply.get("args", [])) != 1:
                raise ValueError(reply.get("summary") or "Live display extension is unavailable. Update and reload AbletonOSC before continuing.")
            if reply.get("display_window_checked") is not True:
                raise ValueError("Update BeatMind Bridge to verify that Ableton is visible and the Mac is unlocked.")
            result = json.loads(reply["args"][0])
            if result.get("status") != "verified" or result.get("target") != target:
                raise ValueError(result.get("summary", "Live did not confirm the intended display target."))
        return result
    except Exception as error:
        return {"status": "unverified", "target": target, "summary": str(error), "music_changed": False}


async def execute_with_view(name, data, send, execute):
    before = await focus_target(send, target_for(name, data))
    if before and before["status"] != "verified":
        return {"status": "failed", "summary": before["summary"] + " No musical action was started.",
                "view": before, "steps": []}
    if name == "show_live_view":
        return {"status": "observed", "summary": before["summary"], "view": before, "steps": []}
    result = await execute()
    if result.get("status") not in {"verified", "observed"}:
        return {**result, **({"view": before} if before else {})}
    target = target_for(name, data, result)
    if target and name.startswith("load_") and "track" in target:
        address = "/live/track/get/num_devices"
        try:
            reply = await send(address, [target["track"]], True, 4)
        except Exception as error:
            reply = {"status": "failed", "summary": str(error)}
        values = reply.get("args", [])
        if reply.get("status") == "ok" and reply.get("address") == address and len(values) == 2 and values[0] == target["track"] and type(values[1]) is int and values[1] > 0:
            target.update(view="device", path=[values[1] - 1])
        else:
            return {**result, "execution_status": result["status"], "status": "unverified",
                    "summary": result.get("summary", "") + " Loaded-device display could not be verified. Inspect; do not repeat the load.",
                    "view": {"status": "unverified", "target": target}}
    shown = await focus_target(send, target)
    if shown and shown["status"] != "verified":
        return {**result, "execution_status": result["status"], "status": "unverified",
                "summary": result.get("summary", "") + " The screen did not confirm the result. Inspect before repeating the command.",
                "view": shown}
    return {**result, **({"view": shown} if shown else {})}
