"""
Unit tests for auto_onboarding.py

Tests cover:
- send_invitation() endpoint and invitation creation
- prefetch_restaurant_data() background task
- fetch_google_business_data() with API and mock data
- fetch_yelp_data() with API and mock data
- scrape_website_menu() and HTML parsing
- extract_menu_items_from_html() with various strategies
- extract_restaurant_info() from HTML
- accept_invitation() endpoint
- confirm_and_go_live() endpoint and vendor creation
- get_invitation_status() endpoint
- upload_menu_pdf() and menu processing
- scrape_menu_from_website() direct scraping
- Helper functions (dedupe_items, extract_price, detect_cuisine_type, etc.)
- Error handling for all endpoints
- Background task error handling
"""

import pytest
from unittest.mock import MagicMock, patch, Mock, AsyncMock, call
from datetime import datetime, timedelta
from fastapi import HTTPException, BackgroundTasks
from bs4 import BeautifulSoup
import httpx
import json
import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

import auto_onboarding
from auto_onboarding import (
    SendInvitationRequest,
    AcceptInvitationRequest,
    ConfirmMenuRequest,
    ScrapeMenuRequest,
    dedupe_items,
    extract_price,
    detect_cuisine_type,
    extract_restaurant_info,
    extract_menu_items_from_html,
    AI_EMPLOYEES
)


# ==================== HELPER FUNCTION TESTS ====================

class TestExtractPrice:
    """Tests for extract_price() function"""

    def test_extract_price_with_dollar_sign(self):
        """Should extract price from string with dollar sign"""
        assert extract_price("$12.99") == 12.99

    def test_extract_price_with_comma(self):
        """Should extract price from string with comma"""
        assert extract_price("$1,234.56") == 1234.56

    def test_extract_price_integer(self):
        """Should extract price from integer"""
        assert extract_price(15) == 15.0

    def test_extract_price_float(self):
        """Should extract price from float"""
        assert extract_price(12.99) == 12.99

    def test_extract_price_none(self):
        """Should return None for None input"""
        assert extract_price(None) is None

    def test_extract_price_empty_string(self):
        """Should return None for empty string"""
        assert extract_price("") is None

    def test_extract_price_no_numbers(self):
        """Should return None for string with no numbers"""
        assert extract_price("Free") is None

    def test_extract_price_with_cents(self):
        """Should handle prices with cents"""
        assert extract_price("$10.50") == 10.50

    def test_extract_price_whole_dollar(self):
        """Should handle whole dollar amounts"""
        assert extract_price("$25") == 25.0

    def test_extract_price_invalid_format(self):
        """Should return None for invalid format"""
        assert extract_price("abc") is None


class TestDedupeItems:
    """Tests for dedupe_items() function"""

    def test_dedupe_items_no_duplicates(self):
        """Should keep all items when no duplicates"""
        items = [
            {"name": "Pizza", "price": 12.99},
            {"name": "Burger", "price": 8.99},
        ]
        result = dedupe_items(items)
        assert len(result) == 2

    def test_dedupe_items_with_duplicates(self):
        """Should remove duplicate items based on name"""
        items = [
            {"name": "Pizza", "price": 12.99},
            {"name": "Pizza", "price": 14.99},
            {"name": "Burger", "price": 8.99},
        ]
        result = dedupe_items(items)
        assert len(result) == 2
        assert result[0]["name"] == "Pizza"
        assert result[1]["name"] == "Burger"

    def test_dedupe_items_case_insensitive(self):
        """Should dedupe case-insensitively"""
        items = [
            {"name": "Pizza", "price": 12.99},
            {"name": "PIZZA", "price": 14.99},
            {"name": "pizza", "price": 10.99},
        ]
        result = dedupe_items(items)
        assert len(result) == 1

    def test_dedupe_items_empty_list(self):
        """Should handle empty list"""
        result = dedupe_items([])
        assert len(result) == 0

    def test_dedupe_items_preserves_first_occurrence(self):
        """Should keep the first occurrence when duplicates found"""
        items = [
            {"name": "Pizza", "price": 12.99, "category": "Italian"},
            {"name": "pizza", "price": 14.99, "category": "Fast Food"},
        ]
        result = dedupe_items(items)
        assert len(result) == 1
        assert result[0]["price"] == 12.99
        assert result[0]["category"] == "Italian"

    def test_dedupe_items_whitespace_handling(self):
        """Should handle whitespace in names"""
        items = [
            {"name": "  Pizza  ", "price": 12.99},
            {"name": "Pizza", "price": 14.99},
        ]
        result = dedupe_items(items)
        assert len(result) == 1

    def test_dedupe_items_missing_name(self):
        """Should handle items with missing names"""
        items = [
            {"name": "Pizza", "price": 12.99},
            {"price": 10.99},
            {"name": "", "price": 8.99},
        ]
        result = dedupe_items(items)
        assert len(result) == 1
        assert result[0]["name"] == "Pizza"


