import unittest

from producer_reply import preview_reply


def action(tool, status="verified", data=None, **result):
    return {"tool": tool, "input": data or {}, "result": {"status": status, **result}}


def capture(**recording):
    return action("audition_part", recording={"track": 2, "scene": 0, "track_name": "Kick", **recording})


class ProducerReplyTests(unittest.TestCase):
    def test_explains_actual_part_and_design_without_claiming_listening(self):
        reply = preview_reply([
            action("describe_sound", "observed", {"track": 2, "scene": 0,
                   "character": "Short punchy kick", "rhythm": "Four on the floor", "mix_intent": "Leave room for bass"}),
            action("add_notes", data={"track": 2}), capture(),
        ])
        self.assertIn("Kick: part preview", reply)
        self.assertIn("Intended sound: Short punchy kick; Four on the floor; Leave room for bass", reply)
        self.assertIn("Changes checked: MIDI pattern", reply)
        self.assertIn("tone, groove or effects", reply)
        self.assertIn("does not mean the full song is finished", reply)

    def test_does_not_borrow_other_tracks_or_scenes_design(self):
        reply = preview_reply([
            action("describe_sound", data={"track": 1, "scene": 0, "character": "Wrong bass"}),
            action("describe_sound", data={"track": 2, "scene": 3, "character": "Wrong section"}),
            action("load_effect", data={"track": 1}), capture(),
        ])
        self.assertNotIn("Wrong", reply)
        self.assertNotIn("Changes checked", reply)

    def test_pack_identity_and_unverified_step_are_visible(self):
        reply = preview_reply([
            action("load_pack_sample", data={"track": 2}, source={"pack_name": "User Pack", "relative_path": "Kicks/01.wav"}),
            action("set_device_control", "unverified", {"track": 2}, summary="Readback timed out"), capture(),
        ])
        self.assertIn("Verified source: User Pack / Kicks/01.wav", reply)
        self.assertIn("Needs attention: set device control", reply)
        self.assertIn("Readback timed out", reply)
        self.assertNotIn("Changes checked: instrument settings", reply)

    def test_failed_or_unverified_capture_is_not_ready(self):
        for status in ("failed", "partial", "unverified"):
            self.assertIsNone(preview_reply([action("audition_part", status, recording={"track_name": "Kick"})]))
        self.assertIsNone(preview_reply([action("audition_part")]))

    def test_revision_retains_before_after_and_scene_has_mix_options(self):
        self.assertIn("earlier recording and its decision remain saved", preview_reply([capture(supersedes="old")]))
        reply = preview_reply([action("audition_scene", recording={"kind": "scene", "scene_name": "Drop"})])
        self.assertIn("Drop: full-mix preview", reply)
        self.assertIn("balance, section energy or transitions", reply)

    def test_latest_capture_used_and_changes_not_invented_from_later_actions(self):
        reply = preview_reply([capture(), action("set_track_pan", data={"track": 2})])
        self.assertNotIn("Changes checked", reply)
        reply = preview_reply([capture(), capture(track=3, track_name="Bass")])
        self.assertIn("Bass: part preview", reply)


if __name__ == "__main__":
    unittest.main()
