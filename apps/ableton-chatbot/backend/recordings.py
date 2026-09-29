"""User-owned local audition recordings; audio bytes never enter model history."""

import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import uuid

ROOT = Path(os.getenv("BEATMIND_RECORDINGS_DIR", str(Path(tempfile.gettempdir()) / "beatmind-recordings")))


def save_recording(user_id, result):
    encoded = result.pop("audio_base64", None)
    if not encoded or result.get("status") != "verified":
        return result
    data = base64.b64decode(encoded, validate=True)
    if len(data) > 900000 or data[4:8] != b"ftyp":
        raise ValueError("Invalid audio preview")
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    recording_id = uuid.uuid4().hex
    metadata = {"id": recording_id, "user_id": user_id, "created_at": datetime.now(timezone.utc).isoformat(),
                "track_name": result["track_name"], "track": result["track"], "scene": result["scene"],
                "metrics": result["metrics"], "source": "Ableton Live application audio", "decision": "pending",
                "kind": result.get("kind", "part"), **({"scene_name": result["scene_name"]} if result.get("scene_name") else {})}
    (ROOT / f"{recording_id}.m4a").write_bytes(data)
    (ROOT / f"{recording_id}.json").write_text(json.dumps(metadata))
    return {**result, "recording": metadata}


def owned_recording(recording_id, user_id):
    if len(recording_id) != 32 or any(c not in "0123456789abcdef" for c in recording_id):
        return None
    try:
        item = json.loads((ROOT / f"{recording_id}.json").read_text())
    except (OSError, ValueError):
        return None
    return item if item.get("user_id") == user_id else None


def list_recordings(user_id, session_id=None, limit=20):
    items = [owned_recording(path.stem, user_id) for path in ROOT.glob("*.json")]
    ordered = sorted((item for item in items if item and (session_id is None or item.get('session_id') == session_id)), key=lambda item: item["created_at"], reverse=True)[:limit]
    return [{key: value for key, value in item.items() if key != "production_log"} for item in ordered]


def link_revision(recording_id, previous_id, user_id):
    item = owned_recording(recording_id, user_id)
    previous = owned_recording(previous_id, user_id)
    if not item or not previous or recording_id == previous_id:
        return
    if any(item.get(key) != previous.get(key) for key in ("track", "scene", "track_name")):
        return
    item["supersedes"] = previous_id
    (ROOT / f"{recording_id}.json").write_text(json.dumps(item))


def attach_evidence(recording_id, user_id, actions, session_id=None):
    item = owned_recording(recording_id, user_id)
    if item is None:
        raise ValueError("Recording not found")
    if session_id is not None:
        item['session_id'] = session_id
    item["production_log"] = [
        {**action, "result": {key: value for key, value in action.get("result", {}).items()
                             if key not in {"recording", "audio_base64"}}} for action in actions]
    sources = [action["result"]["source"] for action in actions
               if action.get("tool") == "load_pack_sample" and action.get("result", {}).get("status") == "verified"
               and action.get("input", {}).get("track") == item["track"]]
    if sources:
        item["sample_source"] = sources[-1]
    (ROOT / f"{recording_id}.json").write_text(json.dumps(item))
    return {key: value for key, value in item.items() if key != "production_log"}


def decide_recording(recording_id, user_id, decision):
    item = owned_recording(recording_id, user_id)
    if item is None:
        return None
    if decision not in {"accepted", "revise"}:
        raise ValueError("Invalid decision")
    item["decision"] = decision
    (ROOT / f"{recording_id}.json").write_text(json.dumps(item))
    return item
