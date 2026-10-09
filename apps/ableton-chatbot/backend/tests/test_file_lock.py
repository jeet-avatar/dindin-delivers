import asyncio
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from file_lock import Lease
import references


class LeaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_background_success_and_failure_release_lease(self):
        for fails in (False, True):
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / '.lock'
                lease = Lease(path)
                async def finish():
                    if fails:
                        raise RuntimeError('Worker failed')
                task = asyncio.create_task(finish())
                lease.transfer(task)
                await asyncio.gather(task, return_exceptions=True)
                await asyncio.sleep(0)
                with Lease(path):
                    pass

    async def test_other_process_excluded_until_owner_closes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '.lock'
            code = ('from file_lock import Lease, Busy\nimport sys\n'
                    'try:\n with Lease(sys.argv[1]): pass\n'
                    'except Busy: sys.exit(9)\n')
            with Lease(path):
                self.assertEqual(subprocess.run([sys.executable, '-c', code, str(path)]).returncode, 9)
            self.assertEqual(subprocess.run([sys.executable, '-c', code, str(path)]).returncode, 0)

    async def test_background_task_cancellation_releases_lease(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '.lock'
            lease = Lease(path)
            task = asyncio.create_task(asyncio.sleep(100))
            lease.transfer(task)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
            await asyncio.sleep(0)
            with Lease(path):
                pass

    async def test_recovery_does_not_mark_another_workers_jobs_failed(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(references, 'ROOT', Path(directory)), \
                patch.object(references, '_recover_interrupted') as recover:
            with references.operation_lease():
                references.recover_interrupted()
                recover.assert_not_called()
            references.recover_interrupted()
            recover.assert_called_once()
