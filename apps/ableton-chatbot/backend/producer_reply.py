"""Explain a captured preview using tool evidence, without another model turn."""


def _short(value, limit=180):
    return " ".join(str(value or "").split())[:limit]


def preview_reply(actions):
    captures = [a for a in actions if a.get("tool") in {"audition_part", "audition_scene"}
                and a.get("result", {}).get("status") == "verified"
                and a["result"].get("recording")]
    if not captures:
        return None
    capture = captures[-1]
    recording = capture["result"]["recording"]
    scene = recording.get("kind") == "scene"
    name = _short(recording.get("scene_name") if scene else recording.get("track_name"))
    name = name or ("Full mix" if scene else "Part")
    revised = bool(recording.get("supersedes"))
    sentences = [f"{name}: {'updated' if revised else 'full-mix' if scene else 'part'} preview recorded in Ableton."]
    relevant = [a for a in actions[:actions.index(capture)]
                if a.get("result", {}).get("status") in {"verified", "observed"}
                and (scene or a.get("input", {}).get("track") == recording.get("track"))]
    if not scene:
        descriptions = [a["input"] for a in relevant if a.get("tool") == "describe_sound"
                        and a["input"].get("scene") == recording.get("scene")]
        if descriptions:
            design = descriptions[-1]
            details = [_short(design.get(k)) for k in ("character", "rhythm", "mix_intent")]
            sentences.append("Intended sound: " + "; ".join(d for d in details if d).rstrip(".") + ".")
        sources = [a["result"].get("source") for a in relevant if a.get("tool") == "load_pack_sample"
                   and a["result"].get("status") == "verified" and a["result"].get("source")]
        if sources:
            source = sources[-1]
            sentences.append(f"Verified source: {_short(source.get('pack_name'))} / {_short(source.get('relative_path'))}.")
    labels = {"add_notes": "MIDI pattern", "clear_notes": "note removal", "remove_notes": "note removal",
              "set_device_control": "instrument settings", "set_track_volume": "level",
              "set_track_pan": "pan", "set_track_send": "send level", "load_effect": "effects",
              "delete_device": "device removal", "load_instrument": "instrument",
              "load_library_item": "instrument or effect", "load_sample": "sample"}
    changes = list(dict.fromkeys(labels[a["tool"]] for a in relevant
                               if a["tool"] in labels and a["result"].get("status") == "verified"))
    if changes:
        sentences.append("Changes checked: " + ", ".join(changes) + ".")
    issues = [a for a in actions if a.get("result", {}).get("status") in {"failed", "partial", "unverified"}
              and not str(a["result"].get("summary", "")).startswith("Skipped after")]
    if issues:
        issue = issues[0]
        detail = _short(issue["result"].get("summary") or issue["result"].get("error"))
        sentences.append(f"Needs attention: {issue['tool'].replace('_', ' ')}" + (f" — {detail}" if detail else "") + ".")
    if revised:
        sentences.append("The earlier recording and its decision remain saved; compare before and after.")
    sentences.append("Listen, then keep it or request a specific change to "
                     + ("balance, section energy or transitions." if scene else "tone, groove or effects.")
                     + " This preview does not mean the full song is finished.")
    return " ".join(sentences)
