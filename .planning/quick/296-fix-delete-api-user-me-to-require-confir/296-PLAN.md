---
task: 296
slug: fix-delete-api-user-me-to-require-confir
date: 2026-04-22
mode: quick
repo_split:
  code: /Users/jeet/arthaBuild/
  plan_docs: /Users/jeet/doordash-p2p/.planning/quick/296-fix-delete-api-user-me-to-require-confir/
must_haves:
  truths:
    - "Backend endpoint DELETE /api/user/me currently takes no body and soft-deletes the caller with no server-side confirmation check (found during launch readiness T5.4)"
    - "Frontend DeleteAccount.tsx gates the UI with type-DELETE, but calls authService.deleteAccount() which sends DELETE with NO body"
    - "Frontend and backend must both be updated atomically — backend now rejects requests without confirm==DELETE, so frontend must start sending it"
  artifacts:
    - "/Users/jeet/arthaBuild/src/backend/routers/user.py — DELETE /me endpoint accepts DeleteAccountRequest body with confirm: Literal['DELETE']"
    - "/Users/jeet/arthaBuild/src/backend/schemas.py OR routers/user.py — add DeleteAccountRequest pydantic model"
    - "/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts — deleteAccount() sends body {confirm:'DELETE'}"
  key_links:
    - "/Users/jeet/arthaBuild/src/backend/routers/user.py:234-255 (current endpoint)"
    - "/Users/jeet/arthaBuild/src/frontend/src/pages/DeleteAccount.tsx:7,16 (REQUIRED_PHRASE='DELETE')"
    - "/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts (deleteAccount function)"
---

# Plan 296 — Fix DELETE /api/user/me confirm bypass

## Goal

Force server-side confirmation of account deletion. Rule: **no confirm body or confirm≠"DELETE" → 400**. Update frontend to send the body.

## Background

Launch-readiness test T5.4 sent `DELETE /api/user/me` with body `{"confirm":"wrong"}`, got `200 {"message":"Account deleted"}`, and soft-deleted the admin. The backend endpoint does not read the body at all. Frontend has correct UI gating (`DeleteAccount.tsx:16 canDelete = confirmText === "DELETE"`) but `authService.deleteAccount()` sends DELETE with NO body. Both sides must be patched in one atomic release.

---

## Task 1 — Backend: require confirm=='DELETE'

**Files:**
- `/Users/jeet/arthaBuild/src/backend/routers/user.py` (edit DELETE /me endpoint)

**Action:**
- Add a pydantic request model `DeleteAccountRequest(BaseModel)` with `confirm: str` field (or Literal if acceptable). Define inline at top of user.py alongside other request models, OR add to `schemas.py` if it lives there.
- Change DELETE /me signature to accept `data: DeleteAccountRequest` (JSON body)
- At top of function: `if data.confirm != "DELETE": raise HTTPException(status_code=400, detail="Confirmation phrase required. Send {\"confirm\": \"DELETE\"} to proceed.")`
- Keep rest of soft-delete logic unchanged (is_active=False, audit log, JTI blacklist, return {"message": "Account deleted"})

**Verify:**
```bash
# With admin token but NO body → 422 (FastAPI pydantic)
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE https://artha.build/api/user/me \
  -H "User-Agent: Mozilla/5.0 Safari" -H "Authorization: Bearer $TOKEN"
# Expect: 422

# With wrong confirm → 400
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE https://artha.build/api/user/me \
  -H "User-Agent: Mozilla/5.0 Safari" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"confirm":"wrong"}'
# Expect: 400

# With confirm=DELETE → 200 (we won't actually run this in test — would delete the account)
```

**Done:**
- Backend rejects DELETE /me without confirm body (422) or with confirm≠"DELETE" (400)
- Commit in `/Users/jeet/arthaBuild/` with message `fix(security): DELETE /api/user/me requires confirm=DELETE body`

---

## Task 2 — Frontend: send confirm=DELETE in authService

**Files:**
- `/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts` (edit deleteAccount function)

**Action:**
- Change fetch call: add `body: JSON.stringify({ confirm: "DELETE" })` to the DELETE request options
- Keep Content-Type header (already present)
- No changes to DeleteAccount.tsx (UI already checks `confirmText === "DELETE"` before calling)

**Verify:**
```bash
# Grep proof
grep -A 5 "export async function deleteAccount" /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
# Expect: body: JSON.stringify({ confirm: "DELETE" })

# Build succeeds
cd /Users/jeet/arthaBuild/src/frontend && npm run build 2>&1 | tail -3
# Expect: "✓ built in Xs"
```

**Done:**
- `authService.deleteAccount()` sends body `{"confirm":"DELETE"}`
- `npm run build` passes
- Commit in `/Users/jeet/arthaBuild/` with message `fix(frontend): authService.deleteAccount sends confirm:DELETE body`

---

## Task 3 — Deploy + E2E verify

**Files:** none (deploy the code already pushed in Tasks 1+2)

**Action:**
1. Push arthaBuild commits to origin/main
2. Build frontend dist locally (already done in Task 2 verify)
3. Restart backend (python code change — `docker compose up -d --build backend` NOT restart; per memory rule)
4. Tar + scp new frontend dist to EC2
5. Swap dist atomically on EC2 + `docker compose restart nginx`
6. Run E2E tests:
   - T1: DELETE /me no body → 422
   - T2: DELETE /me wrong confirm → 400 (admin account NOT affected — verify via subsequent /api/user/me)
   - T3: Normal auth flow still works (login, /me, logout)

**Verify:**
Run the 3 E2E tests. All must pass. Admin account must remain `is_active=1` after T1 + T2.

**Done:**
- Backend container shows new code in effect (DELETE with no body returns 422 or 400)
- Frontend bundle hash changes (new file under /assets/index-*.js)
- Admin account still works via /api/user/me

---

## Rollback plan

- Backend: `docker compose up -d --build backend` with prior git SHA
- Frontend: prior dist preserved at `/home/ubuntu/arthaBuild/src/frontend/dist.bak.quick296.<TS>`

## Risks

- **Breaking running sessions** — users with live tokens who try to delete will hit 422 until frontend bundle reloads. Acceptable: worst case they get an error message and retry.
- **Pydantic 422 vs 400** — FastAPI auto-emits 422 for missing body; backend explicit `raise 400` for wrong confirm. Both acceptable rejections. Test must accept either.
