# Phase 22: TechCloudPro LaunchOS — SMB Growth Platform - Research

**Researched:** 2026-04-04
**Domain:** Multi-app SaaS integration, tier-based entitlement, Stripe unified billing, WebRTC meetings, Remotion video generation, ElevenLabs TTS
**Confidence:** HIGH (all findings verified against actual source files)

---

## Summary

LaunchOS is an integration project, not a greenfield build. Every component — CRM, AI workers, video generation, social publishing, WebRTC meetings, SEO — already exists as a live production app. The work is entirely in the **integration layer**: unified billing, entitlement enforcement, app-to-app connectors, and a landing page.

**Critical finding:** The apps are architecturally isolated — different hosts, different stacks, different auth systems, different databases. There is no shared infrastructure. Every integration must be API-to-API over HTTPS with per-tenant API keys or shared JWT secrets.

**Primary recommendation:** Implement entitlement as a new FastAPI microservice (or Node.js) on the existing `dollor-production` ECS cluster, with each existing app calling a single `/entitlements/check` endpoint before quota-limited actions. Stripe webhooks update this service. This is the cleanest path with no schema changes to any existing app.

---

## What Exists vs What Needs to Be Built

### EXISTS (verified by file inspection)

| Component | App | Location | Stack | Deployment |
|-----------|-----|----------|-------|------------|
| CRM + Campaigns | BrandMonkz | `/Users/jeet/Documents/CRM Module/` (backend), `/Users/jeet/Documents/CRM Frontend/crm-app/` (frontend) | Node.js/TypeScript + Express + Prisma + PostgreSQL | EC2 `100.24.213.224`, nginx, PM2 |
| AI Workers | VibingTicket | `/Users/jeet/techcloudpro-website/` | Node.js + Express + MongoDB + Anthropic SDK | EC2 `54.173.113.128`, S3/CloudFront frontend |
| Social Publishing | VibingTicket social routes | `/Users/jeet/techcloudpro-website/backend/src/routes/socialRoutes.js` | TikTok, Instagram, YouTube, Twitter, LinkedIn OAuth + posting services | Same EC2 |
| WebRTC Meetings | Zietra Meet | `apps/zoom/` | TypeScript WebSocket signaling server + React frontend, Dockerized | Deployment script: `apps/zoom/deploy/deploy.sh` — ECS Fargate `zietra-meet-service` on `dollor-production` cluster, ECR: `zietra-meet` |
| Remotion Video Engine | dollor-video | `apps/dollor-video/` | Remotion 4.x, React 18, self-hosted CPU render | Local/CLI only — no server API yet |
| Remotion Video Engine (alt) | offerletter-video | `apps/offerletter-video/` | Remotion 4.x, React 18 | Local/CLI only — no server API yet |
| ElevenLabs TTS | VibingTicket voice | `/Users/jeet/techcloudpro-website/backend/src/services/voice/elevenLabsTTSService.js` | `eleven_turbo_v2_5` model, `api.elevenlabs.io/v1/text-to-speech/:voiceId`, file-based MP3 output | EC2, generates to `generated-audio/` dir, serves as static files |
| Stripe billing (BeatMind pattern) | BeatMind | `apps/ableton-chatbot/backend/stripe_routes.py` | FastAPI + Stripe Python SDK, checkout + webhook + portal | ECS Fargate |
| Stripe billing (BrandMonkz) | BrandMonkz | `/Users/jeet/Documents/CRM Module/src/routes/subscriptions.ts` | Stripe v3 Node SDK (`2025-09-30.clover`), existing price IDs: Starter/Professional/Enterprise | EC2 |
| Stripe billing (VibingTicket) | VibingTicket | `/Users/jeet/techcloudpro-website/backend/src/routes/paymentRoutes.js` | Controller-based, `getSubscription`, `createCheckoutSession` | EC2 |
| Landing page host | TechCloudPro website | `apps/techcloudpro/` | React 19 + Vite 8 + Tailwind 4 + React Router 7, pre-rendered | Hostinger SSH deploy |
| TechCloudPro BrandMonkz proxy | VibingTicket | `/Users/jeet/techcloudpro-website/backend/src/routes/brandmonkzRoutes.js` | 281-line Express proxy layer, `GET/POST /api/brandmonkz/leads`, `contacts`, `campaigns` | EC2 |
| Kling AI video gen (BrandMonkz) | BrandMonkz video campaigns | `/Users/jeet/Documents/CRM Module/src/services/klingAI.service.ts` | Text-to-video via Kling AI API (Singapore endpoint), `kling-v1` through `kling-v2-5-turbo` | EC2, async task polling |

### NEEDS TO BE BUILT

