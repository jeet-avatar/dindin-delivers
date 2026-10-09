import json
import os
import sqlite3
import tempfile
import unittest
import uuid
from contextlib import ExitStack
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import ai_usage
import billing
import catalog
import database
from beatmind_auth import create_token
from database import create_user, db, get_user_by_id, is_subscribed, mixmind_access

PACKS = json.dumps([{"id": "tracks_10", "kind": "track", "credits": 10, "price_id": "price_tracks10"},
                    {"id": "cloud_5", "kind": "cloud", "credits": 5, "price_id": "price_cloud5"},
                    {"id": "bad", "kind": "track", "credits": -3, "price_id": "price_bad"}])

TIERS = {"starter": (10, 0, False), "pro": (30, 5, False), "studio": (80, 20, True), "mixmind": (0, 0, True)}
AMOUNTS = {"starter": 1900, "pro": 3900, "studio": 7900, "mixmind": 1200, "starter_mixmind": 2500, "pro_mixmind": 4500}


def product_metadata(plan):
    tier = plan.replace("_mixmind", "")
    tracks, cloud, mixmind = TIERS[tier]
    return {"app": "beatmind", "tier": tier, "included_tracks": str(tracks), "included_cloud": str(cloud),
            "mixmind": "true" if mixmind or plan.endswith("_mixmind") else "false"}


def fake_price(key, amount, interval, metadata, kind="recurring", active=True):
    return {"id": "price_" + key, "lookup_key": key, "unit_amount": amount, "currency": "usd", "type": kind,
            "recurring": {"interval": interval} if interval else None,
            "product": {"id": "prod_" + key.rsplit("_", 1)[0], "active": active, "metadata": metadata}}


def fake_prices():
    prices = []
    for plan in catalog.PLANS:
        for interval, factor in (("month", 1), ("year", 10)):
            prices.append(fake_price(catalog.lookup_key(plan, interval), AMOUNTS[plan] * factor, interval, product_metadata(plan)))
    for key, amount in (("beatmind_pack_tracks_10", 900), ("beatmind_pack_tracks_25", 1900), ("beatmind_pack_tracks_60", 3900),
                        ("beatmind_pack_cloud_10", 799), ("beatmind_pack_cloud_50", 3499)):
        kind, credits = key.split("_")[2], key.split("_")[3]
        prices.append(fake_price(key, amount, None, {"app": "beatmind", "kind": "track" if kind == "tracks" else "cloud",
                                                      "credits": credits, "pack_id": f"{kind}_{credits}"}, kind="one_time"))
    return prices


def price_list(prices):
    def listing(lookup_keys, **kwargs):
        assert len(lookup_keys) <= 10, "Stripe allows at most ten lookup keys per request"
        return {"data": [p for p in prices if p["lookup_key"] in lookup_keys]}
    return listing


def new_user(status="inactive", trial_days=None, **fields):
    trial = (datetime.now(timezone.utc) + timedelta(days=trial_days)).isoformat() if trial_days is not None else "2000-01-01T00:00:00"
    user = create_user(f"{uuid.uuid4().hex}@example.com", "x", "Tester", trial)
    fields["subscription_status"] = status
    with db() as conn:
        conn.execute(f"UPDATE users SET {', '.join(f'{k}=?' for k in fields)} WHERE id=?", (*fields.values(), user["id"]))
    return get_user_by_id(user["id"])


def subscriber(plan="starter", status="active", **extra):
    tracks, cloud, mixmind = TIERS[plan.replace("_mixmind", "")]
    fields = {"plan": plan, "plan_tier": plan.replace("_mixmind", ""), "included_tracks": tracks, "included_cloud": cloud,
              "mixmind": int(mixmind or plan.endswith("_mixmind")), "subscription_id": "sub_" + uuid.uuid4().hex[:8]}
    return new_user(status, **{**fields, **extra})


def ref():
    return uuid.uuid4().hex


class CatalogCase(unittest.TestCase):
    """Runs with a mocked Stripe catalog, so billing is enforced like production once prices resolve."""

    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(catalog.stripe, "api_key", "sk_test_fake"))
        self.list = self.stack.enter_context(patch.object(catalog.stripe.Price, "list", side_effect=price_list(fake_prices())))
        self.stack.enter_context(patch.dict(os.environ, {"BEATMIND_PACKS": "", "BEATMIND_INCLUDED_TRACKS": "",
                                                        "BILLING_ENFORCED": "", "MIXMIND_SALES_ENABLED": "false",
                                                        "AI_FAIR_USE_ENFORCED": "false", "JWT_SECRET": "test-secret"}))
        catalog.clear()
        self.addCleanup(catalog.clear)


class CatalogTests(CatalogCase):
    def test_plans_and_packs_resolve_from_lookup_keys_and_product_metadata(self):
        resolved = catalog.resolve()
        self.assertEqual(len(resolved["plans"]), 12)
        self.assertTrue(all(len(call.kwargs["lookup_keys"]) <= 10 for call in self.list.call_args_list))
        pro_year = catalog.plan("pro", "year")
        self.assertEqual((pro_year["price_id"], pro_year["amount"], pro_year["included_tracks"], pro_year["included_cloud"],
                          pro_year["mixmind"]), ("price_beatmind_pro_yearly", 39000, 30, 5, False))
        self.assertTrue(catalog.plan("studio", "month")["mixmind"])
        combo = catalog.plan("starter_mixmind", "month")
        self.assertEqual((combo["plan"], combo["tier"], combo["mixmind"]), ("starter_mixmind", "starter", True))
        self.assertEqual([p["id"] for p in catalog.packs()], ["tracks_10", "tracks_25", "tracks_60", "cloud_10", "cloud_50"])
        self.assertEqual(catalog.packs()[3]["price"], {"amount": 799, "currency": "usd"})

    def test_catalog_is_cached(self):
        catalog.resolve()
        calls = self.list.call_count
        catalog.resolve()
        catalog.plan("starter", "month")
        self.assertEqual(self.list.call_count, calls)

    def test_prices_with_incomplete_metadata_or_archived_products_are_not_offered(self):
        prices = fake_prices()
        prices[0]["product"]["metadata"] = {"tier": "starter"}  # starter monthly: no allowance metadata
        prices[2]["product"]["active"] = False  # pro monthly
        self.list.side_effect = price_list(prices)
        catalog.clear()
        self.assertIsNone(catalog.plan("starter", "month"))
        self.assertIsNone(catalog.plan("pro", "month"))
        self.assertIsNotNone(catalog.plan("starter", "year"))
        self.assertFalse(catalog.resolved(), "billing needs the base plan to be sold")

    def test_stripe_failure_keeps_billing_unmetered_without_a_catalog(self):
        self.list.side_effect = catalog.stripe.APIConnectionError("down")
        catalog.clear()
        self.assertFalse(billing.enforced())
        self.assertEqual(catalog.packs(), [])

    def test_mixmind_plans_are_listed_as_coming_soon_until_sales_open(self):
        listed = {(p["plan"], p["interval"]): p for p in catalog.public_plans()}
        self.assertEqual(len(listed), 12)
        self.assertFalse(listed[("mixmind", "month")]["available"])
        self.assertFalse(listed[("pro_mixmind", "year")]["available"])
        self.assertTrue(listed[("studio", "year")]["available"], "Studio's MixMind is early access; Studio stays sellable")
        with patch.dict(os.environ, {"MIXMIND_SALES_ENABLED": "true"}):
            self.assertTrue(all(p["available"] for p in catalog.public_plans()))


class EnforcementTests(CatalogCase):
    def test_metering_turns_on_when_the_catalog_resolves_and_env_can_switch_it_off(self):
        self.assertTrue(billing.enforced())
        with patch.dict(os.environ, {"BILLING_ENFORCED": "false"}):
            self.assertFalse(billing.enforced())
            user = new_user("active")
            for _ in range(12):
                billing.charge(user["id"], ref(), "cloud")
            self.assertEqual({s["source"] for s in billing.summary(user["id"])["separations"]}, {"unmetered"})

    def test_without_stripe_billing_is_dormant(self):
        with patch.object(catalog.stripe, "api_key", ""):
            catalog.clear()
            self.assertFalse(billing.enforced())

    def test_packs_override_from_env_is_still_supported(self):
        with patch.dict(os.environ, {"BEATMIND_PACKS": PACKS}):
            self.assertEqual([p["id"] for p in billing.packs()], ["tracks_10", "cloud_5"])


