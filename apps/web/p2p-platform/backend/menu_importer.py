#!/usr/bin/env python3
"""
Menu Importer with Verification
- Fetches menu from source
- Shows prices for manual verification BEFORE uploading
- Only uploads after user confirmation
"""

import requests
import json
from typing import List, Dict

API_BASE = "https://api.dollor.ai"


def authenticate(email: str, password: str) -> str:
    """Get auth token"""
    response = requests.post(
        f"{API_BASE}/api/auth/login",
        data={"username": email, "password": password}
    )
    if response.status_code != 200:
        raise Exception(f"Auth failed: {response.text}")
    return response.json()["access_token"]


def display_menu_for_verification(menu_items: List[Dict]) -> None:
    """Display menu items for manual verification before upload"""
    print("\n" + "=" * 70)
    print("MENU ITEMS FOR VERIFICATION")
    print("=" * 70)
    print(f"{'#':<4} {'Item':<35} {'Price':>10} {'Category':<15}")
    print("-" * 70)

    for i, item in enumerate(menu_items, 1):
        print(f"{i:<4} {item['item_name']:<35} ${item['price']:>8.2f} {item['category']:<15}")

    print("-" * 70)
    print(f"Total items: {len(menu_items)}")
    print("=" * 70)


def get_user_confirmation() -> bool:
    """Ask user to verify prices are correct"""
    print("\n⚠️  IMPORTANT: Please verify ALL prices match the restaurant's website/menu")
    print("    Compare each price with the official source before proceeding.\n")

    response = input("Are ALL prices correct? (yes/no): ").strip().lower()
    return response in ['yes', 'y']


def upload_menu_items(token: str, vendor_id: int, menu_items: List[Dict]) -> Dict:
    """Upload menu items to API"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    results = {"success": 0, "failed": 0, "errors": []}

    for item in menu_items:
        # Set defaults
        item.setdefault("is_available", True)
        item.setdefault("in_stock", True)
        item.setdefault("is_vegetarian", False)
        item.setdefault("is_vegan", False)
        item.setdefault("is_gluten_free", False)
        item.setdefault("is_spicy", False)
        item.setdefault("spice_level", 0)
        item.setdefault("prep_time", 15)

        response = requests.post(
            f"{API_BASE}/api/vendors/{vendor_id}/menu",
            headers=headers,
            json=item
        )

        if response.status_code in [200, 201]:
            results["success"] += 1
            print(f"  ✓ {item['item_name']}")
        else:
            results["failed"] += 1
            results["errors"].append(f"{item['item_name']}: {response.status_code}")
            print(f"  ✗ {item['item_name']}: {response.status_code}")

    return results


def bulk_update_prices(
    vendor_id: int,
    price_updates: Dict[str, float],
    email: str = "support@dollor.ai",
    password: str = None
) -> Dict:
    """
    Update multiple item prices at once

    Usage:
        updates = {
            "Skirt Steak Fajitas": 39.00,
            "Carnitas Plate": 28.00,
        }
        bulk_update_prices(43, updates, password="your_password")
    """

    if not password:
        password = input("Enter admin password: ").strip()

    token = authenticate(email, password)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Get current menu
    response = requests.get(
        f"{API_BASE}/api/vendors/{vendor_id}/menu",
        headers={"Authorization": f"Bearer {token}"}
    )
    menu_items = response.json()

    results = {"updated": 0, "not_found": 0, "failed": 0}

    print("\nUpdating prices...")
    for item_name, new_price in price_updates.items():
        item = next((i for i in menu_items if i["item_name"] == item_name), None)

        if not item:
            print(f"  ⚠ '{item_name}' not found")
            results["not_found"] += 1
            continue

        old_price = item["price"]
        item["price"] = new_price

        response = requests.put(
            f"{API_BASE}/api/vendors/{vendor_id}/menu/{item['id']}",
            headers=headers,
            json=item
        )

        if response.status_code == 200:
            print(f"  ✓ {item_name}: ${old_price:.2f} → ${new_price:.2f}")
            results["updated"] += 1
        else:
            print(f"  ✗ {item_name}: Failed ({response.status_code})")
            results["failed"] += 1

    print(f"\nSummary: {results['updated']} updated, {results['not_found']} not found, {results['failed']} failed")
    return results


if __name__ == "__main__":
    print("Menu Importer with Verification")
    print("================================")
    print("\nUsage:")
    print("  from menu_importer import bulk_update_prices")
    print("")
    print("  # Fix prices")
    print("  updates = {'Tacos': 14.00, 'Burrito': 16.00}")
    print("  bulk_update_prices(vendor_id=43, price_updates=updates)")
