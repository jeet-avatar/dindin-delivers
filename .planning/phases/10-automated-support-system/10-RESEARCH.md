# Phase 10: Automated Support System - Research

**Researched:** 2026-03-02
**Domain:** AI Voice Agent (Twilio + OpenAI Realtime), iOS Chat UI, Feature Flag Management
**Confidence:** HIGH (Plan 10-01), MEDIUM (Plans 10-02/10-03)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Keep:** AI Insights tab (Tab 3) -- functional, real backend data (demand forecasting, top items, staffing)
- **Hide:** AI Employees / Workforce view (`AIEmployeesView.swift`) -- aspirational, Firebase-based mock
- **Hide:** AI Feature Toggles in Settings (Demand Prediction, Prep Time, Menu Suggestions) -- placeholder, not wired
- **Hide:** AI Suggestion Banner in Orders Dashboard (`EnhancedDashboardView.swift`) -- never populated
- **Method:** Compile-time feature flag (`#if ENABLE_AI_EMPLOYEES`) -- easy to restore later
- **Scope:** Flag Restaurant app views and navigation links only -- shared models in eatfair-ios-shared stay untouched
- **Backend:** Leave mock endpoint `/api/erp/analytics/ai-employees` as-is (harmless)
- **Voice Agent Purpose:** Full support agent -- order issues, complaints, refunds, account help, restaurant/driver help
- **Identity:** Transparent AI -- "Hi, this is Dollor AI support" -- honest about being AI
- **Phone number:** Use existing 1-800-DOLLOR vanity number (+1-800-365-5671)
- **Caller auth:** Phone number match to account phone number
- **User types:** All three (customers, drivers, restaurants) -- route based on phone number match to role
- **Refunds:** Escalate only -- AI logs the request and promises follow-up
- **Architecture:** Add Twilio webhook endpoints to existing FastAPI backend (main_new.py) -- no new microservice
- **Order chat UI:** Build new chat view for food delivery orders (backend API already exists)
- **Chat parties:** Customer chats with delivery driver only (like rideshare DriverChatView pattern)
- **Driver app:** Yes -- add order chat to both Customer and Driver apps for two-way communication
- **Help screen fixes:** Fix phone number (+18003655671), wire Live Chat to AI text agent
- **Pattern:** Follow existing DriverChatView.swift as template for order chat UI
- **Escalation path:** AI collects details and emails summary to support@dollor.ai
- **Call recording:** Record with consent -- standard disclosure at start

### Claude's Discretion
- OpenAI Realtime voice selection (best for customer support)
- Call duration limit before suggesting the caller leave a message
- Order chat UI layout details (follow existing DriverChatView patterns)
- AI agent greeting script and conversation flow structure
- Text chat UI for Live Chat feature

### Deferred Ideas (OUT OF SCOPE)
- WebSocket upgrade for chat (currently REST polling every 3s)
- Restaurant chat (customer <-> restaurant)
- AI agent issuing direct refunds via Stripe
- Call analytics dashboard
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUPPORT-01 | AI Employees and aspirational AI feature toggles are hidden from Restaurant app (AI Insights/analytics remains) | Codebase audit identifies exactly 4 locations to wrap with `#if ENABLE_AI_EMPLOYEES`: AIEmployeesView, AI Feature Toggles section in Settings, AI Workforce section in Settings, AI Suggestion Banner in Dashboard |
| SUPPORT-02 | Twilio + OpenAI Realtime Voice handles incoming calls on support number -- can look up orders, give status, handle basic support | Twilio Media Streams + OpenAI gpt-realtime model architecture documented with Python FastAPI WebSocket bridge pattern, tool calling for backend lookups |
| SUPPORT-03 | In-app chat for customer order tracking works (broken URLs fixed) | Backend chat API already complete (`/api/customer/orders/{order_id}/chat`), existing DriverChatView.swift (318 lines) is the proven template, one phone number to fix in HelpSupportView.swift line 218 |
</phase_requirements>

## Summary

