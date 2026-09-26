"""Opt-in live test: creates and removes its own MIDI track, without playback."""

import argparse
import json
from pathlib import Path
import sys
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from direct_runner import OscClient, execute_tool


def run():
    osc = OscClient()
    marker = "BeatMind test " + uuid.uuid4().hex[:8]
    original_names = None
    selected = None

    def checked(name, data):
        result = execute_tool(name, data, osc)
        print(json.dumps({"tool": name, "status": result["status"], "summary": result.get("summary"), "error": result.get("error")} ), flush=True)
        if result["status"] not in {"verified", "observed"}:
            raise RuntimeError(json.dumps(result))
        return result

    try:
        original_names = checked("get_track_names", {})["observations"]["/live/song/get/track_names"]
        selected = osc.query("/live/view/get/selected_track", [])
        track = checked("create_midi_track", {"index": -1})["index"]
        if track != len(original_names):
            raise RuntimeError("Session changed concurrently. Stopping without touching another track.")
        checked("set_track_name", {"track": track, "name": marker})
        checked("set_track_monitoring", {"track": track, "state": 2})
        checked("create_clip", {"track": track, "scene": 0, "length_beats": 4})
        checked("set_clip_name", {"track": track, "scene": 0, "name": "Readback verification"})
        notes = [{"pitch": pitch, "start": i * 0.5, "duration": 0.25, "velocity": 80 + i * 5}
                 for i, pitch in enumerate([36, 38, 42, 127])]
        result = checked("add_notes", {"track": track, "scene": 0, "notes": notes})
        assert result["note_count"] == 4
        available = checked("list_browser", {"category": "instruments"})["observations"]["/live/browser/list"]
        instrument = next((name for name in ("Drift", "Operator", "Analog") if name in available), None)
        if instrument:
            checked("load_instrument", {"track": track, "instrument_uri": instrument})
            checked("get_device_parameters", {"track": track, "device": 0})
        else:
            print("Instrument loading skipped: no matching built-in instrument in browser reply.", flush=True)
        checked("inspect_track", {"track": track})
        checked("clear_notes", {"track": track, "scene": 0})
    finally:
        try:
            if original_names is not None:
                names = checked("get_track_names", {})["observations"]["/live/song/get/track_names"]
                if names == original_names + [marker]:
                    checked("delete_track", {"track": len(original_names)})
                    restored = checked("get_track_names", {})["observations"]["/live/song/get/track_names"]
                    assert restored == original_names
                    if selected and selected.get("status") == "ok" and selected.get("args"):
                        osc.send("/live/view/set/selected_track", selected["args"])
                    print("Temporary track removed; original track list restored. Playback and tempo were not changed.", flush=True)
                elif names != original_names:
                    print(f"Session changed; automatic cleanup stopped. Inspect the temporary track named {marker!r}.", flush=True)
        finally:
            osc.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", action="store_true", help="Create, verify and remove a temporary MIDI track in the open Live set")
    if parser.parse_args().run:
        run()
    else:
        parser.print_help()
