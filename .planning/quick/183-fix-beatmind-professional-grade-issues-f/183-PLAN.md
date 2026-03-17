---
phase: quick-183
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/ableton-chatbot/frontend/src/app/layout.tsx
  - apps/ableton-chatbot/frontend/src/app/robots.txt/route.ts
  - apps/ableton-chatbot/frontend/src/app/sitemap.xml/route.ts
  - apps/ableton-chatbot/frontend/public/favicon.svg
  - apps/ableton-chatbot/frontend/src/app/signup/page.tsx
  - apps/ableton-chatbot/backend/main.py
autonomous: true
requirements: [BEATMIND-SEO, BEATMIND-SUBSCRIPTION-FIX, BEATMIND-CLEANUP]

must_haves:
  truths:
    - "beatmind.io shows a BeatMind favicon in browser tab"
    - "Social shares show correct OG title, description, and image"
    - "Google can crawl beatmind.io via robots.txt and sitemap.xml"
    - "New user signup uses backend-computed subscribed field, not hardcoded true"
    - "Musai-Bridge.zip is removed from public directory"
  artifacts:
    - path: "apps/ableton-chatbot/frontend/public/favicon.svg"
      provides: "BeatMind favicon (purple B logo)"
    - path: "apps/ableton-chatbot/frontend/src/app/layout.tsx"
      provides: "OG meta tags, favicon link, canonical URL"
      contains: "openGraph"
    - path: "apps/ableton-chatbot/frontend/src/app/robots.txt/route.ts"
      provides: "robots.txt route handler"
      contains: "Sitemap"
    - path: "apps/ableton-chatbot/frontend/src/app/sitemap.xml/route.ts"
      provides: "sitemap.xml route handler"
      contains: "beatmind.io"
  key_links:
    - from: "apps/ableton-chatbot/frontend/src/app/signup/page.tsx"
      to: "apps/ableton-chatbot/backend/main.py"
      via: "register API returns subscribed field"
      pattern: "is_subscribed"
---

<objective>
Fix six professional-grade issues on BeatMind.io: add favicon, add OG/Twitter meta tags for social sharing, add robots.txt + sitemap.xml for SEO, fix the signup page hardcoded `subscribed: true` by adding the field to the backend register response, and remove the stale 14MB Musai-Bridge.zip from public/.