| Component | Plan | Notes |
|-----------|------|-------|
| Entitlement service | 22-01 | Central usage-counter API — new microservice or Express module |
| LaunchOS Stripe price IDs (3 new) | 22-01 | `$79`, `$149`, `$249/mo` — new Stripe products separate from BrandMonkz/VibingTicket prices |
| ElevenLabs in video render pipeline | 22-02 | New integration: add TTS call before Remotion render, cap by tier |
| Remotion server API | 22-02 | Remotion render currently CLI-only — needs HTTP trigger endpoint |
| BrandMonkz → Social.Network video connector | 22-03 | API call from BrandMonkz campaign to video render job queue |
| Social.Network → BrandMonkz watch-time webhook | 22-04 | Webhook receiver in BrandMonkz + video embed event emitter |
| WebRTC meeting → CRM sync | 22-05 | Post-meeting Claude summary → BrandMonkz deal API |
| AI Strategy Bot | 22-06 | New Claude Sonnet flow, 10-question onboarding → GTM plan |
| Unified LaunchOS dashboard | 22-07 | Single login shell, iframe/SSO pattern tying all tools together |
| ActiveCampaign migration importer | 22-08 | CSV parser + field mapping wizard |
| Consolidation calculator | 22-09 | Client-side React component, `techcloudpro.com/launchos` pricing section |
| LaunchOS landing page | 22-10 | New `LaunchOS.tsx` page + route in TechCloudPro app |
| E2E smoke test + margin verification | 22-11 | Integration test across all 4 apps |

---

## Architecture: How the Apps Are Connected Today

```
BrandMonkz CRM
  Host: EC2 100.24.213.224
  Backend: Node.js/TypeScript, Express, Prisma → PostgreSQL (production-crm-backup)
  Frontend: React 19 + Vite, deployed to /var/www/crm-frontend via nginx
  Auth: JWT (localStorage key: crmToken)
  Stripe: 6 existing price IDs (Starter/Professional/Enterprise, monthly/annual)
  Deploy: ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224

VibingTicket AI Workers
  Host: EC2 54.173.113.128
  Backend: Node.js, Express, MongoDB (Mongoose), Anthropic SDK
  Frontend: React/Vite → S3 vibingticket-production / CloudFront E2Z9OKFXKQIDL8
  Auth: JWT (localStorage key: vibingticket_token or similar), Google OAuth
  Stripe: existing price IDs (starter/professional/enterprise per AI employee)
  Social APIs: TikTok, Instagram, YouTube, Twitter/X, LinkedIn (OAuth + posting)
  ElevenLabs: ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID (Jessica - cgSgspJ2msm6clMCkdW9)
  Deploy: S3 sync + PM2

Zietra Meet (WebRTC)
  Host: ECS Fargate, dollor-production cluster, service: zietra-meet-service
  Stack: TypeScript WebSocket signaling (ws library, port 3001) + React/Vite frontend
  TURN servers: metered.ca (hardcoded credentials in useWebRTC.ts:7-17 — SECURITY RISK)
  Room limit: 8 peers per room (server/index.ts)
  Recording: client-side MediaRecorder (browser-native, no server recording)
  CRM sync: NOT YET BUILT — no post-meeting webhook exists

Social.Network
  Note: "Social.Network" as marketed IS VibingTicket's social publishing feature
  The products.ts entry describes it as an AI networking platform (https://social.network)
  but in practice the video gen + social posting lives in VibingTicket backend
  The social.network domain is not in this codebase at all

Remotion Video Engine
  Location: apps/dollor-video/ and apps/offerletter-video/
  Status: Local Remotion Studio + CLI render only — NO HTTP API
  Render command: npx remotion render src/Root.tsx DollorDemo out/dollor-demo.mp4
  To make this work as a service: need @remotion/lambda OR a server render endpoint

TechCloudPro Website (landing page host)
  Location: apps/techcloudpro/
  Stack: React 19 + Vite 8 + Tailwind 4 + React Router 7 (SPA + pre-rendered)
  Deploy: npm run build → scp to Hostinger 147.93.101.51
  No /launchos route exists yet
  Adding new route = add page file + route in App.tsx + pre-render entry
```

---

## Standard Stack

### Core (Verified)

