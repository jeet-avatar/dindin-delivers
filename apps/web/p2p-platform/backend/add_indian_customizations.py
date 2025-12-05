"""
Add default customizations for Indian restaurant menu items.
This adds appropriate spice levels, serving sizes, and add-ons for Indian cuisine.
"""

from database import SessionLocal
from models import Vendor, VendorMenuItem

# Standard Indian restaurant customizations
INDIAN_SPICE_LEVELS = {
    "name": "Spice Level",
    "type": "single",
    "required": True,
    "min_selections": 1,
    "max_selections": 1,
    "options": [
        {"name": "Mild", "price": 0.0, "is_default": False, "is_available": True},
        {"name": "Medium", "price": 0.0, "is_default": True, "is_available": True},
        {"name": "Hot", "price": 0.0, "is_default": False, "is_available": True},
        {"name": "Extra Hot", "price": 0.0, "is_default": False, "is_available": True}
    ]
}

INDIAN_SERVING_SIZE = {
    "name": "Serving Size",
    "type": "single",
    "required": False,
    "min_selections": 0,
    "max_selections": 1,
    "options": [
        {"name": "Regular", "price": 0.0, "is_default": True, "is_available": True},
        {"name": "Large (Serves 2-3)", "price": 4.00, "is_default": False, "is_available": True},
        {"name": "Family Size (Serves 4-5)", "price": 8.00, "is_default": False, "is_available": True}
    ]
}

INDIAN_CURRY_ADDONS = {
    "name": "Add-ons",
    "type": "multiple",
    "required": False,
    "min_selections": 0,
    "max_selections": 5,
    "options": [
        {"name": "Extra Rice", "price": 2.50, "is_default": False, "is_available": True},
        {"name": "Garlic Naan", "price": 3.50, "is_default": False, "is_available": True},
        {"name": "Plain Naan", "price": 2.50, "is_default": False, "is_available": True},
        {"name": "Raita (Yogurt)", "price": 2.00, "is_default": False, "is_available": True},
        {"name": "Papadum", "price": 1.50, "is_default": False, "is_available": True}
    ]
}

INDIAN_PROTEIN_CHOICE = {
    "name": "Protein",
    "type": "single",
    "required": True,
    "min_selections": 1,
    "max_selections": 1,
    "options": [
        {"name": "Chicken", "price": 0.0, "is_default": True, "is_available": True},
        {"name": "Lamb", "price": 3.00, "is_default": False, "is_available": True},
        {"name": "Shrimp", "price": 4.00, "is_default": False, "is_available": True},
        {"name": "Paneer (Vegetarian)", "price": 0.0, "is_default": False, "is_available": True},
        {"name": "Vegetables", "price": 0.0, "is_default": False, "is_available": True}
    ]
}

INDIAN_RICE_TYPE = {
    "name": "Rice Type",
    "type": "single",
    "required": False,
    "min_selections": 0,
    "max_selections": 1,
    "options": [
        {"name": "Basmati Rice", "price": 0.0, "is_default": True, "is_available": True},
        {"name": "Jeera Rice (Cumin)", "price": 1.50, "is_default": False, "is_available": True},
        {"name": "Biryani Rice", "price": 2.00, "is_default": False, "is_available": True}
    ]
}

# Categories that should have specific customizations
CURRY_CATEGORIES = ["Chicken", "Lamb", "Goat", "Seafood", "Vegetarian"]
RICE_CATEGORIES = ["Rice", "Biryani"]
BREAD_CATEGORIES = ["Breads"]

def get_customizations_for_item(item):
    """Determine appropriate customizations based on item category and name"""
    customizations = []
    category = item.category or ""
    name = (item.item_name or "").lower()

    # Most items get spice level
    if category in CURRY_CATEGORIES or "curry" in name or "masala" in name or "tikka" in name:
        customizations.append(INDIAN_SPICE_LEVELS)
        customizations.append(INDIAN_SERVING_SIZE)
        customizations.append(INDIAN_CURRY_ADDONS)

    # Biryani gets special treatment
    if "biryani" in name:
        customizations.append(INDIAN_SPICE_LEVELS)
        customizations.append(INDIAN_SERVING_SIZE)
        customizations.append(INDIAN_CURRY_ADDONS)

    # Some items get protein choice
    if "thali" in name or "combo" in name:
        customizations.append(INDIAN_PROTEIN_CHOICE)
        customizations.append(INDIAN_SPICE_LEVELS)
        customizations.append(INDIAN_SERVING_SIZE)

    # Tandoori items
    if category == "Tandoori" or "tandoori" in name:
        customizations.append(INDIAN_SPICE_LEVELS)
        customizations.append({
            "name": "Preparation",
            "type": "single",
            "required": False,
            "min_selections": 0,
            "max_selections": 1,
            "options": [
                {"name": "Regular", "price": 0.0, "is_default": True, "is_available": True},
                {"name": "Extra Charred", "price": 0.0, "is_default": False, "is_available": True},
                {"name": "Less Charred", "price": 0.0, "is_default": False, "is_available": True}
            ]
        })

    # Appetizers
    if category == "Appetizers":
        customizations.append({
            "name": "Portion Size",
            "type": "single",
            "required": False,
            "min_selections": 0,
            "max_selections": 1,
            "options": [
                {"name": "Regular (4 pcs)", "price": 0.0, "is_default": True, "is_available": True},
                {"name": "Large (6 pcs)", "price": 3.00, "is_default": False, "is_available": True}
            ]
        })
        if "samosa" in name or "pakora" in name:
            customizations.append({
                "name": "Accompaniments",
                "type": "multiple",
                "required": False,
                "min_selections": 0,
                "max_selections": 3,
                "options": [
                    {"name": "Tamarind Chutney", "price": 0.50, "is_default": False, "is_available": True},
                    {"name": "Mint Chutney", "price": 0.50, "is_default": False, "is_available": True},
                    {"name": "Extra Sauce", "price": 0.75, "is_default": False, "is_available": True}
                ]
            })

    return customizations


def add_customizations_to_indian_restaurants():
    """Add customizations to all Indian restaurant menu items"""
    db = SessionLocal()

    try:
        # Find Indian restaurants
        indian_vendors = db.query(Vendor).filter(
            Vendor.cuisine_type.in_(["Indian", "South Indian", "North Indian"])
        ).all()

        if not indian_vendors:
            print("No Indian restaurants found. Looking for all vendors...")
            indian_vendors = db.query(Vendor).all()

        updated_count = 0

        for vendor in indian_vendors:
            vendor_name = vendor.restaurant_name or vendor.company_name or f"Vendor {vendor.id}"
            print(f"\n📍 Processing: {vendor_name} ({vendor.cuisine_type})")

            menu_items = db.query(VendorMenuItem).filter(
                VendorMenuItem.vendor_id == vendor.id
            ).all()

            for item in menu_items:
                customizations = get_customizations_for_item(item)

                if customizations:
                    item.customizations = customizations
                    updated_count += 1
                    print(f"  ✅ {item.item_name}: {len(customizations)} customization groups")
                else:
                    print(f"  ⏭️  {item.item_name}: No customizations applicable")

        db.commit()
        print(f"\n{'='*50}")
        print(f"✅ Updated {updated_count} menu items with customizations")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🍛 Adding customizations to Indian restaurant menu items...")
    add_customizations_to_indian_restaurants()
