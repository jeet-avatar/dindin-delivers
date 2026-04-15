---
phase: 09-rbac-team-management-and-chat-persistence
plan: 02
subsystem: frontend
tags: [frontend, auth, chat-persistence, rbac, dashboard]
dependency_graph:
  requires: [09-01]
  provides: [DB-backed chat UI, role-aware routing, Dashboard page, admin sidebar link]
  affects: [src/frontend/src/services, src/frontend/src/hooks, src/frontend/src/pages, src/frontend/src/components]
tech_stack:
  added: []
  patterns: [optimistic UI updates with server sync, adapter pattern (ChatSession → Chat), async hooks with loading state]
key_files:
  created:
    - src/frontend/src/pages/Dashboard.tsx
  modified:
    - src/frontend/src/types/user.ts
    - src/frontend/src/services/authService.ts
    - src/frontend/src/services/api.ts
    - src/frontend/src/services/chatService.ts
    - src/frontend/src/hooks/useChat.ts
    - src/frontend/src/pages/Chat.tsx
    - src/frontend/src/pages/Password.tsx
    - src/frontend/src/components/Sidebar.tsx
    - src/frontend/src/routes.tsx
    - src/frontend/src/data/mockUsers.ts
decisions:
  - AB-902-F1: User.id made optional — backend login response does not return id field (frozen interface constraint)
  - AB-902-F2: createChat() returns optimistic placeholder synchronously; real ChatSession replaces it async after server call
  - AB-902-F3: chatService.search() takes pre-loaded sessions array (not async) — avoids extra network call in SearchModal
metrics:
  duration_seconds: 346
  tasks_completed: 3
  files_created: 1
  files_modified: 9
  completed_date: "2026-04-10"
---

# Phase 9 Plan 02: DB-Backed Chat UI, Role Auth Fix, Dashboard Summary

DB-backed chat persistence replacing localStorage, authService hardcoded role bug fixed (stores `data.role` from API), Dashboard landing page added, post-login redirects to /dashboard, admin users see Admin Panel link in sidebar.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Fix authService role bug, add User.role, add chat API CRUD | 46b83015 | types/user.ts, authService.ts, api.ts, Password.tsx |
| 2 | Rewrite chatService to DB-backed API, update useChat async, wire chat_session_id | 87f6ddfe | chatService.ts, useChat.ts, pages/Chat.tsx |
| 3 | Dashboard page, /dashboard route, AdminProtected, sidebar admin link | 34937844 | pages/Dashboard.tsx, routes.tsx, Sidebar.tsx |

## What Was Built

### Task 1 — Type + Auth Fixes + API CRUD

**types/user.ts:** Added `role: "admin" | "user"` field. Made `id` optional (login response does not return id).

**authService.ts:** Fixed root cause of all users appearing as admin: `role: data.user_type || "Administrator"` → `role: (data.role as "admin" | "user") || "user"`. Now reads actual role from backend response.

**api.ts:** Added `ChatSession` and `ChatMessage` TypeScript interfaces. Added 5 CRUD functions: `listChats()`, `createChatSession()`, `getChatMessages()`, `renameChatSession()`, `deleteChatSession()`. Updated `sendChatMessage()` to accept optional `chatSessionId?: number | null` and include `chat_session_id` in POST body for server-side message persistence.

**Password.tsx:** Post-login redirect changed from `nav('/chat/${encodeId(c.id)}')` to `nav("/dashboard")`. Removed unused `useChat` and `encodeId` imports.

### Task 2 — DB-Backed chatService + async useChat + chat_session_id in Chat

**chatService.ts:** Complete rewrite. Old implementation: ~160 lines of localStorage CRUD. New implementation: delegates all operations to API functions (`listChats`, `createChatSession`, `getChatMessages`, `renameChatSession`, `deleteChatSession`). Zero localStorage references. Same exported `chatService` object name.

