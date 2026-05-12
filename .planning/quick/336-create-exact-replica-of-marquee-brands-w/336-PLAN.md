---
phase: quick-336
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/dev/marquee-larc-demo/frontend/marquee-website.html
  - /Users/jeet/dev/marquee-larc-demo/backend/app.py
autonomous: true
requirements: [MarqueeWebsiteReplica]

must_haves:
  truths:
    - "Visiting /marquee-website returns the homepage replica"
    - "Hero carousel auto-rotates through all 5 brand slides every 4s with dot indicators"
    - "Sticky nav shows logo left, all 8 links right, collapses to hamburger on mobile"
    - "Platform categories render as a 2x2 image grid with overlay text and Explore link"
    - "Stats bar shows all 4 metrics in a single row"
    - "Footer shows 3 location columns, social icons, and copyright"
  artifacts:
    - path: "/Users/jeet/dev/marquee-larc-demo/frontend/marquee-website.html"
      provides: "Complete single-file homepage replica"
      min_lines: 400
    - path: "/Users/jeet/dev/marquee-larc-demo/backend/app.py"
      provides: "Route serving marquee-website.html"
      contains: "/marquee-website"
  key_links:
    - from: "app.py /marquee-website route"
      to: "frontend/marquee-website.html"
      via: "FileResponse(FRONTEND_DIR / 'marquee-website.html')"
      pattern: "marquee-website"
---

<objective>
Build an exact single-file HTML replica of the Marquee Brands homepage (marqueebrands.com) using the pre-researched CDN image URLs, color palette, and page structure. Wire it as a new route in the LARC demo FastAPI backend.

Purpose: Sales demo asset showing Marquee Brands' brand identity alongside the LARC tool.
Output: /Users/jeet/dev/marquee-larc-demo/frontend/marquee-website.html + /marquee-website route
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Key files:
- /Users/jeet/dev/marquee-larc-demo/backend/app.py (route pattern: lines 102-124)
- /Users/jeet/dev/marquee-larc-demo/frontend/ (sibling HTML files for reference)

Color palette:
  Navy:        #0a1628
  Royal blue:  #1a3a6b
  Light blue:  #4a90d9
  White:       #ffffff
  Light gray:  #f5f5f5

Logo CDN URLs:
  Royal:      https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/d7700ca0-99e3-4cff-8800-f81874226467/MARQUEE+BRANDS.-+ROYAL.png
  Light blue: https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/fd101836-6dc3-4b9a-81a6-c735b2edcc7c/MARQUEE+BRANDS+-+LIGHT+BLUE.png
  White icon: https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/f02cb7ed-4d97-4a35-9acd-2e52c168c863/Marquee_Brands_MB_Icon_2025_white.png

Hero images (5 slides):
  BCBG:          https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/7ce52a1f-1ae9-4e08-a753-5cc8894ad149/HP-Hero-Slider-BCBG+%281%29.jpg
  Bruno Magli:   https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/13d9ea02-d00e-4b34-ae93-a1aaf7beda57/HP-Hero-Slider-Bruno+%281%29.jpg
  Body Glove:    https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/0e491789-ba8d-4954-80af-070c94670dfc/HP-Hero-Slider-BodyGlove+%281%29.jpg
  Martha Stewart: https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/95bee714-0eb3-44b5-9c59-c5bbdd682031/HP-Hero-Slider-Martha+%281%29.jpg
  Laura Ashley:  https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/4a3807e4-2921-4027-a623-67769cd98426/HP-Hero-Slider-LauraAshley+%281%29.jpg

About image: https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/0de4ada1-93d2-4d6e-814c-9923a0faf3a1/about+marquee.jpg

Platform category images:
  Expressive Luxury:  https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/e010f465-c0a6-417e-ad30-57442a986ff2/ExpressiveLuxury_BCBG_SUMMER_LOOK+6_0076_PrimarySelects.jpg
  Home & Culinary:    https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/e98b7097-b2ae-4c3e-bc85-51147e6a7e94/HomeandCulinary_316943421_10160772086946289_4685435485707000915_n.jpg
  Fashion & Lifestyle: https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/24c94b1a-a179-48bd-8993-498438ab7233/FashionandLifestyle_BenSherman_FW_25_Editorial_Shot12.jpg
  Active & Outdoor:   https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/1046a4e3-e55e-4612-a4e5-ce14f337272a/WHITEKNUCKLEGLOVE-BLACK-10003816-BLACK-LIFESTYLE03-750+%281%29.jpg

