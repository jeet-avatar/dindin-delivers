# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files

anthropic_datas = collect_data_files('anthropic')
openai_datas    = collect_data_files('openai')
httpx_datas     = collect_data_files('httpx')
certifi_datas   = collect_data_files('certifi')

a = Analysis(
    ['interview_assistant_windows.py'],
    pathex=[],
    binaries=[],
    datas=anthropic_datas + openai_datas + httpx_datas + certifi_datas,
    hiddenimports=[
        'sounddevice',
        '_sounddevice_data',
        'numpy',
        'numpy.core._methods',
        'numpy.lib.format',
        'pynput',
        'pynput.keyboard',
        'pynput.mouse',
        'pynput._util',
        'pynput._util.win32',      # Windows-specific (replaces darwin)
        'tkinter',
        'tkinter.ttk',
        'anthropic',
        'anthropic._legacy_response',
        'anthropic._streaming',
        'openai',
        'httpx',
        'httpcore',
        'anyio',
        'anyio._backends._asyncio',
        'anyio._backends._trio',
        'sniffio',
        'certifi',
        'h11',
        'queue',
        'wave',
        'struct',
    ],
    excludes=[
        'sklearn', 'scikit_learn',
        'selenium', 'nltk', 'scipy', 'pandas', 'matplotlib',
        'PIL', 'Pillow', 'cv2', 'tensorflow', 'torch',
        'flask', 'fastapi', 'uvicorn', 'django', 'aiohttp',
        'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'Qt',
        'pytest', 'IPython', 'jupyter',
        'cryptography', 'paramiko',
        'boto3', 'botocore',
        'google', 'grpc',
        'docutils', 'sphinx',
        'AppKit', 'Foundation', 'objc',  # macOS only — exclude on Windows
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Interview Assistant',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    onefile=True,
    icon=None,
)
