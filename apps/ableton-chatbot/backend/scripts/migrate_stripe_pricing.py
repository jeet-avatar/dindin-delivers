#!/usr/bin/env python3
"""Migrate BeatMind Stripe prices to new pricing model.

Old: Starter $19, Pro $39, Studio $79
New: Starter $39.99, Pro $69.99, Studio $99.99

This script:
1. Creates new prices with the same lookup_keys (transferring from old prices)
2. Updates product metadata (songs_limit replaces included_tracks as the primary limit)
3. Creates round pack products ($1.99/10 rounds, $3.99/25 rounds)

Run with: STRIPE_SECRET_KEY=sk_live_... python3 scripts/migrate_stripe_pricing.py [--dry-run]

The lookup_key transfer is atomic in Stripe: the new price gets the key, the old one loses it.
The catalog.py code resolves plans by lookup_key, so the switch is instant.
"""

import os
import sys

import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
if not stripe.api_key:
    print("Set STRIPE_SECRET_KEY"); sys.exit(1)

DRY_RUN = "--dry-run" in sys.argv

NEW_PRICES = {
    "beatmind_starter_monthly":  {"amount": 3999,  "interval": "month", "product_lookup": "beatmind_starter_monthly"},
    "beatmind_starter_yearly":   {"amount": 39999, "interval": "year",  "product_lookup": "beatmind_starter_monthly"},
    "beatmind_pro_monthly":      {"amount": 6999,  "interval": "month", "product_lookup": "beatmind_pro_monthly"},
    "beatmind_pro_yearly":       {"amount": 69999, "interval": "year",  "product_lookup": "beatmind_pro_monthly"},
    "beatmind_studio_monthly":   {"amount": 9999,  "interval": "month", "product_lookup": "beatmind_studio_monthly"},
    "beatmind_studio_yearly":    {"amount": 99999, "interval": "year",  "product_lookup": "beatmind_studio_monthly"},
}

PRODUCT_METADATA_UPDATES = {
    "starter": {"songs_limit": "10", "model_access": "fast"},
    "pro":     {"songs_limit": "25", "model_access": "fast,pro"},
    "studio":  {"songs_limit": "50", "model_access": "fast,pro,ultra"},
}

ROUND_PACKS = [
    {"name": "10 Extra Rounds", "amount": 199, "lookup_key": "beatmind_rounds_10",
     "metadata": {"app": "beatmind", "kind": "rounds", "rounds": "10"}},
    {"name": "25 Extra Rounds", "amount": 399, "lookup_key": "beatmind_rounds_25",
     "metadata": {"app": "beatmind", "kind": "rounds", "rounds": "25"}},
]


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


def update_product_metadata(current):
    updated = set()
    for lookup_key, price in current.items():
        product = price.product
        product_id = product.id if hasattr(product, "id") else product
        if product_id in updated:
            continue
        tier = product.metadata.get("tier") if hasattr(product, "metadata") else None
        if tier and tier in PRODUCT_METADATA_UPDATES:
            new_meta = PRODUCT_METADATA_UPDATES[tier]
            print(f"  UPDATE product {product_id} (tier={tier}): +{new_meta}")
            if not DRY_RUN:
                stripe.Product.modify(product_id, metadata={**product.metadata, **new_meta})
            updated.add(product_id)


def create_round_packs():
    for pack in ROUND_PACKS:
        existing = stripe.Price.list(lookup_keys=[pack["lookup_key"]], active=True, limit=1)
        if existing.data:
            print(f"  SKIP {pack['lookup_key']}: already exists ({existing.data[0].id})")
            continue
        print(f"  CREATE product + price: {pack['name']} at ${pack['amount']/100:.2f}")
        if DRY_RUN:
            continue
        product = stripe.Product.create(name=f"BeatMind {pack['name']}", metadata=pack["metadata"])
        price = stripe.Price.create(
            product=product.id,
            unit_amount=pack["amount"],
            currency="usd",
            lookup_key=pack["lookup_key"],
        )
        print(f"    Product {product.id}, Price {price.id}")


if __name__ == "__main__":
    mode = "DRY RUN" if DRY_RUN else "LIVE"
    print(f"\n=== BeatMind Pricing Migration ({mode}) ===\n")

    print("1. Finding current prices...")
    current = find_current_prices()

    print("\n2. Migrating subscription prices...")
    migrate_prices(current)

    print("\n3. Updating product metadata...")
    update_product_metadata(current)

    print("\n4. Creating round pack products...")
    create_round_packs()

    print(f"\n=== Done ({mode}) ===")
    if DRY_RUN:
        print("Run without --dry-run to apply changes.")
