---
quick_task: 256
status: complete
---

# Summary: Fix chat alias endpoint

**Root cause:** `/api/chat/messages/{ride_id}` GET returned hardcoded `{"messages":[],"total":0}` stub. POST also stubbed (didn't save to DB).

**Fix:** Both GET and POST now delegate to the real `get_ride_request_chat()` and `send_ride_request_chat()` functions that query/write `RideChatMessage` table.
