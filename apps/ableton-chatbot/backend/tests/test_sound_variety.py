import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import production


class RecentSoundChoicesTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        patcher = patch.object(production, 'ROOT', self.root)
        patcher.start()
        self.addCleanup(patcher.stop)

    def write(self, name, user, session, source, stamp):
        file = self.root / (name + '.json')
        file.write_text(json.dumps({'user_id': user, 'session_id': session,
            'parts': [{'role': 'drums', 'source': source, 'sound': 'dry', 'status': 'planned'}]}))
        os.utime(file, (stamp, stamp))

    def test_only_other_songs_owned_by_this_user_are_included(self):
        self.write('other-user', 2, 'other', 'Private kit', 30)
        self.write('current', 1, 'current', 'Current kit', 20)
        self.write('previous', 1, 'previous', 'Previous kit', 10)
        choices = production.recent_sound_choices(1, 'current')
        self.assertEqual([choice['source'] for choice in choices], ['Previous kit'])
        self.assertEqual(choices[0]['status'], 'planned')

    def test_newest_first_deduplicated_and_bounded(self):
        self.write('old', 1, 'old', 'Old kit', 10)
        self.write('new', 1, 'new', 'New kit', 30)
        self.write('duplicate', 1, 'duplicate', 'New kit', 20)
        self.assertEqual([c['source'] for c in production.recent_sound_choices(1, 'current')], ['New kit', 'Old kit'])
        self.assertEqual(len(production.recent_sound_choices(1, 'current', limit=1)), 1)

    def test_corrupt_or_incomplete_history_does_not_break_chat(self):
        for name, value in [('broken', '{'), ('list', '[]'), ('parts', '{"user_id":1,"parts":null}'),
                            ('part', '{"user_id":1,"parts":[null,{"source":3}]}')]:
            (self.root / (name + '.json')).write_text(value)
        self.assertEqual(production.recent_sound_choices(1, 'current'), [])
