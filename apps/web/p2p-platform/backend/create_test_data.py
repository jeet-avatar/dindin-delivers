"""
Create test data for EatFair - Restaurant, Driver, and Order
$1 platform fee model
"""

from database import SessionLocal, engine
from models import Vendor, VendorStatus, VendorMenuItem, Driver, DriverStatus, Order, OrderStatus
from datetime import datetime
import json
import uuid

db = SessionLocal()

# ========== 1. CREATE RESTAURANT IN RANCHO SANTA MARGARITA ==========
print("\n=== Creating Restaurant ===")

# Check if restaurant exists
existing = db.query(Vendor).filter(Vendor.restaurant_name == "Natraj Cuisine").first()
if existing:
    restaurant = existing
    print(f"Restaurant already exists: {restaurant.restaurant_name} (ID: {restaurant.id})")
else:
    restaurant = Vendor(
        vendor_id=f"VND-{uuid.uuid4().hex[:8].upper()}",
        company_name="Natraj Cuisine Inc",
        restaurant_name="Natraj Cuisine",
        cuisine_type="Indian",
        contact_name="Ravi Kumar",
        contact_email="natraj@eatfair.com",
        contact_phone="949-555-1234",
        street="30211 Avenida De Las Banderas",
        city="Rancho Santa Margarita",
        state="CA",
        zip_code="92688",
        country="USA",
        latitude=33.6411,
        longitude=-117.5914,
        onboarding_status=VendorStatus.APPROVED,
        tax_id="12-3456789",
        delivery_available=True,
        pickup_available=True,
        average_prep_time=25
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    print(f"✅ Created restaurant: {restaurant.restaurant_name} (ID: {restaurant.id})")

# Add menu items
print("\n=== Adding Menu Items ===")
menu_items = [
    {"name": "Butter Chicken", "price": 16.99, "description": "Creamy tomato curry with tender chicken", "category": "Main Course"},
    {"name": "Chicken Biryani", "price": 14.99, "description": "Aromatic basmati rice with spiced chicken", "category": "Rice"},
    {"name": "Samosa (2 pcs)", "price": 5.99, "description": "Crispy pastry with spiced potato filling", "category": "Appetizers"},
    {"name": "Garlic Naan", "price": 3.99, "description": "Fresh baked bread with garlic", "category": "Bread"},
    {"name": "Mango Lassi", "price": 4.99, "description": "Sweet mango yogurt drink", "category": "Beverages"},
]

for item in menu_items:
    existing_item = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == restaurant.id,
        VendorMenuItem.item_name == item["name"]
    ).first()
    
    if not existing_item:
        menu_item = VendorMenuItem(
            vendor_id=restaurant.id,
            item_name=item["name"],
            description=item["description"],
            price=item["price"],
            category=item["category"],
            is_available=True,
            in_stock=True
        )
        db.add(menu_item)
        print(f"  + {item['name']} - ${item['price']}")

db.commit()

# ========== 2. CREATE DRIVER IN RANCHO SANTA MARGARITA ==========
print("\n=== Creating Driver ===")

existing_driver = db.query(Driver).filter(Driver.email == "driver@eatfair.com").first()
if existing_driver:
    driver = existing_driver
    print(f"Driver already exists: {driver.first_name} {driver.last_name} (ID: {driver.id})")
