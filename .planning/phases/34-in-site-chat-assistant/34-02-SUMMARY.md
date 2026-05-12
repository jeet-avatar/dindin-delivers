---
phase: 34-in-site-chat-assistant
plan: 02
subsystem: assistant-frontend
tags: [vanilla-js, turion-space-demo, chat-widget, satellite]
status: complete
requires:
  - "Plan 34-01 complete (POST /api/assistant/chat mounted in app.ts — the audit allowlist derives from it)"
provides:
  - "satellite/satellite-chat.js — self-injecting floating chat widget (button + panel)"
  - "satellite-chat.js <script> line on all 12 satellite content pages"
affects:
  - "Plan 34-03 (deploys turion-space-demo/satellite via deploy-frontend.sh + CloudFront invalidation)"
tech-stack:
  added: []
  patterns:
    - "Self-injecting vanilla-JS widget: IIFE creates its own DOM (createElement, no innerHTML-with-handlers), appends to document.body, all events via addEventListener — never inline handler attributes (Phase-29 button audit flags those)"
    - "Double-injection guard via window.__satelliteChatLoaded"
    - "Stateless chat: module-scope history array, sends last 12 turns each call via window.satelliteApi.post('/api/assistant/chat', {messages, page})"
    - "Graceful {configured:false}: renders the backend reply text, disables the textarea/Send, shows a small note"
    - "12-file change is just one <script src> line per page (no shared <head> include on this hand-written-HTML site)"
key-files:
  created:
    - /Users/jeet/turion-space-demo/satellite/satellite-chat.js
  modified:
    - /Users/jeet/turion-space-demo/satellite/index.html
    - /Users/jeet/turion-space-demo/satellite/sat.html
    - /Users/jeet/turion-space-demo/satellite/bom.html
    - /Users/jeet/turion-space-demo/satellite/kanban.html
    - /Users/jeet/turion-space-demo/satellite/instance.html
    - /Users/jeet/turion-space-demo/satellite/part.html
    - /Users/jeet/turion-space-demo/satellite/parts.html
    - /Users/jeet/turion-space-demo/satellite/work-order.html
    - /Users/jeet/turion-space-demo/satellite/work-orders.html
    - /Users/jeet/turion-space-demo/satellite/cost.html
    - /Users/jeet/turion-space-demo/satellite/cost-detail.html
    - /Users/jeet/turion-space-demo/satellite/program-new.html
decisions:
  - "Widget polls briefly (50×100ms) for window.satelliteApi if not present on boot, then gives up with a console.warn — defensive, though the <script> ordering (after satellite-api.js) guarantees it's there."
  - "Greeting message ('Hi! Ask me how to navigate the satellite app.') is shown on first panel open, not on load — keeps the log empty until the user engages."
  - "Colors hardcoded in the injected <style> to match satellite-shell.css's :root vars (#0a0e1a bg, #141b2d panel, #2563EB blue, #e6eef7 text, #2a3142 border) — the widget is appended to document.body so it can't reliably read page-scoped CSS vars; matching the literal values keeps it self-contained and on-theme."
metrics:
  duration: ~20m
  completed: 2026-05-12
---

# Phase 34 Plan 02: Chat assistant frontend widget Summary

Added the frontend half of the in-site chat assistant: a new self-contained vanilla-JS module `satellite/satellite-chat.js` that on load injects a floating circular "💬" button (fixed bottom-right) and a hidden 360×480 chat panel (header + ✕, scrollable message log, textarea + Send) into `document.body` — all DOM via `createElement`, all wiring via `addEventListener` (no inline handler attributes), double-injection guarded. On send it appends the user turn locally, shows a "…" indicator, POSTs `{messages: <last 12 turns>, page: location.pathname}` to `/api/assistant/chat` through `window.satelliteApi.post` (already bearer-bearing + 401-refresh), then renders the reply; on `{configured:false}` it renders the backend's "not configured" text, disables the input, and shows a small note; on a thrown/rejected request it renders a friendly "Sorry, something went wrong — try again." and stays usable. Then one `<script src="/satellite/satellite-chat.js"></script>` line was added before `</body>` on all 12 satellite content pages (`index/sat/bom/kanban/instance/part/parts/work-order/work-orders/cost/cost-detail/program-new`) — placed last so `window.satelliteApi` exists when it runs — and deliberately NOT on `login.html` (pre-auth) or `3d-test.html` (dev harness). `node --check` clean, zero `onclick`, button audit `violations: 0, exit 0`. Not pushed/deployed — Plan 34-03 owns the `deploy-frontend.sh` run + CloudFront invalidation.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Write satellite/satellite-chat.js (self-injecting widget) | `108b5ab` | satellite/satellite-chat.js (204 lines) |
| 2 | Add the `<script src>` line to all 12 content pages | `8bfcf32` | index/sat/bom/kanban/instance/part/parts/work-order/work-orders/cost/cost-detail/program-new .html |
| 3 | Button audit — 0 violations | (verification only, no commit) | — |

