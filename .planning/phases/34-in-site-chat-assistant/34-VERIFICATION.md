---
phase: 34-in-site-chat-assistant
verified: 2026-05-12T13:20:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "Open any satellite content page (e.g. https://turionspace.zietra.com/satellite/sat.html) while signed in — confirm the floating 💬 button is visible bottom-right, clicking it opens the chat panel, the greeting message appears, and the input is disabled with the 'assistant not configured yet' note."
    expected: "Button visible, panel opens, input disabled, note shown"
    why_human: "Authenticated browser session required; Supabase magic-link JWT not mintable headlessly"
  - test: "After the user creates the turion-satellite/production/anthropic-key secret and sets ANTHROPIC_API_KEY_ARN on the Lambda, type a question ('How do I advance a lifecycle stage?') and confirm a real reply comes back from Claude."
    expected: "Configured:true reply explaining sat.html status dropdown"
    why_human: "Requires the Anthropic secret to exist in AWS; not yet set up"
---

# Phase 34: In-Site Chat Assistant Verification Report

**Phase Goal:** A floating chat button on every satellite page that opens a chat panel backed by a new `POST /api/assistant/chat` endpoint on the turion-satellite Lambda, calling Claude with a curated site-knowledge system prompt; reads the Anthropic key from AWS Secrets Manager; gracefully returns `{configured:false}` if absent.
**Verified:** 2026-05-12T13:20:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `POST /api/assistant/chat` is mounted in `app.ts` and rejects unauthenticated requests with 401 | VERIFIED | `app.ts:50` `app.use('/api/assistant', assistantRouter)` — live curl returns 401 |
| 2 | When no Anthropic key is configured, the endpoint returns `200 {configured:false, reply:...}` — never 4xx/5xx | VERIFIED | `assistant.ts:65` — `if (!key) { res.json({ configured: false, reply: NOT_CONFIGURED }); return; }` — vitest case 2 passes |
| 3 | When a key is present, the endpoint calls Anthropic `messages.create` with the SITE_KNOWLEDGE system prompt | VERIFIED | `assistant.ts:84-86` — `new Anthropic({apiKey:key})` + `client.messages.create({model, max_tokens, system, messages})` — vitest case 3 passes |
| 4 | On Anthropic API failure the endpoint returns `502 {error:...}` with no `err.message` leak | VERIFIED | `assistant.ts:94-97` — catch block: `console.error(...); res.status(502).json({ error: 'The assistant is temporarily unavailable.' })` — `grep err.message` returns only the comment |
| 5 | SITE_KNOWLEDGE describes every satellite page, Phase-33 workflow, make/buy, navigation, data tables, and common tasks | VERIFIED | `assistant-knowledge.ts` 8,211 bytes / 61 lines — covers 6 required sections; grep confirms: 26 matches on sales-order/make/buy/lifecycle/bom/kanban/work-order keywords |
| 6 | `@anthropic-ai/sdk` is in `package.json` dependencies (not devDependencies) | VERIFIED | `package.json:14` — `"@anthropic-ai/sdk": "^0.95.2"` under `"dependencies"` — confirmed via python3 parse |
| 7 | The chat widget is on every satellite content page (12 pages), absent from login.html and 3d-test.html, uses zero inline onclick | VERIFIED | All 12 pages: count=1; login.html: 0; 3d-test.html: 0 — `grep onclick= satellite-chat.js` returns nothing |
| 8 | Button audit reports 0 violations with `/api/assistant/chat` now in the allowlist | VERIFIED | `node scripts/audit-satellite-buttons.mjs` → `routes: 67, violations: 0` |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Purpose | Status | Details |
|----------|---------|--------|---------|
| `/Users/jeet/turion-satellite/backend/src/routes/assistant.ts` | POST /chat router with requireAuth, lazy memoized secret fetch, graceful-no-key, hardened catch | VERIFIED | 101 lines, `requireAuth` present, `err.message` not leaked, `SITE_KNOWLEDGE` imported |
| `/Users/jeet/turion-satellite/backend/src/assistant-knowledge.ts` | Exported `SITE_KNOWLEDGE` string (~6 sections, ~8KB) | VERIFIED | 8,211 bytes, 61 lines, exports `SITE_KNOWLEDGE`; covers pages/nav/workflow/make-buy/data/tasks |
| `/Users/jeet/turion-satellite/backend/src/app.ts` | Mounts `/api/assistant` | VERIFIED | `app.ts:50` — `app.use('/api/assistant', assistantRouter)` |
| `/Users/jeet/turion-satellite/backend/tests/assistant.test.ts` | 4 vitest cases: 401/no-key/mocked/400 | VERIFIED | `tests/assistant.test.ts` (not `routes/__tests__/`) — 4 `it()` blocks, all pass |
| `/Users/jeet/turion-satellite/backend/package.json` | `@anthropic-ai/sdk` dependency | VERIFIED | `"@anthropic-ai/sdk": "^0.95.2"` under `"dependencies"` |
| `/Users/jeet/turion-space-demo/satellite/satellite-chat.js` | Self-injecting chat widget | VERIFIED | 204 lines, double-injection guard, addEventListener-only wiring, calls `satelliteApi.post('/api/assistant/chat', {messages, page})` with `location.pathname` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app.ts` | `routes/assistant.ts` | `import assistantRouter` + `app.use('/api/assistant', assistantRouter)` | WIRED | `app.ts:20` import + `app.ts:50` mount |
| `routes/assistant.ts` | `assistant-knowledge.ts` | `import { SITE_KNOWLEDGE }` | WIRED | `assistant.ts:19` |
| `routes/assistant.ts` | `@anthropic-ai/sdk` | `client.messages.create(...)` | WIRED | `assistant.ts:16` import + `assistant.ts:84-86` usage |
| `satellite-chat.js` | `/api/assistant/chat` | `window.satelliteApi.post(...)` | WIRED | `satellite-chat.js:166` |
| Content pages (12) | `satellite-chat.js` | `<script src>` | WIRED | count=1 on all 12; login.html=0; 3d-test.html=0 |
| Live Lambda | `/api/assistant/chat` | Lambda redeployed via `build-and-push.sh` | WIRED | CodeSha256 changed `ffde2154…`→`c9372b81…`; live 401 on unauthenticated POST confirmed |
| Live CDN | `satellite-chat.js` | CloudFront invalidation `I2DCYF361MVJLY75INLW75EXZJ` | WIRED | HTTP 200, body contains `/api/assistant/chat` (2 occurrences) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ChatEndpoint | 34-01, 34-03 | `POST /api/assistant/chat` mounted, auth-gated, deployed live | SATISFIED | `app.ts:50`, live 401 smoke, vitest 4/4 |
| SiteKnowledgePrompt | 34-01 | `SITE_KNOWLEDGE` covers pages/workflow/make-buy/data/tasks, used as system prompt | SATISFIED | `assistant-knowledge.ts` 8KB, 6 sections, wired into `client.messages.create({system})` |
| ChatWidget | 34-02, 34-03 | `satellite-chat.js` on 12 pages, addEventListener-only, renders `{configured:false}` gracefully | SATISFIED | 204-line widget, 12/12 pages, 0 inline onclick, live HTTP 200 |
| GracefulNoKey | 34-01, 34-03 | No-key → `200 {configured:false, reply:...}` never 4xx/5xx | SATISFIED | `assistant.ts:65`, vitest case 2 pass, `{configured:false}` state is EXPECTED/correct at this point |

Note: `ChatEndpoint`, `SiteKnowledgePrompt`, `ChatWidget`, `GracefulNoKey` are Phase-34-local labels per `34-03-SUMMARY.md:88` — they do not appear in `REQUIREMENTS.md`, which tracks only legacy Dollor.ai v1.5 IDs. This is correct per the phase design.

---

### Anti-Patterns Found

No blockers or warnings detected:
- No `TODO`/`FIXME`/`placeholder` comments in new files
- No `return null` / `return {}` stub returns in route or widget
- `err.message` is referenced only in the comment header, not in any `res.json()` call
- The `bom.html` line `onclick="event.stopPropagation()"` on the 3D badge is a pre-existing Phase-30 pattern on a non-button DOM element (`<a>` tag), not new to Phase 34 and not flagged by the button audit

---

### Phase 27-33 Regression Check

| Check | Status | Evidence |
|-------|--------|----------|
| 3D viewer (`mount3DViewer`) in `part.html` | PASS | `part.html` contains `mount3DViewer` (4 occurrences) |
| 3D viewer in `instance.html` | PASS | `instance.html` contains `mount3DViewer` (4 occurrences) |
| BOM 3D badge (`🧊 3D`) in `bom.html` | PASS | `bom.html` contains `🧊 3D` |
| Phase-33 wizard in `program-new.html` | PASS | `program-new.html` contains `wizard` class + `sales_order` creation |
| `programProgress` strip in `sat.html` | PASS | `sat.html` contains `programProgress` |
| Full vitest suite | PASS | 354 passed, 1 skipped, 0 failed (the `connection refused` log from lifecycle-stages test is expected — test itself passes) |

---

### Human Verification Required

#### 1. Chat Widget — Browser Interaction

**Test:** Sign in to `https://turionspace.zietra.com/satellite/sat.html` via magic link. Confirm the 💬 floating button is visible bottom-right. Click it — the chat panel should open with the greeting "Hi! Ask me how to navigate the satellite app." The input should be disabled and "assistant not configured yet" note visible (since the Anthropic key is not set).
**Expected:** Button present, panel opens, greeted, input disabled, note shown.
**Why human:** Requires an authenticated Supabase session; the magic-link JWT is not mintable headlessly.