Phase 10 has three distinct work streams with different complexity levels. The first (hiding AI features) is a straightforward iOS feature-flagging task affecting 4 locations in the Restaurant app. The second (Twilio + OpenAI voice agent) is a new backend integration requiring Twilio Media Streams bridged to OpenAI's Realtime API via WebSocket, with function/tool calling for order lookups. The third (chat UI) involves building an OrderChatView by cloning the existing DriverChatView pattern and fixing a single hardcoded phone number.

The backend already has a complete chat API (`chat_routes.py` with 6 endpoints) and customer order chat endpoints (`/api/customer/orders/{order_id}/chat` GET/POST in main_new.py:16217-16303). The existing WebSocket infrastructure (`websocket_server.py`) provides the ConnectionManager pattern. The Twilio + OpenAI integration is well-documented with official Python tutorials from Twilio, using FastAPI WebSocket handlers to bridge Twilio Media Streams audio to OpenAI's Realtime API.

**Primary recommendation:** Plan 10-01 (iOS feature flags + chat) can ship independently and quickly. Plans 10-02/10-03 (voice agent) require new backend dependencies (twilio, websockets) and Twilio account setup, which should be validated on staging before production.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| twilio | latest (9.x) | TwiML generation, Twilio API client | Official Twilio Python SDK, generates TwiML XML responses for call handling |
| websockets | 12.x+ | WebSocket client to OpenAI Realtime API | Already in uvicorn[standard] deps; needed for async WS connection to OpenAI |
| fastapi | 0.115.0 | Existing backend framework | Already in use -- add new WebSocket endpoint and HTTP endpoint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| openai | latest | OpenAI API key management (optional) | Only if using REST endpoints; Realtime API uses raw WebSocket with auth header |
| python-dotenv | 1.0.1 | Environment variables | Already in use -- add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, OPENAI_API_KEY |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Twilio Media Streams (raw audio) | Twilio ConversationRelay | ConversationRelay handles STT/TTS orchestration but does NOT work with OpenAI Realtime API's native speech-to-speech; Media Streams is required for S2S |
| OpenAI Realtime API | Separate STT + LLM + TTS pipeline | 3x latency, 3x integration complexity; Realtime API does speech-to-speech natively |
| gpt-realtime | gpt-realtime-mini | Mini is ~50% cheaper but lower quality; for a support agent, use full model |

**Installation (backend only):**
```bash
pip install twilio websockets
# Add to requirements.txt:
# twilio>=9.0.0
# websockets>=12.0
```

**New Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=xxxxxx
OPENAI_API_KEY=sk-xxxxxx
```

These must be added to AWS Secrets Manager for both staging and production.

## Architecture Patterns

### Backend Extension Structure
```
apps/web/p2p-platform/backend/
├── main_new.py              # Add /incoming-call and /media-stream endpoints
├── voice_agent.py           # NEW: Twilio<->OpenAI bridge, tool definitions, system prompt
├── voice_agent_tools.py     # NEW: Tool implementations (order_lookup, ride_lookup, etc.)
├── chat_routes.py           # EXISTING: Order chat API (already complete)
├── websocket_server.py      # EXISTING: WebSocket infrastructure
└── requirements.txt         # Add twilio, websockets
```

### iOS Feature Flag Structure
```
apps/ios/restaurant/eatffairrestaurant/
├── Views/
│   ├── AIEmployeesView.swift         # Wrap entire file with #if ENABLE_AI_EMPLOYEES
│   ├── EnhancedDashboardView.swift   # Wrap AISuggestionBanner usage (line 91-93)
│   └── RestaurantSettingsView.swift  # Wrap "AI Features" section (lines 338-392)
│                                     # Wrap "AI Workforce" section (lines 394-415)
```

### Pattern 1: Twilio Media Streams to OpenAI Realtime Bridge
**What:** FastAPI receives Twilio webhook on incoming call, returns TwiML with WebSocket `<Stream>` directive, then bridges audio between Twilio and OpenAI Realtime API.
**When to use:** Every incoming call to 1-800-DOLLOR.
**Example:**

```python
# Source: https://www.twilio.com/en-us/blog/voice-ai-assistant-openai-realtime-api-python

