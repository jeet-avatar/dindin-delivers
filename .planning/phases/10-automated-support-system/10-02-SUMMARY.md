---
phase: 10-automated-support-system
plan: 02
subsystem: api
tags: [twilio, openai, realtime, websocket, voice, chat, ai-support]

# Dependency graph
requires:
  - phase: 02-ios-api-verification
    provides: global auth middleware with public path allowlist
provides:
  - Twilio-OpenAI Realtime voice agent bridge (/api/voice/incoming-call, /api/voice/media-stream)
  - AI text chat endpoint for Live Chat (/api/support/chat)
  - Tool implementations for order/ride/account lookup and escalation logging
affects: [10-automated-support-system, ios-help-screen, deployment]

# Tech tracking
tech-stack:
  added: [twilio>=9.0.0, websockets>=12.0, openai-realtime-api]
  patterns: [twilio-media-streams-to-openai-bridge, tool-calling-for-backend-lookups, pcmu-audio-passthrough]

key-files:
  created:
    - apps/web/p2p-platform/backend/voice_agent.py
    - apps/web/p2p-platform/backend/voice_agent_tools.py
  modified:
    - apps/web/p2p-platform/backend/main_new.py
    - apps/web/p2p-platform/backend/requirements.txt

key-decisions:
  - "Text chat uses gpt-4o-mini via Chat Completions API (cheaper/simpler than Realtime for text)"
  - "Voice uses sage voice (calm, professional) with PCMU audio format (no transcoding needed)"
  - "support/chat endpoint is public (no JWT) to match iOS Live Chat accessibility"
  - "Escalation email uses skip_validation=True since support@dollor.ai is not in user tables"

patterns-established:
  - "Twilio-OpenAI bridge: TwiML Stream directive -> WebSocket -> asyncio.gather(recv, send)"
  - "Tool calling: TOOL_DEFINITIONS list in tools module, execute_tool dispatcher in voice_agent"
  - "Caller context injection: phone lookup across Customer/Driver/Vendor tables, injected into system prompt"

requirements-completed: [SUPPORT-02]

# Metrics
duration: 10min
completed: 2026-03-03
---

# Phase 10 Plan 02: Voice Agent Backend Summary

**Twilio-OpenAI Realtime voice bridge with tool calling for order/ride/account lookups, plus AI text chat endpoint for iOS Live Chat**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-03T01:05:16Z
- **Completed:** 2026-03-03T01:15:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Built Twilio Media Streams to OpenAI Realtime API bridge with WebSocket audio relay (PCMU passthrough, no transcoding)
- Implemented 4 AI tools: lookup_order, lookup_ride, lookup_account, log_escalation -- all query real database models
- Added /api/support/chat text endpoint using gpt-4o-mini for iOS Live Chat feature
- System prompt includes Dollor.ai business context, pricing model, and escalation paths
- Auth middleware allowlist updated for Twilio webhook and chat endpoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Create voice_agent.py and voice_agent_tools.py** - `f4126251` (feat)
2. **Task 2: Wire voice agent into main_new.py, add text chat endpoint, update requirements** - `44835487` (feat)

## Files Created/Modified
- `apps/web/p2p-platform/backend/voice_agent.py` - Twilio-OpenAI Realtime bridge (TwiML webhook, WebSocket media stream, session init, text chat endpoint) -- 277 lines
- `apps/web/p2p-platform/backend/voice_agent_tools.py` - Tool implementations (order/ride/account lookup, escalation logging) and TOOL_DEFINITIONS -- 340 lines
- `apps/web/p2p-platform/backend/main_new.py` - voice_router import/include, auth allowlist additions
- `apps/web/p2p-platform/backend/requirements.txt` - Added twilio>=9.0.0 and websockets>=12.0

## Decisions Made
- **Text chat model:** Used gpt-4o-mini via Chat Completions API for /api/support/chat instead of Realtime API -- text is simpler and cheaper, Realtime is overkill for text chat
- **Voice selection:** sage voice per research recommendation -- calm, measured, professional support tone
- **Audio format:** PCMU (mu-law) for both input and output -- matches Twilio's native format, zero transcoding overhead
- **Chat endpoint auth:** Public (added to auth middleware allowlist) since the Live Chat button is accessible from the help screen
- **Escalation email:** Uses skip_validation=True on send_email since support@dollor.ai is not stored as a user in the database tables
- **Caller lookup:** Searches across all three user tables (Customer.phone, Driver.phone, Vendor.contact_phone) to identify caller role

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration** before the voice agent is functional:

### Twilio Setup
- Verify phone number +18003655671 is provisioned in Twilio Console
- Set Voice webhook URL to `https://api.dollor.ai/api/voice/incoming-call` (HTTP POST) in Twilio Console > Phone Numbers > Voice Configuration

### OpenAI Setup
- Verify OpenAI API key has Realtime API access enabled
- Add OPENAI_API_KEY to AWS Secrets Manager for staging and production

### Environment Variables
| Variable | Source |
|----------|--------|
| `OPENAI_API_KEY` | OpenAI Platform > API Keys |
| `TWILIO_ACCOUNT_SID` | Twilio Console > Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console > Account Info |

## Issues Encountered
- Import test initially failed because `database.py` raises ValueError when DATABASE_URL is not set -- resolved by setting DATABASE_URL for the import check
- Pre-existing test failures (17 in document_save_flow, android_restaurant_e2e, and cross_platform tests) -- unrelated to voice agent changes, 1288 tests passed

## Next Phase Readiness
- Voice agent backend is complete and ready for staging deployment
- Plan 10-03 (iOS Help screen fixes, chat UI) can proceed -- /api/support/chat endpoint is available
- Twilio webhook and OpenAI API key must be configured before voice calls will work

## Self-Check: PASSED

- All 3 created/modified files verified on disk
- Both task commits (f4126251, 44835487) found in git log
- voice_agent.py: 277 lines (min 150 required)
- voice_agent_tools.py: 340 lines (min 80 required)
- requirements.txt contains twilio and websockets
- Auth allowlist contains /api/voice/incoming-call and /api/support/chat

---
*Phase: 10-automated-support-system*
*Completed: 2026-03-03*