| Component | Library/Version | Purpose | Location |
|-----------|-----------------|---------|----------|
| BrandMonkz backend | Node.js + TypeScript + Express + Prisma (PostgreSQL) | CRM API | EC2 100.24.213.224 |
| BrandMonkz frontend | React 19 + Vite + Tailwind + TanStack Query + Zod | CRM UI | EC2 (nginx) |
| VibingTicket backend | Node.js + Express + Mongoose (MongoDB) | AI workers, social posting | EC2 54.173.113.128 |
| VibingTicket frontend | React/JSX + Vite | AI employee marketplace | S3/CloudFront |
| WebRTC signaling | ws ^8.16.0 + Node.js HTTP server | Peer-to-peer WebRTC signaling | ECS Fargate |
| WebRTC frontend | React 18 + Vite 5 + TypeScript | Meeting UI | Served by signaling server |
| Video render engine | Remotion ^4.0.0 | Programmatic video generation | Local CLI (no API yet) |
| TTS | ElevenLabs API (eleven_turbo_v2_5) | Marketing video voiceover | VibingTicket EC2 (existing integration) |
| TechCloudPro landing | React 19 + Vite 8 + Tailwind 4 | LaunchOS landing page | Hostinger |
| Stripe (BeatMind pattern) | stripe Python SDK + FastAPI | Subscription billing | ECS Fargate |
| Stripe (Node pattern) | stripe JS SDK v3 (`2025-09-30.clover`) | Subscription billing | EC2 |

### Supporting Infrastructure

| Service | Details | Where Used |
|---------|---------|------------|
| PostgreSQL | BrandMonkz production DB on EC2 | BrandMonkz backend |
| MongoDB | VibingTicket DB | VibingTicket backend |
| SQLite | BeatMind backend | BeatMind ECS |
| Anthropic Claude | SDK in VibingTicket (`@anthropic-ai/sdk ^0.71.2`) and BrandMonkz (`@anthropic-ai/sdk`) | AI workers, video script gen |
| AWS ECS Fargate | dollor-production cluster | Zietra Meet, BeatMind, Dollor.ai |
| AWS S3 | `vibingticket-production` bucket (frontend), `suiteflow-demo` bucket (BrandMonkz video) | Static assets, video storage |
| CloudFront | E2Z9OKFXKQIDL8 (VibingTicket), E3F24X4TEVJ9X2 (BeatMind) | CDN |
| PM2 | Process manager for Node.js backends | VibingTicket EC2, BrandMonkz EC2 |
| Hostinger (nginx) | Static file server | TechCloudPro website |

---

## Architecture Patterns

### Pattern 1: Entitlement Service (Central Usage Counter)

**What:** A new lightweight service that tracks per-user counters (contacts count, emails sent, videos rendered, AI outputs, meeting minutes). Each LaunchOS app calls this before executing a quota-limited action.

**When to use:** Every time any of the 4 apps performs a counted action.

**Design:**

```
POST /entitlements/check
{
  "launchos_user_id": "usr_123",
  "action": "render_video",    // or "send_email" | "add_contact" | "ai_output" | "meeting_minute"
  "quantity": 1
}
Response 200: { "allowed": true, "remaining": 28, "limit": 30 }
Response 402: { "allowed": false, "tier": "starter", "limit": 30, "used": 30, "upgrade_url": "..." }

POST /entitlements/consume    (called after action succeeds)
{
  "launchos_user_id": "usr_123",
  "action": "render_video",
  "quantity": 1
}
```

**User identity bridge:** Since BrandMonkz, VibingTicket, and Zietra Meet have separate auth systems, LaunchOS must issue a shared identity token (HMAC or JWT signed with a LaunchOS secret) that each app receives at SSO time and passes to the entitlement service.

**Stack recommendation:** New Express module OR a minimal FastAPI service on ECS Fargate (follow BeatMind pattern). Store counters in Redis (already on dollor-production cluster) with monthly TTL for reset.

### Pattern 2: Stripe Unified Billing

**What:** Single Stripe subscription (3 new price IDs for LaunchOS) that updates the entitlement service via webhook. Existing BrandMonkz/VibingTicket Stripe subscriptions are SEPARATE products — do not reuse those price IDs.

**Pattern (verified from BeatMind `stripe_routes.py`):**

```python
# Source: apps/ableton-chatbot/backend/stripe_routes.py:59-69
session = stripe.checkout.Session.create(
    mode="subscription",
    payment_method_types=["card"],
    line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
    customer_email=user["email"],
    subscription_data={"trial_period_days": 30},  # 30-day trial per spec
    success_url=f"{FRONTEND_URL}/dashboard?subscribed=true",
    cancel_url=f"{FRONTEND_URL}/launchos#pricing",
    metadata={"launchos_user_id": str(user["id"]), "tier": "growth"},
)
```

