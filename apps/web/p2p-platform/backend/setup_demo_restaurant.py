#!/usr/bin/env python3
"""
Setup Demo Restaurant for App Store Review
Creates "Apple Test Restaurant" near Cupertino, CA with menu items
"""

import requests
import json

# Production API
API_BASE = "https://api.dollor.ai"

# Demo Restaurant Details (near Apple HQ for reviewer)
DEMO_RESTAURANT = {
    "company_name": "Apple Test Restaurant",
    "restaurant_name": "Apple Test Restaurant",
    "contact_name": "Demo Manager",
    "contact_email": "demo.restaurant@dollor.ai",
    "contact_phone": "+1-408-555-0100",
    "cuisine_type": "American",
    "description": "Fresh American cuisine with burgers, pizzas, salads and more. Fast delivery in the Cupertino area.",
    "street": "1 Apple Park Way",
    "city": "Cupertino",
    "state": "CA",
    "zip_code": "95014",
    "country": "US",
    "latitude": 37.3349,  # Apple Park coordinates
    "longitude": -122.0090,
    "image_url": "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600",  # American diner
    "delivery_available": True,
    "pickup_available": True,
    "average_prep_time": 15,
    "minimum_order": 0.0,
    "delivery_fee": 2.99,
    "onboarding_status": "APPROVED",
    "is_online": True,
}

# Menu Items with stock images from Unsplash (royalty-free)
MENU_ITEMS = [
    # Appetizers (3)
    {
        "item_name": "Classic Soup of the Day",
        "description": "Fresh homemade soup served with artisan bread",
        "price": 5.99,
        "category": "Appetizers",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400"
    },
    {
        "item_name": "Crispy Chicken Wings",
        "description": "6 pieces tossed in your choice of buffalo, BBQ, or garlic parmesan",
        "price": 9.99,
        "category": "Appetizers",
        "is_vegetarian": False,
        "image_url": "https://images.unsplash.com/photo-1608039829572-82e560f24762?w=400"
    },
    {
        "item_name": "Garden Salad",
        "description": "Fresh mixed greens, cherry tomatoes, cucumbers with balsamic vinaigrette",
        "price": 7.99,
        "category": "Appetizers",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"
    },

    # Main Courses (5)
    {
        "item_name": "Classic Cheeseburger",
        "description": "Angus beef patty with aged cheddar, lettuce, tomato, pickles & secret sauce",
        "price": 12.99,
        "category": "Main Course",
        "is_vegetarian": False,
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"
    },
    {
        "item_name": "Grilled Chicken Sandwich",
        "description": "Herb-marinated chicken breast with avocado, bacon & chipotle mayo",
        "price": 11.99,
        "category": "Main Course",
        "is_vegetarian": False,
        "image_url": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400"
    },
    {
        "item_name": "Fish and Chips",
        "description": "Beer-battered Atlantic cod with crispy fries & house tartar sauce",
        "price": 14.99,
        "category": "Main Course",
        "is_vegetarian": False,
        "image_url": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400"
    },
    {
        "item_name": "Vegetable Stir Fry",
        "description": "Fresh seasonal vegetables in savory ginger-garlic sauce with steamed rice",
        "price": 10.99,
        "category": "Main Course",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"
    },
    {
        "item_name": "Margherita Pizza",
        "description": "Wood-fired crust with San Marzano tomatoes, fresh mozzarella & basil",
        "price": 13.99,
        "category": "Main Course",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400"
    },

    # Sides (3)
    {
        "item_name": "Truffle Fries",
        "description": "Hand-cut fries tossed with truffle oil & parmesan",
        "price": 5.99,
        "category": "Sides",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400"
    },
    {
        "item_name": "Onion Rings",
        "description": "Beer-battered onion rings with spicy aioli",
        "price": 4.99,
        "category": "Sides",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400"
    },
    {
        "item_name": "Caesar Salad",
        "description": "Romaine hearts, parmesan crisps, croutons & classic Caesar dressing",
        "price": 6.99,
        "category": "Sides",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400"
    },

    # Desserts (2)
    {
        "item_name": "Chocolate Lava Cake",
        "description": "Warm chocolate cake with molten center, served with vanilla ice cream",
        "price": 7.99,
        "category": "Desserts",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400"
    },
    {
        "item_name": "New York Cheesecake",
        "description": "Creamy classic cheesecake with fresh berry compote",
        "price": 6.99,
        "category": "Desserts",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400"
    },

    # Beverages (4)
    {
        "item_name": "Fresh Brewed Coffee",
        "description": "Premium arabica blend, freshly brewed",
        "price": 2.99,
        "category": "Beverages",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400"
    },
    {
        "item_name": "Fresh Lemonade",
        "description": "House-made with real lemons and a hint of mint",
        "price": 3.49,
        "category": "Beverages",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400"
    },
    {
        "item_name": "Iced Tea",
        "description": "Refreshing Southern-style sweet or unsweetened",
        "price": 2.49,
        "category": "Beverages",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400"
    },
    {
        "item_name": "Chocolate Milkshake",
        "description": "Creamy hand-spun milkshake with whipped cream",
        "price": 5.99,
        "category": "Beverages",
        "is_vegetarian": True,
        "image_url": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400"
    },
]

