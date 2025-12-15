"""
Vibing - Food Image Service
AI-powered food image management for EatFair platform

USES INTERNAL INFRASTRUCTURE ONLY:
- Qwen + Ollama for prompt enhancement (VibingTicket)
- Replicate SDXL/FLUX for image generation (self-hosted option available)
- NO OpenAI/DALL-E calls

This service provides:
1. AI Image Generation (SDXL via Replicate or RunPod)
2. Prompt Enhancement (Qwen/Ollama)
3. Website Image Scraping
4. Image Quality Scoring
5. Stock Image Assignment
"""

import os
import hashlib
import httpx
import base64
from typing import Optional, List, Dict, Tuple
from datetime import datetime
import json
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Stock images database (from stock_images.py)
from stock_images import get_stock_image_for_dish, STOCK_IMAGES

# ============================================================================
# CONFIGURATION - INTERNAL INFRASTRUCTURE ONLY
# ============================================================================

# Ollama/Qwen settings (VibingTicket)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:32b")

# Replicate settings (for image generation)
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN", "")

# RunPod settings (alternative to Replicate - self-hosted)
RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY", "")
RUNPOD_ENDPOINT = os.getenv("RUNPOD_ENDPOINT", "")

# Image generation model preference
IMAGE_GEN_MODEL = os.getenv("IMAGE_GEN_MODEL", "flux-schnell")  # flux-schnell, sdxl

# Image quality thresholds
QUALITY_EXCELLENT = 80
QUALITY_ACCEPTABLE = 60
QUALITY_POOR = 40


# ============================================================================
# QWEN/OLLAMA - PROMPT ENHANCEMENT
# ============================================================================

async def enhance_food_prompt_with_qwen(dish_name: str, cuisine_type: str = "general",
                                        description: str = "") -> str:
    """
    Use Qwen (via Ollama) to generate an optimized image generation prompt.
    This is our internal LLM - no external API calls.
    """

    system_prompt = """You are Vibing, an expert food photographer AI. Your job is to create
detailed prompts for generating appetizing food photography.

Create a single, detailed prompt for image generation. Include:
- Food presentation details
- Lighting (natural, warm, soft)
- Camera angle (45 degrees, overhead, close-up)
- Styling elements (garnish, props)
- Quality descriptors (professional, magazine-worthy)

Output ONLY the prompt, nothing else. No explanations."""

    user_prompt = f"""Create an image generation prompt for:
Dish: {dish_name}
Cuisine: {cuisine_type}
Description: {description if description else 'N/A'}

Generate a detailed, professional food photography prompt."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "stream": False,
                    "options": {
                        "num_predict": 300,
                        "temperature": 0.7
                    }
                }
            )

            if response.status_code == 200:
                data = response.json()
                enhanced_prompt = data.get("message", {}).get("content", "").strip()
                print(f"Vibing/Qwen: Enhanced prompt for '{dish_name}'")
                return enhanced_prompt
            else:
                print(f"Ollama error: {response.status_code}")
                return generate_fallback_prompt(dish_name, cuisine_type, description)

    except Exception as e:
        print(f"Qwen/Ollama exception: {str(e)}")
        return generate_fallback_prompt(dish_name, cuisine_type, description)


def generate_fallback_prompt(dish_name: str, cuisine_type: str = "general",
                            description: str = "") -> str:
    """
    Generate a prompt without LLM if Ollama is unavailable.
    Uses best practices from professional food photographers.
    """

    # Cuisine-specific styling
    cuisine_styles = {
        "indian": "vibrant colors, traditional copper or brass serving dish, colorful spices visible, fresh cilantro garnish, warm golden lighting",
        "italian": "elegant white marble surface, fresh basil garnish, olive oil drizzle, rustic Italian ceramic, natural window light",
        "mexican": "colorful presentation, fresh lime wedges, cilantro, on rustic wooden board, vibrant colors, festive styling",
        "chinese": "traditional ceramic bowl, chopsticks beside, steam rising, red and gold accents, dramatic lighting",
        "japanese": "minimalist zen presentation, ceramic plate, wasabi and ginger garnish, chopsticks, clean aesthetic",
        "american": "rustic wooden table, casual diner style, generous portions, comfort food feel, warm lighting",
        "thai": "vibrant colors, fresh Thai basil, lime wedges, served in traditional bowl, aromatic steam",
        "mediterranean": "olive oil drizzle, fresh herbs, feta cheese, colorful vegetables, sun-drenched styling",
        "general": "clean white plate, professional styling, appetizing presentation, soft natural light"
    }

    style = cuisine_styles.get(cuisine_type.lower(), cuisine_styles["general"])

    prompt = f"""Professional food photography of {dish_name}, {style},
