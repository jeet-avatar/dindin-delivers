"""Pack-scoped sample catalog. No basename fallback or arbitrary filesystem access."""

import asyncio
import hashlib
import json
import os
from pathlib import Path
import subprocess

AUDIO_EXTENSIONS = {".wav", ".aif", ".aiff", ".flac", ".ogg", ".mp3", ".m4a"}


def identifier(path):
    return hashlib.sha256(str(path).encode()).hexdigest()[:24]


class SampleLibrary:
    def __init__(self, roots=None):
        self.roots = roots if roots is not None else [Path.home() / "Music/Ableton/Factory Packs",
                                                     Path.home() / "Music/Ableton/User Library/BeatMind Packs"]
        self.catalogs = {}

    def packs(self):
        found = {}
        for root in self.roots:
            if not root.is_dir():
                continue
            for path in sorted(root.iterdir()):
                if path.is_dir() and not path.is_symlink():
                    found[identifier(path.resolve())] = path.resolve()
        return found

    def catalog(self, pack_id):
        root = self.packs().get(pack_id)
        if root is None:
            raise ValueError("Pack is not installed in a registered sample-library folder.")
        samples = {}
        errors = []
        for directory, folders, files in os.walk(root, followlinks=False, onerror=lambda e: errors.append(str(e))):
            folders[:] = sorted(folder for folder in folders if folder not in {"Ableton Folder Info", "__MACOSX"}
                                and not (Path(directory) / folder).is_symlink())
            for filename in sorted(files):
                path = Path(directory) / filename
                if path.suffix.lower() not in AUDIO_EXTENSIONS or path.is_symlink():
                    continue
                try:
                    stat = path.stat()
                    relative = str(path.relative_to(root))
                    sample_id = identifier(path)
                    samples[sample_id] = {"sample_id": sample_id, "pack_id": pack_id, "pack_name": root.name,
                                          "relative_path": relative, "name": path.name,
                                          "bytes": stat.st_size, "modified_ns": stat.st_mtime_ns}
                except OSError as error:
                    errors.append(str(error))
        self.catalogs[pack_id] = samples
        return root, samples, errors

    def sample(self, pack_id, sample_id):
        root, samples, errors = self.catalog(pack_id)
        if errors:
            raise ValueError("Some pack files could not be read. Resolve the library permissions before loading.")
        item = samples.get(sample_id)
        if item is None:
            raise ValueError("Sample is not in the selected pack. Search the pack again.")
        path = (root / item["relative_path"]).resolve()
        if not path.is_relative_to(root):
            raise ValueError("Sample path escaped its pack.")
        return path, item

    def inspect(self, pack_id, sample_id):
        path, item = self.sample(pack_id, sample_id)
        with path.open("rb") as stream:
            checksum = hashlib.file_digest(stream, "sha256").hexdigest()
        result = {**item, "sha256": checksum, "analysis_basis": "File identity and audio metadata, not a listening assessment."}
        try:
            probe = subprocess.run(["/opt/homebrew/bin/ffprobe", "-v", "error", "-show_entries",
                                    "format=duration:stream=sample_rate,channels,codec_name", "-of", "json", str(path)],
                                   capture_output=True, text=True, timeout=8, check=True)
            result["audio_metadata"] = json.loads(probe.stdout)
        except (OSError, subprocess.SubprocessError, ValueError):
            result["metadata_warning"] = "Audio metadata unavailable; filename tags are not verified key or tempo."
        return result

    def read(self, operation, data):
        if operation == "list_sample_packs":
            return {"status": "observed", "packs": [{"pack_id": key, "name": path.name} for key, path in self.packs().items()],
                    "summary": "Sample packs in registered Factory Packs and User Library/BeatMind Packs folders.", "steps": []}
        if operation == "inspect_pack_sample":
            return {"status": "observed", "source": self.inspect(data["pack_id"], data["sample_id"]),
                    "summary": "Read the selected sample's file identity and audio metadata.", "steps": []}
        if operation != "search_pack_samples":
            raise ValueError("Unsupported library operation")
        root, samples, errors = self.catalog(data["pack_id"])
        query = data.get("query", "").casefold()
        matches = [item for item in samples.values() if query in item["relative_path"].casefold()]
        offset, limit = data.get("offset", 0), data.get("limit", 50)
        return {"status": "observed" if not errors else "unverified", "pack_name": root.name,
                "total_samples": len(samples), "matching_samples": len(matches), "scan_complete": not errors,
                "samples": matches[offset:offset + limit], "next_offset": offset + limit if offset + limit < len(matches) else None,
                "errors": errors, "summary": f"Indexed {len(samples)} audio files in {root.name}; {len(matches)} match. This is a file catalog, not an analysis of every sound.", "steps": []}


async def load_exact(bridge, library, data):
    steps = []
    mutated = False

    async def query(address, args):
        result = await bridge._query_osc("sample", address, args, 5)
        steps.append({"number": len(steps) + 1, "kind": "readback", "address": address, "args": args,
                      "status": result.get("status"), "result": result, "elapsed_ms": 0})
        if result.get("status") != "ok" or result.get("args", [None])[0] in {"error", "not_found"}:
            raise ValueError(f"Ableton did not confirm {address}. Exact-pack loading requires the updated AbletonOSC sample extension; reload that control surface if needed.")
        return result["args"]

    try:
        source = await asyncio.to_thread(library.inspect, data["pack_id"], data["sample_id"])
        path, _ = await asyncio.to_thread(library.sample, data["pack_id"], data["sample_id"])
        capabilities = await query("/live/browser/beatmind_capabilities", [])
        if "exact_sample_v1" not in capabilities:
            raise ValueError("This AbletonOSC version cannot verify exact sample origins. No fallback was attempted.")
        track = data["track"]
        names = await query("/live/song/get/track_names", [])
        if track < 0 or track >= len(names):
            raise ValueError("Track no longer exists.")
        if not (await query("/live/track/get/has_midi_input", [track]))[-1]:
            raise ValueError("Select an empty MIDI instrument track for the sample.")
        types = await query("/live/track/get/devices/type", [track])
        if 1 in types[1:]:
            raise ValueError("Track already has an instrument. No sound was replaced.")
        mutated = True
        loaded = await query("/live/browser/load_sample_exact", [track, str(path)])
        if loaded[0] != "loaded":
            raise ValueError("The exact sample was not loaded; no filename fallback was attempted.")
        observed = None
        for _ in range(6):
            try:
                observed = await query("/live/browser/get_loaded_sample", [track])
            except ValueError:
                observed = None
            if observed and observed[0] == str(path):
                break
            await asyncio.sleep(0.2)
        if not observed or observed[0] != str(path):
            raise ValueError("Loaded sample path does not match the selected pack file. Inspect this track before continuing.")
        after = await asyncio.to_thread(library.inspect, data["pack_id"], data["sample_id"])
        if after["sha256"] != source["sha256"]:
            raise ValueError("Sample file changed while loading. Exact source verification failed.")
        return {"status": "verified", "source": source, "steps": steps,
                "summary": f"Verified sample source: {source['pack_name']} / {source['relative_path']}. Audition it before approving the sound."}
    except Exception as error:
        return {"status": "partial" if mutated else "failed", "summary": str(error), "error": str(error), "steps": steps}
