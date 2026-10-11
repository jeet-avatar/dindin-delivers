import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import database


class FakeRaw:
    def commit(self): pass
    def rollback(self): pass


class FakePool:
    """Behaves like psycopg2's pool: refuses outright when every connection is out."""
    def __init__(self, size):
        self.size, self.out, self.most = size, 0, 0
        self.lock = threading.Lock()

    def getconn(self):
        from psycopg2.pool import PoolError
        with self.lock:
            if self.out >= self.size:
                raise PoolError("connection pool exhausted")
            self.out += 1
            self.most = max(self.most, self.out)
        return FakeRaw()

    def putconn(self, raw):
        with self.lock:
            self.out -= 1


class PoolBurstTests(unittest.TestCase):
    def run_burst(self, size, requests):
        pool = FakePool(size)
        with patch.object(database, 'is_postgres', return_value=True), \
             patch.object(database, '_get_pg_pool', return_value=pool), \
             patch.object(database, '_pg_slots', threading.BoundedSemaphore(size)):
            def request(_):
                with database.db():
                    time.sleep(0.01)
                return True
            with ThreadPoolExecutor(max_workers=requests) as workers:
                results = list(workers.map(request, range(requests)))
        return pool, results

    def test_a_burst_bigger_than_the_pool_waits_instead_of_failing(self):
        pool, results = self.run_burst(size=3, requests=60)
        self.assertEqual(results, [True] * 60)
        self.assertEqual(pool.most, 3)
        self.assertEqual(pool.out, 0, 'every connection is returned')

    def test_a_failed_query_still_returns_its_connection(self):
        pool = FakePool(1)
        with patch.object(database, 'is_postgres', return_value=True), \
             patch.object(database, '_get_pg_pool', return_value=pool), \
             patch.object(database, '_pg_slots', threading.BoundedSemaphore(1)):
            for _ in range(3):
                with self.assertRaises(ValueError):
                    with database.db():
                        raise ValueError('query failed')
            with database.db():
                pass
        self.assertEqual(pool.out, 0)


if __name__ == '__main__':
    unittest.main()