class AllowanceTests(CatalogCase):
    def test_each_tier_includes_its_tracks_and_cloud_tracks(self):
        for plan, (tracks, cloud, _) in TIERS.items():
            if plan == "mixmind":
                continue
            with self.subTest(plan=plan):
                summary = billing.summary(subscriber(plan)["id"])
                self.assertEqual((summary["plan"]["source"], summary["plan"]["tier"]), ("subscription", plan))
                self.assertEqual((summary["included_per_month"], summary["included_cloud_per_month"]), (tracks, cloud))

    def test_legacy_subscribers_are_starter_with_the_env_fallback(self):
        legacy = new_user("active")
        self.assertEqual((billing.allowance(legacy)["source"], billing.allowance(legacy)["included_tracks"]), ("legacy", 10))
        with patch.dict(os.environ, {"BEATMIND_INCLUDED_TRACKS": "15"}):
            self.assertEqual(billing.allowance(legacy)["included_tracks"], 15)
        self.assertEqual(billing.allowance(legacy)["included_cloud"], 0)

    def test_trial_users_get_three_tracks_and_expired_users_nothing(self):
        trial = billing.allowance(new_user(trial_days=5))
        self.assertEqual((trial["source"], trial["included_tracks"], trial["included_cloud"]), ("trial", 3, 0))
        with patch.dict(os.environ, {"TRIAL_INCLUDED_TRACKS": "5", "TRIAL_INCLUDED_CLOUD": "1"}):
            trial = billing.allowance(new_user(trial_days=5))
        self.assertEqual((trial["included_tracks"], trial["included_cloud"]), (5, 1))
        expired = billing.allowance(new_user())
        self.assertEqual((expired["source"], expired["included_tracks"]), ("none", 0))
        canceled = billing.allowance(subscriber("studio", status="canceled"))
        self.assertEqual((canceled["source"], canceled["included_tracks"]), ("none", 0))

    def test_mixmind_only_plan_has_no_beatmind_access(self):
        user = subscriber("mixmind")
        self.assertFalse(is_subscribed(user))
        self.assertTrue(mixmind_access(user))

    def test_mixmind_access_is_for_studio_and_mixmind_plans_only(self):
        self.assertTrue(mixmind_access(subscriber("studio")))
        self.assertTrue(mixmind_access(subscriber("pro_mixmind")))
        self.assertFalse(mixmind_access(subscriber("pro")))
        self.assertFalse(mixmind_access(new_user("active")), "legacy plans are Starter")
        self.assertFalse(mixmind_access(new_user(trial_days=5)), "not part of the trial")
        self.assertFalse(mixmind_access(subscriber("studio", status="canceled")))

    def test_spend_order_is_allowance_then_purchased_then_payment_required_for_every_tier(self):
        for plan in ("starter", "pro", "studio"):
            with self.subTest(plan=plan):
                user = subscriber(plan)
                included = TIERS[plan][0]
                for _ in range(included):
                    billing.charge(user["id"], ref(), "local")
                with self.assertRaises(billing.NoCredits) as caught:
                    billing.check(user["id"], "local")
                self.assertEqual(caught.exception.kind, "track")
                self.assertTrue(billing.grant(user["id"], "tracks_10", "cs_" + ref()))
                failed = ref()
                billing.charge(user["id"], failed, "server")
                summary = billing.summary(user["id"])
                self.assertEqual((summary["tracks_used"], summary["allowance_left"], summary["track_credits"]), (included, 0, 9))
                self.assertEqual(summary["separations"][0]["source"], "credit")
                billing.refund(failed)
                billing.refund(failed)
                self.assertEqual(billing.summary(user["id"])["track_credits"], 10)
                allowance_ref = billing.summary(user["id"])["separations"][-1]["reference_id"]
                billing.refund(allowance_ref)
                self.assertEqual(billing.summary(user["id"])["allowance_left"], 1, "a failed allowance track comes back")

    def test_trial_includes_three_local_tracks_for_the_whole_trial(self):
        user = new_user(trial_days=5)
        first = ref()
        billing.charge(user["id"], first, "local")
        billing.charge(user["id"], ref(), "local")
        with db() as conn:  # A trial spanning two months still has three tracks in total.
            conn.execute("UPDATE separations SET created_at='2000-01-15 10:00:00' WHERE reference_id=?", (first,))
        billing.charge(user["id"], ref(), "local")
        with self.assertRaises(billing.NoCredits) as caught:
            billing.check(user["id"], "local")
        self.assertEqual(str(caught.exception), "Your free trial includes 3 tracks. Choose a plan to keep going.")
        summary = billing.summary(user["id"])
        self.assertEqual((summary["plan"]["source"], summary["tracks_used"], summary["allowance_left"]), ("trial", 3, 0))
        self.assertEqual({s["source"] for s in summary["separations"]}, {"trial"})
        billing.refund(first)
        self.assertEqual(billing.summary(user["id"])["allowance_left"], 1, "a failed trial track comes back")

    def test_trial_cannot_use_cloud_or_server_separation(self):
        user = new_user(trial_days=5)
        with self.assertRaises(billing.NoCredits) as cloud:
            billing.check(user["id"], "cloud")
        self.assertEqual(cloud.exception.kind, "trial_cloud")
        self.assertIn("paid plans", str(cloud.exception))
        with self.assertRaises(billing.NoCredits) as server:
            billing.charge(user["id"], ref(), "server")
        self.assertEqual(server.exception.kind, "trial_mode")
        self.assertEqual(billing.summary(user["id"])["tracks_used"], 0)

    def test_subscribing_after_trial_tracks_starts_the_full_plan_allowance(self):
        user = new_user(trial_days=5)
        for _ in range(3):
            billing.charge(user["id"], ref(), "local")
        with db() as conn:  # What the webhook stores once the plan is paid (it also ends the app trial).
            conn.execute("""UPDATE users SET subscription_status='active', plan='starter', plan_tier='starter', included_tracks=10,
                            included_cloud=0, trial_ends_at=? WHERE id=?""", (datetime.now(timezone.utc).isoformat(), user["id"]))
        summary = billing.summary(user["id"])
        self.assertEqual((summary["plan"]["source"], summary["tracks_used"], summary["allowance_left"]), ("subscription", 0, 10))

    def test_last_months_separations_do_not_use_this_months_allowance(self):
        user = subscriber("starter")
        for _ in range(10):
            billing.charge(user["id"], ref(), "local")
        with db() as conn:
            conn.execute("UPDATE separations SET created_at='2000-01-15 10:00:00' WHERE user_id=?", (user["id"],))
        self.assertEqual(billing.summary(user["id"])["allowance_left"], 10)

    def test_cloud_uses_the_monthly_cloud_allowance_then_cloud_credits(self):
        user = subscriber("pro")
        cloud_refs = [ref() for _ in range(5)]
        for reference in cloud_refs:
            billing.charge(user["id"], reference, "cloud")
        summary = billing.summary(user["id"])
        self.assertEqual((summary["cloud_used"], summary["cloud_allowance_left"], summary["cloud_credits"]), (5, 0, 0))
        self.assertEqual(summary["tracks_used"], 5, "a cloud separation also uses a track")
        with self.assertRaises(billing.NoCredits) as caught:
            billing.charge(user["id"], ref(), "cloud")
        self.assertEqual(caught.exception.kind, "cloud")
        billing.grant(user["id"], "cloud_10", "cs_" + ref())
        paid = ref()
        billing.charge(user["id"], paid, "cloud")
        self.assertEqual(billing.summary(user["id"])["cloud_credits"], 9)
        billing.refund(paid)
        billing.refund(cloud_refs[0])
        summary = billing.summary(user["id"])
        self.assertEqual((summary["cloud_credits"], summary["cloud_allowance_left"]), (10, 1))

    def test_starter_has_no_cloud_allowance(self):
        user = subscriber("starter")
        with self.assertRaises(billing.NoCredits) as caught:
            billing.check(user["id"], "cloud")
        self.assertEqual(caught.exception.kind, "cloud")
        billing.check(user["id"], "local")

    def test_charging_the_same_reference_twice_costs_once(self):
        user = subscriber("starter", included_tracks=0)
        billing.grant(user["id"], "tracks_10", "cs_" + ref())
        reference = ref()
        billing.charge(user["id"], reference, "local")
        billing.charge(user["id"], reference, "local")
        self.assertEqual(billing.summary(user["id"])["track_credits"], 9)

    def test_a_checkout_session_grants_once_and_only_known_packages(self):
        user = new_user("active")
        self.assertTrue(billing.grant(user["id"], "cloud_10", "cs_once_" + ref()))
        session = "cs_repeat_" + ref()
        self.assertTrue(billing.grant(user["id"], "cloud_10", session))
        self.assertFalse(billing.grant(user["id"], "cloud_10", session))
        self.assertFalse(billing.grant(user["id"], "unknown", "cs_unknown_" + ref()))
        self.assertTrue(billing.grant(user["id"], "archived", "cs_meta_" + ref(), "track", 25), "session metadata grants even if unlisted")
        summary = billing.summary(user["id"])
        self.assertEqual((summary["cloud_credits"], summary["track_credits"]), (20, 25))

    def test_legacy_cloud_rows_are_refunded_as_credits(self):
        user = new_user("active")
        reference = ref()
        with db() as conn:  # A cloud separation recorded before cloud_source existed.
            conn.execute("INSERT INTO separations (user_id, reference_id, mode, source, cloud) VALUES (?, ?, 'cloud', 'credit', 1)",
                         (user["id"], reference))
        billing.refund(reference)
        summary = billing.summary(user["id"])
        self.assertEqual((summary["track_credits"], summary["cloud_credits"]), (1, 1))