from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import HTMLResponse
from twilio.twiml.voice_response import VoiceResponse, Connect
import websockets
import json
import base64
import asyncio

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
VOICE = "sage"  # Recommended: calm, professional voice for support

@app.api_route("/api/voice/incoming-call", methods=["GET", "POST"])
async def handle_incoming_call(request: Request):
    """Twilio webhook: incoming call handler. Returns TwiML."""
    response = VoiceResponse()
    response.say(
        "This call may be recorded for quality purposes. "
        "Hi, this is Dollor AI support. How can I help you today?",
        voice="Google.en-US-Chirp3-HD-Aoede"
    )
    response.pause(length=1)
    host = request.url.hostname
    connect = Connect()
    connect.stream(url=f'wss://{host}/api/voice/media-stream')
    response.append(connect)
    return HTMLResponse(content=str(response), media_type="application/xml")

@app.websocket("/api/voice/media-stream")
async def handle_media_stream(websocket: WebSocket):
    """Bridge Twilio Media Stream <-> OpenAI Realtime API."""
    await websocket.accept()
    async with websockets.connect(
        "wss://api.openai.com/v1/realtime?model=gpt-realtime",
        additional_headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1"
        }
    ) as openai_ws:
        await initialize_session(openai_ws)
        stream_sid = None

        async def receive_from_twilio():
            nonlocal stream_sid
            async for message in websocket.iter_text():
                data = json.loads(message)
                if data['event'] == 'media':
                    await openai_ws.send(json.dumps({
                        "type": "input_audio_buffer.append",
                        "audio": data['media']['payload']
                    }))
                elif data['event'] == 'start':
                    stream_sid = data['start']['streamSid']

        async def send_to_twilio():
            nonlocal stream_sid
            async for openai_message in openai_ws:
                response = json.loads(openai_message)
                if response['type'] == 'response.output_audio.delta':
                    await websocket.send_json({
                        "event": "media",
                        "streamSid": stream_sid,
                        "media": {"payload": response['delta']}
                    })

        await asyncio.gather(receive_from_twilio(), send_to_twilio())
```

### Pattern 2: OpenAI Realtime Tool Calling for Backend Lookups
**What:** Define tools in session config so the AI can query the Dollor.ai backend during a live call.
**When to use:** When caller asks about order status, ride details, account info.
**Example:**

```python
# Source: https://platform.openai.com/docs/api-reference/realtime (session.update)

async def initialize_session(openai_ws):
    """Configure OpenAI Realtime session with tools for backend lookups."""
    session_update = {
        "type": "session.update",
        "session": {
            "instructions": SUPPORT_AGENT_SYSTEM_PROMPT,
            "voice": "sage",
            "tools": [
                {
                    "type": "function",
                    "name": "lookup_order",
                    "description": "Look up a food delivery order by order ID or customer phone number",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "order_id": {"type": "integer", "description": "Order ID number"},
                            "phone": {"type": "string", "description": "Customer phone number"}
                        }
                    }
                },
                {
                    "type": "function",
                    "name": "lookup_ride",
                    "description": "Look up a rideshare request by ride ID or phone number",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "ride_id": {"type": "integer", "description": "Ride request ID"},
                            "phone": {"type": "string", "description": "Rider phone number"}
                        }
                    }
                },
                {
                    "type": "function",
                    "name": "log_escalation",
                    "description": "Log a support request for human follow-up (refunds, complaints, complex issues)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "caller_phone": {"type": "string"},
                            "issue_type": {"type": "string", "enum": ["refund", "complaint", "account_issue", "other"]},
                            "summary": {"type": "string", "description": "Brief summary of the issue"}
                        },
                        "required": ["caller_phone", "issue_type", "summary"]
                    }
                }
            ],
            "tool_choice": "auto",
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": {"type": "server_vad"}
        }
    }
    await openai_ws.send(json.dumps(session_update))
