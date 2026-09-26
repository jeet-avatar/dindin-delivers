"""Request-led section briefs with an explicit, validated source constraint."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
from jsonschema import Draft202012Validator

ROOT = Path(os.getenv("BEATMIND_SECTIONS_DIR", str(Path(tempfile.gettempdir()) / "beatmind-section-briefs")))
SECTION_TOOL = {"name": "set_section_brief", "description": "Before building a requested drop/build/chorus or other section, save its requested sound, length and exact source constraint. This only plans a Session View section; it does not create clips or an Arrangement timeline. Discover packs first. For 'same pack', reuse a confirmed prior pack ID only; clarify ambiguous sources. Inspect scene names and use an existing matching scene instead of duplicating it. Then build and audition the requested sound with the normal verified tools.",
    "input_schema": {"type": "object", "additionalProperties": False, "properties": {
        "name": {"type": "string", "minLength": 1, "maxLength": 120},
        "sound": {"type": "string", "minLength": 1, "maxLength": 2000},
        "bars": {"type": "integer", "minimum": 1, "maximum": 256},
        "source_mode": {"type": "string", "enum": ["existing", "pack", "discover"]},
        "pack_id": {"type": "string", "minLength": 1, "maxLength": 128}},
        "required": ["name", "sound", "bars", "source_mode"]}}


def path_for(user_id, session_id):
    return ROOT / (hashlib.sha256(f"{user_id}:{session_id}".encode()).hexdigest() + ".json")


def get_brief(user_id, session_id):
    try:
        return json.loads(path_for(user_id, session_id).read_text())
    except (OSError, ValueError):
        return None


async def set_brief(user_id, session_id, data, bridge):
    errors = list(Draft202012Validator(SECTION_TOOL["input_schema"]).iter_errors(data))
    if errors:
        return {"status": "failed", "summary": errors[0].message, "steps": []}
    if (data["source_mode"] == "pack") != bool(data.get("pack_id")):
        return {"status": "failed", "summary": "Choose one discovered pack ID for pack mode; omit it for other modes.", "steps": []}
    if bridge is None:
        return {"status": "failed", "summary": "Connect Ableton before planning a section.", "steps": []}
    brief = dict(data)
    if data["source_mode"] == "pack":
        catalog = await bridge.local_operation("sample_library", {"operation": "list_sample_packs", "data": {}})
        pack = next((pack for pack in catalog.get("packs", []) if pack["pack_id"] == data["pack_id"]), None)
        if catalog.get("status") != "observed" or not pack:
            return {"status": "failed", "summary": "The selected pack is not available. Discover or clarify the pack; no fallback was selected.", "steps": []}
        brief["pack_name"] = pack["name"]
    scenes = await bridge.send_command("/live/song/get/scenes/name", [], True)
    if scenes.get("status") != "ok":
        return {"status": "failed", "summary": "Scene inspection failed. No section brief changed.", "steps": []}
    matches = [i for i, name in enumerate(scenes.get("args", [])) if name.casefold() == data["name"].casefold()]
    if len(matches) > 1:
        return {"status": "failed", "summary": "Multiple scenes have that name. Ask which scene before editing.", "steps": []}
    brief.update(scene_candidates=matches, scope="session_section", status="planned")
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    path_for(user_id, session_id).write_text(json.dumps(brief))
    return {"status": "observed", "summary": "Section brief saved. No music has been created yet.", "section_brief": brief, "steps": []}


def source_error(brief, name, data):
    if not brief:
        return None
    loads = name in {"load_sample", "load_instrument", "load_pack_sample"} or (name == "load_library_item" and data.get("kind") == "instrument")
    if brief["source_mode"] == "existing" and loads:
        return "This section must reuse existing sounds. Change the section brief explicitly before loading a new source."
    if brief["source_mode"] == "pack" and loads:
        if name != "load_pack_sample" or data.get("pack_id") != brief["pack_id"]:
            return "This section is restricted to " + brief["pack_name"] + ". Use a discovered sample from that exact pack; no source fallback is allowed."
    return None
