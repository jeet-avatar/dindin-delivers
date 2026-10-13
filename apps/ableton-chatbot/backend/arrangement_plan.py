"""Musical timeline validation and checkpointed, non-destructive Arrangement tools.

Plans describe intent. Only Live readback describes placement; neither proves audio
quality or a saved project. Writes require a revision approved by the user in chat.
"""

import copy
import hashlib
import json
import math
import re
from fractions import Fraction

from jsonschema import Draft202012Validator

import chat_store


PURPOSES = {
    "intro": "Establish atmosphere and the main groove.",
    "dj_intro": "Introduce mixable rhythm with restrained layering.",
    "groove_development": "Develop the groove through subtle rhythmic variation.",
    "main_groove": "Establish the central groove and musical identity.",
    "verse": "Develop the main vocal or musical idea in phrase order.",
    "pre_chorus": "Increase tension toward the hook.",
    "chorus": "Deliver the main hook or strongest musical statement.",
    "post_chorus": "Extend or develop the hook.",
    "vocal_section": "Feature the selected vocal phrase without masking it.",
    "instrumental_break": "Develop an instrumental variation.",
    "breakdown": "Remove selected layers to create space and anticipation.",
    "build": "Increase tension toward the next release.",
    "drop": "Release tension into the intended groove.",
    "bridge": "Introduce contrast while retaining the song's identity.",
    "final_chorus": "Resolve the song with its final hook.",
    "final_build": "Prepare the final energy peak.",
    "final_drop": "Deliver the final groove and resolution.",
    "outro": "Progressively remove layers for the ending.",
    "dj_outro": "Simplify to a DJ-friendly ending.",
    "custom": "User-defined musical purpose.",
}

SOURCE = {"type": "object", "additionalProperties": False, "properties": {
    "track": {"type": "integer", "minimum": 0},
    "kind": {"enum": ["session", "arrangement"]},
    "index": {"type": "integer", "minimum": 0},
    "clip_id": {"type": "string", "minLength": 1, "maxLength": 80},
    "role": {"type": "string", "minLength": 1, "maxLength": 80},
    "offset_bars": {"type": "number", "minimum": 0},
    "repeats": {"type": "integer", "minimum": 1, "maximum": 128}},
    "required": ["track", "kind", "index", "clip_id", "role", "offset_bars", "repeats"]}

PLAN_SCHEMA = {"type": "object", "additionalProperties": False, "properties": {
    "title": {"type": "string", "minLength": 1, "maxLength": 120},
    "genre": {"type": "string", "minLength": 1, "maxLength": 120},
    "bpm": {"type": "number", "minimum": 20, "maximum": 300},
    "numerator": {"type": "integer", "minimum": 1, "maximum": 32},
    "denominator": {"enum": [1, 2, 4, 8, 16]},
    "target_seconds": {"type": "number", "minimum": 5, "maximum": 3600},
    "sections": {"type": "array", "minItems": 1, "maxItems": 64, "items": {
        "type": "object", "additionalProperties": False, "properties": {
            "id": {"type": "string", "pattern": "^[a-zA-Z0-9_-]{1,40}$"},
            "name": {"type": "string", "minLength": 1, "maxLength": 120},
            "kind": {"enum": list(PURPOSES)},
            "purpose": {"type": "string", "minLength": 1, "maxLength": 500},
            "start_bar": {"type": "integer", "minimum": 1, "maximum": 8192},
            "bars": {"type": "integer", "minimum": 1, "maximum": 512},
            "energy": {"type": "number", "minimum": 0, "maximum": 1},
            "vocal_state": {"enum": ["absent", "retained", "fragment", "featured"]},
            "percussion_density": {"type": "number", "minimum": 0, "maximum": 1},
            "depends_on": {"type": "array", "minItems": 0, "uniqueItems": True, "items": {"type": "string"}},
            "assignments": {"type": "array", "minItems": 1, "maxItems": 64, "items": SOURCE},
            "transition": {"type": "object", "additionalProperties": False, "properties": {
                "type": {"enum": ["none", "layer_change", "filter", "delay_throw", "reverb_tail", "riser", "impact", "fill", "custom"]},
                "bars": {"type": "number", "minimum": 0, "maximum": 64},
                "instructions": {"type": "string", "minLength": 0, "maxLength": 1000}},
                "required": ["type", "bars", "instructions"]},
            "effects": {"type": "array", "minItems": 0, "maxItems": 16, "items": {"type": "string", "maxLength": 500}}},
        "required": ["id", "name", "kind", "purpose", "start_bar", "bars", "energy", "vocal_state",
                     "percussion_density", "depends_on", "assignments", "transition", "effects"]}}},
    "required": ["title", "genre", "bpm", "numerator", "denominator", "sections"]}