class PastDueTests(unittest.TestCase):
    def test_past_due_keeps_access_for_the_grace_period_then_loses_it(self):
        recent = subscriber("pro", status="past_due", past_due_since=datetime.now(timezone.utc).isoformat())
        self.assertTrue(is_subscribed(recent))
        old = subscriber("pro", status="past_due",
                         past_due_since=(datetime.now(timezone.utc) - timedelta(days=8)).isoformat())
        self.assertFalse(is_subscribed(old))
        with patch.dict(os.environ, {"BILLING_PAST_DUE_GRACE_DAYS": "10"}):
            self.assertTrue(is_subscribed(old))
        for status in ("unpaid", "canceled", "incomplete", "incomplete_expired", "inactive"):
            self.assertFalse(is_subscribed(subscriber("pro", status=status)), status)
        self.assertTrue(is_subscribed(subscriber("pro", status="trialing")))


def auth(user):
    return {"Authorization": "Bearer " + create_token(user["id"], user["email"])}


class Session(dict):
    url = "https://checkout.stripe.test/session"


class CheckoutTests(CatalogCase):
    def setUp(self):
        super().setUp()
        import main
        import stripe_routes
        self.routes = stripe_routes
        self.client = TestClient(main.app)
        self.stack.enter_context(patch.object(stripe_routes.stripe, "api_key", "sk_test_fake"))
        self.create = self.stack.enter_context(patch.object(stripe_routes.stripe.checkout.Session, "create", return_value=Session()))
        self.customer = self.stack.enter_context(patch.object(stripe_routes.stripe.Customer, "create",
                                                              side_effect=lambda **kw: {"id": "cus_" + uuid.uuid4().hex[:10]}))

    def checkout(self, user, **body):
        return self.client.post("/api/stripe/checkout", json=body, headers=auth(user))

    def test_default_body_is_starter_monthly_for_older_clients(self):
        user = new_user()
        response = self.checkout(user)
        self.assertEqual(response.status_code, 200, response.text)
        params = self.create.call_args.kwargs
        self.assertEqual(params["line_items"], [{"price": "price_beatmind_starter_monthly", "quantity": 1}])
        self.assertEqual(params["mode"], "subscription")
        self.assertNotIn("allow_promotion_codes", params)
        self.assertNotIn("discounts", params)
        self.assertNotIn("trial_end", params["subscription_data"])
        self.assertEqual(params["customer"], get_user_by_id(user["id"])["stripe_customer_id"])

    def test_each_plan_and_interval_uses_its_price(self):
        for plan in ("starter", "pro", "studio"):
            for interval in ("month", "year"):
                with self.subTest(plan=plan, interval=interval):
                    self.assertEqual(self.checkout(new_user(), plan=plan, interval=interval).status_code, 200)
                    params = self.create.call_args.kwargs
                    self.assertEqual(params["line_items"][0]["price"], "price_" + catalog.lookup_key(plan, interval))
                    self.assertNotIn("allow_promotion_codes", params, "codes are validated by BeatMind, not typed into Stripe")
                    self.assertEqual(params["metadata"]["plan"], plan)
                    self.assertEqual(params["subscription_data"]["metadata"]["app"], "beatmind")

    PROMOS = {  # code: (promotion code id, coupon id, products, coupon terms)
        "FOUNDING100": ("promo_founding", "cp_founding", [f"prod_{p}" for p in (
            "beatmind_starter", "beatmind_pro", "beatmind_studio", "mixmind", "beatmind_starter_mixmind", "beatmind_pro_mixmind")],
            {"duration": "forever", "percent_off": 40}),
        "CREATOR60": ("promo_creator", "cp_creator", ["prod_beatmind_pro"],
                      {"duration": "repeating", "duration_in_months": 2, "percent_off": 100}),
        "STUDIOONLY": ("promo_studio", "cp_studio", ["prod_beatmind_studio"], {"duration": "once", "amount_off": 1000}),
        "ANYPLAN": ("promo_any", "cp_any", None, {"duration": "forever", "percent_off": 10}),
    }

    def with_promos(self, redeemed=0, valid=True):
        def listing(code, **kw):
            match = self.PROMOS.get(code.upper())
            return {"data": [{"id": match[0], "code": code.upper(), "promotion": {"type": "coupon", "coupon": match[1]},
                              "max_redemptions": 100, "times_redeemed": redeemed, "expires_at": None}] if match else []}
        coupons = {c: {"id": c, "valid": valid, "applies_to": {"products": products} if products else None, **terms}
                   for _, c, products, terms in self.PROMOS.values()}
        self.stack.enter_context(patch.object(self.routes.stripe.PromotionCode, "list", side_effect=listing))
        self.stack.enter_context(patch.object(self.routes.stripe.Coupon, "retrieve", side_effect=lambda cid, **kw: coupons[cid]))

    def test_founding100_is_for_yearly_plans_only(self):
        self.with_promos()
        response = self.checkout(new_user(), plan="pro", interval="month", promo_code="FOUNDING100")
        self.assertEqual((response.status_code, response.json()["detail"]), (400, catalog.PROMO_RULES["FOUNDING100"]["message"]))
        self.create.assert_not_called()
        for plan in ("starter", "pro", "studio"):
            self.assertEqual(self.checkout(new_user(), plan=plan, interval="year", promo_code="founding100").status_code, 200)
            self.assertEqual(self.create.call_args.kwargs["discounts"], [{"promotion_code": "promo_founding"}])

    def test_creator60_is_for_pro_only(self):
        self.with_promos()
        for plan in ("starter", "studio"):
            response = self.checkout(new_user(), plan=plan, interval="month", promo_code="CREATOR60")
            self.assertEqual((response.status_code, response.json()["detail"]), (400, "CREATOR60 works on the Pro plan."))
        self.create.assert_not_called()
        for interval in ("month", "year"):
            self.assertEqual(self.checkout(new_user(), plan="pro", interval=interval, promo_code=" CREATOR60 ").status_code, 200)
            self.assertEqual(self.create.call_args.kwargs["discounts"], [{"promotion_code": "promo_creator"}])

    def test_other_codes_need_a_coupon_that_applies_to_the_plan(self):
        self.with_promos()
        response = self.checkout(new_user(), plan="pro", promo_code="STUDIOONLY")
        self.assertEqual((response.status_code, response.json()["detail"]), (400, "That code doesn't apply to the Pro plan."))
        self.assertEqual(self.checkout(new_user(), plan="studio", promo_code="STUDIOONLY").status_code, 200)
        self.assertEqual(self.checkout(new_user(), plan="starter", promo_code="ANYPLAN").status_code, 200)

    def test_unknown_malformed_or_used_up_codes_are_rejected(self):
        self.with_promos()
        for code in ("NOPE", "bad code!", "x" * 65):
            response = self.checkout(new_user(), plan="pro", interval="year", promo_code=code)
            self.assertIn(response.status_code, (400, 422), code)
        self.assertEqual(self.checkout(new_user(), plan="pro", promo_code="NOPE").json()["detail"], catalog.PROMO_INVALID)
        self.create.assert_not_called()

    def test_used_up_codes_are_rejected(self):
        self.with_promos(redeemed=100)
        self.assertEqual(self.checkout(new_user(), plan="pro", promo_code="CREATOR60").json()["detail"], catalog.PROMO_USED_UP)
        self.create.assert_not_called()

    def test_checkout_shows_renewal_terms_and_requires_terms_consent(self):
        self.checkout(new_user(), plan="pro", interval="month")
        params = self.create.call_args.kwargs
        self.assertEqual(params["consent_collection"], {"terms_of_service": "required"})
        self.assertIn("https://www.beatmind.io/terms", params["custom_text"]["terms_of_service_acceptance"]["message"])
        self.assertEqual(params["custom_text"]["submit"]["message"],
                         "Your plan renews automatically at $39/month until you cancel. Cancel anytime in Dashboard → Account → "
                         "Billing — you keep access until the end of the paid period. Taxes may apply.")
        self.with_promos()
        self.checkout(new_user(), plan="pro", interval="month", promo_code="CREATOR60")
        self.assertTrue(self.create.call_args.kwargs["custom_text"]["submit"]["message"].startswith(
            "Promotional price applies for 2 months; then your plan renews automatically at $39/month unless cancelled."))
        self.checkout(new_user(), plan="studio", interval="year", promo_code="FOUNDING100")
        self.assertIn("renews automatically at $474/year (FOUNDING100 price)", self.create.call_args.kwargs["custom_text"]["submit"]["message"])

    def test_promo_preview_lists_where_a_code_applies(self):
        self.with_promos()
        user = new_user()
        monthly = self.client.get("/api/stripe/promo", params={"code": "FOUNDING100", "interval": "month"}, headers=auth(user)).json()
        self.assertEqual({plan: v["ok"] for plan, v in monthly["plans"].items()}, {"starter": False, "pro": False, "studio": False})
        yearly = self.client.get("/api/stripe/promo", params={"code": "FOUNDING100", "interval": "year"}, headers=auth(user)).json()
        self.assertEqual(yearly["plans"]["pro"]["first_amount"], 23400)
        creator = self.client.get("/api/stripe/promo", params={"code": "creator60"}, headers=auth(user)).json()["plans"]
        self.assertEqual((creator["pro"]["ok"], creator["pro"]["first_amount"], creator["starter"]["ok"]), (True, 0, False))
        self.assertIn("2 months", creator["pro"]["terms"])
        self.assertEqual(self.client.get("/api/stripe/promo", params={"code": "NOPE"}, headers=auth(user)).status_code, 400)
        self.assertEqual(self.client.get("/api/stripe/promo", params={"code": "CREATOR60"}).status_code, 401)

    def test_portal_uses_the_beatmind_configuration(self):
        user = subscriber("pro", stripe_customer_id="cus_portal")
        with patch.object(self.routes, "STRIPE_PORTAL_CONFIGURATION", "bpc_test_beatmind"), \
             patch.object(self.routes.stripe.billing_portal.Session, "create", return_value=Session()) as portal:
            self.client.post("/api/stripe/portal", headers=auth(user))
        self.assertEqual(portal.call_args.kwargs["configuration"], "bpc_test_beatmind")

    def test_first_time_only_codes_rejected_by_stripe_are_a_clear_400(self):
        self.with_promos()
        self.create.side_effect = self.routes.stripe.InvalidRequestError("prior transactions", "discounts")
        response = self.checkout(new_user(), plan="pro", promo_code="CREATOR60")
        self.assertEqual((response.status_code, response.json()["detail"]), (400, "That code can't be used on this account."))

    def test_mixmind_plans_are_coming_soon_until_enabled(self):
        for plan in catalog.MIXMIND_PLANS:
            response = self.checkout(new_user(), plan=plan, interval="month")
            self.assertEqual((response.status_code, response.json()["detail"]), (409, "MixMind is coming soon"))
        self.create.assert_not_called()
        with patch.dict(os.environ, {"MIXMIND_SALES_ENABLED": "true"}):
            self.assertEqual(self.checkout(new_user(), plan="pro_mixmind", interval="year").status_code, 200)
        self.assertEqual(self.create.call_args.kwargs["line_items"][0]["price"], "price_beatmind_pro_mixmind_yearly")

    def test_invalid_plans_are_rejected(self):
        self.assertEqual(self.checkout(new_user(), plan="enterprise").status_code, 422)
        self.assertEqual(self.checkout(new_user(), interval="week").status_code, 422)

    def test_subscribing_during_the_app_trial_has_no_stripe_trial(self):
        trial_user = new_user(trial_days=5)
        for user in (trial_user, new_user()):
            self.assertEqual(self.checkout(user, plan="pro").status_code, 200)
            data = self.create.call_args.kwargs["subscription_data"]
            self.assertNotIn("trial_end", data)
            self.assertNotIn("trial_period_days", data)
        self.assertEqual(get_user_by_id(trial_user["id"])["trial_ends_at"], trial_user["trial_ends_at"],
                         "an abandoned checkout keeps the free trial; the paid subscription ends it")

    def test_existing_subscribers_manage_their_plan_instead_of_buying_another(self):
        for status in ("active", "trialing", "past_due"):
            self.assertEqual(self.checkout(subscriber("pro", status=status), plan="studio").status_code, 409)
        self.assertEqual(self.checkout(subscriber("pro", status="canceled"), plan="studio").status_code, 200)

    def test_unavailable_catalog_is_a_clear_error(self):
        self.list.side_effect = price_list([])
        catalog.clear()
        self.assertEqual(self.checkout(new_user(), plan="pro").status_code, 503)

    def test_plans_endpoint_lists_the_resolved_catalog(self):
        body = self.client.get("/api/stripe/plans").json()
        studio = next(p for p in body["plans"] if p["plan"] == "studio" and p["interval"] == "year")
        self.assertEqual({k: studio[k] for k in ("amount", "currency", "included_tracks", "included_cloud", "mixmind", "available")},
                         {"amount": 79000, "currency": "usd", "included_tracks": 80, "included_cloud": 20, "mixmind": True,
                          "available": True})
        self.assertNotIn("price_id", studio)

    def test_pack_checkout_creates_a_customer_once_and_opens_the_portal(self):
        user = subscriber("pro")  # A paid plan without a Stripe Customer on file yet (e.g. a legacy row).
        response = self.client.post("/api/stripe/packs/tracks_25/checkout", headers=auth(user))
        self.assertEqual(response.status_code, 200, response.text)
        params = self.create.call_args.kwargs
        self.assertEqual((params["mode"], params["line_items"][0]["price"]), ("payment", "price_beatmind_pack_tracks_25"))
        self.assertEqual(params["metadata"], {"user_id": str(user["id"]), "app": "beatmind", "pack_id": "tracks_25",
                                              "kind": "track", "credits": "25"})
        customer = get_user_by_id(user["id"])["stripe_customer_id"]
        self.assertEqual(params["customer"], customer)
        self.client.post("/api/stripe/packs/cloud_10/checkout", headers=auth(user))
        self.assertEqual(self.customer.call_count, 1)
        self.assertEqual(self.create.call_args.kwargs["customer"], customer)
        with patch.object(self.routes.stripe.billing_portal.Session, "create", return_value=Session()) as portal:
            self.assertEqual(self.client.post("/api/stripe/portal", headers=auth(user)).status_code, 200)
        self.assertEqual(portal.call_args.kwargs["customer"], customer)

    def test_packs_need_a_paid_plan(self):
        for user in (new_user(), new_user(trial_days=5), subscriber("pro", status="canceled")):
            response = self.client.post("/api/stripe/packs/tracks_10/checkout", headers=auth(user))
            self.assertEqual(response.status_code, 402)
        self.create.assert_not_called()
        self.assertFalse(self.client.get("/api/stripe/usage", headers=auth(new_user(trial_days=5))).json()["can_buy_packs"])
        self.assertEqual(self.client.post("/api/stripe/packs/nope/checkout", headers=auth(new_user("active"))).status_code, 404)

    def test_portal_without_a_billing_account_is_404(self):
        self.assertEqual(self.client.post("/api/stripe/portal", headers=auth(new_user(trial_days=5))).status_code, 404)

    def test_usage_reports_plan_allowances_credits_and_ai_spend(self):
        user = subscriber("studio")
        billing.charge(user["id"], ref(), "cloud")
        ai_usage.record(user["id"], "chat", "bedrock", "us.anthropic.claude-haiku-4-5-20251001-v1:0",
                        {"input_tokens": 1_000_000, "output_tokens": 100_000})
        body = self.client.get("/api/stripe/usage", headers=auth(user)).json()
        self.assertEqual((body["plan"]["tier"], body["included_per_month"], body["tracks_used"], body["included_cloud_per_month"],
                          body["cloud_used"]), ("studio", 80, 1, 20, 1))
        self.assertTrue(body["enforced"] and body["mixmind_access"] and body["packs_require_plan"])
        self.assertEqual(len(body["packs"]), 5)
        self.assertEqual((body["ai_usage"]["estimated_usd"], body["ai_usage"]["fair_use_cap_usd"]), (1.5, 30.0))


