# Next Session Prompt — Submit Restaurant App to App Store

> Run `/gsd:resume-work` then follow steps below.

---

## Restaurant App — Current State

- **Bundle ID:** `com.dollorai.restaurant`
- **App ID (ASC):** `6758357924`
- **ASC State:** `PREPARE_FOR_SUBMISSION` (version 1.0)
- **TestFlight Build:** 206 (v1.1) — uploaded Mar 13, 2026
- **Demo:** `demo.restaurant@dollor.ai` / `DemoRestaurant2025!`
- **Org:** Zietra Technologies inc (Team ID: PRKZ4UVCD7)
- **Features:** Combo deals, bestseller badges, AI insights, order management, menu CRUD

---

## Step 1: Fix Version Mismatch (1.0 → 1.1)

ASC has version 1.0 but build is 1.1. Update or create version 1.1:

```bash
# Check current ASC version + available builds
python3 -c "
import jwt, time, json, urllib.request
key_path = '/Users/jeet/.appstoreconnect/private_keys/AuthKey_9K626GB728.p8'
with open(key_path, 'r') as f: private_key = f.read()
now = int(time.time())
payload = {'iss': '80d10e49-f379-462f-9668-5ea53016812e', 'iat': now, 'exp': now + 1200, 'aud': 'appstoreconnect-v1'}
token = jwt.encode(payload, private_key, algorithm='ES256', headers={'kid': '9K626GB728'})

req = urllib.request.Request('https://api.appstoreconnect.apple.com/v1/apps/6758357924/appStoreVersions', headers={'Authorization': f'Bearer {token}'})
data = json.loads(urllib.request.urlopen(req).read())
for v in data['data']:
    a = v['attributes']
    print(f'ID: {v[\"id\"]} | Version: {a[\"versionString\"]} | State: {a[\"appStoreState\"]}')

req2 = urllib.request.Request('https://api.appstoreconnect.apple.com/v1/builds?filter[app]=6758357924&sort=-uploadedDate&limit=5', headers={'Authorization': f'Bearer {token}'})
data2 = json.loads(urllib.request.urlopen(req2).read())
for b in data2['data']:
    a = b['attributes']
    print(f'Build: {a[\"version\"]} | v{a.get(\"cfBundleShortVersionString\",\"?\")} | State: {a[\"processingState\"]}')
"
```

Update ASC version to 1.1 via API or web UI, then attach build 206.

---

## Step 2: Fill ASC Metadata

| Field | Value |
|-------|-------|
| **Subtitle** | Manage orders, menu & analytics |
| **Keywords** | restaurant,pos,orders,menu,delivery,analytics,combo,food,management |
| **Support URL** | `https://www.dollor.ai/support` |
| **Privacy URL** | `https://www.dollor.ai/privacy` |
| **Category** | Food & Drink |
| **Copyright** | 2026 Zietra Technologies inc |
| **What's New** | Initial release |
| **Demo Account** | `demo.restaurant@dollor.ai` / `DemoRestaurant2025!` |
| **Review Notes** | Use demo credentials to log in. Dashboard shows sample orders and analytics. Menu management, AI insights, and promotion features are fully functional with demo data. |

**Description:**
```
Dollor Restaurant is the business companion app for restaurants on the Dollor delivery platform.

• Real-time order management — accept, prepare, and track orders
• Menu management — add items, set availability, create combo deals
• AI-powered insights — sales analytics, menu recommendations, promotion suggestions
• Bestseller badges — highlight your top-selling items
• Push notifications — instant alerts for new orders
• Order history and revenue tracking
• Kitchen Order Ticket (KOT) printing support

Built for restaurant owners and managers who want to grow their delivery business.
```

```
/gsd:quick "Fill Restaurant ASC metadata — description, keywords, URLs, demo account, review notes"
```

---

## Step 3: Screenshots (BLOCKING — 0 exist)

Capture 6-10 screenshots on iPhone 6.7" (required):

| # | Screen | Navigate To |
|---|--------|-------------|
| 1 | Login | App launch |
| 2 | Dashboard | Login with demo |
| 3 | Orders — New | Dashboard → New tab |
| 4 | Menu | Bottom tab → Menu (shows Create Combo Deal button) |
| 5 | AI Insights | Bottom tab → AI (3 recommendation cards) |
| 6 | Promotions | AI → Slow Period → Promotions |
| 7 | Order Detail | Tap any order |
| 8 | Settings | Bottom tab → Settings |

Upload to ASC via web UI or API after capture.

---

## Step 4: Pre-Submission Verification

```bash
# Verify demo login works on production
curl -s -X POST "https://api.dollor.ai/api/vendors/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.restaurant@dollor.ai","password":"DemoRestaurant2025!"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Token:", d.get("access_token","FAIL")[:20])'

# Verify menu loads (vendor 40 = demo restaurant)
curl -s "https://api.dollor.ai/api/vendors/40/menu" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"Menu: {len(d)} items") if isinstance(d,list) else print(d)'

# Verify AI insights
curl -s "https://api.dollor.ai/api/vendors/40/ai-insights?period=today" \
  -H "Authorization: Bearer TOKEN" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"Recs: {len(d.get(\"recommendations\",[]))}")'

# Verify no unused permissions in Info.plist
grep -E "NSUsageDescription" apps/ios/restaurant/eatffairrestaurant/Info.plist
# Expected: Location, Camera, Photo Library only — NO Contacts, NO Always Location
```

```
/gsd:quick --full "Pre-submission verification for Restaurant app build 206"
```

---

## Step 5: Submit for Review

```
/gsd:quick "Submit Restaurant app build 206 v1.1 to App Store review"
```

---

## Session Flow

```
/gsd:resume-work
→ Step 1: Fix ASC version 1.0 → 1.1, attach build 206
→ Step 2: Fill all metadata via API
→ Step 3: Capture screenshots on device → upload to ASC
→ Step 4: Run pre-submission verification
→ Step 5: Submit for review
```
