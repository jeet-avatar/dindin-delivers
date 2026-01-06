"""
EatFair P2P - Stock Images for Menu Items
AI-powered image assignment based on dish names

Uses Unsplash for high-quality royalty-free food images
"""

# Stock image URLs from Unsplash (food category - royalty free)
# Each category has multiple images for variety

STOCK_IMAGES = {
    # Indian Cuisine
    "curry": [
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",  # Curry
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",  # Indian curry
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400",  # Butter chicken
    ],
    "biryani": [
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400",  # Biryani
        "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400",  # Rice dish
    ],
    "naan": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Naan bread
        "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400",  # Indian bread
    ],
    "tandoori": [
        "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400",  # Tandoori chicken
        "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400",  # Grilled meat
    ],
    "samosa": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Samosa
    ],
    "paneer": [
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400",  # Paneer dish
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400",  # Cheese dish
    ],
    "dal": [
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400",  # Dal
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",  # Lentil soup
    ],
    "tikka": [
        "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400",  # Tikka
        "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400",  # Grilled
    ],
    "masala": [
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",  # Masala dish
    ],
    "korma": [
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",  # Korma
    ],
    "vindaloo": [
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",  # Spicy curry
    ],

    # Rice dishes
    "rice": [
        "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400",  # Rice
        "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=400",  # Fried rice
    ],
    "pulao": [
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400",  # Pulao
    ],

    # Appetizers
    "soup": [
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400",  # Soup
        "https://images.unsplash.com/photo-1588566565463-180a5b2090d2?w=400",  # Tomato soup
    ],
    "appetizer": [
        "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400",  # Appetizer plate
        "https://images.unsplash.com/photo-1626645738196-c2a72c7bf090?w=400",  # Starter
    ],
    "pakora": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Pakora
    ],
    "bhaji": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Bhaji
    ],

    # Meat dishes
    "chicken": [
        "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400",  # Chicken
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400",  # Grilled chicken
        "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400",  # Chicken curry
    ],
    "lamb": [
        "https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=400",  # Lamb
        "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400",  # Lamb curry
    ],
    "mutton": [
        "https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=400",  # Mutton
    ],
    "goat": [
        "https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=400",  # Goat meat
    ],
    "fish": [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",  # Fish
        "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400",  # Grilled fish
    ],
    "shrimp": [
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400",  # Shrimp
        "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400",  # Prawns
    ],
    "prawn": [
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400",  # Prawns
    ],

    # Vegetarian
    "vegetable": [
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",  # Vegetables
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",  # Veggie dish
    ],
    "aloo": [
        "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",  # Potato
    ],
    "potato": [
        "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400",  # Potato dish
    ],
    "spinach": [
        "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",  # Spinach
    ],
    "saag": [
        "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",  # Saag
    ],
    "palak": [
        "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",  # Palak
    ],
    "chana": [
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",  # Chickpeas
    ],
    "chickpea": [
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",  # Chickpeas
    ],

    # Desserts
    "dessert": [
        "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",  # Dessert
        "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",  # Sweet
    ],
    "kheer": [
        "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",  # Rice pudding
    ],
    "gulab": [
        "https://images.unsplash.com/photo-1666190094568-a7d8e0e26e1e?w=400",  # Gulab jamun
    ],
    "kulfi": [
        "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",  # Ice cream
    ],
    "rasmalai": [
        "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400",  # Milk dessert
    ],

    # Beverages
    "drink": [
        "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400",  # Beverage
    ],
    "lassi": [
        "https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=400",  # Lassi
    ],
    "chai": [
        "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400",  # Chai tea
    ],
    "tea": [
        "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400",  # Tea
    ],
    "coffee": [
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",  # Coffee
    ],
    "mango": [
        "https://images.unsplash.com/photo-1546173159-315724a31696?w=400",  # Mango drink
    ],

    # Breads
    "bread": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Indian bread
    ],
    "roti": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Roti
    ],
    "paratha": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Paratha
    ],
    "chapati": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Chapati
    ],
    "puri": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Puri
    ],
    "bhatura": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400",  # Bhatura
    ],

    # Default categories
    "default_vegetarian": [
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",  # Veggie
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",  # Healthy
    ],
    "default_meat": [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",  # Meat dish
        "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400",  # Protein
    ],
    "default": [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",  # Food plate
        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",  # Restaurant food
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400",  # Delicious meal
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",  # Pizza (generic)
        "https://images.unsplash.com/photo-1482049016gy-2a69c8b8f7e5?w=400",  # Food spread
    ],
}