```

### Pattern 3: iOS Feature Flag with #if Compiler Directive
**What:** Wrap aspirational AI views with compile-time flag that defaults to disabled.
**When to use:** Hiding AI Employees, AI Feature Toggles, AI Suggestion Banner.
**Example:**

```swift
// In RestaurantSettingsView.swift -- wrap AI Features section
#if ENABLE_AI_EMPLOYEES
// AI Features Section
Section("AI Features") {
    Toggle(isOn: $viewModel.aiDemandPrediction) { ... }
    Toggle(isOn: $viewModel.aiPrepTimeOptimization) { ... }
    Toggle(isOn: $viewModel.aiMenuSuggestions) { ... }
}

// AI Workforce Section
Section("AI Workforce") {
    NavigationLink(destination: AIEmployeesView()) { ... }
}
#endif
```

To set the flag: In Xcode, go to Build Settings > Swift Compiler - Custom Flags > Active Compilation Conditions. Do NOT add `ENABLE_AI_EMPLOYEES` -- leaving it undefined means the code is compiled out.

### Pattern 4: OrderChatView (clone from DriverChatView)
**What:** Create an OrderChatView for food delivery that mirrors the rideshare DriverChatView pattern.
**When to use:** Customer app order tracking, driver app active delivery.
**Example:**

```swift
// Source: apps/ios/customer/eatfaircustomer/Views/DriverChatView.swift (proven pattern)

struct OrderChatView: View {
    let orderId: Int
    let driverName: String
    let driverPhone: String?

    @State private var messages: [OrderChatMessage] = []
    @State private var messageText = ""
    @State private var pollingTimer: Timer?

    private let quickMessages = [
        "Where is my order?",
        "How long will it take?",
        "I'm at the door",
        "Please leave at the door",
        "Can you call me?",
        "Thank you!"
    ]