def login_demo_vendor():
    """Login as demo vendor to get auth token and vendor_id"""
    print("🔑 Logging in as demo.restaurant@dollor.ai...")

    response = requests.post(
        f"{API_BASE}/api/auth/vendor/login",
        data={
            "username": "demo.restaurant@dollor.ai",
            "password": "DemoRestaurant2025!"
        }
    )

    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        vendor_id = data.get("vendor_id")
        print(f"✅ Login successful - Vendor ID: {vendor_id}")
        return token, vendor_id
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None, None


def update_restaurant_details(token, vendor_id):
    """Update the demo restaurant with proper details and image"""
    print(f"\n📍 Updating restaurant details...")

    headers = {"Authorization": f"Bearer {token}"}

    # Restaurant image (American diner style)
    update_data = {
        "restaurant_name": DEMO_RESTAURANT["restaurant_name"],
        "company_name": DEMO_RESTAURANT["company_name"],
        "street": DEMO_RESTAURANT["street"],
        "city": DEMO_RESTAURANT["city"],
        "state": DEMO_RESTAURANT["state"],
        "zip_code": DEMO_RESTAURANT["zip_code"],
        "latitude": DEMO_RESTAURANT["latitude"],
        "longitude": DEMO_RESTAURANT["longitude"],
        "cuisine_type": DEMO_RESTAURANT["cuisine_type"],
        "description": DEMO_RESTAURANT["description"],
        "image_url": "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600",
        "is_online": True,
        "onboarding_status": "APPROVED",
        "average_prep_time": 15,
        "minimum_order": 0,
        "delivery_fee": 2.99,
    }

    response = requests.put(
        f"{API_BASE}/api/vendors/{vendor_id}",
        headers=headers,
        json=update_data
    )

    if response.status_code == 200:
        print(f"✅ Restaurant updated: {DEMO_RESTAURANT['restaurant_name']}")
        print(f"   📍 Location: {DEMO_RESTAURANT['city']}, {DEMO_RESTAURANT['state']}")
        return True
    else:
        print(f"❌ Update failed: {response.status_code} - {response.text[:200]}")
        return False


