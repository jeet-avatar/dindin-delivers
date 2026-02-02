const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.dollor.ai';

// Play Store phone dimensions (1080x1920 is standard, but we'll use 412x915 viewport which scales to that)
const PHONE_VIEWPORT = { width: 412, height: 915, deviceScaleFactor: 2.625 };

// Screenshot configurations for each app
const screenshots = {
  customer: [
    { name: '01-home', url: '/', waitFor: '.landing-page, .hero-section, h1' },
    { name: '02-restaurants', url: '/customer/restaurants', waitFor: '.restaurant-card, .restaurant-list, .MuiCard-root' },
    { name: '03-deals', url: '/customer/deals', waitFor: '.deals, .deal-card, h1' },
    { name: '04-ride-booking', url: '/customer/rides', waitFor: '.ride-booking, .map, h1' },
    { name: '05-login', url: '/customer/login', waitFor: 'form, input, button' },
  ],
  driver: [
    { name: '01-login', url: '/driver/login', waitFor: 'form, input, button' },
    { name: '02-available-orders', url: '/driver/orders', waitFor: '.order-card, .available-orders, h1' },
    { name: '03-bidding', url: '/driver/bidding', waitFor: '.bidding, .ride-request, h1' },
    { name: '04-earnings', url: '/driver/earnings', waitFor: '.earnings, .dashboard, h1' },
    { name: '05-profile', url: '/driver/profile', waitFor: '.profile, form, h1' },
  ],
  partner: [
    { name: '01-login', url: '/vendor/login', waitFor: 'form, input, button' },
    { name: '02-dashboard', url: '/vendor/dashboard', waitFor: '.dashboard, .orders, h1' },
    { name: '03-profile', url: '/vendor/profile', waitFor: '.profile, form, h1' },
  ],
  legal: [
    { name: 'privacy', url: '/privacy', waitFor: 'h1' },
    { name: 'terms', url: '/terms', waitFor: 'h1' },
    { name: 'refund', url: '/refund', waitFor: 'h1' },
  ]
};

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });

  for (const [appType, screens] of Object.entries(screenshots)) {
    const outputDir = path.join(__dirname, appType);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n📱 Capturing ${appType} screenshots...`);

    for (const screen of screens) {
      const context = await browser.newContext({
        viewport: PHONE_VIEWPORT,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      });

      const page = await context.newPage();

      try {
        const url = `${BASE_URL}${screen.url}`;
        console.log(`  📸 ${screen.name}: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for content to load
        try {
          await page.waitForSelector(screen.waitFor, { timeout: 5000 });
        } catch (e) {
          console.log(`    ⚠️  Selector not found, capturing anyway...`);
        }

        // Additional wait for animations
        await page.waitForTimeout(1000);

        const filename = path.join(outputDir, `${screen.name}.png`);
        await page.screenshot({
          path: filename,
          fullPage: false,
          type: 'png'
        });

        console.log(`    ✅ Saved: ${filename}`);

      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }

      await context.close();
    }
  }

  await browser.close();

  console.log('\n✅ Screenshot capture complete!');
  console.log('\n📁 Screenshots saved to:');
  console.log('   - store-assets/customer/');
  console.log('   - store-assets/driver/');
  console.log('   - store-assets/partner/');
  console.log('   - store-assets/legal/');
}

captureScreenshots().catch(console.error);