    // Uses /api/customer/orders/{orderId}/chat GET/POST
    // Same structure as DriverChatView: ScrollView + quick messages + input bar + polling
}
```

### Anti-Patterns to Avoid
- **DO NOT create a separate microservice for voice agent:** The decision is locked -- add endpoints to existing FastAPI backend. A separate service would add deployment complexity for no benefit at current scale.
- **DO NOT use ConversationRelay for this integration:** ConversationRelay handles STT/TTS separately, which defeats the purpose of OpenAI's native speech-to-speech Realtime API.
- **DO NOT hand-roll WebSocket audio format conversion:** Twilio Media Streams sends audio in mu-law format (PCMU/G.711); OpenAI Realtime API also supports `audio/pcmu` -- they are directly compatible. No transcoding needed.
- **DO NOT try to modify AIInsightsView or AIInsightsViewModel:** These are functional, real-data views (Tab 3 in dashboard) and must remain untouched.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TwiML generation | XML string concatenation | `twilio.twiml.voice_response.VoiceResponse` | Edge cases with XML escaping, encoding |
| Audio format conversion | Custom PCMU encoder/decoder | Direct passthrough (Twilio PCMU == OpenAI PCMU) | Formats are already compatible |
| Voice Activity Detection | Custom silence detection | OpenAI's `server_vad` turn detection | Server-side VAD handles interruptions, silence, barge-in |
| Chat UI components | Custom message bubbles | Clone DriverChatView.swift pattern | 318-line proven component with polling, quick messages, input bar |
| Phone number matching | Custom caller ID lookup | Twilio webhook provides `From` parameter | Twilio sends caller info in webhook POST body |

**Key insight:** The Twilio + OpenAI Realtime stack is designed to be a thin bridge -- your server just proxies audio between two WebSocket connections. The intelligence is in the system prompt and tool definitions, not custom audio processing.

## Common Pitfalls

### Pitfall 1: Audio Format Mismatch
**What goes wrong:** No audio or garbled audio when bridging Twilio to OpenAI.
**Why it happens:** Twilio Media Streams uses mu-law (PCMU/G.711 at 8kHz), and developers sometimes try to convert to PCM16. OpenAI Realtime API supports `audio/pcmu` natively for Twilio integration.
**How to avoid:** In session.update, set `"audio": {"input": {"format": {"type": "audio/pcmu"}}, "output": {"format": {"type": "audio/pcmu"}}}`. This matches Twilio's native format.
**Warning signs:** Complete silence on one side, or robotic/garbled audio.

### Pitfall 2: OpenAI Realtime Session Limit (15 Minutes)
**What goes wrong:** Call drops after 15 minutes with no warning.
**Why it happens:** OpenAI Realtime API has a hard 15-minute session limit.
**How to avoid:** Set the AI system prompt to proactively wrap up calls around 10-12 minutes. Include a tool that checks elapsed time and prompts the agent to suggest emailing or calling back.
**Warning signs:** Long support calls with complex issues.
**Recommendation for call duration limit:** 10 minutes active conversation, then suggest the caller email or leave a message. This stays safely within the 15-minute API limit.

### Pitfall 3: Twilio Webhook Must Be HTTPS with Valid Certificate
**What goes wrong:** Twilio refuses to send webhooks, calls go to voicemail or error tone.
**Why it happens:** Twilio requires HTTPS with valid SSL certificate for webhooks. The staging CloudFront URL works, but ngrok is needed for local development.
**How to avoid:** Deploy to staging first, use the staging CloudFront URL as the Twilio webhook. For local dev, use ngrok.
**Warning signs:** Twilio Console shows "Connection refused" or "SSL certificate problem".

### Pitfall 4: Missing `websockets` Import for OpenAI Connection
**What goes wrong:** `ModuleNotFoundError: No module named 'websockets'`.
**Why it happens:** `uvicorn[standard]` includes `websockets` for serving WebSocket connections, but the `websockets` library for making outbound WebSocket connections (to OpenAI) needs to be explicitly installed.
**How to avoid:** Add `websockets>=12.0` to requirements.txt explicitly.
**Warning signs:** Works in development (websockets already installed) but fails in Docker.

### Pitfall 5: HelpSupportView Phone Number is Hardcoded
**What goes wrong:** Customer taps "Call us" and gets wrong number.
**Why it happens:** `HelpSupportView.swift:218` has hardcoded `tel:+18001234567` instead of using `AppConfig.shared.supportPhone`.
**How to avoid:** Replace with `tel:\(config.supportPhone.replacingOccurrences(of: "-", with: ""))` like PlaceholderViews.swift:121 does.
**Warning signs:** The AppConfig already has the correct number (`+1-800-365-5671`) -- only HelpSupportView is wrong.

### Pitfall 6: Feature Flag Breaks Firebase Imports
**What goes wrong:** Compile errors when AIEmployeesView.swift is excluded.
**Why it happens:** AIEmployeesView.swift imports `FirebaseFirestore` and defines view models used elsewhere.
**How to avoid:** The #if flag should wrap only the VIEW code and NAVIGATION LINKS. The AIEmployeesViewModel and related models in the file can stay (they just won't be navigated to). OR wrap the entire file if no other file references its types.
**Warning signs:** Check for references to `AIEmployeesView`, `AIEmployeesViewModel`, `AITaskQueueView`, `AIAuditLogView` outside the flagged areas.

## Code Examples

### Existing Backend Chat Endpoints (Verified)
```python
# Source: apps/web/p2p-platform/backend/main_new.py:16217-16259
# GET /api/customer/orders/{order_id}/chat -- returns list of chat messages
# POST /api/customer/orders/{order_id}/chat -- send message
# Both require customer auth: Depends(require_customer)
# Also aliased: /api/orders/{order_id}/chat (main_new.py:20853-20854)
```

### Existing DriverChatView Pattern (Verified - 318 lines)
```swift
// Source: apps/ios/customer/eatfaircustomer/Views/DriverChatView.swift
// Key elements to replicate for OrderChatView:
// 1. REST polling every 3 seconds (Timer.scheduledTimer)
// 2. Quick message buttons (horizontal scroll)
// 3. Message input bar with send button
// 4. Chat bubble component (RideChatBubbleCustomer)
// 5. P2PAPIService.shared.fetchRideChatMessages / sendRideChatMessage
// For orders, use: GET/POST /api/customer/orders/{orderId}/chat
```

### Existing Chat Backend (Full API - chat_routes.py)
```python
# Source: apps/web/p2p-platform/backend/chat_routes.py
# POST /api/chat/send -- send message with WebSocket broadcast
# GET /api/chat/messages/{order_id} -- get conversation messages
# POST /api/chat/read/{order_id} -- mark messages as read
# POST /api/chat/typing/{order_id} -- typing indicator
# GET /api/chat/conversation/{order_id} -- get/create conversation
# GET /api/chat/driver/{driver_id}/conversations -- driver inbox
# GET /api/chat/customer/{customer_id}/conversations -- customer inbox
```

### Restaurant App Feature Locations (Verified)
```swift
// 1. AI Employees View: apps/ios/restaurant/eatffairrestaurant/Views/AIEmployeesView.swift
//    - Full file (1153 lines) -- AIEmployeesView, CreateAIEmployeeView, AIEmployeeDetailView,
//      AITaskQueueView, AIAuditLogView, all ViewModels
//    - Uses FirebaseFirestore (import at line 3)

