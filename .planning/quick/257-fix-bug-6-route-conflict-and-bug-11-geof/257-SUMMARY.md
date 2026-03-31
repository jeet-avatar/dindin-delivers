---
quick_task: 257
status: complete
---

# Summary: Fix BUG-6 + BUG-11

## BUG-6: Chat alias route conflict
- Root cause: `/api/chat/messages/{id}` had TWO routes — ride chat (line 17904) and order chat (line 18679). FastAPI last-registered wins → order chat always handled
- Fix 1: Added ride chat fallback in order chat handler (line 18708-18729) — checks RideChatMessage when no ChatConversation exists
- Fix 2: Added `/api/chat/ride/{id}` as distinct ride-only chat path
- Status: `/api/chat/ride/{id}` works, `/api/chat/messages/{id}` needs ECS task rotation to pick up fallback

## BUG-11: Geofencing for ride requests
- Added US bounding box check in `bid_routes.py` after same-coords validation
- Covers: Continental US (lat 24.5-49.5, lon -125 to -66.5), Hawaii, Alaska
- Rejects: South/North Pole, London, Tokyo, Mexico City etc.
- Accepts: All 50 US states + border areas (generous box)