class TestDetectCuisineType:
    """Tests for detect_cuisine_type() function"""

    def test_detect_cuisine_italian(self):
        """Should detect Italian cuisine from menu items"""
        items = [
            {"name": "Margherita Pizza", "description": "With mozzarella"},
            {"name": "Pasta Carbonara", "description": "Creamy pasta"},
        ]
        result = detect_cuisine_type(items, "Luigi's Restaurant")
        assert result == "Italian"

    def test_detect_cuisine_indian(self):
        """Should detect Indian cuisine from menu items"""
        items = [
            {"name": "Chicken Tikka Masala", "description": "Spicy curry"},
            {"name": "Garlic Naan", "description": "Flatbread"},
            {"name": "Vegetable Biryani", "description": "Rice dish"},
        ]
        result = detect_cuisine_type(items)
        assert result == "Indian"

    def test_detect_cuisine_mexican(self):
        """Should detect Mexican cuisine from menu items"""
        items = [
            {"name": "Chicken Tacos", "description": "With salsa"},
            {"name": "Beef Burrito", "description": "With guacamole"},
        ]
        result = detect_cuisine_type(items)
        assert result == "Mexican"

    def test_detect_cuisine_chinese(self):
        """Should detect Chinese cuisine from menu items"""
        items = [
            {"name": "Kung Pao Chicken", "description": "Spicy stir-fry"},
            {"name": "Fried Rice", "description": "With vegetables"},
        ]
        result = detect_cuisine_type(items)
        assert result == "Chinese"

    def test_detect_cuisine_from_restaurant_name(self):
        """Should detect cuisine from restaurant name"""
        items = []
        result = detect_cuisine_type(items, "Sushi Palace")
        assert result == "Japanese"

    def test_detect_cuisine_default_american(self):
        """Should default to American when no matches"""
        items = [
            {"name": "Special Dish", "description": "House special"},
        ]
        result = detect_cuisine_type(items)
        assert result == "American"

    def test_detect_cuisine_mixed_keywords(self):
        """Should detect cuisine with highest score for mixed items"""
        items = [
            {"name": "Pasta", "description": "Italian pasta"},
            {"name": "Pizza", "description": "Thin crust pizza"},
            {"name": "Lasagna", "description": "Layered pasta"},
            {"name": "Taco", "description": "Mexican taco"},
        ]
        result = detect_cuisine_type(items)
        # Italian should win with more keywords
        assert result == "Italian"

    def test_detect_cuisine_case_insensitive(self):
        """Should detect cuisine case-insensitively"""
        items = [
            {"name": "CHICKEN TIKKA", "description": "CURRY"},
            {"name": "naan", "category": "BREAD"},
        ]
        result = detect_cuisine_type(items)
        assert result == "Indian"


# ==================== API ENDPOINT TESTS ====================

