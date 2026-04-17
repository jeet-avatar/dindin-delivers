---
phase: quick-291
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/techcloudpro/public/tools/ai-playground.html
  - apps/techcloudpro/public/tools/rag-study-guide.html
  - apps/techcloudpro/src/pages/AIPlayground.tsx
  - apps/techcloudpro/src/App.tsx
  - apps/techcloudpro/src/data/navigation.ts
autonomous: true
requirements: [Q291]
must_haves:
  truths:
    - "User can navigate to /tools/ai-playground via nav link"
    - "The interactive playground loads and is fully functional inside the page"
    - "Download Architecture PNG button exports a branded image of the playground"
    - "Download Study Guide button downloads rag-study-guide.html as a file"
    - "Consulting CTA panel is visible below the playground with a Book a Call link to /contact"
  artifacts:
    - path: "apps/techcloudpro/public/tools/ai-playground.html"
      provides: "Static playground HTML with Download PNG button injected"
    - path: "apps/techcloudpro/public/tools/rag-study-guide.html"
      provides: "Static study guide served as downloadable asset"
    - path: "apps/techcloudpro/src/pages/AIPlayground.tsx"
      provides: "React wrapper page with iframe, download buttons, consulting CTA"
    - path: "apps/techcloudpro/src/App.tsx"
      provides: "Route /tools/ai-playground registered"
    - path: "apps/techcloudpro/src/data/navigation.ts"
      provides: "Tools nav link added"
  key_links:
    - from: "AIPlayground.tsx"
      to: "/tools/ai-playground.html"
      via: "iframe src pointing to public static asset"
    - from: "AIPlayground.tsx"
      to: "/tools/rag-study-guide.html"
      via: "anchor with download attribute"
    - from: "AIPlayground.tsx"
      to: "/contact"
      via: "Book a Call button href"
---

<objective>
Add AI Architecture Playground as a free lead-gen tool at /tools/ai-playground on TechCloudPro. The playground HTML is copied to the public folder and embedded via iframe. The React wrapper adds a Download PNG button (using html2canvas on the iframe content), a Study Guide download link, and a consulting CTA panel with a Book a Call button pointing to /contact.

Purpose: Keep users engaged on site with an interactive tool, send them away with branded PNG of their work, convert them to consulting clients.
Output: /tools/ai-playground page live, fully navigable, zero auth friction.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/techcloudpro/src/App.tsx
@apps/techcloudpro/src/data/navigation.ts
@apps/techcloudpro/src/pages/LaunchOS.tsx
@docs/ai-arch-playground.html
@docs/rag-study-guide.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Copy static assets to public/tools/ and inject Download PNG into playground HTML</name>
  <files>
    apps/techcloudpro/public/tools/ai-playground.html
    apps/techcloudpro/public/tools/rag-study-guide.html
  </files>
  <action>
    1. Create the directory `apps/techcloudpro/public/tools/` if it does not exist.

    2. Copy `docs/ai-arch-playground.html` → `apps/techcloudpro/public/tools/ai-playground.html`.

    3. Copy `docs/rag-study-guide.html` → `apps/techcloudpro/public/tools/rag-study-guide.html`.

    4. In `apps/techcloudpro/public/tools/ai-playground.html`, make the following targeted edits:

       a. In the `<head>`, add html2canvas CDN after the Google Fonts link:
          ```html
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          ```

       b. In the header `.hdr-btns` div (around line 182, after the existing Clear button), add a Download PNG button:
          ```html
          <button class="hbtn primary" id="btn-download-png">📥 Download PNG</button>
          ```

       c. At the bottom of the `<script>` block (just before the closing `</script>` tag), add the download handler:
          ```javascript
          // ── Download PNG ──
          document.getElementById('btn-download-png').addEventListener('click', async () => {
            const btn = document.getElementById('btn-download-png');
            btn.textContent = '⏳ Generating…';
            btn.disabled = true;
            try {
              const target = document.querySelector('.app') || document.body;
              const canvas = await html2canvas(target, { backgroundColor: '#0d0f1a', scale: 2, useCORS: true, logging: false });
              // Add branding footer
              const branded = document.createElement('canvas');
              branded.width = canvas.width;
              branded.height = canvas.height + 48;
              const ctx = branded.getContext('2d');
              ctx.drawImage(canvas, 0, 0);
              ctx.fillStyle = '#0d0f1a';
              ctx.fillRect(0, canvas.height, canvas.width, 48);
              ctx.fillStyle = '#6366f1';
              ctx.font = 'bold 22px Inter, system-ui, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Built with TechCloudPro AI Tools  ·  techcloudpro.com', canvas.width / 2, canvas.height + 32);
              const link = document.createElement('a');
              link.download = 'ai-architecture-techcloudpro.png';
              link.href = branded.toDataURL('image/png');
              link.click();
            } catch(e) {
              alert('Download failed: ' + e.message);
            } finally {
              btn.textContent = '📥 Download PNG';
              btn.disabled = false;
            }
          });
          ```

       d. Fix the existing Study Guide link in the header to use the correct relative path:
          Change `href="rag-study-guide.html"` → `href="/tools/rag-study-guide.html"` (absolute path so it works when served from any depth).
  </action>
  <verify>
    - `ls apps/techcloudpro/public/tools/` shows both `ai-playground.html` and `rag-study-guide.html`
    - `grep -n "btn-download-png" apps/techcloudpro/public/tools/ai-playground.html` shows the button and handler
    - `grep -n "html2canvas" apps/techcloudpro/public/tools/ai-playground.html` shows CDN script tag
  </verify>
  <done>Both HTML files exist in public/tools/. ai-playground.html has html2canvas CDN loaded, a Download PNG button in the header, and the JS handler that captures the .app div, adds a branding footer, and triggers a PNG download.</done>