**Webhook events to handle:** `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `invoice.payment_failed`

**Idempotency:** Use in-memory set or Redis for event dedup (pattern in `stripe_routes.py:128-130`).

### Pattern 3: BrandMonkz → Social.Network Video Connector

**What:** When a BrandMonkz campaign is finalized, it POSTs campaign copy + metadata to a video generation job endpoint. The job renders via Remotion + ElevenLabs and returns a video URL.

**Challenge:** Remotion currently renders as CLI only. Must build a render server.

**Recommended approach:** Remotion Lambda (`@remotion/lambda`) on AWS Lambda, or a small Node.js server wrapping `npx remotion render` via child_process, deployed on ECS alongside existing services.

```typescript
// BrandMonkz campaigns.ts — new connector call (to build)
POST https://api.launchos.io/video/render
{
  "campaign_id": "cmp_xxx",
  "script": "Campaign copy text...",
  "voiceover": true,         // false if Starter tier or ElevenLabs quota exceeded
  "composition": "Marketing60",
  "launchos_user_id": "usr_123",
  "tier": "growth"
}
Response: { "job_id": "job_abc", "status": "queued", "webhook": "https://brandmonkz.com/api/webhooks/video" }
```

### Pattern 4: Meeting → CRM Sync (Zietra Meet → BrandMonkz)

**What:** After a Zietra Meet session ends, send AI-generated summary to BrandMonkz deal record.

**How Zietra Meet recording works (verified):**
- `useRecording.ts` — client-side MediaRecorder, saves WebM/MP4 blob to user's browser
- No server-side recording — recording stays on the client
- To get AI summary: recording must either (a) be uploaded to S3 for server-side transcription, or (b) use browser Web Speech API for real-time transcript

**Simpler path for v1:** Real-time transcript via WebSocket broadcast during meeting → transcript accumulated on server → Claude summarizes on `leave` event → webhook to BrandMonkz.

**BrandMonkz deal update endpoint (verify before planning):**
```
PATCH /api/deals/:id  (authenticated)
{ "notes": "Meeting summary: ..." }
```

### Pattern 5: ElevenLabs Video Pipeline Integration

**Existing ElevenLabs pattern (verified from VibingTicket):**

```javascript
// Source: /Users/jeet/techcloudpro-website/backend/src/services/voice/elevenLabsTTSService.js:38-51
const postData = JSON.stringify({
  text,
  model_id: 'eleven_turbo_v2_5',
  voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
});
// POST to: https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128
// Header: 'xi-api-key': this.apiKey
```

**New integration point:** Add ElevenLabs call in video render pipeline — after script generation, before Remotion render. Output: MP3 file → pass to Remotion as audio source (`<Audio src={audioUrl} />`).

**Tier cap enforcement in render service:**
```
Starter:  5 videos/mo, each up to ~700 chars script → ≈3,500 chars/mo
Growth:   30 videos/mo, up to ~700 chars each → ≈21,000 chars/mo
Scale:    ~714 videos/mo (500K char ElevenLabs Pro cap)
Fallback: If quota exceeded → render video with background music (no voiceover), no error shown to user
```

### Pattern 6: LaunchOS Landing Page (TechCloudPro)

**Existing pattern (verified):**
- Add `LaunchOS.tsx` to `apps/techcloudpro/src/pages/`
- Add route to `apps/techcloudpro/src/App.tsx`:
  ```tsx
  const LaunchOS = lazy(() => import('./pages/LaunchOS'))
  // In Routes:
  <Route path="/launchos" element={<LaunchOS />} />
  ```
- Add to prerender list in `scripts/prerender.mjs` (check existing file)
- Deploy: `npm run build && scp -P 65002 -r dist/* u350621741@147.93.101.51:domains/techcloudpro.com/public_html/`

### Anti-Patterns to Avoid

- **Sharing Stripe subscriptions:** BrandMonkz already has Starter/Professional/Enterprise Stripe products. LaunchOS needs NEW price IDs — do not reuse BrandMonkz's `price_1SEoYzJePbhql2pN...` price IDs. Users may want both products independently.
- **Schema changes to existing apps:** The entitlement service should be a standalone microservice, not a new table in BrandMonkz's PostgreSQL or VibingTicket's MongoDB. Modifying existing schemas risks breaking production apps.
- **iframe-based unified dashboard:** iframe security (X-Frame-Options, CSP) will block embedding BrandMonkz, VibingTicket, etc. Use redirect-based SSO with shared JWT secret instead.
- **CLI Remotion renders in request path:** `npx remotion render` is slow (20-60s for 60s video). Always enqueue as async job, never synchronously in the HTTP response.
- **Hardcoded TURN credentials:** `useWebRTC.ts:7-17` has hardcoded metered.ca TURN credentials. These must be rotated to environment variables before production LaunchOS launch.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|------------|-------------|-----|
| Video render server API | Custom ffmpeg pipeline | Remotion Lambda (`@remotion/lambda`) or Remotion server render | Remotion handles composition, timing, React rendering pipeline — ffmpeg doesn't understand JSX |
| Real-time meeting transcript | Custom WebRTC audio capture | Browser Web Speech API (SpeechRecognition) OR Deepgram/AssemblyAI stream | Complexity of server-side audio mixing |
| Stripe idempotency | Custom dedup logic | Event ID set pattern (already in `stripe_routes.py:128`) | Stripe events can replay |
| JWT cross-app SSO | Cookie sharing | Short-lived signed URL or LaunchOS JWT with shared secret | Different domains can't share cookies |
| ElevenLabs quota tracking | DB counter per API call | ElevenLabs `/v1/user/subscription` endpoint returns `character_count` used this period | Source of truth is ElevenLabs API itself |

---

## Common Pitfalls

### Pitfall 1: Cross-Origin Identity (Different Auth Systems Per App)
**What goes wrong:** BrandMonkz uses `crmToken` (JWT), VibingTicket uses its own JWT, Zietra Meet has no auth at all (room-code only). There is no shared user identity.
**Why it happens:** Apps were built independently.
**How to avoid:** LaunchOS layer issues a `launchos_token` (short-lived JWT signed with a LaunchOS secret) that maps to the user's account in each sub-app. Each sub-app validates it by calling the entitlement service (which is the authority for user identity).
**Warning signs:** Trying to reuse BrandMonkz JWT in VibingTicket — different secrets, will fail.

### Pitfall 2: BrandMonkz EC2 Deployment Pattern (Not Git-Based)
**What goes wrong:** BrandMonkz is NOT deployed via git push. The backend TypeScript is compiled locally and scp'd to EC2. Making API changes requires: edit TS → `tsc` build → `scp dist/routes/foo.js ec2-user@100.24.213.224:/var/www/crm-backend/dist/routes/` → `pm2 restart crm-backend`.
**Why it happens:** EC2 deploy pattern established before GSD workflow.
**How to avoid:** Follow the exact deploy pattern from Quick-266 SUMMARY. Never run `prisma migrate` directly against production without testing on a copy first.
**Warning signs:** `pm2 logs crm-backend` shows `SyntaxError` or Prisma errors after deploy.

### Pitfall 3: BrandMonkz Duplicate PrismaClient (26 instances)
**What goes wrong:** Adding new routes that create `new PrismaClient()` instead of using the shared instance causes connection pool exhaustion under load.
**Why it happens:** Known architectural debt (documented in audit at Quick-260).
**How to avoid:** New BrandMonkz routes MUST use `import { prisma } from '../prisma'` (the shared singleton at `src/prisma.ts`).

### Pitfall 4: BrandMonkz Email — Only One Working Send Path
**What goes wrong:** BrandMonkz has 4 different email send functions. Only `sendEmailViaEnvSMTP()` works in production (uses peter@techcloudpro.com SMTP). All new campaign/notification code must use this function.
**How to avoid:** Search for `sendEmailViaEnvSMTP` in `campaigns.ts` and follow that pattern exactly. Never use `sendEmail()` (requires user-configured DB email server) or `sendEmailViaSES()` (sandbox only).

### Pitfall 5: Remotion Render Is CLI-Only — No HTTP API
**What goes wrong:** The spec says "Social.Network renders marketing video" but `apps/dollor-video/` has no HTTP server — it's Remotion Studio + CLI only. Triggering a render requires `npx remotion render ...`.
**How to avoid:** Build a render service wrapper first (Plan 22-02) before any connector that depends on video generation.

### Pitfall 6: VibingTicket Video Gen Uses Kling AI, NOT Remotion
**What goes wrong:** VibingTicket's `klingAI.service.ts` and `emmaVideoRoutes.js` do AI-generated video (text-to-video with avatars) — this is a DIFFERENT kind of video from Remotion marketing animations. Kling AI generates realistic video; Remotion generates motion graphic animations.
**Why it matters for LaunchOS:** The spec says "marketing video" — this means Remotion-style motion graphics (company logo, product shots, animated text), not Kling AI avatar video. Clarify with user before building.
**How to avoid:** Confirm video type in planning before implementing 22-02.

### Pitfall 7: TURN Server Credentials Are Hardcoded
**What goes wrong:** `apps/zoom/frontend/src/hooks/useWebRTC.ts:7-17` has hardcoded metered.ca TURN server credentials (`e8dd65e92f3b1eff0f29b848` / `mCY0FxMflgJNm3Xq`). These are likely the free tier of metered.ca and shared with others.
**How to avoid:** Move to environment variables before production LaunchOS launch. Consider self-hosted coturn on the ECS cluster for cost at scale.

### Pitfall 8: TechCloudPro Has No Backend — Landing Page Is Static
**What goes wrong:** The LaunchOS landing page calculator and free trial CTA need to collect emails/start Stripe checkout. TechCloudPro (`apps/techcloudpro/`) has no backend — only a PHP contact form on Hostinger.
**How to avoid:** The "free trial" CTA should redirect to BrandMonkz signup (`https://brandmonkz.com/signup?utm_source=launchos`) rather than a custom endpoint on Hostinger. The consolidation calculator is entirely client-side JavaScript (no backend needed).

---

## Code Examples

### Verified: Stripe Checkout Session (BeatMind pattern)
```python
# Source: apps/ableton-chatbot/backend/stripe_routes.py:59-69
session = stripe.checkout.Session.create(
    mode="subscription",
    payment_method_types=["card"],
    line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
    customer_email=user["email"],
    subscription_data={"trial_period_days": 7},
    success_url=f"{FRONTEND_URL}/dashboard?subscribed=true",
    cancel_url=f"{FRONTEND_URL}/#pricing",
    metadata={"user_id": str(user["id"])},
)
return {"url": session.url}
```

### Verified: Stripe Webhook Idempotency
```python
# Source: apps/ableton-chatbot/backend/stripe_routes.py:127-130
event_id = event["id"]
if event_id in _processed_events:
    return {"received": True, "duplicate": True}
_processed_events.add(event_id)
if len(_processed_events) > 10000:
    _processed_events.clear()
```

### Verified: ElevenLabs TTS HTTP Call Pattern
```javascript
// Source: /Users/jeet/techcloudpro-website/backend/src/services/voice/elevenLabsTTSService.js:38-76
const postData = JSON.stringify({
  text,
  model_id: 'eleven_turbo_v2_5',
  voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
});
// POST https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128
// Header: 'xi-api-key': this.apiKey
// Output: MP3 file piped to filesystem
```

### Verified: Remotion Composition Structure (dollor-video)
```typescript
// Source: apps/dollor-video/src/Root.tsx
export const RemotionRoot: React.FC = () => (
  <Composition
    id="DollorDemo"
    component={Video}
    durationInFrames={4200}   // 4200/30fps = 140 seconds
    fps={30}
    width={1920}
    height={1080}
  />
);
```

### Verified: WebRTC Signaling — Room Join Message
```typescript
// Source: apps/zoom/server/index.ts (WS message handler)
// msg.type === 'join' → validates room, checks password, checks MAX_ROOM_SIZE (8)
// Rooms stored in-memory Map<string, Room> — no persistence between server restarts
```

### Verified: BrandMonkz Email Send (Only Working Path)
```typescript
// Pattern from Quick-260 audit and Quick-266 SUMMARY
// campaigns.ts — use sendEmailViaEnvSMTP() for campaign sends
// SMTP: smtp.office365.com:587, user: peter@techcloudpro.com
// NEVER use sendEmail() (requires user DB email server) or sendEmailViaSES() (sandbox)
```

### Verified: TechCloudPro New Page Pattern
```tsx
// Source: apps/techcloudpro/src/App.tsx
const LaunchOS = lazy(() => import('./pages/LaunchOS'))
// Inside Routes:
<Route path="/launchos" element={<LaunchOS />} />
// Then: npm run build (triggers prerender) → scp to Hostinger
```

---

## Open Questions

1. **Video type for LaunchOS: Remotion motion graphics vs Kling AI avatar video?**
   - What we know: Remotion exists in the monorepo (motion graphics). VibingTicket has Kling AI (avatar video). Spec says "marketing video from campaign copy."
   - What's unclear: Which kind of video is intended for the BrandMonkz→Social.Network connector?
   - Recommendation: Confirm with user. Motion graphics (Remotion) are faster, cheaper, and deterministic. Avatar video (Kling AI) is more realistic but slower and API-cost-dependent.

2. **Unified dashboard: iframe embedding vs redirect-based SSO vs unified React app?**
   - What we know: Iframe embedding won't work (X-Frame-Options/CSP on brandmonkz.com and vibingticket.com).
   - What's unclear: Should LaunchOS be a new standalone app (new domain?) or a shell within TechCloudPro that deep-links to each tool?
   - Recommendation: Redirect-based SSO. LaunchOS dashboard = new React app at `app.launchos.io` (or subdomain of techcloudpro.com) that issues a LaunchOS JWT, then redirects to each tool with `?launchos_token=xxx`. Simpler than building a unified shell.

3. **ElevenLabs quota management: track in entitlement service or call ElevenLabs API?**
   - What we know: ElevenLabs `/v1/user/subscription` returns `character_count` (used this period). The entitlement service can track chars independently.
   - Recommendation: Track chars in the entitlement service (faster, no extra API call per render). Reset on billing cycle. ElevenLabs API check only for discrepancy detection.

4. **Zietra Meet: is it currently deployed to ECS, or just has a deploy script?**
   - What we know: `apps/zoom/deploy/deploy.sh` creates an ECS service `zietra-meet-service`. Deploy script exists but we don't know if it's been run.
   - Recommendation: Before building meeting→CRM sync (22-05), verify the service is live: `aws ecs describe-services --cluster dollor-production --services zietra-meet-service`.

5. **Social.Network identity: is it actually VibingTicket, or is there a separate social.network app?**
   - What we know: `apps/techcloudpro/src/data/products.ts` lists `social.network` as a product with URL `https://social.network`. No app in the monorepo maps to this URL. VibingTicket has social posting via socialRoutes.js.
   - Recommendation: Treat VibingTicket's social publishing as the "Social.Network" component for v1. The products.ts description is aspirational marketing copy.

---

## Key Files By Plan

| Plan | Key Files Needed |
|------|-----------------|
| 22-01 (Entitlement + Stripe) | NEW service, `apps/ableton-chatbot/backend/stripe_routes.py` (pattern), BrandMonkz `subscriptions.ts` (reference) |
| 22-02 (ElevenLabs + Remotion API) | `apps/dollor-video/src/`, `elevenLabsTTSService.js`, NEW render server |
| 22-03 (BrandMonkz → video) | `/Documents/CRM Module/src/routes/campaigns.ts`, NEW connector endpoint |
| 22-04 (Watch-time webhook) | BrandMonkz lead scoring route (verify exists), VibingTicket video embed code |
| 22-05 (Meeting → CRM) | `apps/zoom/server/index.ts`, `apps/zoom/frontend/src/hooks/useRecording.ts`, BrandMonkz deals route |
| 22-06 (AI Strategy Bot) | BrandMonkz `contacts.ts` + `campaigns.ts` (config API), Anthropic SDK pattern from VibingTicket |
| 22-07 (Unified dashboard) | NEW React app or new page in TechCloudPro, entitlement service auth |
| 22-08 (ActiveCampaign importer) | BrandMonkz `bulkImport.ts` + `csvImport.ts` (existing patterns), BrandMonkz contacts/companies API |
| 22-09 (Calculator) | `apps/techcloudpro/src/pages/` (new component), client-side only |
| 22-10 (Landing page) | `apps/techcloudpro/src/App.tsx`, `apps/techcloudpro/src/pages/` (new LaunchOS.tsx) |
| 22-11 (Smoke test) | All API endpoints across all 4 apps |

---

## Sources

### Primary (HIGH confidence — direct file inspection)

- `apps/zoom/server/index.ts` — WebRTC signaling: room structure, MAX_ROOM_SIZE=8, password handling
- `apps/zoom/frontend/src/hooks/useWebRTC.ts` — ICE/TURN config, hardcoded TURN credentials
- `apps/zoom/frontend/src/hooks/useRecording.ts` — client-side MediaRecorder recording (no server recording)
- `apps/zoom/deploy/deploy.sh` + `apps/zoom/deploy/Dockerfile` — ECS Fargate deploy, ECR `zietra-meet`
- `apps/dollor-video/src/Root.tsx` + `package.json` — Remotion 4.x, CLI-only, no HTTP API
- `apps/ableton-chatbot/backend/stripe_routes.py` — Full Stripe checkout/webhook/portal pattern
- `apps/ableton-chatbot/backend/database.py` — SQLite user model with subscription_status field
- `apps/ableton-chatbot/backend/beatmind_auth.py` — JWT pattern (jose library, 30-day expiry)
- `apps/techcloudpro/src/App.tsx` — All current routes, no /launchos yet
- `apps/techcloudpro/src/data/products.ts` — Product listings (BrandMonkz, VibingTicket, Social.Network)
- `apps/techcloudpro/package.json` — React 19 + Vite 8 + Tailwind 4 + React Router 7
- `/Users/jeet/Documents/CRM Module/src/routes/subscriptions.ts` — BrandMonkz Stripe checkout (Stripe 2025-09-30 API)
- `/Users/jeet/Documents/CRM Module/src/routes/campaigns.ts` — Anthropic SDK, email functions, video campaigns
- `/Users/jeet/Documents/CRM Module/src/services/klingAI.service.ts` — Kling AI video gen (NOT Remotion)
- `/Users/jeet/Documents/CRM Module/prisma/schema.prisma:105-195` — User model (no tier/entitlement fields yet)
- `/Users/jeet/Documents/CRM Frontend/crm-app/src/pages/Pricing/PricingPage.tsx:154-209` — Existing BrandMonkz Stripe price IDs
- `/Users/jeet/Documents/CRM Frontend/crm-app/src/App.tsx` — BrandMonkz routing (all screens)
- `/Users/jeet/Documents/CRM Frontend/crm-app/package.json` — React 19 + Vite + TanStack Query + Stripe JS
- `/Users/jeet/techcloudpro-website/backend/src/services/voice/elevenLabsTTSService.js` — ElevenLabs TTS: `eleven_turbo_v2_5`, Jessica voice
- `/Users/jeet/techcloudpro-website/backend/src/routes/socialRoutes.js` — TikTok, Instagram, YouTube, Twitter, LinkedIn OAuth
- `/Users/jeet/techcloudpro-website/backend/src/routes/brandmonkzRoutes.js` — 281-line BrandMonkz proxy in VibingTicket
- `/Users/jeet/techcloudpro-website/backend/src/models/Subscription.js` — VibingTicket sub model (starter/professional/enterprise)
- `/Users/jeet/techcloudpro-website/backend/src/models/User.js` — MongoDB user, stripeCustomerId, freeMessageCredits
- `/Users/jeet/techcloudpro-website/CLAUDE.md` — VibingTicket deploy: S3 + CloudFront + EC2
- `~/.claude/projects/-Users-jeet-doordash-p2p/memory/brandmonkz-architecture.md` — EC2 100.24.213.224, PM2, SMTP rules
- `.planning/quick/260-deep-audit.../AUDIT_REPORT.md` — BrandMonkz audit: 4 email functions, 26 Prisma instances
- `.planning/quick/266.../266-SUMMARY.md` — BrandMonkz deploy pattern: compile locally → scp → pm2 restart

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` — Phase 22 goal, 11 plans, success criteria (document not code)
- `docs/superpowers/specs/2026-04-04-techcloudpro-launchos-design.md` — Product spec (decision document, not code)

---

## Metadata

**Confidence breakdown:**
- Existing app stack: HIGH — verified by reading actual source files
- Integration architecture: MEDIUM — designed based on current app structure; cross-app auth pattern is new
- Entitlement service design: MEDIUM — no existing pattern in this codebase; follows BeatMind subscription model
- Remotion render server: LOW — Remotion Lambda docs not checked; CLI render is confirmed, HTTP API needs research
- ElevenLabs integration: HIGH — existing production integration in VibingTicket verified
- TURN server: HIGH — credentials hardcoded and confirmed (also confirmed as security issue)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable ecosystem, but BrandMonkz/VibingTicket EC2 deploys can change schemas)

---

## Phase Requirements Coverage

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOS-01 | Single login unlocks all tools per tier | Cross-app JWT SSO pattern needed — no shared auth today. Entitlement service is the identity authority. |
| LOS-02 | BrandMonkz campaign copy triggers Social.Network video gen | Connector API: BrandMonkz `campaigns.ts` → new render service endpoint. Remotion render server must be built first. |
| LOS-03 | Social.Network video embed fires watch-time webhook to BrandMonkz lead score | BrandMonkz has lead scoring in `contacts.ts` (verify exact endpoint). Video embed player must emit JS events. |
| LOS-04 | WebRTC meeting AI summary auto-synced to BrandMonkz deal post-meeting | Zietra Meet needs server-side transcript accumulation. BrandMonkz deals PATCH endpoint must be verified. |
| LOS-05 | ElevenLabs TTS in video pipeline, per-tier caps | ElevenLabs integration EXISTS in VibingTicket. New: pipe audio into Remotion render. Caps: 3.5K/21K/500K chars. |
| LOS-06 | Entitlement service enforces caps across all 4 apps | New microservice. Redis for counters. Monthly reset. Each app calls `/entitlements/check` before quota actions. |
| LOS-07 | Single Stripe subscription (3 price IDs: $79/$149/$249) | NEW Stripe products — do not reuse BrandMonkz or VibingTicket price IDs. Follow BeatMind stripe_routes.py pattern. |
| LOS-08 | ActiveCampaign CSV migration importer | BrandMonkz already has `bulkImport.ts` and `csvImport.ts`. New: AC-specific field mapping wizard in frontend. |
| LOS-09 | Consolidation calculator on techcloudpro.com/launchos pricing section | Client-side React only. TechCloudPro has no backend. Calculator lives in LaunchOS.tsx page component. |
| LOS-10 | LaunchOS landing page at techcloudpro.com/launchos | New page in `apps/techcloudpro/src/pages/LaunchOS.tsx` + route in App.tsx + prerender + Hostinger deploy. |
| LOS-11 | Gross margin verified: Growth tier avg cost ≤ $18/user/month | Monitoring: ElevenLabs usage API, Anthropic usage API, AWS Cost Explorer for bandwidth. Math is in spec §7. |
</phase_requirements>
