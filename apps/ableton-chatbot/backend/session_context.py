"""Conservative relevance checks for recording snapshots against inspected tracks."""


def matching_recordings(recordings, names):
    return [item for item in recordings
            if type(item.get("track")) is int and 0 <= item["track"] < len(names)
            and names[item["track"]] == item.get("track_name")]


def current_plan(plan, recordings):
    if not plan:
        return None
    recorded = [part["recording_id"] for part in plan.get("parts", []) if part.get("recording_id")]
    relevant = {item["id"] for item in recordings}
    # A changed/missing planned part needs reconciliation, not blind continuation.
    return plan if all(recording_id in relevant for recording_id in recorded) else None


def context_note(names, recordings, plan):
    decisions = [{"track_name": item["track_name"], "decision": item["decision"]} for item in recordings]
    import json
    return (
        "\n\nAUTHORITATIVE CURRENT LIVE INSPECTION: " + json.dumps({
            "tracks": [{"number": index + 1, "name": name} for index, name in enumerate(names)],
            "matching_recording_decisions": decisions,
            "recorded_source_references": [{"track_name": item["track_name"], "source": item["sample_source"]}
                                           for item in recordings if item.get("sample_source")],
            "relevant_production_plan": current_plan(plan, recordings),
        })
        + "\nOnly the tracks listed above are confirmed present now. Previous messages, tool results, "
        "recordings and plans are historical snapshots, not proof of the current set. "
        "Do not propose resuming an older project or ask for an older review when its tracks are absent. "
        "If no matching recording decisions are listed, do not mention account recording history as current work. "
        "Respect the user's latest song request; do not ask them to repeat a direction they already gave. "
        "Track-name matches indicate relevance only, not a persistent Live Set identity or unchanged audio. "
        "Older complete conversation turns may be omitted from model context to stay within its budget; "
        "their action logs remain historical evidence, not permission to repeat them. "
        "Use the saved production plan and latest request for scope. If required context is absent, ask rather than invent it. "
        "Inspect devices and clips before editing."
    )