#### 2. Full Round-Trip Chat (Post-Secret Setup)

**Test:** After following the "To light it up" steps in `34-03-SUMMARY.md` (create `turion-satellite/production/anthropic-key` secret, attach resource policy, set `ANTHROPIC_API_KEY_ARN` Lambda env var), open any satellite page, ask "How do I advance a lifecycle stage?" — the assistant should reply with page-specific guidance referencing `sat.html` and the status dropdown.
**Expected:** `{configured:true, reply: <actionable answer>}`, input enabled, reply rendered in chat.
**Why human:** Requires the Anthropic secret to exist and the Lambda env var to be set; not yet configured in AWS.

---

### Notes

- The `{configured:false}` state on the live endpoint is **the correct/expected state** — the phase ships ready-to-light-up; the user enables it by adding the secret. This is not a gap.
- The test file lives at `tests/assistant.test.ts` (not `routes/__tests__/`) — this matches the actual repo layout (all other route tests are in `tests/`). The plan frontmatter path `src/routes/__tests__/assistant.test.ts` was the originally planned location; it ended up in the correct location. Not a gap.
- Plan 34-03 deployed Lambda CodeSha256 changed (`ffde2154…` → `c9372b81…`) and CloudFront invalidation reached `Completed` per `34-03-SUMMARY.md:50,62`.

---

_Verified: 2026-05-12T13:20:00Z_
_Verifier: Claude (gsd-verifier)_
