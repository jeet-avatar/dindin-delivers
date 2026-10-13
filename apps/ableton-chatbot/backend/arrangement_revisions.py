"""Scoped MIDI pattern revisions with approval, durable backups and no automatic replay."""

import copy
import hashlib
import json

import chat_store


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


async def execute(name, data, session, bridge, plan, state):
    from arrangement_plan import exchange, verify_section

    if (plan["bpm"], plan["numerator"], plan["denominator"]) != (state["bpm"], state["numerator"], state["denominator"]):
        raise ValueError("Tempo or meter changed. Inspect before revising this section.")
    if state.get("is_playing"):
        raise ValueError("Stop playback before preparing or applying a section revision.")
    pending = plan.get("pending_revision")
    if name == "plan_arrangement_revision":
        if pending and pending["state"] == "attempted":
            raise ValueError("An earlier revision may be partially applied. Inspect its saved checkpoints before further changes.")
        section = next((s for s in plan["sections"] if s["id"] == data["section_id"]), None)
        if not section or section["state"] != "placed":
            raise ValueError("Choose an already placed section to revise.")
        if not (await verify_section(bridge, plan, section)).get("all_present"):
            raise ValueError("This section differs from its saved receipts. Inspect it before revising; nothing was changed.")
        track = next((t for t in state["tracks"] if t["index"] == data["track"]), None)
        source = next((c for c in (track or {}).get("clips", [])
                       if c["kind"] == "session" and c["clip_id"] == data["source_id"]), None)
        if not source or source["audio"] or not source["has_material"] or not source["placement_ready"]:
            raise ValueError("Prepare and inspect a nonempty MIDI Session variation on the same track first.")
        targets = [{"placement_index": i, **copy.deepcopy(r)} for i, r in enumerate(section["receipts"])
                   if r["track"] == data["track"]]
        if not targets:
            raise ValueError("That track has no placed clips in the selected section.")
        length = source["end_beats"] - source["start_beats"]
        if any(abs(r["end"] - r["start"] - length) > 1e-6 for r in targets):
            raise ValueError("The replacement must match each target's whole-clip length. No resizing was attempted.")
        candidate = {**data, "section_name": section["name"], "set_id": state["set_id"],
                     "source_version": source["source_version"], "targets": targets,
                     "scope": "MIDI notes only; devices, automation and other sections remain unchanged"}
        candidate.update(revision=digest(candidate)[:16], state="proposed", approved=False, checkpoints=[])
        if pending:
            plan.setdefault("revision_history", []).append(copy.deepcopy(pending))
        plan["pending_revision"] = candidate
        chat_store.save(session, "running")
        return {"status": "observed", "arrangement_plan": plan,
                "summary": "Pattern revision proposed for this section and track only. Review and approve its exact revision before changes."}

    if not pending or pending["revision"] != data["revision"] or not pending["approved"]:
        raise ValueError("Approve this exact part revision before applying it.")
    if pending["state"] != "proposed":
        raise ValueError("This revision was already attempted. Inspect saved checkpoints; no change was resent.")
    section = next(s for s in plan["sections"] if s["id"] == pending["section_id"])
    if not (await verify_section(bridge, plan, section)).get("all_present"):
        raise ValueError("The section changed after approval. No revision was sent.")
    source = next((c for t in state["tracks"] if t["index"] == pending["track"] for c in t["clips"]
                   if c["kind"] == "session" and c["clip_id"] == pending["source_id"]), None)
    if not source or source["source_version"] != pending["source_version"]:
        raise ValueError("Replacement material changed after approval. Propose a fresh revision.")

    # Read every backup before the first write; each native write rechecks its fingerprint.
    backups = []
    for target in pending["targets"]:
        payload = {"set_id": plan["set_id"], "track": pending["track"], "target_id": target["clip_id"],
                   "target_version": target["source_version"], "start": target["start"], "end": target["end"]}
        notes, offset = [], 0
        for _ in range(86):
            page = await exchange(bridge, {**payload, "action": "inspect_notes", "offset": offset})
            notes.extend(page["notes"])
            if page.get("next_offset") is None:
                break
            offset = page["next_offset"]
        else:
            raise ValueError("The target exceeds the supported note backup size. Nothing was changed.")
        if len(notes) != page["total"] or len(notes) > 2048:
            raise ValueError("Complete note backup could not be confirmed. Nothing was changed.")
        backups.append({"target": payload, "notes": notes, "backup_digest": digest(notes), "state": "backed_up"})
    pending.update(state="attempted", checkpoints=backups)
    plan["complete"] = False
    plan["remaining_checks"] = list(dict.fromkeys([*plan.get("remaining_checks", []),
        "revised_section_audio", "full_arrangement_audio", "saved_live_set"]))
    chat_store.save(session, "running")
    for target, checkpoint in zip(pending["targets"], backups):
        checkpoint["state"] = "sent"
        chat_store.save(session, "running")
        result = await exchange(bridge, {**checkpoint["target"], "action": "revise_notes",
            "source_id": pending["source_id"], "source_version": pending["source_version"],
            "backup_digest": checkpoint["backup_digest"]})
        checkpoint.update(state="verified", receipt=result["receipt"])
        section["receipts"][target["placement_index"]] = result["receipt"]
        chat_store.save(session, "running")
    if not (await verify_section(bridge, plan, section)).get("all_present"):
        raise ValueError("Revised section readback did not pass. Inspect; do not repeat the revision.")
    pending["state"] = "applied"
    pending["audition_status"] = "required"
    chat_store.save(session, "running")
    return {"status": "verified", "arrangement_plan": plan, "complete": False,
            "summary": f"{section['name']} / Track {pending['track'] + 1}: MIDI pattern revised and checked. Other sections were not changed. A fresh section recording and user review are still required."}
