"""Select and verify Live's visible target without editing or launching music."""

import json

VIEWS = {"track", "device", "clip", "automation", "arrangement", "session"}


def focus(song, app, data, inspect_only=False):
    if data.get("view") not in VIEWS or set(data) - {
        "view", "track", "scope", "path", "scene", "arrangement_clip", "control", "mixer", "send"
    }:
        raise ValueError("Unsupported display target.")
    view = data["view"]
    scope = data.get("scope", "track")
    if scope not in {"track", "return", "master"}:
        raise ValueError("Unsupported track scope.")
    track = None
    if scope == "master":
        track = song.master_track
    elif "track" in data:
        tracks = song.tracks if scope == "track" else song.return_tracks
        index = data["track"]
        if type(index) is not int or not 0 <= index < len(tracks):
            raise ValueError("The display target track does not exist.")
        track = tracks[index]
    if view in {"track", "device", "clip", "automation"} and track is None:
        raise ValueError("This view needs an explicit track.")
    scene = None
    if "scene" in data:
        index = data["scene"]
        if type(index) is not int or not 0 <= index < len(song.scenes):
            raise ValueError("The display target scene does not exist.")
        scene = song.scenes[index]
    device, chain_views = None, []
    if "path" in data:
        path = data["path"]
        if not isinstance(path, list) or not path or len(path) % 2 != 1 or len(path) > 9 or any(type(i) is not int or i < 0 for i in path):
            raise ValueError("Invalid nested device path.")
        if track is None:
            raise ValueError("Device selection needs a track.")
        device = track.devices[path[0]]
        for offset in range(1, len(path), 2):
            chain = device.chains[path[offset]]
            chain_views.append((device.view, chain))
            device = chain.devices[path[offset + 1]]
    clip, slot = None, None
    if view in {"clip", "automation"}:
        if "arrangement_clip" in data:
            index = data["arrangement_clip"]
            if type(index) is not int or not 0 <= index < len(track.arrangement_clips):
                raise ValueError("The Arrangement clip does not exist.")
            clip = track.arrangement_clips[index]
        elif scene is not None and scope == "track":
            slot = track.clip_slots[data["scene"]]
            if not slot.has_clip:
                raise ValueError("No clip exists in the requested display slot.")
            clip = slot.clip
        else:
            raise ValueError("Clip selection requires a scene or Arrangement clip index.")
    parameter = None
    if view == "automation":
        mixer = data.get("mixer")
        if mixer in {"volume", "pan"}:
            parameter = track.mixer_device.volume if mixer == "volume" else track.mixer_device.panning
        elif mixer == "send":
            index = data.get("send")
            if type(index) is not int or not 0 <= index < len(track.mixer_device.sends):
                raise ValueError("Automation send target does not exist.")
            parameter = track.mixer_device.sends[index]
        elif device is not None:
            matches = [p for p in device.parameters if p.name == data.get("control")]
            if len(matches) != 1:
                raise ValueError("Select one exact automation control name.")
            parameter = matches[0]
        else:
            raise ValueError("Automation view requires an explicit control.")
    main = "Arranger" if view == "arrangement" or "arrangement_clip" in data else (
        "Session" if view == "session" or scene is not None else None)
    detail = "Detail/Clip" if clip is not None else "Detail/DeviceChain" if track is not None else None
    if not inspect_only:
        # Validate every object before changing selection; never fall back to another track.
        # Switching main views restores that view's previous selection in Live.
        if main:
            app.view.show_view(main)
        if track is not None:
            song.view.selected_track = track
        if scene is not None:
            song.view.selected_scene = scene
        for rack_view, chain in chain_views:
            rack_view.selected_chain = chain
        if device is not None:
            song.view.select_device(device)
        if clip is not None:
            if slot is not None:
                song.view.highlighted_clip_slot = slot
            song.view.detail_clip = clip
        if detail:
            app.view.show_view("Detail")
            app.view.show_view(detail)
        if view == "clip":
            clip.view.hide_envelope()
            clip.view.show_loop()
        if parameter is not None:
            clip.view.show_envelope()
            clip.view.select_envelope_parameter(parameter)
    checks = {
        "track": track is None or song.view.selected_track == track,
        "scene": scene is None or song.view.selected_scene == scene,
        "device": device is None or track.view.selected_device == device,
        "clip": clip is None or song.view.detail_clip == clip,
        "main_view": main is None or bool(app.view.is_view_visible(main)),
        "detail_view": detail is None or bool(app.view.is_view_visible(detail)),
    }
    result = {"status": "verified" if all(checks.values()) else "unverified",
              "target": data, "checks": checks, "music_changed": False,
              "track_name": track.name if track is not None else None,
              "device_name": device.name if device is not None else None,
              "clip_name": clip.name if clip is not None else None,
              "summary": "Display target checked." if all(checks.values()) else "Display target did not match; music was not changed."}
    if parameter is not None:
        # The API can request the envelope selector but has no corresponding getter.
        result["envelope_control"] = parameter.name
        result["envelope_selector_readback_available"] = False
    return result


def register(handler, app):
    for operation, inspect_only in (("focus_view", False), ("inspect_view", True)):
        def callback(params, inspect_only=inspect_only):
            try:
                result = focus(handler.song, app, json.loads(params[0]), inspect_only)
            except Exception as error:
                result = {"status": "failed", "summary": str(error), "music_changed": False}
            return (json.dumps(result),)
        handler.osc_server.add_handler("/live/beatmind/" + operation, callback)
