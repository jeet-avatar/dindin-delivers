---
phase: quick-321
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/src/pages/AIConsulting.tsx
autonomous: true
requirements:
  - QUICK-321-01
must_haves:
  truths:
    - "Visitor on https://techcloudpro.com/services/ai sees an ArthaBuild CTA in the hero section, visually mirroring the existing AI Playground CTA (purple-indigo gradient pill + corner Free·Live-style badge)."
    - "ArthaBuild CTA links to /arthabuild on the same domain (relative href)."
    - "Production HTML at /services/ai contains the substring 'arthabuild' (case-insensitive) at least once after deploy."
    - "ArthaBuild CTA copy follows TCP positioning rules: leads with the 'since 2015 / 1,000+ clients' framing and uses a soft 'Talk to us'-style label — does NOT say 'Start trial' or 'Free trial' and does NOT list ArthaBuild as a separate priced product."
    - "The two unrelated pre-existing dirty files (src/data/blogPosts.ts, src/data/team.ts) and the untracked seo/ directory are NOT touched, NOT staged, and NOT committed by this task."
  artifacts:
    - path: "/Users/jeet/techcloudpro/src/pages/AIConsulting.tsx"
      provides: "Hero section with ArthaBuild CTA pill rendered next to the existing AI Playground CTA"
      contains: "/arthabuild"
  key_links:
    - from: "/Users/jeet/techcloudpro/src/pages/AIConsulting.tsx"
      to: "/arthabuild"
      via: "<a href=\"/arthabuild\"> anchor inside hero CTA flex row"
      pattern: "href=\"/arthabuild\""
    - from: "Production /services/ai HTML"
      to: "/arthabuild"
      via: "Vite build → rsync to Hostinger public_html"
      pattern: "arthabuild"
---

<objective>
Add an ArthaBuild marketing CTA to the TechCloudPro `/services/ai` hero, visually mirroring the existing AI Playground CTA pattern (purple-indigo gradient pill + small Free·Live-style corner badge), then build and deploy to production via the existing rsync-to-Hostinger pipeline.

Purpose: Cross-promote the in-house ArthaBuild AI to TCP visitors landing on the AI consulting page, using a styled CTA the visitor's eye is already trained on (the playground CTA right next to it).

Output:
- Updated `src/pages/AIConsulting.tsx` with the new CTA inserted into the hero CTA row.
- Vite production build (`npm run build` → `dist/`).
- Live deployment to `techcloudpro.com/services/ai` via rsync to Hostinger.
- Atomic commit on the standalone TCP repo at `/Users/jeet/techcloudpro` (NOT in dindin).
</objective>

<context>
- Working repo: `/Users/jeet/techcloudpro` (standalone, NOT the dindin monorepo). All `cd` commands use this absolute path.
- Target page: `src/pages/AIConsulting.tsx` (route `/services/ai`, confirmed in `src/App.tsx:50`).
- ArthaBuild landing: `src/pages/ArthaBuildLanding.tsx`, served at `/arthabuild` (confirmed in `src/App.tsx:58`).
- Existing playground CTA to mirror lives at `src/pages/AIConsulting.tsx:77-87`. Exact pattern (DO NOT modify the playground CTA — copy its shape):

  ```tsx
  <a
    href="/tools/ai-playground"
    className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-extrabold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-indigo-500/30"
  >
    <span className="text-base">🏗️</span>
    Try the AI Playground — design yours in 60s
    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-yellow-400 text-slate-900 shadow-md" style={{ animation: 'pulse 2.4s ease-in-out infinite' }}>
      Free · Live
    </span>
  </a>
  ```

- Hero CTA row container: `<div className="flex flex-wrap gap-3 items-center">` at line 73, currently holds: `<Button>Get Free AI Assessment</Button>`, the playground `<a>`, and `<Button variant="ghost">See Capabilities</Button>`. The new ArthaBuild CTA must be inserted INSIDE this same flex row so it wraps naturally on small screens.

- Positioning rules (from MEMORY.md "ArthaBuild TCP positioning PERMANENT"):
  - Lead with the "since 2015 / 1,000+ clients built this AI" framing.
  - CTA = "Talk to us" / "See it" / "Try ArthaBuild" — NEVER "Start trial" / "Free trial" / "Sign up free".
  - Do NOT show pricing on the CTA.
  - Do NOT frame ArthaBuild as a separate product line — it's TCP's own AI built on TCP's experience.

- Deploy path (proven, do not re-derive):
  ```
  rsync -avz \
    --exclude='samples/' --exclude='tcp-analytics/' --exclude='api/' \
    --exclude='launchos/' --exclude='leads/' --exclude='.htaccess' \
    -e "ssh -p 65002 -o StrictHostKeyChecking=accept-new" \
    /Users/jeet/techcloudpro/dist/ \
    u350621741@147.93.101.51:domains/techcloudpro.com/public_html/
  ```