(Both commits on `turion-space-demo` `main` under `jeet-avatar <jm@techcloudpro.com>` — NOT pushed. Only the named files were `git add`-ed; the repo's pre-existing dirty WIP — `about-this-demo.html`, `agent-sales-cash.html`, `dashboard-cio.html`, `backend/*`, `.superpowers/` — was left untouched.)

## Verification Records

- `node --check /Users/jeet/turion-space-demo/satellite/satellite-chat.js` → exit 0 (syntactically valid).
- `grep -n "onclick" satellite-chat.js` → no matches (the only event wiring is `addEventListener` — `fab` click → toggle panel, `closeBtn` click → close, `sendBtn` click → send, `input` keydown → Enter-without-Shift sends).
- `grep -n "satelliteApi.post('/api/assistant/chat'" satellite-chat.js` → line 165 (`window.satelliteApi.post('/api/assistant/chat', { messages: history.slice(-12)…, page: location.pathname })`).
- `grep -c "satellite-chat.js"` per page: `index 1 · sat 1 · bom 1 · kanban 1 · instance 1 · part 1 · parts 1 · work-order 1 · work-orders 1 · cost 1 · cost-detail 1 · program-new 1` — every content page exactly 1.
- `grep -c "satellite-chat.js" login.html 3d-test.html` → both `0`.
- `tail -5 sat.html` → `…</script>` (the inline `#topbar` IIFE) then `<script src="/satellite/satellite-chat.js"></script>` then `</body></html>` — confirms it's the last script, after `satellite-api.js` / `satellite-render.js` (lines 136/138).
- `cd /Users/jeet/turion-satellite/backend && node scripts/audit-satellite-buttons.mjs` → `routes: 67, onclick handlers scanned: 16, satelliteApi calls scanned: 65, violations: 0, exit=0`. The `/api/assistant/chat` route resolves (Plan 34-01 mounted it in `app.ts`); no inline-handler violation was introduced.
- `git log --oneline -3` on turion-space-demo → `8bfcf32 feat(34-02): load satellite-chat.js on all 12 content pages`, `108b5ab feat(34-02): add self-injecting satellite-chat.js help widget`, `79b5ed7 feat(33-05): …` — both new commits present, author `jeet-avatar <jm@techcloudpro.com>`.

## Deviations from Plan

None — both tasks were implemented as written. (One comment-line wording tweak in `satellite-chat.js` so the literal substring `onclick` doesn't appear even in a comment, keeping the `grep -n "onclick"` verify clean — not a behavioral deviation.)

## Not Done (by design — later plans)

- `git push` (both repos), `./build-and-push.sh` (turion-satellite Lambda redeploy), the F6 pre-flight + `./deploy-frontend.sh` (turion-space-demo) + the CloudFront invalidation, the curl smoke (`POST /api/assistant/chat` → expect `200 {configured:false}` until the key exists), and re-running the button audit in both repos post-deploy → Plan 34-03.
- The `turion-satellite/production/anthropic-key` secret + its resource policy + the `ANTHROPIC_API_KEY_ARN` Lambda env var (user steps) — until then the widget shows "assistant not configured yet" and disables the input.

## Self-Check: PASSED

- `/Users/jeet/turion-space-demo/satellite/satellite-chat.js` — FOUND (204 lines; IIFE, `__satelliteChatLoaded` guard, `createElement` DOM, `addEventListener` wiring, `satelliteApi.post('/api/assistant/chat', {messages, page})`, `data.configured === false` branch disables input + shows note, `.catch` renders the friendly error).
- 12 content HTML pages — each has exactly 1 `satellite-chat.js` `<script>` line before `</body>`; `login.html` / `3d-test.html` have 0.
- commits `108b5ab`, `8bfcf32` — `git log --oneline -3` on turion-space-demo confirms both.
- `/Users/jeet/doordash-p2p/.planning/phases/34-in-site-chat-assistant/34-02-SUMMARY.md` — this file.
- No "Self-Check: FAILED" items.
