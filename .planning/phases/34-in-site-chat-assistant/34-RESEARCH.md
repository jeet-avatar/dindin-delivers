# Phase 34: In-site AI chat assistant (Turion satellite app) - Research

**Researched:** 2026-05-12
**Domain:** Anthropic Messages API integration into an existing Express/Lambda backend + a vanilla-JS static frontend widget
**Confidence:** HIGH (codebase patterns verified by direct inspection; Anthropic SDK is stable/well-known)

> No CONTEXT.md exists for this phase. The "open questions" from the phase brief are answered below in **Open Questions** with recommended defaults the planner should adopt unless the user overrides.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ChatEndpoint** | New `POST /api/assistant/chat` on the turion-satellite Lambda that calls Claude with the site-knowledge system prompt; mounted in `app.ts`; gated by `requireAuth`. | "Architecture Patterns → Pattern 1/2", "Code Examples → assistant route". Mirrors the existing `routes/sales-orders.ts` shape (Router, `requireAuth`, hardened catch). Lambda already bundles `@aws-sdk/client-secrets-manager` and `serverless-http`; add `@anthropic-ai/sdk` as a `dependencies` entry. |
| **SiteKnowledgePrompt** | A curated "site knowledge" system prompt enumerating every page, navigation, search/filter, the Phase-33 sales-order→delivery workflow, the make/buy distinction, where data lives, and common tasks. | "Architecture Patterns → Pattern 3 (knowledge module)". Source material to fold in: Phase 33 `33-RESEARCH.md` + `33-06-SUMMARY.md`, the page list in this doc, and the make/buy notes in project MEMORY (Phase 32). Recommend a single exported `const SITE_KNOWLEDGE: string` in `backend/src/assistant-knowledge.ts`, ~3–6 KB. |
| **ChatWidget** | A shared JS module `satellite/satellite-chat.js` loaded on every satellite page; floating button → panel; passes the current `location.pathname` so answers are page-aware; button wired via `addEventListener` (NOT inline `onclick`); the `/api/assistant/chat` path must resolve against `app.ts` so the Phase-29 button audit stays 0 violations. | "Architecture Patterns → Pattern 4 (frontend widget)" + "Common Pitfalls → Button audit". The widget self-injects its DOM on load (no per-page HTML beyond one `<script src>` tag). Calls go through `window.satelliteApi.post('/api/assistant/chat', …)` so the audit's `satelliteApi.post(...)` extractor matches a real route. |
| **GracefulNoKey** | If the `anthropic-key` secret/ARN is absent or empty, the endpoint returns a clear "assistant not configured" response and the widget renders it gracefully — so the phase ships + deploys *before* the key exists; the user adds the key later to light it up. | "Open Questions → Q6 (graceful-no-key contract)". Recommend `200 { configured: false, reply: "The assistant isn't configured yet…" }` (not a 4xx/5xx) so the widget treats it as a normal turn. Widget disables the textarea + shows the message. The deploy-phase smoke test will hit this exact path (the key won't be set at ship time). |
</phase_requirements>

## Summary

This phase adds (1) one new Express route on the existing `turion-satellite` Lambda that proxies a chat turn to Anthropic's Messages API with a fixed "site knowledge" system prompt, and (2) one new vanilla-JS file on the `turion-space-demo` static site that injects a floating chat button + panel on every satellite page. No infrastructure changes are required beyond the normal redeploys — **except** one new AWS Secrets Manager secret (`turion-satellite/production/anthropic-key`) which the *user* creates manually, and that secret needs a **resource policy** granting `zietra-api-lambda-role` `secretsmanager:GetSecretValue` (this repo's pattern: the Lambda's IAM role has *no* `secretsmanager:*` permission of its own — access is granted by a resource policy *on each secret*; verified on the existing `database-url` secret).

The backend slot is well-trodden: `backend/src/app.ts` is a plain Express app wrapped by `serverless-http` in `lambda.ts`; secrets are lazily loaded in `lambda.ts` via `loadSecrets()` (`backend/src/secrets.ts`) which reads an `*_ARN` env var → `GetSecretValueCommand`. The new route copies `routes/sales-orders.ts` almost verbatim: `Router`, `requireAuth` on every handler, schema-qualified SQL only where DB is touched (this route touches no DB), hardened catch (`console.error` + generic `{ error }`, never `err.message`). `@anthropic-ai/sdk` is **not** currently a dependency — add it to `dependencies` in `backend/package.json` (the Docker build is `npm ci --omit=dev` so dev-deps won't ship; it must be a prod dep).

The frontend slot: every satellite page is a hand-written static HTML file that loads, in order, `satellite-config.js` → supabase UMD → `satellite-auth.js` → `satellite-api.js` → (page-specific) → `satellite-render.js` → an inline IIFE that renders `#topbar` via `window.satelliteRender.topbarHTML(email)`. There is **no shared `<head>` include** — so adding the widget means adding one `<script src="/satellite/satellite-chat.js">` line to each of the ~12 pages, and the widget self-bootstraps (creates its own button + panel DOM, attaches listeners with `addEventListener`). It uses `window.satelliteApi.post('/api/assistant/chat', {messages, page})` for the call (already auth-bearing, already a 401-refresh wrapper). The button audit (`turion-satellite/backend/scripts/audit-satellite-buttons.mjs`) parses `app.ts` for the route allowlist and scans the frontend for `onclick=` + `satelliteApi.{get,post,patch}(...)` — so as long as the widget uses `addEventListener` (no inline `onclick`) and the `POST /api/assistant/chat` route is mounted in `app.ts`, the audit stays at 0 violations. Run the audit in **both** repos after the change (the script is run against the demo repo's `satellite/` dir too).

**Primary recommendation:** One-shot (non-streaming) `messages.create` with `claude-haiku-4-5`, stateless backend (widget POSTs the last ~8 turns each time, no DB table, no session), system prompt = a single `const SITE_KNOWLEDGE` string in `backend/src/assistant-knowledge.ts` (~4 KB), graceful-no-key = `200 { configured:false, reply:"…" }`. Plan as 3 plans / 3 waves: W1 backend (route + SDK dep + secret-load wiring + knowledge module + tests + `app.ts` mount), W2 frontend (`satellite-chat.js` + one `<script>` line on each page), W3 deploy (`build-and-push.sh` → curl smoke incl. the `{configured:false}` path → F6 pre-flight → `deploy-frontend.sh` → CF invalidate → button audit both repos → STATE/ROADMAP). W1 can split into W1a (route + SDK + secret-load + tests, knowledge prompt = a short stub) and W1b (flesh out `SITE_KNOWLEDGE` content) if the prompt-writing is sizeable — but it's small enough that one plan is fine.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.6x` (latest on npm; pin whatever `npm view @anthropic-ai/sdk version` returns at plan time) | Calls the Anthropic Messages API (`client.messages.create({...})`) | Official SDK; handles auth header, retries, types. |
| `@aws-sdk/client-secrets-manager` | `^3.1045.0` (already a dep) | Fetch the `anthropic-key` secret at cold start | Already used for `DATABASE_URL` + JWKS — copy the exact pattern in `secrets.ts`. |
| `serverless-http` | `^3.2.0` (already a dep) | Wraps the Express app for Lambda | Already in `lambda.ts` — no change. |
| `express` | `^4.21.2` (already a dep) | The app the new router mounts into | — |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` + `supertest` | already dev-deps | Test the new route (200 happy path with a mocked Anthropic client, 401 without auth, `{configured:false}` when no key) | W1 plan's test task. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@anthropic-ai/sdk` | Raw `fetch` to `https://api.anthropic.com/v1/messages` | Saves a dep but you re-implement the `anthropic-version` header, error shapes, retries. Not worth it — add the SDK. |
| `claude-haiku-4-5` | `claude-sonnet-4-6` | Sonnet is smarter but slower + pricier; this is a help bot answering from a fixed 4 KB prompt — Haiku is the right call. Make the model id a `const` at the top of the route file so it's a one-line change. |
| One-shot response | SSE streaming | Streaming behind API Gateway REST is awkward (APIGW buffers; true streaming needs Lambda Function URLs). Answers are short. **Recommend one-shot.** Note the tradeoff in the plan. |
| Stateless (widget sends history) | Server-side session table | A session table = a migration + cleanup + a `chat_messages` table. Pointless for a help bot. **Recommend stateless**, widget sends the last N turns. No migration. |

**Installation (backend):**
```bash
cd /Users/jeet/turion-satellite/backend
npm install @anthropic-ai/sdk    # adds to "dependencies"
```
(The Docker build does `npm ci --omit=dev` then `COPY dist/` — so it MUST land in `dependencies`, and `package-lock.json` must be committed.)

## Architecture Patterns

### Recommended file layout (delta only)
```
turion-satellite/
├── backend/
│   ├── package.json                 # + "@anthropic-ai/sdk" in dependencies
│   ├── package-lock.json            # regenerated
│   └── src/
│       ├── app.ts                   # + app.use('/api/assistant', assistantRouter)
│       ├── secrets.ts               # + ANTHROPIC_API_KEY <- ANTHROPIC_API_KEY_ARN (optional, soft-fail)
│       ├── assistant-knowledge.ts   # NEW — export const SITE_KNOWLEDGE: string
│       └── routes/
│           └── assistant.ts         # NEW — POST /api/assistant/chat (requireAuth)
└── (build-and-push.sh unchanged — just redeploy)

turion-space-demo/
└── satellite/
    ├── satellite-chat.js            # NEW — self-injecting widget (button + panel + addEventListener)
    └── *.html                        # each gets one <script src="/satellite/satellite-chat.js"></script> line
```

### Pattern 1: New Express route mirrors `routes/sales-orders.ts`
**What:** A `Router` with `requireAuth` on the handler; validate body; on error `console.error(...)` + `res.status(500).json({ error: 'generic message' })` — never echo `err.message`. Schema-qualify SQL — but this route does no DB work, so skip that bit.
**When to use:** This is THE pattern for every route in this repo. Don't invent a new one.
**Example:** see Code Examples below.

### Pattern 2: Cold-start secret load mirrors `secrets.ts` / `lambda.ts`
**What:** `lambda.ts` calls `loadSecrets()` (returns a promise it awaits before the first request). `secrets.ts`'s `loadSecrets()` does `if (!process.env.X && process.env.X_ARN) process.env.X = await fetchSecret(process.env.X_ARN)`. For the new key the secret payload is a JSON object — match the *existing* shape: the `database-url` secret stores a **bare string** (the connection string), but you should store the new one as a JSON object `{"ANTHROPIC_API_KEY":"sk-ant-..."}` (the JWKS secret is JSON, so there's precedent for both). **Decision for the plan:** parse the secret string as JSON and read `.ANTHROPIC_API_KEY`; if `JSON.parse` fails, treat the whole string as the key (be liberal). Wrap the whole thing in try/catch so a missing/broken secret does NOT crash cold start — just leaves `process.env.ANTHROPIC_API_KEY` unset (→ graceful-no-key path).
**Key gotcha:** `lambda.ts` does `const ready = loadSecrets();` at module scope, then `await ready` per request — adding a soft-failing secret fetch must not throw out of `loadSecrets()`. Either add it inside `loadSecrets()` with its own try/catch, OR (cleaner) do the Anthropic-key fetch lazily inside the route handler on first call (also fine — Secrets Manager is fast and the SDK client is cheap to construct). **Recommend: lazy fetch in the route**, memoized in a module-level `let cachedKey: string | null | undefined` (undefined = not tried, null = tried-and-absent). This keeps `secrets.ts` untouched and the "no key" path trivially testable.

### Pattern 3: Site-knowledge prompt = one exported string constant
**What:** `backend/src/assistant-knowledge.ts` exports `const SITE_KNOWLEDGE: string` — a plain template literal. ~3–6 KB. Sections: (a) one line per page (path + what it does + how you get there), (b) navigation/search/filter, (c) the sales-order→delivery workflow (Phase 33: "New satellite program" wizard on `program-new.html` → creates a `sales_order` → `POST /api/satellites` spawns the satellite + part_instances + bom_lines + stage-0 events → forward chain sat → bom → kanban → instance → work-order), (d) the make-vs-buy distinction (every part has a recorded make/buy *decision*; MAKE parts show Build-process/Materials/labor-cost panels; BUY parts show a procurement panel: PR → VO → PO → invoiced; `GET /api/make-buy-decisions/:satId/:partDefId`), (e) where data lives (Supabase Postgres schema `turion_satellite`; instances/bom/work-orders/build-steps/procurement-requests/vendor-orders tables), (f) common tasks ("how do I advance a lifecycle stage?" → on `sat.html`, the status dropdown PATCHes `/api/satellites/:id`; "where do I see a part's 3D model?" → `part.html` / `instance.html` has a 2D/3D `.cad-frame` toggle; "how do I place a vendor order?" → on a BUY part's `part.html` procurement panel; "how do I create a new satellite program?" → `program-new.html`, reachable from the homepage). Keep it factual and terse; the model returns short answers.
**When to use:** Always pass it as the `system` parameter of `messages.create`. Do NOT put it in the user turn.
**Source material to harvest:** `33-RESEARCH.md` and `33-06-SUMMARY.md` (the E2E flow), the page list in this doc, and the make/buy paragraph in the project's MEMORY.md (Phase 32 entry). The planner should put "write `SITE_KNOWLEDGE` covering the 6 section groups above" as an explicit task with those sources cited.

### Pattern 4: Self-injecting vanilla-JS widget
**What:** `satellite-chat.js` is an IIFE that, on load: (1) creates a `<button id="chat-fab">` fixed bottom-right + a hidden `<div id="chat-panel">` (header, scrollable message list, `<textarea>` + Send), appends them to `document.body`; (2) `chatFab.addEventListener('click', togglePanel)`; (3) Send → `await window.satelliteApi.post('/api/assistant/chat', { messages: history.slice(-8), page: location.pathname })`; (4) renders `data.reply`; if `data.configured === false`, show the message + disable the textarea. It depends on `window.satelliteApi` existing (so the `<script>` tag must come AFTER `satellite-api.js` — easiest: put it as the LAST script on each page, after `satellite-render.js`). It must NOT use inline `onclick` anywhere (the audit flags `onclick=` attributes that don't resolve). All event wiring via `addEventListener`. Style it inline (a `<style>` block the IIFE injects) or add a few `.chat-*` rules — keep it self-contained so it can't break any page.
**When to use:** This is the only sane way to add a global widget to a no-bundler hand-written-HTML site without a 12-file copy-paste of markup. The 12-file change is just the one `<script src>` line.

### Anti-Patterns to Avoid
- **Inline `onclick` on the chat button** → fails the Phase-29 audit. Use `addEventListener`.
- **Calling the Anthropic API with `fetch` directly from the browser** → leaks the API key. The key NEVER reaches the frontend; the widget only talks to `/api/assistant/chat`.
- **Crashing cold start when the secret is absent** → the whole point of GracefulNoKey is that the phase ships before the key exists. Soft-fail the secret fetch.
- **Echoing `err.message` in the route's catch** → repo rule (no `err.message` leak). `console.error` server-side, return a generic `{ error }`.
- **Adding `@anthropic-ai/sdk` to `devDependencies`** → the Docker build does `npm ci --omit=dev`; it won't be in the image. Must be `dependencies`.
- **Forgetting the secret's resource policy** → the Lambda role has no `secretsmanager:*` permission; access is per-secret via a resource policy. A new secret without `{ Principal: zietra-api-lambda-role, Action: secretsmanager:GetSecretValue }` will get AccessDenied. (Document this as a user step; it's `aws secretsmanager put-resource-policy ...`.)
- **Running the button audit only in turion-satellite** → it's also run against `turion-space-demo`'s `satellite/` dir. Run both.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Talking to the Anthropic API | A `fetch` wrapper with the version header, retry/backoff, error parsing | `@anthropic-ai/sdk` `client.messages.create()` | The SDK already does headers/retries/types; one dep. |
| Authenticating the chat endpoint | A new auth check | the existing `requireAuth` middleware | It's already the gate on every route; chain it. |
| Authenticated fetch from the widget | `fetch` + manual `Authorization` + 401 refresh | `window.satelliteApi.post(...)` | Already does Bearer + on-401-refresh-then-retry + redirect-to-login. |
| Loading the API key secret | A bespoke Secrets Manager call | the `secrets.ts` `fetchSecret(arn)` helper pattern (or a tiny copy in the route) | Identical to how `DATABASE_URL` + JWKS load. |
| Conversation memory | A `chat_sessions` / `chat_messages` table + migration + TTL cleanup | stateless: widget keeps history in JS, sends last ~8 turns each call | A help bot doesn't need server-side memory; avoids a migration entirely. |

**Key insight:** This phase is "wire one well-known SDK call into an existing route slot + one existing frontend helper." Almost everything is already built; the new code is ~80 lines of route + ~150 lines of widget + a ~4 KB prompt string.

## Common Pitfalls

### Pitfall 1: Button audit breaks because the route isn't in `app.ts` yet
**What goes wrong:** The widget calls `satelliteApi.post('/api/assistant/chat', ...)` but `app.ts` hasn't mounted `/api/assistant` → the audit's `missing-endpoint` check fails → audit exits 1.
**Why:** The audit derives its allowlist purely from `app.ts`'s `app.use(...)` tree + each router file's `router.{method}(...)` calls.
**How to avoid:** Land the backend (`app.ts` mount + `routes/assistant.ts` with `router.post('/chat', requireAuth, ...)`) BEFORE — or in the same merge as — the frontend widget. Plan W1 (backend) strictly before W2 (frontend). Run `node scripts/audit-satellite-buttons.mjs` (from `turion-satellite/backend/`) against BOTH repos after W2.

### Pitfall 2: `@anthropic-ai/sdk` missing from the Lambda image
**What goes wrong:** `import Anthropic from '@anthropic-ai/sdk'` → `Cannot find module` at runtime in Lambda.
**Why:** Docker build is `npm ci --omit=dev` + `COPY dist/`. If the dep is in `devDependencies` (or `npm install` wasn't committed to `package-lock.json`), it's absent.
**How to avoid:** `npm install @anthropic-ai/sdk` (not `--save-dev`), commit `package.json` AND `package-lock.json`. Add a `vitest` test that just `import`s the route module — it'll fail at install time if the dep is wrong.

### Pitfall 3: Cold-start crash on missing/broken secret
**What goes wrong:** Adding the Anthropic-key fetch to `loadSecrets()` without a try/catch → if the ARN env var is set but the secret doesn't exist yet (or the resource policy isn't attached), `loadSecrets()` rejects → `await ready` in `lambda.ts` throws → every request 500s.
**Why:** `lambda.ts` does `const ready = loadSecrets()` at module scope and awaits it per request.
**How to avoid:** Recommend NOT touching `loadSecrets()` at all — do a lazy, memoized, try/catch'd fetch of the Anthropic key inside the route handler on first use. `cachedKey === undefined` → try the fetch (catch → set `null`); `null` → return the `{configured:false}` response; a string → call the SDK. Also handle "ARN env var not set at all" → straight to `{configured:false}`.

### Pitfall 4: F6 deploy-hygiene pre-flight on the frontend deploy
**What goes wrong:** `deploy-frontend.sh` (in `turion-space-demo`) does `aws s3 sync . --delete` — it would push the repo's dirty/WIP root files and could `--delete` things it shouldn't if the working tree is messy.
**Why:** Known from Phase 33's `33-06-SUMMARY.md` (the "F6 pre-flight").
**How to avoid:** Before `./deploy-frontend.sh`: `git stash push -- about-this-demo.html agent-sales-cash.html dashboard-cio.html` (and any other dirty root HTML), `mv .superpowers /tmp/superpowers-stash-34`, confirm `git status` clean of WIP + `.superpowers` gone. After (even on failure): `git stash pop`, `mv /tmp/superpowers-stash-34 .superpowers`. Note `deploy-frontend.sh` already excludes `backend/*`, `*.sh`, `*.md`, `deploy-*`, `.git/*` — so dirty `backend/` files are safe; it's the root HTML + `.superpowers` that need stashing.

### Pitfall 5: Smoke test at ship time hits `{configured:false}` — that's the expected pass
**What goes wrong:** The deploy-phase smoke test author expects a real Claude reply and treats `{configured:false}` as a failure.
**Why:** The phase explicitly ships before the key is added.
**How to avoid:** The W3 smoke test asserts `POST /api/assistant/chat` (with a valid JWT, or accept 401 if no JWT is minted) returns `200` with `configured:false` (and `404` for a bogus sibling path as a sanity check). Document in the plan: "the assistant goes live only after the user creates the secret + attaches the resource policy."

### Pitfall 6: Commit identity
**What goes wrong:** Commits land as `jeetnair.in@gmail.com`.
**How to avoid:** All commits in `turion-satellite`, `turion-space-demo`, and the GSD repo use `git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit ...` (per CLAUDE.md / MEMORY.md). No CI/CD — these apps deploy via their own scripts (`build-and-push.sh`, `deploy-frontend.sh`), NOT the dollor.ai GitHub workflows.

## Code Examples

### `backend/src/routes/assistant.ts` (new — sketch)
```typescript
// backend/src/routes/assistant.ts · Phase 34
// POST /api/assistant/chat — proxies one chat turn to Anthropic's Messages API
// with the curated SITE_KNOWLEDGE system prompt. Stateless: the client sends the
// recent history each call. Auth-gated. If the ANTHROPIC_API_KEY secret is absent,
// returns 200 { configured:false, reply: "<not configured>" } so the widget renders
// it cleanly and the phase can ship before the key exists.
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { requireAuth } from '../middleware/auth';
import { SITE_KNOWLEDGE } from '../assistant-knowledge';

const router = Router();
const MODEL = 'claude-haiku-4-5';     // help bot — fast/cheap; one-line change to upgrade
const MAX_TOKENS = 1024;
const MAX_HISTORY = 12;               // cap turns we forward
const NOT_CONFIGURED = "The assistant isn't configured yet. An administrator needs to add the Anthropic API key. Once that's done, I'll be able to help you navigate the satellite app.";

// undefined = not tried; null = tried, absent; string = the key
let cachedKey: string | null | undefined;
async function getApiKey(): Promise<string | null> {
  if (cachedKey !== undefined) return cachedKey;
  try {
    if (process.env.ANTHROPIC_API_KEY) { cachedKey = process.env.ANTHROPIC_API_KEY; return cachedKey; }
    const arn = process.env.ANTHROPIC_API_KEY_ARN;
    if (!arn) { cachedKey = null; return cachedKey; }
    const sm = new SecretsManagerClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
    const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
    const raw = res.SecretString ?? '';
    let key = raw.trim();
    try { const j = JSON.parse(raw); if (j && typeof j.ANTHROPIC_API_KEY === 'string') key = j.ANTHROPIC_API_KEY; } catch { /* bare string */ }
    cachedKey = key || null;
  } catch (e) { console.error('[assistant] secret fetch failed:', e); cachedKey = null; }
  return cachedKey;
}

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const key = await getApiKey();
    if (!key) { res.json({ configured: false, reply: NOT_CONFIGURED }); return; }

    const body = req.body || {};
    const page = typeof body.page === 'string' ? body.page.slice(0, 200) : '';
    const inMsgs = Array.isArray(body.messages) ? body.messages : [];
    const messages = inMsgs
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_HISTORY)
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content).slice(0, 4000) }));
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      res.status(400).json({ error: 'messages must end with a user turn' }); return;
    }

    const client = new Anthropic({ apiKey: key });
    const system = SITE_KNOWLEDGE + (page ? `\n\nThe user is currently on the page: ${page}` : '');
    const out = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system, messages });
    const reply = out.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
      || "Sorry — I couldn't generate a reply.";
    res.json({ configured: true, reply });
  } catch (err: any) {
    console.error('[assistant] chat failed:', err);
    res.status(502).json({ error: 'The assistant is temporarily unavailable.' });
  }
});

export default router;
```
*(Sketch — the planner should treat model id, token caps, and the NOT_CONFIGURED text as the plan's defaults. Verify `client.messages.create` signature against the installed `@anthropic-ai/sdk` version at plan time — it's stable, but pin the version.)*

### `backend/src/app.ts` (add two lines)
```typescript
import assistantRouter from './routes/assistant';   // Phase 34
// ...
app.use('/api/assistant', assistantRouter);          // Phase 34 — POST /api/assistant/chat
```

### `satellite/satellite-chat.js` (new — shape)
```javascript
// satellite-chat.js · Phase 34 — self-injecting chat widget. Loaded LAST on every
// satellite page (after satellite-api.js). No inline onclick — all addEventListener.
(function () {
  if (!window.satelliteApi) { console.warn('[satellite-chat] satelliteApi not ready'); return; }
  var history = [];               // [{role:'user'|'assistant', content:string}]
  // 1. inject <style> + #chat-fab button + #chat-panel (header / #chat-log / textarea+Send)
  // 2. fab.addEventListener('click', () => panel.classList.toggle('open'))
  // 3. on Send:
  //    var text = ta.value.trim(); if (!text) return;
  //    history.push({role:'user', content:text}); render(); ta.value='';
  //    try {
  //      var data = await window.satelliteApi.post('/api/assistant/chat',
  //        { messages: history.slice(-8), page: location.pathname });
  //      if (data.configured === false) { showSystem(data.reply); ta.disabled = true; return; }
  //      history.push({role:'assistant', content:data.reply}); render();
  //    } catch (e) { showSystem('Sorry — the assistant is unavailable right now.'); }
})();
```

### One line added to each satellite HTML page
```html
<!-- after satellite-render.js, last script on the page -->
<script src="/satellite/satellite-chat.js"></script>
```
**Pages to touch** (`ls /Users/jeet/turion-space-demo/satellite/*.html`): `index.html`, `sat.html`, `bom.html`, `kanban.html`, `instance.html`, `part.html`, `parts.html`, `work-order.html`, `work-orders.html`, `cost.html`, `cost-detail.html`, `program-new.html`. **Do NOT add it to** `login.html` (pre-auth — `satelliteApi`/session won't exist) or `3d-test.html` (a dev harness — optional, harmless to skip). That's **12** content pages + 1 new JS file.

## State of the Art

| Old approach | Current approach | When | Impact |
|--------------|------------------|------|--------|
| Anthropic completions API / `claude-2` | Messages API (`/v1/messages`, `messages.create`), Claude 4.x family (`claude-haiku-4-5`, `claude-sonnet-4-6`) | 2024–2026 | Use `messages.create` with `system` + `messages[]`; don't use legacy completions. |
| Hand-rolled Lambda Function URL streaming for chat | One-shot JSON behind APIGW REST for short help answers | n/a | Streaming is a nice-to-have, not needed here; APIGW REST buffers anyway. |

**Deprecated / not applicable here:** legacy `anthropic.completions.create` (pre-Messages API); the `claude-instant-*` / `claude-2.*` model ids.

## Open Questions

1. **Streaming vs. one-shot** — *Recommend one-shot.* Answers are short; streaming behind APIGW REST is awkward. Tradeoff: no token-by-token typing effect. Leave a `// future: stream via Lambda Function URL` note. **Plan default: one-shot.**
2. **Conversation history** — *Recommend stateless:* widget keeps `history` in JS, sends `history.slice(-8)` each call; backend caps at `MAX_HISTORY=12`. No DB table, no migration. **Plan default: stateless.**
3. **Model + token budget** — *Recommend `claude-haiku-4-5`, `max_tokens: 1024`*, system prompt ~4 KB. Model id as a `const MODEL` at the top of the route. **Plan default: haiku-4-5 / 1024.**
4. **Where the site-knowledge prompt lives** — *Recommend `backend/src/assistant-knowledge.ts`, `export const SITE_KNOWLEDGE: string`, ~3–6 KB*, covering the 6 section groups in Pattern 3. **Plan default: that file.**
5. **Rate limiting / abuse** — `requireAuth` already gates it (logged-in users only — and this is a demo with a handful of users). *Recommend: rely on `requireAuth` only; skip a per-user limiter* unless trivially easy. Optionally a 5-line in-memory `Map<userId, timestamps[]>` token bucket (e.g., 30 req / 5 min) — mark as optional/stretch in the plan. **Plan default: requireAuth only.**
6. **Graceful-no-key contract** — *Recommend `200 { configured: false, reply: "<message>" }`* (not 4xx/5xx) so the widget treats it as a normal turn (render the message, disable the textarea). Same shape on a real Anthropic API failure? No — for an actual call failure return `502 { error: 'temporarily unavailable' }` and the widget shows a generic "unavailable" line (it's a *transient* error, not "not configured"). **Plan default: 200+configured:false for no-key; 502 for call failure.**
7. **The new secret** — Name: `turion-satellite/production/anthropic-key`, region `us-east-1`, account `134607809447`. Payload: JSON `{"ANTHROPIC_API_KEY":"sk-ant-..."}` (route also accepts a bare string). The Lambda needs env var `ANTHROPIC_API_KEY_ARN` = the secret's full ARN (added via `aws lambda update-function-configuration --environment ...` — keep the existing `DATABASE_URL_ARN`, `SUPABASE_JWT_SECRET_ARN`, `S3_FILES_BUCKET`). **Critical:** the Lambda role `zietra-api-lambda-role` has NO `secretsmanager:*` IAM permission — access to `database-url` is granted by a **resource policy ON that secret** (verified: `{ Principal: arn:aws:iam::134607809447:role/zietra-api-lambda-role, Action: secretsmanager:GetSecretValue, Resource: * }`). So the new secret MUST get the same resource policy: `aws secretsmanager put-resource-policy --secret-id turion-satellite/production/anthropic-key --resource-policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::134607809447:role/zietra-api-lambda-role"},"Action":"secretsmanager:GetSecretValue","Resource":"*"}]}'`. **The plan should NOT create the secret** (user does that) but MUST document: (a) the secret name/region/payload, (b) the `ANTHROPIC_API_KEY_ARN` Lambda env var, (c) the resource-policy command. The phase ships and deploys *without* these — the widget shows "not configured" until the user does them.
8. **Mangum/serverless-http** — Confirmed: `lambda.ts` uses `serverless-http` wrapping the Express `app`. The new route just `app.use(...)`s into the same app — **no infra change beyond the redeploy + the optional `ANTHROPIC_API_KEY_ARN` env var add** (which is a user step, not a code step). Memory size (512 MB) / timeout (30 s) are fine for a one-shot Claude call.

### Suggested plan breakdown (~3 plans, 3 waves)
- **W1 — Backend** (`turion-satellite`): add `@anthropic-ai/sdk` dep (commit `package.json` + `package-lock.json`); create `backend/src/assistant-knowledge.ts` (`SITE_KNOWLEDGE`); create `backend/src/routes/assistant.ts` (`POST /chat`, `requireAuth`, lazy memoized secret fetch, graceful-no-key, hardened catch); mount in `app.ts`; vitest tests (401 no-auth; 200 `{configured:false}` when `ANTHROPIC_API_KEY`/`_ARN` unset; 200 `{configured:true, reply}` with the Anthropic client mocked; 400 on empty/non-user-final `messages`). *Splittable into W1a (route + dep + secret-load + tests, with a stub `SITE_KNOWLEDGE`) and W1b (write the full `SITE_KNOWLEDGE` content) — but it's small; one plan is fine.*
- **W2 — Frontend** (`turion-space-demo`): create `satellite/satellite-chat.js` (self-injecting button + panel, `addEventListener` only, `satelliteApi.post('/api/assistant/chat', {messages, page})`, handles `configured:false`); add one `<script src="/satellite/satellite-chat.js">` line to the 12 content pages (not `login.html`/`3d-test.html`).
- **W3 — Deploy + verify**: `git push` both repos (commit identity `jm@techcloudpro.com`); `./build-and-push.sh` (turion-satellite) → record Lambda CodeSha256 before→after; curl-smoke `POST /api/assistant/chat` → expect `200 {configured:false}` (key not set yet) + `404` on a bogus path + `GET /api/health` ok; F6 pre-flight (stash root HTML + `.superpowers`) → `./deploy-frontend.sh` (turion-space-demo) → CF invalidation id → poll Completed → restore; curl-smoke a couple of `https://turionspace.zietra.com/satellite/*.html` 200 + `grep("satellite-chat.js")`; run `node scripts/audit-satellite-buttons.mjs` in **both** repos → expect `violations: 0`; update STATE.md + ROADMAP.md (Phase 34 complete, the secret/env-var/resource-policy steps the user still needs to do to "light it up"); commit docs to the GSD repo.

## Sources

### Primary (HIGH confidence)
- Direct inspection of `/Users/jeet/turion-satellite/backend/src/{app.ts, lambda.ts, secrets.ts, db.ts, routes/sales-orders.ts, middleware/auth.ts}`, `backend/package.json`, `backend/lambda-build`, `build-and-push.sh`, `scripts/provision-aws.sh`, `scripts/audit-satellite-buttons.mjs` — patterns the new code must follow.
- Direct inspection of `/Users/jeet/turion-space-demo/satellite/{index,sat,bom,kanban,instance,part,parts,work-order,work-orders,cost,cost-detail,program-new,login}.html`, `satellite-api.js`, `satellite-config.js`, `satellite-render.js`, `deploy-frontend.sh` — the frontend skeleton + the script-load order.
- `aws lambda get-function-configuration --function-name turion-satellite-api` (env vars: `DATABASE_URL_ARN`, `SUPABASE_JWT_SECRET_ARN`, `S3_FILES_BUCKET`; role `zietra-api-lambda-role`).
- `aws iam list-role-policies / get-role-policy` for `zietra-api-lambda-role` (no `secretsmanager:*` permission) + `aws secretsmanager get-resource-policy` on the `database-url` secret (access granted by a resource policy on the secret) — the key infra finding.
- `/Users/jeet/doordash-p2p/.planning/phases/33-end-to-end-satellite-build-flow/33-06-SUMMARY.md` — the F6 pre-flight, the deploy scripts, the button-audit-both-repos rule, the E2E flow the prompt must describe.
- `/Users/jeet/doordash-p2p/CLAUDE.md` + project MEMORY.md — commit identity, "Turion deploys via its own scripts not the dollor.ai CI/CD", the make/buy paragraph for the prompt content.

### Secondary (MEDIUM confidence)
- npm `@anthropic-ai/sdk` page + Anthropic docs (WebSearch) — `messages.create({ model, max_tokens, system, messages })`, `claude-haiku-4-5` model id. **Pin the exact installed version at plan time** (`npm view @anthropic-ai/sdk version`); the API surface is stable.

### Tertiary (LOW confidence)
- WebSearch summary text about Haiku 4.5 speed/cost — directional only; not load-bearing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — the SDK + Secrets Manager + Express + serverless-http are all either already in the repo or extremely well-known; only the precise `@anthropic-ai/sdk` patch version is TBD-at-plan-time.
- Architecture: HIGH — the new route and the widget directly mirror existing files (`routes/sales-orders.ts`, `satellite-api.js`); the infra path is fully verified against live AWS.
- Pitfalls: HIGH — every pitfall is grounded in an inspected file or a verified AWS fact (the no-IAM-secrets-permission-resource-policy thing especially).

**Research date:** 2026-05-12
**Valid until:** ~2026-06-12 (stable; revisit only if `@anthropic-ai/sdk` has a major bump or the Lambda's IAM/secret wiring changes).
