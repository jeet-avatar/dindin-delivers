---
phase: 293-foolproof-arthabuild-launch
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # arthaBuild repo (code) — /Users/jeet/arthaBuild/
  - /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
  - /Users/jeet/arthaBuild/src/frontend/src/pages/DeleteAccount.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/pages/NotFound.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/pages/SecurityPage.tsx
  - /Users/jeet/arthaBuild/src/frontend/src/routes.tsx
  - /Users/jeet/arthaBuild/src/frontend/public/og-image.png
  - /Users/jeet/arthaBuild/scripts/gen-og-image.mjs
  # EC2 production host — 44.194.34.223
  - /home/ubuntu/arthaBuild/.env
  # dindin monorepo (docs) — /Users/jeet/doordash-p2p/
  - /Users/jeet/doordash-p2p/.planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-PLAN.md
  - /Users/jeet/doordash-p2p/.planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-SUMMARY.md
autonomous: true
requirements:
  - LAUNCH-01  # Delete-account UI (GDPR Art.17 self-service erasure)
  - LAUNCH-02  # Real og-image.png (1200x630, social preview)
  - LAUNCH-03  # 404 page + SPA catchall route
  - LAUNCH-04  # /security compliance & attestations addendum (truthful)
  - LAUNCH-05  # Activate backend Sentry on production
user_setup:
  - service: sentry
    why: "Runtime error capture on arthaBuild backend — DSN required to activate already-wired sentry_sdk"
    env_vars:
      - name: SENTRY_DSN
        source: "Sentry dashboard → arthaBuild project → Client Keys (DSN). Reuse TCP org project if exists, else create fresh."
    dashboard_config:
      - task: "Create/confirm arthaBuild project + capture DSN"
        location: "https://sentry.io → Projects"

must_haves:
  truths:
    - "Logged-in user can delete their own account from the UI, token invalidates, redirected home"
    - "https://artha.build/og-image.png is a real 1200x630 PNG (not 1x1, content-length > 50KB)"
    - "https://artha.build/any-unknown-path renders a 404 page (not the landing)"
    - "/security page contains a Compliance & Attestations section with SOC 2 roadmap, subprocessors, DPA, pen-test, GDPR — all truthful/roadmap-framed"
    - "A triggered backend error appears in Sentry UI within ~30s"
  artifacts:
    - path: "/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts"
      provides: "deleteAccount() fetch DELETE /api/user/me with Authorization bearer"
      contains: "deleteAccount"
    - path: "/Users/jeet/arthaBuild/src/frontend/src/pages/DeleteAccount.tsx"
      provides: "Account deletion page with type-DELETE confirm gate"
      min_lines: 40
    - path: "/Users/jeet/arthaBuild/src/frontend/src/pages/NotFound.tsx"
      provides: "404 component with link back to /"
      min_lines: 15
    - path: "/Users/jeet/arthaBuild/src/frontend/public/og-image.png"
      provides: "1200x630 social preview image"
    - path: "/Users/jeet/arthaBuild/src/frontend/src/pages/SecurityPage.tsx"
      provides: "Existing page + new Compliance & Attestations section"
      contains: "Compliance"
    - path: "/home/ubuntu/arthaBuild/.env"
      provides: "SENTRY_DSN env var for production backend container"
      contains: "SENTRY_DSN="
  key_links:
    - from: "DeleteAccount.tsx"
      to: "authService.deleteAccount()"
      via: "onConfirm click handler"
      pattern: "deleteAccount\\("
    - from: "authService.deleteAccount()"
      to: "DELETE /api/user/me"
      via: "fetch with Authorization: Bearer"
      pattern: "method:\\s*[\"']DELETE[\"']"
    - from: "routes.tsx"
      to: "NotFound component"
      via: "<Route path=\"*\" element={<NotFound />} />"
      pattern: "path=[\"']\\*[\"']"
    - from: "rawapi.py sentry_sdk.init"
      to: "Sentry cloud"
      via: "SENTRY_DSN env var injected at container start"
      pattern: "SENTRY_DSN"
