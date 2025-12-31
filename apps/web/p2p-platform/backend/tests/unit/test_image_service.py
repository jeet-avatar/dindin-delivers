"""
Unit tests for image_service.py

Tests cover:
- enhance_food_prompt_with_qwen() - Qwen/Ollama prompt enhancement
- generate_fallback_prompt() - Fallback prompt generation
- generate_image_replicate() - Replicate image generation (SDXL/FLUX)
- generate_image_runpod() - RunPod image generation
- generate_food_image() - Main image generation workflow
- scrape_restaurant_images() - Website image scraping
- scrape_menu_page() - Menu page scraping
- extract_dish_name_from_alt() - Alt text parsing
- match_scraped_image_to_menu_item() - Image matching
- calculate_image_quality_score() - Quality scoring
- VibingImageService.assign_image_to_menu_item() - Image assignment
- VibingImageService.process_menu_bulk() - Bulk processing
- VibingImageService.get_stats() - Statistics
- VibingImageService.get_image_tips() - Photography tips
- get_vibing_service() - Service singleton
- assign_image() - Quick helper function
"""

import pytest
from unittest.mock import MagicMock, patch, Mock, AsyncMock, call
import sys
import os
import asyncio
from datetime import datetime

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

import image_service


class TestEnhanceFoodPromptWithQwen:
    """Tests for enhance_food_prompt_with_qwen()"""

    @pytest.mark.asyncio
    @patch('image_service.OLLAMA_BASE_URL', 'http://localhost:11434')
    @patch('image_service.OLLAMA_MODEL', 'qwen2.5:32b')
    @patch('httpx.AsyncClient')
    async def test_enhance_prompt_success(self, mock_client_class):
        """Should enhance prompt using Qwen/Ollama successfully"""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "message": {
                "content": "Professional food photography of Butter Chicken, vibrant colors, garnished"
            }
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.enhance_food_prompt_with_qwen(
            "Butter Chicken", "indian", "Creamy tomato curry"
        )

        # Assert
        assert "Professional food photography of Butter Chicken" in result
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "http://localhost:11434/api/chat" in str(call_args)
        assert call_args[1]['json']['model'] == 'qwen2.5:32b'

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_enhance_prompt_ollama_error(self, mock_client_class):
        """Should fall back to generate_fallback_prompt on Ollama error"""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 500

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.enhance_food_prompt_with_qwen("Pizza", "italian")

        # Assert
        assert "Professional food photography" in result
        assert "Pizza" in result

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_enhance_prompt_exception(self, mock_client_class):
        """Should handle exceptions gracefully"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.post.side_effect = Exception("Connection timeout")
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.enhance_food_prompt_with_qwen("Tacos", "mexican")

        # Assert
        assert "Professional food photography" in result
        assert "Tacos" in result

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_enhance_prompt_empty_response(self, mock_client_class):
        """Should handle empty response from Ollama"""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": {"content": ""}}

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.enhance_food_prompt_with_qwen("Sushi", "japanese")

        # Assert
        assert result == ""


class TestGenerateFallbackPrompt:
    """Tests for generate_fallback_prompt()"""

    def test_fallback_prompt_indian_cuisine(self):
        """Should generate Indian-style prompt"""
        result = image_service.generate_fallback_prompt("Butter Chicken", "indian")

        assert "Butter Chicken" in result
        assert "vibrant colors" in result
        assert "professional styling" in result or "traditional" in result

    def test_fallback_prompt_italian_cuisine(self):
        """Should generate Italian-style prompt"""
        result = image_service.generate_fallback_prompt("Pizza Margherita", "italian")

        assert "Pizza Margherita" in result
        assert "basil" in result or "marble" in result

    def test_fallback_prompt_mexican_cuisine(self):
        """Should generate Mexican-style prompt"""
        result = image_service.generate_fallback_prompt("Tacos", "mexican")

        assert "Tacos" in result
        assert "colorful" in result or "lime" in result

    def test_fallback_prompt_general_cuisine(self):
        """Should generate general-style prompt"""
        result = image_service.generate_fallback_prompt("Burger", "general")

        assert "Burger" in result
        assert "Professional food photography" in result

    def test_fallback_prompt_unknown_cuisine(self):
        """Should default to general style for unknown cuisine"""
        result = image_service.generate_fallback_prompt("Test Dish", "unknown_cuisine")

        assert "Test Dish" in result
        assert "clean white plate" in result

    def test_fallback_prompt_with_description(self):
        """Should include description in prompt"""
        result = image_service.generate_fallback_prompt(
            "Pasta", "italian", "Fresh homemade pasta"
        )

        assert "Pasta" in result
        assert "Professional food photography" in result


class TestGenerateImageReplicate:
    """Tests for generate_image_replicate()"""

    @pytest.mark.asyncio
    @patch('image_service.REPLICATE_API_TOKEN', 'test_token_123')
    @patch('httpx.AsyncClient')
    async def test_generate_image_replicate_success(self, mock_client_class):
        """Should generate image via Replicate successfully"""
        # Arrange
        prediction_response = Mock()
        prediction_response.status_code = 201
        prediction_response.json.return_value = {"id": "pred_123"}

        status_response = Mock()
        status_response.json.return_value = {
            "status": "succeeded",
            "output": ["https://replicate.delivery/image123.png"]
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = prediction_response
        mock_client.get.return_value = status_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        with patch('asyncio.sleep', new_callable=AsyncMock):
            result = await image_service.generate_image_replicate("food prompt")

        # Assert
        assert result == "https://replicate.delivery/image123.png"
        mock_client.post.assert_called_once()
        assert mock_client.get.called

    @pytest.mark.asyncio
    @patch('image_service.REPLICATE_API_TOKEN', '')
    async def test_generate_image_replicate_no_token(self):
        """Should return None when no API token configured"""
        result = await image_service.generate_image_replicate("prompt")
        assert result is None

    @pytest.mark.asyncio
    @patch('image_service.REPLICATE_API_TOKEN', 'test_token')
    @patch('httpx.AsyncClient')
    async def test_generate_image_replicate_failed_prediction(self, mock_client_class):
        """Should handle failed prediction"""
        # Arrange
        prediction_response = Mock()
        prediction_response.status_code = 201
        prediction_response.json.return_value = {"id": "pred_123"}

        status_response = Mock()
        status_response.json.return_value = {
            "status": "failed",
            "error": "Model error"
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = prediction_response
        mock_client.get.return_value = status_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        with patch('asyncio.sleep', new_callable=AsyncMock):
            result = await image_service.generate_image_replicate("prompt")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    @patch('image_service.REPLICATE_API_TOKEN', 'test_token')
    @patch('httpx.AsyncClient')
    async def test_generate_image_replicate_error_response(self, mock_client_class):
        """Should handle error response from Replicate API"""
        # Arrange
        error_response = Mock()
        error_response.status_code = 500
        error_response.text = "Internal server error"

        mock_client = AsyncMock()
        mock_client.post.return_value = error_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.generate_image_replicate("prompt")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    @patch('image_service.REPLICATE_API_TOKEN', 'test_token')
    @patch('httpx.AsyncClient')
    async def test_generate_image_replicate_exception(self, mock_client_class):
        """Should handle exceptions"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.post.side_effect = Exception("Network error")
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.generate_image_replicate("prompt")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    @patch('image_service.REPLICATE_API_TOKEN', 'test_token')
    @patch('image_service.IMAGE_GEN_MODEL', 'sdxl')
    @patch('httpx.AsyncClient')
    async def test_generate_image_replicate_sdxl_model(self, mock_client_class):
        """Should use SDXL model when specified"""
        # Arrange
        prediction_response = Mock()
        prediction_response.status_code = 201
        prediction_response.json.return_value = {"id": "pred_123"}

        status_response = Mock()
        status_response.json.return_value = {
            "status": "succeeded",
            "output": ["https://replicate.delivery/sdxl.png"]
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = prediction_response
        mock_client.get.return_value = status_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        with patch('asyncio.sleep', new_callable=AsyncMock):
            result = await image_service.generate_image_replicate("prompt", model="sdxl")

        # Assert
        assert result == "https://replicate.delivery/sdxl.png"


class TestGenerateImageRunpod:
    """Tests for generate_image_runpod()"""

    @pytest.mark.asyncio
    @patch('image_service.RUNPOD_API_KEY', 'runpod_key')
    @patch('image_service.RUNPOD_ENDPOINT', 'https://api.runpod.io/endpoint')
    @patch('httpx.AsyncClient')
    async def test_generate_image_runpod_success(self, mock_client_class):
        """Should generate image via RunPod successfully"""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "output": {"image_url": "https://runpod.io/image.png"}
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.generate_image_runpod("food prompt")

        # Assert
        assert result == "https://runpod.io/image.png"
        mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    @patch('image_service.RUNPOD_API_KEY', '')
    @patch('image_service.RUNPOD_ENDPOINT', '')
    async def test_generate_image_runpod_not_configured(self):
        """Should return None when RunPod not configured"""
        result = await image_service.generate_image_runpod("prompt")
        assert result is None

    @pytest.mark.asyncio
    @patch('image_service.RUNPOD_API_KEY', 'key')
    @patch('image_service.RUNPOD_ENDPOINT', 'https://endpoint')
    @patch('httpx.AsyncClient')
    async def test_generate_image_runpod_error(self, mock_client_class):
        """Should handle error response"""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 500

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.generate_image_runpod("prompt")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    @patch('image_service.RUNPOD_API_KEY', 'key')
    @patch('image_service.RUNPOD_ENDPOINT', 'https://endpoint')
    @patch('httpx.AsyncClient')
    async def test_generate_image_runpod_exception(self, mock_client_class):
        """Should handle exceptions"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.post.side_effect = Exception("Connection failed")
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.generate_image_runpod("prompt")

        # Assert
        assert result is None


class TestGenerateFoodImage:
    """Tests for generate_food_image()"""

    @pytest.mark.asyncio
    @patch('image_service.RUNPOD_API_KEY', 'runpod_key')
    @patch('image_service.RUNPOD_ENDPOINT', 'https://runpod')
    @patch('image_service.generate_image_runpod')
    @patch('image_service.enhance_food_prompt_with_qwen')
    async def test_generate_food_image_runpod_priority(self, mock_enhance, mock_runpod):
        """Should prioritize RunPod over Replicate"""
        # Arrange
        mock_enhance.return_value = "enhanced prompt"
        mock_runpod.return_value = "https://runpod.io/image.png"

        # Act
        result = await image_service.generate_food_image("Pizza", "italian")

        # Assert
        assert result == "https://runpod.io/image.png"
        mock_enhance.assert_called_once_with("Pizza", "italian", "")
        mock_runpod.assert_called_once_with("enhanced prompt")

    @pytest.mark.asyncio
    @patch('image_service.RUNPOD_API_KEY', '')
    @patch('image_service.REPLICATE_API_TOKEN', 'replicate_token')
    @patch('image_service.generate_image_replicate')
    @patch('image_service.enhance_food_prompt_with_qwen')
    async def test_generate_food_image_replicate_fallback(self, mock_enhance, mock_replicate):
        """Should fall back to Replicate if RunPod not configured"""
        # Arrange
        mock_enhance.return_value = "enhanced prompt"
        mock_replicate.return_value = "https://replicate.delivery/image.png"

        # Act
        result = await image_service.generate_food_image("Burger")

        # Assert
        assert result == "https://replicate.delivery/image.png"
        mock_replicate.assert_called_once_with("enhanced prompt")

    @pytest.mark.asyncio
    @patch('image_service.RUNPOD_API_KEY', '')
    @patch('image_service.REPLICATE_API_TOKEN', '')
    @patch('image_service.enhance_food_prompt_with_qwen')
    async def test_generate_food_image_no_services(self, mock_enhance):
        """Should return None when no image generation services available"""
        # Arrange
        mock_enhance.return_value = "enhanced prompt"

        # Act
        result = await image_service.generate_food_image("Pasta")

        # Assert
        assert result is None


class TestScrapeRestaurantImages:
    """Tests for scrape_restaurant_images()"""

    @pytest.mark.asyncio
    async def test_scrape_images_empty_url(self):
        """Should return empty list for empty URL"""
        result = await image_service.scrape_restaurant_images("")
        assert result == []

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_images_success(self, mock_client_class):
        """Should scrape images from website successfully"""
        # Arrange
        html = """
        <html>
            <body>
                <img src="/menu/pizza.jpg" alt="Delicious Pizza" width="500" height="400">
                <img src="/food/pasta.jpg" alt="Fresh Pasta">
                <img src="/logo.png" alt="Logo" width="50">
            </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = html

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.scrape_restaurant_images("https://restaurant.com")

        # Assert
        assert len(result) >= 1
        assert any("pizza.jpg" in img["url"] for img in result)

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_images_filters_small_images(self, mock_client_class):
        """Should filter out small images"""
        # Arrange
        html = """
        <html>
            <img src="/menu/large.jpg" alt="Food" width="500">
            <img src="/icon.jpg" alt="Icon" width="50" height="50">
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = html

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.scrape_restaurant_images("https://restaurant.com")

        # Assert
        assert not any("icon.jpg" in img["url"] for img in result)

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_images_http_error(self, mock_client_class):
        """Should handle HTTP errors gracefully"""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 404

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.scrape_restaurant_images("https://restaurant.com")

        # Assert
        assert result == []

    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_scrape_images_exception(self, mock_client_class):
        """Should handle exceptions gracefully"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("Network error")
        mock_client_class.return_value.__aenter__.return_value = mock_client

        # Act
        result = await image_service.scrape_restaurant_images("https://restaurant.com")

        # Assert
        assert result == []


class TestScrapeMenuPage:
    """Tests for scrape_menu_page()"""

    @pytest.mark.asyncio
    async def test_scrape_menu_page_success(self):
        """Should scrape images from menu page"""
        # Arrange
        html = """
        <html>
            <img src="/dishes/burger.jpg" alt="Burger">
            <img src="/dishes/fries.jpg" alt="Fries">
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = html

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        # Act
        result = await image_service.scrape_menu_page("https://restaurant.com/menu", mock_client)

        # Assert
        assert len(result) == 2
        assert all(img["is_likely_food"] for img in result)
        assert all(img["source"] == "menu_page" for img in result)

    @pytest.mark.asyncio
    async def test_scrape_menu_page_http_error(self):
        """Should handle HTTP errors"""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 404

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        # Act
        result = await image_service.scrape_menu_page("https://restaurant.com/menu", mock_client)

        # Assert
        assert result == []

    @pytest.mark.asyncio
    async def test_scrape_menu_page_exception(self):
        """Should handle exceptions"""
        # Arrange
        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("Timeout")

        # Act
        result = await image_service.scrape_menu_page("https://restaurant.com/menu", mock_client)

        # Assert
        assert result == []


class TestExtractDishNameFromAlt:
    """Tests for extract_dish_name_from_alt()"""

    def test_extract_clean_dish_name(self):
        """Should return clean dish name"""
        assert image_service.extract_dish_name_from_alt("Burger") == "Burger"

    def test_extract_removes_image_suffix(self):
        """Should remove '-image' suffix"""
        assert image_service.extract_dish_name_from_alt("Pizza - image") == "Pizza"

    def test_extract_removes_photo_suffix(self):
        """Should remove 'photo' suffix"""
        assert image_service.extract_dish_name_from_alt("Pasta photo") == "Pasta"

    def test_extract_removes_picture_suffix(self):
        """Should remove 'picture' suffix"""
        assert image_service.extract_dish_name_from_alt("Salad picture") == "Salad"

    def test_extract_empty_alt_text(self):
        """Should return empty string for empty alt text"""
        assert image_service.extract_dish_name_from_alt("") == ""

    def test_extract_none_alt_text(self):
        """Should return empty string for None"""
        assert image_service.extract_dish_name_from_alt(None) == ""


class TestMatchScrapedImageToMenuItem:
    """Tests for match_scraped_image_to_menu_item()"""

    def test_match_exact_match(self):
        """Should match exact dish name"""
        scraped = [
            {"url": "img1.jpg", "alt_text": "Margherita Pizza", "is_likely_food": True},
            {"url": "img2.jpg", "alt_text": "Burger", "is_likely_food": True}
        ]

        result = image_service.match_scraped_image_to_menu_item(scraped, "Margherita Pizza")
        assert result == "img1.jpg"

    def test_match_partial_overlap(self):
        """Should match based on word overlap"""
        scraped = [
            {"url": "img1.jpg", "alt_text": "Spicy Chicken Wings", "potential_dish_name": "Chicken Wings", "is_likely_food": True}
        ]

        result = image_service.match_scraped_image_to_menu_item(scraped, "Buffalo Chicken Wings")
        assert result == "img1.jpg"

    def test_match_no_match(self):
        """Should return None when no match found"""
        scraped = [
            {"url": "img1.jpg", "alt_text": "Pizza", "is_likely_food": True}
        ]

        result = image_service.match_scraped_image_to_menu_item(scraped, "Burger")
        assert result is None

    def test_match_filters_non_food_images(self):
        """Should filter out non-food images"""
        scraped = [
            {"url": "logo.jpg", "alt_text": "Logo", "is_likely_food": False},
            {"url": "food.jpg", "alt_text": "Pizza", "is_likely_food": True}
        ]

        result = image_service.match_scraped_image_to_menu_item(scraped, "Logo")
        assert result is None

    def test_match_empty_list(self):
        """Should return None for empty list"""
        result = image_service.match_scraped_image_to_menu_item([], "Pizza")
        assert result is None


class TestCalculateImageQualityScore:
    """Tests for calculate_image_quality_score()"""

    def test_quality_score_unsplash(self):
        """Should give high score to Unsplash images"""
        score = image_service.calculate_image_quality_score("https://images.unsplash.com/photo-123")
        assert score >= 80

    def test_quality_score_pexels(self):
        """Should give high score to Pexels images"""
        score = image_service.calculate_image_quality_score("https://images.pexels.com/photo-123")
        assert score >= 80

    def test_quality_score_replicate(self):
        """Should give high score to Replicate images"""
        score = image_service.calculate_image_quality_score("https://replicate.delivery/image.png")
        assert score >= 80

    def test_quality_score_runpod(self):
        """Should give high score to RunPod images"""
        score = image_service.calculate_image_quality_score("https://runpod.io/image.png")
        assert score >= 80

    def test_quality_score_low_resolution(self):
        """Should penalize low-resolution images"""
        score = image_service.calculate_image_quality_score("https://example.com/thumb_64.jpg")
        assert score < 70

    def test_quality_score_high_resolution(self):
        """Should boost high-resolution images"""
        score = image_service.calculate_image_quality_score("https://example.com/original_2048.jpg")
        assert score >= 75

    def test_quality_score_valid_extension(self):
        """Should boost valid image extensions"""
        score = image_service.calculate_image_quality_score("https://example.com/image.jpg")
        assert score >= 70

    def test_quality_score_capped_at_100(self):
        """Should cap score at 100"""
        score = image_service.calculate_image_quality_score("https://images.unsplash.com/large_2048.png")
        assert score <= 100


class TestVibingImageService:
    """Tests for VibingImageService class"""

    @pytest.mark.asyncio
    @patch('image_service.get_stock_image_for_dish')
    async def test_assign_image_stock_fallback(self, mock_stock):
        """Should fall back to stock image when no other source available"""
        # Arrange
        mock_stock.return_value = "https://unsplash.com/stock.jpg"
        service = image_service.VibingImageService()

        # Act
        result = await service.assign_image_to_menu_item(
            "Pizza", use_ai_generation=False
        )

        # Assert
        assert result["image_url"] == "https://unsplash.com/stock.jpg"
        assert result["source"] == "stock"
        assert result["quality_score"] > 0
        assert result["generation_time_ms"] >= 0

    @pytest.mark.asyncio
    @patch('image_service.generate_food_image')
    @patch('image_service.get_stock_image_for_dish')
    async def test_assign_image_ai_generation(self, mock_stock, mock_ai):
        """Should use AI generation when enabled"""
        # Arrange
        mock_ai.return_value = "https://replicate.delivery/ai.png"
        service = image_service.VibingImageService()

        # Act
        result = await service.assign_image_to_menu_item(
            "Burger", cuisine_type="american", use_ai_generation=True
        )

        # Assert
        assert result["image_url"] == "https://replicate.delivery/ai.png"
        assert result["source"] == "ai_generated"
        assert result["quality_score"] == 90

    @pytest.mark.asyncio
    @patch('image_service.match_scraped_image_to_menu_item')
    @patch('image_service.calculate_image_quality_score')
    async def test_assign_image_scraped_match(self, mock_quality, mock_match):
        """Should use scraped image when good match found"""
        # Arrange
        mock_match.return_value = "https://restaurant.com/pasta.jpg"
        mock_quality.return_value = 75
        service = image_service.VibingImageService()

        scraped = [{"url": "https://restaurant.com/pasta.jpg", "alt_text": "Pasta"}]

        # Act
        result = await service.assign_image_to_menu_item(
            "Pasta", scraped_images=scraped
        )

        # Assert
        assert result["image_url"] == "https://restaurant.com/pasta.jpg"
        assert result["source"] == "scraped"
        assert result["quality_score"] == 75

    @pytest.mark.asyncio
    @patch('image_service.scrape_restaurant_images')
    @patch('image_service.get_stock_image_for_dish')
    async def test_process_menu_bulk(self, mock_stock, mock_scrape):
        """Should process multiple menu items"""
        # Arrange
        mock_scrape.return_value = []
        mock_stock.return_value = "https://unsplash.com/stock.jpg"

        service = image_service.VibingImageService()
        menu_items = [
            {"name": "Pizza", "description": "Cheese pizza"},
            {"name": "Burger", "description": "Beef burger"}
        ]

        # Act
        result = await service.process_menu_bulk(
            menu_items, cuisine_type="american", use_ai_generation=False
        )

        # Assert
        assert len(result) == 2
        assert all("image_url" in item for item in result)
        assert all("image_source" in item for item in result)

    def test_get_stats(self):
        """Should return generation statistics"""
        service = image_service.VibingImageService()
        service.generation_stats["ai_generated"] = 5
        service.generation_stats["stock"] = 10

        stats = service.get_stats()

        assert stats["ai_generated"] == 5
        assert stats["stock"] == 10
        assert "llm_backend" in stats
        assert "image_backend" in stats

    def test_get_image_tips(self):
        """Should return photography tips"""
        service = image_service.VibingImageService()
        tips = service.get_image_tips()

        assert "PHOTOGRAPHY TIPS" in tips
        assert "Natural light" in tips
        assert "VIBING" in tips


class TestConvenienceFunctions:
    """Tests for convenience functions"""

    def test_get_vibing_service_singleton(self):
        """Should return same instance on multiple calls"""
        service1 = image_service.get_vibing_service()
        service2 = image_service.get_vibing_service()

        assert service1 is service2

    @pytest.mark.asyncio
    @patch('image_service.get_stock_image_for_dish')
    async def test_assign_image_helper(self, mock_stock):
        """Should assign image using quick helper"""
        # Arrange
        mock_stock.return_value = "https://unsplash.com/image.jpg"

        # Reset singleton
        image_service._vibing_service = None

        # Act
        result = await image_service.assign_image("Pizza", "italian")

        # Assert
        assert result == "https://unsplash.com/image.jpg"
