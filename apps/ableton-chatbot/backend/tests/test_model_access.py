import unittest

from fastapi import HTTPException
import model_access


class TrialModelAccessTests(unittest.TestCase):
    def test_trial_can_use_fast_mode(self):
        self.assertEqual(model_access.available_models('trial'), ['fast'])
        model, tier, _ = model_access.resolve(None, 'trial', provider='bedrock')
        self.assertEqual(tier, 'fast')
        self.assertEqual(model, model_access.TIERS['fast']['bedrock'])

    def test_trial_cannot_use_paid_model_tiers(self):
        for tier in ('pro', 'ultra'):
            with self.subTest(tier=tier), self.assertRaises(HTTPException) as caught:
                model_access.resolve(tier, 'trial', provider='bedrock')
            self.assertEqual(caught.exception.status_code, 403)

    def test_paid_plan_access_is_preserved(self):
        self.assertEqual(model_access.available_models('starter'), ['fast'])
        self.assertEqual(model_access.available_models('pro'), ['fast', 'pro'])
        self.assertEqual(model_access.available_models('studio'), ['fast', 'pro', 'ultra'])
