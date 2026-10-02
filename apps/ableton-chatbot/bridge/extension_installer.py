"""User-triggered update of BeatMind modules in an already registered AbletonOSC."""
import ast
import os
from pathlib import Path
import shutil
import sys
import tempfile
import uuid


def install(source=None, target=None, backup_root=None):
    source = source or Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / "abletonosc"
    target = target or Path.home() / "Music/Ableton/User Library/Remote Scripts/AbletonOSC/abletonosc"
    backup_root = backup_root or Path.home() / ".beatmind/extension-backups"
    if target.is_symlink() or not (target / "browser.py").is_file():
        raise RuntimeError("Install and enable AbletonOSC in your User Library first. No files changed.")
    tree = ast.parse((target / "browser.py").read_text())
    if not any(isinstance(node, ast.ImportFrom) and node.module == "beatmind_samples"
               and any(alias.name == "register" for alias in node.names) for node in ast.walk(tree)):
        raise RuntimeError("AbletonOSC does not have BeatMind registration yet. Complete its setup before updating. No files changed.")
    files = sorted(source.glob("beatmind_*.py"))
    required = {"beatmind_samples.py", "beatmind_view.py", "beatmind_arrangement_preview.py", "beatmind_automation.py"}
    if not required <= {p.name for p in files} or any(p.is_symlink() for p in files):
        raise RuntimeError("The Bridge bundle is missing integration files. Nothing was installed.")
    for path in files:
        ast.parse(path.read_text())
        if (target / path.name).is_symlink():
            raise RuntimeError("An integration file is a symbolic link. No files changed.")
    backup = backup_root / uuid.uuid4().hex
    backup.mkdir(parents=True, mode=0o700)
    previous = {p.name: (target / p.name).read_bytes() if (target / p.name).exists() else None for p in files}
    for name, data in previous.items():
        if data is not None:
            (backup / name).write_bytes(data)
    changed = []
    try:
        for path in files:
            fd, temporary = tempfile.mkstemp(prefix=".beatmind-", dir=target)
            try:
                with os.fdopen(fd, "wb") as handle:
                    handle.write(path.read_bytes())
                os.replace(temporary, target / path.name)
                changed.append(path.name)
            finally:
                Path(temporary).unlink(missing_ok=True)
    except Exception:
        for name in reversed(changed):
            if previous[name] is None:
                (target / name).unlink(missing_ok=True)
            else:
                shutil.copy2(backup / name, target / name)
        raise
    return {"files": len(files), "backup": str(backup), "restart_required": True}
