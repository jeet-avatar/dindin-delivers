"""Persist the agreed production brief and one-part-at-a-time review progress."""

import hashlib
import json
import os
from pathlib import Path
import tempfile
from jsonschema import Draft202012Validator

ROOT = Path(os.getenv("BEATMIND_PLANS_DIR", str(Path(tempfile.gettempdir()) / "beatmind-production-plans")))
PLAN_TOOL = {
    "name": "create_production_plan",
    "description": "Save a production brief BEFORE creating tracks. Discover real sources first. Choose and disclose reasonable defaults when the user delegates creative decisions; ask only for necessary ambiguity. Build one planned part, map its controls, verify and audition it, then wait for approval. Session sections are not a saved Arrangement or export.",
    "input_schema": {"type": "object", "additionalProperties": False, "properties": {
        "title": {"type": "string", "minLength": 1, "maxLength": 120},
        "genre": {"type": "string", "minLength": 1, "maxLength": 120},
        "bpm": {"type": "number", "minimum": 20, "maximum": 300},
        "key": {"type": "string", "minLength": 1, "maxLength": 60},
        "scope": {"type": "string", "enum": ["loop", "session_sections"]},
        "assumptions": {"type": "array", "minItems": 0, "maxItems": 12, "items": {"type": "string", "maxLength": 300}},
        "parts": {"type": "array", "minItems": 1, "maxItems": 16, "items": {
            "type": "object", "additionalProperties": False, "properties": {
                "role": {"type": "string", "minLength": 1, "maxLength": 80},
                "source_kind": {"type": "string", "enum": ["pack", "instrument", "plugin"]},
                "source": {"type": "string", "minLength": 1, "maxLength": 300},
                "sound": {"type": "string", "minLength": 1, "maxLength": 600},
                "bars": {"type": "integer", "minimum": 1, "maximum": 64}},
            "required": ["role", "source_kind", "source", "sound", "bars"]}}},
        "required": ["title", "genre", "bpm", "key", "scope", "assumptions", "parts"]},
}


def path_for(user_id, session_id):
    key = hashlib.sha256(f"{user_id}:{session_id}".encode()).hexdigest()
    return ROOT / (key + ".json")


def get_plan(user_id, session_id):
    try:
        return json.loads(path_for(user_id, session_id).read_text())
    except (OSError, ValueError):
        return None


def save(plan):
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    path_for(plan["user_id"], plan["session_id"]).write_text(json.dumps(plan))


def create_plan(user_id, session_id, data):
    errors = list(Draft202012Validator(PLAN_TOOL["input_schema"]).iter_errors(data))
    if errors:
        return {"status": "failed", "summary": errors[0].message, "steps": []}
    existing = get_plan(user_id, session_id)
    if existing and any(part["status"] != "planned" for part in existing["parts"]):
        return {"status": "failed", "summary": "This plan already has work in progress. Continue it instead of overwriting its review history.", "steps": []}
    if len({part["role"].casefold() for part in data["parts"]}) != len(data["parts"]):
        return {"status": "failed", "summary": "Each part needs a distinct role.", "steps": []}
    plan = {**data, "user_id": user_id, "session_id": session_id,
            "parts": [{**part, "status": "planned"} for part in data["parts"]]}
    save(plan)
    return {"status": "observed", "summary": "Production brief saved. Musical actions still require their own verification.", "plan": plan, "steps": []}


def link_audition(user_id, session_id, recording):
    plan = get_plan(user_id, session_id)
    if not plan:
        return
    # A refinement audition belongs to its existing part, not the next planned instrument.
    part = next((part for part in plan["parts"] if part.get("track") == recording["track"]
                 and part.get("scene") == recording["scene"] and part.get("recording_id")), None)
    if part is None:
        part = next((part for part in plan["parts"] if part["status"] in {"planned", "revise"}), None)
    if part:
        previous_id = part.get("recording_id")
        part.update(status="awaiting_review", recording_id=recording["id"], track=recording["track"], scene=recording["scene"])
        save(plan)
        return previous_id


def review_part(user_id, recording_id, decision):
    for file in ROOT.glob("*.json"):
        try:
            plan = json.loads(file.read_text())
        except (OSError, ValueError):
            continue
        if plan.get("user_id") != user_id:
            continue
        part = next((part for part in plan["parts"] if part.get("recording_id") == recording_id), None)
        if part:
            if part["status"] != "awaiting_review":
                return None
            part["status"] = decision
            save(plan)
            # Saving a decision is not authorization to run another model/tool turn.
            return None
    return None


def replace_audition(user_id, previous_id, recording_id):
    for file in ROOT.glob("*.json"):
        try:
            plan = json.loads(file.read_text())
        except (OSError, ValueError):
            continue
        if plan.get("user_id") != user_id:
            continue
        for part in plan.get("parts", []):
            if part.get("recording_id") == previous_id:
                part.update(recording_id=recording_id, status="awaiting_review")
                save(plan)
