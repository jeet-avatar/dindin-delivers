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


def curve_value(start, end, fraction, curve):
    """Value at `fraction` (0-1) of a segment. Exponential moves evenly by ear for frequencies (log space);
    logarithmic eases out (natural fades); step holds the start value until the next point."""
    if curve == "step":
        return start
    if curve == "exponential":
        if start > 0 and end > 0:
            return start * (end / start) ** fraction
        return start + (end - start) * fraction ** 2  # ease-in for values that cross zero (dB, %)
    if curve == "logarithmic":
        return start + (end - start) * (1 - (1 - fraction) ** 2)
    return start + (end - start) * fraction


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


def native_value(parameter, value, unit, nearest=False):
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
    if unit == "dB" and str(value).strip().replace("\u2212", "-").casefold() in ("-inf", "-infinity"):
        # Off: the end of the range that Live shows as "-inf dB" (a send or gain turned fully down).
        for end in (parameter.min, parameter.max):
            if parse_display(parameter.str_for_value(end))[0] == float("-inf"):
                return end
        raise ValueError("This control has no -inf dB (off) position.")
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError("A finite numeric value is required (or -inf for a dB control that can be fully off).")
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
        # A single setting must be exact; an automation ramp uses the nearest value Live can show.
        if not nearest and abs(actual - target) > max(abs(target) * 0.005, 0.02):
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
        Arrangement. Points are (beat, value) in the control's display unit, shaped by each point's curve."""
        slot = handler.song.tracks[data["track"]].clip_slots[data["scene"]]
        if not slot.has_clip:
            raise ValueError("There is no clip in that slot to automate.")
        clip = slot.clip
        mixer_target = data.get("mixer")
        if mixer_target:
            # The track's own mixer: volume, pan or a send to a return track (reverb/delay rides).
            mixer = handler.song.tracks[data["track"]].mixer_device
            if mixer_target == "send":
                sends = list(mixer.sends)
                if not 0 <= int(data.get("send", -1)) < len(sends):
                    raise ValueError("That send does not exist; the set has %d return tracks." % len(sends))
                parameter, index = sends[int(data["send"])], int(data["send"])
            elif mixer_target in ("volume", "pan"):
                parameter, index = (mixer.volume if mixer_target == "volume" else mixer.panning), -1
            else:
                raise ValueError("Mixer target must be volume, pan or send.")
        else:
            device = device_at(data)
            if data["map_id"] != map_id(device):
                raise ValueError("Device mapping changed. Discover the controls again before writing.")
            index, parameter = resolve_parameter(device.parameters, data["control"])
        points = sorted(data["points"], key=lambda point: point["beat"])
        if (len(points) < 2 or any(not math.isfinite(point["beat"]) for point in points)
                or points[0]["beat"] < 0 or points[-1]["beat"] > clip.length + 1e-6):
            raise ValueError("Give at least two points inside the clip (0 to %.2f beats)." % clip.length)
        if any(end["beat"] <= start["beat"] for start, end in zip(points, points[1:])):
            raise ValueError("Automation points must have distinct beat positions.")
        step = 1.0 / max(1, min(16, int(data.get("steps_per_beat", 4))))
        # Validate and convert the entire replacement before clearing an approved envelope.
        for point in points:
            native_value(parameter, point["value"], data["unit"], nearest=True)
        planned = []
        for start, end in zip(points, points[1:]):
            if (start.get("curve") != "step" and str(start["value"]) != str(end["value"])
                    and "inf" in (str(start["value"]) + str(end["value"])).casefold()):
                raise ValueError("A move to or from -inf dB (off) must use a step curve; ramp from a finite level such as -60 dB instead.")
        for start, end in zip(points, points[1:]):
            span = end["beat"] - start["beat"]
            count = max(1, int(math.ceil(span / step - 1e-9)))
            for i in range(count):
                beat = start["beat"] + i * step
                # Spread the steps so the first holds the start value and the last holds the end value exactly.
                fraction = i / (count - 1) if count > 1 else 1.0
                if start.get("curve") == "step":
                    fraction = 0.0
                if str(start["value"]) == str(end["value"]):
                    value = start["value"]  # a hold, including -inf (off) held flat
                else:
                    value = curve_value(start["value"], end["value"], fraction, start.get("curve", "linear"))
                native = native_value(parameter, value, data["unit"], nearest=True)
                planned.append((beat, min(step, end["beat"] - beat), native))
        # Live's insert_step restores the old value after its duration. Keep the
        # final point active through the loop boundary, including step resets.
        if points[-1]["beat"] < clip.length:
            native = native_value(parameter, points[-1]["value"], data["unit"], nearest=True)
            planned.append((points[-1]["beat"], clip.length - points[-1]["beat"], native))
        envelope = clip.automation_envelope(parameter) or clip.create_automation_envelope(parameter)
        if envelope is None:
            raise ValueError("Live does not allow automation of this control in a clip.")
        clip.clear_envelope(parameter)
        envelope = clip.automation_envelope(parameter) or clip.create_automation_envelope(parameter)
        if envelope is None:
            raise ValueError("Automation was cleared but could not be recreated; inspect this clip before retrying.")
        for beat, length, native in planned:
            envelope.insert_step(beat, length, native)
        written = len(planned)
        tolerance = max(1e-6, (parameter.max - parameter.min) * 1e-5)
        observed = [envelope.value_at_time(beat + length / 2) for beat, length, _ in planned]
        if any(not math.isfinite(actual) or abs(actual - native) > tolerance
               for actual, (_, _, native) in zip(observed, planned)):
            return {"status": "partial", "summary": "Automation was written but its readback differs; inspect the clip before retrying.",
                    "control": {"index": index, "name": parameter.name}}
        # Read inside the first and last steps; exactly at a step boundary Live can report the previous value.
        first = parameter.str_for_value(observed[0])
        last = parameter.str_for_value(observed[-1])
        return {"status": "verified", "summary": "%s automated in the clip from %s to %s over %.1f beats (%d steps)." % (
                    parameter.name, first, last, points[-1]["beat"] - points[0]["beat"], written),
                "control": {"index": index, "name": parameter.name}, "start_display": first, "end_display": last}

    def clip_automation(data):
        """Read the automation stored in a Session clip: which controls move and their values over the clip.
        Read-only. With no target, lists every automated control on the track's devices and mixer."""
        track = handler.song.tracks[data["track"]]
        slot = track.clip_slots[data["scene"]]
        if not slot.has_clip:
            return {"status": "observed", "has_clip": False, "automations": [], "summary": "There is no clip in that slot."}
        clip = slot.clip
        mixer = track.mixer_device
        targets = [({"mixer": "volume"}, mixer.volume), ({"mixer": "pan"}, mixer.panning)]
        targets += [({"mixer": "send", "send": i}, send) for i, send in enumerate(mixer.sends)]

        def walk(devices, prefix, depth):
            for index, device in enumerate(devices):
                path = prefix + [index]
                for parameter in device.parameters:
                    targets.append(({"path": path, "device": device.name, "control": parameter.name}, parameter))
                if depth < 3 and getattr(device, "can_have_chains", False):  # racks and Drum Rack pads alike
                    for chain_index, chain in enumerate(device.chains):
                        walk(chain.devices, path + [chain_index], depth + 1)
        walk(track.devices, [], 0)
        wanted = {key: data[key] for key in ("mixer", "send", "path", "control") if key in data}
        if wanted:
            targets = [(t, p) for t, p in targets if all(t.get(k) == v for k, v in wanted.items())]
        length = clip.length
        def envelope_of(parameter):
            try:
                return clip.automation_envelope(parameter)
            except Exception:  # Some controls cannot hold clip automation.
                return None
        automated = [(t, p, envelope_of(p)) for t, p in targets]
        automated = [item for item in automated if item[2] is not None]

        def read(samples):
            # Just inside each time: exactly on a step boundary Live can report the previous step.
            times = [min(length * i / (samples - 1) + 0.01, length - 0.01) for i in range(samples)]
            return [{**target, "name": parameter.name,
                     "points": [[round(t, 2), parameter.str_for_value(envelope.value_at_time(t))] for t in times]}
                    for target, parameter, envelope in automated]
        requested = max(2, min(33, int(data.get("samples", 9))))
        for samples in sorted({requested, min(requested, 5), 3, 2}, reverse=True):
            found = read(samples)
            if len(json.dumps(found).encode()) <= MAX_REPLY - 600:
                break
        return {"status": "observed", "has_clip": True, "clip_length_beats": length, "automations": found,
                "summary": ("%d automated control(s) in this clip: %s." % (len(found), ", ".join(a["name"] for a in found)))
                           if found else "No automation is stored in this clip."}

    def mixer_state(data):
        """Read a track's mixer as Live displays it: volume, pan and every send (reverb/delay levels). Read-only."""
        track = handler.song.tracks[data["track"]]
        mixer = track.mixer_device
        returns = list(handler.song.return_tracks)
        show = lambda parameter: {"display": parameter.str_for_value(parameter.value),
                                  "automated": int(parameter.automation_state) != 0}
        return {"status": "observed", "track": data["track"], "name": track.name,
                "volume": show(mixer.volume), "pan": show(mixer.panning),
                "sends": [{"send": i, "return": returns[i].name if i < len(returns) else None, **show(send)}
                          for i, send in enumerate(mixer.sends)],
                "summary": "%s: volume %s, sends %s." % (track.name, mixer.volume.str_for_value(mixer.volume.value),
                           ", ".join("%s %s" % (returns[i].name if i < len(returns) else i, send.str_for_value(send.value))
                                     for i, send in enumerate(mixer.sends)) or "none")}

    def note_feel(data):
        """Humanize chosen notes in a Session clip with Live's own note editing: chance (probability), velocity
        deviation and a timing nudge in milliseconds. Notes are chosen by pitch and, optionally, by their position in
        the bar. Everything else about the notes is kept."""
        clip = handler.song.tracks[data["track"]].clip_slots[data["scene"]].clip
        if clip is None or not clip.is_midi_clip:
            raise ValueError("There is no MIDI clip in that slot.")
        notes = clip.get_notes_extended(0, 128, 0.0, clip.length)
        positions = data.get("positions_in_bar")  # beats within a 4-beat bar, e.g. [0.5, 1.5] for off-beats
        beat_ms = 60000.0 / handler.song.tempo
        nudge = float(data.get("nudge_ms", 0.0)) / beat_ms
        if abs(float(data.get("nudge_ms", 0.0))) > 30:
            raise ValueError("Keep timing nudges within 30 ms; larger moves are rewrites, not feel.")
        chosen = []
        for note in notes:
            if data.get("pitches") and note.pitch not in data["pitches"]:
                continue
            if positions is not None and not any(abs((note.start_time % 4.0) - p) < 0.02 for p in positions):
                continue
            chosen.append(note)
        if not chosen:
            raise ValueError("No notes match those pitches and positions.")
        for note in chosen:
            if "probability" in data:
                note.probability = max(0.0, min(1.0, float(data["probability"])))
            if "velocity_deviation" in data:
                note.velocity_deviation = max(-127.0, min(127.0, float(data["velocity_deviation"])))
            if nudge:
                note.start_time = max(0.0, note.start_time + nudge)
        clip.apply_note_modifications(notes)
        after = clip.get_notes_extended(0, 128, 0.0, clip.length)
        by_id = {note.note_id: note for note in after}
        checked = [by_id[n.note_id] for n in chosen if n.note_id in by_id]
        return {"status": "verified" if len(checked) == len(chosen) else "partial",
                "summary": "%d note(s) changed: %s" % (len(checked), ", ".join(
                    part for part in ("chance %d%%" % round(100 * checked[0].probability) if "probability" in data else "",
                                      "velocity deviation %+d" % round(checked[0].velocity_deviation) if "velocity_deviation" in data else "",
                                      "nudged %+.1f ms" % float(data["nudge_ms"]) if nudge else "") if part)),
                "changed_notes": [{"pitch": n.pitch, "start": round(n.start_time, 4), "duration": round(n.duration, 4),
                                   "probability": round(n.probability, 2),
                           "velocity": n.velocity, "velocity_deviation": n.velocity_deviation} for n in checked[:40]]}

    def groove(data):
        """Live's grooves. action: library (browse the groove library), pool (grooves loaded in this set and their
        amounts), clips (which clips use a groove), load (a library item by folder path), assign (a groove from the pool
        to a clip, or none), amounts
        (set a pool groove's timing, random, velocity and quantize amounts, 0-100)."""
        action = data["action"]
        pool = list(handler.song.groove_pool.grooves)
        describe = lambda i, g: {"index": i, "name": g.name, "timing": round(g.timing_amount, 1),
                                 "random": round(g.random_amount, 1), "velocity": round(g.velocity_amount, 1),
                                 "quantize": round(g.quantization_amount, 1)}
        def groove_library():
            # Live's API has no groove category; the factory grooves are in Packs > Core Library > Grooves.
            item = app.browser.packs
            for name in ("Core Library", "Grooves"):
                children = [child for child in item.children if child.name == name]
                if len(children) != 1:
                    raise ValueError("Live's Core Library grooves are not installed.")
                item = children[0]
            return item
        if action == "library":
            item = groove_library()
            for name in data.get("folders", []):
                children = [child for child in item.children if child.name == name]
                if len(children) != 1:
                    raise ValueError("Groove folder is unavailable or ambiguous.")
                item = children[0]
            children = list(item.children)
            return {"status": "observed", "folders": data.get("folders", []),
                    "items": [{"name": c.name, "folder": bool(c.is_folder), "loadable": bool(c.is_loadable)} for c in children[:80]],
                    "total": len(children), "summary": "Read the groove library; nothing was loaded."}
        if action == "pool":
            amount = round(100 * handler.song.groove_amount)
            return {"status": "observed", "grooves": [describe(i, g) for i, g in enumerate(pool)], "global_amount": amount,
                    "summary": "%d groove(s) in the Groove Pool; global Groove Amount %d%%%s." % (
                        len(pool), amount, " (grooves have no effect)" if amount == 0 else "")}
        if action == "global":
            # The Groove Pool's global amount scales every groove's timing; 0% switches all grooves off.
            if "amount" in data:
                handler.song.groove_amount = max(0.0, min(1.3, float(data["amount"]) / 100.0))
            amount = round(100 * handler.song.groove_amount)
            return {"status": "verified" if "amount" in data else "observed", "global_amount": amount,
                    "summary": "Global Groove Amount is %d%%." % amount}
        if action == "load":
            item = groove_library()
            for name in data["folders"]:
                children = [child for child in item.children if child.name == name]
                if len(children) != 1:
                    raise ValueError("Exact groove path is missing or ambiguous; no fallback was attempted.")
                item = children[0]
            if not item.is_loadable:
                raise ValueError("Select a groove file, not a folder.")
            app.browser.load_item(item)
            return {"status": "sent", "before": len(pool), "summary": "Groove load requested; read the pool to confirm."}
        if action == "clips":
            # Which groove each clip in a scene (or every scene) uses.
            scenes = [data["scene"]] if "scene" in data else range(len(handler.song.scenes))
            found = []
            for s_index in scenes:
                for t_index, track in enumerate(handler.song.tracks):
                    slot = track.clip_slots[s_index]
                    if slot.has_clip and slot.clip.groove is not None:
                        found.append({"track": t_index, "scene": s_index, "groove": slot.clip.groove.name})
            return {"status": "observed", "clips": found,
                    "summary": "%d clip(s) use a groove." % len(found) if found else "No clip uses a groove."}
        if action == "assign":
            clip = handler.song.tracks[data["track"]].clip_slots[data["scene"]].clip
            if clip is None:
                raise ValueError("There is no clip in that slot.")
            previous = clip.groove.name if clip.groove is not None else None
            index = data.get("groove")
            if index is None:
                try:
                    clip.groove = None
                except Exception:
                    raise ValueError("Live's API cannot clear a clip's groove. To make clips play straight, set their "
                                     "pool groove's timing, random, velocity and quantize amounts to 0.")
            else:
                if not 0 <= index < len(pool):
                    raise ValueError("That groove is not in the Groove Pool.")
                clip.groove = pool[index]
            name = clip.groove.name if clip.groove is not None else None
            expected = None if index is None else pool[index].name
            return {"status": "verified" if name == expected else "partial", "groove": name, "previous": previous,
                    "summary": "Clip groove is %s (was %s)." % (name or "none", previous or "none")}
        if action == "amounts":
            index = data["groove"]
            if not 0 <= index < len(pool):
                raise ValueError("That groove is not in the Groove Pool.")
            g = pool[index]
            for key, attribute in (("timing", "timing_amount"), ("random", "random_amount"),
                                   ("velocity", "velocity_amount"), ("quantize", "quantization_amount")):
                if key in data:
                    low = -100.0 if key == "velocity" else 0.0  # Velocity can also invert the groove's accents
                    setattr(g, attribute, max(low, min(100.0, float(data[key]))))
            return {"status": "verified", "groove": describe(index, g), "summary": "Groove %s: timing %.0f%%, random %.0f%%, velocity %.0f%%, quantize %.0f%%." % (
                g.name, g.timing_amount, g.random_amount, g.velocity_amount, g.quantization_amount)}
        raise ValueError("Groove action must be library, pool, clips, global, load, assign or amounts.")

    def arrangement(data):
        """Arrangement housekeeping. state: Automation Arm and clip counts. arm: set Automation Arm (so moves made
        while recording are written as Arrangement automation). re_enable: Re-Enable Automation. clear: delete every
        Arrangement clip (only after the user explicitly agreed to replace the Arrangement)."""
        song = handler.song
        action = data["action"]
        if action == "state":
            counts = {track.name: len(list(track.arrangement_clips)) for track in song.tracks}
            return {"status": "observed", "automation_arm": bool(song.session_automation_record), "clips": counts,
                    "summary": "Automation Arm is %s; %d Arrangement clip(s)." % (
                        "on" if song.session_automation_record else "off", sum(counts.values()))}
        if action == "arm":
            # Live applies the change on its next tick, so report the requested state; read state to confirm.
            song.session_automation_record = bool(data["on"])
            return {"status": "sent", "automation_arm": bool(data["on"]),
                    "summary": "Automation Arm set %s." % ("on" if data["on"] else "off")}
        if action == "re_enable":
            song.re_enable_automation()
            return {"status": "verified", "summary": "Automation re-enabled."}
        if action == "clear":
            removed = 0
            for track in song.tracks:
                for clip in list(track.arrangement_clips):
                    track.delete_clip(clip)
                    removed += 1
            return {"status": "sent", "removed": removed,
                    "summary": "Deleted %d Arrangement clip(s); read the Arrangement again to confirm." % removed}
        raise ValueError("Arrangement action must be state, arm, re_enable or clear.")

    for operation, function in {"catalog": catalog, "device_tree": device_tree, "clip_envelope": clip_envelope,
                                "clip_automation": clip_automation, "mixer_state": mixer_state,
                                "note_feel": note_feel, "groove": groove, "arrangement": arrangement,
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
