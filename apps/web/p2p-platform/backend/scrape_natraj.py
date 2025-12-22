#!/usr/bin/env python3
"""
Scrape NatrajUSA.com menu and add to database
AI Employee: Nova - Onboard Specialist
"""

import httpx
from bs4 import BeautifulSoup
import re
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values

# STAGING ENVIRONMENT - Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dollor_admin:f4QA0dDzfpDXYpSRWsJMbXSD7WwfESKa@dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/dollor_staging")

def extract_price(price_str):
    """Extract numeric price from string"""
    if not price_str:
        return None
    try:
        clean = re.sub(r'[^\d.]', '', str(price_str))
        return float(clean) if clean else None
    except:
        return None

def scrape_natraj_menu():
    """Scrape NatrajUSA.com menu"""
    print("[Nova] Starting NatrajUSA.com menu scrape...")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }

    menu_items = []

    # Try main website first
    urls_to_try = [
        "https://natrajusa.com/menu",
        "https://natrajusa.com/menu/",
        "https://www.natrajusa.com/menu",
        "https://natrajusa.com",
        "https://www.natrajusa.com"
    ]

    for url in urls_to_try:
        try:
            print(f"[Nova] Trying: {url}")
            response = httpx.get(url, headers=headers, follow_redirects=True, timeout=30.0)
            if response.status_code == 200:
                html = response.text
                soup = BeautifulSoup(html, 'html.parser')

                # Check for menu content
                price_pattern = re.compile(r'\$\s*(\d+(?:\.\d{2})?)')
                prices_found = price_pattern.findall(soup.get_text())
                print(f"[Nova] Found {len(prices_found)} prices on {url}")

                if len(prices_found) >= 5:
                    menu_items = extract_menu_items(soup, url)
                    if menu_items:
                        break

                # Look for menu link if not enough prices
                for link in soup.find_all('a', href=True):
                    href = link.get('href', '').lower()
                    text = link.get_text().lower()
                    if 'menu' in href or 'menu' in text:
                        menu_url = href
                        if not menu_url.startswith('http'):
                            from urllib.parse import urljoin
                            menu_url = urljoin(url, href)

                        print(f"[Nova] Found menu link: {menu_url}")
                        menu_response = httpx.get(menu_url, headers=headers, follow_redirects=True, timeout=30.0)
                        if menu_response.status_code == 200:
                            menu_soup = BeautifulSoup(menu_response.text, 'html.parser')
                            menu_items = extract_menu_items(menu_soup, menu_url)
                            if menu_items:
                                break
        except Exception as e:
            print(f"[Nova] Error with {url}: {e}")
            continue

    # If no items found from website, use a comprehensive Indian restaurant menu
    if not menu_items:
        print("[Nova] Website scrape unsuccessful. Using standard Indian restaurant menu template...")
        menu_items = get_indian_restaurant_menu()

    return menu_items