class Subscription(dict):
    pass


def stripe_subscription(sub_id, customer, plan, interval="month", status="active", user_id=None, period_end=1893456000):
    key = catalog.lookup_key(plan, interval)
    price = fake_price(key, AMOUNTS[plan], interval, product_metadata(plan))
    metadata = {"app": "beatmind", "user_id": str(user_id)} if user_id else {}
    # API 2026-02-25.clover: the billing period is on the item.
    return Subscription(id=sub_id, customer=customer, status=status, metadata=metadata,
                        items={"data": [{"price": price, "current_period_end": period_end}]})


class WebhookCase(CatalogCase):
    def setUp(self):
        super().setUp()
        import main
        import stripe_routes
        self.routes = stripe_routes
        self.client = TestClient(main.app)
        self.subscriptions = {}
        self.stack.enter_context(patch.object(stripe_routes, "STRIPE_WEBHOOK_SECRET", "whsec_test"))
        self.retrieve = self.stack.enter_context(patch.object(
            stripe_routes.stripe.Subscription, "retrieve", side_effect=lambda sub_id, **kw: self.subscriptions[sub_id]))

    def deliver(self, event):
        with patch.object(self.routes.stripe.Webhook, "construct_event", return_value=event):
            return self.client.post("/api/stripe/webhook", content=b"{}", headers={"stripe-signature": "t"})

    def event(self, kind, obj):
        return {"id": "evt_" + uuid.uuid4().hex, "type": kind, "data": {"object": obj}}

    def pack_event(self, user, paid=True, tagged=True):
        metadata = {"user_id": str(user["id"]), "pack_id": "tracks_10", "kind": "track", "credits": "10"}
        if tagged:
            metadata["app"] = "beatmind"
        return self.event("checkout.session.completed", {"id": "cs_" + uuid.uuid4().hex, "mode": "payment",
                          "payment_status": "paid" if paid else "unpaid", "customer": "cus_" + uuid.uuid4().hex[:8],
                          "metadata": metadata})