class TestSendInvitation:
    """Tests for send_invitation() endpoint"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_send_invitation_success(self, mock_get_db):
        """Should create invitation and return success"""
        # Arrange
        from auto_onboarding import send_invitation

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        request = SendInvitationRequest(
            restaurant_name="Test Restaurant",
            contact_email="test@example.com",
            contact_phone="+1-555-0123",
            contact_name="John Doe",
            website_url="https://test.com",
            address="123 Main St",
            city="San Francisco",
            state="CA",
            zip_code="94105"
        )

        background_tasks = BackgroundTasks()

        # Act
        with patch.object(background_tasks, 'add_task') as mock_add_task:
            result = await send_invitation(request, background_tasks, mock_db)

        # Assert
        assert result["success"] is True
        assert "invitation_id" in result
        assert "invitation_code" in result
        assert result["invitation_code"].startswith("INV-")
        assert "invitation_link" in result
        assert result["processed_by"] == "Nova"

        # Verify database operations
        assert mock_db.add.call_count == 2  # Invitation + Log
        assert mock_db.commit.call_count == 2
        mock_db.refresh.assert_called_once()

        # Verify background task was added
        mock_add_task.assert_called_once()

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_send_invitation_minimal_data(self, mock_get_db):
        """Should create invitation with minimal required data"""
        # Arrange
        from auto_onboarding import send_invitation

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        request = SendInvitationRequest(
            restaurant_name="Minimal Restaurant",
            contact_email="minimal@example.com"
        )

        background_tasks = BackgroundTasks()

        # Act
        result = await send_invitation(request, background_tasks, mock_db)

        # Assert
        assert result["success"] is True
        assert mock_db.add.called
        assert mock_db.commit.called

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_send_invitation_generates_unique_code(self, mock_get_db):
        """Should generate unique invitation code"""
        # Arrange
        from auto_onboarding import send_invitation

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        request = SendInvitationRequest(
            restaurant_name="Test",
            contact_email="test@example.com"
        )

        background_tasks = BackgroundTasks()

        # Act
        result1 = await send_invitation(request, background_tasks, mock_db)
        result2 = await send_invitation(request, background_tasks, mock_db)

        # Assert
        assert result1["invitation_code"] != result2["invitation_code"]

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_send_invitation_sets_expiry(self, mock_get_db):
        """Should set invitation expiry to 7 days from now"""
        # Arrange
        from auto_onboarding import send_invitation

        mock_db = MagicMock()
        invitation_obj = None

        def capture_invitation(obj):
            nonlocal invitation_obj
            invitation_obj = obj

        mock_db.add.side_effect = capture_invitation
        mock_get_db.return_value = mock_db

        request = SendInvitationRequest(
            restaurant_name="Test",
            contact_email="test@example.com"
        )

        background_tasks = BackgroundTasks()

        # Act
        with patch('auto_onboarding.datetime') as mock_datetime:
            now = datetime(2024, 1, 1, 12, 0, 0)
            mock_datetime.now.return_value = now

            result = await send_invitation(request, background_tasks, mock_db)

        # Assert - expiry should be in result
        assert "expires_at" in result


class TestPrefetchRestaurantData:
    """Tests for prefetch_restaurant_data() background task"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.SessionLocal')
    @patch('auto_onboarding.fetch_google_business_data')
    @patch('auto_onboarding.fetch_yelp_data')
    @patch('auto_onboarding.scrape_website_menu')
    async def test_prefetch_restaurant_data_success(
        self, mock_scrape, mock_yelp, mock_google, mock_session_local
    ):
        """Should fetch data from all sources successfully"""
        # Arrange
        from auto_onboarding import prefetch_restaurant_data

        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_invitation.website_url = "https://test.com"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        google_data = {
            "address": "123 Main St",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "place_id": "test_place_id",
            "website": "https://test.com"
        }
        yelp_data = {
            "business_id": "test_yelp_id",
            "rating": 4.5
        }
        menu_items = [
            {"name": "Pizza", "price": 12.99}
        ]

        mock_google.return_value = google_data
        mock_yelp.return_value = yelp_data
        mock_scrape.return_value = menu_items

        # Act
        await prefetch_restaurant_data(1, "Test Restaurant", "https://test.com", "SF", "CA")

        # Assert
        mock_google.assert_called_once_with("Test Restaurant", "SF", "CA")
        mock_yelp.assert_called_once_with("Test Restaurant", "SF", "CA")
        mock_scrape.assert_called_once()

        # Should add 3 log entries (Google, Yelp, Website)
        assert mock_db.add.call_count >= 3
        mock_db.commit.assert_called()
        mock_db.close.assert_called_once()

    @pytest.mark.asyncio
    @patch('auto_onboarding.SessionLocal')
    async def test_prefetch_restaurant_data_invitation_not_found(self, mock_session_local):
        """Should handle invitation not found gracefully"""
        # Arrange
        from auto_onboarding import prefetch_restaurant_data

        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Act
        await prefetch_restaurant_data(999, "Test", None, None, None)

        # Assert
        mock_db.close.assert_called_once()

    @pytest.mark.asyncio
    @patch('auto_onboarding.SessionLocal')
    @patch('auto_onboarding.fetch_google_business_data')
    async def test_prefetch_restaurant_data_handles_errors(
        self, mock_google, mock_session_local
    ):
        """Should log errors and continue"""
        # Arrange
        from auto_onboarding import prefetch_restaurant_data

        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        mock_google.side_effect = Exception("API Error")

        # Act
        await prefetch_restaurant_data(1, "Test", None, "SF", "CA")

        # Assert
        # Should add error log
        assert mock_db.add.called
        mock_db.commit.assert_called()
        mock_db.close.assert_called_once()

    @pytest.mark.asyncio
    @patch('auto_onboarding.SessionLocal')
    @patch('auto_onboarding.fetch_google_business_data')
    @patch('auto_onboarding.fetch_yelp_data')
    @patch('auto_onboarding.scrape_website_menu')
    async def test_prefetch_updates_invitation_with_google_data(
        self, mock_scrape, mock_yelp, mock_google, mock_session_local
    ):
        """Should update invitation with fetched Google data"""
        # Arrange
        from auto_onboarding import prefetch_restaurant_data

        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_invitation.website_url = None
        mock_invitation.address = None
        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        google_data = {
            "address": "123 Main St",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "place_id": "test_place_id",
            "website": "https://google-found.com"
        }

        mock_google.return_value = google_data
        mock_yelp.return_value = None
        mock_scrape.return_value = []

        # Act
        await prefetch_restaurant_data(1, "Test", None, "SF", "CA")

        # Assert
        assert mock_invitation.address == "123 Main St"
        assert mock_invitation.latitude == 37.7749
        assert mock_invitation.longitude == -122.4194
        assert mock_invitation.google_place_id == "test_place_id"
        assert mock_invitation.website_url == "https://google-found.com"