</task>

<task type="auto">
  <name>Task 2: Create AIPlayground.tsx React wrapper page and wire routes + nav</name>
  <files>
    apps/techcloudpro/src/pages/AIPlayground.tsx
    apps/techcloudpro/src/App.tsx
    apps/techcloudpro/src/data/navigation.ts
  </files>
  <action>
    1. Create `apps/techcloudpro/src/pages/AIPlayground.tsx`.

       The page layout follows the same inline-style color token pattern used in LaunchOS.tsx (dark card backgrounds, orange accent). No Tailwind arbitrary values — use standard Tailwind classes or inline styles.

       Structure:
       - Full-width page with `min-h-screen` background matching site dark theme (`#060609`)
       - `<SEO>` component with title "AI Architecture Playground — Free Tool | TechCloudPro" and description "Design, score, and export your AI architecture for free. Interactive drag-and-drop playground powered by TechCloudPro."
       - Hero strip above iframe (thin, ~60px): "AI Architecture Playground" heading + "Free Tool · No signup required" badge
       - Main content: `<iframe>` embedded at full width, height `calc(100vh - 180px)`, min-height `600px`, src="/tools/ai-playground.html", title="AI Architecture Playground", style `border:none; border-radius:12px; display:block`
       - Below the iframe, two rows:
         - Row 1 (button row, centered): "Download Study Guide" as an `<a>` tag with `href="/tools/rag-study-guide.html"` and `download="TechCloudPro-AI-Study-Guide.html"` attribute — styled as a secondary button (border, no fill)
         - Row 2 (CTA panel, full width card): Consulting CTA with heading "Need help building this?", subtext "Our AI architects can design and deploy your AI system — from architecture to production in weeks.", and a "Book a Free Call" button linking to `/contact`. Use orange accent (#FF6B35) for the button. Card background `#0a0d16`, border `rgba(255,255,255,0.07)`, padding `2rem`, border-radius `12px`.

       NOTE: The Download Architecture PNG button is already injected into the playground HTML itself (Task 1). The React page does NOT need a second download button — avoid duplication.

       Full component code:
       ```tsx
       import { SEO } from '../components/ui'
       import { Link } from 'react-router'

       const C = {
         bg: '#060609',
         bgCard: '#0a0d16',
         border: 'rgba(255,255,255,0.07)',
         orange: '#FF6B35',
         text: '#F1F5F9',
         textDim: '#94A3B8',
         textMuted: '#64748B',
       }

       export default function AIPlayground() {
         return (
           <div style={{ background: C.bg, minHeight: '100vh', paddingTop: '80px' }}>
             <SEO
               title="AI Architecture Playground — Free Tool | TechCloudPro"
               description="Design, score, and export your AI architecture for free. Interactive drag-and-drop playground powered by TechCloudPro."
               canonical="https://techcloudpro.com/tools/ai-playground"
             />

             {/* Hero strip */}
             <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem 0.75rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                 <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.text, margin: 0 }}>
                   AI Architecture Playground
                 </h1>
                 <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: '100px', background: 'rgba(255,107,53,0.12)', color: C.orange, border: '1px solid rgba(255,107,53,0.25)' }}>
                   Free Tool · No signup required
                 </span>
               </div>
               <p style={{ fontSize: '0.82rem', color: C.textMuted, marginTop: '0.25rem' }}>
                 Drag components, wire them together, score your architecture, and download a branded PNG of your design.
               </p>
             </div>

             {/* Iframe */}
             <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
               <iframe
                 src="/tools/ai-playground.html"
                 title="AI Architecture Playground"
                 style={{
                   width: '100%',
                   height: 'calc(100vh - 200px)',
                   minHeight: '600px',
                   border: 'none',
                   borderRadius: '12px',
                   display: 'block',
                 }}
               />
             </div>

             {/* Below iframe: Study Guide download + CTA */}
             <div style={{ maxWidth: '1400px', margin: '1.5rem auto 3rem', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

               {/* Study guide download button */}
               <div style={{ textAlign: 'center' }}>
                 <a
                   href="/tools/rag-study-guide.html"
                   download="TechCloudPro-AI-Study-Guide.html"
                   style={{
                     display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                     padding: '0.6rem 1.4rem', borderRadius: '8px',
                     border: `1px solid ${C.border}`, color: C.textDim,
                     fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none',
                     transition: 'border-color 0.15s, color 0.15s',
                   }}
                   onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLAnchorElement).style.color = C.text; }}
                   onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border; (e.currentTarget as HTMLAnchorElement).style.color = C.textDim; }}
                 >
                   📖 Download Study Guide
                 </a>
               </div>

               {/* Consulting CTA card */}
               <div style={{
                 background: C.bgCard,
                 border: `1px solid ${C.border}`,
                 borderRadius: '12px',
                 padding: '2rem',
                 display: 'flex',
                 flexWrap: 'wrap',
                 alignItems: 'center',
                 justifyContent: 'space-between',
                 gap: '1.5rem',
               }}>
                 <div>
                   <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, margin: '0 0 0.5rem' }}>
                     Need help building this?
                   </h2>
                   <p style={{ fontSize: '0.875rem', color: C.textDim, margin: 0, maxWidth: '520px', lineHeight: 1.6 }}>
                     Our AI architects can design and deploy your AI system — from architecture diagram to production in weeks. We've shipped RAG pipelines, agentic workflows, and private LLMs for enterprise clients across North America.
                   </p>
                 </div>
                 <Link
                   to="/contact"
                   style={{
                     display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                     padding: '0.75rem 1.75rem', borderRadius: '8px',
                     background: C.orange, color: '#fff',
                     fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
                     whiteSpace: 'nowrap', flexShrink: 0,
                   }}
                 >
                   Book a Free Call →
                 </Link>
               </div>

             </div>
           </div>
         )
       }
       ```

    2. In `apps/techcloudpro/src/App.tsx`:
       - Add lazy import: `const AIPlayground = lazy(() => import('./pages/AIPlayground'))`
       - Add route inside `<Routes>`: `<Route path="/tools/ai-playground" element={<AIPlayground />} />`
       - Place the route before the `<Route path="*" />` catch-all.

    3. In `apps/techcloudpro/src/data/navigation.ts`:
       - Add to `mainNav` array (between Blog and Careers): `{ label: 'Tools', href: '/tools/ai-playground' }`
       - Add to `footerSections` under the Resources section: `{ label: 'AI Playground', href: '/tools/ai-playground' }`
  </action>
  <verify>
    - `grep -n "AIPlayground\|ai-playground" apps/techcloudpro/src/App.tsx` shows lazy import and route
    - `grep -n "Tools\|ai-playground" apps/techcloudpro/src/data/navigation.ts` shows nav entry
    - `ls apps/techcloudpro/src/pages/AIPlayground.tsx` confirms file exists
    - `cd apps/techcloudpro && npm run build` completes with no TypeScript errors
  </verify>
  <done>AIPlayground.tsx renders correctly, /tools/ai-playground is routed, "Tools" appears in nav, npm run build passes with zero errors. The page shows the playground iframe, a Study Guide download link, and the Consulting CTA card.</done>
</task>

</tasks>

<verification>
After both tasks complete:
1. Run `cd apps/techcloudpro && npm run build` — must succeed with no errors
2. Run `npm run preview` (or `npm run dev`) and visit http://localhost:4173/tools/ai-playground (or :5173)
3. Verify: "Tools" link appears in navbar → clicks to /tools/ai-playground
4. Verify: Playground iframe loads and is interactive (drag a use case, add components)
5. Verify: Click "Download PNG" button inside the playground header → file downloads as `ai-architecture-techcloudpro.png`
6. Verify: Click "Download Study Guide" below the iframe → `TechCloudPro-AI-Study-Guide.html` downloads
7. Verify: "Book a Free Call" button links to /contact and the CTA card is visible
</verification>

<success_criteria>
- /tools/ai-playground route returns 200 (static build)
- Playground is fully interactive via iframe (no console errors from CORS — same origin)
- Download PNG button captures and downloads a branded PNG
- Study Guide download link delivers the HTML file
- Consulting CTA card is visible below the iframe with Book a Free Call → /contact
- npm run build exits 0 with no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/291-build-ai-architecture-playground-as-free/291-SUMMARY.md` with what was built, files changed, and any decisions made.
</output>
