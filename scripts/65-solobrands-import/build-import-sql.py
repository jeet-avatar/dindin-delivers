#!/usr/bin/env python3
"""
Phase 65-01: Build idempotent SQL to wipe + import Solo Brands real scraped data.

Generates two SQL files (both run via zietra-rls-runner-55-05 Lambda):
  1) wipe.sql   — DELETE the 15 placeholder items + 5 sales_orders
  2) import.sql — INSERT 90+ scraped products + 4 representative sales orders

Schema (verified via information_schema 2026-05-16):
  turion.items:        (id text, name text, category text, source_data jsonb,
                        created_at, updated_at, tenant_id uuid)
  turion.sales_orders: (id text, customer text, total numeric, status text,
                        source_data jsonb, created_at, updated_at, tenant_id uuid)

Tenant: solobrands  →  45896e95-699f-494d-882b-bd780dfe46f3

Outputs SQL strings to stdout (one statement per line, terminated with `;`)
or to files when --out-dir is provided.
"""
import argparse
import json
import re
import sys
from pathlib import Path

TENANT_ID = "45896e95-699f-494d-882b-bd780dfe46f3"

RESEARCH_DIR = Path("/Users/jeet/Downloads/solobrands-research-2026-05-16/extracted")


def pg_quote(v):
    """Quote a value safely for PostgreSQL."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        s = json.dumps(v, ensure_ascii=False)
        return "'" + s.replace("'", "''") + "'::jsonb"
    s = str(v).replace("'", "''")
    return "'" + s + "'"


def slug_to_id(brand_prefix: str, slug_or_sku: str) -> str:
    """Derive a deterministic, prefixed item id."""
    raw = slug_or_sku or ""
    # Upper-case, replace runs of non-alnum with `-`, strip dashes.
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", raw).strip("-").upper()
    if not cleaned:
        cleaned = "UNKNOWN"
    return f"{brand_prefix}-{cleaned}"[:120]  # cap length for safety


# ---------------------------------------------------------------------------
# Wipe SQL
# ---------------------------------------------------------------------------

WIPE_SQL = [
    f"SET app.tenant_id='{TENANT_ID}'",
    f"DELETE FROM turion.sales_orders WHERE tenant_id='{TENANT_ID}'",
    f"DELETE FROM turion.items WHERE tenant_id='{TENANT_ID}'",
    f"SELECT count(*) AS items_remaining FROM turion.items WHERE tenant_id='{TENANT_ID}'",
    f"SELECT count(*) AS sales_orders_remaining FROM turion.sales_orders WHERE tenant_id='{TENANT_ID}'",
]


# ---------------------------------------------------------------------------
# Items import
# ---------------------------------------------------------------------------

def build_items_inserts():
    """Yield INSERT statements for every scraped product across the 4 brands."""
    statements = [f"SET app.tenant_id='{TENANT_ID}'"]
    seen_ids: set[str] = set()
    duplicates: list[str] = []
    total = 0

    brand_files = [
        ("SOLO", "Solo Stove",  "outdoor-firepits-pizzaovens", "solo-stove-r2.json", "products"),
        ("ORU",  "Oru Kayak",   "folding-kayaks",              "oru-kayak.json",      "products"),
        ("ISLE", "ISLE",        "paddleboards-watersports",    "isle.json",           "products"),
        ("CHUB", "Chubbies",    "apparel-mens-boys",           "chubbies.json",       "products"),
    ]

    for prefix, brand_name, default_cat, fname, products_key in brand_files:
        data = json.loads((RESEARCH_DIR / fname).read_text())
        products = data.get(products_key, [])
        for idx, p in enumerate(products):
            sku = p.get("sku")
            slug = p.get("slug")
            name = p.get("name") or sku or slug or f"{brand_name} Item {idx}"
            # Strip a trailing backslash if name accidentally contains a literal '\"' from JSON
            name = name.replace('\\"', '"').replace("\\", "").strip()

            # Build a stable id. Prefer SKU, then slug, then fallback name-derived.
            id_seed = sku or slug or name
            item_id = slug_to_id(prefix, id_seed)
            # Disambiguate duplicates by appending index
            base_id = item_id
            n = 1
            while item_id in seen_ids:
                n += 1
                item_id = f"{base_id}-{n}"
                if n > 50:
                    raise RuntimeError(f"Cannot disambiguate {base_id}")
            if item_id != base_id:
                duplicates.append(item_id)
            seen_ids.add(item_id)

            category = p.get("category") or default_cat

            price = p.get("price_usd")
            msrp = p.get("msrp_usd") or p.get("price_usd_max")
            currency = p.get("currency", "USD")
            description = (p.get("description") or "").strip()

            source_data = {
                "brand": prefix.lower() if prefix != "SOLO" else "solo-stove",
                "brand_name": brand_name,
                "sku": sku,
                "slug": slug,
                "name": name,
                "description": description,
                "list_price": price,
                "msrp": msrp,
                "currency": currency,
                "category": category,
                "availability": p.get("availability"),
                "specifications": p.get("specifications"),
                "image_url": p.get("image_url"),
                "product_url": p.get("product_url") or p.get("url"),
                "source": "scraped-2026-05-16",
                "verified": bool(sku) and bool(price),  # SKU + price = JSON-LD or products.json
                "_imported_via": "phase-65-01-real-data-import",
            }

            stmt = (
                "INSERT INTO turion.items (id, name, category, source_data, tenant_id, created_at, updated_at) "
                f"VALUES ({pg_quote(item_id)}, {pg_quote(name)}, {pg_quote(category)}, "
                f"{pg_quote(source_data)}, '{TENANT_ID}'::uuid, now(), now()) "
                "ON CONFLICT (id) DO UPDATE SET "
                "name = EXCLUDED.name, category = EXCLUDED.category, "
                "source_data = EXCLUDED.source_data, updated_at = now()"
            )
            statements.append(stmt)
            total += 1

    statements.append(
        f"SELECT count(*) AS items_inserted FROM turion.items WHERE tenant_id='{TENANT_ID}'"
    )
    return statements, total, duplicates


# ---------------------------------------------------------------------------
# Representative sales orders (4)
# ---------------------------------------------------------------------------

SALES_ORDERS = [
    {
        "id": "SO-SB-2026-1001",
        "customer": "REI (Recreational Equipment Inc.)",
        "channel": "wholesale",
        "status": "fulfilled",
        "lines": [
            {"item_id": "SOLO-SS-BONFIRE-2.0", "name_hint": "Bonfire", "qty": 100, "unit_price_usd": 299.99},
        ],
        "ship_to": "REI DC, Sumner, WA 98390",
        "po_number": "REI-PO-44892",
        "notes": "Quarterly restock — Bonfire 2.0 (Solo Stove flagship)",
    },
    {
        "id": "SO-SB-2026-1002",
        "customer": "Sarah Hennessey (DTC)",
        "channel": "dtc",
        "status": "shipped",
        "lines": [
            {"item_id": "ORU-OUTDOOR-FOLDABLE", "name_hint": "Oru Lake", "qty": 1, "unit_price_usd": 399.00},
            {"item_id": "ISLE-PIONEER-PRO-2",   "name_hint": "Pioneer Pro 2", "qty": 1, "unit_price_usd": 795.00},
        ],
        "ship_to": "Sarah Hennessey, 2847 Mountain Vw Dr, Boulder CO 80302",
        "po_number": None,
        "notes": "Lifestyle bundle — kayak + paddleboard",
    },
    {
        "id": "SO-SB-2026-1003",
        "customer": "Dick's Sporting Goods",
        "channel": "wholesale",
        "status": "fulfilled",
        "lines": [
            {"item_id": "ISLE-PIONEER-PRO-2", "name_hint": "Pioneer Pro 2", "qty": 50, "unit_price_usd": 795.00},
        ],
        "ship_to": "Dick's Sporting Goods DC, Smithton PA 15479",
        "po_number": "DKS-PO-2026-7741",
        "notes": "Spring season order — ISLE Pioneer 10'6 SUP",
    },
    {
        "id": "SO-SB-2026-1004",
        "customer": "Marcus Riley (DTC)",
        "channel": "dtc",
        "status": "processing",
        "lines": [
            {"item_id": "CHUB-CHUB-DREAMHOUSE-PINKS-55-SWIM", "name_hint": "Dreamhouse Pinks", "qty": 1, "unit_price_usd": 79.50},
            {"item_id": "CHUB-CHUB-TECHNICOLOR-STITCHES-55-SWIM", "name_hint": "Technicolor Stitches", "qty": 1, "unit_price_usd": 79.50},
            {"item_id": "CHUB-CHUB-MIAMI-MOSAIC-55-SWIM", "name_hint": "Miami Mosaic", "qty": 1, "unit_price_usd": 79.50},
        ],
        "ship_to": "Marcus Riley, 489 Coast Hwy, Newport Beach CA 92660",
        "po_number": None,
        "notes": "Summer swim trunk DTC cart",
    },
]


def build_sales_orders_inserts():
    statements = [f"SET app.tenant_id='{TENANT_ID}'"]
    total = 0
    for so in SALES_ORDERS:
        # compute total
        total_amt = sum(line["qty"] * line["unit_price_usd"] for line in so["lines"])
        source_data = {
            "id": so["id"],
            "customer": so["customer"],
            "po_number": so["po_number"],
            "channel": so["channel"],
            "ship_to": so["ship_to"],
            "notes": so["notes"],
            "lines": so["lines"],
            "subtotal_usd": round(total_amt, 2),
            "currency": "USD",
            "_created_via": "phase-65-01-real-data-import",
        }
        stmt = (
            "INSERT INTO turion.sales_orders (id, customer, total, status, source_data, tenant_id, created_at, updated_at) "
            f"VALUES ({pg_quote(so['id'])}, {pg_quote(so['customer'])}, "
            f"{round(total_amt, 2)}, {pg_quote(so['status'])}, "
            f"{pg_quote(source_data)}, '{TENANT_ID}'::uuid, now(), now()) "
            "ON CONFLICT (id) DO UPDATE SET "
            "customer=EXCLUDED.customer, total=EXCLUDED.total, status=EXCLUDED.status, "
            "source_data=EXCLUDED.source_data, updated_at=now()"
        )
        statements.append(stmt)
        total += 1
    statements.append(
        f"SELECT count(*) AS sales_orders_inserted FROM turion.sales_orders WHERE tenant_id='{TENANT_ID}'"
    )
    return statements, total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", help="Write wipe.sql + import.sql + sales-orders.sql to dir")
    parser.add_argument("--dry-run", action="store_true", help="Print summary only")
    args = parser.parse_args()

    items_stmts, items_count, duplicates = build_items_inserts()
    so_stmts, so_count = build_sales_orders_inserts()

    print(f"Wipe statements:         {len(WIPE_SQL)}", file=sys.stderr)
    print(f"Items to insert:         {items_count}", file=sys.stderr)
    if duplicates:
        print(f"  (disambiguated dupes:  {len(duplicates)} -> {duplicates[:5]}...)", file=sys.stderr)
    print(f"Sales orders to insert:  {so_count}", file=sys.stderr)

    if args.dry_run:
        return 0

    if args.out_dir:
        out = Path(args.out_dir)
        out.mkdir(parents=True, exist_ok=True)
        (out / "wipe.sql").write_text(";\n".join(WIPE_SQL) + ";\n")
        (out / "import-items.sql").write_text(";\n".join(items_stmts) + ";\n")
        (out / "import-sales-orders.sql").write_text(";\n".join(so_stmts) + ";\n")
        print(f"Wrote: {out}/wipe.sql, import-items.sql, import-sales-orders.sql", file=sys.stderr)
    else:
        print(";\n".join(WIPE_SQL) + ";")
        print(";\n".join(items_stmts) + ";")
        print(";\n".join(so_stmts) + ";")

    return 0


if __name__ == "__main__":
    sys.exit(main())
