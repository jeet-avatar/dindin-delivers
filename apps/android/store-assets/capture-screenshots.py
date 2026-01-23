#!/usr/bin/env python3
"""
Play Store Screenshot Capture Script
Captures mobile-optimized screenshots for Dollor.ai apps

Google Play Store Requirements:
- Aspect ratio: 16:9 to 9:16 (we use 9:16 = 1080x1920)
- Min dimension: 320px
- Max dimension: 3840px
- Format: JPEG or 24-bit PNG
"""

import os
import asyncio
from playwright.async_api import async_playwright

BASE_URL = 'https://www.dollor.ai'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Play Store phone dimensions - exactly 1080x1920 (9:16 aspect ratio)
PHONE_VIEWPORT = {'width': 360, 'height': 640}
DEVICE_SCALE = 3.0  # 360*3=1080, 640*3=1920

# Screenshot configurations - updated with better pages
SCREENSHOTS = {
    'customer': [
        {'name': '01-home', 'url': '/', 'wait': 3000},
        {'name': '02-restaurants', 'url': '/customer/restaurants', 'wait': 4000},
        {'name': '03-deals', 'url': '/customer/deals', 'wait': 3000},
        {'name': '04-rides', 'url': '/customer/rides', 'wait': 3000},
        {'name': '05-login', 'url': '/customer/login', 'wait': 2000},
    ],
    'driver': [
        {'name': '01-login', 'url': '/driver/login', 'wait': 3000},
        {'name': '02-dashboard', 'url': '/driver/dashboard', 'wait': 4000},
        {'name': '03-bidding', 'url': '/driver/bidding', 'wait': 3000},
        {'name': '04-earnings', 'url': '/driver/earnings', 'wait': 3000},
        {'name': '05-profile', 'url': '/driver/profile', 'wait': 3000},
    ],
    'partner': [
        {'name': '01-login', 'url': '/vendor/login', 'wait': 3000},
        {'name': '02-dashboard', 'url': '/vendor/dashboard', 'wait': 4000},
        {'name': '03-settings', 'url': '/vendor/settings', 'wait': 3000},
    ],
}


async def capture_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for app_type, screens in SCREENSHOTS.items():
            output_dir = os.path.join(SCRIPT_DIR, app_type)
            os.makedirs(output_dir, exist_ok=True)

            print(f"\n📱 Capturing {app_type} screenshots...")

            for screen in screens:
                context = await browser.new_context(
                    viewport=PHONE_VIEWPORT,
                    device_scale_factor=DEVICE_SCALE,
                    user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
                    is_mobile=True,
                    has_touch=True,
                )

                page = await context.new_page()

                try:
                    url = f"{BASE_URL}{screen['url']}"
                    print(f"  📸 {screen['name']}: {url}")

                    await page.goto(url, wait_until='networkidle', timeout=45000)

                    # Wait for content to load
                    await page.wait_for_timeout(screen['wait'])

                    # Scroll slightly to trigger lazy loading
                    await page.evaluate('window.scrollBy(0, 100)')
                    await page.wait_for_timeout(500)
                    await page.evaluate('window.scrollTo(0, 0)')
                    await page.wait_for_timeout(500)

                    filename = os.path.join(output_dir, f"{screen['name']}.png")
                    await page.screenshot(path=filename, full_page=False, type='png')

                    # Verify file size (blank images are very small)
                    file_size = os.path.getsize(filename)
                    if file_size < 50000:  # Less than 50KB is suspicious
                        print(f"    ⚠️  Warning: Small file size ({file_size} bytes) - may be blank")
                    else:
                        print(f"    ✅ Saved: {filename} ({file_size // 1024}KB)")

                except Exception as e:
                    print(f"    ❌ Error: {str(e)}")

                await context.close()

        await browser.close()

    print('\n✅ Screenshot capture complete!')
    print('\n📁 Screenshots saved to:')
    for app_type in SCREENSHOTS.keys():
        print(f'   - store-assets/{app_type}/')

    print('\n📐 Dimensions: 1080x1920 (9:16 aspect ratio)')
    print('✓ Meets Google Play Store requirements')


if __name__ == '__main__':
    asyncio.run(capture_screenshots())