def tool(name, description, properties, required=()):
    return {"name": name, "description": description, "input_schema": {
        "type": "object", "additionalProperties": False, "properties": properties, "required": list(required)}}


TOOLS = [
    tool("get_arrangement_state", "Inspect the current Live Set, tempo, meter, locators and a page of tracks, devices, Session and Arrangement clips. Read every page. This never edits music. Clip IDs are valid only in this Live session.",
         {"offset": {"type": "integer", "minimum": 0}, "limit": {"enum": [1]},
          "clip_offset": {"type": "integer", "minimum": 0}}),
    {"name": "plan_song_arrangement", "description": "Save a full-song timeline using inspected existing clips, their exact IDs and original lengths. Reuse approved sounds, do not generate new ones. Each assignment explicitly places its source at offset_bars and repeats it without trimming; overlapping placements are rejected. Transition/effect text is intent, not execution. User must approve the returned revision before any placement. For 6 minutes at 128 BPM 4/4 use 192 bars. Plan different section densities and meaningful variation, not one repeated full-mix loop.", "input_schema": PLAN_SCHEMA},
    tool("get_song_arrangement_plan", "Read this song's saved timeline and execution checkpoints. A plan is not a finished song.", {}),
    tool("execute_arrangement_section", "Place only the next approved section using existing clips. Never overwrites or clears the current Arrangement. Inspects clip identity and destination before writing; checkpoints intent before sending. On uncertain results, stop and inspect, never blindly resend. Requires the exact plan revision approved by the user.",
         {"revision": {"type": "string"}, "section_id": {"type": "string"}}, ["revision", "section_id"]),
    tool("verify_song_arrangement", "Read back every planned clip and section boundary. Reports missing material and pending effects, listening and saving separately; it cannot certify a finished song from markers or clip counts.", {}),
    tool("plan_arrangement_revision", "Propose replacing only the MIDI patterns on one track in one already placed section. First prepare a separate same-length Session variation on that track; preserve the original. Uses exact clip identities and requires a fresh user approval. Devices and automation are retained, not redesigned. Audio stem replacement and phrase resizing are not supported by this tool.",
         {"section_id": {"type": "string"}, "track": {"type": "integer", "minimum": 0},
          "source_id": {"type": "string", "minLength": 1}, "reason": {"type": "string", "minLength": 1, "maxLength": 1000}},
         ["section_id", "track", "source_id", "reason"]),
    tool("execute_arrangement_revision", "Apply an exactly approved scoped MIDI revision. Saves original notes before writing and checks each target. Never retries uncertain writes. Requires a fresh section audition afterward; old sound acceptance does not approve the revised audio.",
         {"revision": {"type": "string", "pattern": "^[a-f0-9]{16}$"}}, ["revision"]),
    tool("audition_arrangement_section", "Record 4-16 seconds of a placed Arrangement section, using its actual start position and current Arrangement automation. Playback must be stopped with recording off, no solos and no Session override. This is an excerpt, not a full-song quality check. Returns a new recording for user review.",
         {"section_id": {"type": "string"}, "seconds": {"type": "number", "minimum": 4, "maximum": 16}}, ["section_id"]),
]
NAMES = {item["name"] for item in TOOLS}