Purpose: Make beatmind.io look professional in browser tabs, social shares, and search engines. Fix a subscription bypass bug.
Output: Updated layout, new SEO routes, favicon, backend fix, cleaned public directory.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/ableton-chatbot/frontend/src/app/layout.tsx
@apps/ableton-chatbot/frontend/src/app/signup/page.tsx
@apps/ableton-chatbot/frontend/src/app/page.tsx
@apps/ableton-chatbot/frontend/next.config.ts
@apps/ableton-chatbot/backend/main.py
@apps/ableton-chatbot/backend/database.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add favicon, OG meta tags, robots.txt, and sitemap.xml</name>
  <files>
    apps/ableton-chatbot/frontend/public/favicon.svg
    apps/ableton-chatbot/frontend/src/app/layout.tsx
    apps/ableton-chatbot/frontend/src/app/robots.txt/route.ts
    apps/ableton-chatbot/frontend/src/app/sitemap.xml/route.ts
  </files>
  <action>
    1. Create `public/favicon.svg` — a simple SVG favicon: purple (#a855f7) rounded square with white "B" letter, matching the existing nav logo style (8x8 rounded-lg with accent background, white bold text). Keep it simple, ~500 bytes.

    2. Update `layout.tsx` metadata to add:
       - `metadataBase: new URL("https://www.beatmind.io")` so OG URLs resolve correctly
       - `icons: { icon: "/favicon.svg" }` in the metadata export
       - `openGraph` object with: title, description (reuse existing), url: "https://www.beatmind.io", siteName: "BeatMind", type: "website", locale: "en_US"
       - `twitter` object with: card: "summary", title, description
       - Note: No OG image for now (no image asset exists). Add `// TODO: add og-image.png` comment.

    3. Create `src/app/robots.txt/route.ts` — Next.js route handler that returns `text/plain` response with:
       ```
       User-agent: *
       Allow: /
       Disallow: /dashboard
       Disallow: /login
       Disallow: /signup

       Sitemap: https://www.beatmind.io/sitemap.xml
       ```

    4. Create `src/app/sitemap.xml/route.ts` — Next.js route handler that returns `application/xml` response with a sitemap containing these URLs (all with weekly changefreq, priority 1.0 for /, 0.8 for others):
       - https://www.beatmind.io/
       - https://www.beatmind.io/privacy
       - https://www.beatmind.io/terms
       Use current date as lastmod.

    IMPORTANT: Since `output: "export"` is set in next.config.ts, route handlers (route.ts) will NOT work at runtime — they only work in dev/server mode. For static export, use `public/robots.txt` (plain text file) and `public/sitemap.xml` (XML file) instead of route handlers. Create these as static files in public/.
  </action>
  <verify>
    Run `cd apps/ableton-chatbot/frontend && npx next build` and confirm build succeeds with no errors. Verify `ls public/favicon.svg public/robots.txt public/sitemap.xml` shows all 3 files exist. Grep layout.tsx for "openGraph" to confirm meta tags present.
  </verify>
  <done>
    - favicon.svg exists in public/ and is referenced in layout.tsx metadata
    - OG + Twitter meta tags present in layout.tsx metadata export
    - robots.txt exists as static file in public/ with correct allow/disallow rules
    - sitemap.xml exists as static file in public/ with 3 URLs
    - Build passes with no errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix subscribed hardcode in signup + remove Musai-Bridge.zip</name>
  <files>
    apps/ableton-chatbot/backend/main.py
    apps/ableton-chatbot/frontend/src/app/signup/page.tsx
    apps/ableton-chatbot/frontend/public/Musai-Bridge.zip
  </files>
  <action>
    1. In `apps/ableton-chatbot/backend/main.py`, find the `/api/auth/register` endpoint response (around line 185-190). The current response returns `subscription_status` and `trial_ends_at` but NOT `subscribed`. Add `"subscribed": is_subscribed(user)` to the user dict in the register response, matching the login endpoint pattern (line 214). The `is_subscribed` function is imported from `database.py` — verify it's already imported at the top of main.py.

    2. In `apps/ableton-chatbot/frontend/src/app/signup/page.tsx` line 28, change:
       `saveAuth(data.token, { ...data.user, subscribed: true });`
       to:
       `saveAuth(data.token, data.user);`
       The backend now returns the correct `subscribed` field, so the client-side override is no longer needed.

    3. Delete `apps/ableton-chatbot/frontend/public/Musai-Bridge.zip` (14MB stale file from pre-rebrand). The BridgeSetup component references `/BeatMind-Bridge.zip` which is a different filename — this old zip is dead weight.

    NOTE: Do NOT create a BeatMind-Bridge.zip — the bridge download is handled by `install-beatmind-bridge.command` and `bridge.py` which already exist in public/. The zip download link in BridgeSetup.tsx is a separate concern.
  </action>
  <verify>
    Verify backend: `grep -n "subscribed.*is_subscribed" apps/ableton-chatbot/backend/main.py` shows the field in BOTH register and login responses. Verify frontend: `grep -n "subscribed.*true" apps/ableton-chatbot/frontend/src/app/signup/page.tsx` returns NO matches (hardcode removed). Verify cleanup: `ls apps/ableton-chatbot/frontend/public/Musai-Bridge.zip` returns "No such file".
  </verify>
  <done>
    - Backend register endpoint returns `subscribed: is_subscribed(user)` matching login endpoint
    - Signup page uses `data.user` directly without hardcoded subscribed override
    - Musai-Bridge.zip removed from public directory (saves 14MB from deployment)
  </done>
</task>

<task type="auto">
  <name>Task 3: Build, deploy frontend to S3/CloudFront, deploy backend to production</name>
  <files>
    (no new files — deploy only)
  </files>
  <action>
    1. Build the frontend:
       ```
       cd apps/ableton-chatbot/frontend
       NEXT_PUBLIC_API_URL=https://api.beatmind.io npm run build
       ```

    2. Deploy frontend to S3 + invalidate CloudFront:
       ```
       aws s3 sync out/ s3://beatmind-frontend/ --delete
       aws cloudfront create-invalidation --distribution-id E3F24X4TEVJ9X2 --paths "/*"
       ```

    3. Deploy backend (the register endpoint fix):
       - Push code to main: `git push origin main`
       - Build BeatMind backend Docker image, push to `musai-api` ECR, force new ECS deployment on `dollor-production` cluster
       - OR if backend changes are minimal, use the existing CI/CD workflow

    4. Verify deployment:
       - `curl -s https://www.beatmind.io/robots.txt` returns robots content
       - `curl -s https://www.beatmind.io/sitemap.xml` returns sitemap XML
       - `curl -sI https://www.beatmind.io/ | grep -i favicon` or check page source for favicon reference
       - `curl -s -X POST https://api.beatmind.io/api/auth/register -H "Content-Type: application/json" -d '{"name":"test","email":"test-183@test.com","password":"Test1234"}' | python3 -m json.tool | grep subscribed` shows subscribed field in response
  </action>
  <verify>
    `curl -s https://www.beatmind.io/robots.txt | head -3` returns "User-agent: *". `curl -s https://www.beatmind.io/sitemap.xml | head -3` returns XML header. CloudFront invalidation completes.
  </verify>
  <done>
    - Frontend deployed with favicon, OG tags, robots.txt, sitemap.xml all live
    - Backend deployed with register endpoint returning subscribed field
    - Musai-Bridge.zip no longer served (14MB savings)
  </done>
</task>

</tasks>

<verification>
1. Visit https://www.beatmind.io in browser — tab shows BeatMind favicon (not generic Next.js icon)
2. Paste https://www.beatmind.io into Twitter/LinkedIn/Slack — shows OG title "BeatMind" and description
3. https://www.beatmind.io/robots.txt returns valid robots content with sitemap reference
4. https://www.beatmind.io/sitemap.xml returns valid XML sitemap with 3 URLs
5. Register a new test user — backend returns `subscribed` field (not hardcoded on client)
6. https://www.beatmind.io/Musai-Bridge.zip returns 404 (removed)
</verification>

<success_criteria>
- All 6 issues resolved: favicon, OG tags, robots.txt, sitemap.xml, subscribed fix, zip cleanup
- Frontend build passes and deployed to S3/CloudFront
- Backend register endpoint returns subscribed field matching login endpoint
- 14MB of dead weight removed from deployment
</success_criteria>

<output>
After completion, create `.planning/quick/183-fix-beatmind-professional-grade-issues-f/183-SUMMARY.md`
</output>