- Pre-existing dirty files in `/Users/jeet/techcloudpro` that are OUT OF SCOPE for this task and MUST NOT be staged or committed by this task:
  - `src/data/blogPosts.ts` (modified, unrelated)
  - `src/data/team.ts` (modified, unrelated)
  - `seo/` (untracked directory, unrelated)
  In-scope (already-staged work from prior session that should be left as-is and NOT re-touched here):
  - `src/data/navigation.ts` (M)
  - `public/sitemap.xml` (M)
  Use `git add <specific-file>` only — NEVER `git add .` or `git add -A`.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add ArthaBuild CTA pill to AIConsulting hero, build, deploy, verify production</name>
  <files>/Users/jeet/techcloudpro/src/pages/AIConsulting.tsx</files>
  <action>
1. Read `/Users/jeet/techcloudpro/src/pages/AIConsulting.tsx` (the full file) so the Edit tool sees current state.

2. In the hero CTA flex row (currently lines ~73-91, the `<div className="flex flex-wrap gap-3 items-center">` block), insert a NEW ArthaBuild CTA `<a>` element IMMEDIATELY AFTER the existing AI Playground `<a>` (after its closing `</a>` on line 87) and BEFORE the `<Button href="#capabilities" variant="ghost" size="lg">See Capabilities</Button>`. Do not alter the playground CTA, the assessment Button, or the See Capabilities Button.

3. The new element must follow the EXACT same component shape as the playground CTA — same Tailwind classes for the wrapper anchor, same icon-text-arrow-badge structure — only the content changes:

   ```tsx
   <a
     href="/arthabuild"
     className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-extrabold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-indigo-500/30"
   >
     <span className="text-base">🤖</span>
     See ArthaBuild — the AI built on 1,000+ client projects since 2015
     <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
     <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-900 shadow-md" style={{ animation: 'pulse 2.4s ease-in-out infinite' }}>
       Live · Ours
     </span>
   </a>
   ```

   Why these specific differences from the playground CTA:
   - href = `/arthabuild` (the existing in-app route, confirmed `src/App.tsx:58`).
   - icon = 🤖 (playground uses 🏗️; need a different glyph so the two CTAs are visually distinguishable when they sit side-by-side).
   - copy = "See ArthaBuild — the AI built on 1,000+ client projects since 2015" — leads with the mandatory positioning ("since 2015 / 1,000+ clients") and uses "See" not "Start trial" / "Sign up", per MEMORY.md `feedback_arthaBuild_positioning.md`. Does NOT show pricing.
   - badge = "Live · Ours" with `bg-emerald-400` background — playground uses yellow "Free · Live"; using emerald keeps the two CTAs visually distinct, and "Ours" reinforces the positioning that ArthaBuild is TCP's own AI, not a third-party tool TCP resells. The pulse animation matches the playground for visual parity.

4. Do NOT add any new imports. `ArrowRight` is already imported from lucide-react (used by the playground CTA on the same page) — verify by grepping `from 'lucide-react'` near the top of `AIConsulting.tsx` before editing; if the existing import line already includes `ArrowRight`, you're done.

5. Build:
   ```
   cd /Users/jeet/techcloudpro && npm run build 2>&1 | tail -30
   ```
   The build must complete with no TypeScript errors. If the build fails, fix the syntax in `AIConsulting.tsx` and rebuild — do NOT proceed to deploy.

6. Smoke-test locally that the new string is in the build output:
   ```
   grep -rc "arthabuild" /Users/jeet/techcloudpro/dist/assets/ 2>/dev/null
   ```
   Must return at least 1 (the JS bundle should contain the lowercase `/arthabuild` href). If 0, rebuild — Vite may have a stale cache.

7. Deploy via the proven rsync command (do not re-derive):
   ```
   rsync -avz \
     --exclude='samples/' --exclude='tcp-analytics/' --exclude='api/' \
     --exclude='launchos/' --exclude='leads/' --exclude='.htaccess' \
     -e "ssh -p 65002 -o StrictHostKeyChecking=accept-new" \
     /Users/jeet/techcloudpro/dist/ \
     u350621741@147.93.101.51:domains/techcloudpro.com/public_html/
   ```

8. Wait ~5 seconds for any CDN/cache propagation, then verify production:
   ```
   curl -s -A "Mozilla/5.0" -H "Cache-Control: no-cache" "https://techcloudpro.com/services/ai/?cb=$(date +%s)" | grep -ic "arthabuild"
   ```
   Note: TCP is a Vite SPA, so the route HTML at `/services/ai` is served by the SPA fallback — the substring `arthabuild` lives in the JS bundle, not the index.html. Adjust the verify to also fetch the bundle if the page-level grep returns 0:
   ```
   # Find the latest bundle path from the live index.html
   curl -s "https://techcloudpro.com/?cb=$(date +%s)" | grep -oE "/assets/index-[^\"]+\.js" | head -1
   # then curl that path and grep for arthabuild
   ```
   At least one of the two greps must return ≥ 1.