def timing(bpm, numerator, denominator, bars):
    values = [bpm, numerator, denominator, bars]
    if any(type(v) not in (int, float) or not math.isfinite(v) or v <= 0 for v in values):
        raise ValueError("Timing requires finite positive BPM, meter and bars.")
    beats = Fraction(str(bars)) * Fraction(str(numerator)) * 4 / Fraction(str(denominator))
    return float(beats), float(beats * 60 / Fraction(str(bpm)))


def compile_plan(data):
    errors = list(Draft202012Validator(PLAN_SCHEMA).iter_errors(data))
    if errors:
        raise ValueError(errors[0].message)
    # JSON Schema permits NaN as a number; never persist or send non-finite timing.
    json.dumps(data, allow_nan=False)
    plan = copy.deepcopy(data)
    end, seen = 1, set()
    for section in plan["sections"]:
        if section["id"] in seen or not set(section["depends_on"]) <= seen:
            raise ValueError("Section IDs must be unique and dependencies must precede the section.")
        if section["start_bar"] != end:
            raise ValueError("Sections must start at bar 1 and be contiguous without overlaps or unintended gaps.")
        if section["transition"]["bars"] > section["bars"]:
            raise ValueError("A transition must fit inside its section.")
        if any(a["offset_bars"] >= section["bars"] for a in section["assignments"]):
            raise ValueError("Each clip entrance must be inside its section.")
        start_beats = (end - 1) * plan["numerator"] * 4 / plan["denominator"]
        beats, seconds = timing(plan["bpm"], plan["numerator"], plan["denominator"], section["bars"])
        section.update(start_beats=start_beats, end_beats=start_beats + beats,
                       end_bar_exclusive=end + section["bars"], start_seconds=start_beats * 60 / plan["bpm"],
                       end_seconds=start_beats * 60 / plan["bpm"] + seconds, state="planned")
        end += section["bars"]
        seen.add(section["id"])
    plan["total_bars"] = end - 1
    if plan["total_bars"] > 8192:
        raise ValueError("Arrangement exceeds 8192 bars.")
    plan["duration_seconds"] = timing(plan["bpm"], plan["numerator"], plan["denominator"], end - 1)[1]
    if "target_seconds" in plan and abs(plan["duration_seconds"] - plan["target_seconds"]) > 0.01:
        raise ValueError("Section lengths do not match the requested duration. Propose the nearest whole-bar duration explicitly before planning.")
    plan["revision"] = hashlib.sha256(json.dumps(data, sort_keys=True, allow_nan=False).encode()).hexdigest()[:16]
    plan.update(approved=False, complete=False)
    return plan


async def exchange(bridge, payload):
    response = await bridge.send_command("/live/beatmind/arrangement", [json.dumps(payload)], True)
    if response.get("status") != "ok" or not response.get("args"):
        raise ValueError("Ableton arrangement inspection did not respond. No retry was sent; inspect the Bridge and current set.")
    result = json.loads(response["args"][0])
    if result.get("status") not in {"observed", "verified"}:
        if "action must be state" in result.get("summary", ""):
            raise ValueError("The installed Ableton integration lacks staged arrangement support. Update the integration and restart Live after saving; no music was changed.")
        raise ValueError(result.get("summary") or "Arrangement operation was not verified.")
    return result


async def inventory(bridge):
    tracks, first, offset, clip_offset = {}, None, 0, 0
    for _ in range(2048):
        page = await exchange(bridge, {"action": "inspect", "offset": offset, "limit": 1, "clip_offset": clip_offset})
        if first and page["set_id"] != first["set_id"]:
            raise ValueError("The Live Set changed while inspecting it.")
        first = first or page
        for track in page["tracks"]:
            if track["index"] in tracks:
                tracks[track["index"]]["clips"].extend(track["clips"])
            else:
                tracks[track["index"]] = track
        if page.get("next_offset") is None:
            return {**first, "tracks": list(tracks.values())}
        offset = page["next_offset"]
        clip_offset = page.get("next_clip_offset") or 0
    raise ValueError("This set exceeds the supported inspection size; nothing was changed.")