else:
    driver = Driver(
        email="driver@eatfair.com",
        password_hash="driver123",
        first_name="John",
        last_name="Smith",
        phone="949-555-5678",
        driver_code="DRV001",
        status=DriverStatus.ACTIVE,
        is_online=True,
        current_latitude=33.6450,  # Near Rancho Santa Margarita
        current_longitude=-117.5900,
        location_updated_at=datetime.now(),
        rating=4.9,
        total_deliveries=150,
        vehicle_type="Car",
        vehicle_make="Toyota",
        vehicle_model="Camry",
        vehicle_year="2022",
        license_plate="ABC1234"
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    print(f"✅ Created driver: {driver.first_name} {driver.last_name} (ID: {driver.id})")

# ========== 3. CREATE TEST ORDER WITH $1 PLATFORM FEE ==========
print("\n=== Creating Test Order ===")

# Get menu items for the order
butter_chicken = db.query(VendorMenuItem).filter(
    VendorMenuItem.vendor_id == restaurant.id,
    VendorMenuItem.item_name == "Butter Chicken"
).first()

naan = db.query(VendorMenuItem).filter(
    VendorMenuItem.vendor_id == restaurant.id,
    VendorMenuItem.item_name == "Garlic Naan"
).first()

if butter_chicken and naan:
    # Calculate totals
    subtotal = butter_chicken.price + naan.price  # $16.99 + $3.99 = $20.98
    tax_rate = 0.0775  # California tax rate
    tax_amount = round(subtotal * tax_rate, 2)
    delivery_fee = 4.99  # Goes to driver
    platform_fee = 1.00  # $1 Dollar store model - charged to restaurant
    tip = 3.00
    total = round(subtotal + tax_amount + delivery_fee + tip, 2)

    items_json = json.dumps([
        {
            "menu_item_id": butter_chicken.id,
            "name": "Butter Chicken",
            "quantity": 1,
            "unit_price": butter_chicken.price,
            "total_price": butter_chicken.price
        },
        {
            "menu_item_id": naan.id,
            "name": "Garlic Naan",
            "quantity": 1,
            "unit_price": naan.price,
            "total_price": naan.price
        }
    ])

    delivery_address = json.dumps({
        "street": "22365 El Toro Rd",
        "city": "Lake Forest",
        "state": "CA",
        "zip": "92630",
        "country": "USA"
    })

    order = Order(
        order_number=f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}",
        customer_name="Test Customer",
        customer_email="customer@test.com",
        customer_phone="949-555-9999",
        vendor_id=restaurant.id,
        items=items_json,
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        delivery_fee=delivery_fee,
        platform_fee=platform_fee,  # $1 platform fee
        tip=tip,
        total_amount=total,
        delivery_address=delivery_address,
        delivery_instructions="Leave at door, ring bell",
        delivery_latitude=33.6469,
        delivery_longitude=-117.6894,
        status=OrderStatus.CONFIRMED,
        payment_status="succeeded",
        confirmed_at=datetime.now()
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    print(f"✅ Created order: {order.order_number} (ID: {order.id})")
    print(f"\n{'='*50}")
    print(f"           ORDER SUMMARY")
    print(f"{'='*50}")
    print(f"  Restaurant: {restaurant.restaurant_name}")
    print(f"  Location: {restaurant.city}, {restaurant.state}")
    print(f"  Items:")
    print(f"    - Butter Chicken x1   ${butter_chicken.price:.2f}")
    print(f"    - Garlic Naan x1      ${naan.price:.2f}")
    print(f"  {'─'*40}")
    print(f"  Subtotal:               ${subtotal:.2f}")
    print(f"  Tax ({tax_rate*100:.2f}%):            ${tax_amount:.2f}")
    print(f"  Delivery Fee:           ${delivery_fee:.2f}")
    print(f"  Tip:                    ${tip:.2f}")
    print(f"  {'─'*40}")
    print(f"  TOTAL:                  ${total:.2f}")
    print(f"{'='*50}")
    print(f"\n        EARNINGS BREAKDOWN ($1 MODEL)")
    print(f"{'='*50}")
    print(f"  Customer pays:          ${total:.2f}")
    print(f"  Restaurant gets:        ${subtotal - platform_fee:.2f}")
    print(f"  Driver gets:            ${delivery_fee + tip:.2f}")
    print(f"  Platform gets:          ${platform_fee:.2f} ← $1 fee!")
    print(f"{'='*50}")

else:
    print("⚠️ Menu items not found, skipping order creation")

db.close()

print("\n✅ Test data created successfully!")
print("\n=== Login Credentials ===")
print("  Restaurant: natraj@eatfair.com")
print("  Driver: driver@eatfair.com / driver123")
