"""Live-side discovery and unit-aware parameter mapping. Never probe by writing."""

import hashlib
import json
import math
import re


ALIASES = {
    "filter_cutoff": {"cutoff", "frequency", "freq", "filterfreq", "filterfrequency", "filtercutoff", "fltfrequency", "lpfreq"},
    "filter_resonance": {"resonance", "res", "filterres", "filterresonance", "lpres"},
    "filter_enabled": {"filteron", "filter", "filterenabled", "lpon"},
    "filter_type": {"filtertype", "filtermode", "lptype"},
    "attack": {"attack", "ampattack", "envattack", "aattack"},
    "decay": {"decay", "ampdecay", "envdecay", "adecay"},
    "sustain": {"sustain", "ampsustain", "envsustain", "asustain"},
    "release": {"release", "amprelease", "envrelease", "arelease"},
    "dry_wet": {"drywet", "mix", "wetdry"},
    "drive": {"drive", "filterdrive", "inputdrive"},
    "device_enabled": {"deviceon"},
}


# macOS drops UDP datagrams over 9216 bytes (net.inet.udp.maxdgram); leave room for the OSC framing.
MAX_REPLY = 9000


def normalized(name):
    return re.sub(r"[^a-z0-9]", "", name.casefold())


def resolve_parameter(parameters, control):
    wanted = normalized(control)
    exact = [(i, p) for i, p in enumerate(parameters) if normalized(p.name) == wanted]
    matches = exact or [(i, p) for i, p in enumerate(parameters)
                        if normalized(p.name) in ALIASES.get(control, set())]
    if len(matches) != 1:
        candidates = [p.name for _, p in matches]
        raise ValueError("Control is unavailable or ambiguous. Use an exact exposed parameter name. Candidates: " + repr(candidates))
    return matches[0]


def parse_display(text):
    # Gain-style controls show "-inf dB" at the bottom of their range (Compressor Threshold, Utility Gain).
    ratio = re.fullmatch(r"\s*(\d+(?:\.\d*)?|inf)\s*:\s*1\s*", text)  # Compressor ratio, e.g. "4.00 : 1"
    if ratio:
        return float(ratio[1]), "ratio"
    match = re.fullmatch(r"\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+|inf))\s*(Hz|kHz|ms|s|dB|%)\s*", text.replace("\u2212", "-"), re.I)
    if not match:
        raise ValueError("Live does not expose a supported numeric display unit for this control.")
    number, unit = float(match[1]), match[2].casefold()
    if unit == "khz":
        return number * 1000, "hz"
    if unit == "s":
        return number * 1000, "ms"
    return number, unit


def native_value(parameter, value, unit):
    if not parameter.is_enabled:
        raise ValueError("This parameter is disabled or controlled by a macro/remote assignment.")
    if getattr(parameter, "state", 0) != 0:
        raise ValueError("This control is inactive. Inspect and enable its exposed parent mode before changing it.")
    if unit == "label":
        choices = list(parameter.value_items) if parameter.is_quantized else []
        matches = [i for i, label in enumerate(choices) if str(label).casefold() == str(value).casefold()]
        if len(matches) != 1 or len(choices) != int(parameter.max - parameter.min + 1):
            raise ValueError("Enum label is unavailable or ambiguous; inspect the control map.")
        return parameter.min + matches[0]
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError("A finite numeric value is required.")
    if unit == "native":
        candidate = value
    elif unit == "normalized":
        if parameter.is_quantized or not 0 <= value <= 1:
            raise ValueError("Normalized values require a continuous control and a value from 0 to 1.")
        candidate = parameter.min + value * (parameter.max - parameter.min)
    else:
        if parameter.is_quantized:
            raise ValueError("Use a choice label or native integer for discrete controls.")
        target, target_unit = (float(value), "ratio") if unit == "ratio" else parse_display(str(value) + " " + unit)
        samples = []
        for i in range(33):
            native = parameter.min + (parameter.max - parameter.min) * i / 32
            display, display_unit = parse_display(parameter.str_for_value(native))
            if display_unit != target_unit:
                raise ValueError("Requested unit does not match Live's displayed unit.")
            samples.append((native, display))
        ascending = samples[-1][1] > samples[0][1]
        if samples[-1][1] == samples[0][1] or any(
                (b[1] < a[1] if ascending else b[1] > a[1]) for a, b in zip(samples, samples[1:])):
            raise ValueError("The exposed display conversion is not monotonic; no parameter was changed.")
        if not min(samples[0][1], samples[-1][1]) <= target <= max(samples[0][1], samples[-1][1]):
            raise ValueError("Requested value is outside the displayed control range.")
        lo, hi = parameter.min, parameter.max
        for _ in range(32):
            candidate = (lo + hi) / 2
            current, _ = parse_display(parameter.str_for_value(candidate))
            if abs(current - target) <= max(abs(target) * 0.002, 0.01):
                break
            if (current < target) == ascending:
                lo = candidate
            else:
                hi = candidate
        actual, _ = parse_display(parameter.str_for_value(candidate))
        if abs(actual - target) > max(abs(target) * 0.005, 0.02):
            raise ValueError("Live's display precision cannot represent the requested value accurately.")
    if not parameter.min <= candidate <= parameter.max:
        raise ValueError("Value is outside the native parameter range.")
    if parameter.is_quantized and int(candidate) != candidate:
        raise ValueError("Discrete controls require an integer native value.")
    return candidate