def placements(plan, state):
    if (plan["bpm"], plan["numerator"], plan["denominator"]) != (state["bpm"], state["numerator"], state["denominator"]):
        raise ValueError("Live tempo or meter differs from the plan. Reinspect and replan; tempo was not changed.")
    by_track = {t["index"]: t for t in state["tracks"]}
    result = {}
    for section in plan["sections"]:
        rows = []
        for a in section["assignments"]:
            track = by_track.get(a["track"])
            source = next((c for c in (track or {}).get("clips", []) if c["kind"] == a["kind"] and c["clip_id"] == a["clip_id"]), None)
            if not source:
                raise ValueError(f"Source for {section['name']} / {a['role']} changed or is missing. Reinspect, do not recreate it.")
            if not source.get("placement_ready"):
                raise ValueError("A Session clip has a pickup/offset start. Review phrase placement before planning; the source was preserved.")
            if not source.get("has_material") or source.get("muted") or track.get("mute") or track.get("muted_via_solo") or not track.get("has_audio_output"):
                raise ValueError(f"{track['name']} cannot currently be heard. Inspect its instrument, mutes and routing first.")
            length = source["end_beats"] - source["start_beats"]
            if length <= 0 or (source.get("audio") and not source.get("warping")):
                raise ValueError("Unwarped audio or an invalid clip length needs timing review before grid-based placement.")
            start = section["start_beats"] + a["offset_bars"] * plan["numerator"] * 4 / plan["denominator"]
            for repeat in range(a["repeats"]):
                row = {"track": a["track"], "kind": a["kind"], "clip_id": source["clip_id"],
                       "source_version": source["source_version"], "start": start + repeat * length, "end": start + (repeat + 1) * length}
                if row["end"] > section["end_beats"] + 1e-6:
                    raise ValueError(f"A clip would cut across the end of {section['name']}. Adjust the plan without trimming the source.")
                if any(r["track"] == row["track"] and r["start"] < row["end"] - 1e-6 and row["start"] < r["end"] - 1e-6 for r in rows):
                    raise ValueError(f"Clip assignments overlap on one track in {section['name']}.")
                rows.append(row)
        cursor = section["start_beats"]
        for row in sorted(rows, key=lambda r: r["start"]):
            if row["start"] > cursor + 1e-6:
                raise ValueError(f"{section['name']} has an unintended gap. Assign material across the entire section.")
            cursor = max(cursor, row["end"])
        if cursor < section["end_beats"] - 1e-6:
            raise ValueError(f"{section['name']} does not contain material through its ending.")
        if len(rows) > 512:
            raise ValueError("Section has too many clip placements; divide it into smaller sections.")
        result[section["id"]] = rows
    return result


def check_destinations(rows, state):
    tracks = {t["index"]: t for t in state["tracks"]}
    for row in rows:
        for clip in tracks[row["track"]]["clips"]:
            if clip["kind"] != "arrangement":
                continue
            if (row["kind"] == "arrangement" and clip["clip_id"] == row["clip_id"]
                    and abs(clip["start_beats"] - row["start"]) < 1e-6 and abs(clip["end_beats"] - row["end"]) < 1e-6):
                continue
            if clip["start_beats"] < row["end"] - 1e-6 and row["start"] < clip["end_beats"] - 1e-6:
                raise ValueError("A destination contains existing music. Revise the placement plan; nothing was overwritten.")