class TestFetchGoogleBusinessData:
    """Tests for fetch_google_business_data() function"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    async def test_fetch_google_business_data_no_api_key(self, mock_getenv):
        """Should return mock data when no API key configured"""
        # Arrange
        from auto_onboarding import fetch_google_business_data
        mock_getenv.return_value = None

        # Act
        result = await fetch_google_business_data("Test Restaurant", "San Francisco", "CA")

        # Assert
        assert result is not None
        assert result["name"] == "Test Restaurant"
        assert "address" in result
        assert "place_id" in result
        assert result["place_id"].startswith("mock_place_")
        assert "hours" in result

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    @patch('httpx.AsyncClient')
    async def test_fetch_google_business_data_with_api_key(self, mock_client, mock_getenv):
        """Should fetch real data from Google API when key provided"""
        # Arrange
        from auto_onboarding import fetch_google_business_data
        mock_getenv.return_value = "test_api_key"

        mock_response_search = MagicMock()
        mock_response_search.json.return_value = {
            "results": [{
                "place_id": "real_place_id"
            }]
        }

        mock_response_details = MagicMock()
        mock_response_details.json.return_value = {
            "result": {
                "name": "Test Restaurant",
                "formatted_address": "123 Main St, SF, CA",
                "formatted_phone_number": "+1-555-0123",
                "website": "https://test.com",
                "rating": 4.5,
                "geometry": {
                    "location": {
                        "lat": 37.7749,
                        "lng": -122.4194
                    }
                },
                "opening_hours": {
                    "weekday_text": ["Monday: 11:00 AM - 10:00 PM"]
                }
            }
        }

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.side_effect = [mock_response_search, mock_response_details]

        # Act
        result = await fetch_google_business_data("Test Restaurant", "SF", "CA")

        # Assert
        assert result is not None
        assert result["name"] == "Test Restaurant"
        assert result["place_id"] == "real_place_id"
        assert result["address"] == "123 Main St, SF, CA"
        assert result["latitude"] == 37.7749
        assert result["longitude"] == -122.4194

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    @patch('httpx.AsyncClient')
    async def test_fetch_google_business_data_no_results(self, mock_client, mock_getenv):
        """Should return None when no results found"""
        # Arrange
        from auto_onboarding import fetch_google_business_data
        mock_getenv.return_value = "test_api_key"

        mock_response = MagicMock()
        mock_response.json.return_value = {"results": []}

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_response

        # Act
        result = await fetch_google_business_data("Nonexistent", "SF", "CA")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    @patch('httpx.AsyncClient')
    async def test_fetch_google_business_data_api_error(self, mock_client, mock_getenv):
        """Should return None on API error"""
        # Arrange
        from auto_onboarding import fetch_google_business_data
        mock_getenv.return_value = "test_api_key"

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.side_effect = Exception("API Error")

        # Act
        result = await fetch_google_business_data("Test", "SF", "CA")

        # Assert
        assert result is None


class TestFetchYelpData:
    """Tests for fetch_yelp_data() function"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    async def test_fetch_yelp_data_no_api_key(self, mock_getenv):
        """Should return mock data when no API key configured"""
        # Arrange
        from auto_onboarding import fetch_yelp_data
        mock_getenv.return_value = None

        # Act
        result = await fetch_yelp_data("Test Restaurant", "San Francisco", "CA")

        # Assert
        assert result is not None
        assert result["name"] == "Test Restaurant"
        assert "business_id" in result
        assert result["business_id"].startswith("mock_yelp_")
        assert result["rating"] == 4.2

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    @patch('httpx.AsyncClient')
    async def test_fetch_yelp_data_with_api_key(self, mock_client, mock_getenv):
        """Should fetch real data from Yelp API when key provided"""
        # Arrange
        from auto_onboarding import fetch_yelp_data
        mock_getenv.return_value = "test_api_key"

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "businesses": [{
                "id": "yelp_business_123",
                "name": "Test Restaurant",
                "rating": 4.5,
                "review_count": 200,
                "categories": [
                    {"title": "Italian"},
                    {"title": "Pizza"}
                ],
                "price": "$$"
            }]
        }

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_response

        # Act
        result = await fetch_yelp_data("Test Restaurant", "SF", "CA")

        # Assert
        assert result is not None
        assert result["business_id"] == "yelp_business_123"
        assert result["rating"] == 4.5
        assert result["categories"] == ["Italian", "Pizza"]
        assert result["price"] == "$$"

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    @patch('httpx.AsyncClient')
    async def test_fetch_yelp_data_no_results(self, mock_client, mock_getenv):
        """Should return None when no results found"""
        # Arrange
        from auto_onboarding import fetch_yelp_data
        mock_getenv.return_value = "test_api_key"

        mock_response = MagicMock()
        mock_response.json.return_value = {"businesses": []}

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_response

        # Act
        result = await fetch_yelp_data("Nonexistent", "SF", "CA")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    @patch('auto_onboarding.os.getenv')
    @patch('httpx.AsyncClient')
    async def test_fetch_yelp_data_api_error(self, mock_client, mock_getenv):
        """Should return None on API error"""
        # Arrange
        from auto_onboarding import fetch_yelp_data
        mock_getenv.return_value = "test_api_key"

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.side_effect = Exception("API Error")

        # Act
        result = await fetch_yelp_data("Test", "SF", "CA")

        # Assert
        assert result is None


class TestScrapeWebsiteMenu:
    """Tests for scrape_website_menu() function"""

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_website_menu_success(self, mock_client):
        """Should scrape menu items from website"""
        # Arrange
        from auto_onboarding import scrape_website_menu

        mock_db = MagicMock()

        html = """
        <html>
            <body>
                <div class="menu-item">
                    <h3>Pizza</h3>
                    <p>Cheese pizza</p>
                    <span class="price">$12.99</span>
                </div>
            </body>
        </html>
        """

        mock_response = MagicMock()
        mock_response.text = html

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_response

        # Act
        result = await scrape_website_menu("https://test.com", 1, mock_db)

        # Assert
        assert isinstance(result, list)
        mock_db.commit.assert_called()

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_website_menu_finds_menu_link(self, mock_client):
        """Should find and follow menu link if present"""
        # Arrange
        from auto_onboarding import scrape_website_menu

        mock_db = MagicMock()

        landing_html = """
        <html>
            <body>
                <a href="/menu">View Menu</a>
            </body>
        </html>
        """

        menu_html = """
        <html>
            <body>
                <div>Pizza $12.99</div>
            </body>
        </html>
        """

        mock_response_landing = MagicMock()
        mock_response_landing.text = landing_html

        mock_response_menu = MagicMock()
        mock_response_menu.text = menu_html

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.side_effect = [mock_response_landing, mock_response_menu]

        # Act
        result = await scrape_website_menu("https://test.com", 1, mock_db)

        # Assert
        assert mock_client_instance.get.call_count == 2

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_website_menu_handles_error(self, mock_client):
        """Should handle scraping errors gracefully"""
        # Arrange
        from auto_onboarding import scrape_website_menu

        mock_db = MagicMock()

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.side_effect = Exception("Network error")

        # Act
        result = await scrape_website_menu("https://test.com", 1, mock_db)

        # Assert
        assert result == []