class WebhookTests(WebhookCase):
    def test_signature_is_verified(self):
        response = self.client.post("/api/stripe/webhook", content=b"{}", headers={"stripe-signature": "t=1,v1=bad"})
        self.assertEqual(response.status_code, 400)

    def test_package_purchase_adds_credits_once_without_activating_a_subscription(self):
        user = new_user(trial_days=5)
        event = self.pack_event(user)
        for _ in range(2):
            self.assertEqual(self.deliver(event).status_code, 200)
        self.assertEqual(self.deliver({**event, "id": "evt_" + uuid.uuid4().hex}).status_code, 200, "same session, new event")
        self.assertEqual(billing.summary(user["id"])["track_credits"], 10)
        stored = get_user_by_id(user["id"])
        self.assertEqual(stored["subscription_status"], "inactive")
        self.assertEqual(stored["stripe_customer_id"], event["data"]["object"]["customer"], "pack-only users get a portal")

    def test_unpaid_or_foreign_package_sessions_grant_nothing(self):
        user = new_user(trial_days=5)
        self.deliver(self.pack_event(user, paid=False))
        self.deliver(self.pack_event(user, tagged=False))
        self.assertEqual(billing.summary(user["id"])["track_credits"], 0)

    def test_processed_events_are_stored_in_the_database(self):
        user = new_user(trial_days=5)
        event = self.pack_event(user)
        self.assertEqual(self.deliver(event).json(), {"received": True})
        with db() as conn:
            self.assertIsNotNone(conn.execute("SELECT 1 FROM stripe_events WHERE id=?", (event["id"],)).fetchone())
        with db() as conn:  # A replay after a restart must not grant again, even if the ledger guard were bypassed.
            conn.execute("DELETE FROM credit_ledger WHERE user_id=?", (user["id"],))
        self.assertEqual(self.deliver(event).json(), {"received": True, "duplicate": True})
        self.assertEqual(billing.summary(user["id"])["track_credits"], 0)

    def test_a_failed_event_is_not_recorded_so_stripe_retries_it(self):
        user = new_user(trial_days=5)
        self.subscriptions["sub_retry"] = stripe_subscription("sub_retry", "cus_retry", "pro", user_id=user["id"])
        event = self.event("customer.subscription.created", {"id": "sub_retry"})
        self.retrieve.side_effect = self.routes.stripe.APIConnectionError("down")
        self.assertEqual(self.deliver(event).status_code, 500)
        self.retrieve.side_effect = lambda sub_id, **kw: self.subscriptions[sub_id]
        self.assertEqual(self.deliver(event).json(), {"received": True})
        self.assertEqual(get_user_by_id(user["id"])["plan"], "pro")

    def test_a_paid_plan_ends_the_app_trial(self):
        user = new_user(trial_days=5)
        billing.charge(user["id"], ref(), "local")
        self.subscriptions["sub_now"] = stripe_subscription("sub_now", "cus_now", "pro", user_id=user["id"])
        self.deliver(self.event("customer.subscription.created", {"id": "sub_now"}))
        stored = get_user_by_id(user["id"])
        self.assertLessEqual(stored["trial_ends_at"], datetime.now(timezone.utc).isoformat())
        summary = billing.summary(user["id"])
        self.assertEqual((summary["plan"]["source"], summary["allowance_left"], summary["cloud_allowance_left"]), ("subscription", 30, 5))

    def test_subscription_checkout_stores_the_plan_from_stripe(self):
        user = new_user(trial_days=5)
        self.subscriptions["sub_new"] = stripe_subscription("sub_new", "cus_new", "studio", "year", status="trialing")
        self.deliver(self.event("checkout.session.completed", {
            "id": "cs_sub", "mode": "subscription", "customer": "cus_new", "subscription": "sub_new",
            "metadata": {"user_id": str(user["id"]), "app": "beatmind", "plan": "studio"}}))
        stored = get_user_by_id(user["id"])
        self.assertEqual({k: stored[k] for k in ("subscription_status", "subscription_id", "stripe_customer_id", "plan", "plan_tier",
                                                 "plan_lookup_key", "plan_interval", "included_tracks", "included_cloud", "mixmind")},
                         {"subscription_status": "trialing", "subscription_id": "sub_new", "stripe_customer_id": "cus_new",
                          "plan": "studio", "plan_tier": "studio", "plan_lookup_key": "beatmind_studio_yearly",
                          "plan_interval": "year", "included_tracks": 80, "included_cloud": 20, "mixmind": 1})
        self.assertEqual(stored["current_period_end"], "2030-01-01T00:00:00+00:00")
        self.assertTrue(is_subscribed(stored))

    def test_plan_change_in_the_portal_updates_allowances(self):
        user = subscriber("pro", stripe_customer_id="cus_change")
        self.subscriptions[user["subscription_id"]] = stripe_subscription(user["subscription_id"], "cus_change", "studio")
        self.deliver(self.event("customer.subscription.updated", {"id": user["subscription_id"]}))
        summary = billing.summary(user["id"])
        self.assertEqual((summary["plan"]["plan"], summary["included_per_month"], summary["included_cloud_per_month"]), ("studio", 80, 20))
        self.assertTrue(mixmind_access(get_user_by_id(user["id"])))

    def test_legacy_subscriber_is_matched_by_customer_and_becomes_starter(self):
        user = new_user("active", stripe_customer_id="cus_legacy", subscription_id="sub_legacy")
        self.subscriptions["sub_legacy"] = stripe_subscription("sub_legacy", "cus_legacy", "starter")
        self.deliver(self.event("invoice.payment_succeeded", {
            "id": "in_1", "customer": "cus_legacy", "parent": {"subscription_details": {"subscription": "sub_legacy"}}}))
        stored = get_user_by_id(user["id"])
        self.assertEqual((stored["plan"], stored["included_tracks"], stored["subscription_status"]), ("starter", 10, "active"))

    def test_founding_subscriber_on_the_original_price_gets_pro_allowances_and_mixmind(self):
        user = new_user("active", stripe_customer_id="cus_found", subscription_id="sub_found")
        sub = stripe_subscription("sub_found", "cus_found", "starter")
        sub["metadata"] = {"beatmind_legacy": "true"}
        self.subscriptions["sub_found"] = sub
        self.deliver(self.event("customer.subscription.updated", {"id": "sub_found"}))
        stored = get_user_by_id(user["id"])
        self.assertEqual((stored["plan_tier"], stored["included_tracks"], stored["included_cloud"]), ("legacy", 30, 5))
        self.assertTrue(mixmind_access(stored))

    def test_founding_subscriber_who_switches_plan_gets_that_plan_instead(self):
        user = new_user("active", stripe_customer_id="cus_found2", subscription_id="sub_found2")
        sub = stripe_subscription("sub_found2", "cus_found2", "studio")
        sub["metadata"] = {"beatmind_legacy": "true"}
        self.subscriptions["sub_found2"] = sub
        self.deliver(self.event("customer.subscription.updated", {"id": "sub_found2"}))
        stored = get_user_by_id(user["id"])
        self.assertEqual((stored["plan_tier"], stored["included_tracks"], stored["included_cloud"]), ("studio", 80, 20))

    def test_failed_renewal_starts_the_grace_period_and_deletion_ends_access(self):
        user = subscriber("pro", stripe_customer_id="cus_pd")
        sub_id = user["subscription_id"]
        self.subscriptions[sub_id] = stripe_subscription(sub_id, "cus_pd", "pro", status="past_due")
        self.deliver(self.event("invoice.payment_failed", {"id": "in_2", "customer": "cus_pd", "subscription": sub_id}))
        first = get_user_by_id(user["id"])
        self.assertEqual(first["subscription_status"], "past_due")
        self.assertTrue(is_subscribed(first))
        self.deliver(self.event("invoice.payment_failed", {"id": "in_3", "customer": "cus_pd", "subscription": sub_id}))
        self.assertEqual(get_user_by_id(user["id"])["past_due_since"], first["past_due_since"], "grace starts at the first failure")
        self.subscriptions[sub_id] = stripe_subscription(sub_id, "cus_pd", "pro", status="active")
        self.deliver(self.event("invoice.payment_succeeded", {"id": "in_4", "customer": "cus_pd", "subscription": sub_id}))
        self.assertIsNone(get_user_by_id(user["id"])["past_due_since"])
        for status in ("unpaid", "canceled"):
            self.subscriptions[sub_id] = stripe_subscription(sub_id, "cus_pd", "pro", status=status)
            self.deliver(self.event("customer.subscription.deleted" if status == "canceled" else "customer.subscription.updated",
                                    {"id": sub_id}))
            self.assertFalse(is_subscribed(get_user_by_id(user["id"])), status)

    def test_an_old_subscription_ending_does_not_cancel_the_current_one(self):
        user = subscriber("pro", stripe_customer_id="cus_two")
        self.subscriptions["sub_old"] = stripe_subscription("sub_old", "cus_two", "starter", status="canceled")
        self.deliver(self.event("customer.subscription.deleted", {"id": "sub_old"}))
        stored = get_user_by_id(user["id"])
        self.assertEqual((stored["subscription_id"], stored["subscription_status"], stored["plan"]),
                         (user["subscription_id"], "active", "pro"))

    def test_foreign_subscriptions_are_ignored(self):
        victim = new_user(trial_days=5)
        self.subscriptions["sub_other_app"] = stripe_subscription("sub_other_app", "cus_other_app", "pro")
        self.subscriptions["sub_other_app"]["metadata"] = {"user_id": str(victim["id"])}  # Another app's id, no BeatMind tag.
        self.assertEqual(self.deliver(self.event("customer.subscription.created", {"id": "sub_other_app"})).status_code, 200)
        self.assertEqual(get_user_by_id(victim["id"]), victim)


