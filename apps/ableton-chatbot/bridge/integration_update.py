"""Update bundled BeatMind extensions, preserving the user's AbletonOSC installation."""

import ast
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import xml.etree.ElementTree as ET


def installed_libraries(home):
    libraries = {home / "Music/Ableton/User Library"}
    for config in (home / "Library/Preferences/Ableton").glob("Live */Library.cfg"):
        try:
            project = ET.parse(config).find(".//UserLibrary/LibraryProject")
            parent, name = project.find("ProjectPath"), project.find("ProjectName")
            path = Path(parent.attrib["Value"]) / name.attrib["Value"]
            if path.is_absolute():
                libraries.add(path)
        except (OSError, ET.ParseError, AttributeError, KeyError):
            continue
    return sorted(libraries)


def registered_integration(browser):
    tree = ast.parse(browser.read_text())
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "init_api":
            for statement in node.body:
                if isinstance(statement, ast.ImportFrom) and statement.module == "beatmind_samples":
                    aliases = {a.asname or a.name for a in statement.names if a.name == "register"}
                    if any(isinstance(child, ast.Call) and isinstance(child.func, ast.Name)
                           and child.func.id in aliases for child in ast.walk(node)):
                        return True
    return False


def update_existing(source=None, home=None):
    source = Path(source) if source else Path(__file__).resolve().parent / "abletonosc"
    home = Path(home) if home else Path.home()
    files = sorted(source.glob("beatmind_*.py"))
    if not files or not (source / "beatmind_automation.py").is_file():
        raise ValueError("The installer is missing its Ableton integration files.")
    payload = {file.name: file.read_bytes() for file in files}
    for name, content in payload.items():
        ast.parse(content, filename=name)
    identifier = hashlib.sha256(b"".join(name.encode() + payload[name] for name in sorted(payload))).hexdigest()
    targets, seen = [], set()
    for library in installed_libraries(home):
        folder = library / "Remote Scripts/AbletonOSC/abletonosc"
        if folder.resolve() in seen or not (folder / "browser.py").is_file():
            continue
        seen.add(folder.resolve())
        if not registered_integration(folder / "browser.py"):
            continue
        targets.append(folder)
    if not targets:
        return {"status": "not_found", "summary": "Existing BeatMind Ableton integration not found. Integration setup is required."}

    updated, backups = [], []
    for folder in targets:
        if any((folder / name).is_symlink() for name in payload):
            raise ValueError("Integration contains linked files. No linked extension was replaced.")
        changes = {name: content for name, content in payload.items()
                   if not (folder / name).is_file() or (folder / name).read_bytes() != content}
        if not changes:
            continue
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup = home / ".beatmind/integration-backups" / stamp
        backup.mkdir(parents=True, mode=0o700)
        original = {name: (folder / name).read_bytes() if (folder / name).exists() else None for name in changes}
        for name, content in original.items():
            if content is not None:
                (backup / name).write_bytes(content)
        (backup / "manifest.json").write_text(json.dumps({"destination": str(folder), "bundle": identifier,
            "new_files": [name for name, content in original.items() if content is None]}))
        # Stage complete, parsed files on the destination volume before replacing any module.
        with tempfile.TemporaryDirectory(prefix=".beatmind-update-", dir=folder.parent) as temporary:
            staging = Path(temporary)
            for name, content in changes.items():
                (staging / name).write_bytes(content)
            replaced = []
            try:
                for name in changes:
                    os.replace(staging / name, folder / name)
                    replaced.append(name)
                if any((folder / name).read_bytes() != content for name, content in changes.items()):
                    raise OSError("Integration file verification failed")
            except Exception:
                for name in reversed(replaced):
                    if original[name] is None:
                        (folder / name).unlink()
                    else:
                        shutil.copy2(backup / name, folder / name)
                raise
        updated.append(str(folder))
        backups.append(str(backup))
    return {"status": "updated" if updated else "current", "updated": updated, "backups": backups,
            "summary": "Ableton integration updated. Save your work and restart Live to activate it."
            if updated else "Installed Ableton integration files are current."}
