"""Backed-up BeatMind setup for stock AbletonOSC and updates for existing users."""
import ast
import os
from pathlib import Path
import shutil
import sys
import tempfile
import uuid


def registration(target):
    browser = target / "browser.py"
    if browser.is_symlink():
        raise RuntimeError("Integration registration is a symbolic link. No files changed.")
    if browser.is_file():
        tree = ast.parse(browser.read_text())
        if any(isinstance(node, ast.ImportFrom) and node.module == "beatmind_samples"
               and any(alias.name == "register" for alias in node.names) for node in ast.walk(tree)):
            return None
        raise RuntimeError("This custom browser integration is not recognized. No files changed.")
    manager = target.parent / "manager.py"
    if manager.is_symlink() or not manager.is_file() or not (target / "handler.py").is_file():
        raise RuntimeError("Install AbletonOSC in your User Library first, then run setup again. No files changed.")
    text = manager.read_text()
    tree = ast.parse(text)
    classes = [node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Manager"]
    methods = [node for cls in classes for node in cls.body if isinstance(node, ast.FunctionDef) and node.name == "init_api"]
    if len(methods) != 1:
        raise RuntimeError("AbletonOSC registration is not recognized. No files changed.")
    method = methods[0]
    imports = [n for n in ast.walk(method) if isinstance(n, ast.ImportFrom) and n.level == 1
               and n.module == "abletonosc.beatmind_bootstrap"]
    if imports:
        calls = [n for n in ast.walk(method) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
                 and n.func.id == "attach_beatmind" and len(n.args) == 1 and isinstance(n.args[0], ast.Name)
                 and n.args[0].id == "self"]
        if (len(imports) == 1 and len(calls) == 1
                and any(a.name == "attach" and a.asname == "attach_beatmind" for a in imports[0].names)):
            return None
        raise RuntimeError("Incomplete BeatMind registration. No files changed.")
    assignments = [n for n in ast.walk(method) if isinstance(n, ast.Assign)
                   and any(isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name)
                           and t.value.id == "self" and t.attr == "handlers" for t in n.targets)]
    if len(assignments) != 1 or not isinstance(assignments[0].value, ast.List):
        raise RuntimeError("AbletonOSC handler list is not recognized. No files changed.")
    statement = assignments[0]
    lines = text.splitlines(keepends=True)
    if not lines[statement.end_lineno - 1].endswith("\n"):
        lines[statement.end_lineno - 1] += "\n"
    indent = " " * statement.col_offset
    lines.insert(statement.end_lineno, indent + "from .abletonosc.beatmind_bootstrap import attach as attach_beatmind\n"
                 + indent + "attach_beatmind(self)\n")
    updated = "".join(lines)
    ast.parse(updated)
    return manager, updated.encode()


def install(source=None, target=None, backup_root=None, bundle=None):
    source = source or Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / "abletonosc"
    target = target or Path.home() / "Music/Ableton/User Library/Remote Scripts/AbletonOSC/abletonosc"
    backup_root = backup_root or Path.home() / ".beatmind/extension-backups"
    if target.is_symlink() or target.parent.is_symlink():
        raise RuntimeError("Integration destination is a symbolic link. Choose the actual User Library folder. No files changed.")
    if not target.is_dir():
        if target.parent.exists():
            raise RuntimeError("An incomplete AbletonOSC folder already exists. Choose the correct User Library or move that folder aside after backing it up. No files changed.")
        return install_first_time(source, target, backup_root, bundle)
    setup = registration(target)
    files = sorted(source.glob("beatmind_*.py"))
    required = {"beatmind_" + name + ".py" for name in (
        "samples", "view", "arrangement_preview", "automation", "mixer", "master", "sidechain", "stems")}
    if not required <= {p.name for p in files} or any(p.is_symlink() for p in files):
        raise RuntimeError("The Bridge bundle is missing integration files. Nothing was installed.")
    if not (target / "browser.py").exists() and not (source / "beatmind_bootstrap.py").is_file():
        raise RuntimeError("The Bridge bundle is missing first-time setup files. Nothing was installed.")
    for path in files:
        ast.parse(path.read_text())
        if (target / path.name).is_symlink():
            raise RuntimeError("An integration file is a symbolic link. No files changed.")
    backup = backup_root / uuid.uuid4().hex
    backup.mkdir(parents=True, mode=0o700)
    payload = {target / p.name: p.read_bytes() for p in files}
    if setup:
        payload[setup[0]] = setup[1]
    previous = {path: path.read_bytes() if path.exists() else None for path in payload}
    for path, data in previous.items():
        if data is not None:
            (backup / path.name).write_bytes(data)
    changed = []
    try:
        for path, data in payload.items():
            fd, temporary = tempfile.mkstemp(prefix=".beatmind-", dir=path.parent)
            try:
                with os.fdopen(fd, "wb") as handle:
                    handle.write(data)
                os.replace(temporary, path)
                changed.append(path)
            finally:
                Path(temporary).unlink(missing_ok=True)
    except Exception:
        for path in reversed(changed):
            if previous[path] is None:
                path.unlink(missing_ok=True)
            else:
                shutil.copy2(backup / path.name, path)
        raise
    return {"files": len(payload), "backup": str(backup), "restart_required": True, "first_setup": bool(setup)}


def install_first_time(source, target, backup_root, bundle=None):
    from abletonosc_bundle import payload
    bundle = bundle or Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / "AbletonOSC.zip"
    if not bundle.is_file():
        raise RuntimeError("This Bridge is missing the first-time integration bundle. Install the latest BeatMind Bridge. No files changed.")
    files = payload(bundle)
    scripts = target.parent.parent
    scripts.mkdir(parents=True, exist_ok=True)
    # Stage the complete base and extensions before publishing a new control surface.
    with tempfile.TemporaryDirectory(prefix=".beatmind-setup-", dir=scripts) as temporary:
        staged = Path(temporary) / "AbletonOSC"
        for relative, data in files.items():
            path = staged / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        result = install(source, staged / "abletonosc", backup_root)
        if target.parent.exists() or target.parent.is_symlink():
            raise RuntimeError("AbletonOSC appeared during setup. Nothing was replaced; run setup again.")
        os.rename(staged, target.parent)
    return {**result, "first_setup": True, "base_installed": True}


def self_check():
    with tempfile.TemporaryDirectory(prefix='beatmind-integration-check-') as temporary:
        root = Path(temporary)
        target = root / 'User Library/Remote Scripts/AbletonOSC/abletonosc'
        first = install(target=target, backup_root=root / 'backups')
        second = install(target=target, backup_root=root / 'backups')
        assert first['base_installed'] and not second['first_setup']
        assert (target.parent / 'LICENSE.md').is_file()
        assert (target.parent / 'pythonosc/osc_server.py').is_file()
        assert 'attach_beatmind(self)' in (target.parent / 'manager.py').read_text()
    return {'fresh_install': True, 'repeat_install': True, 'user_library_unchanged': True}