class CancelTests(WebhookCase):
    """One-click cancel at period end and resume, without the billing portal."""

    def setUp(self):
        super().setUp()
        self.modify = self.stack.enter_context(patch.object(self.routes.stripe.Subscription, "modify", side_effect=self.fake_modify))

    def fake_modify(self, sub_id, expand=None, **change):
        sub = self.subscriptions[sub_id]
        if "cancel_at_period_end" in change:
            sub["cancel_at_period_end"] = change["cancel_at_period_end"]
            sub["cancel_at"] = sub["items"]["data"][0]["current_period_end"] if change["cancel_at_period_end"] else None
        if change.get("cancel_at") == "":
            sub["cancel_at"] = None
        return sub

    def pro_user(self):
        user = subscriber("pro", stripe_customer_id="cus_" + uuid.uuid4().hex[:8])
        self.subscriptions[user["subscription_id"]] = stripe_subscription(user["subscription_id"], user["stripe_customer_id"], "pro")
        return user

    def post(self, user, action):
        return self.client.post(f"/api/stripe/subscription/{action}", headers=auth(user) if user else {})

    def test_cancel_keeps_access_until_period_end_and_is_idempotent(self):
        user = self.pro_user()
        for _ in range(2):
            response = self.post(user, "cancel")
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.modify.call_count, 1, "a repeated click changes nothing")
        body = response.json()
        self.assertEqual((body["cancel_at_period_end"], body["cancel_at"], body["current_period_end"]),
                         (True, "2030-01-01T00:00:00+00:00", "2030-01-01T00:00:00+00:00"))
        stored = get_user_by_id(user["id"])
        self.assertEqual(stored["cancel_at"], "2030-01-01T00:00:00+00:00")
        self.assertTrue(is_subscribed(stored), "access continues until the period ends")
        self.assertEqual(billing.summary(user["id"])["plan"]["cancel_at"], "2030-01-01T00:00:00+00:00")

    def test_resume_undoes_a_pending_cancellation(self):
        user = self.pro_user()
        self.post(user, "cancel")
        for _ in range(2):
            body = self.post(user, "resume").json()
        self.assertEqual(self.modify.call_count, 2)
        self.assertEqual((body["cancel_at_period_end"], body["cancel_at"]), (False, None))
        self.assertIsNone(get_user_by_id(user["id"])["cancel_at"])

    def test_portal_cancellation_arrives_by_webhook(self):
        user = self.pro_user()
        self.subscriptions[user["subscription_id"]]["cancel_at_period_end"] = True
        self.deliver(self.event("customer.subscription.updated", {"id": user["subscription_id"]}))
        self.assertEqual(get_user_by_id(user["id"])["cancel_at"], "2030-01-01T00:00:00+00:00")

    def test_cancel_needs_auth_and_the_users_own_open_subscription(self):
        self.assertEqual(self.post(None, "cancel").status_code, 401)
        self.assertEqual(self.post(new_user(trial_days=5), "cancel").status_code, 404)
        self.assertEqual(self.post(subscriber("pro", status="canceled"), "resume").status_code, 404)
        mallory = subscriber("pro", stripe_customer_id="cus_mallory")
        victim = self.pro_user()
        with db() as conn:  # Even pointing at someone else's subscription id does not reach it.
            conn.execute("UPDATE users SET subscription_id=? WHERE id=?", (victim["subscription_id"], mallory["id"]))
        self.assertEqual(self.post(get_user_by_id(mallory["id"]), "cancel").status_code, 404)
        self.modify.assert_not_called()


