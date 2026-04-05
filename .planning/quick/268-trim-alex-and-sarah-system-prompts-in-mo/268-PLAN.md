---
task: 268
description: "trim Alex and Sarah system prompts in MongoDB — Alex 20K chars to ~2K, Sarah 40K chars to ~2K — preserve core persona but remove bloat — verify trial chat response time drops under 5s"
date: 2026-04-05
---

## Task

Update `systemPrompt` field in MongoDB `aiemployees` collection for Alex and Sarah.

### Problem
- Alex: 20,512 char prompt → 8.3s trial chat response (UI timeout)
- Sarah: 39,990 char prompt → 8.9s trial chat response (UI timeout)
- Most other agents: ~1-2K chars → 2-5s response

### Fix
Write focused 1.2K char prompts preserving core persona + capabilities.
Run script via `node update-prompts.js` in `/var/www/techcloudpro-backend/`.

### Verify
Trial chat response time < 5s for both agents.