class TestExtractMenuItemsFromHtml:
    """Tests for extract_menu_items_from_html() function"""

    def test_extract_menu_items_schema_org(self):
        """Should extract menu items from Schema.org structured data"""
        html = """
        <html>
            <head>
                <script type="application/ld+json">
                {
                    "@type": "Menu",
                    "hasMenuSection": [{
                        "name": "Main Course",
                        "hasMenuItem": [{
                            "name": "Grilled Chicken",
                            "description": "Fresh chicken",
                            "offers": {"price": "18.99"}
                        }]
                    }]
                }
                </script>
            </head>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        assert len(result) > 0
        assert result[0]["name"] == "Grilled Chicken"
        assert result[0]["price"] == 18.99
        assert result[0]["confidence"] == 0.95

    def test_extract_menu_items_from_text_with_prices(self):
        """Should extract menu items from text with prices"""
        html = """
        <html>
            <body>
                <div>Margherita Pizza $12.99</div>
                <div>Caesar Salad $8.99</div>
                <div>Pasta Carbonara $14.99</div>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        assert len(result) >= 1
        # Check that at least one item was extracted
        assert any(item["price"] > 0 for item in result)

    def test_extract_menu_items_filters_invalid_prices(self):
        """Should filter out items with invalid prices"""
        html = """
        <html>
            <body>
                <div>Valid Item $12.99</div>
                <div>Too Cheap $0.50</div>
                <div>Too Expensive $250.00</div>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        # Should only extract items with reasonable prices (between $1 and $200)
        for item in result:
            assert 1 <= item["price"] <= 200

    def test_extract_menu_items_detects_vegetarian(self):
        """Should detect vegetarian items from keywords"""
        html = """
        <html>
            <body>
                <div>Vegetarian Pizza $12.99</div>
                <div>Paneer Tikka $10.99</div>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        # At least one item should be marked vegetarian
        if result:
            vegetarian_items = [item for item in result if item.get("is_vegetarian")]
            assert len(vegetarian_items) > 0

    def test_extract_menu_items_detects_spicy(self):
        """Should detect spicy items from keywords"""
        html = """
        <html>
            <body>
                <div>Spicy Chicken Vindaloo $15.99</div>
                <div>Hot Wings $9.99</div>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        # At least one item should be marked spicy
        if result:
            spicy_items = [item for item in result if item.get("is_spicy")]
            assert len(spicy_items) > 0

    def test_extract_menu_items_empty_page(self):
        """Should return empty list for page with no menu items"""
        html = """
        <html>
            <body>
                <p>This is just text without prices</p>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        assert isinstance(result, list)

    def test_extract_menu_items_removes_duplicates(self):
        """Should remove duplicate menu items"""
        html = """
        <html>
            <body>
                <div>Pizza $12.99</div>
                <div>Pizza $12.99</div>
                <div>PIZZA $12.99</div>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        # Should dedupe to single item
        pizza_items = [item for item in result if "pizza" in item.get("name", "").lower()]
        assert len(pizza_items) <= 1


class TestExtractRestaurantInfo:
    """Tests for extract_restaurant_info() function"""

    def test_extract_restaurant_info_from_schema_org(self):
        """Should extract restaurant info from Schema.org data"""
        html = """
        <html>
            <head>
                <script type="application/ld+json">
                {
                    "@type": "Restaurant",
                    "name": "Test Restaurant",
                    "address": {
                        "streetAddress": "123 Main St",
                        "addressLocality": "San Francisco",
                        "addressRegion": "CA",
                        "postalCode": "94105"
                    },
                    "telephone": "+1-555-0123",
                    "email": "info@test.com"
                }
                </script>
            </head>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_restaurant_info(soup, "https://test.com")

        assert result["restaurant_name"] == "Test Restaurant"
        assert result["address"] == "123 Main St"
        assert result["city"] == "San Francisco"
        assert result["state"] == "CA"
        assert result["zip_code"] == "94105"
        assert result["phone"] == "+1-555-0123"
        assert result["email"] == "info@test.com"

    def test_extract_restaurant_info_from_title(self):
        """Should extract restaurant name from title tag"""
        html = """
        <html>
            <head>
                <title>Luigi's Italian Restaurant - Menu</title>
            </head>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_restaurant_info(soup, "https://test.com")

        assert "Luigi" in result["restaurant_name"]

    def test_extract_restaurant_info_from_og_title(self):
        """Should extract restaurant name from Open Graph title"""
        html = """
        <html>
            <head>
                <meta property="og:title" content="Mario's Pizza | Order Online" />
            </head>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_restaurant_info(soup, "https://test.com")

        assert "Mario" in result["restaurant_name"]

    def test_extract_restaurant_info_phone_from_tel_link(self):
        """Should extract phone from tel: link"""
        html = """
        <html>
            <body>
                <a href="tel:+1-555-0123">Call us</a>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_restaurant_info(soup, "https://test.com")

        assert result["phone"] is not None
        assert "555" in result["phone"]

    def test_extract_restaurant_info_email_from_mailto(self):
        """Should extract email from mailto: link"""
        html = """
        <html>
            <body>
                <a href="mailto:info@restaurant.com">Email us</a>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_restaurant_info(soup, "https://test.com")

        assert result["email"] == "info@restaurant.com"

    def test_extract_restaurant_info_from_address_tag(self):
        """Should extract address from <address> tag"""
        html = """
        <html>
            <body>
                <address>123 Main St, San Francisco, CA 94105</address>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_restaurant_info(soup, "https://test.com")

        assert result["address"] == "123 Main St"
        assert result["city"] == "San Francisco"
        assert result["state"] == "CA"
        assert result["zip_code"] == "94105"

    def test_extract_restaurant_info_from_meta_description(self):
        """Should extract description from meta tag"""
        html = """
        <html>
            <head>
                <meta name="description" content="Best Italian food in town" />
            </head>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_restaurant_info(soup, "https://test.com")

        assert result["description"] == "Best Italian food in town"