News images:
  Article 1: https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/024d6ccb-acb9-4cc4-a01c-15f0daa79358/Screenshot+2025-05-28+at+11.47.02%E2%80%AFPM.png
  Article 2: https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/8b586bfb-3eb5-4c5e-bc5-83be-ab60cc9800e3/image006-2.jpg
  Article 3:  https://images.squarespace-cdn.com/content/v1/67c60f6692f9301edb78562e/7607b19c-5cfd-4abc-ba25-91b002acc9ed/tati-weston-webbRRC_5413_RyanChachiCraig_200908+copy+2+%281%29.jpg
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build marquee-website.html — complete single-file homepage replica</name>
  <files>/Users/jeet/dev/marquee-larc-demo/frontend/marquee-website.html</files>
  <action>
Create a single self-contained HTML file (no external CSS/JS dependencies beyond Google Fonts). Use all CDN image URLs as-is from the context above. Implement all 10 sections:

**Fonts:** `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">` — use Playfair Display for headings, Inter for body.

**Section 1 — Sticky nav:**
- `position: sticky; top: 0; z-index: 1000; background: #ffffff; border-bottom: 1px solid #e8e8e8`
- Left: Royal logo (img, height 40px)
- Right: 8 nav links in `<nav>`: ABOUT, EXPERTISE, LEADERSHIP, FINANCIAL SPONSOR, PORTFOLIO, NEWSROOM, CAREERS, CONTACT — all `#0a1628`, `font-size: 11px`, `letter-spacing: 0.1em`, `font-weight: 500`, `text-transform: uppercase`, spaced with `gap: 24px`, no underline, `font-family: Inter`
- Hamburger `<button id="nav-toggle">` (3 `<span>` lines) visible only on mobile (`display: none` on desktop, flex on `<768px`)
- Mobile menu `<div id="nav-menu">`: hidden by default, slides open on hamburger click, stacked vertical links, `background: #ffffff`, full-width, padding 24px

**Section 2 — Hero carousel:**
- Container: `height: 100vh; position: relative; overflow: hidden`
- 5 `.slide` divs, each with: `background-image: url(...)`, `background-size: cover`, `background-position: center`, `height: 100%`, `width: 100%`, `position: absolute`, `opacity: 0`, `transition: opacity 0.8s ease` — active slide has `opacity: 1`
- Brand name overlay: `position: absolute; bottom: 80px; left: 60px; color: white`, Playfair Display 72px, `text-shadow: 0 2px 20px rgba(0,0,0,0.3)`
- Brand labels for 5 slides: "BCBG", "BRUNO MAGLI", "BODY GLOVE", "MARTHA STEWART", "LAURA ASHLEY"
- Dot indicators: `position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%)`, 5 dots, active dot = `background: white`, inactive = `background: rgba(255,255,255,0.4)`, each dot 10px circle with `cursor: pointer`
- JS: `setInterval` every 4000ms cycling `currentSlide`, update opacity + dot active state. Dots are clickable to jump to slide.

**Section 3 — Tagline:**
- `padding: 80px 40px; text-align: center; background: #ffffff`
- `<h2>` "The Premier Accelerator of Timeless Brands" — Playfair Display, `font-size: clamp(28px, 4vw, 48px)`, `color: #0a1628`, `max-width: 800px`, `margin: 0 auto`

**Section 4 — About:**
- `display: grid; grid-template-columns: 1fr 1fr; gap: 80px; padding: 80px 10%; background: #ffffff; align-items: center`
- Left col: `<h3>` "ABOUT MARQUEE BRANDS" (Inter 11px uppercase tracked navy), then `<h2>` "Building Iconic Brands for the Modern Era" (Playfair 36px navy), then 2-3 sentences of body text (Inter 16px `#555`, line-height 1.8), then a CTA link "Learn More →" (`color: #1a3a6b`, underline, Inter 14px uppercase tracked)
- Right col: `<img src="about+marquee.jpg URL" style="width:100%;height:auto;object-fit:cover">`
- Mobile: `grid-template-columns: 1fr` stacks text above image

**Section 5 — Platform categories:**
- `<h2>` "Our Brand Platforms" centered, Playfair 36px navy, `margin-bottom: 48px`
- `display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; padding: 0 0 2px 0` (tight gap like Squarespace)
- Each card: `position: relative; overflow: hidden; aspect-ratio: 4/3; cursor: pointer`
  - `<img>` fills 100% with `object-fit: cover`, `transition: transform 0.4s ease`, on hover `transform: scale(1.05)`
  - Overlay div: `position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,22,40,0.75) 0%, transparent 60%); display: flex; flex-direction: column; justify-content: flex-end; padding: 32px`
  - Category name: Inter 11px uppercase white tracked, `margin-bottom: 8px`
  - Card title: Playfair 28px white
  - "Explore →" link: Inter 13px white, opacity 0.8