---

<objective>
Foolproof arthaBuild for public launch by closing 5 verified gaps before marketing pages ship: (1) self-service delete-account UI, (2) real og-image, (3) 404 page, (4) /security compliance section, (5) activate existing backend Sentry on prod.

Purpose: Eliminate the last legally/operationally visible gaps that block a clean public launch. All 5 items have evidence captured in the handoff at `~/.claude/handoffs/2026-04-20-arthaBuild-launch-foolproof-5-fixes.md`.

Output: Production artha.build serves real og-image, 404s for unknown URLs, exposes compliance posture, allows account deletion via UI, and reports errors to Sentry.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/.claude/handoffs/2026-04-20-arthaBuild-launch-foolproof-5-fixes.md
@/Users/jeet/arthaBuild/CLAUDE.md
@/Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
@/Users/jeet/arthaBuild/src/frontend/src/pages/SecurityPage.tsx
@/Users/jeet/arthaBuild/src/frontend/src/routes.tsx
@/Users/jeet/arthaBuild/src/backend/routers/user.py
@/Users/jeet/arthaBuild/src/backend/rawapi.py
</context>

<repo_discipline>
**Two-repo split (STRICT):**

| Work | Repo | Path | Commit style |
|------|------|------|--------------|
| Code changes (frontend, og script) | arthaBuild standalone | `/Users/jeet/arthaBuild/` | Explicit `git add <files>` — NEVER `git add -A`. Repo has pre-existing uncommitted modifications. |
| EC2 env edits | production host | `44.194.34.223:/home/ubuntu/arthaBuild/` | SSH, append-only to `.env`, no git |
| Plan + Summary docs | dindin monorepo | `/Users/jeet/doordash-p2p/.planning/quick/293-.../` | Normal git flow on current branch |

**Commit boundaries:**
- arthaBuild code commit: only the 7 code/asset files listed in `files_modified` under arthaBuild paths.
- dindin doc commit: only the PLAN + SUMMARY files.

**SSH to EC2:**
```
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223
```
</repo_discipline>

<tasks>

<task type="auto">
  <name>Task 1: Frontend batch — delete-account UI + og-image + 404 + /security compliance</name>
  <files>
    /Users/jeet/arthaBuild/src/frontend/src/services/authService.ts
    /Users/jeet/arthaBuild/src/frontend/src/pages/DeleteAccount.tsx
    /Users/jeet/arthaBuild/src/frontend/src/pages/NotFound.tsx
    /Users/jeet/arthaBuild/src/frontend/src/pages/SecurityPage.tsx
    /Users/jeet/arthaBuild/src/frontend/src/routes.tsx
    /Users/jeet/arthaBuild/src/frontend/public/og-image.png
    /Users/jeet/arthaBuild/scripts/gen-og-image.mjs
  </files>
  <action>
`cd /Users/jeet/arthaBuild` for all work in this task.

**① Delete-account UI**
1. Read `src/frontend/src/services/authService.ts` (existing GET at line ~126, PATCH at ~162). Append a new method:
   ```ts
   export async function deleteAccount(token: string): Promise<void> {
     const res = await fetch("/api/user/me", {
       method: "DELETE",
       headers: { Authorization: `Bearer ${token}` },
     });
     if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
   }
   ```
   Export it (add to default export object if the file uses one, otherwise named export is fine — match existing pattern).

2. Create `src/frontend/src/pages/DeleteAccount.tsx`:
   - Authenticated page (use existing auth context / hook pattern — mirror an existing protected page like Settings or Profile).
   - Shows warning copy: "This action is permanent. Your account and all associated data will be deleted."
   - Input field: user must type `DELETE` exactly to enable the red "Delete my account" button.
   - onClick → call `authService.deleteAccount(token)` → on success: clear tokens from memory auth store (use existing logout helper if one exists, else manually clear), show toast "Your account has been deleted.", navigate to `/`.
   - On error: show error toast, keep user on page.