**useChat.ts:** Complete rewrite. Old: synchronous localStorage reads, no loading state. New: async API loading with `isLoading` state, initial load via `refresh()` in useEffect, optimistic `createChat()` (returns placeholder immediately, replaces with real DB session when server responds), `updateTitle()`/`remove()` update local state immediately then fire async API calls. Adapter pattern converts `ChatSession` (numeric id, no messages) to `Chat` (string id, messages array) for UI compatibility.

**pages/Chat.tsx:** Added `dbSessionId` state (`number | null`). Updated to parse numeric DB session ID from string chat ID. Passes `dbSessionId` as third arg to `sendChatMessage()`. Removed synchronous `chatService.getById()` call — replaced with `chats` state lookup. Removed unused `chatService` import.

### Task 3 — Dashboard + Routes + Admin Link

**Dashboard.tsx:** New post-login landing page. Sections: welcome header with user name, quick actions row (New Chat, History, Admin Panel for admins only), stats row (recent chats count, scripts deployed placeholder, team members placeholder), recent chats list (up to 5 from API, with skeleton loading and error states). Uses `listChats()` from api.ts, `useAuth()` for user data, `encodeId()` for chat navigation links.

**routes.tsx:** Added `Dashboard` import and `/dashboard` route (wrapped in `Protected`). Added `AdminProtected` component that redirects non-admins to `/chat/new` (ready for use in 09-03 admin panel route).

**Sidebar.tsx:** Added `Shield` to lucide-react imports. Added admin link inside user menu dropdown that renders only when `user?.role === "admin"`.

## Verification

```
[x] npx tsc --noEmit: zero errors in modified files
[x] npm run build: exits 0, built in 4.90s
[x] grep "data.role" authService.ts: line 77 — fix in place
[x] grep -c "localStorage" chatService.ts: 0
[x] grep "AdminProtected" routes.tsx: defined at line 29
[x] grep "/dashboard" routes.tsx: route registered at line 54
[x] nav("/dashboard") in Password.tsx: line 29
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] mockUsers.ts missing required role field**
- **Found during:** Task 1 TypeScript check
- **Issue:** `User` type now requires `role` field; `mockUsers` array didn't have it
- **Fix:** Added `role: "user"` to both mock users
- **Files modified:** src/data/mockUsers.ts
- **Commit:** 46b83015

**2. [Rule 1 - Bug] User.id was required but login response never returns id**
- **Found during:** Task 3 TypeScript analysis
- **Issue:** Frozen interface (CLAUDE.md) shows login response has no `id` field, but original `User` interface required `id: string`. The original code was already mismatched — just not caught as TS error because authService didn't type its return.
- **Fix:** Made `id?: string` optional in User interface. mockUsers still include id for mock auth mode compatibility.
- **Files modified:** src/types/user.ts
- **Commit:** 34937844

**3. [Rule 1 - Bug] Password.tsx post-login redirect — not in authService**
- **Found during:** Task 1 reading
- **Issue:** Plan said to find redirect in authService.ts. Actual redirect was in Password.tsx line 29 (`nav('/chat/${encodeId(c.id)}')`). There was no redirect in authService.ts at all.
- **Fix:** Updated redirect in Password.tsx to `nav("/dashboard")` and removed unused imports
- **Files modified:** src/pages/Password.tsx
- **Commit:** 46b83015

## Key Decisions Made

| ID | Decision |
|----|----------|
| AB-902-F1 | User.id made optional — backend login response does not return id field |
| AB-902-F2 | createChat() returns optimistic placeholder synchronously; async server call replaces it |
| AB-902-F3 | chatService.search() takes pre-loaded sessions array — avoids extra network call |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/frontend/src/pages/Dashboard.tsx | FOUND |
| src/frontend/src/services/chatService.ts | FOUND |
| src/frontend/src/hooks/useChat.ts | FOUND |
| commit 46b83015 | FOUND |
| commit 87f6ddfe | FOUND |
| commit 34937844 | FOUND |