- Categories: "Expressive Luxury" / "BCBG + Bruno Magli", "Home & Culinary" / "Martha Stewart + More", "Fashion & Lifestyle" / "Ben Sherman + Others", "Active & Outdoor" / "Body Glove + More"
- Mobile: `grid-template-columns: 1fr`

**Section 6 — Press quotes:**
- `background: #f5f5f5; padding: 80px 10%`
- `<h2>` "In The Press" centered, Playfair 32px navy
- 2 quotes side by side (`display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px`)
- Each: `<blockquote>` Inter 18px italic `#333`, line-height 1.7; attribution line: Inter 12px uppercase `#666` with publication name (CNN, WWD)
- CNN quote: *"Marquee Brands is building a new model for fashion licensing that others are watching closely."* — CNN Business
- WWD quote: *"With a portfolio spanning home, fashion, and lifestyle, Marquee Brands continues to expand its global footprint."* — WWD

**Section 7 — Stats bar:**
- `background: #0a1628; padding: 60px 10%`
- `display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; gap: 32px`
- Each stat: number `<div>` Playfair 48px white + label `<div>` Inter 13px uppercase white opacity 0.6
- Stats: "5,000+" / "Points of Distribution" · "400+" / "Global Partners" · "$3B+" / "Global Retail Sales" · "130+" / "Countries"
- Mobile: `grid-template-columns: repeat(2, 1fr)`

**Section 8 — Latest News:**
- `padding: 80px 10%; background: #ffffff`
- `<h2>` "Latest News" Playfair 36px navy centered, `margin-bottom: 48px`
- `display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px`
- Each card: image (width 100%, `aspect-ratio: 16/10`, `object-fit: cover`), then `padding: 24px 0`
  - Date: Inter 12px `#888` uppercase
  - Headline: Playfair 20px `#0a1628`, `margin: 8px 0`, line-height 1.4
  - "Read More →" link: Inter 13px `#1a3a6b`
- Articles:
  1. img=Article1, Date="May 28, 2025", Headline="Marquee Brands Expands Global Licensing Strategy"
  2. img=Article2, Date="April 15, 2025", Headline="Martha Stewart Collection Hits Record Retail Sales"
  3. img=Article3, Date="March 3, 2025", Headline="Body Glove Taps into Action Sports Renaissance"
- Mobile: `grid-template-columns: 1fr`

**Section 9 — Newsletter:**
- `background: #0a1628; padding: 80px 10%; text-align: center`
- `<h2>` "Stay In The Know" Playfair 36px white, `margin-bottom: 12px`
- `<p>` "Get the latest news and updates from Marquee Brands." Inter 16px white opacity 0.75, `margin-bottom: 40px`
- `<form>` `display: flex; gap: 0; max-width: 480px; margin: 0 auto`
- `<input type="email" placeholder="Your email address">` flex 1, `padding: 14px 20px`, `border: none`, `font-family: Inter`, `font-size: 15px`, `border-radius: 0`
- `<button type="submit">` "SUBSCRIBE" `background: #4a90d9; color: white; border: none; padding: 14px 28px; Inter; font-size: 12px; letter-spacing: 0.1em; font-weight: 600; cursor: pointer` — on hover `background: #1a3a6b`
- Form `onsubmit`: `event.preventDefault(); alert('Thank you for subscribing!')`
- Mobile: `flex-direction: column`

**Section 10 — Footer:**
- `background: #0a1628; padding: 60px 10% 40px; border-top: 1px solid rgba(255,255,255,0.1)`
- Top row: `display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 48px`
  - Col 1: White icon logo (height 50px), then Inter 13px white opacity 0.6 tagline "Accelerating iconic brands worldwide.", then social icons row (LinkedIn + Instagram SVG icons, 20px, white, `margin-top: 24px`, gap 16px — use inline SVG paths)
  - Col 2: "NEW YORK" Inter 11px uppercase white tracked, then address lines: "225 West 34th Street" / "New York, NY 10122" Inter 13px white opacity 0.6
  - Col 3: "LOS ANGELES" header, then "1800 Century Park East" / "Los Angeles, CA 90067"
  - Col 4: "LONDON" header, then "1 Knightsbridge" / "London, SW1X 7LY"
- Bottom row: `display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; margin-top: 0`
  - Left: copyright "© 2025 Marquee Brands. All rights reserved." Inter 12px white opacity 0.5
  - Right: "contact@marqueebrands.com" Inter 12px white opacity 0.5
- Mobile: footer grid `grid-template-columns: 1fr; gap: 32px`

