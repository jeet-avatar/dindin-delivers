---
phase: 17-onboarding-ux
verified: 2026-04-13T00:00:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 17: Onboarding UX Verification Report

**Phase Goal:** A new admin sees a first-run wizard on first login (connect NetSuite → invite team → verify license). License key can be entered and validated from the UI (no .env editing). In-app notifications surface warnings (license expiry, Ollama down, disk full). Empty states guide users when no chats/scripts exist yet.
**Verified:** 2026-04-13
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A new admin user sees OnboardingWizard modal on first login (disappears after completing or dismissing) | VERIFIED | `OnboardingWizard.tsx` mounts, calls `GET /api/admin/user/me/onboarding`, shows modal when `onboarding_completed===false` and `userRole==="admin"`. Dismiss/Finish calls `POST /api/admin/onboarding/complete` → sets flag → `setShow(false)`. Wired into `Chat.tsx:262` as `<OnboardingWizard userRole={user?.role} />` |
| 2 | Admin can enter and validate a license key from the AdminPanel License tab without editing .env | VERIFIED | `AdminPanel.tsx` declares `"license"` as the 7th tab (`AdminPanel.tsx:342`). License tab renders at line 853 with `licenseKeyInput` state, `handleValidateLicenseKey()` at line 298 calling `POST /api/admin/license/validate-key`. Backend endpoint at `admin.py:608` calls `_call_license_server()` from existing license utils, or returns dev-mode response when `LICENSE_SERVER_URL` is unset. No .env edit required. |
| 3 | NotificationBanner appears at top of Chat when /health/detail signals a problem (Ollama down, disk low, license expiring) | VERIFIED | `NotificationBanner.tsx` polls `GET /health/detail` every 60s with Bearer token. Extracts `ai_ready===false`, `disk_free_gb < 5`, `license_valid===false` into `warnings[]`. Renders amber banner with dismiss X. Re-shows on new warnings after dismiss. Wired into `Chat.tsx:264` as `<NotificationBanner />` above `<LicenseBanner />`. |
| 4 | Chat page / Sidebar shows EmptyState when user has no chat sessions | VERIFIED | `Sidebar.tsx:372-379` renders `<EmptyState message="No chats yet" subtext="Start a conversation to ask ArthaBuild a NetSuite question" ctaLabel="New Chat" onCta={() => nav("/chat/new")} />` when `!isLoading && filteredChats.length === 0`. Note: EmptyState is correctly placed in `Sidebar.tsx` (which holds the chat list), not `Chat.tsx` — per documented deviation AB-1702. |
| 5 | History page shows EmptyState when no chat history exists | VERIFIED | `History.tsx:25-32` renders `<EmptyState icon={<HistoryIcon>} message="No history yet" subtext="Your past conversations will appear here" ctaLabel="Start a new chat" onCta={() => navigate("/chat/new")} />` when `!isLoading && chats.length === 0`. Named import `{ EmptyState }` at line 7. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/frontend/src/pages/OnboardingWizard.tsx` | 3-step modal: connect NetSuite → invite team → verify license | VERIFIED | 357 lines. Steps 1/2/3 present with functional handlers. Named export default. |
| `src/frontend/src/pages/AdminPanel.tsx` | License tab with license key input + validate button | VERIFIED | Tab type includes `"license"`, 7 nav items, License tab renders at line 853 with input + `handleValidateLicenseKey()` calling `POST /api/admin/license/validate-key`. |
| `src/frontend/src/components/NotificationBanner.tsx` | Banner polling /health/detail every 60s, shows warnings | VERIFIED | 95 lines. `POLL_INTERVAL_MS = 60_000`, polls on mount + setInterval. Three warning conditions implemented. Amber banner with dismiss. Named default export. |
| `src/frontend/src/components/EmptyState.tsx` | Reusable empty state with icon + message + CTA button | VERIFIED | 49 lines. Props: `icon?`, `message`, `subtext?`, `ctaLabel?`, `onCta?`. Named export `EmptyState` (tree-shakeable). Default icon: `MessageSquare`. CTA only renders when both `ctaLabel` and `onCta` present. |
| `src/backend/models.py` | `onboarding_completed` Boolean column on User | VERIFIED | Line 55: `onboarding_completed = Column(Boolean, default=False, nullable=False, server_default="0")` |
| `src/backend/alembic/versions/17a_onboarding.py` | Migration adding onboarding_completed column | VERIFIED | `batch_alter_table("users")`, adds `onboarding_completed` Boolean `server_default="0"`, `down_revision='16a_api_key_model'`. |
| `src/backend/routers/admin.py` | Three new endpoints: GET onboarding status, POST complete, POST license/validate-key | VERIFIED | Lines 585-648: all three endpoints exist with correct auth (`require_admin`), correct response shapes, and real implementation (not stubs). |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Chat.tsx` | `OnboardingWizard.tsx` | `<OnboardingWizard userRole={user?.role} />` at line 262 | WIRED | Import at line 9, rendered inside `ChatLayout` wrapper before content column |
| `Chat.tsx` | `NotificationBanner.tsx` | `<NotificationBanner />` at line 264 | WIRED | Import at line 8, rendered at top of content column above `LicenseBanner` |
| `NotificationBanner.tsx` | `/health/detail` | `fetch("/health/detail", { headers: { Authorization: Bearer token } })` inside `checkHealth()` + `setInterval(checkHealth, 60_000)` | WIRED | Full response-handling: extracts `ai_ready`, `disk_free_gb`, `license_valid`; sets `warnings` state; renders banner or null |
| `Sidebar.tsx` | `EmptyState.tsx` | `{!isLoading && filteredChats.length === 0 && <EmptyState ... />}` at line 372 | WIRED | Named import `{ EmptyState }` at line 2, CTA wired to `nav("/chat/new")` |
| `History.tsx` | `EmptyState.tsx` | `{!isLoading && chats.length === 0 && <EmptyState ... />}` at line 25 | WIRED | Named import at line 7, CTA wired to `navigate("/chat/new")` |
| `AdminPanel.tsx` | `POST /api/admin/license/validate-key` | `handleValidateLicenseKey()` at line 298 using `fetch("/api/admin/license/validate-key", { method: "POST", body: JSON.stringify({ license_key }) })` | WIRED | Response stored in `licenseValidResult` state, rendered as green or red result block |
| `OnboardingWizard.tsx` | `GET /api/admin/user/me/onboarding` | `fetch("/api/admin/user/me/onboarding")` in `useEffect` on mount | WIRED | Response drives `setShow(true)` when `onboarding_completed===false` |
| `OnboardingWizard.tsx` | `POST /api/admin/onboarding/complete` | `handleComplete()` calls `fetch("/api/admin/onboarding/complete", { method: "POST" })` | WIRED | Called on Finish Setup and Skip All; closes modal via `setShow(false)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UX-01 | 17-01-PLAN | First-run wizard for new admin (NetSuite → team → license) | SATISFIED | `OnboardingWizard.tsx` — 3-step modal, shown only to admin with `onboarding_completed===false`, dismissible, calls complete endpoint |
| UX-02 | 17-01-PLAN | License key UI in AdminPanel (no .env edit) | SATISFIED | AdminPanel License tab (7th tab) with key input + validate button → `POST /api/admin/license/validate-key` → shows valid/invalid result |
| UX-03 | 17-01-PLAN | In-app notifications for health problems | SATISFIED | `NotificationBanner.tsx` polling `/health/detail` every 60s, three warning conditions, amber dismiss banner, wired into Chat page |
| UX-04 | 17-01-PLAN | Empty states in Chat (sessions) and History | SATISFIED | `Sidebar.tsx` has EmptyState for zero-chat state; `History.tsx` has EmptyState for zero-history state |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `NotificationBanner.tsx` | 73 | `return null` | Info | Correct guard clause — component intentionally renders nothing when no warnings or dismissed |
| `OnboardingWizard.tsx` | 112 | `return null` | Info | Correct guard clause — component renders nothing when `show===false` |

No blockers or warnings. Both `return null` occurrences are intentional conditional non-renders, not empty implementations.

---

### Human Verification Required

#### 1. OnboardingWizard first-login appearance

**Test:** Create a fresh admin account (new email, not previously seen). Log in for the first time.
**Expected:** Wizard modal appears over the Chat page with 3-step indicator and "Welcome to ArthaBuild" header. Dismissing or completing the wizard does not show it again on the next login.
**Why human:** `onboarding_completed` defaults to `False` in the DB migration, but requires verifying that the endpoint returns `false` for a genuinely new account (not one that already existed before the migration ran).

#### 2. NotificationBanner appearance with Ollama stopped

**Test:** Stop Ollama (`docker stop ollama` or kill the process), then reload the Chat page and wait up to 60 seconds.
**Expected:** Amber banner appears at top of page: "AI model unavailable — answers may be degraded". Banner dismisses when X is clicked, but re-appears on the next 60s poll if Ollama is still down.
**Why human:** Requires real Ollama instance to be running/stopped; the `/health/detail` endpoint behavior under Ollama-down conditions cannot be verified statically.

#### 3. License tab — validate key round-trip

**Test:** Log in as admin, navigate to Admin Panel → License tab. Enter a test key and click Validate.
**Expected:** In dev mode (no `LICENSE_SERVER_URL`): green checkmark with "Plan: dev". With real license server: valid key → green plan name + expiry; invalid key → red error message.
**Why human:** Requires a running backend and real/mock license key to confirm the full UI → API → response → render flow.

---

### Build Verification

Frontend build clean (`npm run build`):
- Exit code: 0
- Output: `dist/assets/index-BvxfySb1.js 2,499.99 kB` (gzip: 764 kB)
- No TypeScript or import errors
- Only advisory: chunk size > 500 kB (pre-existing, not introduced by Phase 17)

---

### Deviations Confirmed as Correct

**EmptyState placed in Sidebar.tsx, not Chat.tsx sessions area:**
The PLAN specified wiring EmptyState into "the chat list panel (left sidebar / session list)" in `Chat.tsx`. The actual chat list lives in `Sidebar.tsx`. The implementation correctly places `EmptyState` in `Sidebar.tsx` — the component that owns and renders the `chats` array. This is functionally equivalent to the plan's intent and documented in SUMMARY decision AB-1702.

**OnboardingWizard placed at ChatLayout root, not inside content column:**
Decision AB-1702: placed outside content column to avoid z-index conflicts with LicenseBanner and EmailVerificationBanner. Functionally identical — wizard still shows on first admin load of Chat page.

---

_Verified: 2026-04-13_
_Verifier: Claude (gsd-verifier)_
