import unittest
from session_context import matching_recordings, current_plan, context_note


class SessionContextTests(unittest.TestCase):
    def setUp(self):
        self.old = [{"id": "clap", "track": 18, "track_name": "Peak Bites Clap Layer", "decision": "pending"},
                    {"id": "groove", "track": 16, "track_name": "Peak Bites Deep Techno Groove", "decision": "revise"}]

    def test_new_two_track_set_excludes_old_reviews(self):
        matches = matching_recordings(self.old, ["1-Omnisphere", "MPC"])
        self.assertEqual(matches, [])
        note = context_note(["1-Omnisphere", "MPC"], matches, None)
        self.assertNotIn("Peak Bites", note)
        self.assertIn('"matching_recording_decisions": []', note)

    def test_same_index_different_name_excluded(self):
        self.assertEqual(matching_recordings([dict(self.old[0], track=0)], ["1-Omnisphere"]), [])

    def test_invalid_indices_excluded(self):
        for index in [-1, True, "0", None, 3]:
            self.assertEqual(matching_recordings([dict(self.old[0], track=index)], ["Peak Bites Clap Layer"]), [])

    def test_relevant_review_retained(self):
        item = dict(self.old[0], track=0)
        self.assertEqual(matching_recordings([item], [item["track_name"]]), [item])

    def test_old_plan_not_reintroduced(self):
        plan = {"title": "Peak Bites", "parts": [{"recording_id": "clap"}]}
        self.assertIsNone(current_plan(plan, []))
        self.assertEqual(current_plan(plan, self.old), plan)
        self.assertNotIn("Peak Bites", context_note(["1-Omnisphere", "MPC"], [], plan))

    def test_unstarted_brief_and_missing_plan(self):
        self.assertIsNone(current_plan(None, []))
        plan = {"parts": [{"status": "planned"}]}
        self.assertEqual(current_plan(plan, []), plan)


if __name__ == "__main__":
    unittest.main()
