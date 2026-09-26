import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class StorageConfigTests(unittest.TestCase):
    def test_configured_storage_survives_a_new_process(self):
        with tempfile.TemporaryDirectory() as root:
            environment = dict(os.environ, PYTHON_DOTENV_DISABLED="1",
                               BEATMIND_RECORDINGS_DIR=f"{root}/recordings",
                               BEATMIND_PLANS_DIR=f"{root}/plans",
                               BEATMIND_SECTIONS_DIR=f"{root}/sections")
            cwd = Path(__file__).resolve().parents[1]
            common = "import os, recordings, production, sections\n"
            write = common + """
for module, key in [(recordings, 'BEATMIND_RECORDINGS_DIR'),
                    (production, 'BEATMIND_PLANS_DIR'),
                    (sections, 'BEATMIND_SECTIONS_DIR')]:
    assert str(module.ROOT) == os.environ[key]
    module.ROOT.mkdir(parents=True)
    (module.ROOT / 'probe').write_text('retained')
"""
            read = common + """
for module in [recordings, production, sections]:
    assert (module.ROOT / 'probe').read_text() == 'retained'
"""
            for code in (write, read):
                result = subprocess.run([sys.executable, "-c", code], cwd=cwd,
                                        env=environment, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
