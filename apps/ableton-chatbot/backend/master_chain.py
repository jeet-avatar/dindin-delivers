"""Master chain on Live's Main track: a Limiter whose ceiling and gain come from the measured mix.

Values are chosen from Live's own parameter display curve (for example "-1.0 dB"), never guessed from the native
range. Needs the BeatMind master extension (beatmind_master.py) in AbletonOSC.
"""

import json
import re

SETUP = ("Install the updated BeatMind Ableton extension (beatmind_master.py, see AbletonOSC-Extensions in the "
         "Bridge download), then restart Ableton. The master chain is unavailable until then.")


def db_of(display):
    match = re.search(r"(-?inf|-?\d+(?:\.\d+)?)\s*dB", str(display))
    if not match:
        return None
    return float("-inf") if "inf" in match.group(1) else float(match.group(1))


def curve_points(payload):
    """The extension sends 101 display strings spanning the parameter's native range."""
    low, high, displays = payload["min"], payload["max"], payload["displays"]
    return [{"value": low + (high - low) * i / (len(displays) - 1), "display": d} for i, d in enumerate(displays)]


def closest(curve, target_db):
    points = [(abs(db - target_db), point) for point in curve if (db := db_of(point["display"])) is not None]
    if not points:
        raise ValueError("The parameter does not report decibel values.")
    return min(points, key=lambda item: item[0])[1]


async def apply(query, send, measured_lufs, target_lufs=-14.0, ceiling_dbtp=-1.0):
    """query(address, args) -> reply args; send(address, args) fire-and-forget."""
    try:
        devices = await query("/live/beatmind/master/devices", [])
    except RuntimeError:
        return {"status": "failed", "summary": SETUP, "error": SETUP, "steps": []}
    changed = []
    if "Limiter" not in devices:
        reply = await query("/live/beatmind/master/load", ["Limiter"])
        if not reply or reply[0] != "loaded":
            return {"status": "failed", "summary": "Ableton's Limiter could not be loaded on the Main track.", "steps": []}
        devices = await query("/live/beatmind/master/devices", [])
        changed.append("Loaded Limiter on Main.")
    index = len(devices) - 1 - devices[::-1].index("Limiter")
    if index != len(devices) - 1:
        return {"status": "failed", "summary": "The Limiter must be the last device on Main. Move it last in Ableton, then try again.",
                "steps": []}
    gain_db = round(max(0.0, min(12.0, target_lufs - measured_lufs)), 1)
    readback = {}
    params = json.loads((await query("/live/beatmind/master/parameters", [index]))[1])["parameters"]
    names = {p["name"] for p in params}
    gain_name = "Input Gain" if "Input Gain" in names else "Gain"  # Live 12 calls it Input Gain
    for name, target in (("Ceiling", ceiling_dbtp), (gain_name, gain_db)):
        reply = await query("/live/beatmind/master/curve", [index, name])
        if not reply or reply[0] != "ok":
            return {"status": "failed", "summary": f"Limiter {name} is not available: {reply[-1] if reply else 'no reply'}.", "steps": []}
        point = closest(curve_points(json.loads(reply[1])), target)
        result = await query("/live/beatmind/master/set", [index, name, float(point["value"])])
        if not result or result[0] != "ok":
            return {"status": "partial" if changed else "failed", "summary": f"Limiter {name} was not changed: {result[-1] if result else 'no reply'}.",
                    "steps": []}
        readback[name] = result[2]
        changed.append(f"Limiter {name} set to {result[2]}.")
    note = ("" if gain_db else " The mix is already at or above the loudness target, so the Limiter adds no gain; "
            "lower the loudest faders if the headroom check fails.")
    return {"status": "verified", "summary": " ".join(changed) + note,
            "master": {"devices": await query("/live/beatmind/master/devices", []), "limiter": readback,
                       "gain_db": gain_db, "target_lufs": target_lufs, "ceiling_dbtp": ceiling_dbtp},
            "next": "Record a new full-mix preview and run mix_check again to confirm loudness and true peak.",
            "steps": []}