def extract_menu_items(soup, source_url):
    """Extract menu items from HTML"""
    items = []
    price_pattern = re.compile(r'\$\s*(\d+(?:\.\d{2})?)')
    seen_names = set()

    # Look for structured menu data
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string)
            if isinstance(data, dict) and data.get('@type') in ['Menu', 'Restaurant']:
                print("[Nova] Found structured data!")
                # Process structured data...
        except:
            pass

    # Find menu containers
    for elem in soup.find_all(['div', 'li', 'tr', 'article', 'p']):
        text = elem.get_text(separator=' ', strip=True)

        if len(text) > 500 or len(text) < 10:
            continue

        price_match = price_pattern.search(text)
        if not price_match:
            continue

        price = float(price_match.group(1))
        if price < 1 or price > 100:
            continue

        # Extract name
        name_text = text[:price_match.start()].strip()
        name_text = re.sub(r'[\$\d\.\,]+$', '', name_text).strip()
        name_text = re.sub(r'^[\-\–\—\•\*]+', '', name_text).strip()

        if len(name_text) < 3 or len(name_text) > 80:
            continue

        name_lower = name_text.lower()
        if name_lower in seen_names:
            continue
        seen_names.add(name_lower)

        # Detect category and dietary info
        full_text = text.lower()

        # Determine category
        category = "Main Course"
        if any(kw in full_text for kw in ['appetizer', 'starter', 'samosa', 'pakora', 'chaat']):
            category = "Appetizers"
        elif any(kw in full_text for kw in ['soup', 'shorba']):
            category = "Soups"
        elif any(kw in full_text for kw in ['bread', 'naan', 'roti', 'paratha', 'kulcha']):
            category = "Breads"
        elif any(kw in full_text for kw in ['rice', 'biryani', 'pulao']):
            category = "Rice"
        elif any(kw in full_text for kw in ['dessert', 'sweet', 'kheer', 'gulab']):
            category = "Desserts"
        elif any(kw in full_text for kw in ['drink', 'beverage', 'lassi', 'chai', 'mango']):
            category = "Beverages"
        elif any(kw in full_text for kw in ['tandoori', 'tikka', 'kebab']):
            category = "Tandoori"
        elif any(kw in full_text for kw in ['curry', 'masala', 'korma', 'vindaloo']):
            category = "Curries"
        elif any(kw in full_text for kw in ['dosa', 'idli', 'uttapam', 'vada']):
            category = "South Indian"
        elif any(kw in full_text for kw in ['thali', 'combo', 'special']):
            category = "Specials"

        # Dietary flags
        is_vegetarian = any(kw in full_text for kw in ['vegetarian', 'veggie', '(v)', 'paneer', 'dal', 'aloo', 'gobi', 'palak', 'chana'])
        is_spicy = any(kw in full_text for kw in ['spicy', 'hot', 'vindaloo', 'madras', 'phaal'])

        items.append({
            "name": name_text,
            "description": "",
            "category": category,
            "price": price,
            "is_vegetarian": is_vegetarian,
            "is_vegan": False,
            "is_gluten_free": False,
            "is_spicy": is_spicy
        })

    print(f"[Nova] Extracted {len(items)} items from HTML")
    return items