def clear_existing_menu(token, vendor_id):
    """Remove existing menu items before adding fresh ones"""
    print(f"\n🧹 Clearing existing menu items...")

    headers = {"Authorization": f"Bearer {token}"}

    # Get current menu
    response = requests.get(
        f"{API_BASE}/api/vendors/{vendor_id}/menu",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        # Handle different response formats
        menu_items = data.get("menu", data) if isinstance(data, dict) else data

        if isinstance(menu_items, list):
            for item in menu_items:
                item_id = item.get("id")
                if item_id:
                    del_response = requests.delete(
                        f"{API_BASE}/api/vendors/{vendor_id}/menu/{item_id}",
                        headers=headers
                    )
                    if del_response.status_code == 200:
                        print(f"   Deleted: {item.get('item_name', 'Unknown')}")

            print(f"✅ Cleared {len(menu_items)} existing items")
        else:
            print("   No existing menu items found")
    else:
        print(f"⚠️ Could not fetch menu: {response.status_code}")

def add_menu_items(token, vendor_id):
    """Add all menu items with images"""
    print(f"\n🍔 Adding {len(MENU_ITEMS)} menu items...")

    headers = {"Authorization": f"Bearer {token}"}
    success_count = 0

    for item in MENU_ITEMS:
        item_data = {
            "item_name": item["item_name"],
            "description": item["description"],
            "category": item["category"],
            "price": item["price"],
            "is_vegetarian": item.get("is_vegetarian", False),
            "is_available": True,
            "in_stock": True,
            "image_url": item.get("image_url", "")
        }

        response = requests.post(
            f"{API_BASE}/api/vendors/{vendor_id}/menu",
            headers=headers,
            json=item_data
        )

        if response.status_code in [200, 201]:
            success_count += 1
            print(f"   ✅ {item['item_name']} - ${item['price']}")
        else:
            print(f"   ❌ {item['item_name']}: {response.status_code}")

    print(f"\n✅ Added {success_count}/{len(MENU_ITEMS)} menu items")
    return success_count

def publish_restaurant(token, vendor_id):
    """Publish the restaurant to make it visible to customers"""
    print(f"\n📢 Publishing restaurant...")

    headers = {"Authorization": f"Bearer {token}"}

    # Try quick-publish endpoint
    response = requests.post(
        f"{API_BASE}/api/vendors/{vendor_id}/quick-publish",
        headers=headers
    )

    if response.status_code == 200:
        print("✅ Restaurant published and visible!")
        return True
    else:
        # Fallback: set online status
        response2 = requests.put(
            f"{API_BASE}/api/vendors/{vendor_id}/online-status",
            headers=headers,
            json={"is_online": True}
        )
        if response2.status_code == 200:
            print("✅ Restaurant set to online")
            return True
        else:
            print(f"⚠️ Could not publish: {response.status_code}")
            return False

def verify_setup(token, vendor_id):
    """Verify the restaurant is properly set up"""
    print(f"\n{'='*50}")
    print("📋 VERIFICATION")
    print('='*50)

    headers = {"Authorization": f"Bearer {token}"}

    # Check vendor details
    response = requests.get(f"{API_BASE}/api/vendors/{vendor_id}", headers=headers)
    if response.status_code == 200:
        vendor = response.json()
        print(f"Restaurant: {vendor.get('restaurant_name', vendor.get('company_name'))}")
        print(f"Location: {vendor.get('city')}, {vendor.get('state')}")
        print(f"Image: {'✅' if vendor.get('image_url') else '❌'}")
        print(f"Status: {vendor.get('onboarding_status')}")
        print(f"Online: {vendor.get('is_online')}")

    # Check menu
    response = requests.get(f"{API_BASE}/api/vendors/{vendor_id}/menu", headers=headers)
    if response.status_code == 200:
        data = response.json()
        menu_items = data.get("menu", data) if isinstance(data, dict) else data

        if isinstance(menu_items, list):
            print(f"\nMenu Items: {len(menu_items)}")

            # Group by category
            categories = {}
            for item in menu_items:
                cat = item.get("category", "Other")
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(item)

            for cat, items in categories.items():
                print(f"\n  {cat} ({len(items)} items):")
                for item in items[:2]:  # Show first 2 per category
                    has_img = "🖼️" if item.get("image_url") else "  "
                    print(f"    {has_img} {item.get('item_name')}: ${item.get('price')}")

def main():
    print("=" * 60)
    print("🍎 DEMO RESTAURANT SETUP FOR APP STORE REVIEW")
    print("=" * 60)
    print(f"API: {API_BASE}")
    print(f"Restaurant: {DEMO_RESTAURANT['restaurant_name']}")
    print(f"Location: {DEMO_RESTAURANT['city']}, {DEMO_RESTAURANT['state']}")
    print("=" * 60)

    # Step 1: Login
    token, vendor_id = login_demo_vendor()
    if not token or not vendor_id:
        print("\n❌ Cannot proceed - demo account not found")
        print("Run this first: curl -X POST https://api.dollor.ai/api/demo/setup")
        return

    # Step 2: Update restaurant details
    update_restaurant_details(token, vendor_id)

    # Step 3: Clear existing menu
    clear_existing_menu(token, vendor_id)

    # Step 4: Add new menu items with images
    add_menu_items(token, vendor_id)

    # Step 5: Publish restaurant
    publish_restaurant(token, vendor_id)

    # Step 6: Verify
    verify_setup(token, vendor_id)

    print("\n" + "=" * 60)
    print("🎉 SETUP COMPLETE!")
    print("=" * 60)
    print("""
┌─────────────────────────────────────────────────────┐
│  RESTAURANT APP DEMO LOGIN                          │
├─────────────────────────────────────────────────────┤
│  Email:    demo.restaurant@dollor.ai                │
│  Password: DemoRestaurant2025!                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  CUSTOMER APP DEMO LOGIN                            │
├─────────────────────────────────────────────────────┤
│  Email:    demo.customer@dollor.ai                  │
│  Password: DemoCustomer2025!                        │
└─────────────────────────────────────────────────────┘

TESTING:
• Restaurant App: Login to see full menu with images
• Customer App: Search "Apple Test Restaurant" near Cupertino
""")

if __name__ == "__main__":
    main()
