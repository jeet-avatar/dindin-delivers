import json
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import billing
from database import db

PACKS = json.dumps([{"id": "tracks_10", "kind": "track", "credits": 10, "price_id": "price_tracks10"},
                    {"id": "cloud_5", "kind": "cloud", "credits": 5, "price_id": "price_cloud5"},
                    {"id": "bad", "kind": "track", "credits": -3, "price_id": "price_bad"}])


class BillingTests(unittest.TestCase):
    user = 900

    def setUp(self):
        with db() as conn:
            conn.execute("DELETE FROM credit_ledger WHERE user_id=?", (self.user,))
            conn.execute("DELETE FROM separations WHERE user_id=?", (self.user,))

    def configure(self, included=0, packs=PACKS):
        return patch.dict(os.environ, {"BEATMIND_INCLUDED_TRACKS": str(included), "BEATMIND_PACKS": packs})

    def ref(self, n):
        return f"{n:032x}"

    def test_unconfigured_billing_logs_but_never_blocks(self):
        with self.configure(packs=""):
            self.assertFalse(billing.enforced())
            for n in range(3):
                billing.charge(self.user, self.ref(n), "local")
            summary = billing.summary(self.user)
        self.assertEqual([s["source"] for s in summary["separations"]], ["unmetered"] * 3)

    def test_invalid_packages_are_ignored(self):
        with self.configure():
            self.assertEqual([p["id"] for p in billing.packs()], ["tracks_10", "cloud_5"])

    def test_allowance_first_then_purchased_tracks_then_payment_required(self):
        with self.configure(included=2):
            billing.charge(self.user, self.ref(1), "local")
            billing.charge(self.user, self.ref(2), "server")
            with self.assertRaises(billing.NoCredits) as caught:
                billing.check(self.user, "local")
            self.assertEqual(caught.exception.kind, "track")
            self.assertTrue(billing.grant(self.user, "tracks_10", "cs_test_1"))
            billing.charge(self.user, self.ref(3), "local")
            summary = billing.summary(self.user)
        self.assertEqual((summary["allowance_left"], summary["track_credits"]), (0, 9))
        self.assertEqual([s["source"] for s in summary["separations"]], ["credit", "allowance", "allowance"])

    def test_charging_the_same_reference_twice_costs_once(self):
        with self.configure(included=0):
            billing.grant(self.user, "tracks_10", "cs_test_2")
            billing.charge(self.user, self.ref(4), "local")
            billing.charge(self.user, self.ref(4), "local")
            self.assertEqual(billing.summary(self.user)["track_credits"], 9)

    def test_cloud_needs_a_cloud_credit_and_failures_refund_once(self):
        with self.configure(included=1):
            with self.assertRaises(billing.NoCredits) as caught:
                billing.charge(self.user, self.ref(5), "cloud")
            self.assertEqual(caught.exception.kind, "cloud")
            billing.grant(self.user, "cloud_5", "cs_test_3")
            billing.charge(self.user, self.ref(5), "cloud")
            self.assertEqual((billing.summary(self.user)["allowance_left"], billing.summary(self.user)["cloud_credits"]), (0, 4))
            billing.refund(self.ref(5))
            billing.refund(self.ref(5))
            summary = billing.summary(self.user)
        self.assertEqual((summary["allowance_left"], summary["cloud_credits"]), (1, 5))
        self.assertEqual(summary["separations"][0]["status"], "refunded")

    def test_a_checkout_session_grants_once_and_only_known_packages(self):
        with self.configure():
            self.assertTrue(billing.grant(self.user, "cloud_5", "cs_test_4"))
            self.assertFalse(billing.grant(self.user, "cloud_5", "cs_test_4"))
            self.assertFalse(billing.grant(self.user, "unknown", "cs_test_5"))
            self.assertEqual(billing.summary(self.user)["cloud_credits"], 5)


class WebhookTests(unittest.TestCase):
    def test_package_purchase_adds_credits_without_activating_a_subscription(self):
        import main
        import stripe_routes
        from database import create_user, get_user_by_id
        user = create_user("pack-buyer@example.com", "x", "Buyer", "2000-01-01T00:00:00")
        event = {"id": "evt_pack_1", "type": "checkout.session.completed", "data": {"object": {
            "id": "cs_pack_1", "mode": "payment", "payment_status": "paid", "customer": "cus_1",
            "metadata": {"user_id": str(user["id"]), "pack_id": "tracks_10"}}}}
        with patch.dict(os.environ, {"BEATMIND_PACKS": PACKS}), \
             patch.object(stripe_routes, "STRIPE_WEBHOOK_SECRET", "whsec_test"), \
             patch.object(stripe_routes.stripe.Webhook, "construct_event", return_value=event):
            client = TestClient(main.app)
            for _ in range(2):
                self.assertEqual(client.post("/api/stripe/webhook", content=b"{}", headers={"stripe-signature": "t"}).status_code, 200)
            self.assertEqual(billing.summary(user["id"])["track_credits"], 10)
        self.assertEqual(get_user_by_id(user["id"])["subscription_status"], "inactive")

    def test_unpaid_package_session_grants_nothing(self):
        import main
        import stripe_routes
        from database import create_user
        user = create_user("pack-unpaid@example.com", "x", "Buyer", "2000-01-01T00:00:00")
        event = {"id": "evt_pack_2", "type": "checkout.session.completed", "data": {"object": {
            "id": "cs_pack_2", "mode": "payment", "payment_status": "unpaid",
            "metadata": {"user_id": str(user["id"]), "pack_id": "tracks_10"}}}}
        with patch.dict(os.environ, {"BEATMIND_PACKS": PACKS}), \
             patch.object(stripe_routes, "STRIPE_WEBHOOK_SECRET", "whsec_test"), \
             patch.object(stripe_routes.stripe.Webhook, "construct_event", return_value=event):
            TestClient(main.app).post("/api/stripe/webhook", content=b"{}", headers={"stripe-signature": "t"})
            self.assertEqual(billing.summary(user["id"])["track_credits"], 0)


if __name__ == "__main__":
    unittest.main()
