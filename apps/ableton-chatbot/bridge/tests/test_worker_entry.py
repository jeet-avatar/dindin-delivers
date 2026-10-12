"""A packaged worker must dispatch before importing or opening the GUI."""
from pathlib import Path
import subprocess
import sys
import unittest


class WorkerEntryTests(unittest.TestCase):
    def test_worker_dispatch_precedes_gui_imports(self):
        entry = Path(__file__).resolve().parents[1] / 'bridge_app.py'
        probe = """import runpy, sys, types
module = types.ModuleType('multiprocessing')
def freeze_support():
    assert 'tkinter' not in sys.modules
    raise SystemExit(73)
module.freeze_support = freeze_support
sys.modules['multiprocessing'] = module
runpy.run_path(sys.argv[1], run_name='__main__')
"""
        result = subprocess.run([sys.executable, '-c', probe, str(entry)], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 73, result.stderr)