// 2. AI Feature Toggles: apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
//    - Section("AI Features") at lines 338-392
//    - Three toggles: aiDemandPrediction, aiPrepTimeOptimization, aiMenuSuggestions

// 3. AI Workforce link: apps/ios/restaurant/eatffairrestaurant/Views/RestaurantSettingsView.swift
//    - Section("AI Workforce") at lines 394-415
//    - NavigationLink to AIEmployeesView()

// 4. AI Suggestion Banner: apps/ios/restaurant/eatffairrestaurant/Views/EnhancedDashboardView.swift
//    - Lines 91-93: if let suggestion = ordersVM.aiSuggestion { AISuggestionBanner(...) }
//    - AISuggestionBanner struct at line 332
```

### Phone Number Fix Location (Verified)
```swift
// Source: apps/ios/customer/eatfaircustomer/Views/HelpSupportView.swift:218
// WRONG: if let url = URL(string: "tel:+18001234567") {
// RIGHT: Use AppConfig.shared.supportPhone (already set to "+1-800-365-5671")
// Reference: PlaceholderViews.swift:121 shows correct pattern:
//   let phone = config.supportPhone.replacingOccurrences(of: "-", with: "")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gpt-4o-realtime-preview | gpt-realtime (GA) | Aug 2025 | 20% cheaper, production-ready, deprecated preview models |
| Twilio Media Streams only | Media Streams OR ConversationRelay | 2025 | ConversationRelay abstracts more, but Media Streams needed for OpenAI Realtime S2S |
| Separate STT + LLM + TTS | OpenAI Realtime speech-to-speech | Oct 2024 | Single API, lower latency, native voice understanding |
| gpt-4o-realtime-preview-2024-10-01 | gpt-realtime / gpt-realtime-mini | Dec 2025 | Preview models deprecated, migrate to GA slugs |

**Deprecated/outdated:**
- `gpt-4o-realtime-preview`: Deprecated, being removed from API. Use `gpt-realtime` instead.
- `gpt-4o-realtime-preview-2024-10-01`: Deprecated June 2025, removal imminent.

## Voice Selection Recommendation

For a customer support agent, recommended voice: **sage**

| Voice | Character | Support Suitability |
|-------|-----------|---------------------|
| alloy | Neutral, balanced | Good -- professional |
| echo | Warm, deep | Good -- authoritative |
| sage | Calm, measured | Best -- patient, professional support tone |
| shimmer | Bright, energetic | Too energetic for support |
| verse | Expressive | Could work but may be inconsistent |
| cedar | NEW -- details unclear | LOW confidence, needs testing |
| marin | NEW -- details unclear | LOW confidence, needs testing |

**Recommendation:** Use `sage` for the support agent voice. It is calm and measured, suitable for handling frustrated callers. Can be changed in the system prompt configuration without code changes.

## Pricing Estimate

| Component | Cost | Notes |
|-----------|------|-------|
| OpenAI Realtime (gpt-realtime) | ~$0.06/min input + $0.24/min output | ~$0.30/min of conversation |
| Twilio Voice (toll-free inbound) | ~$0.03/min | Standard toll-free per-minute rate |
| Twilio Phone Number | ~$2/month | Toll-free number monthly fee |
| **Total per 5-min call** | **~$1.65** | Affordable for low-volume support |

