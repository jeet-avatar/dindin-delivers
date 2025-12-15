"""
Seed Menu Items for EatFair Restaurants
Creates comprehensive menu for Natraj Cuisine and Tutto Fresco
"""

from database import SessionLocal, engine
from models import Vendor, VendorStatus, VendorMenuItem
from datetime import datetime
import uuid

db = SessionLocal()

# ========== 1. NATRAJ CUISINE (Indian Restaurant) ==========
print("\n" + "="*60)
print("SEEDING NATRAJ CUISINE MENU")
print("="*60)

# Check if restaurant exists
natraj = db.query(Vendor).filter(Vendor.restaurant_name == "Natraj Cuisine").first()
if not natraj:
    natraj = Vendor(
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
    db.add(natraj)
    db.commit()
    db.refresh(natraj)
    print(f"Created restaurant: {natraj.restaurant_name} (ID: {natraj.id})")
else:
    print(f"Restaurant exists: {natraj.restaurant_name} (ID: {natraj.id})")

# Natraj Menu Items
natraj_menu = [
    # Appetizers
    {"name": "Vegetable Samosa (2 pcs)", "price": 6.99, "description": "Crispy pastry filled with spiced potatoes and peas", "category": "Appetizers", "is_vegetarian": True, "prep_time": 10},
    {"name": "Chicken Tikka", "price": 12.99, "description": "Boneless chicken marinated in yogurt and spices, grilled in tandoor", "category": "Appetizers", "is_spicy": True, "prep_time": 15},
    {"name": "Paneer Tikka", "price": 11.99, "description": "Cottage cheese marinated in spices, grilled to perfection", "category": "Appetizers", "is_vegetarian": True, "prep_time": 15},
    {"name": "Onion Bhaji", "price": 7.99, "description": "Crispy onion fritters with chickpea batter", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "prep_time": 10},

    # Main Course - Chicken
    {"name": "Butter Chicken", "price": 17.99, "description": "Tender chicken in rich, creamy tomato sauce", "category": "Main Course", "prep_time": 20},
    {"name": "Chicken Tikka Masala", "price": 18.99, "description": "Grilled chicken in spiced tomato cream sauce", "category": "Main Course", "prep_time": 20},
    {"name": "Chicken Vindaloo", "price": 17.99, "description": "Spicy Goan curry with potatoes", "category": "Main Course", "is_spicy": True, "spice_level": 4, "prep_time": 25},
    {"name": "Chicken Korma", "price": 17.99, "description": "Mild creamy curry with cashews and coconut", "category": "Main Course", "prep_time": 20},

    # Main Course - Lamb
    {"name": "Lamb Rogan Josh", "price": 21.99, "description": "Kashmiri lamb curry with aromatic spices", "category": "Main Course", "is_spicy": True, "prep_time": 30},
    {"name": "Lamb Biryani", "price": 19.99, "description": "Fragrant basmati rice with spiced lamb", "category": "Main Course", "prep_time": 25},

    # Main Course - Vegetarian
    {"name": "Palak Paneer", "price": 15.99, "description": "Cottage cheese in spinach gravy", "category": "Main Course", "is_vegetarian": True, "prep_time": 20},
    {"name": "Dal Makhani", "price": 13.99, "description": "Black lentils slow-cooked with cream and butter", "category": "Main Course", "is_vegetarian": True, "prep_time": 20},
    {"name": "Chana Masala", "price": 13.99, "description": "Chickpeas in tangy tomato sauce", "category": "Main Course", "is_vegetarian": True, "is_vegan": True, "prep_time": 20},
    {"name": "Vegetable Biryani", "price": 14.99, "description": "Fragrant basmati rice with mixed vegetables", "category": "Main Course", "is_vegetarian": True, "prep_time": 25},

    # Breads
    {"name": "Plain Naan", "price": 3.49, "description": "Traditional Indian bread baked in tandoor", "category": "Breads", "is_vegetarian": True, "prep_time": 8},
    {"name": "Garlic Naan", "price": 3.99, "description": "Naan topped with garlic and cilantro", "category": "Breads", "is_vegetarian": True, "prep_time": 8},
    {"name": "Butter Naan", "price": 3.99, "description": "Naan brushed with melted butter", "category": "Breads", "is_vegetarian": True, "prep_time": 8},
    {"name": "Peshwari Naan", "price": 4.99, "description": "Sweet naan stuffed with coconut and raisins", "category": "Breads", "is_vegetarian": True, "prep_time": 10},

    # Rice
    {"name": "Basmati Rice", "price": 4.99, "description": "Steamed aromatic basmati rice", "category": "Rice", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Jeera Rice", "price": 5.99, "description": "Basmati rice tempered with cumin seeds", "category": "Rice", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 8},

    # Beverages
    {"name": "Mango Lassi", "price": 4.99, "description": "Sweet yogurt smoothie with mango", "category": "Beverages", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Sweet Lassi", "price": 4.49, "description": "Traditional sweetened yogurt drink", "category": "Beverages", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Masala Chai", "price": 3.99, "description": "Spiced Indian tea with milk", "category": "Beverages", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 5},

    # Desserts
    {"name": "Gulab Jamun (2 pcs)", "price": 5.99, "description": "Deep-fried milk dumplings in rose syrup", "category": "Desserts", "is_vegetarian": True, "prep_time": 5},
    {"name": "Kheer", "price": 5.99, "description": "Traditional rice pudding with cardamom", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 5},
]

# Add Natraj menu items
added_count = 0
for item in natraj_menu:
    existing = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == natraj.id,
        VendorMenuItem.item_name == item["name"]
    ).first()

    if not existing:
        menu_item = VendorMenuItem(
            vendor_id=natraj.id,
            item_name=item["name"],
            description=item["description"],
            price=item["price"],
            category=item["category"],
            is_available=True,
            in_stock=True,
            is_vegetarian=item.get("is_vegetarian", False),
            is_vegan=item.get("is_vegan", False),
            is_gluten_free=item.get("is_gluten_free", False),
            is_spicy=item.get("is_spicy", False),
            spice_level=item.get("spice_level", 0),
            prep_time=item.get("prep_time", 15)
        )
        db.add(menu_item)
        added_count += 1
        print(f"  + {item['name']} - ${item['price']}")

db.commit()
print(f"\nAdded {added_count} items to Natraj Cuisine")


# ========== 2. TUTTO FRESCO (Italian Restaurant) ==========
print("\n" + "="*60)
print("SEEDING TUTTO FRESCO MENU")
print("="*60)

# Check if restaurant exists
tutto = db.query(Vendor).filter(Vendor.restaurant_name == "Tutto Fresco Kitchen & Bar").first()
if not tutto:
    tutto = Vendor(
        vendor_id=f"VND-{uuid.uuid4().hex[:8].upper()}",
        company_name="Tutto Fresco LLC",
        restaurant_name="Tutto Fresco Kitchen & Bar",
        cuisine_type="Italian",
        contact_name="Marco Rossi",
        contact_email="tuttofresco@eatfair.com",
        contact_phone="949-555-2345",
        street="22332 El Paseo",
        city="Rancho Santa Margarita",
        state="CA",
        zip_code="92688",
        country="USA",
        latitude=33.6405,
        longitude=-117.5931,
        onboarding_status=VendorStatus.APPROVED,
        tax_id="98-7654321",
        delivery_available=True,
        pickup_available=True,
        average_prep_time=30
    )
    db.add(tutto)
    db.commit()
    db.refresh(tutto)
    print(f"Created restaurant: {tutto.restaurant_name} (ID: {tutto.id})")
else:
    print(f"Restaurant exists: {tutto.restaurant_name} (ID: {tutto.id})")

# Tutto Fresco Menu Items
tutto_menu = [
    # Appetizers
    {"name": "Bruschetta", "price": 9.99, "description": "Toasted bread with tomatoes, garlic, and fresh basil", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "prep_time": 10},
    {"name": "Calamari Fritti", "price": 14.99, "description": "Crispy fried calamari with marinara sauce", "category": "Appetizers", "prep_time": 12},
    {"name": "Caprese Salad", "price": 12.99, "description": "Fresh mozzarella, tomatoes, basil, balsamic glaze", "category": "Appetizers", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 8},
    {"name": "Garlic Bread", "price": 6.99, "description": "Toasted Italian bread with garlic butter and herbs", "category": "Appetizers", "is_vegetarian": True, "prep_time": 8},

    # Pasta
    {"name": "Spaghetti Carbonara", "price": 17.99, "description": "Classic Roman pasta with pancetta, egg, and parmesan", "category": "Pasta", "prep_time": 18},
    {"name": "Fettuccine Alfredo", "price": 16.99, "description": "Creamy parmesan sauce with fettuccine", "category": "Pasta", "is_vegetarian": True, "prep_time": 15},
    {"name": "Penne Arrabbiata", "price": 15.99, "description": "Penne in spicy tomato sauce with garlic", "category": "Pasta", "is_vegetarian": True, "is_vegan": True, "is_spicy": True, "prep_time": 15},
    {"name": "Lasagna Bolognese", "price": 19.99, "description": "Layered pasta with meat sauce and béchamel", "category": "Pasta", "prep_time": 25},
    {"name": "Seafood Linguine", "price": 24.99, "description": "Linguine with shrimp, mussels, and clams in white wine sauce", "category": "Pasta", "prep_time": 22},

    # Pizza
    {"name": "Margherita Pizza", "price": 16.99, "description": "San Marzano tomatoes, fresh mozzarella, basil", "category": "Pizza", "is_vegetarian": True, "prep_time": 15},
    {"name": "Pepperoni Pizza", "price": 18.99, "description": "Classic pepperoni with mozzarella and tomato sauce", "category": "Pizza", "prep_time": 15},
    {"name": "Quattro Formaggi", "price": 19.99, "description": "Four cheese pizza - mozzarella, gorgonzola, parmesan, fontina", "category": "Pizza", "is_vegetarian": True, "prep_time": 15},
    {"name": "Vegetarian Supreme", "price": 18.99, "description": "Bell peppers, mushrooms, olives, onions, tomatoes", "category": "Pizza", "is_vegetarian": True, "prep_time": 15},
    {"name": "Meat Lovers", "price": 21.99, "description": "Pepperoni, sausage, bacon, ham", "category": "Pizza", "prep_time": 18},

    # Main Course
    {"name": "Chicken Parmigiana", "price": 22.99, "description": "Breaded chicken with marinara and melted mozzarella", "category": "Main Course", "prep_time": 25},
    {"name": "Veal Piccata", "price": 26.99, "description": "Pan-seared veal in lemon caper butter sauce", "category": "Main Course", "is_gluten_free": True, "prep_time": 25},
    {"name": "Grilled Salmon", "price": 24.99, "description": "Atlantic salmon with herbs and lemon", "category": "Main Course", "is_gluten_free": True, "prep_time": 20},
    {"name": "Eggplant Parmigiana", "price": 18.99, "description": "Layered eggplant with marinara and cheese", "category": "Main Course", "is_vegetarian": True, "prep_time": 25},

    # Risotto
    {"name": "Mushroom Risotto", "price": 18.99, "description": "Creamy arborio rice with wild mushrooms and parmesan", "category": "Risotto", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 25},
    {"name": "Seafood Risotto", "price": 26.99, "description": "Risotto with shrimp, scallops, and calamari", "category": "Risotto", "is_gluten_free": True, "prep_time": 28},

    # Desserts
    {"name": "Tiramisu", "price": 9.99, "description": "Classic Italian coffee-flavored dessert", "category": "Desserts", "is_vegetarian": True, "prep_time": 5},
    {"name": "Panna Cotta", "price": 8.99, "description": "Vanilla cream pudding with berry compote", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Gelato (3 scoops)", "price": 7.99, "description": "Authentic Italian ice cream - ask for flavors", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Cannoli", "price": 8.99, "description": "Crispy pastry filled with sweet ricotta cream", "category": "Desserts", "is_vegetarian": True, "prep_time": 5},

    # Beverages
    {"name": "Italian Soda", "price": 4.99, "description": "Sparkling water with your choice of flavor syrup", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},
    {"name": "Espresso", "price": 3.99, "description": "Traditional Italian espresso", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Cappuccino", "price": 5.99, "description": "Espresso with steamed milk and foam", "category": "Beverages", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 4},
]

# Add Tutto Fresco menu items
added_count = 0
for item in tutto_menu:
    existing = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == tutto.id,
        VendorMenuItem.item_name == item["name"]
    ).first()

    if not existing:
        menu_item = VendorMenuItem(
            vendor_id=tutto.id,
            item_name=item["name"],
            description=item["description"],
            price=item["price"],
            category=item["category"],
            is_available=True,
            in_stock=True,
            is_vegetarian=item.get("is_vegetarian", False),
            is_vegan=item.get("is_vegan", False),
            is_gluten_free=item.get("is_gluten_free", False),
            is_spicy=item.get("is_spicy", False),
            spice_level=item.get("spice_level", 0),
            prep_time=item.get("prep_time", 15)
        )
        db.add(menu_item)
        added_count += 1
        print(f"  + {item['name']} - ${item['price']}")

db.commit()
print(f"\nAdded {added_count} items to Tutto Fresco")


# ========== 3. SUSHI HOUSE (Japanese Restaurant) ==========
print("\n" + "="*60)
print("SEEDING SUSHI HOUSE MENU")
print("="*60)

sushi = db.query(Vendor).filter(Vendor.restaurant_name == "Sushi House").first()
if not sushi:
    sushi = Vendor(
        vendor_id=f"VND-{uuid.uuid4().hex[:8].upper()}",
        company_name="Sushi House Inc",
        restaurant_name="Sushi House",
        cuisine_type="Japanese",
        contact_name="Takeshi Yamamoto",
        contact_email="sushihouse@eatfair.com",
        contact_phone="949-555-3456",
        street="26612 Towne Centre Dr",
        city="Foothill Ranch",
        state="CA",
        zip_code="92610",
        country="USA",
        latitude=33.6737,
        longitude=-117.6609,
        onboarding_status=VendorStatus.APPROVED,
        tax_id="33-4567890",
        delivery_available=True,
        pickup_available=True,
        average_prep_time=20
    )
    db.add(sushi)
    db.commit()
    db.refresh(sushi)
    print(f"Created restaurant: {sushi.restaurant_name} (ID: {sushi.id})")
else:
    print(f"Restaurant exists: {sushi.restaurant_name} (ID: {sushi.id})")

sushi_menu = [
    # Appetizers
    {"name": "Edamame", "price": 5.99, "description": "Steamed soy beans with sea salt", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Gyoza (6 pcs)", "price": 8.99, "description": "Pan-fried pork dumplings", "category": "Appetizers", "prep_time": 10},
    {"name": "Vegetable Tempura", "price": 9.99, "description": "Assorted vegetables in light batter", "category": "Appetizers", "is_vegetarian": True, "prep_time": 12},
    {"name": "Miso Soup", "price": 3.99, "description": "Traditional soybean paste soup with tofu and seaweed", "category": "Appetizers", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Takoyaki (6 pcs)", "price": 8.99, "description": "Octopus balls with bonito flakes and takoyaki sauce", "category": "Appetizers", "prep_time": 10},

    # Sashimi
    {"name": "Salmon Sashimi (5 pcs)", "price": 14.99, "description": "Fresh sliced Atlantic salmon", "category": "Sashimi", "is_gluten_free": True, "prep_time": 8},
    {"name": "Tuna Sashimi (5 pcs)", "price": 16.99, "description": "Premium bluefin tuna slices", "category": "Sashimi", "is_gluten_free": True, "prep_time": 8},
    {"name": "Yellowtail Sashimi (5 pcs)", "price": 15.99, "description": "Fresh hamachi slices", "category": "Sashimi", "is_gluten_free": True, "prep_time": 8},
    {"name": "Sashimi Deluxe", "price": 29.99, "description": "Chef's selection of 15 pieces of assorted sashimi", "category": "Sashimi", "is_gluten_free": True, "prep_time": 12},

    # Nigiri
    {"name": "Salmon Nigiri (2 pcs)", "price": 6.99, "description": "Fresh salmon over seasoned rice", "category": "Nigiri", "is_gluten_free": True, "prep_time": 5},
    {"name": "Tuna Nigiri (2 pcs)", "price": 7.99, "description": "Premium tuna over seasoned rice", "category": "Nigiri", "is_gluten_free": True, "prep_time": 5},
    {"name": "Shrimp Nigiri (2 pcs)", "price": 5.99, "description": "Cooked shrimp over seasoned rice", "category": "Nigiri", "is_gluten_free": True, "prep_time": 5},
    {"name": "Unagi Nigiri (2 pcs)", "price": 8.99, "description": "Grilled freshwater eel over seasoned rice", "category": "Nigiri", "prep_time": 7},

    # Maki Rolls
    {"name": "California Roll", "price": 9.99, "description": "Crab, avocado, cucumber with sesame seeds", "category": "Maki Rolls", "prep_time": 10},
    {"name": "Spicy Tuna Roll", "price": 11.99, "description": "Spicy tuna, cucumber, topped with spicy mayo", "category": "Maki Rolls", "is_spicy": True, "prep_time": 10},
    {"name": "Rainbow Roll", "price": 16.99, "description": "California roll topped with assorted sashimi", "category": "Maki Rolls", "prep_time": 12},
    {"name": "Dragon Roll", "price": 17.99, "description": "Shrimp tempura, cucumber, topped with avocado and eel sauce", "category": "Maki Rolls", "prep_time": 12},
    {"name": "Vegetable Roll", "price": 8.99, "description": "Avocado, cucumber, carrot, asparagus", "category": "Maki Rolls", "is_vegetarian": True, "is_vegan": True, "prep_time": 10},
    {"name": "Spider Roll", "price": 15.99, "description": "Soft shell crab, cucumber, avocado, spicy mayo", "category": "Maki Rolls", "prep_time": 12},

    # Main Dishes
    {"name": "Chicken Teriyaki", "price": 16.99, "description": "Grilled chicken with teriyaki sauce, served with rice", "category": "Main Dishes", "prep_time": 18},
    {"name": "Salmon Teriyaki", "price": 19.99, "description": "Grilled salmon with teriyaki sauce, served with rice", "category": "Main Dishes", "prep_time": 18},
    {"name": "Beef Teriyaki", "price": 21.99, "description": "Grilled beef with teriyaki sauce, served with rice", "category": "Main Dishes", "prep_time": 20},
    {"name": "Tonkatsu", "price": 17.99, "description": "Breaded deep-fried pork cutlet with tonkatsu sauce", "category": "Main Dishes", "prep_time": 15},
    {"name": "Tempura Udon", "price": 15.99, "description": "Thick wheat noodles in dashi broth with shrimp tempura", "category": "Main Dishes", "prep_time": 15},

    # Ramen
    {"name": "Tonkotsu Ramen", "price": 15.99, "description": "Rich pork bone broth with chashu, egg, nori, green onions", "category": "Ramen", "prep_time": 15},
    {"name": "Miso Ramen", "price": 14.99, "description": "Miso-based broth with pork, corn, butter, bean sprouts", "category": "Ramen", "prep_time": 15},
    {"name": "Spicy Ramen", "price": 15.99, "description": "Spicy broth with pork, chili oil, egg, vegetables", "category": "Ramen", "is_spicy": True, "spice_level": 3, "prep_time": 15},
    {"name": "Vegetable Ramen", "price": 13.99, "description": "Veggie broth with tofu, mushrooms, bok choy, seaweed", "category": "Ramen", "is_vegetarian": True, "prep_time": 15},

    # Beverages
    {"name": "Japanese Green Tea", "price": 2.99, "description": "Hot green tea", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Ramune Soda", "price": 3.99, "description": "Japanese marble soda - original flavor", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},
    {"name": "Sake (Hot)", "price": 7.99, "description": "Traditional Japanese rice wine - 180ml", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},

    # Desserts
    {"name": "Mochi Ice Cream (3 pcs)", "price": 6.99, "description": "Ice cream wrapped in sweet rice dough", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Green Tea Ice Cream", "price": 5.99, "description": "Authentic matcha ice cream", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Dorayaki", "price": 5.99, "description": "Sweet red bean pancake sandwich", "category": "Desserts", "is_vegetarian": True, "prep_time": 5},
]

# Add Sushi House menu items
added_count = 0
for item in sushi_menu:
    existing = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == sushi.id,
        VendorMenuItem.item_name == item["name"]
    ).first()

    if not existing:
        menu_item = VendorMenuItem(
            vendor_id=sushi.id,
            item_name=item["name"],
            description=item["description"],
            price=item["price"],
            category=item["category"],
            is_available=True,
            in_stock=True,
            is_vegetarian=item.get("is_vegetarian", False),
            is_vegan=item.get("is_vegan", False),
            is_gluten_free=item.get("is_gluten_free", False),
            is_spicy=item.get("is_spicy", False),
            spice_level=item.get("spice_level", 0),
            prep_time=item.get("prep_time", 15)
        )
        db.add(menu_item)
        added_count += 1
        print(f"  + {item['name']} - ${item['price']}")

db.commit()
print(f"\nAdded {added_count} items to Sushi House")


# ========== 4. EL MEXICANO (Mexican Restaurant) ==========
print("\n" + "="*60)
print("SEEDING EL MEXICANO MENU")
print("="*60)

mexican = db.query(Vendor).filter(Vendor.restaurant_name == "El Mexicano").first()
if not mexican:
    mexican = Vendor(
        vendor_id=f"VND-{uuid.uuid4().hex[:8].upper()}",
        company_name="El Mexicano LLC",
        restaurant_name="El Mexicano",
        cuisine_type="Mexican",
        contact_name="Carlos Hernandez",
        contact_email="elmexicano@eatfair.com",
        contact_phone="949-555-4567",
        street="25691 Atlantic Ocean Dr",
        city="Lake Forest",
        state="CA",
        zip_code="92630",
        country="USA",
        latitude=33.6469,
        longitude=-117.6897,
        onboarding_status=VendorStatus.APPROVED,
        tax_id="44-5678901",
        delivery_available=True,
        pickup_available=True,
        average_prep_time=20
    )
    db.add(mexican)
    db.commit()
    db.refresh(mexican)
    print(f"Created restaurant: {mexican.restaurant_name} (ID: {mexican.id})")
else:
    print(f"Restaurant exists: {mexican.restaurant_name} (ID: {mexican.id})")

mexican_menu = [
    # Appetizers
    {"name": "Chips & Guacamole", "price": 8.99, "description": "Fresh tortilla chips with house-made guacamole", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 8},
    {"name": "Queso Fundido", "price": 10.99, "description": "Melted cheese with chorizo, served with tortillas", "category": "Appetizers", "prep_time": 10},
    {"name": "Nachos Supreme", "price": 13.99, "description": "Loaded nachos with beans, cheese, jalapeños, sour cream, guacamole", "category": "Appetizers", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 12},
    {"name": "Elote (Street Corn)", "price": 6.99, "description": "Grilled corn with mayo, cotija cheese, chili lime", "category": "Appetizers", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 8},
    {"name": "Taquitos (4 pcs)", "price": 9.99, "description": "Crispy rolled tacos with shredded chicken, served with salsa", "category": "Appetizers", "prep_time": 10},

    # Tacos
    {"name": "Carne Asada Tacos (3)", "price": 12.99, "description": "Grilled steak with onions, cilantro, salsa verde", "category": "Tacos", "is_gluten_free": True, "prep_time": 12},
    {"name": "Al Pastor Tacos (3)", "price": 11.99, "description": "Marinated pork with pineapple, onions, cilantro", "category": "Tacos", "is_gluten_free": True, "prep_time": 12},
    {"name": "Carnitas Tacos (3)", "price": 11.99, "description": "Slow-cooked pulled pork with onions and cilantro", "category": "Tacos", "is_gluten_free": True, "prep_time": 12},
    {"name": "Fish Tacos (3)", "price": 13.99, "description": "Beer-battered fish with cabbage slaw and chipotle crema", "category": "Tacos", "prep_time": 14},
    {"name": "Shrimp Tacos (3)", "price": 14.99, "description": "Grilled shrimp with avocado, pico de gallo", "category": "Tacos", "is_gluten_free": True, "prep_time": 14},
    {"name": "Veggie Tacos (3)", "price": 10.99, "description": "Grilled vegetables, black beans, guacamole", "category": "Tacos", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 12},

    # Burritos
    {"name": "California Burrito", "price": 13.99, "description": "Carne asada, french fries, cheese, guacamole, sour cream", "category": "Burritos", "prep_time": 15},
    {"name": "Chicken Burrito", "price": 12.99, "description": "Grilled chicken, rice, beans, cheese, pico de gallo", "category": "Burritos", "prep_time": 15},
    {"name": "Carnitas Burrito", "price": 12.99, "description": "Slow-cooked pork, rice, beans, cheese, salsa", "category": "Burritos", "prep_time": 15},
    {"name": "Bean & Cheese Burrito", "price": 9.99, "description": "Refried beans, cheese, rice, mild salsa", "category": "Burritos", "is_vegetarian": True, "prep_time": 12},
    {"name": "Burrito Bowl", "price": 13.99, "description": "Your choice of protein with rice, beans, lettuce, cheese, sour cream (no tortilla)", "category": "Burritos", "is_gluten_free": True, "prep_time": 12},

    # Enchiladas
    {"name": "Enchiladas Rojas (3)", "price": 14.99, "description": "Chicken enchiladas with red sauce, cheese, rice & beans", "category": "Enchiladas", "prep_time": 18},
    {"name": "Enchiladas Verdes (3)", "price": 14.99, "description": "Chicken enchiladas with tomatillo sauce, cheese, rice & beans", "category": "Enchiladas", "prep_time": 18},
    {"name": "Enchiladas Suizas (3)", "price": 15.99, "description": "Chicken enchiladas with creamy tomatillo sauce", "category": "Enchiladas", "prep_time": 18},
    {"name": "Cheese Enchiladas (3)", "price": 12.99, "description": "Cheese enchiladas with red sauce, rice & beans", "category": "Enchiladas", "is_vegetarian": True, "prep_time": 15},

    # Main Dishes
    {"name": "Fajitas (Chicken)", "price": 18.99, "description": "Sizzling chicken with peppers and onions, served with tortillas, rice & beans", "category": "Main Dishes", "is_gluten_free": True, "prep_time": 20},
    {"name": "Fajitas (Steak)", "price": 21.99, "description": "Sizzling steak with peppers and onions, served with tortillas, rice & beans", "category": "Main Dishes", "is_gluten_free": True, "prep_time": 20},
    {"name": "Chile Relleno", "price": 15.99, "description": "Stuffed poblano pepper with cheese, egg batter, ranchero sauce", "category": "Main Dishes", "is_vegetarian": True, "prep_time": 20},
    {"name": "Carne Asada Plate", "price": 19.99, "description": "Grilled steak with rice, beans, guacamole, tortillas", "category": "Main Dishes", "is_gluten_free": True, "prep_time": 18},
    {"name": "Pollo Asado", "price": 17.99, "description": "Grilled marinated chicken with rice, beans, tortillas", "category": "Main Dishes", "is_gluten_free": True, "prep_time": 18},

    # Quesadillas
    {"name": "Cheese Quesadilla", "price": 9.99, "description": "Large flour tortilla with melted cheese, served with sour cream and salsa", "category": "Quesadillas", "is_vegetarian": True, "prep_time": 10},
    {"name": "Chicken Quesadilla", "price": 12.99, "description": "Grilled chicken with cheese, peppers, onions", "category": "Quesadillas", "prep_time": 12},
    {"name": "Steak Quesadilla", "price": 14.99, "description": "Carne asada with cheese, peppers, onions", "category": "Quesadillas", "prep_time": 12},

    # Sides
    {"name": "Mexican Rice", "price": 3.99, "description": "Tomato-flavored rice", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Refried Beans", "price": 3.99, "description": "Traditional refried pinto beans", "category": "Sides", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Black Beans", "price": 3.99, "description": "Whole black beans", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Flour Tortillas (3)", "price": 2.99, "description": "Fresh flour tortillas", "category": "Sides", "is_vegetarian": True, "prep_time": 3},

    # Beverages
    {"name": "Horchata", "price": 4.99, "description": "Sweet rice milk with cinnamon", "category": "Beverages", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Jamaica", "price": 4.99, "description": "Hibiscus flower iced tea", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Mexican Coca-Cola", "price": 3.99, "description": "Made with real cane sugar", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},
    {"name": "Jarritos", "price": 2.99, "description": "Mexican fruit soda - ask for flavors", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},

    # Desserts
    {"name": "Churros (3)", "price": 6.99, "description": "Crispy fried dough with cinnamon sugar, chocolate dipping sauce", "category": "Desserts", "is_vegetarian": True, "prep_time": 8},
    {"name": "Flan", "price": 5.99, "description": "Traditional caramel custard", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Tres Leches Cake", "price": 7.99, "description": "Sponge cake soaked in three milks", "category": "Desserts", "is_vegetarian": True, "prep_time": 5},
    {"name": "Sopapillas (4)", "price": 5.99, "description": "Fried dough pillows with honey and powdered sugar", "category": "Desserts", "is_vegetarian": True, "prep_time": 8},
]

# Add El Mexicano menu items
added_count = 0
for item in mexican_menu:
    existing = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == mexican.id,
        VendorMenuItem.item_name == item["name"]
    ).first()

    if not existing:
        menu_item = VendorMenuItem(
            vendor_id=mexican.id,
            item_name=item["name"],
            description=item["description"],
            price=item["price"],
            category=item["category"],
            is_available=True,
            in_stock=True,
            is_vegetarian=item.get("is_vegetarian", False),
            is_vegan=item.get("is_vegan", False),
            is_gluten_free=item.get("is_gluten_free", False),
            is_spicy=item.get("is_spicy", False),
            spice_level=item.get("spice_level", 0),
            prep_time=item.get("prep_time", 15)
        )
        db.add(menu_item)
        added_count += 1
        print(f"  + {item['name']} - ${item['price']}")

db.commit()
print(f"\nAdded {added_count} items to El Mexicano")


# ========== 5. GOLDEN DRAGON (Chinese Restaurant) ==========
print("\n" + "="*60)
print("SEEDING GOLDEN DRAGON MENU")
print("="*60)

dragon = db.query(Vendor).filter(Vendor.restaurant_name == "Golden Dragon").first()
if not dragon:
    dragon = Vendor(
        vendor_id=f"VND-{uuid.uuid4().hex[:8].upper()}",
        company_name="Golden Dragon Inc",
        restaurant_name="Golden Dragon",
        cuisine_type="Chinese",
        contact_name="Wei Chen",
        contact_email="goldendragon@eatfair.com",
        contact_phone="949-555-5678",
        street="23647 Rockfield Blvd",
        city="Lake Forest",
        state="CA",
        zip_code="92630",
        country="USA",
        latitude=33.6466,
        longitude=-117.6762,
        onboarding_status=VendorStatus.APPROVED,
        tax_id="55-6789012",
        delivery_available=True,
        pickup_available=True,
        average_prep_time=25
    )
    db.add(dragon)
    db.commit()
    db.refresh(dragon)
    print(f"Created restaurant: {dragon.restaurant_name} (ID: {dragon.id})")
else:
    print(f"Restaurant exists: {dragon.restaurant_name} (ID: {dragon.id})")

chinese_menu = [
    # Appetizers
    {"name": "Egg Rolls (2)", "price": 5.99, "description": "Crispy fried rolls with vegetables and pork", "category": "Appetizers", "prep_time": 8},
    {"name": "Spring Rolls (3)", "price": 6.99, "description": "Fresh vegetable spring rolls", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "prep_time": 5},
    {"name": "Pot Stickers (6)", "price": 8.99, "description": "Pan-fried pork dumplings", "category": "Appetizers", "prep_time": 10},
    {"name": "Crab Rangoon (6)", "price": 7.99, "description": "Crispy wonton with cream cheese and crab", "category": "Appetizers", "prep_time": 10},
    {"name": "Hot & Sour Soup", "price": 5.99, "description": "Traditional spicy and tangy soup with tofu and egg", "category": "Appetizers", "is_spicy": True, "prep_time": 8},
    {"name": "Wonton Soup", "price": 6.99, "description": "Clear broth with pork wontons and vegetables", "category": "Appetizers", "prep_time": 8},

    # Chicken
    {"name": "General Tso's Chicken", "price": 14.99, "description": "Crispy chicken in sweet and spicy sauce", "category": "Chicken", "is_spicy": True, "prep_time": 18},
    {"name": "Orange Chicken", "price": 14.99, "description": "Crispy chicken in tangy orange glaze", "category": "Chicken", "prep_time": 18},
    {"name": "Kung Pao Chicken", "price": 14.99, "description": "Diced chicken with peanuts, vegetables in spicy sauce", "category": "Chicken", "is_spicy": True, "spice_level": 2, "is_gluten_free": True, "prep_time": 15},
    {"name": "Cashew Chicken", "price": 14.99, "description": "Diced chicken with cashews and vegetables", "category": "Chicken", "prep_time": 15},
    {"name": "Sweet & Sour Chicken", "price": 13.99, "description": "Battered chicken with pineapple in sweet and sour sauce", "category": "Chicken", "prep_time": 15},
    {"name": "Sesame Chicken", "price": 14.99, "description": "Crispy chicken in sweet sesame sauce", "category": "Chicken", "prep_time": 18},
    {"name": "Chicken with Broccoli", "price": 13.99, "description": "Sliced chicken with fresh broccoli in garlic sauce", "category": "Chicken", "is_gluten_free": True, "prep_time": 15},

    # Beef
    {"name": "Mongolian Beef", "price": 16.99, "description": "Sliced beef with green onions in sweet soy sauce", "category": "Beef", "prep_time": 15},
    {"name": "Beef with Broccoli", "price": 15.99, "description": "Tender beef with fresh broccoli", "category": "Beef", "is_gluten_free": True, "prep_time": 15},
    {"name": "Pepper Steak", "price": 15.99, "description": "Sliced beef with bell peppers and onions", "category": "Beef", "is_gluten_free": True, "prep_time": 15},
    {"name": "Szechuan Beef", "price": 16.99, "description": "Sliced beef in spicy Szechuan sauce", "category": "Beef", "is_spicy": True, "spice_level": 3, "prep_time": 15},

    # Seafood
    {"name": "Shrimp with Lobster Sauce", "price": 17.99, "description": "Shrimp in creamy egg white sauce", "category": "Seafood", "is_gluten_free": True, "prep_time": 15},
    {"name": "Kung Pao Shrimp", "price": 17.99, "description": "Shrimp with peanuts and vegetables in spicy sauce", "category": "Seafood", "is_spicy": True, "spice_level": 2, "is_gluten_free": True, "prep_time": 15},
    {"name": "Honey Walnut Shrimp", "price": 19.99, "description": "Crispy shrimp with candied walnuts in creamy sauce", "category": "Seafood", "prep_time": 18},
    {"name": "Salt & Pepper Calamari", "price": 16.99, "description": "Crispy fried calamari with jalapeños", "category": "Seafood", "is_spicy": True, "prep_time": 15},

    # Vegetarian
    {"name": "Ma Po Tofu", "price": 12.99, "description": "Soft tofu in spicy Szechuan bean sauce", "category": "Vegetarian", "is_vegetarian": True, "is_spicy": True, "spice_level": 3, "prep_time": 12},
    {"name": "Buddha's Delight", "price": 12.99, "description": "Mixed vegetables with tofu in light sauce", "category": "Vegetarian", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 12},
    {"name": "Garlic Eggplant", "price": 12.99, "description": "Eggplant in garlic sauce", "category": "Vegetarian", "is_vegetarian": True, "is_vegan": True, "prep_time": 12},
    {"name": "Vegetable Lo Mein", "price": 11.99, "description": "Soft noodles with mixed vegetables", "category": "Vegetarian", "is_vegetarian": True, "is_vegan": True, "prep_time": 12},

    # Noodles & Rice
    {"name": "Chicken Fried Rice", "price": 12.99, "description": "Wok-fried rice with chicken, eggs, vegetables", "category": "Noodles & Rice", "prep_time": 12},
    {"name": "Shrimp Fried Rice", "price": 14.99, "description": "Wok-fried rice with shrimp, eggs, vegetables", "category": "Noodles & Rice", "prep_time": 12},
    {"name": "Beef Chow Mein", "price": 13.99, "description": "Crispy noodles with beef and vegetables", "category": "Noodles & Rice", "prep_time": 15},
    {"name": "Chicken Lo Mein", "price": 12.99, "description": "Soft noodles with chicken and vegetables", "category": "Noodles & Rice", "prep_time": 12},
    {"name": "House Special Fried Rice", "price": 15.99, "description": "Fried rice with chicken, shrimp, pork, and vegetables", "category": "Noodles & Rice", "prep_time": 15},
    {"name": "Steamed White Rice", "price": 2.99, "description": "Plain steamed jasmine rice", "category": "Noodles & Rice", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},

    # Chef's Specials
    {"name": "Peking Duck (Half)", "price": 34.99, "description": "Roasted duck with pancakes, scallions, hoisin sauce", "category": "Chef's Specials", "prep_time": 35},
    {"name": "Crispy Orange Beef", "price": 17.99, "description": "Crispy beef in tangy orange sauce", "category": "Chef's Specials", "prep_time": 20},
    {"name": "Walnut Prawns", "price": 21.99, "description": "Large prawns with candied walnuts in creamy sauce", "category": "Chef's Specials", "prep_time": 18},

    # Beverages
    {"name": "Chinese Tea (Pot)", "price": 3.99, "description": "Traditional Chinese tea", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Lychee Juice", "price": 3.99, "description": "Sweet lychee fruit juice", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},
]

# Add Golden Dragon menu items
added_count = 0
for item in chinese_menu:
    existing = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == dragon.id,
        VendorMenuItem.item_name == item["name"]
    ).first()

    if not existing:
        menu_item = VendorMenuItem(
            vendor_id=dragon.id,
            item_name=item["name"],
            description=item["description"],
            price=item["price"],
            category=item["category"],
            is_available=True,
            in_stock=True,
            is_vegetarian=item.get("is_vegetarian", False),
            is_vegan=item.get("is_vegan", False),
            is_gluten_free=item.get("is_gluten_free", False),
            is_spicy=item.get("is_spicy", False),
            spice_level=item.get("spice_level", 0),
            prep_time=item.get("prep_time", 15)
        )
        db.add(menu_item)
        added_count += 1
        print(f"  + {item['name']} - ${item['price']}")

db.commit()
print(f"\nAdded {added_count} items to Golden Dragon")


# ========== 6. MEDITERRANEAN GRILL ==========
print("\n" + "="*60)
print("SEEDING MEDITERRANEAN GRILL MENU")
print("="*60)

mediterranean = db.query(Vendor).filter(Vendor.restaurant_name == "Mediterranean Grill").first()
if not mediterranean:
    mediterranean = Vendor(
        vendor_id=f"VND-{uuid.uuid4().hex[:8].upper()}",
        company_name="Mediterranean Grill LLC",
        restaurant_name="Mediterranean Grill",
        cuisine_type="Mediterranean",
        contact_name="Omar Hassan",
        contact_email="medgrill@eatfair.com",
        contact_phone="949-555-6789",
        street="24012 El Toro Rd",
        city="Laguna Woods",
        state="CA",
        zip_code="92637",
        country="USA",
        latitude=33.6098,
        longitude=-117.7278,
        onboarding_status=VendorStatus.APPROVED,
        tax_id="66-7890123",
        delivery_available=True,
        pickup_available=True,
        average_prep_time=20
    )
    db.add(mediterranean)
    db.commit()
    db.refresh(mediterranean)
    print(f"Created restaurant: {mediterranean.restaurant_name} (ID: {mediterranean.id})")
else:
    print(f"Restaurant exists: {mediterranean.restaurant_name} (ID: {mediterranean.id})")

med_menu = [
    # Appetizers
    {"name": "Hummus", "price": 7.99, "description": "Creamy chickpea dip with tahini, served with pita bread", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "prep_time": 5},
    {"name": "Baba Ganoush", "price": 8.99, "description": "Smoky roasted eggplant dip, served with pita", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "prep_time": 5},
    {"name": "Falafel (6 pcs)", "price": 8.99, "description": "Crispy chickpea fritters with tahini sauce", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "prep_time": 10},
    {"name": "Stuffed Grape Leaves (6)", "price": 7.99, "description": "Grape leaves stuffed with rice and herbs", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Mezze Platter", "price": 16.99, "description": "Hummus, baba ganoush, falafel, dolmas, with pita", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "prep_time": 10},
    {"name": "Spanakopita (2 pcs)", "price": 7.99, "description": "Spinach and feta in phyllo pastry", "category": "Appetizers", "is_vegetarian": True, "prep_time": 10},

    # Salads
    {"name": "Greek Salad", "price": 11.99, "description": "Tomatoes, cucumbers, red onion, olives, feta, olive oil", "category": "Salads", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 8},
    {"name": "Fattoush Salad", "price": 10.99, "description": "Mixed greens, tomatoes, cucumbers, pita chips, sumac", "category": "Salads", "is_vegetarian": True, "is_vegan": True, "prep_time": 8},
    {"name": "Tabbouleh", "price": 9.99, "description": "Parsley, bulgur, tomatoes, mint, lemon-olive oil dressing", "category": "Salads", "is_vegetarian": True, "is_vegan": True, "prep_time": 8},

    # Kebabs & Grills
    {"name": "Chicken Shawarma Plate", "price": 16.99, "description": "Marinated chicken, rice, salad, hummus, pita", "category": "Kebabs & Grills", "prep_time": 18},
    {"name": "Beef Shawarma Plate", "price": 17.99, "description": "Marinated beef, rice, salad, hummus, pita", "category": "Kebabs & Grills", "prep_time": 18},
    {"name": "Lamb Kebab Plate", "price": 19.99, "description": "Grilled lamb skewers with rice, salad, pita", "category": "Kebabs & Grills", "is_gluten_free": True, "prep_time": 20},
    {"name": "Chicken Kebab Plate", "price": 16.99, "description": "Grilled chicken skewers with rice, salad, pita", "category": "Kebabs & Grills", "is_gluten_free": True, "prep_time": 18},
    {"name": "Mixed Grill Platter", "price": 26.99, "description": "Chicken, lamb, and kofta kebabs with rice and salad", "category": "Kebabs & Grills", "is_gluten_free": True, "prep_time": 25},
    {"name": "Kofta Kebab", "price": 17.99, "description": "Grilled seasoned ground lamb/beef, rice, salad", "category": "Kebabs & Grills", "is_gluten_free": True, "prep_time": 18},

    # Wraps
    {"name": "Chicken Shawarma Wrap", "price": 12.99, "description": "Chicken shawarma, pickles, garlic sauce in pita", "category": "Wraps", "prep_time": 12},
    {"name": "Beef Shawarma Wrap", "price": 13.99, "description": "Beef shawarma, tahini, vegetables in pita", "category": "Wraps", "prep_time": 12},
    {"name": "Falafel Wrap", "price": 10.99, "description": "Falafel, hummus, salad, tahini in pita", "category": "Wraps", "is_vegetarian": True, "is_vegan": True, "prep_time": 10},
    {"name": "Lamb Gyro", "price": 14.99, "description": "Lamb, tomato, onion, tzatziki in warm pita", "category": "Wraps", "prep_time": 12},

    # Vegetarian Entrees
    {"name": "Moussaka", "price": 15.99, "description": "Layered eggplant, potato, ground meat, béchamel", "category": "Vegetarian Entrees", "is_vegetarian": True, "prep_time": 25},
    {"name": "Vegetable Tagine", "price": 14.99, "description": "Moroccan vegetable stew with couscous", "category": "Vegetarian Entrees", "is_vegetarian": True, "is_vegan": True, "prep_time": 20},
    {"name": "Stuffed Bell Peppers (2)", "price": 14.99, "description": "Bell peppers stuffed with rice, herbs, tomato sauce", "category": "Vegetarian Entrees", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 20},

    # Sides
    {"name": "Basmati Rice", "price": 3.99, "description": "Fluffy basmati rice", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Pita Bread (2)", "price": 2.99, "description": "Warm pita bread", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "prep_time": 3},
    {"name": "French Fries", "price": 4.99, "description": "Crispy golden fries", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 8},
    {"name": "Garlic Sauce", "price": 1.99, "description": "House-made garlic sauce", "category": "Sides", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 2},

    # Beverages
    {"name": "Turkish Coffee", "price": 4.99, "description": "Traditional unfiltered Turkish coffee", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Mint Tea", "price": 3.99, "description": "Fresh mint herbal tea", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    {"name": "Ayran", "price": 3.99, "description": "Salted yogurt drink", "category": "Beverages", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
    {"name": "Fresh Lemonade", "price": 3.99, "description": "Freshly squeezed lemonade with mint", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},

    # Desserts
    {"name": "Baklava (2 pcs)", "price": 5.99, "description": "Layered phyllo with pistachios and honey syrup", "category": "Desserts", "is_vegetarian": True, "prep_time": 3},
    {"name": "Kunafa", "price": 7.99, "description": "Shredded phyllo with sweet cheese and rose syrup", "category": "Desserts", "is_vegetarian": True, "prep_time": 5},
    {"name": "Rice Pudding", "price": 5.99, "description": "Creamy rice pudding with cinnamon", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
]

# Add Mediterranean Grill menu items
added_count = 0
for item in med_menu:
    existing = db.query(VendorMenuItem).filter(
        VendorMenuItem.vendor_id == mediterranean.id,
        VendorMenuItem.item_name == item["name"]
    ).first()

    if not existing:
        menu_item = VendorMenuItem(
            vendor_id=mediterranean.id,
            item_name=item["name"],
            description=item["description"],
            price=item["price"],
            category=item["category"],
            is_available=True,
            in_stock=True,
            is_vegetarian=item.get("is_vegetarian", False),
            is_vegan=item.get("is_vegan", False),
            is_gluten_free=item.get("is_gluten_free", False),
            is_spicy=item.get("is_spicy", False),
            spice_level=item.get("spice_level", 0),
            prep_time=item.get("prep_time", 15)
        )
        db.add(menu_item)
        added_count += 1
        print(f"  + {item['name']} - ${item['price']}")

db.commit()
print(f"\nAdded {added_count} items to Mediterranean Grill")


# ========== 7. ALOHA POKE BOWL (Hawaiian/Poke) ==========
print("\n" + "="*60)
print("SEEDING ALOHA POKE BOWL MENU")
print("="*60)

aloha = db.query(Vendor).filter(Vendor.id == 7).first()
if aloha:
    print(f"Restaurant exists: {aloha.restaurant_name} (ID: {aloha.id})")

    aloha_menu = [
        # Signature Poke Bowls
        {"name": "Classic Ahi Tuna Bowl", "price": 14.99, "description": "Fresh ahi tuna, white rice, seaweed salad, cucumber, edamame, sesame seeds, ponzu sauce", "category": "Signature Bowls", "is_gluten_free": True, "prep_time": 8},
        {"name": "Spicy Salmon Bowl", "price": 15.99, "description": "Spicy salmon, brown rice, mango, avocado, jalapeño, crispy onions, sriracha aioli", "category": "Signature Bowls", "is_spicy": True, "spice_level": 2, "prep_time": 8},
        {"name": "Hawaiian Classic", "price": 16.99, "description": "Ahi tuna, salmon, white rice, pineapple, macadamia nuts, green onion, traditional shoyu", "category": "Signature Bowls", "is_gluten_free": True, "prep_time": 10},
        {"name": "Tofu Paradise", "price": 13.99, "description": "Marinated tofu, quinoa, edamame, cucumber, carrot, avocado, ginger dressing", "category": "Signature Bowls", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 8},
        {"name": "Shrimp Lover", "price": 16.99, "description": "Grilled shrimp, sushi rice, mango, avocado, crispy garlic, wasabi mayo", "category": "Signature Bowls", "is_gluten_free": True, "prep_time": 10},
        {"name": "Ocean Trio", "price": 18.99, "description": "Ahi tuna, salmon, shrimp, white rice, seaweed salad, cucumber, tobiko, house special sauce", "category": "Signature Bowls", "is_gluten_free": True, "prep_time": 12},

        # Build Your Own
        {"name": "Build Your Own Bowl (Regular)", "price": 13.99, "description": "Choose your base, protein, 4 toppings, and sauce", "category": "Build Your Own", "prep_time": 8},
        {"name": "Build Your Own Bowl (Large)", "price": 16.99, "description": "Choose your base, double protein, 6 toppings, and sauce", "category": "Build Your Own", "prep_time": 10},

        # Proteins (Add-ons)
        {"name": "Extra Ahi Tuna", "price": 4.99, "description": "Additional portion of fresh ahi tuna", "category": "Add-Ons", "is_gluten_free": True, "prep_time": 2},
        {"name": "Extra Salmon", "price": 4.99, "description": "Additional portion of fresh salmon", "category": "Add-Ons", "is_gluten_free": True, "prep_time": 2},
        {"name": "Extra Shrimp", "price": 4.99, "description": "Additional grilled shrimp", "category": "Add-Ons", "is_gluten_free": True, "prep_time": 3},
        {"name": "Extra Tofu", "price": 2.99, "description": "Additional marinated tofu", "category": "Add-Ons", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},

        # Appetizers
        {"name": "Edamame", "price": 5.99, "description": "Steamed soybeans with sea salt", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
        {"name": "Seaweed Salad", "price": 6.99, "description": "Marinated seaweed with sesame", "category": "Appetizers", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Miso Soup", "price": 3.99, "description": "Traditional miso soup with tofu and seaweed", "category": "Appetizers", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 5},
        {"name": "Crispy Wonton Chips", "price": 4.99, "description": "Fried wonton chips with sweet chili sauce", "category": "Appetizers", "is_vegetarian": True, "prep_time": 5},
        {"name": "Ahi Tuna Nachos", "price": 13.99, "description": "Wonton chips topped with ahi tuna, avocado, jalapeño, sriracha aioli", "category": "Appetizers", "is_spicy": True, "prep_time": 10},

        # Sides
        {"name": "White Rice", "price": 2.99, "description": "Steamed white sushi rice", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Brown Rice", "price": 2.99, "description": "Steamed brown rice", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Quinoa", "price": 3.49, "description": "Fluffy quinoa", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Mixed Greens", "price": 2.99, "description": "Fresh mixed salad greens", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},
        {"name": "Extra Avocado", "price": 2.49, "description": "Fresh sliced avocado", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},

        # Beverages
        {"name": "Coconut Water", "price": 3.99, "description": "Fresh coconut water", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 1},
        {"name": "Green Tea", "price": 2.99, "description": "Iced or hot green tea", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Mango Lemonade", "price": 4.49, "description": "Fresh mango lemonade", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Passion Fruit Iced Tea", "price": 3.99, "description": "Tropical passion fruit iced tea", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Sparkling Water", "price": 2.49, "description": "Chilled sparkling water", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 1},

        # Desserts
        {"name": "Mochi Ice Cream (3 pcs)", "price": 5.99, "description": "Japanese ice cream wrapped in sweet rice dough", "category": "Desserts", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 2},
        {"name": "Hawaiian Shave Ice", "price": 4.99, "description": "Shaved ice with tropical fruit syrups", "category": "Desserts", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},
    ]

    added_count = 0
    for item in aloha_menu:
        existing = db.query(VendorMenuItem).filter(
            VendorMenuItem.vendor_id == aloha.id,
            VendorMenuItem.item_name == item["name"]
        ).first()

        if not existing:
            menu_item = VendorMenuItem(
                vendor_id=aloha.id,
                item_name=item["name"],
                description=item["description"],
                price=item["price"],
                category=item["category"],
                is_available=True,
                in_stock=True,
                is_vegetarian=item.get("is_vegetarian", False),
                is_vegan=item.get("is_vegan", False),
                is_gluten_free=item.get("is_gluten_free", False),
                is_spicy=item.get("is_spicy", False),
                spice_level=item.get("spice_level", 0),
                prep_time=item.get("prep_time", 10)
            )
            db.add(menu_item)
            added_count += 1
            print(f"  + {item['name']} - ${item['price']}")

    db.commit()
    print(f"\nAdded {added_count} items to Aloha Poke Bowl")
else:
    print("Aloha Poke Bowl not found in database")


# ========== 8. SPORTS GRILL & BAR (American) ==========
print("\n" + "="*60)
print("SEEDING SPORTS GRILL & BAR MENU")
print("="*60)

sports = db.query(Vendor).filter(Vendor.id == 8).first()
if sports:
    print(f"Restaurant exists: {sports.restaurant_name} (ID: {sports.id})")

    sports_menu = [
        # Appetizers
        {"name": "Loaded Nachos", "price": 13.99, "description": "Tortilla chips with cheese, jalapeños, sour cream, guacamole, pico de gallo", "category": "Appetizers", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 12},
        {"name": "Buffalo Wings (12 pcs)", "price": 14.99, "description": "Classic buffalo wings with celery and blue cheese dip", "category": "Appetizers", "is_spicy": True, "spice_level": 2, "is_gluten_free": True, "prep_time": 15},
        {"name": "Mozzarella Sticks", "price": 9.99, "description": "Breaded mozzarella with marinara sauce", "category": "Appetizers", "is_vegetarian": True, "prep_time": 10},
        {"name": "Spinach Artichoke Dip", "price": 11.99, "description": "Creamy spinach and artichoke dip with tortilla chips", "category": "Appetizers", "is_vegetarian": True, "prep_time": 12},
        {"name": "Onion Rings", "price": 8.99, "description": "Beer-battered onion rings with chipotle aioli", "category": "Appetizers", "is_vegetarian": True, "prep_time": 10},
        {"name": "Loaded Potato Skins", "price": 10.99, "description": "Potato skins with bacon, cheese, sour cream, chives", "category": "Appetizers", "is_gluten_free": True, "prep_time": 12},
        {"name": "Fried Pickles", "price": 8.99, "description": "Crispy fried pickle spears with ranch dip", "category": "Appetizers", "is_vegetarian": True, "prep_time": 10},
        {"name": "Boneless Wings (12 pcs)", "price": 13.99, "description": "Crispy boneless wings, choice of sauce: Buffalo, BBQ, or Teriyaki", "category": "Appetizers", "prep_time": 15},

        # Burgers
        {"name": "Classic Cheeseburger", "price": 13.99, "description": "1/2 lb beef patty, American cheese, lettuce, tomato, onion, pickles", "category": "Burgers", "prep_time": 15},
        {"name": "Bacon BBQ Burger", "price": 15.99, "description": "1/2 lb beef, bacon, cheddar, BBQ sauce, crispy onions", "category": "Burgers", "prep_time": 15},
        {"name": "Mushroom Swiss Burger", "price": 15.99, "description": "1/2 lb beef, sautéed mushrooms, Swiss cheese, garlic aioli", "category": "Burgers", "prep_time": 15},
        {"name": "Jalapeño Popper Burger", "price": 16.99, "description": "1/2 lb beef, cream cheese, jalapeños, bacon, pepper jack", "category": "Burgers", "is_spicy": True, "spice_level": 2, "prep_time": 15},
        {"name": "Beyond Burger", "price": 15.99, "description": "Plant-based patty, lettuce, tomato, onion, vegan aioli", "category": "Burgers", "is_vegetarian": True, "is_vegan": True, "prep_time": 15},
        {"name": "Double Smash Burger", "price": 17.99, "description": "Two smashed beef patties, double American cheese, special sauce", "category": "Burgers", "prep_time": 15},

        # Sandwiches
        {"name": "Philly Cheesesteak", "price": 14.99, "description": "Shaved ribeye, peppers, onions, provolone on hoagie roll", "category": "Sandwiches", "prep_time": 15},
        {"name": "Crispy Chicken Sandwich", "price": 13.99, "description": "Breaded chicken breast, pickles, coleslaw, spicy mayo", "category": "Sandwiches", "prep_time": 15},
        {"name": "Grilled Chicken Club", "price": 13.99, "description": "Grilled chicken, bacon, lettuce, tomato, avocado, mayo", "category": "Sandwiches", "prep_time": 15},
        {"name": "BBQ Pulled Pork", "price": 13.99, "description": "Slow-smoked pulled pork, coleslaw, pickles, BBQ sauce", "category": "Sandwiches", "prep_time": 12},
        {"name": "Fish & Chips Sandwich", "price": 14.99, "description": "Beer-battered cod, tartar sauce, lettuce on brioche bun", "category": "Sandwiches", "prep_time": 15},

        # Main Entrees
        {"name": "Baby Back Ribs (Full Rack)", "price": 26.99, "description": "Slow-smoked ribs with BBQ sauce, coleslaw, fries", "category": "Main Entrees", "is_gluten_free": True, "prep_time": 20},
        {"name": "Baby Back Ribs (Half Rack)", "price": 18.99, "description": "Half rack of slow-smoked ribs with BBQ sauce, coleslaw, fries", "category": "Main Entrees", "is_gluten_free": True, "prep_time": 18},
        {"name": "Grilled Ribeye Steak", "price": 29.99, "description": "12oz ribeye, garlic butter, mashed potatoes, vegetables", "category": "Main Entrees", "is_gluten_free": True, "prep_time": 25},
        {"name": "Fish & Chips", "price": 16.99, "description": "Beer-battered cod, fries, coleslaw, tartar sauce", "category": "Main Entrees", "prep_time": 18},
        {"name": "Chicken Tenders Platter", "price": 14.99, "description": "Hand-breaded chicken tenders, fries, honey mustard", "category": "Main Entrees", "prep_time": 15},
        {"name": "Grilled Salmon", "price": 22.99, "description": "Atlantic salmon, lemon herb butter, rice, vegetables", "category": "Main Entrees", "is_gluten_free": True, "prep_time": 20},

        # Pizza
        {"name": "Pepperoni Pizza (12\")", "price": 15.99, "description": "Classic pepperoni with mozzarella and tomato sauce", "category": "Pizza", "prep_time": 18},
        {"name": "BBQ Chicken Pizza (12\")", "price": 17.99, "description": "Grilled chicken, BBQ sauce, red onion, cilantro", "category": "Pizza", "prep_time": 18},
        {"name": "Meat Lovers Pizza (12\")", "price": 18.99, "description": "Pepperoni, sausage, bacon, ham, mozzarella", "category": "Pizza", "prep_time": 20},
        {"name": "Veggie Pizza (12\")", "price": 16.99, "description": "Mushrooms, peppers, onions, olives, tomatoes, mozzarella", "category": "Pizza", "is_vegetarian": True, "prep_time": 18},

        # Salads
        {"name": "Caesar Salad", "price": 10.99, "description": "Romaine, parmesan, croutons, Caesar dressing", "category": "Salads", "is_vegetarian": True, "prep_time": 8},
        {"name": "Grilled Chicken Caesar", "price": 14.99, "description": "Caesar salad topped with grilled chicken breast", "category": "Salads", "prep_time": 12},
        {"name": "Cobb Salad", "price": 15.99, "description": "Mixed greens, chicken, bacon, egg, avocado, blue cheese, tomato", "category": "Salads", "is_gluten_free": True, "prep_time": 12},
        {"name": "Buffalo Chicken Salad", "price": 14.99, "description": "Mixed greens, crispy buffalo chicken, blue cheese, tomato, onion", "category": "Salads", "is_spicy": True, "prep_time": 12},

        # Sides
        {"name": "French Fries", "price": 4.99, "description": "Crispy golden fries", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 8},
        {"name": "Sweet Potato Fries", "price": 5.99, "description": "Crispy sweet potato fries with chipotle aioli", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 8},
        {"name": "Loaded Fries", "price": 8.99, "description": "Fries with cheese, bacon, sour cream, chives", "category": "Sides", "is_gluten_free": True, "prep_time": 10},
        {"name": "Coleslaw", "price": 3.99, "description": "Creamy house-made coleslaw", "category": "Sides", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Mac & Cheese", "price": 6.99, "description": "Creamy three-cheese macaroni", "category": "Sides", "is_vegetarian": True, "prep_time": 8},
        {"name": "Side Salad", "price": 4.99, "description": "Mixed greens with choice of dressing", "category": "Sides", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 5},

        # Beverages
        {"name": "Soft Drink", "price": 2.99, "description": "Coke, Diet Coke, Sprite, or Dr. Pepper", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},
        {"name": "Iced Tea", "price": 2.99, "description": "Fresh brewed iced tea (sweetened or unsweetened)", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},
        {"name": "Lemonade", "price": 3.49, "description": "Fresh-squeezed lemonade", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 3},
        {"name": "Milkshake", "price": 6.99, "description": "Hand-spun shake - Chocolate, Vanilla, or Strawberry", "category": "Beverages", "is_vegetarian": True, "is_gluten_free": True, "prep_time": 5},
        {"name": "Draft Beer (Pint)", "price": 6.99, "description": "Selection of local and domestic beers on tap", "category": "Beverages", "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "prep_time": 2},

        # Desserts
        {"name": "Brownie Sundae", "price": 8.99, "description": "Warm brownie with vanilla ice cream, chocolate sauce, whipped cream", "category": "Desserts", "is_vegetarian": True, "prep_time": 8},
        {"name": "Cheesecake", "price": 7.99, "description": "New York style cheesecake with strawberry topping", "category": "Desserts", "is_vegetarian": True, "prep_time": 5},
        {"name": "Apple Pie à la Mode", "price": 7.99, "description": "Warm apple pie with vanilla ice cream", "category": "Desserts", "is_vegetarian": True, "prep_time": 8},
        {"name": "Fried Oreos", "price": 6.99, "description": "Deep-fried Oreos with powdered sugar and chocolate drizzle", "category": "Desserts", "is_vegetarian": True, "prep_time": 8},
    ]

    added_count = 0
    for item in sports_menu:
        existing = db.query(VendorMenuItem).filter(
            VendorMenuItem.vendor_id == sports.id,
            VendorMenuItem.item_name == item["name"]
        ).first()

        if not existing:
            menu_item = VendorMenuItem(
                vendor_id=sports.id,
                item_name=item["name"],
                description=item["description"],
                price=item["price"],
                category=item["category"],
                is_available=True,
                in_stock=True,
                is_vegetarian=item.get("is_vegetarian", False),
                is_vegan=item.get("is_vegan", False),
                is_gluten_free=item.get("is_gluten_free", False),
                is_spicy=item.get("is_spicy", False),
                spice_level=item.get("spice_level", 0),
                prep_time=item.get("prep_time", 15)
            )
            db.add(menu_item)
            added_count += 1
            print(f"  + {item['name']} - ${item['price']}")

    db.commit()
    print(f"\nAdded {added_count} items to Sports Grill & Bar")
else:
    print("Sports Grill & Bar not found in database")


# ========== SUMMARY ==========
print("\n" + "="*60)
print("MENU SEEDING COMPLETE")
print("="*60)

natraj_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == natraj.id).count()
tutto_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == tutto.id).count()
sushi_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == sushi.id).count()
mexican_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == mexican.id).count()
dragon_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == dragon.id).count()
med_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == mediterranean.id).count()
aloha_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == 7).count() if aloha else 0
sports_items = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == 8).count() if sports else 0

print(f"\n{'Restaurant':<30} {'ID':<5} {'Items':>6}")
print("-" * 45)
print(f"{'Aloha Poke Bowl (Hawaiian)':<30} {'7':<5} {aloha_items:>6}")
print(f"{'Sports Grill & Bar (American)':<30} {'8':<5} {sports_items:>6}")
print(f"{'Natraj Cuisine (Indian)':<30} {natraj.id:<5} {natraj_items:>6}")
print(f"{'Tutto Fresco (Italian)':<30} {tutto.id:<5} {tutto_items:>6}")
print(f"{'Sushi House (Japanese)':<30} {sushi.id:<5} {sushi_items:>6}")
print(f"{'El Mexicano (Mexican)':<30} {mexican.id:<5} {mexican_items:>6}")
print(f"{'Golden Dragon (Chinese)':<30} {dragon.id:<5} {dragon_items:>6}")
print(f"{'Mediterranean Grill':<30} {mediterranean.id:<5} {med_items:>6}")
print("-" * 45)
total = aloha_items + sports_items + natraj_items + tutto_items + sushi_items + mexican_items + dragon_items + med_items
print(f"{'TOTAL':<30} {'':<5} {total:>6}")

print("\n" + "="*60)
print("DEMO ACCOUNTS")
print("="*60)
print("Business Login: demobusiness@dollor.ai / DollorBiz2024!")
print("Customer Login: democustomer@dollor.ai / DollorCustomer2024!")

print("\n" + "="*60)
print("TO VIEW IN UI:")
print("="*60)
print("1. Start backend: cd backend && python -m uvicorn main_new:app --reload --port 3000")
print("2. Start frontend: cd frontend && npm run dev")
print("3. Login and browse restaurants to see menus")
print("="*60)

db.close()