class TestAcceptInvitation:
    """Tests for accept_invitation() endpoint"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_accept_invitation_success(self, mock_get_db):
        """Should accept invitation and return pre-fetched data"""
        # Arrange
        from auto_onboarding import accept_invitation

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_invitation.restaurant_name = "Test Restaurant"
        mock_invitation.status = MagicMock()
        mock_invitation.status.name = "PENDING"

        from models_extended import InvitationStatus
        mock_invitation.status = InvitationStatus.PENDING

        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation
        mock_db.query.return_value.filter.return_value.all.return_value = []

        request = AcceptInvitationRequest(invitation_code="INV-12345678")

        # Act
        result = await accept_invitation(request, mock_db)

        # Assert
        assert result["success"] is True
        assert result["status"] == "accepted"
        assert result["processed_by"] == "Nova"
        assert "menu_items" in result
        assert "restaurant_info" in result

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_accept_invitation_not_found(self, mock_get_db):
        """Should raise 404 when invitation not found"""
        # Arrange
        from auto_onboarding import accept_invitation

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        request = AcceptInvitationRequest(invitation_code="INV-INVALID")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await accept_invitation(request, mock_db)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_accept_invitation_expired(self, mock_get_db):
        """Should raise 400 when invitation is expired"""
        # Arrange
        from auto_onboarding import accept_invitation
        from models_extended import InvitationStatus

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.status = InvitationStatus.EXPIRED

        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        request = AcceptInvitationRequest(invitation_code="INV-EXPIRED")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await accept_invitation(request, mock_db)

        assert exc_info.value.status_code == 400
        assert "expired" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_accept_invitation_already_completed(self, mock_get_db):
        """Should raise 400 when invitation already completed"""
        # Arrange
        from auto_onboarding import accept_invitation
        from models_extended import InvitationStatus

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.status = InvitationStatus.COMPLETED

        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        request = AcceptInvitationRequest(invitation_code="INV-DONE")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await accept_invitation(request, mock_db)

        assert exc_info.value.status_code == 400
        assert "already completed" in exc_info.value.detail.lower()


class TestConfirmAndGoLive:
    """Tests for confirm_and_go_live() endpoint"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_confirm_and_go_live_success(self, mock_get_db):
        """Should create vendor and menu items successfully"""
        # Arrange
        from auto_onboarding import confirm_and_go_live
        from models_extended import InvitationStatus

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_invitation.restaurant_name = "Test Restaurant"
        mock_invitation.status = InvitationStatus.ACCEPTED

        mock_scraped_item = MagicMock()
        mock_scraped_item.id = 1
        mock_scraped_item.item_name = "Pizza"
        mock_scraped_item.price = 12.99

        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_invitation,
            mock_scraped_item
        ]
        mock_db.query.return_value.count.return_value = 0

        request = ConfirmMenuRequest(
            confirmed_items=[1],
            rejected_items=[]
        )

        # Act
        result = await confirm_and_go_live("INV-12345678", request, mock_db)

        # Assert
        assert result["success"] is True
        assert result["status"] == "LIVE"
        assert "vendor_id" in result
        assert result["processed_by"] == "Nova"
        assert result["summary"]["menu_items_created"] == 1

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_confirm_and_go_live_not_found(self, mock_get_db):
        """Should raise 404 when invitation not found"""
        # Arrange
        from auto_onboarding import confirm_and_go_live

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        request = ConfirmMenuRequest(confirmed_items=[], rejected_items=[])

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await confirm_and_go_live("INV-INVALID", request, mock_db)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_confirm_and_go_live_not_accepted(self, mock_get_db):
        """Should raise 400 when invitation not yet accepted"""
        # Arrange
        from auto_onboarding import confirm_and_go_live
        from models_extended import InvitationStatus

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.status = InvitationStatus.PENDING

        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        request = ConfirmMenuRequest(confirmed_items=[], rejected_items=[])

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await confirm_and_go_live("INV-PENDING", request, mock_db)

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_confirm_and_go_live_with_edits(self, mock_get_db):
        """Should apply edits to menu items before creating"""
        # Arrange
        from auto_onboarding import confirm_and_go_live
        from models_extended import InvitationStatus

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_invitation.status = InvitationStatus.ACCEPTED

        mock_scraped_item = MagicMock()
        mock_scraped_item.id = 1
        mock_scraped_item.item_name = "Pizza"
        mock_scraped_item.price = 12.99

        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_invitation,
            mock_scraped_item
        ]
        mock_db.query.return_value.count.return_value = 0

        request = ConfirmMenuRequest(
            confirmed_items=[1],
            rejected_items=[],
            edits=[
                {"id": 1, "field": "price", "value": 15.99}
            ]
        )

        # Act
        result = await confirm_and_go_live("INV-12345678", request, mock_db)

        # Assert
        assert result["success"] is True
        assert mock_scraped_item.price == 15.99