3. Wire route in `src/frontend/src/routes.tsx`: add `<Route path="/account/delete" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />` (use existing protected-route wrapper; inspect routes.tsx to match pattern).

4. Link to it from Settings/Profile page if one exists (quick scan `src/frontend/src/pages/` for Settings*.tsx or Profile*.tsx). If a settings page exists, add a "Delete account" link at the bottom pointing to `/account/delete`. If no settings page exists, leave the route accessible by direct URL — SignUp.tsx already promises the capability and PrivacyPolicy.tsx references erasure; direct URL is acceptable for launch.

**② Real og-image.png (1200×630)**
Create `scripts/gen-og-image.mjs` — Node script using `sharp` (already in deps? check `package.json`; if not install as dev dep) to generate a 1200×630 PNG with:
- Dark gradient background (e.g. #0a0e1a → #1a1f2e diagonal)
- Wordmark "ArthaBuild" in large white sans-serif
- Subtitle "Your Always-On ERP AI Agent" in muted light-grey
- Small footer text "artha.build" bottom-right

Implementation sketch (use SVG composed into sharp — no web fonts needed, sharp renders SVG text via librsvg fallback to system sans):
```js
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0e1a"/>
      <stop offset="1" stop-color="#1a1f2e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="80" y="300" font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#ffffff">ArthaBuild</text>
  <text x="80" y="370" font-family="Helvetica, Arial, sans-serif" font-size="36" fill="#9aa5b8">Your Always-On ERP AI Agent</text>
  <text x="1060" y="590" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#6b7488" text-anchor="end">artha.build</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('src/frontend/public/og-image.png');
```

Run: `node scripts/gen-og-image.mjs`. If sharp not installed, `npm i -D sharp` in the frontend workspace (check where `package.json` lives — likely `src/frontend/`; adjust cwd accordingly). Verify with `file src/frontend/public/og-image.png` → must report `PNG image data, 1200 x 630`. If any compromise made (e.g. font substitution looks off), note in summary.

**Do NOT** use an AI image generator — garbled text is worse than a clean placeholder.

**③ 404 page + catchall route**
1. Create `src/frontend/src/pages/NotFound.tsx`:
   ```tsx
   import { Link } from 'react-router-dom';
   export default function NotFound() {
     return (
       <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] text-white">
         <div className="text-center">
           <h1 className="text-6xl font-bold mb-4">404</h1>
           <p className="text-xl text-gray-400 mb-8">This page doesn't exist.</p>
           <Link to="/" className="text-blue-400 hover:text-blue-300 underline">Back to artha.build</Link>
         </div>
       </div>
     );
   }
   ```
   (Match existing Tailwind/styling conventions — peek at another page first.)

2. In `src/frontend/src/routes.tsx`, add `<Route path="*" element={<NotFound />} />` as the LAST route inside the router. Ensure it's after all other routes so React Router's match-order picks it only as fallback. HTTP status remains 200 (SPA limitation — acceptable per handoff).

**④ /security compliance addendum**
Edit `src/frontend/src/pages/SecurityPage.tsx`. Append a new `<section>` near the bottom titled "Compliance & Attestations". Use ONLY truthful/roadmap-framed content:

```tsx
<section className="py-12 border-t border-gray-800">
  <h2 className="text-3xl font-bold mb-6">Compliance & Attestations</h2>
  <dl className="space-y-6">
    <div>
      <dt className="font-semibold text-lg">SOC 2</dt>
      <dd className="text-gray-400">In progress — targeting Type II audit in H2 2026. We do not currently hold a SOC 2 attestation.</dd>
    </div>
    <div>
      <dt className="font-semibold text-lg">Subprocessors</dt>
      <dd className="text-gray-400">Because ArthaBuild is deployed in your own cloud (BYOC), your data never touches our infrastructure. Our limited subprocessors handle only operational functions: AWS (your dedicated cloud infra), Stripe (billing), Gmail/SMTP (transactional email). Current subprocessor list available on request.</dd>
    </div>
    <div>
      <dt className="font-semibold text-lg">Data Processing Agreement (DPA)</dt>
      <dd className="text-gray-400">Available on request. Email <a href="mailto:legal@artha.build" className="text-blue-400 underline">legal@artha.build</a> to receive our standard DPA template.</dd>
    </div>
    <div>
      <dt className="font-semibold text-lg">Penetration Testing</dt>
      <dd className="text-gray-400">Annual third-party penetration test scheduled. Results and attestation letters will be shared with enterprise customers under NDA.</dd>
    </div>
    <div>
      <dt className="font-semibold text-lg">GDPR & CCPA</dt>
      <dd className="text-gray-400">We support the data-subject rights laid out in our <a href="/privacy" className="text-blue-400 underline">Privacy Policy</a>, including access, rectification, and erasure. Account deletion (Art. 17) is available in-app at <a href="/account/delete" className="text-blue-400 underline">/account/delete</a>.</dd>
    </div>
  </dl>
</section>
```

Match the existing file's styling conventions (Tailwind classes, section structure) — adjust the classes above to match the rest of SecurityPage.tsx. **Critical: nothing aspirational-as-fact.** Do not claim "SOC 2 compliant" or "pen-tested" if those are future states.

**After all four items:**
- Build: `cd src/frontend && npm run build` (or whatever build command `package.json` defines — check first).
- Verify dist has the new assets: `ls -lh dist/og-image.png` → should be > 50KB (not the old 69-byte placeholder).
- Do NOT commit yet. Task 2 handles backend, Task 3 handles verify + commit.
  </action>
  <verify>
After implementing, run locally:
```
cd /Users/jeet/arthaBuild
# og-image sanity
file src/frontend/public/og-image.png
# expected: "PNG image data, 1200 x 630, ..."

# grep proof all 5 items wired
grep -n "deleteAccount" src/frontend/src/services/authService.ts
grep -n "DeleteAccount" src/frontend/src/routes.tsx
grep -n "path=\"\\*\"\\|path=\\*" src/frontend/src/routes.tsx
grep -n "Compliance & Attestations" src/frontend/src/pages/SecurityPage.tsx

# build succeeds
cd src/frontend && npm run build 2>&1 | tail -20
# expected: no errors, dist/ populated
ls -lh dist/og-image.png
# expected: size > 50KB
```
  </verify>
  <done>
- authService.ts exports/contains `deleteAccount` function
- DeleteAccount.tsx exists (40+ lines) with type-DELETE confirm gate
- NotFound.tsx exists and is registered as catchall in routes.tsx
- SecurityPage.tsx contains "Compliance & Attestations" with SOC 2 roadmap / subprocessors / DPA / pen-test / GDPR — all truthful
- og-image.png is 1200×630, size > 50KB
- `npm run build` succeeds with no errors; dist/ contains new og-image.png
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy frontend + activate backend Sentry on EC2</name>
  <files>
    /home/ubuntu/arthaBuild/.env  (EC2 44.194.34.223)
    (implicit) /home/ubuntu/arthaBuild/frontend/dist  (EC2 — tar deploy)
  </files>
  <action>
**Two deploy sub-steps on EC2 host `44.194.34.223`:**

**A. Deploy frontend dist** (delivers items ①②③④)

From local machine:
```
cd /Users/jeet/arthaBuild/src/frontend
tar czf /tmp/arthaBuild-dist-293.tar.gz -C dist .
scp -i ~/.ssh/techcloudpro-key-1764031372.pem /tmp/arthaBuild-dist-293.tar.gz ubuntu@44.194.34.223:/tmp/
```

SSH and swap the dist in place (nginx bind-mount is inode-bound — restart required):
```
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 <<'REMOTE'
cd /home/ubuntu/arthaBuild/src/frontend   # confirm this is the path; adjust if frontend lives elsewhere
# Verify current path via: docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml config | grep -A2 nginx
# The bind source is whatever nginx mounts. If different, use that instead.
mv dist dist.bak.$(date +%s)
mkdir dist
tar xzf /tmp/arthaBuild-dist-293.tar.gz -C dist
cd /home/ubuntu/arthaBuild
docker compose restart nginx   # MANDATORY — inode-bound mount
curl -sI http://localhost/og-image.png | grep -i content-length
REMOTE
```

If the nginx mount path differs from `src/frontend/dist`, first run `docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml config | grep -B1 -A3 nginx` to find the actual bind source and use that path.

**B. Activate backend Sentry** (item ⑤)

Prerequisite: obtain SENTRY_DSN. Check if TCP's Sentry org already has an arthaBuild project — ask user if unclear. If a fresh project is needed, user creates it at sentry.io (this is the one small `user_setup` dependency).

Once DSN is in hand:
```
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 <<REMOTE
# Verify not already set
grep -E "^SENTRY_DSN" /home/ubuntu/arthaBuild/.env || echo "Not set — appending"
# Append (do NOT overwrite other lines)
echo "" >> /home/ubuntu/arthaBuild/.env
echo "# Runtime error tracking — quick-293" >> /home/ubuntu/arthaBuild/.env
echo "SENTRY_DSN=<PASTE_DSN_HERE>" >> /home/ubuntu/arthaBuild/.env
# Sanity
grep "^SENTRY_DSN" /home/ubuntu/arthaBuild/.env
# Reload env — 'up -d' re-applies .env, 'restart' does NOT
cd /home/ubuntu/arthaBuild
docker compose up -d backend
# Confirm container picked it up
docker compose exec backend printenv SENTRY_DSN | head -c 40
REMOTE
```

**Do NOT** use `docker compose restart backend` — it won't re-read `.env`. Use `up -d backend`.
  </action>
  <verify>
```
# Frontend deploy proof (run from local)
curl -sI https://artha.build/og-image.png | grep -iE "content-length|content-type"
# expected: content-length > 50000, content-type: image/png

curl -s https://artha.build/og-image.png -o /tmp/og-new.png && file /tmp/og-new.png
# expected: "PNG image data, 1200 x 630"

curl -sI https://artha.build/does-not-exist-$(date +%s) | head -3
# HTTP status still 200 (SPA), but the body served is the new NotFound — verify body:
curl -s https://artha.build/does-not-exist-test | grep -o "404\\|This page doesn't exist" | head -1

curl -s https://artha.build/security | grep -o "Compliance & Attestations" | head -1
# expected: match

curl -s https://artha.build/account/delete | head -100 | grep -oE "DeleteAccount|Delete my account|Type DELETE" | head -1
# expected: match (if SPA root HTML contains route-aware content; else just verify landing HTML loads and JS bundle is new via Network tab on browser check)

# Sentry activation proof (run on EC2)
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \\
  'docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml exec backend printenv SENTRY_DSN | head -c 40'
# expected: prints first 40 chars of DSN (not empty)
```
  </verify>
  <done>
- https://artha.build/og-image.png returns a 1200×630 PNG > 50KB
- https://artha.build/security contains "Compliance & Attestations" in response HTML
- Backend container has `SENTRY_DSN` env var populated (verified via `printenv` inside container)
- nginx was restarted (not just `docker compose restart`) and serves new dist
- `.env` on EC2 now contains `SENTRY_DSN=` line (appended, no other lines broken)
  </done>
</task>

<task type="auto">
  <name>Task 3: E2E verify + commit (two repos)</name>
  <files>
    /Users/jeet/arthaBuild/ (code commit)
    /Users/jeet/doordash-p2p/.planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-SUMMARY.md (doc commit)
  </files>
  <action>
**A. End-to-end verification**

1. **Delete-account flow** (browser, manual):
   - Register a throwaway account using `@techcloudpro.com` email with a timestamp: `launch-test-$(date +%s)@techcloudpro.com` (company-email rule per memory — no `@gmail.com`).
   - Log in.
   - Navigate to https://artha.build/account/delete
   - Type `DELETE` in the confirm field → click delete button
   - Expected: toast "Your account has been deleted.", redirect to `/`
   - Try to call a protected endpoint with the old token (or refresh and observe auto-logout)
   - Expected: 401 / logged out — confirms JTI blacklist worked end-to-end

2. **og-image preview**:
   - Submit https://artha.build/ to https://www.opengraph.xyz/url/https%3A%2F%2Fartha.build%2F
   - Expected: real preview image renders (not the old 1×1 placeholder)

3. **404 page**:
   - Browser → https://artha.build/zzz-does-not-exist
   - Expected: "404 · This page doesn't exist" with link back to `/`

4. **Compliance section**:
   - Browser → https://artha.build/security → scroll to bottom
   - Expected: new section "Compliance & Attestations" with SOC 2 / Subprocessors / DPA / Pen-test / GDPR items, all roadmap-framed (no false claims)

5. **Sentry test event** (item ⑤ E2E):
   - While logged in, hit a deliberately-erroring endpoint. Options:
     - As a non-admin user, GET `/api/admin/users` → 403 with internal exception path, OR
     - Make a malformed request to any endpoint that will raise in a handler
   - Go to https://sentry.io → arthaBuild project → Issues
   - Expected: new event appears within ~30s. If not appearing, check backend logs on EC2: `docker compose logs backend | grep -i sentry` — `sentry_sdk.init` should have logged success at container start.

**B. Commit to arthaBuild standalone repo**

```
cd /Users/jeet/arthaBuild
git status --short
# Expected: shows ONLY the 7 files from Task 1 as modified/new (plus any pre-existing modifications — those stay UNSTAGED)

# Add ONLY the launch-foolproof files — NEVER `git add -A`
git add src/frontend/src/services/authService.ts
git add src/frontend/src/pages/DeleteAccount.tsx
git add src/frontend/src/pages/NotFound.tsx
git add src/frontend/src/pages/SecurityPage.tsx
git add src/frontend/src/routes.tsx
git add src/frontend/public/og-image.png
git add scripts/gen-og-image.mjs
# If sharp was added as a dev dep:
# git add src/frontend/package.json src/frontend/package-lock.json  (ONLY if modified for this task)

git status --short
# Verify: only the files above are staged; other pre-existing changes remain unstaged

git commit -m "feat(launch): foolproof 5 launch gaps before marketing pages

- Add /account/delete self-service erasure UI (authService.deleteAccount + DeleteAccount page)
- Real 1200x630 og-image.png replacing 1x1 placeholder (scripts/gen-og-image.mjs)
- NotFound.tsx + React Router catchall route (SPA 404)
- /security: Compliance & Attestations section (SOC 2 roadmap, subprocessors, DPA, pen-test, GDPR — truthful)
- Deploys on EC2: SENTRY_DSN activation documented in quick-293 summary

Evidence: ~/.claude/handoffs/2026-04-20-arthaBuild-launch-foolproof-5-fixes.md
Refs: quick-293"

git push origin main   # or whatever branch artha uses — check `git branch --show-current` first
```

**C. Write summary in dindin monorepo**

Create `/Users/jeet/doordash-p2p/.planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-SUMMARY.md` with:
- What shipped (5 items, truthful acceptance)
- Evidence commands run + their actual outputs (curl/ssh)
- Any compromises (e.g. og-image font substitution, settings-page integration deferred if no settings page existed)
- Links: arthaBuild commit SHA, Sentry first-event URL, opengraph.xyz preview
- Confirm: item ⑥ (CF SSL dashboard) still pending on user
- Confirm: all 5 "truths" from must_haves are satisfied with evidence

**D. Commit docs in dindin**

```
cd /Users/jeet/doordash-p2p
git add .planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-PLAN.md
git add .planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-SUMMARY.md
git commit -m "docs(quick-293): foolproof arthaBuild launch — 5 fixes plan + summary"
```

Do NOT push other unrelated pre-existing modifications in either repo.
  </action>
  <verify>
```
# arthaBuild commit is clean
cd /Users/jeet/arthaBuild
git log -1 --stat
# expected: shows 7 (±1 if package.json touched) files, all under src/frontend/ or scripts/

# dindin commit is clean
cd /Users/jeet/doordash-p2p
git log -1 --stat
# expected: shows only 293-PLAN.md + 293-SUMMARY.md

# Production proof — all 5 items live
curl -sI https://artha.build/og-image.png | grep -iE "content-length"          # > 50000
curl -s https://artha.build/zzz-$(date +%s) | grep -c "This page doesn't exist" # >= 1
curl -s https://artha.build/security | grep -c "Compliance & Attestations"     # >= 1
curl -s https://artha.build/account/delete -o /dev/null -w "%{http_code}"      # 200 (SPA route)
ssh -i ~/.ssh/techcloudpro-key-1764031372.pem ubuntu@44.194.34.223 \\
  'docker compose -f /home/ubuntu/arthaBuild/docker-compose.yml exec backend printenv SENTRY_DSN | wc -c'
# expected: > 0
```
  </verify>
  <done>
- Delete-account E2E flow executed end-to-end (register → delete → token invalidated)
- opengraph.xyz shows real preview image
- Sentry received a test event (URL captured in summary)
- arthaBuild commit contains ONLY the 7 intended files (plus ≤1 package manifest), no unrelated pre-existing modifications staged
- dindin commit contains ONLY the 2 doc files
- 293-SUMMARY.md written with evidence + any compromises noted
- Item ⑥ (CF SSL dashboard) explicitly flagged as USER-ONLY outstanding task in summary
  </done>
</task>

</tasks>

<verification>
**All 5 must-haves satisfied:**

| # | Truth | Proof |
|---|-------|-------|
| ① | Delete-account UI works E2E | Register → delete → token 401 (live account on prod) |
| ② | Real og-image | `curl -sI https://artha.build/og-image.png` content-length > 50000; opengraph.xyz preview |
| ③ | 404 page | `curl -s https://artha.build/zzz-...` body contains "This page doesn't exist" |
| ④ | Compliance section | `curl -s https://artha.build/security` contains "Compliance & Attestations" |
| ⑤ | Sentry active | `docker compose exec backend printenv SENTRY_DSN` non-empty + test event in Sentry UI |

**Rules honored:**
- ✅ Google OAuth button untouched (item not in files_modified)
- ✅ Item ⑥ CF SSL left to user
- ✅ arthaBuild repo: explicit `git add`, no `-A`
- ✅ nginx `restart` after dist swap (not just backend `up -d`)
- ✅ Backend `up -d` (not `restart`) to reload `.env`
- ✅ Company email (`@techcloudpro.com`) used for smoke test, not `@gmail.com`
- ✅ Compliance section is roadmap-framed, no aspirational-as-fact claims
- ✅ og-image is real 1200×630, not AI-garbled text
</verification>

<success_criteria>
- artha.build publicly serves: real og-image, 404 page for unknown URLs, /security with compliance section, /account/delete with working E2E erasure
- Backend in prod reports errors to Sentry (test event captured in Sentry UI)
- arthaBuild code committed (single feat commit, 7 files) and pushed
- dindin docs committed (PLAN + SUMMARY)
- Only outstanding item: ⑥ CF SSL=Full(Strict) — user handles outside this plan
</success_criteria>

<output>
After completion, commit to dindin:
- /Users/jeet/doordash-p2p/.planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-PLAN.md (this file)
- /Users/jeet/doordash-p2p/.planning/quick/293-foolproof-arthabuild-launch-delete-accou/293-SUMMARY.md (written in Task 3)
</output>
