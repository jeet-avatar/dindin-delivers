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
    "description": "Demo restaurant for App Store testing. Fresh American cuisine with quick delivery.",
    "street": "1 Apple Park Way",
    "city": "Cupertino",
    "state": "CA",
    "zip_code": "95014",
    "country": "US",
    "latitude": 37.3349,  # Apple Park coordinates
    "longitude": -122.0090,
    "delivery_available": True,
    "pickup_available": True,
    "average_prep_time": 15,
    "minimum_order": 0.0,
    "delivery_fee": 2.99,
    "onboarding_status": "approved",
    "is_published": True,
    "delivery_enabled": True,
}

# Menu Items with keywords that trigger good stock images
MENU_ITEMS = [
    # Appetizers
    {"item_name": "Classic Soup of the Day", "description": "Fresh homemade soup", "price": 5.99, "category": "Appetizers", "is_vegetarian": True},
    {"item_name": "Crispy Chicken Wings", "description": "6 pieces with ranch dip", "price": 9.99, "category": "Appetizers", "is_vegetarian": False},
    {"item_name": "Garden Salad", "description": "Fresh mixed greens with vinaigrette", "price": 7.99, "category": "Appetizers", "is_vegetarian": True},

    # Main Courses
    {"item_name": "Classic Burger", "description": "Angus beef patty with cheese, lettuce, tomato", "price": 12.99, "category": "Main Course", "is_vegetarian": False},
    {"item_name": "Grilled Chicken Sandwich", "description": "Herb-marinated chicken breast", "price": 11.99, "category": "Main Course", "is_vegetarian": False},
    {"item_name": "Fish and Chips", "description": "Beer-battered cod with fries", "price": 14.99, "category": "Main Course", "is_vegetarian": False},
    {"item_name": "Vegetable Stir Fry", "description": "Fresh vegetables in savory sauce with rice", "price": 10.99, "category": "Main Course", "is_vegetarian": True},
    {"item_name": "Margherita Pizza", "description": "Fresh mozzarella, tomato, basil", "price": 13.99, "category": "Main Course", "is_vegetarian": True},

    # Sides
    {"item_name": "French Fries", "description": "Crispy golden fries", "price": 3.99, "category": "Sides", "is_vegetarian": True},
    {"item_name": "Rice Bowl", "description": "Steamed jasmine rice", "price": 2.99, "category": "Sides", "is_vegetarian": True},

    # Desserts
    {"item_name": "Chocolate Dessert Cake", "description": "Rich chocolate layer cake", "price": 6.99, "category": "Desserts", "is_vegetarian": True},
    {"item_name": "Ice Cream Sundae", "description": "Vanilla ice cream with toppings", "price": 5.99, "category": "Desserts", "is_vegetarian": True},

    # Beverages
    {"item_name": "Fresh Coffee", "description": "Freshly brewed coffee", "price": 2.99, "category": "Beverages", "is_vegetarian": True},
    {"item_name": "Iced Tea", "description": "Refreshing iced tea", "price": 2.49, "category": "Beverages", "is_vegetarian": True},
    {"item_name": "Soft Drink", "description": "Coke, Sprite, or Fanta", "price": 1.99, "category": "Beverages", "is_vegetarian": True},
]

def create_demo_restaurant():
    """Create the demo restaurant"""
    print("Creating Apple Test Restaurant...")

    # First check if it already exists
    response = requests.get(f"{API_BASE}/api/vendors")
    if response.status_code == 200:
        vendors = response.json()
        for vendor in vendors:
            if vendor.get("company_name") == "Apple Test Restaurant":
                print(f"Restaurant already exists with ID: {vendor['id']}")
                return vendor['id']

    # Create new vendor
    response = requests.post(
        f"{API_BASE}/api/vendors",
        json=DEMO_RESTAURANT,
        headers={"Content-Type": "application/json"}
    )

    if response.status_code in [200, 201]:
        vendor = response.json()
        vendor_id = vendor.get("id") or vendor.get("vendor_id")
        print(f"Created restaurant with ID: {vendor_id}")
        return vendor_id
    else:
        print(f"Failed to create restaurant: {response.status_code}")
        print(response.text)
        return None

def add_menu_items(vendor_id):
    """Add menu items to the restaurant"""
    print(f"\nAdding menu items to vendor {vendor_id}...")

    for item in MENU_ITEMS:
        item["vendor_id"] = vendor_id
        item["is_available"] = True

        response = requests.post(
            f"{API_BASE}/api/vendors/{vendor_id}/menu",
            json=item,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code in [200, 201]:
            print(f"  Added: {item['item_name']} - ${item['price']}")
        else:
            print(f"  Failed to add {item['item_name']}: {response.status_code}")

def update_vendor_status(vendor_id):
    """Ensure vendor is published and approved"""
    print(f"\nUpdating vendor {vendor_id} status...")

    update_data = {
        "is_published": True,
        "onboarding_status": "approved",
        "delivery_enabled": True,
    }

    response = requests.patch(
        f"{API_BASE}/api/vendors/{vendor_id}",
        json=update_data,
        headers={"Content-Type": "application/json"}
    )

    if response.status_code == 200:
        print("  Vendor status updated: published=True, approved=True")
    else:
        print(f"  Status update response: {response.status_code}")

def verify_setup(vendor_id):
    """Verify the restaurant is properly set up"""
    print(f"\n=== Verification ===")

    # Check vendor
    response = requests.get(f"{API_BASE}/api/vendors/{vendor_id}")
    if response.status_code == 200:
        vendor = response.json()
        print(f"Restaurant: {vendor.get('company_name', vendor.get('restaurant_name'))}")
        print(f"Location: {vendor.get('city')}, {vendor.get('state')}")
        print(f"Published: {vendor.get('is_published')}")
        print(f"Status: {vendor.get('onboarding_status')}")

    # Check menu
    response = requests.get(f"{API_BASE}/api/vendors/{vendor_id}/menu")
    if response.status_code == 200:
        menu = response.json()
        print(f"Menu Items: {len(menu)}")
        if menu:
            print("Sample items:")
            for item in menu[:3]:
                print(f"  - {item.get('item_name')}: ${item.get('price')}")

def main():
    print("=" * 50)
    print("DEMO RESTAURANT SETUP FOR APP STORE REVIEW")
    print("=" * 50)

    # Create restaurant
    vendor_id = create_demo_restaurant()
    if not vendor_id:
        print("Failed to create restaurant. Exiting.")
        return

    # Add menu items
    add_menu_items(vendor_id)

    # Update status
    update_vendor_status(vendor_id)

    # Verify
    verify_setup(vendor_id)

    print("\n" + "=" * 50)
    print("SETUP COMPLETE!")
    print("=" * 50)
    print(f"""
For App Store Connect Review Notes:

DEMO ACCOUNT:
Email: demo.customer@dollor.ai
Password: DemoCustomer2025!

TESTING INSTRUCTIONS:
1. Login with demo credentials
2. Allow location access
3. Search for "Apple Test Restaurant" or browse nearby
4. Add items to cart (e.g., Classic Burger $12.99)
5. Checkout with saved payment method
6. Order will be placed successfully

Restaurant ID: {vendor_id}
Location: Cupertino, CA (near Apple Park)
""")

if __name__ == "__main__":
    main()
