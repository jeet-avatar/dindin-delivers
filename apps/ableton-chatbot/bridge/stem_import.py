"""Put a local reference's stems into Ableton on new audio tracks, then verify by readback."""

import json

from local_separation import find_folder

DRUM_PARTS = ('kick', 'snare', 'toms', 'cymbals')


def import_names(report):
    """Stems to place. The parent drums file is skipped when its parts exist, so drums never double."""
    names = [stem['name'] for stem in report.get('stems', [])]
    if any(name in DRUM_PARTS for name in names):
        names = [name for name in names if name != 'drums']
    return names


async def import_stems(bridge, reference_id):
    steps = []

    async def query(address, args, timeout=5):
        result = await bridge._query_osc("stems", address, args, timeout)
        steps.append({"number": len(steps) + 1, "kind": "readback", "address": address,
                      "status": result.get("status"), "elapsed_ms": 0})
        if result.get("status") != "ok":
            raise RuntimeError(f"Ableton did not confirm {address}. Update the BeatMind AbletonOSC extension and restart Live.")
        return result["args"]

    try:
        directory = find_folder(reference_id)
        if not directory or not (directory / 'report.json').is_file():
            raise RuntimeError("This reference's stems are not on this computer.")
        names = import_names(json.loads((directory / 'report.json').read_text()))
        files = [(directory / f'{name}.wav', name) for name in names]
        if not files or not all(path.is_file() for path, _ in files):
            raise RuntimeError('Some stem files are missing from the stems folder.')
        if "stem_import_v1" not in await query("/live/song/beatmind_stem_capabilities", []):
            raise RuntimeError("Placing stems needs Ableton Live 12 and the updated BeatMind extension.")
        before = await query("/live/song/get/track_names", [])
        args = ["Ref"]
        for path, name in files:
            args += [str(path), name]
        result = await query("/live/song/beatmind_import_stems", args, timeout=30)
        if result[0] != "imported":
            raise RuntimeError(str(result[-1]) if len(result) > 1 else "Ableton did not import the stems.")
        after = await query("/live/song/get/track_names", [])
        added = after[len(before):]
        if after[:len(before)] != before or added != [f"Ref {name}" for _, name in files]:
            raise RuntimeError("The new tracks do not match the stems that were sent. Inspect the set before continuing.")
        return {"status": "verified", "summary": f"Placed {len(files)} stems on new audio tracks at the start of the Arrangement.",
                "tracks": added, "steps": steps}
    except Exception as error:
        return {"status": "failed", "error": str(error), "summary": str(error), "steps": steps}