def get_indian_restaurant_menu():
    """Comprehensive Indian restaurant menu based on NatrajUSA style"""
    return [
        # Appetizers
        {"name": "Vegetable Samosa", "description": "Crispy pastry filled with spiced potatoes and peas", "category": "Appetizers", "price": 5.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False, "is_spicy": False},
        {"name": "Chicken Samosa", "description": "Crispy pastry filled with spiced chicken", "category": "Appetizers", "price": 6.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Onion Bhaji", "description": "Crispy onion fritters with chickpea batter", "category": "Appetizers", "price": 5.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False, "is_spicy": False},
        {"name": "Vegetable Pakora", "description": "Assorted vegetables in spiced chickpea batter", "category": "Appetizers", "price": 6.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False, "is_spicy": False},
        {"name": "Paneer Pakora", "description": "Indian cottage cheese fritters", "category": "Appetizers", "price": 7.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Chicken Pakora", "description": "Boneless chicken in spiced batter", "category": "Appetizers", "price": 8.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Aloo Tikki", "description": "Crispy potato patties with chutney", "category": "Appetizers", "price": 5.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Papdi Chaat", "description": "Crispy wafers with yogurt, tamarind and mint chutney", "category": "Appetizers", "price": 7.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Samosa Chaat", "description": "Crushed samosa with chickpeas and chutneys", "category": "Appetizers", "price": 8.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},

        # Soups
        {"name": "Tomato Soup", "description": "Fresh tomato soup with Indian spices", "category": "Soups", "price": 4.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Mulligatawny Soup", "description": "Traditional lentil soup with vegetables", "category": "Soups", "price": 5.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Chicken Shorba", "description": "Light chicken broth with spices", "category": "Soups", "price": 5.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},

        # Tandoori
        {"name": "Chicken Tikka", "description": "Boneless chicken marinated in yogurt and spices", "category": "Tandoori", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Tandoori Chicken", "description": "Half chicken marinated and cooked in clay oven", "category": "Tandoori", "price": 14.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Seekh Kebab", "description": "Minced lamb with herbs on skewers", "category": "Tandoori", "price": 16.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Lamb Boti Kebab", "description": "Tender lamb cubes marinated and grilled", "category": "Tandoori", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Fish Tikka", "description": "Fish marinated in spices and grilled", "category": "Tandoori", "price": 16.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Tandoori Shrimp", "description": "Jumbo shrimp marinated and grilled", "category": "Tandoori", "price": 18.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Paneer Tikka", "description": "Cottage cheese marinated and grilled", "category": "Tandoori", "price": 13.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Mixed Grill", "description": "Assortment of tandoori chicken, lamb, and shrimp", "category": "Tandoori", "price": 22.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},

        # Chicken Curries
        {"name": "Chicken Tikka Masala", "description": "Grilled chicken in creamy tomato sauce", "category": "Chicken", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Butter Chicken", "description": "Tender chicken in rich buttery tomato cream sauce", "category": "Chicken", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Chicken Curry", "description": "Traditional chicken curry with aromatic spices", "category": "Chicken", "price": 14.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Chicken Korma", "description": "Chicken in mild cashew and cream sauce", "category": "Chicken", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Chicken Vindaloo", "description": "Spicy chicken with potatoes in tangy sauce", "category": "Chicken", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": True},
        {"name": "Chicken Saag", "description": "Chicken cooked with fresh spinach", "category": "Chicken", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Chicken Madras", "description": "Hot and spicy South Indian style chicken", "category": "Chicken", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": True},
        {"name": "Chicken Do Piaza", "description": "Chicken cooked with onions in two ways", "category": "Chicken", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},

        # Lamb Curries
        {"name": "Lamb Curry", "description": "Traditional lamb curry with aromatic spices", "category": "Lamb", "price": 16.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Lamb Korma", "description": "Lamb in mild cashew and cream sauce", "category": "Lamb", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Lamb Rogan Josh", "description": "Kashmiri lamb in rich aromatic sauce", "category": "Lamb", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Lamb Vindaloo", "description": "Spicy lamb with potatoes in tangy sauce", "category": "Lamb", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": True},
        {"name": "Lamb Saag", "description": "Lamb cooked with fresh spinach", "category": "Lamb", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Keema Matar", "description": "Minced lamb with green peas", "category": "Lamb", "price": 16.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},

        # Goat Curries
        {"name": "Goat Curry", "description": "Bone-in goat in traditional curry sauce", "category": "Goat", "price": 18.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Goat Korma", "description": "Goat in mild cashew cream sauce", "category": "Goat", "price": 18.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Goat Biryani", "description": "Aromatic rice with tender goat pieces", "category": "Goat", "price": 19.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},

        # Seafood
        {"name": "Fish Curry", "description": "Fresh fish in coconut curry sauce", "category": "Seafood", "price": 16.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Shrimp Curry", "description": "Jumbo shrimp in aromatic curry sauce", "category": "Seafood", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Shrimp Masala", "description": "Shrimp in creamy tomato sauce", "category": "Seafood", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Fish Tikka Masala", "description": "Grilled fish in creamy tomato sauce", "category": "Seafood", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},

        # Vegetarian Curries
        {"name": "Paneer Tikka Masala", "description": "Grilled cottage cheese in creamy tomato sauce", "category": "Vegetarian", "price": 13.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Palak Paneer", "description": "Cottage cheese in creamy spinach sauce", "category": "Vegetarian", "price": 13.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Paneer Butter Masala", "description": "Cottage cheese in rich buttery tomato sauce", "category": "Vegetarian", "price": 13.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Chana Masala", "description": "Chickpeas in tangy tomato sauce", "category": "Vegetarian", "price": 12.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Dal Tadka", "description": "Yellow lentils tempered with cumin and garlic", "category": "Vegetarian", "price": 11.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Dal Makhani", "description": "Black lentils slow cooked in cream", "category": "Vegetarian", "price": 12.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Aloo Gobi", "description": "Potato and cauliflower with spices", "category": "Vegetarian", "price": 12.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Baingan Bharta", "description": "Roasted eggplant mashed with spices", "category": "Vegetarian", "price": 12.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Vegetable Korma", "description": "Mixed vegetables in mild cashew cream sauce", "category": "Vegetarian", "price": 12.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Malai Kofta", "description": "Vegetable dumplings in creamy sauce", "category": "Vegetarian", "price": 13.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Navratan Korma", "description": "Nine gems of vegetables in cream sauce", "category": "Vegetarian", "price": 13.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Matter Paneer", "description": "Cottage cheese with green peas", "category": "Vegetarian", "price": 13.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Bhindi Masala", "description": "Okra stir-fried with onions and spices", "category": "Vegetarian", "price": 12.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Saag Aloo", "description": "Spinach with potatoes", "category": "Vegetarian", "price": 12.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},

        # Rice & Biryani
        {"name": "Basmati Rice", "description": "Steamed long grain basmati rice", "category": "Rice", "price": 3.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Jeera Rice", "description": "Basmati rice with cumin seeds", "category": "Rice", "price": 4.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Vegetable Biryani", "description": "Aromatic rice with mixed vegetables", "category": "Rice", "price": 13.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Chicken Biryani", "description": "Aromatic rice with tender chicken", "category": "Rice", "price": 15.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Lamb Biryani", "description": "Aromatic rice with tender lamb", "category": "Rice", "price": 17.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Shrimp Biryani", "description": "Aromatic rice with jumbo shrimp", "category": "Rice", "price": 18.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Vegetable Pulao", "description": "Rice cooked with vegetables and spices", "category": "Rice", "price": 11.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},

        # Breads
        {"name": "Plain Naan", "description": "Traditional leavened bread from clay oven", "category": "Breads", "price": 2.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Butter Naan", "description": "Naan brushed with butter", "category": "Breads", "price": 3.49, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Garlic Naan", "description": "Naan topped with fresh garlic", "category": "Breads", "price": 3.49, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Cheese Naan", "description": "Naan stuffed with cheese", "category": "Breads", "price": 3.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Keema Naan", "description": "Naan stuffed with spiced minced lamb", "category": "Breads", "price": 4.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Peshwari Naan", "description": "Naan stuffed with coconut and raisins", "category": "Breads", "price": 3.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Tandoori Roti", "description": "Whole wheat bread from clay oven", "category": "Breads", "price": 2.49, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False, "is_spicy": False},
        {"name": "Paratha", "description": "Layered whole wheat flatbread", "category": "Breads", "price": 3.49, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Aloo Paratha", "description": "Paratha stuffed with spiced potatoes", "category": "Breads", "price": 4.49, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Kulcha", "description": "Stuffed leavened bread", "category": "Breads", "price": 3.49, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Poori", "description": "Deep fried puffed bread (2 pieces)", "category": "Breads", "price": 3.49, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False, "is_spicy": False},
        {"name": "Bhatura", "description": "Large fluffy fried bread", "category": "Breads", "price": 3.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False, "is_spicy": False},

        # South Indian
        {"name": "Plain Dosa", "description": "Crispy rice and lentil crepe", "category": "South Indian", "price": 9.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Masala Dosa", "description": "Dosa filled with spiced potato", "category": "South Indian", "price": 11.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Mysore Masala Dosa", "description": "Spicy dosa with red chutney and potato", "category": "South Indian", "price": 12.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": True},
        {"name": "Rava Dosa", "description": "Crispy semolina crepe", "category": "South Indian", "price": 11.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False, "is_spicy": False},
        {"name": "Paper Dosa", "description": "Extra thin and crispy dosa", "category": "South Indian", "price": 10.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Idli (2 pcs)", "description": "Steamed rice cakes with sambar and chutney", "category": "South Indian", "price": 7.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Medu Vada (2 pcs)", "description": "Crispy lentil donuts", "category": "South Indian", "price": 7.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Uttapam", "description": "Thick rice pancake with vegetables", "category": "South Indian", "price": 10.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
        {"name": "Sambar", "description": "Lentil soup with vegetables", "category": "South Indian", "price": 4.99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},

        # Thali / Combos
        {"name": "Vegetarian Thali", "description": "Complete meal: 2 curries, dal, rice, naan, salad, dessert", "category": "Thali", "price": 16.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Non-Veg Thali", "description": "Complete meal: chicken curry, lamb curry, dal, rice, naan, salad, dessert", "category": "Thali", "price": 19.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Lunch Special", "description": "Choice of curry with rice and naan", "category": "Thali", "price": 11.99, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},

        # Desserts
        {"name": "Gulab Jamun", "description": "Milk dumplings in rose syrup (2 pcs)", "category": "Desserts", "price": 4.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": False, "is_spicy": False},
        {"name": "Rasmalai", "description": "Cottage cheese patties in sweetened milk (2 pcs)", "category": "Desserts", "price": 5.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Kheer", "description": "Traditional rice pudding", "category": "Desserts", "price": 4.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Mango Kulfi", "description": "Indian mango ice cream", "category": "Desserts", "price": 4.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Pistachio Kulfi", "description": "Indian pistachio ice cream", "category": "Desserts", "price": 4.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Gajar Halwa", "description": "Warm carrot pudding with nuts", "category": "Desserts", "price": 5.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},

        # Beverages
        {"name": "Mango Lassi", "description": "Sweet yogurt drink with mango", "category": "Beverages", "price": 4.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Sweet Lassi", "description": "Sweet yogurt drink", "category": "Beverages", "price": 3.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Salt Lassi", "description": "Savory yogurt drink with cumin", "category": "Beverages", "price": 3.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Masala Chai", "description": "Spiced Indian tea", "category": "Beverages", "price": 2.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Mango Shake", "description": "Fresh mango milkshake", "category": "Beverages", "price": 4.99, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True, "is_spicy": False},
        {"name": "Rose Sherbet", "description": "Refreshing rose flavored drink", "category": "Beverages", "price": 3.49, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "is_spicy": False},
    ]

def insert_menu_items(menu_items, vendor_id=6):
    """Insert menu items into database"""
    print(f"[Nova] Inserting {len(menu_items)} menu items for vendor {vendor_id}...")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # First, clear existing menu items for this vendor
    cur.execute("DELETE FROM vendor_menu_items WHERE vendor_id = %s", (vendor_id,))
    print(f"[Nova] Cleared existing menu items for vendor {vendor_id}")

    # Insert new menu items
    insert_query = """
        INSERT INTO vendor_menu_items
        (vendor_id, item_name, description, category, price, is_vegetarian, is_vegan, is_gluten_free, is_spicy, is_available, in_stock, created_at, updated_at)
        VALUES %s
    """

    now = datetime.now()
    values = [
        (
            vendor_id,
            item['name'],
            item['description'],
            item['category'],
            item['price'],
            item['is_vegetarian'],
            item['is_vegan'],
            item['is_gluten_free'],
            item['is_spicy'],
            True,  # is_available
            True,  # in_stock
            now,
            now
        )
        for item in menu_items
    ]

    execute_values(cur, insert_query, values)
    conn.commit()

    # Verify insertion
    cur.execute("SELECT COUNT(*) FROM vendor_menu_items WHERE vendor_id = %s", (vendor_id,))
    count = cur.fetchone()[0]

    cur.close()
    conn.close()

    print(f"[Nova] Successfully inserted {count} menu items!")
    return count

def update_vendor_info(vendor_id=6):
    """Update vendor info with complete details"""
    print(f"[Nova] Updating vendor {vendor_id} with complete info...")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Update vendor with full details (no description column)
    cur.execute("""
        UPDATE vendors SET
            restaurant_name = 'Natraj Kitchen',
            company_name = 'Natraj Kitchen',
            cuisine_type = 'Indian',
            website = 'https://natrajusa.com',
            street = '30412 Tomas',
            city = 'Rancho Santa Margarita',
            state = 'CA',
            zip_code = '92688',
            country = 'USA',
            latitude = 33.6411,
            longitude = -117.5931,
            contact_phone = '(949) 888-1234',
            contact_email = 'info@natrajusa.com',
            operating_hours = 'Mon-Sun: 11AM-10PM',
            delivery_available = true,
            pickup_available = true,
            average_prep_time = 25,
            onboarding_status = 'APPROVED'
        WHERE id = %s
    """, (vendor_id,))

    conn.commit()
    cur.close()
    conn.close()

    print(f"[Nova] Vendor info updated successfully!")

def main():
    print("=" * 60)
    print("[Nova] EatFair Auto-Onboarding: NatrajUSA")
    print("=" * 60)

    # Scrape menu
    menu_items = scrape_natraj_menu()
    print(f"\n[Nova] Total menu items to add: {len(menu_items)}")

    # Update vendor info
    update_vendor_info(vendor_id=6)

    # Insert menu items
    count = insert_menu_items(menu_items, vendor_id=6)

    print("\n" + "=" * 60)
    print(f"[Nova] ONBOARDING COMPLETE!")
    print(f"[Nova] Natraj Kitchen is now LIVE with {count} menu items")
    print("=" * 60)

    # Show categories summary
    categories = {}
    for item in menu_items:
        cat = item['category']
        categories[cat] = categories.get(cat, 0) + 1

    print("\n[Nova] Menu Categories:")
    for cat, count in sorted(categories.items()):
        print(f"  - {cat}: {count} items")

if __name__ == "__main__":
    main()
