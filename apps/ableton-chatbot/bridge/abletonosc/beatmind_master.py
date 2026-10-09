"""Main (master) track devices: list, load a built-in audio effect, read and set parameters with Live's display text."""
import json


def _find(item, name, depth=0):
    if depth > 4:
        return None
    for child in item.children:
        if child.name in (name, name + ".adv", name + ".adg") and child.is_loadable:
            return child
        if child.is_folder:
            found = _find(child, name, depth + 1)
            if found is not None:
                return found
    return None


def register(handler, app):
    song = handler.song

    def master_devices(params):
        return tuple(device.name for device in song.master_track.devices)

    def load(params):
        name = str(params[0])
        item = _find(app.browser.audio_effects, name)
        if item is None:
            return ("not_found", name)
        song.view.selected_track = song.master_track
        app.browser.load_item(item)
        return ("loaded", name)

    def parameters(params):
        index = int(params[0])
        devices = list(song.master_track.devices)
        if not 0 <= index < len(devices):
            return ("error", "Master device no longer exists.")
        device = devices[index]
        return ("ok", json.dumps({"device": device.name, "parameters": [
            {"name": p.name, "value": p.value, "min": p.min, "max": p.max, "display": p.str_for_value(p.value),
             "quantized": bool(p.is_quantized)} for p in device.parameters]}))

    def set_parameter(params):
        index, name, value = int(params[0]), str(params[1]), float(params[2])
        devices = list(song.master_track.devices)
        if not 0 <= index < len(devices):
            return ("error", "Master device no longer exists.")
        matches = [p for p in devices[index].parameters if p.name == name]
        if len(matches) != 1:
            return ("error", "Parameter %s not found on %s." % (name, devices[index].name))
        parameter = matches[0]
        if not parameter.is_enabled or parameter.automation_state != 0:
            return ("error", "%s is disabled or automated; nothing was changed." % name)
        parameter.value = min(max(value, parameter.min), parameter.max)
        return ("ok", parameter.value, parameter.str_for_value(parameter.value))

    def curve(params):
        index, name = int(params[0]), str(params[1])
        devices = list(song.master_track.devices)
        if not 0 <= index < len(devices):
            return ("error", "Master device no longer exists.")
        matches = [p for p in devices[index].parameters if p.name == name]
        if len(matches) != 1:
            return ("error", "Parameter %s not found." % name)
        parameter = matches[0]
        # macOS limits UDP datagrams to about 9 KB: send 101 display strings; value i is min + i/100 of the range.
        points = [parameter.min + (parameter.max - parameter.min) * i / 100 for i in range(101)]
        return ("ok", json.dumps({"min": parameter.min, "max": parameter.max,
                                  "displays": [parameter.str_for_value(v) for v in points]}))

    handler.osc_server.add_handler("/live/beatmind/master/devices", master_devices)
    handler.osc_server.add_handler("/live/beatmind/master/curve", curve)
    handler.osc_server.add_handler("/live/beatmind/master/load", load)
    handler.osc_server.add_handler("/live/beatmind/master/parameters", parameters)
    handler.osc_server.add_handler("/live/beatmind/master/set", set_parameter)