**LinkedIn SVG path:** `M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z`

**Instagram SVG path:** `M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z`

**Responsive breakpoints:**
- `@media (max-width: 768px)`: hero brand overlay font-size 40px, about grid 1 col, categories grid 1 col, press quotes grid 1 col, news grid 1 col, stats grid 2-col, footer grid 1 col, nav links hidden (hamburger only)

**Hamburger JS (inline `<script>` at bottom of body):**
```js
const toggle = document.getElementById('nav-toggle');
const menu = document.getElementById('nav-menu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
  });
}
```

Do NOT link to any external frameworks (no Bootstrap, no Tailwind CDN). Only Google Fonts and inline CSS/JS.
  </action>
  <verify>
    python3 -c "
import os
path = '/Users/jeet/dev/marquee-larc-demo/frontend/marquee-website.html'
with open(path) as f: content = f.read()
checks = [
  ('sticky nav', 'position: sticky' in content or 'position:sticky' in content),
  ('hero carousel', 'setInterval' in content),
  ('5 hero images', content.count('HP-Hero-Slider') == 5),
  ('platform categories', 'Expressive Luxury' in content and 'Home &amp; Culinary' in content or 'Home & Culinary' in content),
  ('stats bar', '5,000+' in content and '3B+' in content),
  ('newsletter', 'SUBSCRIBE' in content),
  ('footer locations', 'NEW YORK' in content and 'LONDON' in content),
  ('about image', 'about+marquee' in content),
  ('logo', 'MARQUEE+BRANDS' in content),
  ('min size', os.path.getsize(path) > 20000),
]
for name, ok in checks:
  print(f\"{'PASS' if ok else 'FAIL'}: {name}\")
all_pass = all(ok for _, ok in checks)
print(f'Result: {\"ALL PASS\" if all_pass else \"FAILURES ABOVE\"}')
"
  </verify>
  <done>
    All 10 checks pass. File is >20KB. All 5 hero CDN image URLs present. Stats, newsletter, and footer sections all render with correct content.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add /marquee-website route to app.py</name>
  <files>/Users/jeet/dev/marquee-larc-demo/backend/app.py</files>
  <action>
Add two lines to app.py immediately after the existing `/cfo-asc606` route block (after line ~124, before the `# ── ALLOCATION ENGINE` comment). Follow the exact same pattern as the other page routes:

```python
@app.get("/marquee-website")
@app.get("/marquee-website.html")
def marquee_website():
    return FileResponse(FRONTEND_DIR / "marquee-website.html")
```

Also add "/marquee-website" to the TRACKED_PATHS set so visitor logging works:
Change: `TRACKED_PATHS = {"/shopify-demo", "/allocation-demo", "/allocation-app", "/"}`
To:     `TRACKED_PATHS = {"/shopify-demo", "/allocation-demo", "/allocation-app", "/marquee-website", "/"}`
  </action>
  <verify>
    grep -n "marquee-website" /Users/jeet/dev/marquee-larc-demo/backend/app.py
  </verify>
  <done>
    grep shows at least 3 matches: the two @app.get decorators and the FileResponse line. TRACKED_PATHS also contains "/marquee-website".
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run a quick smoke test:

```bash
cd /Users/jeet/dev/marquee-larc-demo/backend && \
python3 -c "
import ast, sys
with open('app.py') as f: src = f.read()
assert '/marquee-website' in src, 'route missing'
assert '/marquee-website.html' in src, 'html route missing'
print('app.py PASS')
"

python3 -c "
with open('../frontend/marquee-website.html') as f: c = f.read()
for check in ['sticky', 'setInterval', 'HP-Hero-Slider', '5,000+', 'SUBSCRIBE', 'LONDON']:
    assert check in c, f'Missing: {check}'
print('marquee-website.html PASS')
"
```

If the backend server is running locally, also verify:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/marquee-website
# Expected: 200
```
</verification>

<success_criteria>
- GET /marquee-website returns 200 with the HTML page
- Page has all 10 sections: sticky nav, hero carousel, tagline, about, platform categories, press quotes, stats bar, latest news, newsletter, footer
- All 5 hero brand CDN images referenced (BCBG, Bruno Magli, Body Glove, Martha Stewart, Laura Ashley)
- Hero auto-rotates every 4s with JS setInterval
- Stats show "5,000+", "400+", "$3B+", "130+"
- Footer shows New York, Los Angeles, London addresses
- Responsive: hamburger on mobile, single-column grids at 768px
</success_criteria>

<output>
After completion, create `.planning/quick/336-create-exact-replica-of-marquee-brands-w/336-SUMMARY.md`
</output>