class RenewalTermsTests(unittest.TestCase):
    def test_disclosure_names_price_interval_and_where_to_cancel(self):
        entry = {"amount": 79000, "interval": "year", "plan": "studio"}
        self.assertEqual(catalog.renewal_terms(entry), "Your plan renews automatically at $790/year until you cancel. Cancel "
                         "anytime in Dashboard → Account → Billing — you keep access until the end of the paid period. Taxes may apply.")
        once = catalog.renewal_terms({**entry, "amount": 799, "interval": "month"}, {"code": "X", "duration": "once", "amount_off": 100})
        self.assertTrue(once.startswith("Promotional price applies for the first month; then your plan renews automatically at $7.99/month"))


class FairUseTests(unittest.TestCase):
    HAIKU = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

    def test_haiku_estimate_uses_published_rates_with_cache_multipliers(self):
        usd, basis = ai_usage.estimate("bedrock", self.HAIKU, {"input_tokens": 1_000_000, "output_tokens": 1_000_000,
                                                                "cache_read_tokens": 1_000_000, "cache_write_tokens": 1_000_000})
        self.assertEqual((round(usd, 6), basis), (1 + 5 + 0.1 + 1.25, "published"))

    def test_openai_rates_are_placeholders_until_configured(self):
        tokens = ai_usage.openai_tokens({"usage": {"prompt_tokens": 1000, "completion_tokens": 200,
                                                   "prompt_tokens_details": {"cached_tokens": 100, "audio_tokens": 600}}})
        self.assertEqual(tokens, {"input_tokens": 300, "output_tokens": 200, "cache_read_tokens": 100, "audio_input_tokens": 600})
        self.assertEqual(ai_usage.estimate("openai", "gpt-4.1", tokens)[1], "placeholder")
        names = ("OPENAI_INPUT_USD_PER_MTOK", "OPENAI_CACHED_INPUT_USD_PER_MTOK", "OPENAI_AUDIO_INPUT_USD_PER_MTOK", "OPENAI_OUTPUT_USD_PER_MTOK")
        with patch.dict(os.environ, dict.fromkeys(names, "1")):
            usd, basis = ai_usage.estimate("openai", "gpt-4.1", tokens)
        self.assertEqual((round(usd, 9), basis), (1200 / 1_000_000, "configured"))

    def test_anthropic_response_usage_is_read(self):
        class Usage:
            input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens = 10, 20, 30, None
        self.assertEqual(ai_usage.anthropic_tokens(type("R", (), {"usage": Usage})()),
                         {"input_tokens": 10, "output_tokens": 20, "cache_read_tokens": 30, "cache_write_tokens": 0})

    def test_recording_never_raises(self):
        with patch.object(ai_usage, "db", side_effect=sqlite3.OperationalError("locked")):
            ai_usage.record(1, "chat", "bedrock", self.HAIKU, {"input_tokens": 1})

    def spend(self, user, usd):
        ai_usage.record(user["id"], "chat", "bedrock", self.HAIKU, {"input_tokens": int(usd * 1_000_000)})

    def test_cap_is_logged_only_unless_enforced(self):
        user = subscriber("starter")
        self.spend(user, 8.5)
        with patch.dict(os.environ, {"AI_FAIR_USE_ENFORCED": "false"}):
            self.assertFalse(ai_usage.over_cap(user["id"], "starter"))
            self.assertTrue(ai_usage.month_to_date(user["id"], "starter")["over_fair_use"])
        with patch.dict(os.environ, {"AI_FAIR_USE_ENFORCED": "true"}):
            self.assertTrue(ai_usage.over_cap(user["id"], "starter"))
            self.assertFalse(ai_usage.over_cap(user["id"], "pro"), "Pro allows $15")
            with patch.dict(os.environ, {"AI_FAIR_USE_USD_STARTER": "9"}):
                self.assertFalse(ai_usage.over_cap(user["id"], "starter"))

    def test_enforced_cap_stops_chat_with_a_friendly_429(self):
        import main
        user = subscriber("pro")
        self.spend(user, 15)
        with patch.object(main, "claude_client", object()), patch.dict(os.environ, {"AI_FAIR_USE_ENFORCED": "true"}):
            with self.assertRaises(main.HTTPException) as caught:
                main.prepare_chat(main.ChatRequest(message="Make a beat"), user)
        self.assertEqual(caught.exception.status_code, 429)
        self.assertIn("Upgrade your plan", caught.exception.detail)

    def test_trial_ai_is_capped_even_when_fair_use_is_not_enforced(self):
        import main
        by_messages, by_spend, fresh = new_user(trial_days=5), new_user(trial_days=5), new_user(trial_days=5)
        for n in range(50):
            ai_usage.record(by_messages["id"], "chat", "bedrock", self.HAIKU, {"input_tokens": 10}, f"request-{n}")
        ai_usage.record(by_messages["id"], "chat", "bedrock", self.HAIKU, {"input_tokens": 10}, "request-0")  # same message
        self.spend(by_spend, 2.0)
        with patch.object(main, "claude_client", object()), patch.dict(os.environ, {"AI_FAIR_USE_ENFORCED": "false"}):
            for user in (by_messages, by_spend):
                with self.assertRaises(main.HTTPException) as caught:
                    main.prepare_chat(main.ChatRequest(message="Make a beat"), user)
                self.assertEqual((caught.exception.status_code, caught.exception.detail), (402, ai_usage.TRIAL_MESSAGE))
            main.prepare_chat(main.ChatRequest(message="Make a beat"), fresh)
            with patch.dict(os.environ, {"TRIAL_CHAT_MESSAGES": "51"}):
                main.prepare_chat(main.ChatRequest(message="Make a beat"), by_messages)
        self.assertEqual(ai_usage.trial_usage(by_messages["id"])["chat_messages"], 50)

    def test_paid_subscribers_are_not_held_to_the_trial_cap(self):
        user = subscriber("starter")
        self.spend(user, 3)
        with patch.dict(os.environ, {"AI_FAIR_USE_ENFORCED": "false"}):
            ai_usage.enforce(user)

    def test_last_months_spend_does_not_count(self):
        user = subscriber("starter")
        self.spend(user, 20)
        with db() as conn:
            conn.execute("UPDATE ai_usage SET created_at='2000-01-01 00:00:00' WHERE user_id=?", (user["id"],))
        self.assertEqual(ai_usage.month_to_date(user["id"], "starter")["estimated_usd"], 0)


class UsageCallSiteTests(unittest.IsolatedAsyncioTestCase):
    """The real model call sites record usage for the user who made the request."""

    def rows(self, user_id):
        with db() as conn:
            return [dict(r) for r in conn.execute("SELECT * FROM ai_usage WHERE user_id=?", (user_id,))]

    async def test_chat_records_bedrock_usage_per_model_call(self):
        from types import SimpleNamespace
        from unittest.mock import AsyncMock
        import main
        user = subscriber("pro")
        usage = SimpleNamespace(input_tokens=1200, output_tokens=300, cache_read_input_tokens=5000, cache_creation_input_tokens=800)
        reply = SimpleNamespace(content=[SimpleNamespace(type="text", text="Hi")], stop_reason="end_turn", usage=usage)
        client = SimpleNamespace(messages=SimpleNamespace(create=AsyncMock(return_value=reply)))
        session = main.ChatSession("usage-session", user["id"])
        session.messages = [{"role": "user", "content": "Hello"}]
        with patch.object(main, "claude_client", client):
            await main._run_claude_loop(session, None)
        [row] = self.rows(user["id"])
        self.assertEqual((row["feature"], row["input_tokens"], row["output_tokens"], row["cache_read_tokens"], row["cache_write_tokens"]),
                         ("chat", 1200, 300, 5000, 800))
        self.assertAlmostEqual(row["estimated_usd"], (1200 * 1 + 300 * 5 + 5000 * 0.1 + 800 * 1.25) / 1_000_000)

    async def test_listening_records_openai_usage_even_when_the_result_is_rejected(self):
        import wave
        import httpx
        from unittest.mock import AsyncMock
        import audio_listener
        user = subscriber("pro")
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "mix.wav"
            with wave.open(str(path), "wb") as out:
                out.setparams((1, 2, 8000, 0, "NONE", "not compressed"))
                out.writeframes(b"\x00\x00" * 80000)
            response = httpx.Response(200, request=httpx.Request("POST", "https://api.openai.com"), json={
                "choices": [{"finish_reason": "length", "message": {"content": "Partial"}}],
                "usage": {"prompt_tokens": 900, "completion_tokens": 50, "prompt_tokens_details": {"audio_tokens": 800}}})
            with patch.object(httpx.AsyncClient, "post", AsyncMock(return_value=response)):
                with self.assertRaises(Exception):
                    await audio_listener.listen(path, audio_listener.ListeningRequest(intent="groove"), user["id"])
        [row] = self.rows(user["id"])
        self.assertEqual((row["feature"], row["provider"], row["input_tokens"], row["audio_input_tokens"], row["output_tokens"],
                          row["rate_basis"]), ("listening", "openai", 100, 800, 50, "placeholder"))