45-degree angle shot, shallow depth of field with soft bokeh background,
garnished professionally, steam visible if hot dish, high-end restaurant presentation,
8K quality, magazine-worthy, Bon Appetit style, appetizing and mouthwatering"""

    return prompt


# ============================================================================
# IMAGE GENERATION - REPLICATE (SDXL/FLUX)
# ============================================================================

async def generate_image_replicate(prompt: str, model: str = None) -> Optional[str]:
    """
    Generate a food image using Replicate (SDXL or FLUX).
    This uses our Replicate account - not OpenAI.

    Models:
    - flux-schnell: Fast, ~$0.003 per image
    - sdxl: Higher quality, ~$0.003 per image
    """
    if not REPLICATE_API_TOKEN:
        print("Replicate: No API token configured")
        return None

    model_name = model or IMAGE_GEN_MODEL

    # Model endpoints
    models = {
        "flux-schnell": "black-forest-labs/flux-schnell",
        "sdxl": "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"
    }

    model_id = models.get(model_name, models["flux-schnell"])

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Start prediction
            response = await client.post(
                "https://api.replicate.com/v1/predictions",
                headers={
                    "Authorization": f"Token {REPLICATE_API_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "version": model_id.split(":")[1] if ":" in model_id else None,
                    "input": {
                        "prompt": prompt,
                        "width": 1024,
                        "height": 1024,
                        "num_outputs": 1,
                        "guidance_scale": 7.5,
                        "num_inference_steps": 25
                    }
                }
            )

            if response.status_code != 201:
                print(f"Replicate error: {response.status_code} - {response.text}")
                return None

            prediction = response.json()
            prediction_id = prediction.get("id")

            # Poll for completion
            max_attempts = 60
            for _ in range(max_attempts):
                await asyncio.sleep(2)

                status_response = await client.get(
                    f"https://api.replicate.com/v1/predictions/{prediction_id}",
                    headers={"Authorization": f"Token {REPLICATE_API_TOKEN}"}
                )

                status_data = status_response.json()
                status = status_data.get("status")

                if status == "succeeded":
                    output = status_data.get("output")
                    if output and len(output) > 0:
                        image_url = output[0] if isinstance(output, list) else output
                        print(f"Replicate: Generated image with {model_name}")
                        return image_url
                    break
                elif status == "failed":
                    print(f"Replicate: Generation failed - {status_data.get('error')}")
                    return None

            return None

    except Exception as e:
        print(f"Replicate exception: {str(e)}")
        return None


# ============================================================================
# IMAGE GENERATION - RUNPOD (SELF-HOSTED SD)
# ============================================================================

async def generate_image_runpod(prompt: str) -> Optional[str]:
    """
    Generate a food image using RunPod (self-hosted Stable Diffusion).
    This is our own infrastructure - completely self-hosted.
    """
    if not RUNPOD_API_KEY or not RUNPOD_ENDPOINT:
        print("RunPod: Not configured")
        return None

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                RUNPOD_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {RUNPOD_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "input": {
                        "prompt": prompt,
                        "negative_prompt": "blurry, low quality, distorted, ugly, bad anatomy",
                        "width": 1024,
                        "height": 1024,
                        "num_inference_steps": 30,
                        "guidance_scale": 7.5
                    }
                }
            )

            if response.status_code == 200:
                data = response.json()
                image_url = data.get("output", {}).get("image_url")
                if image_url:
                    print(f"RunPod: Generated image successfully")
                    return image_url

            return None

    except Exception as e:
        print(f"RunPod exception: {str(e)}")
        return None


# ============================================================================
# MAIN IMAGE GENERATION FUNCTION
# ============================================================================

async def generate_food_image(dish_name: str, cuisine_type: str = "general",
                              description: str = "") -> Optional[str]:
    """
    Generate a food image using our internal infrastructure:
    1. Qwen/Ollama enhances the prompt
    2. Replicate or RunPod generates the image

    NO OpenAI/DALL-E calls.
    """

    # Step 1: Enhance prompt with Qwen
    prompt = await enhance_food_prompt_with_qwen(dish_name, cuisine_type, description)

    # Step 2: Try RunPod first (self-hosted)
    if RUNPOD_API_KEY and RUNPOD_ENDPOINT:
        image_url = await generate_image_runpod(prompt)
        if image_url:
            return image_url

    # Step 3: Fall back to Replicate
    if REPLICATE_API_TOKEN:
        image_url = await generate_image_replicate(prompt)
        if image_url:
            return image_url

    # Step 4: No image generation available
    print("Vibing: No image generation service configured, using stock images")
    return None


# ============================================================================
# WEBSITE IMAGE SCRAPING
# ============================================================================

async def scrape_restaurant_images(website_url: str) -> List[Dict]:
    """
    Scrape food images from a restaurant's website.
    Returns list of {url, alt_text, potential_dish_name}.
    """
    if not website_url:
        return []

    images = []

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            # Add headers to look like a browser
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            }
            response = await client.get(website_url, headers=headers)

            if response.status_code != 200:
                return []

            soup = BeautifulSoup(response.text, 'html.parser')

            # Find all images
            for img in soup.find_all('img'):
                src = img.get('src', '')
                alt = img.get('alt', '')

                if not src:
                    continue

                # Make absolute URL
                full_url = urljoin(website_url, src)

                # Filter for likely food images
                food_keywords = ['menu', 'food', 'dish', 'plate', 'meal', 'cuisine',
                               'appetizer', 'entree', 'dessert', 'drink', 'special']

                is_food_image = any(kw in src.lower() or kw in alt.lower()
                                   for kw in food_keywords)

                # Check image dimensions (skip tiny images)
                width = img.get('width', '')
                height = img.get('height', '')

                try:
                    if width and int(width) < 100:
                        continue
                    if height and int(height) < 100:
                        continue
                except:
                    pass

                # Skip common non-food images
                skip_patterns = ['logo', 'icon', 'button', 'social', 'banner',
                               'header', 'footer', 'background', 'avatar']
                if any(p in src.lower() for p in skip_patterns):
                    continue

                images.append({
                    "url": full_url,
                    "alt_text": alt,
                    "potential_dish_name": extract_dish_name_from_alt(alt),
                    "is_likely_food": is_food_image
                })

            # Also look for menu page links and scrape those
            menu_links = soup.find_all('a', href=True)
            for link in menu_links:
                href = link.get('href', '').lower()
                if 'menu' in href:
                    menu_url = urljoin(website_url, link['href'])
                    # Recursively scrape menu page (with depth limit)
                    menu_images = await scrape_menu_page(menu_url, client)
                    images.extend(menu_images)
                    break  # Only process first menu link

    except Exception as e:
        print(f"Scraping error for {website_url}: {str(e)}")

    return images


async def scrape_menu_page(menu_url: str, client: httpx.AsyncClient) -> List[Dict]:
    """Scrape images specifically from a menu page."""
    images = []

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        response = await client.get(menu_url, headers=headers)

        if response.status_code != 200:
            return []

        soup = BeautifulSoup(response.text, 'html.parser')

        for img in soup.find_all('img'):
            src = img.get('src', '')
            alt = img.get('alt', '')

            if not src:
                continue

            full_url = urljoin(menu_url, src)

            images.append({
                "url": full_url,
                "alt_text": alt,
                "potential_dish_name": extract_dish_name_from_alt(alt),
                "is_likely_food": True,
                "source": "menu_page"
            })

    except Exception as e:
        print(f"Menu page scraping error: {str(e)}")

    return images


def extract_dish_name_from_alt(alt_text: str) -> str:
    """Extract likely dish name from image alt text."""
    if not alt_text:
        return ""

    # Remove common suffixes
    alt_text = re.sub(r'\s*-\s*image$', '', alt_text, flags=re.IGNORECASE)
    alt_text = re.sub(r'\s*photo$', '', alt_text, flags=re.IGNORECASE)
    alt_text = re.sub(r'\s*picture$', '', alt_text, flags=re.IGNORECASE)

    return alt_text.strip()


def match_scraped_image_to_menu_item(scraped_images: List[Dict],
                                      menu_item_name: str) -> Optional[str]:
    """
    Find the best matching scraped image for a menu item.
    Returns image URL or None.
    """
    menu_name_lower = menu_item_name.lower()
    menu_words = set(menu_name_lower.split())

    best_match = None
    best_score = 0

    for img in scraped_images:
        if not img.get('is_likely_food', False):
            continue

        alt = img.get('alt_text', '').lower()
        dish_name = img.get('potential_dish_name', '').lower()

        # Calculate match score
        score = 0

        # Exact match
        if menu_name_lower in alt or menu_name_lower in dish_name:
            score = 100
        else:
            # Word overlap
            alt_words = set(alt.split())
            dish_words = set(dish_name.split())

            overlap = menu_words & (alt_words | dish_words)
            score = len(overlap) * 25

        if score > best_score:
            best_score = score
            best_match = img['url']

    # Only return if reasonable match (at least one word matches)
    if best_score >= 25:
        return best_match

    return None


# ============================================================================
# IMAGE QUALITY SCORING
# ============================================================================

def calculate_image_quality_score(image_url: str) -> int:
    """
    Calculate quality score for an image (0-100).
    """
    # Base score
    score = 70

    # Boost for known high-quality sources
    if 'unsplash.com' in image_url:
        score += 15
    elif 'pexels.com' in image_url:
        score += 12
    elif 'replicate.delivery' in image_url:
        score += 15  # AI-generated via Replicate
    elif 'runpod' in image_url.lower():
        score += 15  # AI-generated via RunPod
    elif 'amazonaws.com' in image_url or 'cloudinary.com' in image_url:
        score += 10

    # Penalize low-resolution indicators
    if any(p in image_url.lower() for p in ['thumb', 'small', 'tiny', 'icon', '64', '128']):
        score -= 30

    # Boost for high-resolution indicators
    if any(p in image_url.lower() for p in ['large', 'original', 'full', '1024', '2048']):
        score += 10

    # Check file extension
    if image_url.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        score += 5

    return max(0, min(100, score))


# ============================================================================
# VIBING - MAIN IMAGE ASSIGNMENT WORKFLOW
# ============================================================================

import asyncio

class VibingImageService:
    """
    Vibing - AI Food Image Specialist

    Uses INTERNAL infrastructure only:
    - Qwen/Ollama for prompt enhancement
    - Replicate/RunPod for image generation
    - NO OpenAI calls
    """

    def __init__(self):
        self.generation_stats = {
            "ai_generated": 0,
            "scraped": 0,
            "stock": 0,
            "vendor_uploaded": 0
        }
        self.llm_backend = "qwen/ollama"
        self.image_backend = "replicate" if REPLICATE_API_TOKEN else ("runpod" if RUNPOD_API_KEY else "stock_only")

    async def assign_image_to_menu_item(
        self,
        menu_item_name: str,
        cuisine_type: str = "general",
        description: str = "",
        restaurant_website: str = "",
        use_ai_generation: bool = True,
        scraped_images: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Main workflow to assign an image to a menu item.

        Priority:
        1. Match from scraped website images
        2. Generate with AI (Replicate/RunPod + Qwen)
        3. Fall back to stock images
        """
        start_time = datetime.now()
        result = {
            "image_url": "",
            "source": "",
            "quality_score": 0,
            "generation_time_ms": 0,
            "llm_backend": self.llm_backend,
            "image_backend": self.image_backend
        }

        # Step 1: Try to match from scraped images
        if scraped_images:
            matched_url = match_scraped_image_to_menu_item(scraped_images, menu_item_name)
            if matched_url:
                quality = calculate_image_quality_score(matched_url)
                if quality >= QUALITY_ACCEPTABLE:
                    result["image_url"] = matched_url
                    result["source"] = "scraped"
                    result["quality_score"] = quality
                    self.generation_stats["scraped"] += 1
                    print(f"Vibing: Matched scraped image for '{menu_item_name}' (quality: {quality})")

        # Step 2: Try AI generation if no scraped match
        if not result["image_url"] and use_ai_generation:
            ai_url = await generate_food_image(menu_item_name, cuisine_type, description)
            if ai_url:
                result["image_url"] = ai_url
                result["source"] = "ai_generated"
                result["quality_score"] = 90  # AI images are typically high quality
                self.generation_stats["ai_generated"] += 1
                print(f"Vibing: Generated AI image for '{menu_item_name}'")

        # Step 3: Fall back to stock image
        if not result["image_url"]:
            stock_url = get_stock_image_for_dish(menu_item_name)
            result["image_url"] = stock_url
            result["source"] = "stock"
            result["quality_score"] = calculate_image_quality_score(stock_url)
            self.generation_stats["stock"] += 1
            print(f"Vibing: Assigned stock image for '{menu_item_name}'")

        # Calculate total time
        result["generation_time_ms"] = int((datetime.now() - start_time).total_seconds() * 1000)

        return result

    async def process_menu_bulk(
        self,
        menu_items: List[Dict],
        cuisine_type: str = "general",
        restaurant_website: str = "",
        use_ai_generation: bool = True
    ) -> List[Dict]:
        """
        Process multiple menu items at once.
        """
        # First, scrape restaurant website for images
        scraped_images = []
        if restaurant_website:
            print(f"Vibing: Scraping images from {restaurant_website}")
            scraped_images = await scrape_restaurant_images(restaurant_website)
            print(f"Vibing: Found {len(scraped_images)} potential images")

        results = []
        for item in menu_items:
            image_result = await self.assign_image_to_menu_item(
                menu_item_name=item.get("name", ""),
                cuisine_type=cuisine_type,
                description=item.get("description", ""),
                restaurant_website=restaurant_website,
                use_ai_generation=use_ai_generation,
                scraped_images=scraped_images
            )

            results.append({
                **item,
                "image_url": image_result["image_url"],
                "image_source": image_result["source"],
                "image_quality_score": image_result["quality_score"]
            })

        print(f"Vibing: Processed {len(results)} menu items")
        print(f"Stats: {self.generation_stats}")

        return results

    def get_stats(self) -> Dict:
        """Return image generation statistics."""
        return {
            **self.generation_stats,
            "llm_backend": self.llm_backend,
            "image_backend": self.image_backend
        }

    def get_image_tips(self) -> str:
        """Return photography tips for vendors."""
        return """
📸 FOOD PHOTOGRAPHY TIPS FROM VIBING

📱 PHONE PHOTOGRAPHY:
1. Natural light is your friend - shoot near windows
2. Turn off flash - it makes food look flat
3. Shoot at a 45° angle or directly overhead
4. Clean the lens! Grease ruins photos
5. Use portrait mode for that blurry background
6. Edit: boost saturation +10, add a slight warm filter

🍽️ STYLING TIPS:
1. Fresh garnish makes everything pop
2. Wipe plate edges clean before shooting
3. Add height to flat dishes (stack, prop up)
4. Include utensils or hands for scale
5. Steam = freshness (works for 30 seconds!)

📤 UPLOAD REQUIREMENTS:
- Minimum 1200x800 pixels
- JPEG or PNG format
- Well-lit, in-focus, appetizing
- Food should fill 60-70% of frame

🤖 VIBING INFRASTRUCTURE:
- LLM: Qwen via Ollama (VibingTicket)
- Image Gen: Replicate/RunPod (self-hosted options)
- NO OpenAI/DALL-E - fully internal!
"""


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

_vibing_service = None

def get_vibing_service() -> VibingImageService:
    """Get or create the Vibing image service instance."""
    global _vibing_service
    if _vibing_service is None:
        _vibing_service = VibingImageService()
    return _vibing_service


async def assign_image(menu_item_name: str, cuisine_type: str = "general") -> str:
    """Quick helper to assign an image to a menu item."""
    service = get_vibing_service()
    result = await service.assign_image_to_menu_item(menu_item_name, cuisine_type)
    return result["image_url"]
