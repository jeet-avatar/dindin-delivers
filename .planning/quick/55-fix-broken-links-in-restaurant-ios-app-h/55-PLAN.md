---
phase: quick-55
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
  - apps/web/p2p-platform/backend/main_new.py
autonomous: true
requirements: [FIX-LINKS]

must_haves:
  truths:
    - "Help Center link opens a reachable web page (www.dollor.ai/support)"
    - "Contact Support link dials a real phone number (digits, not vanity letters)"
    - "Go to Admin Portal link opens a reachable admin page (www.dollor.ai/admin)"
  artifacts:
    - path: "apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift"
      provides: "Fixed supportUrl default, fixed adminPanelURL"
      contains: "www.dollor.ai"
    - path: "apps/web/p2p-platform/backend/main_new.py"
      provides: "Fixed supportUrl and supportPhone in /api/config response"
      contains: "www.dollor.ai/support"
  key_links:
    - from: "RestaurantSettingsView.swift (Help Center Link)"
      to: "AppConfig.shared.supportUrl"
      via: "SwiftUI Link(destination:)"
      pattern: "Link.*helpUrl"
    - from: "RestaurantSettingsView.swift (Contact Support Link)"
      to: "AppConfig.shared.supportPhone"
      via: "tel: URL scheme"
      pattern: "tel:.*supportPhone"
    - from: "RestaurantSettingsView.swift (Admin Portal Link)"
      to: "AppConstants.adminPanelURL"
      via: "SwiftUI Link(destination:)"
      pattern: "Link.*adminPanelURL"
---

<objective>
Fix three broken links in the Restaurant iOS app's Settings screen: Help Center, Contact Support, and Go to Admin Portal.

Purpose: All three links currently point to URLs that do not resolve or return errors, making them useless for restaurant operators who need support or admin access.

Output: Updated URLs in both the iOS shared config (AppConfig.swift) and the backend /api/config response (main_new.py) so all three links work immediately.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift
@apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
@apps/web/p2p-platform/backend/main_new.py
</context>

<root_cause>
Three separate issues cause the broken links:

1. **Help Center** (`AppConfig.shared.supportUrl`):
   - iOS default: `https://api.dollor.ai/support` -- hits global auth middleware, returns 401
   - Backend `/api/config` overrides to: `https://support.dollor.ai` -- DNS NXDOMAIN (domain does not exist)
   - Working URL: `https://www.dollor.ai/support` (returns 200, SPA support page)

2. **Contact Support** (`AppConfig.shared.supportPhone`):
   - iOS default: `+1-800-365-5671` (correct digits)
   - Backend `/api/config` overrides to: `+1-800-DOLLOR` (vanity letters)
   - iOS `tel:` URL scheme does NOT support alphabetic characters -- link silently fails
   - Fix: backend must return numeric `+1-800-365-5671`

3. **Go to Admin Portal** (`AppConstants.adminPanelURL`):
   - Currently: `https://admin.dollor.ai` -- DNS NXDOMAIN (no such subdomain)
   - Working URL: `https://www.dollor.ai/admin` (returns 200, admin panel SPA)
</root_cause>

<tasks>

<task type="auto">
  <name>Task 1: Fix iOS defaults and AppConstants</name>
  <files>apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift</files>
  <action>
  In `AppConfig.swift`, make these three changes:

  1. **Line 338** -- Change `supportUrl` default from `"https://api.dollor.ai/support"` to `"https://www.dollor.ai/support"`
     - This is the fallback when `/api/config` is unreachable

  2. **Line 591** -- Change `AppConstants.supportURL` from `"https://dollor.ai/support"` to `"https://www.dollor.ai/support"`
     - The bare `dollor.ai` 301-redirects to `www.dollor.ai` which adds latency; use the canonical URL directly

  3. **Line 600** -- Change `AppConstants.adminPanelURL` from `"https://admin.dollor.ai"` to `"https://www.dollor.ai/admin"`
     - `admin.dollor.ai` does not exist as a DNS record; the admin panel is served at the `/admin` path of the main site
  </action>
  <verify>
  Grep to confirm all three changes:
  - `grep -n 'www.dollor.ai/support' apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` shows 2 matches (line ~338 and ~591)
  - `grep -n 'www.dollor.ai/admin' apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` shows 1 match (line ~600)
  - `grep -n 'admin.dollor.ai' apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` shows 0 matches
  - `grep -n 'api.dollor.ai/support' apps/ios/eatfair-ios-shared/Sources/EatFairShared/AppConfig.swift` shows 0 matches
  </verify>
  <done>iOS AppConfig defaults and AppConstants all point to reachable URLs (www.dollor.ai/support and www.dollor.ai/admin)</done>
</task>

<task type="auto">
  <name>Task 2: Fix backend /api/config response URLs</name>
  <files>apps/web/p2p-platform/backend/main_new.py</files>
  <action>
  In `main_new.py`, find the `/api/config` endpoint response dict (around line 1583) and make two changes:

  1. **Line 1583** -- Change `"supportUrl": "https://support.dollor.ai"` to `"supportUrl": "https://www.dollor.ai/support"`
     - `support.dollor.ai` has no DNS record; the support page is at `www.dollor.ai/support`

  2. **Line 1584** -- Change `"supportPhone": "+1-800-DOLLOR"` to `"supportPhone": "+1-800-365-5671"`
     - iOS `tel:` URL scheme requires numeric digits; vanity letters cause the link to silently fail
     - The numeric equivalent is already the iOS default (D=3, O=6, L=5, L=5, O=6, R=7)

  Do NOT change `supportEmail` -- it is already correct (`support@dollor.ai`).
  </action>
  <verify>
  Grep to confirm both changes:
  - `grep -n 'www.dollor.ai/support' apps/web/p2p-platform/backend/main_new.py` shows the updated supportUrl
  - `grep -n '800-365-5671' apps/web/p2p-platform/backend/main_new.py` shows the numeric phone number
  - `grep -n 'support.dollor.ai' apps/web/p2p-platform/backend/main_new.py` shows 0 matches (old URL removed)
  - `grep -n '800-DOLLOR' apps/web/p2p-platform/backend/main_new.py` shows 0 matches (vanity number removed)
  </verify>
  <done>Backend /api/config returns reachable supportUrl (www.dollor.ai/support) and numeric supportPhone (+1-800-365-5671) that iOS tel: links can dial</done>
</task>

</tasks>

<verification>
After both tasks complete:
1. `curl -s "https://www.dollor.ai/support" -o /dev/null -w "%{http_code}"` returns 200
2. `curl -s "https://www.dollor.ai/admin" -o /dev/null -w "%{http_code}"` returns 200
3. No references to `admin.dollor.ai`, `support.dollor.ai`, `api.dollor.ai/support`, or `800-DOLLOR` remain in modified files
4. iOS build compiles: `xcodebuild -workspace apps/ios/EatFair.xcworkspace -scheme eatffairrestaurant -configuration Debug -destination 'generic/platform=iOS' build`
</verification>

<success_criteria>
- Help Center link points to `https://www.dollor.ai/support` (HTTP 200)
- Contact Support phone number is `+1-800-365-5671` (numeric digits only, valid for iOS tel: scheme)
- Admin Portal link points to `https://www.dollor.ai/admin` (HTTP 200)
- Both iOS defaults and backend /api/config response are consistent
</success_criteria>

<output>
After completion, create `.planning/quick/55-fix-broken-links-in-restaurant-ios-app-h/55-SUMMARY.md`
</output>
