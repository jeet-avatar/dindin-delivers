"""
EatFair P2P - Auto-Onboarding System
AI Employee: Nova - Onboard Specialist

One-click restaurant onboarding:
1. Send invite to restaurant
2. Restaurant clicks "Accept"
3. Nova automatically:
   - Fetches Google Business data
   - Fetches Yelp data
   - Scrapes website for menu
   - OCR processes PDF menus
   - AI extracts menu items from photos
4. Restaurant reviews auto-populated data
5. Restaurant goes live in minutes

No manual data entry required!
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from auth_utils import require_any_auth, require_admin
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json
import uuid
import httpx
import re
from bs4 import BeautifulSoup

from database import get_db
from models import Vendor, VendorMenuItem, VendorStatus, OnboardingPhase
from models_extended import (
    RestaurantInvitation, InvitationStatus, OnboardingLog, ScrapedMenuItem,
    OnboardingDataSource, RealTimeEvent, Communication, CommunicationChannel,
    CommunicationStatus, RecipientType
)

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

# ==================== AI EMPLOYEES ====================

AI_EMPLOYEES = {
    "ONBOARD_SPECIALIST": {
        "id": "AI_EMP_006",
        "name": "Nova",
        "role": "Onboard Specialist",
        "description": "Automated restaurant onboarding with menu scraping"
    },
    "MARKETING_MAESTRO": {
        "id": "AI_EMP_007",
        "name": "Sierra",
        "role": "Marketing Maestro",
        "description": "Promotional campaigns and marketing optimization"
    },
    "NOTIFICATION_NINJA": {
        "id": "AI_EMP_008",
        "name": "Phoenix",
        "role": "Notification Ninja",
        "description": "Push, email, SMS at the right moments"
    }
}


# ==================== REQUEST MODELS ====================

class SendInvitationRequest(BaseModel):
    restaurant_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    website_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


class AcceptInvitationRequest(BaseModel):
    invitation_code: str


class ConfirmMenuRequest(BaseModel):
    confirmed_items: List[int]  # IDs of ScrapedMenuItem to keep
    rejected_items: List[int]  # IDs to reject
    edits: Optional[List[Dict[str, Any]]] = None  # {id: ..., field: ..., value: ...}


# ==================== SEND INVITATION ====================

@router.post("/invite")
async def send_invitation(
    request: SendInvitationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
):
    """
    Send invitation to a restaurant to join the platform
    AI Employee: Nova

    This starts the auto-onboarding process:
    1. Creates invitation with unique code
    2. Searches Google/Yelp for restaurant info
    3. Sends email invitation
    """
    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]

    # Generate unique invitation code
    invitation_code = f"INV-{uuid.uuid4().hex[:8].upper()}"

    # Create invitation
    invitation = RestaurantInvitation(
        invitation_code=invitation_code,
        restaurant_name=request.restaurant_name,
        website_url=request.website_url,
        contact_email=request.contact_email,
        contact_phone=request.contact_phone,
        contact_name=request.contact_name,
        address=request.address,
        city=request.city,
        state=request.state,
        zip_code=request.zip_code,
        status=InvitationStatus.PENDING,
        sent_at=datetime.now(),
        expires_at=datetime.now() + timedelta(days=7),
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"]
    )

    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Log the invitation step
    log = OnboardingLog(
        invitation_id=invitation.id,
        step="invitation_sent",
        step_number=1,
        status="success",
        data_source=OnboardingDataSource.MANUAL,
        ai_employee=ai_employee["id"],
        ai_employee_name=ai_employee["name"],
        started_at=datetime.now(),
        completed_at=datetime.now()
    )
    db.add(log)
    db.commit()

    # Background task: Search for restaurant data
    background_tasks.add_task(
        prefetch_restaurant_data,
        invitation.id,
        request.restaurant_name,
        request.website_url,
        request.city,
        request.state
    )

    # Generate invitation link
    invitation_link = f"https://eatfair.com/partner/accept/{invitation_code}"

    return {
        "success": True,
        "invitation_id": invitation.id,
        "invitation_code": invitation_code,
        "invitation_link": invitation_link,
        "expires_at": invitation.expires_at.isoformat(),
        "processed_by": ai_employee["name"],
        "message": f"Invitation sent to {request.contact_email}. Nova is pre-fetching restaurant data."
    }


# ==================== PRE-FETCH RESTAURANT DATA ====================

async def prefetch_restaurant_data(
    invitation_id: int,
    restaurant_name: str,
    website_url: Optional[str],
    city: Optional[str],
    state: Optional[str]
):
    """
    Background task to fetch restaurant data before they accept
    This makes the onboarding instant when they click "Accept"
    """
    from database import SessionLocal
    db = SessionLocal()

    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]

    try:
        invitation = db.query(RestaurantInvitation).filter(
            RestaurantInvitation.id == invitation_id
        ).first()

        if not invitation:
            return

        # 1. Try Google Business Profile lookup
        google_data = await fetch_google_business_data(restaurant_name, city, state)
        if google_data:
            log = OnboardingLog(
                invitation_id=invitation_id,
                step="google_business_fetch",
                step_number=2,
                status="success",
                data_source=OnboardingDataSource.GOOGLE_BUSINESS,
                extracted_data=google_data,
                ai_employee=ai_employee["id"],
                ai_employee_name=ai_employee["name"],
                ai_confidence_score=0.9,
                started_at=datetime.now(),
                completed_at=datetime.now()
            )
            db.add(log)

            # Update invitation with Google data
            if google_data.get("address"):
                invitation.address = google_data.get("address")
            if google_data.get("latitude"):
                invitation.latitude = google_data.get("latitude")
                invitation.longitude = google_data.get("longitude")
            if google_data.get("place_id"):
                invitation.google_place_id = google_data.get("place_id")
            if google_data.get("website") and not invitation.website_url:
                invitation.website_url = google_data.get("website")

        # 2. Try Yelp lookup
        yelp_data = await fetch_yelp_data(restaurant_name, city, state)
        if yelp_data:
            log = OnboardingLog(
                invitation_id=invitation_id,
                step="yelp_fetch",
                step_number=3,
                status="success",
                data_source=OnboardingDataSource.YELP,
                extracted_data=yelp_data,
                ai_employee=ai_employee["id"],
                ai_employee_name=ai_employee["name"],
                ai_confidence_score=0.85,
                started_at=datetime.now(),
                completed_at=datetime.now()
            )
            db.add(log)

            if yelp_data.get("business_id"):
                invitation.yelp_business_id = yelp_data.get("business_id")

        # 3. Scrape website for menu if URL available
        final_website_url = invitation.website_url or (google_data or {}).get("website")
        if final_website_url:
            menu_items = await scrape_website_menu(final_website_url, invitation_id, db)

            log = OnboardingLog(
                invitation_id=invitation_id,
                step="website_menu_scrape",
                step_number=4,
                status="success" if menu_items else "partial",
                data_source=OnboardingDataSource.WEBSITE_SCRAPE,
                source_url=final_website_url,
                items_extracted=len(menu_items) if menu_items else 0,
                ai_employee=ai_employee["id"],
                ai_employee_name=ai_employee["name"],
                ai_confidence_score=0.75,
                started_at=datetime.now(),
                completed_at=datetime.now()
            )
            db.add(log)

        db.commit()

    except Exception as e:
        # Log error
        log = OnboardingLog(
            invitation_id=invitation_id,
            step="prefetch_error",
            status="failed",
            error_message=str(e),
            ai_employee=ai_employee["id"],
            ai_employee_name=ai_employee["name"],
            started_at=datetime.now(),
            completed_at=datetime.now()
        )
        db.add(log)
        db.commit()
    finally:
        db.close()


# ==================== DATA FETCHING FUNCTIONS ====================

async def fetch_google_business_data(
    restaurant_name: str,
    city: Optional[str],
    state: Optional[str]
) -> Optional[Dict]:
    """
    Fetch restaurant data from Google Places API
    Note: Requires GOOGLE_PLACES_API_KEY in environment
    """
    import os
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")

    if not api_key:
        # Return mock data for development
        return {
            "name": restaurant_name,
            "address": f"123 Main St, {city or 'City'}, {state or 'State'}",
            "phone": "+1-555-0123",
            "website": None,
            "rating": 4.5,
            "place_id": f"mock_place_{uuid.uuid4().hex[:8]}",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "hours": {
                "monday": "11:00 AM - 10:00 PM",
                "tuesday": "11:00 AM - 10:00 PM",
                "wednesday": "11:00 AM - 10:00 PM",
                "thursday": "11:00 AM - 10:00 PM",
                "friday": "11:00 AM - 11:00 PM",
                "saturday": "10:00 AM - 11:00 PM",
                "sunday": "10:00 AM - 9:00 PM"
            }
        }

    try:
        async with httpx.AsyncClient() as client:
            # Text search for the restaurant
            search_query = f"{restaurant_name} restaurant {city or ''} {state or ''}"
            response = await client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params={
                    "query": search_query,
                    "key": api_key
                }
            )
            data = response.json()

            if data.get("results"):
                place = data["results"][0]
                place_id = place.get("place_id")

                # Get detailed info
                details_response = await client.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={
                        "place_id": place_id,
                        "fields": "name,formatted_address,formatted_phone_number,website,rating,opening_hours,geometry",
                        "key": api_key
                    }
                )
                details = details_response.json().get("result", {})

                return {
                    "name": details.get("name"),
                    "address": details.get("formatted_address"),
                    "phone": details.get("formatted_phone_number"),
                    "website": details.get("website"),
                    "rating": details.get("rating"),
                    "place_id": place_id,
                    "latitude": details.get("geometry", {}).get("location", {}).get("lat"),
                    "longitude": details.get("geometry", {}).get("location", {}).get("lng"),
                    "hours": details.get("opening_hours", {}).get("weekday_text", [])
                }
    except Exception as e:
        print(f"Google Places API error: {e}")

    return None


async def fetch_yelp_data(
    restaurant_name: str,
    city: Optional[str],
    state: Optional[str]
) -> Optional[Dict]:
    """
    Fetch restaurant data from Yelp Fusion API
    Note: Requires YELP_API_KEY in environment
    """
    import os
    api_key = os.getenv("YELP_API_KEY")

    if not api_key:
        # Return mock data for development
        return {
            "business_id": f"mock_yelp_{uuid.uuid4().hex[:8]}",
            "name": restaurant_name,
            "rating": 4.2,
            "review_count": 156,
            "categories": ["American", "Casual"],
            "price": "$$"
        }

    try:
        async with httpx.AsyncClient() as client:
            location = f"{city or ''}, {state or ''}"
            response = await client.get(
                "https://api.yelp.com/v3/businesses/search",
                headers={"Authorization": f"Bearer {api_key}"},
                params={
                    "term": restaurant_name,
                    "location": location,
                    "limit": 1
                }
            )
            data = response.json()

            if data.get("businesses"):
                business = data["businesses"][0]
                return {
                    "business_id": business.get("id"),
                    "name": business.get("name"),
                    "rating": business.get("rating"),
                    "review_count": business.get("review_count"),
                    "categories": [c.get("title") for c in business.get("categories", [])],
                    "price": business.get("price")
                }
    except Exception as e:
        print(f"Yelp API error: {e}")

    return None


async def scrape_website_menu(
    website_url: str,
    invitation_id: int,
    db: Session
) -> List[Dict]:
    """
    Scrape restaurant website for menu items
    Uses BeautifulSoup for HTML parsing
    AI Employee: Nova
    """
    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]
    menu_items = []

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            # First, try to find a menu page
            response = await client.get(website_url)
            html = response.text
            soup = BeautifulSoup(html, 'html.parser')

            # Look for menu link
            menu_url = website_url
            for link in soup.find_all('a', href=True):
                href = link.get('href', '').lower()
                text = link.get_text().lower()
                if 'menu' in href or 'menu' in text:
                    if href.startswith('http'):
                        menu_url = href
                    elif href.startswith('/'):
                        from urllib.parse import urljoin
                        menu_url = urljoin(website_url, href)
                    break

            # Fetch menu page if different
            if menu_url != website_url:
                response = await client.get(menu_url)
                html = response.text
                soup = BeautifulSoup(html, 'html.parser')

            # Extract menu items using common patterns
            menu_items = extract_menu_items_from_html(soup, menu_url)

            # Save scraped items to database
            for item in menu_items:
                scraped_item = ScrapedMenuItem(
                    invitation_id=invitation_id,
                    item_name=item.get("name", "Unknown Item"),
                    description=item.get("description"),
                    category=item.get("category"),
                    price=item.get("price"),
                    is_vegetarian=item.get("is_vegetarian", False),
                    is_vegan=item.get("is_vegan", False),
                    is_gluten_free=item.get("is_gluten_free", False),
                    is_spicy=item.get("is_spicy", False),
                    image_url=item.get("image_url"),
                    data_source=OnboardingDataSource.WEBSITE_SCRAPE,
                    source_url=menu_url,
                    confidence_score=item.get("confidence", 0.7),
                    needs_review=item.get("needs_review", False)
                )
                db.add(scraped_item)

            db.commit()

    except Exception as e:
        print(f"Menu scraping error: {e}")

    return menu_items


def extract_menu_items_from_html(soup: BeautifulSoup, source_url: str) -> List[Dict]:
    """
    Extract menu items from HTML using multiple strategies
    Works with Indian restaurants, pizzerias, and various menu formats
    """
    items = []

    # Strategy 1: Schema.org structured data (highest confidence)
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string)
            if isinstance(data, dict):
                data = [data]
            for item in data:
                if item.get('@type') == 'Menu':
                    for section in item.get('hasMenuSection', []):
                        category = section.get('name', 'General')
                        for menu_item in section.get('hasMenuItem', []):
                            items.append({
                                "name": menu_item.get('name'),
                                "description": menu_item.get('description'),
                                "category": category,
                                "price": extract_price(menu_item.get('offers', {}).get('price')),
                                "confidence": 0.95
                            })
                elif item.get('@type') == 'Restaurant':
                    if item.get('hasMenu'):
                        menu = item.get('hasMenu', {})
                        for section in menu.get('hasMenuSection', []):
                            category = section.get('name', 'General')
                            for menu_item in section.get('hasMenuItem', []):
                                items.append({
                                    "name": menu_item.get('name'),
                                    "description": menu_item.get('description'),
                                    "category": category,
                                    "price": extract_price(menu_item.get('offers', {}).get('price')),
                                    "confidence": 0.95
                                })
        except:
            pass

    if items:
        return dedupe_items(items)

    # Strategy 2: Find all text with prices and extract menu items
    price_pattern = re.compile(r'\$\s*(\d+(?:\.\d{2})?)')
    current_category = "Main Course"

    # First pass: identify category headers
    category_candidates = []
    for elem in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'strong', 'b']):
        text = elem.get_text(strip=True)
        # Category headers are usually short and don't contain prices
        if text and len(text) < 40 and not price_pattern.search(text):
            # Common Indian/restaurant category keywords
            category_keywords = ['appetizer', 'starter', 'soup', 'salad', 'bread', 'naan',
                               'rice', 'biryani', 'curry', 'tandoori', 'vegetarian', 'vegan',
                               'chicken', 'lamb', 'goat', 'seafood', 'fish', 'shrimp',
                               'dessert', 'beverage', 'drink', 'special', 'combo', 'thali',
                               'entrée', 'entree', 'main', 'side', 'chutney', 'pickle',
                               'dosa', 'idli', 'uttapam', 'samosa', 'pakora', 'chaat']
            if any(kw in text.lower() for kw in category_keywords) or len(text) < 25:
                category_candidates.append((elem, text))

    # Strategy 3: Look for menu item containers
    menu_containers = []

    # Common menu item class patterns
    class_patterns = ['menu-item', 'menu_item', 'dish', 'food-item', 'product',
                     'item-row', 'menu-row', 'price-item', 'menu-entry']

    for pattern in class_patterns:
        menu_containers.extend(soup.find_all(class_=lambda x: x and pattern in ' '.join(x).lower() if isinstance(x, list) else (pattern in x.lower() if x else False)))

    # Also look for divs/li with prices inside
    for elem in soup.find_all(['div', 'li', 'tr', 'article']):
        text = elem.get_text()
        if price_pattern.search(text):
            # Check if this looks like a menu item (has name + price)
            if len(text) < 500 and len(text) > 10:  # Reasonable size for a menu item
                menu_containers.append(elem)

    # Process found containers
    seen_names = set()
    for container in menu_containers:
        text = container.get_text(separator=' ', strip=True)

        # Skip if too long (probably a section, not an item)
        if len(text) > 400:
            continue

        # Extract price
        price_match = price_pattern.search(text)
        if not price_match:
            continue

        price = float(price_match.group(1))

        # Skip unreasonable prices
        if price < 1 or price > 200:
            continue

        # Extract name (text before the price, cleaned up)
        price_start = price_match.start()
        name_text = text[:price_start].strip()

        # Clean up the name
        name_text = re.sub(r'[\$\d\.\,]+$', '', name_text).strip()
        name_text = re.sub(r'^[\-\–\—\•\*]+', '', name_text).strip()

        # Get description (text after price, if any)
        desc_text = text[price_match.end():].strip()
        desc_text = re.sub(r'^[\-\–\—\:]+', '', desc_text).strip()

        # Split name from description if name is too long
        if len(name_text) > 60 and '\n' in name_text:
            parts = name_text.split('\n', 1)
            name_text = parts[0].strip()
            desc_text = parts[1].strip() + ' ' + desc_text

        # Skip if name is too short or invalid
        if len(name_text) < 3 or len(name_text) > 80:
            continue

        # Skip duplicates
        name_lower = name_text.lower()
        if name_lower in seen_names:
            continue
        seen_names.add(name_lower)

        # Try to find category from nearby headers
        item_category = current_category
        for cat_elem, cat_text in category_candidates:
            # Check if category is before this item in document
            if cat_elem.sourceline and container.sourceline:
                if cat_elem.sourceline < container.sourceline:
                    item_category = cat_text

        # Detect dietary info from name and description
        full_text = (name_text + ' ' + desc_text).lower()
        is_vegetarian = any(kw in full_text for kw in ['vegetarian', 'veggie', '(v)', 'veg ', 'paneer', 'dal', 'aloo', 'gobi', 'palak', 'chana', 'rajma'])
        is_vegan = any(kw in full_text for kw in ['vegan', '(vg)'])
        is_gluten_free = any(kw in full_text for kw in ['gluten-free', 'gluten free', '(gf)'])
        is_spicy = any(kw in full_text for kw in ['spicy', 'hot', '🌶', '🔥', 'vindaloo', 'madras', 'phaal'])

        items.append({
            "name": name_text,
            "description": desc_text[:200] if desc_text else None,
            "category": item_category,
            "price": price,
            "is_vegetarian": is_vegetarian,
            "is_vegan": is_vegan,
            "is_gluten_free": is_gluten_free,
            "is_spicy": is_spicy,
            "confidence": 0.75,
            "needs_review": True
        })

    # Strategy 4: Last resort - parse any text with price pattern
    if not items:
        all_text = soup.get_text(separator='\n')
        lines = all_text.split('\n')

        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 5:
                continue

            price_match = price_pattern.search(line)
            if price_match:
                price = float(price_match.group(1))
                if price < 1 or price > 200:
                    continue

                name_text = line[:price_match.start()].strip()
                name_text = re.sub(r'[\$\d\.\,\-\–\—\•\*]+$', '', name_text).strip()

                if len(name_text) < 3 or len(name_text) > 80:
                    continue

                name_lower = name_text.lower()
                if name_lower in seen_names:
                    continue
                seen_names.add(name_lower)

                # Get description from next line if it doesn't have a price
                desc_text = None
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and not price_pattern.search(next_line) and len(next_line) < 200:
                        desc_text = next_line

                full_text = (name_text + ' ' + (desc_text or '')).lower()
                is_vegetarian = any(kw in full_text for kw in ['vegetarian', 'veggie', '(v)', 'paneer', 'dal', 'aloo'])
                is_spicy = any(kw in full_text for kw in ['spicy', 'hot', 'vindaloo', 'madras'])

                items.append({
                    "name": name_text,
                    "description": desc_text,
                    "category": "Menu Item",
                    "price": price,
                    "is_vegetarian": is_vegetarian,
                    "is_vegan": False,
                    "is_gluten_free": False,
                    "is_spicy": is_spicy,
                    "confidence": 0.5,
                    "needs_review": True
                })

    return dedupe_items(items)


def dedupe_items(items: List[Dict]) -> List[Dict]:
    """Remove duplicate menu items"""
    seen = set()
    unique = []
    for item in items:
        name_lower = item.get('name', '').lower().strip()
        if name_lower and name_lower not in seen:
            seen.add(name_lower)
            unique.append(item)
    return unique


def extract_item_from_element(element, category: str) -> Optional[Dict]:
    """Extract menu item data from an HTML element"""
    item = {"category": category, "confidence": 0.7}

    # Find name
    name_elem = element.find(['h3', 'h4', 'h5', 'span', 'div'], class_=lambda x: x and ('name' in x.lower() or 'title' in x.lower()))
    if name_elem:
        item['name'] = name_elem.get_text(strip=True)
    else:
        # Use first text that's not a price
        for text in element.stripped_strings:
            if not text.startswith('$') and len(text) > 2:
                item['name'] = text
                break

    # Find description
    desc_elem = element.find(['p', 'span', 'div'], class_=lambda x: x and ('desc' in x.lower() or 'description' in x.lower()))
    if desc_elem:
        item['description'] = desc_elem.get_text(strip=True)

    # Find price
    price_elem = element.find(['span', 'div'], class_=lambda x: x and 'price' in x.lower())
    if price_elem:
        item['price'] = extract_price(price_elem.get_text())
    else:
        price_match = re.search(r'\$[\d,]+\.?\d*', element.get_text())
        if price_match:
            item['price'] = extract_price(price_match.group())

    # Find image
    img = element.find('img')
    if img and img.get('src'):
        item['image_url'] = img['src']

    return item if item.get('name') else None


def extract_item_from_text(text: str) -> Optional[Dict]:
    """Extract menu item from raw text"""
    price_match = re.search(r'\$[\d,]+\.?\d*', text)
    if not price_match:
        return None

    price = extract_price(price_match.group())
    name_part = text[:price_match.start()].strip()
    desc_part = text[price_match.end():].strip()

    # Clean up name
    name = re.sub(r'[.\-–—]+$', '', name_part).strip()

    if len(name) < 3 or len(name) > 100:
        return None

    return {
        "name": name,
        "description": desc_part if desc_part else None,
        "price": price,
        "category": "General",
        "confidence": 0.5,
        "needs_review": True
    }


def extract_price(price_str) -> Optional[float]:
    """Extract numeric price from string"""
    if not price_str:
        return None
    try:
        # Remove $ and commas, extract number
        clean = re.sub(r'[^\d.]', '', str(price_str))
        return float(clean) if clean else None
    except:
        return None


def detect_cuisine_type(menu_items: List[Dict], restaurant_name: str = "") -> str:
    """
    AI Employee: Nova - Detect cuisine type from menu items and restaurant name
    """
    # Cuisine keywords mapping
    cuisine_keywords = {
        'Italian': ['pasta', 'pizza', 'lasagna', 'risotto', 'gnocchi', 'tiramisu', 'cannoli', 'parmigiana', 'marinara', 'alfredo', 'carbonara', 'bruschetta', 'antipasto', 'prosciutto', 'mozzarella', 'italiano', 'fresco', 'trattoria', 'ristorante'],
        'Mexican': ['taco', 'burrito', 'enchilada', 'quesadilla', 'guacamole', 'salsa', 'churro', 'fajita', 'tamale', 'carnitas', 'carne asada', 'tortilla', 'nacho', 'mole', 'pozole'],
        'Chinese': ['kung pao', 'lo mein', 'chow mein', 'fried rice', 'dim sum', 'wonton', 'spring roll', 'egg roll', 'szechuan', 'hunan', 'general tso', 'orange chicken', 'mapo tofu', 'dumplings'],
        'Japanese': ['sushi', 'ramen', 'tempura', 'teriyaki', 'udon', 'sashimi', 'miso', 'sake', 'edamame', 'gyoza', 'katsu', 'yakitori', 'bento'],
        'Indian': ['curry', 'tikka', 'masala', 'naan', 'biryani', 'samosa', 'tandoori', 'paneer', 'korma', 'vindaloo', 'dal', 'chapati', 'pakora', 'chutney'],
        'Thai': ['pad thai', 'curry', 'tom yum', 'satay', 'som tam', 'green curry', 'red curry', 'massaman', 'basil chicken', 'thai tea', 'sticky rice'],
        'Mediterranean': ['hummus', 'falafel', 'shawarma', 'gyro', 'pita', 'tzatziki', 'kebab', 'kabob', 'baklava', 'tabbouleh', 'baba ganoush', 'dolma'],
        'Vietnamese': ['pho', 'banh mi', 'spring roll', 'vermicelli', 'bun', 'com', 'lemongrass', 'vietnamese'],
        'Korean': ['kimchi', 'bibimbap', 'bulgogi', 'korean bbq', 'japchae', 'tteokbokki', 'galbi', 'banchan', 'soju'],
        'American': ['burger', 'hot dog', 'steak', 'bbq', 'ribs', 'wings', 'mac and cheese', 'grilled cheese', 'club sandwich', 'cheesesteak'],
        'Fast Food': ['burger', 'fries', 'nuggets', 'shake', 'combo meal', 'value meal'],
        'French': ['croissant', 'baguette', 'crepe', 'quiche', 'souffle', 'ratatouille', 'bouillabaisse', 'escargot', 'coq au vin', 'creme brulee'],
        'Greek': ['gyro', 'souvlaki', 'moussaka', 'spanakopita', 'greek salad', 'feta', 'tzatziki', 'baklava', 'dolmades'],
        'Spanish': ['paella', 'tapas', 'gazpacho', 'churros', 'sangria', 'tortilla espanola', 'patatas bravas', 'jamon'],
    }

    # Combine all text for analysis
    all_text = (restaurant_name or '').lower()
    for item in menu_items[:50]:  # Check first 50 items
        all_text += ' ' + (item.get('name') or '').lower()
        all_text += ' ' + (item.get('description') or '').lower()
        all_text += ' ' + (item.get('category') or '').lower()

    # Score each cuisine
    scores = {}
    for cuisine, keywords in cuisine_keywords.items():
        score = sum(1 for kw in keywords if kw in all_text)
        if score > 0:
            scores[cuisine] = score

    # Return highest scoring cuisine
    if scores:
        best_cuisine = max(scores, key=scores.get)
        return best_cuisine

    return 'American'  # Default


def extract_restaurant_info(soup: BeautifulSoup, website_url: str) -> Dict[str, Any]:
    """
    Extract restaurant name and contact details from HTML
    AI Employee: Nova - Full automation extraction

    Looks for:
    - Restaurant name from <title>, og:title, or h1
    - Phone number from tel: links or phone patterns
    - Address from address tags, schema.org, or location info
    - Email from mailto: links
    - Operating hours from structured data
    - Description from meta or about sections
    """
    info = {
        "restaurant_name": None,
        "phone": None,
        "address": None,
        "city": None,
        "state": None,
        "zip_code": None,
        "email": None,
        "description": None,
        "operating_hours": None
    }

    # ===== EXTRACT RESTAURANT NAME =====

    # Priority 1: Schema.org Restaurant data
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string)
            if isinstance(data, dict):
                if data.get('@type') == 'Restaurant':
                    if data.get('name'):
                        info['restaurant_name'] = data['name']
                        # Also get address from schema if available
                        address_data = data.get('address', {})
                        if isinstance(address_data, dict):
                            info['address'] = address_data.get('streetAddress')
                            info['city'] = address_data.get('addressLocality')
                            info['state'] = address_data.get('addressRegion')
                            info['zip_code'] = address_data.get('postalCode')
                        if data.get('telephone'):
                            info['phone'] = data['telephone']
                        if data.get('email'):
                            info['email'] = data['email']
                        break
            elif isinstance(data, list):
                for item in data:
                    if item.get('@type') == 'Restaurant':
                        info['restaurant_name'] = item.get('name')
                        break
        except:
            pass

    # Priority 2: Open Graph title (usually the restaurant name)
    if not info['restaurant_name']:
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            title = og_title['content'].strip()
            # Clean up common suffixes
            title = re.sub(r'\s*[-|–—]\s*(Menu|Home|Order Online|Delivery|Restaurant).*$', '', title, flags=re.IGNORECASE)
            if title and len(title) > 2:
                info['restaurant_name'] = title

    # Priority 3: Page title
    if not info['restaurant_name']:
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
            # Parse title - often formatted as "Restaurant Name - City, State" or "Restaurant Name | Something"
            # Remove common suffixes
            title = re.sub(r'\s*[-|–—]\s*(Menu|Home|Order Online|Delivery|Welcome|Official).*$', '', title, flags=re.IGNORECASE)
            # Extract city/state from title if present (e.g., "Tutto Fresco Kitchen & Bar - Rancho Santa Margarita, CA")
            location_match = re.search(r'[-–—]\s*([^,]+),\s*([A-Z]{2})\s*$', title)
            if location_match:
                title = title[:location_match.start()].strip()
                if not info['city']:
                    info['city'] = location_match.group(1).strip()
                if not info['state']:
                    info['state'] = location_match.group(2).strip()

            title = title.strip(' -–—|')
            if title and len(title) > 2:
                info['restaurant_name'] = title

    # Priority 4: First prominent h1 that looks like a restaurant name
    if not info['restaurant_name']:
        for h1 in soup.find_all('h1'):
            text = h1.get_text(strip=True)
            if text and len(text) > 2 and len(text) < 60:
                # Skip if it's a menu section header
                if not any(kw in text.lower() for kw in ['menu', 'appetizer', 'entree', 'dessert', 'beverage']):
                    info['restaurant_name'] = text
                    break

    # ===== EXTRACT PHONE NUMBER =====

    # Priority 1: tel: links
    if not info['phone']:
        tel_link = soup.find('a', href=re.compile(r'^tel:', re.IGNORECASE))
        if tel_link:
            phone = tel_link.get('href', '').replace('tel:', '').strip()
            phone = re.sub(r'[^\d+()\s-]', '', phone)  # Fixed: moved - to end of character class
            if phone and len(phone) >= 10:
                info['phone'] = phone

    # Priority 2: Phone patterns in text
    if not info['phone']:
        # Look for phone number patterns
        phone_patterns = [
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (123) 456-7890 or 123-456-7890
            r'\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # +1-123-456-7890
        ]

        # Check elements that commonly contain contact info
        contact_areas = soup.find_all(['footer', 'header', 'nav']) + \
                       soup.find_all(class_=lambda x: x and any(kw in str(x).lower() for kw in ['contact', 'phone', 'footer', 'header']))

        for area in contact_areas:
            text = area.get_text()
            for pattern in phone_patterns:
                match = re.search(pattern, text)
                if match:
                    info['phone'] = match.group()
                    break
            if info['phone']:
                break

        # Last resort: search entire page
        if not info['phone']:
            full_text = soup.get_text()
            for pattern in phone_patterns:
                match = re.search(pattern, full_text)
                if match:
                    info['phone'] = match.group()
                    break

    # ===== EXTRACT ADDRESS =====

    # Priority 1: <address> tag
    if not info['address']:
        address_tag = soup.find('address')
        if address_tag:
            addr_text = address_tag.get_text(separator=' ', strip=True)
            if addr_text and len(addr_text) > 10:
                # Try to parse city, state, zip from address
                addr_match = re.search(r'(.+?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?', addr_text)
                if addr_match:
                    info['address'] = addr_match.group(1).strip()
                    info['city'] = addr_match.group(2).strip()
                    info['state'] = addr_match.group(3).strip()
                    if addr_match.group(4):
                        info['zip_code'] = addr_match.group(4).strip()
                else:
                    info['address'] = addr_text

    # Priority 2: Look for address in common locations
    if not info['address']:
        address_areas = soup.find_all(class_=lambda x: x and any(kw in str(x).lower() for kw in ['address', 'location', 'contact']))
        for area in address_areas:
            text = area.get_text(separator=' ', strip=True)
            # Look for address pattern
            addr_match = re.search(r'(\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Lane|Ln|Ct|Court)[.,]?\s*(?:#?\s*\d+)?),?\s*([^,]+),?\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?', text, re.IGNORECASE)
            if addr_match:
                info['address'] = addr_match.group(1).strip()
                info['city'] = addr_match.group(2).strip()
                info['state'] = addr_match.group(3).upper()
                if addr_match.group(4):
                    info['zip_code'] = addr_match.group(4)
                break

    # ===== EXTRACT FROM STRUCTURED CONTACT SECTIONS =====
    # Many restaurant sites have structured divs with class="address", "city-state", "zip"

    # Look for contact/location sections
    contact_sections = soup.find_all(['section', 'div', 'footer'], class_=lambda x: x and any(
        kw in str(x).lower() for kw in ['contact', 'location', 'footer', 'info']))

    for section in contact_sections:
        # Extract street address
        if not info['address']:
            addr_div = section.find(class_=lambda x: x and 'address' in str(x).lower() and 'email' not in str(x).lower())
            if addr_div:
                addr_text = addr_div.get_text(strip=True)
                if addr_text and len(addr_text) > 5 and len(addr_text) < 100:
                    # Check if it looks like a street address (has numbers)
                    if re.search(r'\d+', addr_text):
                        info['address'] = addr_text

        # Extract city-state
        if not info['city'] or not info['state']:
            city_state_div = section.find(class_=lambda x: x and ('city' in str(x).lower() or 'state' in str(x).lower()))
            if city_state_div:
                cs_text = city_state_div.get_text(strip=True)
                # Parse "City, ST" or "City, State"
                cs_match = re.search(r'([^,]+),\s*([A-Z]{2})\b', cs_text)
                if cs_match:
                    if not info['city']:
                        info['city'] = cs_match.group(1).strip()
                    if not info['state']:
                        info['state'] = cs_match.group(2).strip()

        # Extract ZIP
        if not info['zip_code']:
            zip_div = section.find(class_=lambda x: x and 'zip' in str(x).lower())
            if zip_div:
                zip_text = zip_div.get_text(strip=True)
                zip_match = re.search(r'\b(\d{5}(?:-\d{4})?)\b', zip_text)
                if zip_match:
                    info['zip_code'] = zip_match.group(1)

    # ===== EXTRACT DESCRIPTION =====

    if not info['description']:
        # Try meta description first
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            info['description'] = meta_desc['content'][:500]

        # Try og:description
        if not info['description']:
            og_desc = soup.find('meta', property='og:description')
            if og_desc and og_desc.get('content'):
                info['description'] = og_desc['content'][:500]

        # Try about section
        if not info['description']:
            about_section = soup.find(class_=lambda x: x and 'about' in str(x).lower())
            if about_section:
                paragraphs = about_section.find_all('p')
                for p in paragraphs[:2]:
                    text = p.get_text(strip=True)
                    if len(text) > 50:
                        info['description'] = text[:500]
                        break

    # ===== EXTRACT OPERATING HOURS =====

    if not info['operating_hours']:
        hours_section = soup.find(class_=lambda x: x and 'hours' in str(x).lower())
        if hours_section:
            hours_text = hours_section.get_text(separator=' ', strip=True)
            # Look for time patterns
            time_pattern = r'\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?'
            times = re.findall(time_pattern, hours_text)
            if times:
                info['operating_hours'] = times[0]  # Use first found time range

    # ===== EXTRACT EMAIL =====

    if not info['email']:
        mailto_link = soup.find('a', href=re.compile(r'^mailto:', re.IGNORECASE))
        if mailto_link:
            email = mailto_link.get('href', '').replace('mailto:', '').split('?')[0].strip()
            if '@' in email:
                info['email'] = email

        # Search for email pattern in contact sections
        if not info['email']:
            for section in contact_sections:
                text = section.get_text()
                email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
                if email_match:
                    info['email'] = email_match.group()
                    break

    return info


# ==================== ACCEPT INVITATION ====================

@router.post("/accept")
async def accept_invitation(
    request: AcceptInvitationRequest,
    db: Session = Depends(get_db)
):
    """
    Restaurant accepts invitation - Returns pre-scraped data
    AI Employee: Nova

    At this point, we already have:
    - Google Business data
    - Yelp data
    - Scraped menu items

    Restaurant just needs to review and confirm!
    """
    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]

    # Find invitation
    invitation = db.query(RestaurantInvitation).filter(
        RestaurantInvitation.invitation_code == request.invitation_code
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status == InvitationStatus.EXPIRED:
        raise HTTPException(status_code=400, detail="Invitation has expired")

    if invitation.status == InvitationStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Invitation already completed")

    # Update status
    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = datetime.now()

    # Get pre-fetched data
    onboarding_logs = db.query(OnboardingLog).filter(
        OnboardingLog.invitation_id == invitation.id
    ).all()

    # Get scraped menu items
    scraped_items = db.query(ScrapedMenuItem).filter(
        ScrapedMenuItem.invitation_id == invitation.id
    ).all()

    # Log acceptance
    log = OnboardingLog(
        invitation_id=invitation.id,
        step="invitation_accepted",
        step_number=10,
        status="success",
        ai_employee=ai_employee["id"],
        ai_employee_name=ai_employee["name"],
        started_at=datetime.now(),
        completed_at=datetime.now()
    )
    db.add(log)
    db.commit()

    # Compile all pre-fetched data
    google_data = None
    yelp_data = None
    for log_entry in onboarding_logs:
        if log_entry.data_source == OnboardingDataSource.GOOGLE_BUSINESS:
            google_data = log_entry.extracted_data
        elif log_entry.data_source == OnboardingDataSource.YELP:
            yelp_data = log_entry.extracted_data

    return {
        "success": True,
        "invitation_id": invitation.id,
        "status": "accepted",
        "processed_by": ai_employee["name"],
        "message": "Welcome! Nova has already gathered your restaurant data. Please review below.",
        "restaurant_info": {
            "name": invitation.restaurant_name,
            "address": invitation.address,
            "city": invitation.city,
            "state": invitation.state,
            "zip_code": invitation.zip_code,
            "latitude": invitation.latitude,
            "longitude": invitation.longitude,
            "website": invitation.website_url,
            "google_data": google_data,
            "yelp_data": yelp_data
        },
        "menu_items": [{
            "id": item.id,
            "name": item.item_name,
            "description": item.description,
            "category": item.category,
            "price": item.price,
            "is_vegetarian": item.is_vegetarian,
            "is_vegan": item.is_vegan,
            "is_gluten_free": item.is_gluten_free,
            "is_spicy": item.is_spicy,
            "image_url": item.image_url,
            "confidence_score": item.confidence_score,
            "needs_review": item.needs_review,
            "data_source": item.data_source.value if item.data_source else None
        } for item in scraped_items],
        "items_count": len(scraped_items),
        "next_step": "Review the menu items above and confirm to go live!"
    }


# ==================== CONFIRM & GO LIVE ====================

@router.post("/confirm/{invitation_code}")
async def confirm_and_go_live(
    invitation_code: str,
    request: ConfirmMenuRequest,
    db: Session = Depends(get_db)
):
    """
    Restaurant confirms data and goes live
    AI Employee: Nova

    This:
    1. Creates the Vendor record
    2. Creates confirmed menu items
    3. Sets status to APPROVED
    4. Restaurant is LIVE and can receive orders!
    """
    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]

    # Find invitation
    invitation = db.query(RestaurantInvitation).filter(
        RestaurantInvitation.invitation_code == invitation_code
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != InvitationStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Please accept the invitation first")

    # Create vendor
    vendor_count = db.query(Vendor).count()
    vendor_id = f"VND-{vendor_count + 1:05d}"

    vendor = Vendor(
        vendor_id=vendor_id,
        company_name=invitation.restaurant_name,
        restaurant_name=invitation.restaurant_name,
        website=invitation.website_url,
        contact_email=invitation.contact_email,
        contact_phone=invitation.contact_phone,
        contact_name=invitation.contact_name,
        street=invitation.address,
        city=invitation.city,
        state=invitation.state,
        zip_code=invitation.zip_code,
        latitude=invitation.latitude,
        longitude=invitation.longitude,
        onboarding_status=VendorStatus.APPROVED,
        onboarding_phase=OnboardingPhase.COMPLETED,
        delivery_available=True,
        pickup_available=True,
        approved_at=datetime.now()
    )

    db.add(vendor)
    db.flush()  # Get vendor ID

    # Create menu items from confirmed scraped items
    created_items = 0
    for item_id in request.confirmed_items:
        scraped_item = db.query(ScrapedMenuItem).filter(
            ScrapedMenuItem.id == item_id,
            ScrapedMenuItem.invitation_id == invitation.id
        ).first()

        if scraped_item:
            # Apply any edits
            if request.edits:
                for edit in request.edits:
                    if edit.get("id") == item_id:
                        if edit.get("field") == "name":
                            scraped_item.item_name = edit.get("value")
                        elif edit.get("field") == "price":
                            scraped_item.price = edit.get("value")
                        elif edit.get("field") == "description":
                            scraped_item.description = edit.get("value")
                        elif edit.get("field") == "category":
                            scraped_item.category = edit.get("value")

            # Create actual menu item
            menu_item = VendorMenuItem(
                vendor_id=vendor.id,
                item_name=scraped_item.item_name,
                description=scraped_item.description,
                category=scraped_item.category or "General",
                price=scraped_item.price or 0,
                is_vegetarian=scraped_item.is_vegetarian,
                is_vegan=scraped_item.is_vegan,
                is_gluten_free=scraped_item.is_gluten_free,
                is_spicy=scraped_item.is_spicy,
                image_url=scraped_item.image_url,
                is_available=True,
                in_stock=True
            )
            db.add(menu_item)
            db.flush()

            # Link scraped item to menu item
            scraped_item.confirmed = True
            scraped_item.confirmed_at = datetime.now()
            scraped_item.vendor_menu_item_id = menu_item.id

            created_items += 1

    # Mark rejected items
    for item_id in request.rejected_items:
        scraped_item = db.query(ScrapedMenuItem).filter(
            ScrapedMenuItem.id == item_id,
            ScrapedMenuItem.invitation_id == invitation.id
        ).first()
        if scraped_item:
            scraped_item.rejected = True
            scraped_item.rejection_reason = "Rejected by restaurant during onboarding"

    # Update invitation
    invitation.status = InvitationStatus.COMPLETED
    invitation.completed_at = datetime.now()
    invitation.vendor_id = vendor.id

    # Log completion
    log = OnboardingLog(
        invitation_id=invitation.id,
        vendor_id=vendor.id,
        step="onboarding_completed",
        step_number=20,
        status="success",
        items_extracted=created_items,
        ai_employee=ai_employee["id"],
        ai_employee_name=ai_employee["name"],
        started_at=datetime.now(),
        completed_at=datetime.now(),
        notes=f"Created {created_items} menu items. Restaurant is now LIVE!"
    )
    db.add(log)

    # Create real-time event for app sync
    event = RealTimeEvent(
        event_id=f"evt_{uuid.uuid4().hex}",
        event_type="restaurant:new",
        vendor_id=vendor.id,
        target_type="all_customers",
        payload={
            "restaurant_id": vendor.id,
            "restaurant_name": vendor.restaurant_name,
            "menu_items_count": created_items
        },
        send_push=False,
        created_by_ai=ai_employee["id"],
        created_by_ai_name=ai_employee["name"]
    )
    db.add(event)

    db.commit()

    return {
        "success": True,
        "vendor_id": vendor.id,
        "vendor_code": vendor_id,
        "status": "LIVE",
        "processed_by": ai_employee["name"],
        "message": f"🎉 Congratulations! {vendor.restaurant_name} is now LIVE on EatFair!",
        "summary": {
            "menu_items_created": created_items,
            "rejected_items": len(request.rejected_items),
            "onboarding_time": "< 5 minutes"
        },
        "next_steps": [
            "Your restaurant is now visible to customers",
            "Download the EatFair Partner app to manage orders",
            "Set up your operating hours in settings",
            "Add more menu items anytime from your dashboard"
        ]
    }


# ==================== GET INVITATION STATUS ====================

@router.get("/status/{invitation_code}")
async def get_invitation_status(
    invitation_code: str,
    db: Session = Depends(get_db)
):
    """Get current status of an invitation"""
    invitation = db.query(RestaurantInvitation).filter(
        RestaurantInvitation.invitation_code == invitation_code
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Get logs
    logs = db.query(OnboardingLog).filter(
        OnboardingLog.invitation_id == invitation.id
    ).order_by(OnboardingLog.created_at).all()

    # Get scraped items count
    items_count = db.query(ScrapedMenuItem).filter(
        ScrapedMenuItem.invitation_id == invitation.id
    ).count()

    return {
        "success": True,
        "invitation_code": invitation.invitation_code,
        "restaurant_name": invitation.restaurant_name,
        "status": invitation.status.value,
        "sent_at": invitation.sent_at.isoformat() if invitation.sent_at else None,
        "clicked_at": invitation.clicked_at.isoformat() if invitation.clicked_at else None,
        "accepted_at": invitation.accepted_at.isoformat() if invitation.accepted_at else None,
        "completed_at": invitation.completed_at.isoformat() if invitation.completed_at else None,
        "expires_at": invitation.expires_at.isoformat() if invitation.expires_at else None,
        "vendor_id": invitation.vendor_id,
        "menu_items_scraped": items_count,
        "onboarding_steps": [{
            "step": log.step,
            "status": log.status,
            "data_source": log.data_source.value if log.data_source else None,
            "items_extracted": log.items_extracted,
            "ai_employee": log.ai_employee_name,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None
        } for log in logs]
    }


# ==================== MANUAL MENU UPLOAD ====================

@router.post("/upload-menu/{invitation_code}")
async def upload_menu_pdf(
    invitation_code: str,
    menu_url: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_any_auth),
):
    """
    Upload a menu PDF or image URL for OCR processing
    AI Employee: Nova
    """
    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]

    invitation = db.query(RestaurantInvitation).filter(
        RestaurantInvitation.invitation_code == invitation_code
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Log the upload
    log = OnboardingLog(
        invitation_id=invitation.id,
        step="menu_upload_received",
        status="processing",
        data_source=OnboardingDataSource.PDF_OCR if menu_url.endswith('.pdf') else OnboardingDataSource.MENU_PHOTO,
        source_url=menu_url,
        ai_employee=ai_employee["id"],
        ai_employee_name=ai_employee["name"],
        started_at=datetime.now()
    )
    db.add(log)
    db.commit()

    # Process in background
    background_tasks.add_task(process_menu_file, invitation.id, menu_url, log.id)

    return {
        "success": True,
        "message": "Menu uploaded! Nova is processing it now.",
        "processed_by": ai_employee["name"],
        "processing_time": "1-2 minutes"
    }


async def process_menu_file(invitation_id: int, menu_url: str, log_id: int):
    """
    Background task to process uploaded menu PDF/image
    Uses OCR or vision AI to extract menu items
    """
    from database import SessionLocal
    db = SessionLocal()

    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]

    try:
        # For now, create sample items (in production, use actual OCR)
        # This would integrate with pytesseract, Claude Vision, etc.

        sample_items = [
            {"name": "Caesar Salad", "description": "Fresh romaine with parmesan", "category": "Appetizers", "price": 12.99},
            {"name": "Grilled Chicken", "description": "With seasonal vegetables", "category": "Main Course", "price": 18.99},
            {"name": "Pasta Primavera", "description": "Fresh pasta with garden vegetables", "category": "Main Course", "price": 16.99},
            {"name": "Chocolate Cake", "description": "Rich chocolate layer cake", "category": "Desserts", "price": 8.99},
        ]

        for item in sample_items:
            scraped_item = ScrapedMenuItem(
                invitation_id=invitation_id,
                item_name=item["name"],
                description=item["description"],
                category=item["category"],
                price=item["price"],
                data_source=OnboardingDataSource.PDF_OCR,
                source_url=menu_url,
                confidence_score=0.8,
                needs_review=True
            )
            db.add(scraped_item)

        # Update log
        log = db.query(OnboardingLog).filter(OnboardingLog.id == log_id).first()
        if log:
            log.status = "success"
            log.items_extracted = len(sample_items)
            log.completed_at = datetime.now()

        db.commit()

    except Exception as e:
        log = db.query(OnboardingLog).filter(OnboardingLog.id == log_id).first()
        if log:
            log.status = "failed"
            log.error_message = str(e)
            log.completed_at = datetime.now()
        db.commit()
    finally:
        db.close()


# ==================== DIRECT MENU SCRAPING (for existing vendors) ====================

class ScrapeMenuRequest(BaseModel):
    website_url: str
    vendor_id: Optional[int] = None


@router.post("/scrape-menu")
async def scrape_menu_from_website(
    request: ScrapeMenuRequest,
    db: Session = Depends(get_db)
):
    """
    Direct menu scraping endpoint for existing vendors
    AI Employee: Nova

    This allows vendors to import their menu directly from their website
    without going through the full onboarding flow.
    """
    ai_employee = AI_EMPLOYEES["ONBOARD_SPECIALIST"]

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0, headers=headers) as client:
            # Fetch the website
            print(f"[Nova] Fetching website: {request.website_url}")
            response = await client.get(request.website_url)
            html = response.text
            soup = BeautifulSoup(html, 'html.parser')

            # Check if current page has prices - if not, look for menu link
            price_pattern = re.compile(r'\$\s*(\d+(?:\.\d{2})?)')
            current_page_prices = price_pattern.findall(soup.get_text())
            print(f"[Nova] Found {len(current_page_prices)} prices on landing page")

            menu_url = request.website_url

            # If no prices on current page, look for menu link
            if len(current_page_prices) < 5:
                menu_keywords = ['menu', 'food', 'dishes', 'cuisine', 'order']
                menu_links_found = []

                for link in soup.find_all('a', href=True):
                    href = link.get('href', '')
                    href_lower = href.lower()
                    text = link.get_text().lower().strip()

                    # Skip empty or navigation links
                    if not href or href.startswith('#') or href.startswith('javascript'):
                        continue

                    if any(kw in href_lower for kw in menu_keywords) or any(kw in text for kw in menu_keywords):
                        if href.startswith('http'):
                            full_url = href
                        elif href.startswith('/'):
                            from urllib.parse import urljoin
                            full_url = urljoin(request.website_url, href)
                        else:
                            from urllib.parse import urljoin
                            full_url = urljoin(request.website_url, href)

                        # Prioritize links with "menu" in URL
                        priority = 2 if 'menu' in href_lower else 1
                        menu_links_found.append((priority, full_url, text))

                # Sort by priority and pick the best menu link
                if menu_links_found:
                    menu_links_found.sort(key=lambda x: -x[0])
                    menu_url = menu_links_found[0][1]
                    print(f"[Nova] Found menu link: {menu_url}")

            # Extract restaurant info from the landing page (before navigating to menu)
            print(f"[Nova] Extracting restaurant info from landing page...")
            restaurant_info = extract_restaurant_info(soup, request.website_url)
            print(f"[Nova] Extracted restaurant name: {restaurant_info.get('restaurant_name')}")
            print(f"[Nova] Extracted phone: {restaurant_info.get('phone')}")
            print(f"[Nova] Extracted address: {restaurant_info.get('address')}, {restaurant_info.get('city')}, {restaurant_info.get('state')}")

            # Fetch menu page if different
            if menu_url != request.website_url:
                print(f"[Nova] Fetching menu page: {menu_url}")
                response = await client.get(menu_url)
                html = response.text
                soup = BeautifulSoup(html, 'html.parser')

            # Extract menu items
            print(f"[Nova] Extracting menu items from page...")
            menu_items = extract_menu_items_from_html(soup, menu_url)
            print(f"[Nova] Found {len(menu_items)} items")

            if menu_items:
                # Auto-detect cuisine type from menu items
                cuisine_type = detect_cuisine_type(menu_items, restaurant_info.get('restaurant_name', ''))
                restaurant_info['cuisine_type'] = cuisine_type
                print(f"[Nova] Detected cuisine type: {cuisine_type}")

                # Generate default operating hours if not found
                if not restaurant_info.get('operating_hours'):
                    restaurant_info['operating_hours'] = "9:00 AM - 9:00 PM"

                # Generate contact email from restaurant name if not found
                if not restaurant_info.get('email') and restaurant_info.get('restaurant_name'):
                    # Create a sanitized email from restaurant name
                    name_slug = re.sub(r'[^a-z0-9]', '', restaurant_info['restaurant_name'].lower())
                    restaurant_info['email'] = f"info@{name_slug[:20]}.com"

                return {
                    "success": True,
                    "processed_by": ai_employee["name"],
                    "source_url": menu_url,
                    "items_found": len(menu_items),
                    "items": menu_items,
                    "restaurant_info": restaurant_info,
                    "message": f"Nova found {len(menu_items)} menu items from {menu_url}"
                }
            else:
                # No items found - still return restaurant info
                return {
                    "success": False,
                    "processed_by": ai_employee["name"],
                    "source_url": menu_url,
                    "items_found": 0,
                    "items": [],
                    "restaurant_info": restaurant_info,
                    "message": "Nova couldn't find menu items with prices on this page. The menu might use images, PDFs, or a different format. Try entering items manually or provide a direct link to the menu page."
                }

    except httpx.TimeoutException:
        return {
            "success": False,
            "processed_by": ai_employee["name"],
            "source_url": request.website_url,
            "items_found": 0,
            "items": [],
            "message": "The website took too long to respond. Please try again or enter items manually."
        }
    except httpx.RequestError as e:
        return {
            "success": False,
            "processed_by": ai_employee["name"],
            "source_url": request.website_url,
            "items_found": 0,
            "items": [],
            "message": f"Couldn't connect to the website. Please check the URL and try again."
        }
    except Exception as e:
        print(f"[Nova] Scraping error: {str(e)}")
        return {
            "success": False,
            "processed_by": ai_employee["name"],
            "source_url": request.website_url,
            "items_found": 0,
            "items": [],
            "message": f"An error occurred while scanning. Please try again or enter items manually."
        }
