#!/usr/bin/env python3
"""Migrate MixMind Stripe prices to new pricing model.

Old: MixMind $12, Starter+MixMind $25, Pro+MixMind $45
New: MixMind $19.99, MixMind Pro $29.99, MixMind Studio $49.99

Run with: STRIPE_SECRET_KEY=sk_live_... python3 scripts/migrate_mixmind_pricing.py [--dry-run]
"""

import os
import sys

import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
if not stripe.api_key:
    print("Set STRIPE_SECRET_KEY"); sys.exit(1)

DRY_RUN = "--dry-run" in sys.argv

NEW_PRICES = {
    "mixmind_monthly":                {"amount": 1999,   "interval": "month"},
    "mixmind_yearly":                 {"amount": 19999,  "interval": "year"},
    "beatmind_starter_mixmind_monthly": {"amount": 2999,  "interval": "month"},
    "beatmind_starter_mixmind_yearly":  {"amount": 29999, "interval": "year"},
    "beatmind_pro_mixmind_monthly":   {"amount": 4999,  "interval": "month"},
    "beatmind_pro_mixmind_yearly":    {"amount": 49999, "interval": "year"},
}


def find_current_prices():
    keys = list(NEW_PRICES.keys())
    prices = {}
    for key in keys:
        result = stripe.Price.list(lookup_keys=[key], active=True, expand=["data.product"], limit=1)
        if result.data:
            prices[key] = result.data[0]
            print(f"  Found {key}: {result.data[0].id} at ${result.data[0].unit_amount/100:.2f}/{result.data[0].recurring.interval}")
        else:
            print(f"  NOT FOUND: {key}")
    return prices


def migrate_prices(current):
    for lookup_key, spec in NEW_PRICES.items():
        old = current.get(lookup_key)
        if not old:
            print(f"  SKIP {lookup_key}: no current price found")
            continue
        if old.unit_amount == spec["amount"]:
            print(f"  SKIP {lookup_key}: already at ${spec['amount']/100:.2f}")
            continue
        product_id = old.product.id if hasattr(old.product, "id") else old.product
        print(f"  CREATE {lookup_key}: ${old.unit_amount/100:.2f} -> ${spec['amount']/100:.2f} on product {product_id}")
        if DRY_RUN:
            continue
        stripe.Price.create(
            product=product_id,
            unit_amount=spec["amount"],
            currency="usd",
            recurring={"interval": spec["interval"]},
            lookup_key=lookup_key,
            transfer_lookup_key=True,
        )
        print(f"    Done. Old price {old.id} lost its lookup_key.")


if __name__ == "__main__":
    mode = "DRY RUN" if DRY_RUN else "LIVE"
    print(f"\n=== MixMind Pricing Migration ({mode}) ===\n")

    print("1. Finding current prices...")
    current = find_current_prices()

    print("\n2. Migrating prices...")
    migrate_prices(current)

    print(f"\n=== Done ({mode}) ===")
    if DRY_RUN:
        print("Run without --dry-run to apply changes.")