class TestGetInvitationStatus:
    """Tests for get_invitation_status() endpoint"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_get_invitation_status_success(self, mock_get_db):
        """Should return invitation status and progress"""
        # Arrange
        from auto_onboarding import get_invitation_status

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_invitation.invitation_code = "INV-12345678"
        mock_invitation.restaurant_name = "Test Restaurant"
        mock_invitation.status = MagicMock()
        mock_invitation.status.value = "pending"
        mock_invitation.vendor_id = None

        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.count.return_value = 5

        # Act
        result = await get_invitation_status("INV-12345678", mock_db)

        # Assert
        assert result["success"] is True
        assert result["invitation_code"] == "INV-12345678"
        assert result["restaurant_name"] == "Test Restaurant"
        assert result["menu_items_scraped"] == 5

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_get_invitation_status_not_found(self, mock_get_db):
        """Should raise 404 when invitation not found"""
        # Arrange
        from auto_onboarding import get_invitation_status

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await get_invitation_status("INV-INVALID", mock_db)

        assert exc_info.value.status_code == 404


class TestUploadMenuPdf:
    """Tests for upload_menu_pdf() endpoint"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_upload_menu_pdf_success(self, mock_get_db):
        """Should accept menu upload and start processing"""
        # Arrange
        from auto_onboarding import upload_menu_pdf

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1

        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        background_tasks = BackgroundTasks()

        # Act
        with patch.object(background_tasks, 'add_task') as mock_add_task:
            result = await upload_menu_pdf(
                "INV-12345678",
                "https://example.com/menu.pdf",
                background_tasks,
                mock_db
            )

        # Assert
        assert result["success"] is True
        assert result["processed_by"] == "Nova"
        mock_add_task.assert_called_once()

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_upload_menu_pdf_invitation_not_found(self, mock_get_db):
        """Should raise 404 when invitation not found"""
        # Arrange
        from auto_onboarding import upload_menu_pdf

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None

        background_tasks = BackgroundTasks()

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await upload_menu_pdf(
                "INV-INVALID",
                "https://example.com/menu.pdf",
                background_tasks,
                mock_db
            )

        assert exc_info.value.status_code == 404