def map_id(device):
    fields = [device.class_name, device.name,
              [(p.name, p.min, p.max, bool(p.is_quantized)) for p in device.parameters]]
    return hashlib.sha256(json.dumps(fields).encode()).hexdigest()[:24]


def register(handler, app):
    def device_at(data):
        path = data["path"]
        if not path or len(path) % 2 == 0 or len(path) > 9 or any(type(i) is not int or i < 0 for i in path):
            raise ValueError("Device path must alternate device, chain, device indices.")
        devices = handler.song.tracks[data["track"]].devices
        device = devices[path[0]]
        for i in range(1, len(path), 2):
            device = device.chains[path[i]].devices[path[i + 1]]
        return device

    def control_map(data):
        device = device_at(data)
        parameters = []
        query = data.get("query", "").casefold()
        for index, parameter in enumerate(device.parameters):
            aliases = [key for key, values in ALIASES.items() if normalized(parameter.name) in values]
            if query and query not in (parameter.name + " " + " ".join(aliases)).casefold():
                continue
            choices = list(parameter.value_items) if parameter.is_quantized else []
            parameters.append({"index": index, "name": parameter.name, "aliases": aliases,
                               "min": parameter.min, "max": parameter.max, "value": parameter.value,
                               "display": parameter.str_for_value(parameter.value),
                               "enabled": bool(parameter.is_enabled), "quantized": bool(parameter.is_quantized),
                               "state": int(getattr(parameter, "state", 0)),
                               "automation_state": int(parameter.automation_state),
                               "choices": choices[:128], "choices_complete": len(choices) <= 128})
        offset, limit = data.get("offset", 0), data.get("limit", 32)
        return {"status": "observed", "device_name": device.name, "map_id": map_id(device),
                "parameters": parameters[offset:offset + limit], "total": len(parameters),
                "next_offset": offset + limit if offset + limit < len(parameters) else None,
                "summary": "Discovered exposed controls, units, enum choices and automation states."}

    def set_control(data):
        device = device_at(data)
        if data["map_id"] != map_id(device):
            raise ValueError("Device mapping changed. Discover the controls again before writing.")
        index, parameter = resolve_parameter(device.parameters, data["control"])
        if parameter.automation_state != 0:
            raise ValueError("Existing automation controls this parameter. No automation was overridden.")
        value = native_value(parameter, data["value"], data["unit"])
        previous = parameter.value
        try:
            parameter.value = value
            actual = parameter.value
            display = parameter.str_for_value(actual)
        except Exception as error:
            return {"status": "partial", "summary": "Write was attempted; inspect the parameter before retrying: " + str(error)}
        if not math.isclose(actual, value, rel_tol=1e-5, abs_tol=1e-4):
            return {"status": "partial", "summary": "Control readback mismatch; inspect before retrying.",
                    "expected": value, "actual": actual, "previous": previous}
        return {"status": "verified", "summary": parameter.name + " = " + display,
                "control": {"index": index, "name": parameter.name, "previous": previous,
                            "value": actual, "display": parameter.str_for_value(actual),
                            "map_id": data["map_id"]}}

    def load_item(data):
        category = data["category"]
        if category not in {"instruments", "audio_effects", "midi_effects", "plugins", "drums", "sounds"}:
            raise ValueError("Unsupported source category")
        if ((category in {"instruments", "drums", "sounds"} and data["kind"] != "instrument")
                or (category in {"audio_effects", "midi_effects"} and data["kind"] != "effect")):
            raise ValueError("Source category and requested device type do not match.")
        track = handler.song.tracks[data["track"]]
        before = list(track.devices)
        if data["kind"] == "instrument" and any(device.type == 1 for device in before):
            raise ValueError("An instrument already exists on this track. No replacement was attempted.")
        if category == "plugins" and before:
            raise ValueError("Load a plug-in onto an empty track first; its device type cannot be verified before loading.")
        item = getattr(app.browser, category)
        for name in data["folders"]:
            matches = [child for child in item.children if child.name == name]
            if len(matches) != 1:
                raise ValueError("Exact source path is missing or ambiguous; no fallback was attempted.")
            item = matches[0]
        if not item.is_loadable:
            raise ValueError("Select a loadable item, not a folder.")
        previous = handler.song.view.selected_track
        try:
            handler.song.view.selected_track = track
            app.browser.load_item(item)
        except Exception as error:
            return {"status": "partial", "summary": "Load was attempted; inspect the track: " + str(error)}
        finally:
            handler.song.view.selected_track = previous
        return {"status": "sent", "before": [device.name for device in before],
                "source_path": [category] + data["folders"], "summary": "Exact browser item requested; awaiting device-chain readback."}

    def catalog(data):
        category = data["category"]
        if category not in {"instruments", "audio_effects", "midi_effects", "plugins", "drums", "sounds", "samples", "packs", "user_library"}:
            raise ValueError("Unsupported browser category")
        item = getattr(app.browser, category)
        for name in data.get("folders", []):
            children = [child for child in item.children if child.name == name]
            if len(children) != 1:
                raise ValueError("Browser folder is unavailable or ambiguous")
            item = children[0]
        children = list(item.children)
        offset, limit = data.get("offset", 0), data.get("limit", 30)
        return {"status": "observed", "category": category, "folders": data.get("folders", []),
                "items": [{"name": child.name, "folder": bool(child.is_folder), "loadable": bool(child.is_loadable)}
                          for child in children[offset:offset + limit]],
                "total": len(children), "next_offset": offset + limit if offset + limit < len(children) else None,
                "summary": "Read actual browser items; no instrument or plug-in was loaded."}

    def device_tree(data, compact=0):
        count = [0]
        truncated = [False]
        def walk(devices, prefix, depth):
            result = []
            for index, device in enumerate(devices):
                if count[0] >= 200:
                    truncated[0] = True
                    break
                count[0] += 1
                path = prefix + [index]
                node = {"name": device.name, "class_name": device.class_name, "type": int(device.type), "path": path,
                        "parameter_count": len(device.parameters), "chains": [], "drum_pads": []}
                if getattr(device, "can_have_chains", False):
                    chains = list(device.chains)
                    drum_rack = getattr(device, "can_have_drum_pads", False)
                    if compact and drum_rack:
                        # Compact forms for big kits. 1: chains without their devices. 2: no chain list.
                        # 3: only the number of populated pads.
                        if compact == 1:
                            node["chains"] = [{"name": chain.name, "index": i, "devices": []} for i, chain in enumerate(chains)]
                        truncated[0] = True
                    elif depth < 4:
                        node["chains"] = [{"name": chain.name, "index": i, "devices": walk(chain.devices, path + [i], depth + 1)}
                                          for i, chain in enumerate(chains)]
                    elif chains:
                        truncated[0] = True
                    if getattr(device, "can_have_drum_pads", False):
                        pads = [pad for pad in device.drum_pads if pad.chains]
                        if compact >= 3:
                            node["drum_pad_count"] = len(pads)
                        elif compact == 2:
                            node["drum_pads"] = [{"note": pad.note, "name": pad.name} for pad in pads]
                        else:
                            node["drum_pads"] = [{"note": pad.note, "name": pad.name,
                                                 "chain_indices": [chains.index(chain) for chain in pad.chains if chain in chains]}
                                                for pad in pads]
                result.append(node)
            return result
        return {"status": "observed", "devices": walk(handler.song.tracks[data["track"]].devices, [], 0),
                "complete": not truncated[0],
                "summary": "Read nested device paths and populated drum-pad MIDI mappings." +
                           ({1: " Compact: Drum Rack pad chains are listed without their devices.",
                             2: " Compact: Drum Rack pads are listed by note and name only.",
                             3: " Compact: only the number of Drum Rack pads is given; inspect a pad path for details."}.get(compact, ""))}

    def clip_envelope(data):
        """Write a stored automation ramp into a Session clip, so it plays with the clip and records into the
        Arrangement. Points are (beat, value) in the control's display unit; steps are linear in that unit."""
        slot = handler.song.tracks[data["track"]].clip_slots[data["scene"]]
        if not slot.has_clip:
            raise ValueError("There is no clip in that slot to automate.")
        clip = slot.clip
        device = device_at(data)
        if data["map_id"] != map_id(device):
            raise ValueError("Device mapping changed. Discover the controls again before writing.")
        index, parameter = resolve_parameter(device.parameters, data["control"])
        points = sorted(data["points"], key=lambda point: point["beat"])
        if len(points) < 2 or points[0]["beat"] < 0 or points[-1]["beat"] > clip.length + 1e-6:
            raise ValueError("Give at least two points inside the clip (0 to %.2f beats)." % clip.length)
        step = 1.0 / max(1, min(16, int(data.get("steps_per_beat", 4))))
        clip.clear_envelope(parameter)
        envelope = clip.automation_envelope(parameter) or clip.create_automation_envelope(parameter)
        if envelope is None:
            raise ValueError("Live does not allow automation of this control in a clip.")
        written = 0
        for start, end in zip(points, points[1:]):
            beat = start["beat"]
            while beat < end["beat"] - 1e-9:
                fraction = (beat - start["beat"]) / (end["beat"] - start["beat"])
                value = start["value"] + (end["value"] - start["value"]) * fraction
                native = native_value(parameter, value, data["unit"])
                envelope.insert_step(beat, min(step, end["beat"] - beat), native)
                written += 1
                beat += step
        first = parameter.str_for_value(envelope.value_at_time(points[0]["beat"]))
        last = parameter.str_for_value(envelope.value_at_time(max(points[-1]["beat"] - step / 2, 0)))
        return {"status": "verified", "summary": "%s automated in the clip from %s to %s over %.1f beats (%d steps)." % (
                    parameter.name, first, last, points[-1]["beat"] - points[0]["beat"], written),
                "control": {"index": index, "name": parameter.name}, "start_display": first, "end_display": last}

    for operation, function in {"catalog": catalog, "device_tree": device_tree, "clip_envelope": clip_envelope,
                                "control_map": control_map, "set_control": set_control, "load_item": load_item}.items():
        def callback(params, function=function):
            try:
                data = json.loads(params[0])
                encoded = json.dumps(function(data))
                for level in (1, 2, 3):
                    if len(encoded.encode()) <= MAX_REPLY or function is not device_tree:
                        break
                    encoded = json.dumps(device_tree(data, compact=level))
                if len(encoded.encode()) > MAX_REPLY:
                    raise ValueError("The answer is too large for one message. Narrow the query or use a smaller page size.")
                return (encoded,)
            except Exception as error:
                return (json.dumps({"status": "failed", "summary": str(error), "error": str(error)}),)
        handler.osc_server.add_handler("/live/beatmind/" + operation, callback)
