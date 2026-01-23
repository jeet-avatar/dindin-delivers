#!/usr/bin/env python3
"""
Play Store Screenshot Capture Script
Captures mobile-optimized screenshots for Dollor.ai apps
"""

import os
import asyncio
from playwright.async_api import async_playwright

BASE_URL = 'https://www.dollor.ai'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Play Store phone dimensions (1080x1920 output at 2.625x scale)
PHONE_VIEWPORT = {'width': 412, 'height': 915}
DEVICE_SCALE = 2.625

# Screenshot configurations
SCREENSHOTS = {
    'customer': [
        {'name': '01-home', 'url': '/', 'wait': 2000},
        {'name': '02-restaurants', 'url': '/customer/restaurants', 'wait': 3000},
        {'name': '03-deals', 'url': '/customer/deals', 'wait': 2000},
        {'name': '04-rides', 'url': '/customer/rides', 'wait': 2000},
        {'name': '05-login', 'url': '/customer/login', 'wait': 2000},
    ],
    'driver': [
        {'name': '01-login', 'url': '/driver/login', 'wait': 2000},
        {'name': '02-orders', 'url': '/driver/orders', 'wait': 3000},
        {'name': '03-bidding', 'url': '/driver/bidding', 'wait': 2000},
        {'name': '04-earnings', 'url': '/driver/earnings', 'wait': 2000},
        {'name': '05-profile', 'url': '/driver/profile', 'wait': 2000},
    ],
    'partner': [
        {'name': '01-login', 'url': '/vendor/login', 'wait': 2000},
        {'name': '02-dashboard', 'url': '/vendor/dashboard', 'wait': 3000},
        {'name': '03-profile', 'url': '/vendor/profile', 'wait': 2000},
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

                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    await page.wait_for_timeout(screen['wait'])

                    filename = os.path.join(output_dir, f"{screen['name']}.png")
                    await page.screenshot(path=filename, full_page=False, type='png')

                    print(f"    ✅ Saved: {filename}")

                except Exception as e:
                    print(f"    ❌ Error: {str(e)}")

                await context.close()

        await browser.close()

    print('\n✅ Screenshot capture complete!')
    print('\n📁 Screenshots saved to:')
    for app_type in SCREENSHOTS.keys():
        print(f'   - store-assets/{app_type}/')


if __name__ == '__main__':
    asyncio.run(capture_screenshots())
