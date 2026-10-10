"""Download cloud-separated stems from the API and place them in Ableton."""

import asyncio
from pathlib import Path
from urllib.request import urlopen, Request

STEM_ROOT = Path.home() / "Music" / "BeatMind Stems"


def _download_stem(base_url, name, token, dest):
    url = f"{base_url}/{name}?token={token}"
    req = Request(url, headers={"User-Agent": "BeatMind-Bridge"})
    with urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())
    if not dest.stat().st_size:
        raise RuntimeError(f"Downloaded empty file for stem '{name}'.")


async def import_cloud_stems(bridge, reference_id, stems, base_url, token):
    steps = []

    async def query(address, args, timeout=5):
        result = await bridge._query_osc("cloud-stems", address, args, timeout)
        steps.append({"number": len(steps) + 1, "address": address, "status": result.get("status")})
        if result.get("status") != "ok":
            raise RuntimeError(f"Ableton did not confirm {address}. Update the BeatMind extension and restart Live.")
        return result["args"]

    try:
        if not stems:
            raise RuntimeError("No stems to import.")

        ref_dir = STEM_ROOT / reference_id
        ref_dir.mkdir(parents=True, exist_ok=True)
        files = []
        for name in stems:
            dest = ref_dir / f"{name}.wav"
            await asyncio.to_thread(_download_stem, base_url, name, token, dest)
            files.append((dest, name))

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

        return {"status": "verified",
                "summary": f"Placed {len(files)} reference stems on new audio tracks in Ableton.",
                "tracks": added, "steps": steps}
    except Exception as error:
        return {"status": "failed", "error": str(error), "summary": str(error), "steps": steps}
