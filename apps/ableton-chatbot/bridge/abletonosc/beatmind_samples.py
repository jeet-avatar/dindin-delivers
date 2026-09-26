"""Install alongside AbletonOSC's browser.py, then reload the control surface."""

from pathlib import Path


def register(handler, app):
    from .beatmind_automation import register as register_automation
    register_automation(handler, app)
    def loaded_sample(params):
        track = handler.song.tracks[int(params[0])]
        instruments = [device for device in track.devices if device.type == 1]
        if len(instruments) != 1:
            return ("error", "Expected exactly one instrument")
        sample = getattr(instruments[0], "sample", None)
        if sample is None:
            return ("error", "Instrument does not expose its sample file")
        return (str(Path(sample.file_path).resolve()),)

    def load_exact(params):
        index = int(params[0])
        path = Path(str(params[1])).resolve()
        factory = (Path.home() / "Music/Ableton/Factory Packs").resolve()
        user_library = (Path.home() / "Music/Ableton/User Library").resolve()
        imported = user_library / "BeatMind Packs"
        if not path.is_file():
            return ("error", "File is outside the registered pack library")
        if path.is_relative_to(factory):
            root, item = factory, app.browser.packs
        elif path.is_relative_to(imported):
            root, item = user_library, app.browser.user_library
        else:
            return ("error", "File is outside the registered pack library")
        track = handler.song.tracks[index]
        if not track.has_midi_input or any(device.type == 1 for device in track.devices):
            return ("error", "An empty MIDI instrument track is required")
        for part in path.relative_to(root).parts:
            matches = [child for child in item.children if child.name == part]
            if len(matches) != 1:
                return ("not_found", "Exact browser path is unavailable or ambiguous", str(path))
            item = matches[0]
        if not item.is_loadable:
            return ("error", "Exact browser item is not loadable")
        previous = handler.song.view.selected_track
        try:
            handler.song.view.selected_track = track
            app.browser.load_item(item)
        finally:
            handler.song.view.selected_track = previous
        return ("loaded", str(path))

    handler.osc_server.add_handler("/live/browser/beatmind_capabilities", lambda params: ("exact_sample_v1",))
    handler.osc_server.add_handler("/live/browser/load_sample_exact", load_exact)
    handler.osc_server.add_handler("/live/browser/get_loaded_sample", loaded_sample)