At 10 calls/day average, monthly cost would be approximately $500 for OpenAI + $50 for Twilio = ~$550/month.

## Open Questions

1. **Twilio Account Status**
   - What we know: The phone number 1-800-DOLLOR (+1-800-365-5671) is referenced in the apps and AppConfig
   - What's unclear: Is there an active Twilio account? Is this number already provisioned in Twilio?
   - Recommendation: User must verify Twilio account exists with this number. If not, purchase it via Twilio Console before implementation.

2. **OpenAI API Key for Realtime**
   - What we know: The backend does not currently use OpenAI
   - What's unclear: Does the user have an OpenAI API key with Realtime API access?
   - Recommendation: Create/verify OpenAI API key with Realtime API enabled. Add to AWS Secrets Manager.

3. **Twilio Webhook URL for Production**
   - What we know: Production is at api.dollor.ai, staging at d34u5ixl0bulv4.cloudfront.net
   - What's unclear: Can Twilio webhooks reach the FastAPI backend through CloudFront/ALB?
   - Recommendation: Test with staging first. The webhook endpoint `/api/voice/incoming-call` should work through the existing CloudFront -> ALB -> ECS path.

4. **Call Recording Storage**
   - What we know: User wants call recording with consent
   - What's unclear: Where to store recordings -- Twilio's built-in recording, or download to S3?
   - Recommendation: Use Twilio's built-in `<Record>` verb. Recordings stored in Twilio Console by default, accessible via API. S3 archival can be added later.

5. **Live Chat AI Text Agent**
   - What we know: HelpSupportView has a "Live Chat" button at line 89 with empty action
   - What's unclear: Should this connect to the same OpenAI session (text mode) or a simpler chat endpoint?
   - Recommendation: Use OpenAI Chat Completions API (not Realtime) for text chat. Create a simple `/api/support/chat` endpoint that accepts text messages and returns AI responses using the same system prompt. Much simpler and cheaper than Realtime for text.

## Sources

### Primary (HIGH confidence)
- **Codebase audit**: `AIEmployeesView.swift` (1153 lines), `RestaurantSettingsView.swift` (lines 338-415), `EnhancedDashboardView.swift` (lines 91-93, 332), `HelpSupportView.swift` (line 218), `DriverChatView.swift` (318 lines), `chat_routes.py` (623 lines), `main_new.py` (lines 16214-16303)
- [Twilio Python Voice AI Tutorial](https://www.twilio.com/en-us/blog/voice-ai-assistant-openai-realtime-api-python) - Complete FastAPI + Twilio + OpenAI Realtime implementation
- [OpenAI Realtime API Reference](https://platform.openai.com/docs/api-reference/realtime) - session.update, tools, function calling schema

### Secondary (MEDIUM confidence)
- [OpenAI gpt-realtime GA Announcement](https://openai.com/index/introducing-gpt-realtime/) - Model names, pricing, deprecation timeline
- [Twilio + OpenAI Integration Launch](https://www.twilio.com/en-us/blog/twilio-openai-realtime-api-launch-integration) - Architecture overview, ConversationRelay vs Media Streams
- [OpenAI Realtime Tool Calls Overview](https://www.eesel.ai/blog/openai-realtime-tool-calls) - Tool calling event flow, function definition patterns
- [OpenAI Voices Update](https://developers.openai.com/blog/updates-audio-models/) - Available voices for Realtime API

### Tertiary (LOW confidence)
- Voice-specific suitability (sage vs alloy vs echo) -- based on voice descriptions, not hands-on testing. Need to test in staging.
- Pricing estimates -- based on published rates, actual usage will vary.
- 15-minute session limit -- widely reported but needs verification against current gpt-realtime GA model.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Twilio + OpenAI Realtime is well-documented with official Python tutorials
- Architecture: HIGH for iOS feature flags and chat UI (codebase verified); MEDIUM for voice agent (new integration, proven pattern but untested in this codebase)
- Pitfalls: HIGH - Audio format compatibility and session limits are well-documented gotchas

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (30 days -- stable domain, OpenAI Realtime API is GA)