9. Commit on the TCP standalone repo (NOT dindin). Stage ONLY the file this task touched:
   ```
   cd /Users/jeet/techcloudpro
   git add src/pages/AIConsulting.tsx
   git status --short
   # Sanity: blogPosts.ts, team.ts, seo/ MUST still appear unstaged in `git status` (they were never staged here)
   git commit -m "feat(ai-page): add ArthaBuild CTA pill to /services/ai hero (mirrors playground CTA pattern)"
   git push origin main
   ```
   If `git push` requires the user's credentials and fails, leave the commit local and surface the failure — do NOT force or rewrite history.

10. Final state check: `git log --oneline -3` should show the new commit at HEAD on `/Users/jeet/techcloudpro`.
  </action>
  <verify>
- `cd /Users/jeet/techcloudpro && npm run build` exits 0 with no TypeScript errors.
- `grep -rc "arthabuild" /Users/jeet/techcloudpro/dist/assets/` returns ≥ 1.
- `grep -n "/arthabuild" /Users/jeet/techcloudpro/src/pages/AIConsulting.tsx` shows the new href on a line inside the hero `<section>` (between original lines 61 and 94).
- After rsync deploy, EITHER `curl -s -A "Mozilla/5.0" -H "Cache-Control: no-cache" "https://techcloudpro.com/services/ai/?cb=$(date +%s)" | grep -ic "arthabuild"` returns ≥ 1, OR the latest `/assets/index-*.js` bundle from the live site contains `/arthabuild` when grepped (fallback for SPA where the route lives in JS).
- `git status --short` in `/Users/jeet/techcloudpro` shows `src/data/blogPosts.ts`, `src/data/team.ts`, and `seo/` STILL unstaged/untracked (proof we did not accidentally stage out-of-scope files).
- `git log --oneline -1` in `/Users/jeet/techcloudpro` shows a commit subject containing both "ArthaBuild" and "/services/ai" (or similar — must mention the page).
  </verify>
  <done>
- `AIConsulting.tsx` has exactly one new `<a href="/arthabuild">` inside the hero CTA flex row, styled with the same gradient/badge pattern as the playground CTA.
- Production HTML or JS bundle at https://techcloudpro.com/services/ai contains the string `arthabuild`.
- Standalone TCP repo at `/Users/jeet/techcloudpro` has a new atomic commit on `main` for this single-file change, pushed to origin if push succeeds.
- The 3 unrelated dirty paths (`blogPosts.ts`, `team.ts`, `seo/`) remain untouched.
  </done>
</task>

</tasks>

<verification>
End-to-end proof checklist (paste output as evidence per CLAUDE.md verification protocol):

1. **Source proof**:
   `grep -n "/arthabuild" /Users/jeet/techcloudpro/src/pages/AIConsulting.tsx` → shows new href line.

2. **Build proof**:
   `cd /Users/jeet/techcloudpro && npm run build` → exits 0.
   `grep -rc "/arthabuild" /Users/jeet/techcloudpro/dist/assets/` → ≥ 1.

3. **Deploy proof**:
   rsync output shows new `assets/index-*.js` bundle uploaded.

4. **Live proof**:
   `curl -s -A "Mozilla/5.0" -H "Cache-Control: no-cache" "https://techcloudpro.com/services/ai/?cb=$(date +%s)" | grep -ic "arthabuild"` ≥ 1
   OR the same grep against the live JS bundle URL succeeds.

5. **Scope-discipline proof**:
   `cd /Users/jeet/techcloudpro && git status --short` → `blogPosts.ts`, `team.ts`, `seo/` all still appear in the unstaged/untracked list (we never staged them).

6. **Commit proof**:
   `cd /Users/jeet/techcloudpro && git log --oneline -1` → shows new commit.
</verification>

<success_criteria>
- ArthaBuild CTA pill renders in the hero of `/services/ai` with the same visual pattern as the existing AI Playground CTA.
- Production verification curl returns ≥ 1 match for "arthabuild" against either the page HTML or the live JS bundle.
- Standalone TCP repo at `/Users/jeet/techcloudpro` has exactly one new atomic commit for `src/pages/AIConsulting.tsx` only.
- Out-of-scope dirty files (`blogPosts.ts`, `team.ts`, `seo/`) are not staged, not modified, and not committed by this task.
- Copy follows TCP positioning rules (since-2015 / 1,000+ clients framing, no "trial", no pricing).
</success_criteria>

<output>
After completion, append a one-liner to `.planning/quick/321-add-arthabuild-section-cta-to-tcp-servic/321-SUMMARY.md` (in the dindin repo) capturing:
- Commit SHA on `/Users/jeet/techcloudpro` for `AIConsulting.tsx`.
- Live verify curl exit value (count of "arthabuild" hits).
- Bundle filename deployed (e.g., `assets/index-XXXX.js`).
</output>
