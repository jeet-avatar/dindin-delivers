#!/usr/bin/env python3
"""
Walk every web surface the underwriter or staff could touch and screenshot
each. Produces /tmp/dollor-web-sweep/<surface>/<route>.png plus a JSON manifest
that the coverage report PDF consumes.
"""
import json
import os
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

OUT = Path('/tmp/dollor-web-sweep')
OUT.mkdir(exist_ok=True)

ROUTES = [
    # (surface, label, url, auth?)
    ('marketing', 'home',       'https://www.dollor.ai/',             False),
    ('admin',     'login',      'https://api.dollor.ai/admin/login',  False),
    ('admin',     'dashboard',  'https://api.dollor.ai/admin/',                          'login'),
    ('admin',     'dashboard',  'https://api.dollor.ai/admin/dashboard',                 'login'),
    ('admin',     'orders',     'https://api.dollor.ai/admin/orders',                    'login'),
    ('admin',     'accounting', 'https://api.dollor.ai/admin/accounting',                'login'),
    ('admin',     'invoices',   'https://api.dollor.ai/admin/invoices',                  'login'),
    ('admin',     'users',      'https://api.dollor.ai/admin/users',                     'login'),
    ('admin',     'vendors',    'https://api.dollor.ai/admin/vendors',                   'login'),
    ('admin',     'drivers',    'https://api.dollor.ai/admin/drivers',                   'login'),
    ('admin',     'customers',  'https://api.dollor.ai/admin/customers',                 'login'),
    ('admin',     'platform-revenue', 'https://api.dollor.ai/admin/platform-revenue',    'login'),
    ('admin',     'vendor-payouts',   'https://api.dollor.ai/admin/vendor-payouts',      'login'),
    ('admin',     'change-requests',  'https://api.dollor.ai/admin/change-requests',     'login'),
    ('public-api','health-html',      'https://api.dollor.ai/health',           False),
    ('public-api','docs-blocked',     'https://api.dollor.ai/docs',             False),
]

ERROR_MARKERS = ['Error 5', '500 Internal', 'Application error',
                 'Internal Server Error', 'Cannot GET', '404 Not Found',
                 'Something went wrong']
WARN_MARKERS = ['Loading', 'Spinner', 'Please wait']

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1440,2000')
opts.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15')

driver = webdriver.Chrome(options=opts)
manifest = []
try:
    # Login to admin portal
    print('=== logging into admin portal ===')
    driver.get('https://api.dollor.ai/admin/login')
    time.sleep(3)
    try:
        WebDriverWait(driver, 8).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type=email], input[type=text]'))
        )
        # Try common selectors
        for sel in ['input[type=email]', 'input[name=email]', 'input#email', 'input[type=text]']:
            try:
                e = driver.find_element(By.CSS_SELECTOR, sel)
                e.clear()
                e.send_keys('support@dollor.ai')
                break
            except Exception:
                continue
        for sel in ['input[type=password]', 'input[name=password]', 'input#password']:
            try:
                p = driver.find_element(By.CSS_SELECTOR, sel)
                p.clear()
                p.send_keys('AdminTest123')
                break
            except Exception:
                continue
        # Submit
        for sel in ['button[type=submit]', 'button.submit', 'button']:
            try:
                b = driver.find_element(By.CSS_SELECTOR, sel)
                b.click()
                break
            except Exception:
                continue
        time.sleep(4)
        print(f'  login attempt → at URL {driver.current_url}')
    except Exception as e:
        print(f'  login flow failed: {e}')

    # Walk routes
    for surface, label, url, auth_needed in ROUTES:
        print(f'  {surface}/{label}: {url}')
        try:
            driver.get(url)
            time.sleep(4)  # let SPA/JS load
            sub = OUT / surface
            sub.mkdir(exist_ok=True)
            out = sub / f'{label}.png'
            driver.save_screenshot(str(out))
            body = driver.find_element(By.TAG_NAME, 'body').text[:2000] if driver.find_elements(By.TAG_NAME, 'body') else ''
            title = driver.title
            err_hits = [m for m in ERROR_MARKERS if m.lower() in body.lower()]
            warn_hits = [m for m in WARN_MARKERS if m.lower() in body.lower()]
            status = 'error' if err_hits else ('warn' if warn_hits else 'ok')
            manifest.append({
                'surface': surface, 'label': label, 'url': url,
                'title': title[:120], 'status': status,
                'error_markers': err_hits, 'warn_markers': warn_hits,
                'body_preview': body[:300],
                'screenshot': str(out.relative_to(OUT)),
            })
            print(f'    {status} title="{title[:60]}"')
        except Exception as e:
            print(f'    EXCEPTION: {str(e)[:100]}')
            manifest.append({'surface': surface, 'label': label, 'url': url,
                             'status': 'exception', 'error': str(e)[:200]})

    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    ok = sum(1 for m in manifest if m.get('status') == 'ok')
    print(f"\nDone. {ok}/{len(manifest)} clean. manifest: {OUT / 'manifest.json'}")
finally:
    driver.quit()