class MigrationTests(unittest.TestCase):
    @unittest.skipIf(database.is_postgres(), "SQLite-only: simulates a pre-plans SQLite file on disk")
    def test_startup_adds_plan_columns_to_an_existing_database_without_losing_rows(self):
        with tempfile.TemporaryDirectory() as folder:
            path = str(Path(folder) / "old.db")
            with sqlite3.connect(path) as conn:  # The production schema before plans existed.
                conn.execute("""CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL, name TEXT NOT NULL, stripe_customer_id TEXT,
                    subscription_status TEXT DEFAULT 'inactive', subscription_id TEXT, trial_ends_at TEXT,
                    created_at TEXT DEFAULT (datetime('now')))""")
                conn.execute("""CREATE TABLE separations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
                    reference_id TEXT UNIQUE NOT NULL, mode TEXT NOT NULL, source TEXT NOT NULL,
                    cloud INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'charged',
                    created_at TEXT DEFAULT (datetime('now')))""")
                conn.execute("INSERT INTO users (email, password_hash, name, subscription_status, stripe_customer_id) "
                             "VALUES ('old@example.com', 'x', 'Old', 'active', 'cus_old')")
            original = database.DB_PATH
            database.DB_PATH = path
            try:
                database.init_db()
                database.init_db()  # Repeatable.
                user = database.get_user_by_email("old@example.com")
                with db() as conn:
                    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                    separation_columns = {row[1] for row in conn.execute("PRAGMA table_info(separations)")}
            finally:
                database.DB_PATH = original
        self.assertEqual((user["subscription_status"], user["stripe_customer_id"]), ("active", "cus_old"))
        self.assertTrue(set(database.USER_PLAN_COLUMNS) <= set(user))
        self.assertIsNone(user["included_tracks"])
        self.assertIn("cloud_source", separation_columns)
        self.assertTrue({"stripe_events", "ai_usage", "credit_ledger"} <= tables)
        self.assertTrue(is_subscribed(user))


if __name__ == "__main__":
    unittest.main()


class LegacyAccountTests(WebhookCase):
    """Founding subscribers stay on the previous Stripe account; everything new goes to the primary one."""

    def setUp(self):
        super().setUp()
        for name, value in (("STRIPE_LEGACY_SECRET_KEY", "sk_legacy"), ("STRIPE_LEGACY_WEBHOOK_SECRET", "whsec_legacy"),
                            ("STRIPE_LEGACY_PORTAL_CONFIGURATION", "bpc_legacy"), ("STRIPE_PORTAL_CONFIGURATION", "bpc_primary")):
            self.stack.enter_context(patch.object(self.routes, name, value))
        self.stack.enter_context(patch.object(self.routes.stripe, "api_key", "sk_primary"))
        self.create = self.stack.enter_context(patch.object(self.routes.stripe.checkout.Session, "create", return_value=Session()))
        self.customer = self.stack.enter_context(patch.object(self.routes.stripe.Customer, "create",
                                                              side_effect=lambda **kw: {"id": "cus_" + uuid.uuid4().hex[:10]}))
        self.portal = self.stack.enter_context(patch.object(self.routes.stripe.billing_portal.Session, "create", return_value=Session()))

    def founder(self):
        user = subscriber("starter", stripe_customer_id="cus_" + uuid.uuid4().hex[:8])
        self.subscriptions[user["subscription_id"]] = stripe_subscription(user["subscription_id"], user["stripe_customer_id"], "starter")
        return user

    def deliver_signed_by(self, secret, event):
        def construct(body, signature, key):
            if key != secret:
                raise self.routes.stripe.SignatureVerificationError("bad", signature)
            return event
        with patch.object(self.routes.stripe.Webhook, "construct_event", side_effect=construct):
            return self.client.post("/api/stripe/webhook", content=b"{}", headers={"stripe-signature": "t"})

    def test_legacy_events_are_verified_and_read_with_the_legacy_account(self):
        user = self.founder()
        response = self.deliver_signed_by("whsec_legacy", self.event("customer.subscription.updated", {"id": user["subscription_id"]}))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.retrieve.call_args.kwargs["api_key"], "sk_legacy")
        self.assertIsNone(get_user_by_id(user["id"])["stripe_account"])
        self.deliver_signed_by("whsec_test", self.event("customer.subscription.updated", {"id": user["subscription_id"]}))
        self.assertNotIn("api_key", self.retrieve.call_args.kwargs)
        self.assertEqual(self.deliver_signed_by("whsec_other", self.event("x", {})).status_code, 400)

    def test_founding_subscribers_manage_and_cancel_on_the_legacy_account(self):
        user = self.founder()
        self.client.post("/api/stripe/portal", headers=auth(user))
        self.assertEqual((self.portal.call_args.kwargs["api_key"], self.portal.call_args.kwargs["configuration"]),
                         ("sk_legacy", "bpc_legacy"))
        with patch.object(self.routes.stripe.Subscription, "modify", return_value=self.subscriptions[user["subscription_id"]]) as modify:
            self.assertEqual(self.client.post("/api/stripe/subscription/cancel", headers=auth(user)).status_code, 200)
        self.assertEqual(self.retrieve.call_args.kwargs["api_key"], "sk_legacy")
        self.assertEqual(modify.call_args.kwargs["api_key"], "sk_legacy")

    def test_founding_subscribers_buy_packs_as_guests_on_the_primary_account(self):
        user = self.founder()
        self.assertEqual(self.client.post("/api/stripe/packs/tracks_10/checkout", headers=auth(user)).status_code, 200)
        params = self.create.call_args.kwargs
        self.assertEqual(params["customer_email"], user["email"])
        self.assertNotIn("customer", params)
        self.assertNotIn("api_key", params)
        self.customer.assert_not_called()
        self.assertEqual(get_user_by_id(user["id"])["stripe_customer_id"], user["stripe_customer_id"])

    def test_a_former_legacy_customer_subscribes_on_the_primary_account(self):
        user = new_user("canceled", stripe_customer_id="cus_old", subscription_id="sub_old")
        response = self.client.post("/api/stripe/checkout", json={"plan": "pro"}, headers=auth(user))
        self.assertEqual(response.status_code, 200, response.text)
        stored = get_user_by_id(user["id"])
        self.assertNotEqual(stored["stripe_customer_id"], "cus_old")
        self.assertEqual(stored["stripe_account"], "primary")
        self.assertEqual(self.create.call_args.kwargs["customer"], stored["stripe_customer_id"])
        self.assertNotIn("api_key", self.create.call_args.kwargs)
        self.client.post("/api/stripe/portal", headers=auth(get_user_by_id(user["id"])))
        self.assertNotIn("api_key", self.portal.call_args.kwargs)
        self.assertEqual(self.portal.call_args.kwargs["configuration"], "bpc_primary")

    def test_new_webhook_customers_are_tagged_with_their_account(self):
        user = new_user(trial_days=5)
        sub = stripe_subscription("sub_new", "cus_new", "pro", user_id=user["id"])
        self.subscriptions["sub_new"] = sub
        self.deliver_signed_by("whsec_test", self.event("customer.subscription.created", {"id": "sub_new"}))
        stored = get_user_by_id(user["id"])
        self.assertEqual((stored["stripe_customer_id"], stored["stripe_account"]), ("cus_new", "primary"))

    def test_without_a_legacy_account_existing_customers_use_the_one_account(self):
        user = self.founder()
        with patch.object(self.routes, "STRIPE_LEGACY_SECRET_KEY", ""):
            self.client.post("/api/stripe/portal", headers=auth(user))
            self.assertNotIn("api_key", self.portal.call_args.kwargs)
            fresh = subscriber("pro")
            self.client.post("/api/stripe/packs/tracks_10/checkout", headers=auth(fresh))
            self.assertIsNone(get_user_by_id(fresh["id"])["stripe_account"], "untagged until a legacy account exists")