async def verify_section(bridge, plan, section):
    rows, receipts = plan["placements"][section["id"]], section.get("receipts", [])
    if len(receipts) != len(rows):
        return {"status": "observed", "all_present": False}
    checks = []
    # Keep OSC datagrams comfortably below macOS UDP limits.
    for offset in range(0, len(rows), 8):
        checks.append(await exchange(bridge, {"action": "verify_section", "set_id": plan["set_id"],
            "placements": rows[offset:offset + 8], "receipts": receipts[offset:offset + 8]}))
    return {"status": "observed", "all_present": all(c.get("all_present") for c in checks)}


def approve_from_message(session, message):
    plan = (session.project or {}).get("arrangement_plan")
    match = re.fullmatch(r"Approve arrangement ([a-f0-9]{16})", message.strip())
    if plan and match and match[1] == plan["revision"]:
        plan["approved"] = True
    revision = plan.get("pending_revision") if plan else None
    match = re.fullmatch(r"Approve part revision ([a-f0-9]{16})", message.strip())
    if revision and match and match[1] == revision["revision"] and revision["state"] == "proposed":
        revision["approved"] = True


async def _execute(name, data, session, bridge):
    try:
        schema = next(t["input_schema"] for t in TOOLS if t["name"] == name)
        errors = list(Draft202012Validator(schema).iter_errors(data))
        if errors:
            raise ValueError(errors[0].message)
        project = session.project or {}
        plan = project.get("arrangement_plan")
        if name == "get_song_arrangement_plan":
            return {"status": "observed", "arrangement_plan": plan, "summary": "Saved arrangement intent and checkpoints; not a completion certificate."}
        if not bridge:
            raise ValueError("Reconnect the Ableton Bridge. Saved arrangement progress is unchanged.")
        if name == "get_arrangement_state":
            return await exchange(bridge, {"action": "inspect", **data})
        if not project.get("live_set"):
            raise ValueError("Link the current Live Set to this song before arranging it. Do not open a new set.")
        state = await inventory(bridge)
        if name == "plan_song_arrangement":
            if plan and any(s["state"] != "planned" for s in plan["sections"]):
                raise ValueError("Arrangement work already exists. Inspect its saved plan before revising; execution history was preserved.")
            candidate = compile_plan(data)
            candidate["placements"] = placements(candidate, state)
            check_destinations([r for rows in candidate["placements"].values() for r in rows], state)
            candidate["set_id"] = state["set_id"]
            # Include inspected identities in the approval revision, not just the user's text.
            candidate["revision"] = hashlib.sha256(json.dumps(candidate, sort_keys=True).encode()).hexdigest()[:16]
            candidate["remaining_checks"] = ["effects_and_transitions", "full_arrangement_audio", "saved_live_set"]
            project["arrangement_plan"] = candidate
            chat_store.save(session, "running")
            return {"status": "observed", "arrangement_plan": candidate,
                    "summary": "Arrangement proposed. Review its sections and approve this revision before clip placement."}
        if not plan or plan["set_id"] != state["set_id"]:
            raise ValueError("No matching plan for this Live Set. Reinspect and replan; no clips were placed.")
        if name in {"plan_arrangement_revision", "execute_arrangement_revision"}:
            from arrangement_revisions import execute as execute_revision
            return await execute_revision(name, data, session, bridge, plan, state)
        if name == "audition_arrangement_section":
            from recordings import save_recording
            section = next((s for s in plan["sections"] if s["id"] == data["section_id"]), None)
            if not section or not (await verify_section(bridge, plan, section)).get("all_present"):
                raise ValueError("Inspect and verify this section's clips before recording it.")
            if state["bpm"] != plan["bpm"]:
                raise ValueError("Tempo changed. Recheck section timing before its preview.")
            seconds = min(data.get("seconds", 8), section["end_seconds"] - section["start_seconds"])
            if seconds < 4:
                raise ValueError("This section is shorter than the minimum four-second preview.")
            if "arrangement_audition_v1" not in getattr(bridge, "capabilities", []):
                raise ValueError("Update Bridge and the Ableton integration before recording Arrangement sections.")
            result = save_recording(session.user_id, await bridge.local_operation("capture_arrangement", {
                "set_id": plan["set_id"], "section_id": section["id"], "section_name": section["name"],
                "beat": section["start_beats"], "seconds": seconds}))
            if result.get("recording"):
                section["latest_recording_id"] = result["recording"]["id"]
                revision = plan.get("pending_revision")
                if revision and revision["section_id"] == section["id"] and revision["state"] == "applied":
                    revision.update(recording_id=result["recording"]["id"], audition_status="pending")
                chat_store.save(session, "running")
            return result
        if name == "verify_song_arrangement":
            if (plan["bpm"], plan["numerator"], plan["denominator"]) != (state["bpm"], state["numerator"], state["denominator"]):
                raise ValueError("Tempo or meter changed; the planned duration is no longer verified.")
            checks = []
            for section in plan["sections"]:
                checked = await verify_section(bridge, plan, section)
                checks.append({"section_id": section["id"], **checked})
            present = all(c.get("all_present") for c in checks)
            return {"status": "observed" if present else "unverified", "arrangement_plan": plan, "section_checks": checks,
                    "complete": False, "summary": "All planned clip positions checked. Effects, full-song audio and saving still need verification." if present else "Some intended clips are missing or changed. Do not repeat writes blindly."}
        if not plan["approved"] or data["revision"] != plan["revision"]:
            raise ValueError("The user must approve this exact arrangement revision first.")
        section = next((s for s in plan["sections"] if s["id"] == data["section_id"]), None)
        if not section:
            raise ValueError("Unknown section.")
        if section["state"] != "planned":
            raise ValueError("This section was already attempted. Verify the Arrangement before any retry; nothing was resent.")
        prior = plan["sections"][:plan["sections"].index(section)]
        if any(s["state"] != "placed" for s in prior):
            raise ValueError("Complete and verify earlier sections first.")
        current = placements(plan, state)[section["id"]]
        if current != plan["placements"][section["id"]]:
            raise ValueError("Source material changed after approval. Nothing was placed.")
        check_destinations(current, state)
        # Durable write-ahead checkpoint: a timeout/crash is never permission to replay.
        section["state"] = "attempted"
        section["receipts"] = []
        chat_store.save(session, "running")
        for row in current:
            receipt = await exchange(bridge, {"action": "place_clip", "set_id": plan["set_id"], **row})
            section["receipts"].append(receipt["receipt"])
            chat_store.save(session, "running")
        check = await verify_section(bridge, plan, section)
        if not check.get("all_present"):
            raise ValueError("Section readback did not match the intended clips. Inspect before continuing.")
        section["state"] = "placed"
        chat_store.save(session, "running")
        return {"status": "verified", "arrangement_plan": plan, "complete": False,
                "summary": f"{section['name']}: clip positions checked in Ableton. Audio, effects and saving are not yet verified."}
    except (ValueError, KeyError, TypeError, OSError) as error:
        return {"status": "unverified", "summary": str(error), "steps": []}


async def execute(name, data, session, bridge):
    result = await _execute(name, data, session, bridge)
    plan = result.get("arrangement_plan")
    if plan and (plan.get("pending_revision") or plan.get("revision_history")):
        # Backups belong in durable project storage, not model history or chat payloads.
        def public_revision(revision):
            return {**revision, "checkpoints": [{key: value for key, value in checkpoint.items() if key != "notes"}
                                                for checkpoint in revision.get("checkpoints", [])]}
        result["arrangement_plan"] = {**plan,
            **({"pending_revision": public_revision(plan["pending_revision"])} if plan.get("pending_revision") else {}),
            "revision_history": [{key: revision[key] for key in ("revision", "state", "section_name", "track", "reason") if key in revision}
                                 for revision in plan.get("revision_history", [])]}
    return result