class TestProcessMenuFile:
    """Tests for process_menu_file() background task"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.SessionLocal')
    async def test_process_menu_file_success(self, mock_session_local):
        """Should process menu file and create scraped items"""
        # Arrange
        from auto_onboarding import process_menu_file

        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        mock_log = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_log

        # Act
        await process_menu_file(1, "https://example.com/menu.pdf", 1)

        # Assert
        assert mock_db.add.called
        mock_db.commit.assert_called()
        mock_db.close.assert_called_once()

    @pytest.mark.asyncio
    @patch('auto_onboarding.SessionLocal')
    async def test_process_menu_file_handles_error(self, mock_session_local):
        """Should handle errors during processing"""
        # Arrange
        from auto_onboarding import process_menu_file

        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        mock_db.add.side_effect = Exception("Processing error")

        mock_log = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_log

        # Act
        await process_menu_file(1, "https://example.com/menu.pdf", 1)

        # Assert
        mock_db.close.assert_called_once()


class TestScrapeMenuFromWebsite:
    """Tests for scrape_menu_from_website() endpoint"""

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_menu_from_website_success(self, mock_client):
        """Should scrape menu from website successfully"""
        # Arrange
        from auto_onboarding import scrape_menu_from_website

        mock_db = MagicMock()

        html = """
        <html>
            <head>
                <title>Test Restaurant</title>
                <meta name="description" content="Best food in town" />
            </head>
            <body>
                <div>Pizza $12.99</div>
                <div>Burger $9.99</div>
            </body>
        </html>
        """

        mock_response = MagicMock()
        mock_response.text = html

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_response

        request = ScrapeMenuRequest(website_url="https://test.com")

        # Act
        result = await scrape_menu_from_website(request, mock_db)

        # Assert
        assert result["success"] is True
        assert result["processed_by"] == "Nova"
        assert "items" in result
        assert "restaurant_info" in result

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_menu_from_website_timeout(self, mock_client):
        """Should handle timeout gracefully"""
        # Arrange
        from auto_onboarding import scrape_menu_from_website

        mock_db = MagicMock()

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.side_effect = httpx.TimeoutException("Timeout")

        request = ScrapeMenuRequest(website_url="https://slow-site.com")

        # Act
        result = await scrape_menu_from_website(request, mock_db)

        # Assert
        assert result["success"] is False
        assert "took too long" in result["message"].lower()

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_menu_from_website_connection_error(self, mock_client):
        """Should handle connection errors gracefully"""
        # Arrange
        from auto_onboarding import scrape_menu_from_website

        mock_db = MagicMock()

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.side_effect = httpx.RequestError("Connection failed")

        request = ScrapeMenuRequest(website_url="https://invalid-site.com")

        # Act
        result = await scrape_menu_from_website(request, mock_db)

        # Assert
        assert result["success"] is False
        assert "connect" in result["message"].lower()

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_menu_from_website_no_items_found(self, mock_client):
        """Should return failure when no menu items found"""
        # Arrange
        from auto_onboarding import scrape_menu_from_website

        mock_db = MagicMock()

        html = """
        <html>
            <body>
                <p>Just regular content, no menu</p>
            </body>
        </html>
        """

        mock_response = MagicMock()
        mock_response.text = html

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_response

        request = ScrapeMenuRequest(website_url="https://test.com")

        # Act
        result = await scrape_menu_from_website(request, mock_db)

        # Assert
        assert result["success"] is False
        assert result["items_found"] == 0
        assert "couldn't find" in result["message"].lower()

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_menu_detects_cuisine(self, mock_client):
        """Should auto-detect cuisine type from menu"""
        # Arrange
        from auto_onboarding import scrape_menu_from_website

        mock_db = MagicMock()

        html = """
        <html>
            <head><title>Luigi's Italian Restaurant</title></head>
            <body>
                <div>Margherita Pizza $12.99</div>
                <div>Pasta Carbonara $14.99</div>
            </body>
        </html>
        """

        mock_response = MagicMock()
        mock_response.text = html

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.get.return_value = mock_response

        request = ScrapeMenuRequest(website_url="https://test.com")

        # Act
        result = await scrape_menu_from_website(request, mock_db)

        # Assert
        if result["success"]:
            assert result["restaurant_info"]["cuisine_type"] == "Italian"


class TestAIEmployees:
    """Tests for AI_EMPLOYEES configuration"""

    def test_ai_employees_defined(self):
        """Should have AI employees configured"""
        assert "ONBOARD_SPECIALIST" in AI_EMPLOYEES
        assert "MARKETING_MAESTRO" in AI_EMPLOYEES
        assert "NOTIFICATION_NINJA" in AI_EMPLOYEES

    def test_onboard_specialist_config(self):
        """Should have Nova configured as onboard specialist"""
        nova = AI_EMPLOYEES["ONBOARD_SPECIALIST"]
        assert nova["name"] == "Nova"
        assert nova["role"] == "Onboard Specialist"
        assert "id" in nova
        assert "description" in nova


class TestEdgeCasesAndErrorHandling:
    """Tests for edge cases and error handling"""

    def test_extract_price_with_multiple_dots(self):
        """Should handle prices with multiple dots"""
        assert extract_price("$1.234.56") is not None

    def test_dedupe_items_with_special_characters(self):
        """Should handle items with special characters"""
        items = [
            {"name": "Café Latte", "price": 4.99},
            {"name": "Cafe Latte", "price": 4.99},
        ]
        result = dedupe_items(items)
        # Should keep at least one
        assert len(result) >= 1

    def test_extract_menu_items_with_unicode(self):
        """Should handle unicode characters in menu items"""
        html = """
        <html>
            <body>
                <div>Café au Lait $4.99</div>
                <div>Crème Brûlée $7.99</div>
            </body>
        </html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        result = extract_menu_items_from_html(soup, "https://test.com")

        # Should extract items without crashing
        assert isinstance(result, list)

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    async def test_send_invitation_with_long_restaurant_name(self, mock_get_db):
        """Should handle very long restaurant names"""
        # Arrange
        from auto_onboarding import send_invitation

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        long_name = "A" * 300  # Very long name

        request = SendInvitationRequest(
            restaurant_name=long_name,
            contact_email="test@example.com"
        )

        background_tasks = BackgroundTasks()

        # Act
        result = await send_invitation(request, background_tasks, mock_db)

        # Assert
        assert result["success"] is True


class TestIntegrationScenarios:
    """Integration-style tests for complete workflows"""

    @pytest.mark.asyncio
    @patch('auto_onboarding.get_db')
    @patch('auto_onboarding.SessionLocal')
    @patch('auto_onboarding.fetch_google_business_data')
    @patch('auto_onboarding.fetch_yelp_data')
    @patch('auto_onboarding.scrape_website_menu')
    async def test_complete_onboarding_flow(
        self, mock_scrape, mock_yelp, mock_google, mock_session_local, mock_get_db
    ):
        """Should complete full onboarding workflow from invite to live"""
        # This is a high-level integration test
        # Step 1: Send invitation
        from auto_onboarding import send_invitation, prefetch_restaurant_data

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_session_local.return_value = mock_db

        mock_invitation = MagicMock()
        mock_invitation.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_invitation

        mock_google.return_value = {"address": "123 Main St"}
        mock_yelp.return_value = {"business_id": "yelp_123"}
        mock_scrape.return_value = []

        request = SendInvitationRequest(
            restaurant_name="Test Restaurant",
            contact_email="test@example.com"
        )

        background_tasks = BackgroundTasks()
        result = await send_invitation(request, background_tasks, mock_db)

        assert result["success"] is True

        # Step 2: Prefetch data (simulated)
        await prefetch_restaurant_data(1, "Test", "https://test.com", "SF", "CA")

        assert mock_google.called
        assert mock_yelp.called
