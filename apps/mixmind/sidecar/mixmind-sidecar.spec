# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = []
binaries = []
hiddenimports = [
    'uvicorn.logging',
    'uvicorn.lifespan.on',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets.auto',
    'fastapi',
    'sqlalchemy.dialects.sqlite',
    # Phase 21 native-export modules — bundled into PyInstaller collection
    # so `main.py` + FastAPI routers can `import pdb_writer`, `usb_exporter`,
    # etc. at runtime from the frozen bundle. PyInstaller's static analysis
    # SHOULD find these via the main.py import graph, but they are listed
    # explicitly as a safety net.
    'folder_scanner',
    'import_routes',
    'anlz_structs',
    'anlz_writer',
    'anlz_parser',
    'pdb_structs',
    'pdb_writer',
    'pdb_reader',
    'pdb_ext_writer',
    'export_library_db',
    'pioneer_aux_writer',
    'pioneer_usb',
    'usb_layout',
    'usb_exporter',
    'artwork_extractor',
    'artwork_writer',
    # Third-party deps that may not be picked up by static analysis
    'construct',
    'mutagen',
    'mutagen.id3',
    'mutagen.flac',
    'mutagen.mp4',
    'mutagen.wave',
    'mutagen.aiff',
    'PIL',
    'PIL.Image',
    'PIL.JpegImagePlugin',
]
tmp_ret = collect_all('pyrekordbox')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
# Ensure construct + Pillow assets ride along with the frozen bundle.
for pkg in ('construct', 'mutagen', 'PIL'):
    try:
        tmp_ret = collect_all(pkg)
        datas += tmp_ret[0]
        binaries += tmp_ret[1]
        hiddenimports += tmp_ret[2]
    except Exception:
        pass


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='mixmind-sidecar',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='mixmind-sidecar',
)
