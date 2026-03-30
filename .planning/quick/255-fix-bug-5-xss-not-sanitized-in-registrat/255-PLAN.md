---
quick_task: 255
description: "Fix BUG-5: improve XSS sanitization — strip HTML tags, use html.escape"
date: 2026-03-30
---

# Plan

## Task 1: Fix sanitize_input in main_new.py

- **file**: `apps/web/p2p-platform/backend/main_new.py:1290`
- **action**: Replace manual character replacement with `re.sub` to strip HTML tags + `html.escape` for remaining chars
- **verify**: syntax check + test cases pass
