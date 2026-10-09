import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import product_updates
from beatmind_auth import create_token
from database import create_user, db

CAMPAIGN = dict(subject='S', headline='H', lines=['one'], cta_label='Get it', cta_url='https://www.beatmind.io/x')


class ProductUpdateTests(unittest.TestCase):
    def setUp(self):
        self.a = create_user(f'updates-a-{id(self)}@example.com', 'x', 'Ann Smith', '2999-01-01T00:00:00')
        self.b = create_user(f'updates-b-{id(self)}@example.com', 'x', 'Bo', '2999-01-01T00:00:00')
        self.sent = []
        self.patch = patch.object(product_updates, 'send_email', lambda to, subject, plain, html, headers: self.sent.append((to, plain, headers)) or 'id')
        self.patch.start(); self.addCleanup(self.patch.stop)
        product_updates.SEND_INTERVAL_SECONDS = 0
        self.campaign = f'test-{id(self)}'

    def mine(self):
        return [s for s in self.sent if s[0] in (self.a['email'], self.b['email'])]

    def test_each_opted_in_user_gets_a_campaign_once(self):
        product_updates.send_campaign(self.campaign, **CAMPAIGN)
        product_updates.send_campaign(self.campaign, **CAMPAIGN)
        self.assertEqual(sorted(s[0] for s in self.mine()), sorted([self.a['email'], self.b['email']]))
        plain, headers = self.mine()[0][1], self.mine()[0][2]
        self.assertIn('/api/email/unsubscribe?token=', plain)
        self.assertIn('List-Unsubscribe', headers)
        self.assertIn('never interrupt an open Ableton project', plain)

    def test_unsubscribe_link_stops_future_campaigns(self):
        import main
        token = product_updates.unsubscribe_token(self.a['id'])
        self.assertEqual(TestClient(main.app).get('/api/email/unsubscribe', params={'token': token}).status_code, 200)
        product_updates.send_campaign(self.campaign, **CAMPAIGN)
        self.assertEqual([s[0] for s in self.mine()], [self.b['email']])

    def test_login_tokens_and_garbage_cannot_unsubscribe_anyone(self):
        import main
        client = TestClient(main.app)
        for token in (create_token(self.a['id'], self.a['email']), 'garbage'):
            self.assertEqual(client.post('/api/email/unsubscribe', params={'token': token}).status_code, 400)
        self.assertIn(self.a['email'], [r['email'] for r in product_updates.recipients(self.campaign)])

    def test_only_and_dry_run_and_failures(self):
        sent, errors, planned = product_updates.send_campaign(self.campaign, only_email=self.b['email'], dry_run=True, **CAMPAIGN)
        self.assertEqual((sent, planned, self.mine()), (0, [self.b['email']], []))
        def flaky(to, *args):
            if to == self.a['email']:
                raise RuntimeError('rejected')
            self.sent.append((to, '', {}))
            return 'id'
        with patch.object(product_updates, 'send_email', flaky):
            product_updates.send_campaign(self.campaign, **CAMPAIGN)
        self.assertIn(self.b['email'], [s[0] for s in self.mine()])
        self.assertIn(self.a['email'], [r['email'] for r in product_updates.recipients(self.campaign)], 'retried next time')


if __name__ == '__main__':
    unittest.main()