def get_stock_image_for_dish(dish_name: str, category: str = None, is_vegetarian: bool = False) -> str:
    """
    Get a stock image URL based on dish name and category.
    Uses keyword matching to find the most appropriate image.
    """
    import random
    import hashlib

    dish_name_lower = dish_name.lower() if dish_name else ""
    category_lower = category.lower() if category else ""

    # Use hash of dish name for consistent image selection (not for security)
    hash_val = int(hashlib.md5(dish_name.encode(), usedforsecurity=False).hexdigest(), 16)

    # Try to match keywords in dish name
    for keyword, images in STOCK_IMAGES.items():
        if keyword in dish_name_lower or keyword in category_lower:
            # Use hash to pick consistent image for same dish
            return images[hash_val % len(images)]

    # Fallback to default based on vegetarian status
    if is_vegetarian:
        images = STOCK_IMAGES["default_vegetarian"]
    else:
        images = STOCK_IMAGES["default"]

    return images[hash_val % len(images)]


def assign_stock_images_to_menu(menu_items: list) -> list:
    """
    Assign stock images to menu items that don't have images.
    Returns the updated menu items list.
    """
    for item in menu_items:
        if not item.get("image_url") or item.get("image_url") == "":
            item["image_url"] = get_stock_image_for_dish(
                item.get("item_name", ""),
                item.get("category", ""),
                item.get("is_vegetarian", False)
            )
    return menu_items


# Restaurant/Cuisine stock images (restaurant storefronts and ambiance)
RESTAURANT_IMAGES = {
    "indian": [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",  # Restaurant interior
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600",  # Elegant dining
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600",  # Indian food spread
    ],
    "italian": [
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",  # Italian restaurant
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",  # Fine dining
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",  # Pizza
    ],
    "mexican": [
        "https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=600",  # Mexican restaurant
        "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600",  # Tacos
        "https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=600",  # Mexican food
    ],
    "chinese": [
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600",  # Asian restaurant
        "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600",  # Chinese food
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600",  # Dim sum
    ],
    "japanese": [
        "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600",  # Sushi
        "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600",  # Japanese restaurant
        "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600",  # Ramen
    ],
    "thai": [
        "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600",  # Thai food
        "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600",  # Pad thai
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600",  # Restaurant
    ],
    "american": [
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600",  # American diner
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",  # Burger
        "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600",  # American food
    ],
    "mediterranean": [
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=600",  # Mediterranean
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600",  # Healthy food
        "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600",  # Greek food
    ],
    "korean": [
        "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600",  # Korean BBQ
        "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600",  # Korean food
        "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600",  # Bibimbap
    ],
    "vietnamese": [
        "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600",  # Pho
        "https://images.unsplash.com/photo-1576577445504-6af96477db52?w=600",  # Vietnamese
    ],
    "fast food": [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",  # Burger
        "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600",  # Fast food
    ],
    "pizza": [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",  # Pizza
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",  # Pizzeria
    ],
    "seafood": [
        "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600",  # Seafood
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600",  # Fish
    ],
    "cafe": [
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600",  # Cafe
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",  # Coffee shop
    ],
    "bakery": [
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",  # Bakery
        "https://images.unsplash.com/photo-1517433670267-30f41c09f46c?w=600",  # Pastries
    ],
    "default": [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",  # Restaurant
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600",  # Elegant dining
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",  # Fine dining
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",  # Restaurant interior
    ],
}


def get_stock_image_for_restaurant(cuisine_type: str, restaurant_name: str = "") -> str:
    """
    Get a stock image URL for a restaurant based on cuisine type.
    Uses cuisine matching to find the most appropriate image.
    """
    import hashlib

    cuisine_lower = cuisine_type.lower() if cuisine_type else ""
    name_lower = restaurant_name.lower() if restaurant_name else ""

    # Use hash of restaurant name for consistent image selection
    hash_input = f"{cuisine_type}:{restaurant_name}"
    hash_val = int(hashlib.md5(hash_input.encode(), usedforsecurity=False).hexdigest(), 16)

    # Try to match cuisine type
    for cuisine_key, images in RESTAURANT_IMAGES.items():
        if cuisine_key in cuisine_lower or cuisine_key in name_lower:
            return images[hash_val % len(images)]

    # Fallback to default restaurant images
    images = RESTAURANT_IMAGES["default"]
    return images[hash_val % len(images)]
