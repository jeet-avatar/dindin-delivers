# ArthaBuild Marketing — AEO Backfill + 20 New Grounded Posts — Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (Claude Code has subagents) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring artha.build/blog to AEO/E-E-A-T parity with TechCloudPro: add answer + FAQs + citations + reviewedBy + Person schema to all 84 existing posts, plus ship exactly 20 new strategically-grounded posts.

**Architecture:** Schema-parity additive edits in a frontend-only React/Vite repo. Zero backend changes. Quality gates enforced via npm scripts + a git pre-commit hook. All content grounded in Oracle docs / DataForSEO / real community threads. Nothing invented.

**Tech Stack:** TypeScript, React, Vite, React Router, JSON-LD schemas, Node.js scripts, DataForSEO MCP, Bash, SSH/SCP for EC2 deploy.

**Spec:** `/Users/jeet/doordash-p2p/docs/superpowers/specs/2026-04-22-artha-marketing-aeo-eeat-design.md` (rev 3, spec-review passed).

**Repo layout critical reminder:**
- **Code changes:** `/Users/jeet/arthaBuild/` (standalone repo, `origin` is `github.com/jeet-avatar/arthabuild`)
- **Plan docs:** `/Users/jeet/doordash-p2p/.planning/` (dindin repo)
- **In arthaBuild repo:** always `git add <explicit-paths>` — NEVER `git add -A` (per memory `arthaBuild-standalone-repo.md`)

**User approval gates (3 in the middle of execution):**
1. After Chunk 1 (P0): build green + all 3 LinkedIn URLs 200 + Person schema valid
2. After Chunk 2 (P1): user approves 20-topic proposal before any post is written
3. After each of batches 1-9 in P2 and batches 1-2 in P3: spot-check gate

---

## Chunk 1 — Phase 0: Schema + team + bio pages + quality-gate tooling

**What gets built in this chunk:** The plumbing. Schema fields, team data, 3 bio pages, updated BlogPost renderer, 4 npm scripts for quality gates, a git pre-commit hook for Gate B. Every subsequent chunk depends on this.

**Files:**
- **Create:** `/Users/jeet/arthaBuild/src/frontend/src/data/team.ts`
- **Create:** `/Users/jeet/arthaBuild/src/frontend/src/pages/AuthorPage.tsx`
- **Create:** `/Users/jeet/arthaBuild/src/frontend/src/pages/AuthorIndex.tsx`
- **Create:** `/Users/jeet/arthaBuild/public/about/` (directory; `.gitkeep` file)
- **Create:** `/Users/jeet/arthaBuild/scripts/verify-blog-citations.mjs`
- **Create:** `/Users/jeet/arthaBuild/scripts/lint-blog-answer.mjs`
- **Create:** `/Users/jeet/arthaBuild/scripts/validate-blog-schemas.mjs`
- **Create:** `/Users/jeet/arthaBuild/scripts/recheck-blog-citations.mjs`
- **Create:** `/Users/jeet/arthaBuild/scripts/check-provenance-delta.sh`
- **Create:** `/Users/jeet/arthaBuild/.planning/marketing/faq-provenance.md` (empty skeleton)
- **Create:** `/Users/jeet/arthaBuild/.planning/marketing/DRIFT_LOG.md` (empty skeleton)
- **Create:** `/Users/jeet/arthaBuild/scripts/install-pre-commit-hook.sh`
- **Modify:** `/Users/jeet/arthaBuild/src/frontend/src/data/blog.ts` — add 7 optional fields
- **Modify:** `/Users/jeet/arthaBuild/src/frontend/src/routes.tsx` — register `/about` + `/about/:slug`
- **Modify:** `/Users/jeet/arthaBuild/src/frontend/src/pages/BlogPost.tsx` — render author/reviewer/answer/FAQs, emit JSON-LD
- **Modify:** `/Users/jeet/arthaBuild/package.json` — add `scripts` entries for the 4 quality-gate scripts
- **Test:** Vitest unit tests per-script (arthaBuild already uses Vitest per `src/test/` dir)

---

### Task 1.1 — Extend the `BlogPost` TypeScript interface

**Pre-flight (once before Task 1.1):** Verify `quick-298` is free — `ls /Users/jeet/doordash-p2p/.planning/quick/ | grep -E "^298-"` should output nothing. ✅ Verified at plan-write time.

**Files:**
- Modify: `/Users/jeet/arthaBuild/src/frontend/src/data/blog.ts` (append optional fields to the interface)
- Test: `/Users/jeet/arthaBuild/src/frontend/src/test/blog-post-type.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `/Users/jeet/arthaBuild/src/frontend/src/test/blog-post-type.test.ts`:

```ts
// Compile-time assertion: BlogPost has the AEO fields.
// This test passes if the file type-checks; fails if any field is missing.
import { describe, it, expect } from 'vitest'
import { BlogPost } from '../data/blog'

describe('BlogPost AEO schema parity (quick-298)', () => {
  it('accepts an object populated with all AEO fields', () => {
    const p: BlogPost = {
      slug: 't',
      title: 't',
      description: 't',
      category: 'netsuite',
      publishedAt: '2026-04-22',
      readTime: '1 min read',
      tags: [],
      content: '<p>t</p>',
      // NEW AEO fields (all optional but must be accepted):
      updatedAt: '2026-04-22',
      author: 'Jithesh Manoharan',
      authorTitle: 'NetSuite Certified Administrator · 18+ yrs ERP Solution Architect',
      reviewedBy: 'Jithesh Manoharan, NetSuite Certified Administrator (ID 9939)',
      answer: 'A 40-60 word plain-English answer for AI Overview.',
      faqs: [{ q: 'Q?', a: 'A.' }],
      citations: [{ label: 'Oracle SuiteScript docs', url: 'https://docs.oracle.com/en/cloud/saas/netsuite/' }],
    }
    expect(p.slug).toBe('t')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL with "Property 'answer' does not exist on type 'BlogPost'"**

```bash
cd /Users/jeet/arthaBuild/src/frontend
npx vitest run src/test/blog-post-type.test.ts 2>&1 | head -20
```

Expected: TypeScript error (TS2353) listing the missing fields.

- [ ] **Step 3: Add the 7 optional fields to the interface**

In `/Users/jeet/arthaBuild/src/frontend/src/data/blog.ts`, locate the `BlogPost` interface and add (append, do not modify existing fields):

```ts
export interface BlogPost {
  // ── existing fields unchanged ──
  slug: string
  title: string
  description: string
  category: BlogCategory
  badge?: EditorialBadge
  publishedAt: string
  readTime: string
  tags: string[]
  content: string

  // ── AEO fields (quick-298, all optional for backwards compat) ──
  /** ISO date for schema dateModified + "Last reviewed" line. Set when content is actually updated. */
  updatedAt?: string
  /** Author byline (name). Matches a TeamMember slug in team.ts. */
  author?: string
  /** Role + credentials — NO company name (per positioning rule §5 of design). */
  authorTitle?: string
  /** Fact-check reviewer. Person schema `reviewedBy`. NO company name. */
  reviewedBy?: string
  /** 40-60 word direct answer under H1 — AI Overview / Perplexity passage target. HARD word-count lint. */
  answer?: string
  /** 3-6 self-contained Q&As rendered as accordion + emitted as FAQPage JSON-LD. */
  faqs?: { q: string; a: string }[]
  /** Outbound authoritative citations. URLs must return 200 at commit time. */
  citations?: { label: string; url: string }[]
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/blog-post-type.test.ts
```

Expected: 1 test passing.

- [ ] **Step 5: Run full test suite to confirm no regression**

```bash
npx vitest run 2>&1 | tail -15
```

Expected: all pre-existing tests still pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/jeet/arthaBuild
git add src/frontend/src/data/blog.ts src/frontend/src/test/blog-post-type.test.ts
git commit -m "feat(blog)(quick-298): extend BlogPost type with AEO fields (answer, faqs, citations, reviewedBy, author, authorTitle, updatedAt)"
```

---

### Task 1.2 — Create `team.ts` with 3 real TeamMember entries

**Files:**
- Create: `/Users/jeet/arthaBuild/src/frontend/src/data/team.ts`
- Test: `/Users/jeet/arthaBuild/src/frontend/src/test/team-data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/jeet/arthaBuild/src/frontend/src/test/team-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { team, TeamMember } from '../data/team'

describe('team.ts — real people, real LinkedIn URLs', () => {
  it('has exactly 3 members', () => {
    expect(team.length).toBe(3)
  })

  it('includes Jithesh Manoharan with NetSuite cert', () => {
    const j = team.find(m => m.slug === 'jithesh-manoharan')
    expect(j).toBeDefined()
    expect(j!.name).toBe('Jithesh Manoharan')
    expect(j!.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/in\/jiteshmanoharan\/$/)
    expect(j!.credentials).toContain('NetSuite Certified Administrator')
  })

  it('includes Rajesh Nair with correct LinkedIn slug (NOT rajesh-manoharan)', () => {
    const r = team.find(m => m.slug === 'rajesh-nair')
    expect(r).toBeDefined()
    expect(r!.name).toBe('Rajesh Nair')
    expect(r!.linkedin).toContain('rajesh-nair')
  })

  it('includes Ethan Vereal with CTO title', () => {
    const e = team.find(m => m.slug === 'ethan-vereal')
    expect(e).toBeDefined()
    expect(e!.linkedin).toContain('ethan-vreal')
  })

  it('NO title contains "TechCloudPro" (byline rule locked by user)', () => {
    for (const m of team) {
      expect(m.title).not.toMatch(/techcloudpro/i)
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL with "Cannot find module '../data/team'"**

```bash
cd /Users/jeet/arthaBuild/src/frontend
npx vitest run src/test/team-data.test.ts
```

Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Create `team.ts` with the 3 real members**

Create `/Users/jeet/arthaBuild/src/frontend/src/data/team.ts`:

```ts
export interface TeamMember {
  slug: string
  name: string
  title: string              // credentials-only byline; NO company name
  credentials?: string       // extra structured creds for bio page
  bio: string                // full career bio (shown on /about/<slug>, may mention historical employers — those are real creds, not brand pollution)
  linkedin?: string          // Person schema sameAs — must return HTTP 200 at Gate A
  email?: string
  imageFile?: string         // relative path under /about/; optional — if absent, AuthorPage renders initial-avatar
}

// Real team data verified from /Users/jeet/techcloudpro/src/data/team.ts (2026-04-22).
// Bylines (title field) omit company name per spec §5 byline rule locked by user.
// Bios may mention historical employers because those are real credential signals.
export const team: TeamMember[] = [
  {
    slug: 'jithesh-manoharan',
    name: 'Jithesh Manoharan',
    title: 'NetSuite Certified Administrator · 18+ yrs ERP Solution Architect',
    credentials: 'NetSuite Certified Administrator (ID 9939) · 18+ years ERP Solution Architecture',
    bio: 'A multi-faceted, multi-certified IT consultant with experience spanning over two decades across startups and the Big 4 alike. Jithesh has worked as a NetSuite ERP Consultant, Principal Advisor, and Solution Architect for high-profile companies including Wells Fargo, Hampton Creek, Anastasia Beverly Hills, and JUST Inc. His expertise includes managing multiple concurrent projects across industry verticals, and he has established himself as a trusted advisor to C-level decision-makers on enterprise-wide technology management strategies.',
    linkedin: 'https://www.linkedin.com/in/jiteshmanoharan/',
    email: 'jm@techcloudpro.com',
    imageFile: 'jithesh-manoharan.jpg',
  },
  {
    slug: 'rajesh-nair',
    name: 'Rajesh Nair',
    title: 'Managing Director',
    bio: 'A born entrepreneur, Rajesh divides his time between multiple business interests ranging from solar-powered sustainable products to innovative corporate gifting, organic foods production, and technology & logistics. He brings a unique blend of business acumen and operational expertise to delivery operations across all geographies.',
    linkedin: 'https://www.linkedin.com/in/rajesh-nair-356b671a2/',
    email: 'rajesh@techcloudpro.com',
    imageFile: 'rajesh-nair.jpg',
  },
  {
    slug: 'ethan-vereal',
    name: 'Ethan Vereal',
    title: 'CTO · Cloud Architecture & Private LLM Systems',
    bio: 'With deep expertise in cloud architecture, AI/ML systems, and enterprise security, Ethan leads technology vision across private LLM deployment frameworks and the technical delivery of complex ERP implementations. His background spans distributed systems, DevOps, and cybersecurity — ensuring every solution meets the highest standards of performance and security.',
    linkedin: 'https://www.linkedin.com/in/ethan-vreal-9a265b394/',
    // no imageFile — falls back to initial-avatar
  },
]
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/team-data.test.ts
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/jeet/arthaBuild
git add src/frontend/src/data/team.ts src/frontend/src/test/team-data.test.ts
git commit -m "feat(team)(quick-298): add 3 real TeamMember entries (Jithesh, Rajesh Nair, Ethan) with LinkedIn URLs"
```

---

### Task 1.3 — Create `public/about/` directory + drop Rajesh's headshot

**Files:**
- Create: `/Users/jeet/arthaBuild/public/about/.gitkeep`
- Create: `/Users/jeet/arthaBuild/public/about/rajesh-nair.jpg` (copied from `/Users/jeet/socialflow-prod/video-edit/rajesh_crop.png`, cropped)
- *Deferred:* `public/about/jithesh-manoharan.jpg` — pending user paste of path

- [ ] **Step 1: Create directory + gitkeep**

```bash
cd /Users/jeet/arthaBuild
mkdir -p public/about
touch public/about/.gitkeep
```

- [ ] **Step 2: Copy Rajesh's headshot, strip yellow border (dimensions computed dynamically)**

The source image `rajesh_crop.png` has a yellow video-edit border (~15 px). Measure dimensions, crop border, resize to a canonical 400×400 JPEG:

```bash
SRC=/Users/jeet/socialflow-prod/video-edit/rajesh_crop.png
DST=/Users/jeet/arthaBuild/public/about/rajesh-nair.jpg
W=$(sips -g pixelWidth "$SRC" | awk '/pixelWidth/ {print $2}')
H=$(sips -g pixelHeight "$SRC" | awk '/pixelHeight/ {print $2}')
CROP_W=$((W - 30))   # strip 15px each side
CROP_H=$((H - 30))
echo "Source: ${W}x${H}, cropping to ${CROP_W}x${CROP_H}, resizing to 400x400"
# Note: sips -c takes HEIGHT WIDTH in that order
sips -c "$CROP_H" "$CROP_W" -z 400 400 -s format jpeg --setProperty formatOptions 85 "$SRC" --out "$DST"
```

Visually inspect the output: `open /Users/jeet/arthaBuild/public/about/rajesh-nair.jpg`. If the crop cuts Rajesh's face (yellow border was asymmetric), stop and ask Jeet to provide a pre-cropped version instead of proceeding.

- [ ] **Step 3: Verify the copied file renders correctly**

```bash
# File should exist, be smaller than source (JPEG compression), and be a valid JPEG
file /Users/jeet/arthaBuild/public/about/rajesh-nair.jpg
sips -g pixelWidth -g pixelHeight /Users/jeet/arthaBuild/public/about/rajesh-nair.jpg
```

Expected: `JPEG image data`, square dimensions (~330×330 or similar).

- [ ] **Step 4: Commit**

```bash
cd /Users/jeet/arthaBuild
git add public/about/.gitkeep public/about/rajesh-nair.jpg
git commit -m "feat(bio)(quick-298): add /about/ dir + Rajesh Nair headshot (cropped from socialflow asset)"
```

- [ ] **Step 5: Note — Jithesh headshot follow-up is tracked in Task 1.10 (not here)**

`DRIFT_LOG.md` is created in Task 1.10, not 1.3. Task 1.10 Step 1 adds the Jithesh-headshot follow-up entry. Do not attempt to write to the file before it exists.

---

### Task 1.4 — Create `AuthorPage.tsx`

**Files:**
- Create: `/Users/jeet/arthaBuild/src/frontend/src/pages/AuthorPage.tsx`
- Test: `/Users/jeet/arthaBuild/src/test/author-page.test.tsx` (smoke render test)

- [ ] **Step 1: Write the failing test**

Create `/Users/jeet/arthaBuild/src/frontend/src/test/author-page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthorPage from '../pages/AuthorPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/about/:slug" element={<AuthorPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthorPage (quick-298)', () => {
  it('renders Jithesh with name, credentials, LinkedIn', () => {
    renderAt('/about/jithesh-manoharan')
    expect(screen.getByRole('heading', { level: 1, name: /Jithesh Manoharan/ })).toBeInTheDocument()
    expect(screen.getByText(/NetSuite Certified Administrator/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /linkedin/i }) as HTMLAnchorElement
    expect(link.href).toContain('linkedin.com/in/jiteshmanoharan')
  })

  it('emits Person JSON-LD with correct sameAs', () => {
    const { container } = renderAt('/about/jithesh-manoharan')
    const schemas = container.querySelectorAll('script[type="application/ld+json"]')
    const jsonLdTexts = Array.from(schemas).map(s => s.textContent || '')
    const personSchema = jsonLdTexts.find(t => t.includes('"@type":"Person"'))
    expect(personSchema).toBeDefined()
    const parsed = JSON.parse(personSchema!)
    expect(parsed.name).toBe('Jithesh Manoharan')
    expect(parsed.sameAs).toContain('https://www.linkedin.com/in/jiteshmanoharan/')
  })

  it('returns NotFound element for unknown slug', () => {
    renderAt('/about/does-not-exist')
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

```bash
cd /Users/jeet/arthaBuild/src/frontend
npx vitest run src/test/author-page.test.tsx
```

- [ ] **Step 3: Implement `AuthorPage.tsx`**

Create `/Users/jeet/arthaBuild/src/frontend/src/pages/AuthorPage.tsx`:

```tsx
import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { team, TeamMember } from '../data/team'
import { blogPosts } from '../data/blogPosts'

function Initials({ name }: { name: string }) {
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      aria-label={`${name} avatar placeholder`}
      style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: '#2a3456',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 40,
        fontWeight: 600,
      }}
    >
      {initials}
    </div>
  )
}

function PersonJsonLd({ m }: { m: TeamMember }) {
  const sameAs = [m.linkedin].filter(Boolean) as string[]
  // Include TCP leadership URL as cross-domain authority (per spec §13, user-approved)
  sameAs.push(`https://www.techcloudpro.com/leadership/${m.slug}`)
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: m.name,
    jobTitle: m.title,
    url: `https://artha.build/about/${m.slug}`,
    sameAs,
  }
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>
}

export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>()
  const member = team.find(m => m.slug === slug)

  if (!member) {
    return (
      <main style={{ maxWidth: 680, margin: '4em auto', padding: '0 1em' }}>
        <h1>Author not found</h1>
        <p>
          <Link to="/about">Back to team</Link>
        </p>
      </main>
    )
  }

  // Posts where this person reviewed or authored.
  const reviewedPosts = blogPosts.filter(
    p => p.reviewedBy?.includes(member.name) || p.author === member.name,
  )

  return (
    <main style={{ maxWidth: 720, margin: '3em auto', padding: '0 1em' }}>
      <PersonJsonLd m={member} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24 }}>
        {member.imageFile ? (
          <img
            src={`/about/${member.imageFile}`}
            alt={`${member.name} headshot`}
            width={120}
            height={120}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <Initials name={member.name} />
        )}
        <div>
          <h1 style={{ marginBottom: 4 }}>{member.name}</h1>
          <p style={{ color: '#555', margin: 0 }}>{member.title}</p>
        </div>
      </div>

      {member.credentials && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, textTransform: 'uppercase', color: '#2a3456' }}>Credentials</h2>
          <p>{member.credentials}</p>
        </section>
      )}

      <section style={{ marginBottom: 24 }}>
        <p style={{ lineHeight: 1.6 }}>{member.bio}</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        {member.linkedin && (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} LinkedIn profile`}
          >
            LinkedIn →
          </a>
        )}
        {member.email && (
          <>
            {'  '}
            <a href={`mailto:${member.email}`}>{member.email}</a>
          </>
        )}
      </section>

      {reviewedPosts.length > 0 && (
        <section>
          <h2>Articles reviewed by {member.name}</h2>
          <ul>
            {reviewedPosts.slice(0, 20).map(p => (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
          {reviewedPosts.length > 20 && (
            <p style={{ color: '#666' }}>
              Showing 20 of {reviewedPosts.length}.
            </p>
          )}
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/author-page.test.tsx
```

Expected: 3 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/jeet/arthaBuild
git add src/frontend/src/pages/AuthorPage.tsx src/frontend/src/test/author-page.test.tsx
git commit -m "feat(bio)(quick-298): AuthorPage renders member bio + emits Person JSON-LD with sameAs"
```

---

### Task 1.5 — Create `AuthorIndex.tsx`

**Files:**
- Create: `/Users/jeet/arthaBuild/src/frontend/src/pages/AuthorIndex.tsx`
- Test: `/Users/jeet/arthaBuild/src/frontend/src/test/author-index.test.tsx`

- [ ] **Step 1: Write failing test**

Create `/Users/jeet/arthaBuild/src/frontend/src/test/author-index.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthorIndex from '../pages/AuthorIndex'

describe('AuthorIndex (quick-298)', () => {
  it('shows all 3 team members with links to /about/<slug>', () => {
    render(
      <MemoryRouter>
        <AuthorIndex />
      </MemoryRouter>,
    )
    expect(screen.getByText('Jithesh Manoharan')).toBeInTheDocument()
    expect(screen.getByText('Rajesh Nair')).toBeInTheDocument()
    expect(screen.getByText('Ethan Vereal')).toBeInTheDocument()
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    const hrefs = links.map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/about/jithesh-manoharan')
    expect(hrefs).toContain('/about/rajesh-nair')
    expect(hrefs).toContain('/about/ethan-vereal')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/test/author-index.test.tsx
```

- [ ] **Step 3: Implement `AuthorIndex.tsx`**

Create `/Users/jeet/arthaBuild/src/frontend/src/pages/AuthorIndex.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { team } from '../data/team'

export default function AuthorIndex() {
  return (
    <main style={{ maxWidth: 920, margin: '3em auto', padding: '0 1em' }}>
      <h1>The team behind ArthaBuild</h1>
      <p style={{ color: '#555' }}>
        Real humans who built and review this work. Credentials verifiable via LinkedIn.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
          marginTop: 32,
        }}
      >
        {team.map(m => (
          <Link
            key={m.slug}
            to={`/about/${m.slug}`}
            style={{ textDecoration: 'none', color: 'inherit', padding: 16, border: '1px solid #e0e0e0', borderRadius: 8 }}
          >
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{m.name}</h2>
            <p style={{ color: '#555', fontSize: 14 }}>{m.title}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/test/author-index.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/pages/AuthorIndex.tsx src/frontend/src/test/author-index.test.tsx
git commit -m "feat(bio)(quick-298): AuthorIndex at /about listing 3 team members"
```

---

### Task 1.6 — Register `/about` + `/about/:slug` routes

**Files:**
- Modify: `/Users/jeet/arthaBuild/src/frontend/src/routes.tsx`

- [ ] **Step 1: Read current routes.tsx**

```bash
grep -n "Route path" /Users/jeet/arthaBuild/src/frontend/src/routes.tsx | head -20
```

Identify where to add — somewhere near `/blog` routes before the catchall `<Route path="*">`.

- [ ] **Step 2: Add import + 2 Route entries**

In `/Users/jeet/arthaBuild/src/frontend/src/routes.tsx`:

- Near the top (imports section), add:
  ```tsx
  import AuthorPage from './pages/AuthorPage'
  import AuthorIndex from './pages/AuthorIndex'
  ```

- Before `<Route path="*">` catchall, add:
  ```tsx
  {/* quick-298: author bio pages (Person JSON-LD + articles-reviewed lists) */}
  <Route path="/about" element={<AuthorIndex />} />
  <Route path="/about/:slug" element={<AuthorPage />} />
  ```

- [ ] **Step 3: Run build to confirm no regression**

```bash
cd /Users/jeet/arthaBuild/src/frontend
npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs` — no errors.

- [ ] **Step 4: Render-test the routing tree (real content, not SPA catchall)**

Create `/Users/jeet/arthaBuild/src/frontend/src/test/routes-about.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoutesApp from '../routes'

describe('/about routes wired (quick-298)', () => {
  it('/about/jithesh-manoharan renders Jithesh content', () => {
    render(<MemoryRouter initialEntries={['/about/jithesh-manoharan']}><RoutesApp /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: /Jithesh Manoharan/ })).toBeInTheDocument()
  })

  it('/about renders the team index with all 3 members', () => {
    render(<MemoryRouter initialEntries={['/about']}><RoutesApp /></MemoryRouter>)
    expect(screen.getByText('Jithesh Manoharan')).toBeInTheDocument()
    expect(screen.getByText('Rajesh Nair')).toBeInTheDocument()
    expect(screen.getByText('Ethan Vereal')).toBeInTheDocument()
  })
})
```

Run: `cd /Users/jeet/arthaBuild/src/frontend && npx vitest run src/test/routes-about.test.tsx` — expect 2 tests passing. This validates the routes are *actually* registered (unlike a dev-server curl which returns 200 regardless of routing).

- [ ] **Step 5: Commit**

```bash
cd /Users/jeet/arthaBuild
git add src/frontend/src/routes.tsx
git commit -m "feat(routing)(quick-298): register /about and /about/:slug routes"
```

---

### Task 1.7 — Update `BlogPost.tsx` to render AEO fields + emit Article + FAQPage JSON-LD

**Files:**
- Modify: `/Users/jeet/arthaBuild/src/frontend/src/pages/BlogPost.tsx`
- Test: `/Users/jeet/arthaBuild/src/frontend/src/test/blog-post-render.test.tsx`

- [ ] **Step 1: Read the current BlogPost.tsx structure**

```bash
wc -l /Users/jeet/arthaBuild/src/frontend/src/pages/BlogPost.tsx
grep -n "^function\|^export\|<h1\|title" /Users/jeet/arthaBuild/src/frontend/src/pages/BlogPost.tsx | head -15
```

- [ ] **Step 2: Write failing test**

Create `/Users/jeet/arthaBuild/src/frontend/src/test/blog-post-render.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BlogPost from '../pages/BlogPost'

// Vitest mock. Use DIFFERENT author vs reviewer names so queries are unambiguous.
vi.mock('../data/blogPosts', () => ({
  blogPosts: [{
    slug: 'test-aeo-rendering',
    title: 'Test Post',
    description: 'd',
    category: 'netsuite',
    publishedAt: '2026-04-22',
    readTime: '1 min read',
    tags: ['t'],
    content: '<p>body</p>',
    updatedAt: '2026-04-22',
    author: 'Jithesh Manoharan',                                  // author byline
    authorTitle: 'NetSuite Certified Administrator · 18+ yrs ERP Solution Architect',
    reviewedBy: 'Ethan Vereal, CTO',                              // DIFFERENT reviewer → distinct links
    answer: 'A 50-word answer for AI Overview. Short enough for extraction. Long enough to carry substance. Counts: zero invented claims. Grounded in the post body.',
    faqs: [{ q: 'Q1?', a: 'A1.' }, { q: 'Q2?', a: 'A2.' }],
    citations: [{ label: 'Oracle docs', url: 'https://docs.oracle.com/en/cloud/saas/netsuite/' }],
  }]
}))

describe('BlogPost AEO rendering (quick-298)', () => {
  function renderAt(slug: string) {
    return render(
      <MemoryRouter initialEntries={[`/blog/${slug}`]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders the answer block under H1', () => {
    renderAt('test-aeo-rendering')
    expect(screen.getByText(/A 50-word answer/)).toBeInTheDocument()
  })

  it('renders author link (Jithesh) and reviewer link (Ethan) to /about/<slug>', () => {
    renderAt('test-aeo-rendering')
    const authorLink = screen.getByRole('link', { name: /Jithesh Manoharan/ }) as HTMLAnchorElement
    expect(authorLink.href).toContain('/about/jithesh-manoharan')
    const reviewerLink = screen.getByRole('link', { name: /Ethan Vereal/ }) as HTMLAnchorElement
    expect(reviewerLink.href).toContain('/about/ethan-vereal')
  })

  it('renders FAQs as accordion', () => {
    renderAt('test-aeo-rendering')
    expect(screen.getByText('Q1?')).toBeInTheDocument()
    expect(screen.getByText('Q2?')).toBeInTheDocument()
  })

  it('emits Article + FAQPage JSON-LD', () => {
    const { container } = renderAt('test-aeo-rendering')
    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent || '')
    const article = schemas.find(s => s.includes('"@type":"BlogPosting"') || s.includes('"@type":"Article"'))
    const faq = schemas.find(s => s.includes('"@type":"FAQPage"'))
    expect(article).toBeDefined()
    expect(faq).toBeDefined()
    const parsedArticle = JSON.parse(article!)
    expect(parsedArticle.author?.name).toBe('Jithesh Manoharan')
    expect(parsedArticle.reviewedBy?.name).toBe('Ethan Vereal')
    expect(parsedArticle.dateModified).toBe('2026-04-22')
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
npx vitest run src/test/blog-post-render.test.tsx
```

- [ ] **Step 4: Update `BlogPost.tsx` — render + emit schemas**

In `/Users/jeet/arthaBuild/src/frontend/src/pages/BlogPost.tsx`, add (where the current post body renders):

1. Near the top of the component, extract author + reviewer TeamMember refs:

```tsx
import { team } from '../data/team'
// ...
const authorMember = post.author ? team.find(m => m.name === post.author) : undefined
const reviewerMember = post.reviewedBy ? team.find(m => post.reviewedBy!.includes(m.name)) : undefined
```

2. Right after the `<h1>{post.title}</h1>`, render the answer block + reviewer byline:

```tsx
{post.answer && (
  <blockquote
    style={{
      borderLeft: '4px solid #a855f7',
      padding: '8px 16px',
      color: '#333',
      fontSize: 17,
      fontWeight: 500,
      margin: '1em 0',
    }}
  >
    {post.answer}
  </blockquote>
)}

{(post.reviewedBy || post.author) && (
  <p style={{ color: '#555', fontSize: 14 }}>
    {post.author && (
      <>
        By{' '}
        {authorMember ? (
          <Link to={`/about/${authorMember.slug}`}>{post.author}</Link>
        ) : (
          post.author
        )}
        {post.authorTitle && ` — ${post.authorTitle}`}
        {'. '}
      </>
    )}
    {post.reviewedBy && (
      <>
        Reviewed by{' '}
        {reviewerMember ? (
          <Link to={`/about/${reviewerMember.slug}`}>{reviewerMember.name}</Link>
        ) : (
          post.reviewedBy
        )}
        .{' '}
      </>
    )}
    {post.updatedAt && <>Last updated {post.updatedAt}.</>}
  </p>
)}
```

3. After the post body content, render FAQs + citations:

```tsx
{post.faqs && post.faqs.length > 0 && (
  <section aria-labelledby="faq-heading" style={{ marginTop: 48 }}>
    <h2 id="faq-heading">Frequently Asked Questions</h2>
    {post.faqs.map((f, i) => (
      <details key={i} style={{ marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
        <p style={{ marginTop: 8 }}>{f.a}</p>
      </details>
    ))}
  </section>
)}

{post.citations && post.citations.length > 0 && (
  <section aria-labelledby="citations-heading" style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 16 }}>
    <h2 id="citations-heading" style={{ fontSize: 16 }}>Sources</h2>
    <ol>
      {post.citations.map((c, i) => (
        <li key={i}>
          <a href={c.url} target="_blank" rel="noopener noreferrer">{c.label}</a>
        </li>
      ))}
    </ol>
  </section>
)}
```

4. In the JSON-LD emission section, emit Article + FAQPage schemas:

```tsx
{/* quick-298: Article + FAQPage JSON-LD */}
<script type="application/ld+json">
{JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.description,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt ?? post.publishedAt,
  image: `https://artha.build/og-image-v2.png`,
  mainEntityOfPage: `https://artha.build/blog/${post.slug}`,
  ...(authorMember && {
    author: {
      '@type': 'Person',
      name: authorMember.name,
      url: `https://artha.build/about/${authorMember.slug}`,
      ...(authorMember.linkedin && { sameAs: [authorMember.linkedin, `https://www.techcloudpro.com/leadership/${authorMember.slug}`] }),
    },
  }),
  ...(reviewerMember && {
    reviewedBy: {
      '@type': 'Person',
      name: reviewerMember.name,
      url: `https://artha.build/about/${reviewerMember.slug}`,
      ...(reviewerMember.linkedin && { sameAs: [reviewerMember.linkedin, `https://www.techcloudpro.com/leadership/${reviewerMember.slug}`] }),
    },
  }),
})}
</script>

{post.faqs && post.faqs.length > 0 && (
  <script type="application/ld+json">
  {JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  })}
  </script>
)}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run src/test/blog-post-render.test.tsx
```

- [ ] **Step 6: Run full test suite + build**

```bash
npx vitest run 2>&1 | tail -10
npm run build 2>&1 | tail -5
```

Expected: all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /Users/jeet/arthaBuild
git add src/frontend/src/pages/BlogPost.tsx src/frontend/src/test/blog-post-render.test.tsx
git commit -m "feat(blog)(quick-298): BlogPost renders AEO fields + emits Article/FAQPage JSON-LD"
```

---

### Task 1.8 — Quality-gate script: `verify-blog-citations.mjs` (Gate A)

**Files:**
- Create: `/Users/jeet/arthaBuild/scripts/verify-blog-citations.mjs`
- Test: `/Users/jeet/arthaBuild/scripts/verify-blog-citations.test.mjs`

- [ ] **Step 1: Write failing test**

Create `/Users/jeet/arthaBuild/scripts/verify-blog-citations.test.mjs`:

```js
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { verifyCitations, extractCitationsFromText } from './verify-blog-citations.mjs'

// Network-dependent tests skipped in CI unless NETWORK=1 set.
const networkDescribe = process.env.CI && !process.env.NETWORK ? describe.skip : describe

networkDescribe('verify-blog-citations — Gate A network (quick-298)', () => {
  it('returns ok=true for a resolving URL', async () => {
    const r = await verifyCitations([{ label: 'Oracle', url: 'https://docs.oracle.com/' }])
    expect(r.ok).toBe(true)
  })

  it('returns ok=false for a 404 URL', async () => {
    const r = await verifyCitations([{ label: 'bogus', url: 'https://httpbin.org/status/404' }])
    expect(r.ok).toBe(false)
    expect(r.failures[0].status).toBe(404)
  })

  it('LinkedIn URL returns 999 via HEAD but accepted after GET fallback', async () => {
    const r = await verifyCitations([{ label: 'LI', url: 'https://www.linkedin.com/in/jiteshmanoharan/' }])
    expect(r.ok).toBe(true)
  })
})

describe('verify-blog-citations — parser canary (no network)', () => {
  it('extracts only real citations; ignores `slug:` inside prose', () => {
    // Tricky fixture: post body contains the literal string "slug: 'fake'" inside an HTML code tag.
    const fixture = `
      {
        slug: "real-post",
        content: \`<p>Example: <code>slug: "fake-inside-prose"</code></p>\`,
        citations: [
          { label: "Real Oracle", url: "https://docs.oracle.com/" },
        ],
      },
      {
        slug: "second-post",
        content: "other",
        citations: [
          { label: "Second", url: "https://example.com/" },
        ],
      },
    `
    const out = extractCitationsFromText(fixture)
    expect(out.length).toBe(2)
    expect(out.map(o => o.slug).sort()).toEqual(['real-post', 'second-post'])
    expect(out.find(o => o.slug === 'fake-inside-prose')).toBeUndefined()
  })
})
```

**Parser canary note:** If this test fails during P2 against real `blogPosts.ts`, the naive regex parser is inadequate — swap to `ts-morph` (one-line dependency add). Recorded as a known escape hatch in the plan.

- [ ] **Step 2: Run — expect FAIL (module not found)**

```bash
cd /Users/jeet/arthaBuild
npx vitest run scripts/verify-blog-citations.test.mjs
```

- [ ] **Step 3: Implement `verify-blog-citations.mjs`**

Create `/Users/jeet/arthaBuild/scripts/verify-blog-citations.mjs`:

```js
#!/usr/bin/env node
/**
 * Gate A — commit-time citation link health (quick-298)
 * CLI: node scripts/verify-blog-citations.mjs [--slugs slug1,slug2]
 * Exit 0 if all citations resolve. Exit 1 otherwise.
 *
 * LinkedIn-specific handling: LinkedIn returns HTTP 999 for HEAD requests
 * from non-browser clients (anti-scrape). We fall back to GET with a browser UA,
 * then look for markers in the response HTML confirming the profile exists.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BLOGPOSTS_PATH = path.resolve(__dirname, '..', 'src', 'frontend', 'src', 'data', 'blogPosts.ts')
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function isLinkedIn(url) {
  return /^https?:\/\/(www\.)?linkedin\.com\//i.test(url)
}

async function checkOne(c) {
  try {
    // First attempt: HEAD with UA header (some sites allow HEAD but block default agents)
    const head = await fetch(c.url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': BROWSER_UA } })
    if (head.ok) return { ok: true }
    // LinkedIn 999 fallback: GET with UA, inspect HTML
    if (isLinkedIn(c.url) && (head.status === 999 || head.status === 403)) {
      const get = await fetch(c.url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': BROWSER_UA } })
      if (!get.ok && get.status !== 999) return { ok: false, status: get.status }
      const text = await get.text()
      // LinkedIn profile pages contain og:title or og:url with the slug. A generic 404
      // page does NOT contain an og:profile type. Require one of these markers.
      const slug = c.url.replace(/\/$/, '').split('/').pop() ?? ''
      const hasOgUrl = new RegExp(`<meta[^>]+property=["']og:url["'][^>]+${slug}`, 'i').test(text)
      const hasProfile = /<meta[^>]+property=["']og:type["'][^>]+["']profile["']/i.test(text)
      if (hasOgUrl || hasProfile) return { ok: true, note: 'LI GET-fallback verified via OG meta' }
      return { ok: false, status: get.status, note: 'LI GET did not return profile markers — slug may be wrong' }
    }
    return { ok: false, status: head.status }
  } catch (err) {
    return { ok: false, status: 0, error: String(err) }
  }
}

export async function verifyCitations(citations) {
  const failures = []
  for (const c of citations) {
    const r = await checkOne(c)
    if (!r.ok) failures.push({ ...c, ...r })
  }
  return { ok: failures.length === 0, failures }
}

/**
 * Naive-but-canary-tested extractor. Exported for unit tests (parser canary).
 * If canary fails on real blogPosts.ts in P2, swap to ts-morph.
 */
export function extractCitationsFromText(src, slugFilter) {
  const posts = src.split(/(?=\s*slug:\s*['"])/).slice(1)
  const result = []
  for (const block of posts) {
    const slugMatch = block.match(/slug:\s*['"]([^'"]+)['"]/)
    if (!slugMatch) continue
    const slug = slugMatch[1]
    if (slugFilter && !slugFilter.includes(slug)) continue
    const citationsMatch = block.match(/citations:\s*\[([\s\S]*?)\]/)
    if (!citationsMatch) continue
    const entries = [...citationsMatch[1].matchAll(/\{[^}]*?url:\s*['"]([^'"]+)['"][^}]*?\}/g)]
    for (const e of entries) {
      const urlMatch = e[0].match(/url:\s*['"]([^'"]+)['"]/)
      const labelMatch = e[0].match(/label:\s*['"]([^'"]+)['"]/)
      if (urlMatch) result.push({ slug, url: urlMatch[1], label: labelMatch?.[1] ?? '(no label)' })
    }
  }
  return result
}

async function extractCitationsFromFile(filePath, slugFilter) {
  const src = await fs.readFile(filePath, 'utf-8')
  return extractCitationsFromText(src, slugFilter)
}

async function main() {
  const args = process.argv.slice(2)
  let slugFilter
  const slugsIdx = args.indexOf('--slugs')
  if (slugsIdx !== -1) slugFilter = args[slugsIdx + 1]?.split(',')
  const citations = await extractCitationsFromFile(BLOGPOSTS_PATH, slugFilter)
  console.log(`Verifying ${citations.length} citations${slugFilter ? ` (filter: ${slugFilter.join(',')})` : ''}…`)
  const { ok, failures } = await verifyCitations(citations)
  if (!ok) {
    console.error('\n❌ Link-health failures:')
    for (const f of failures) console.error(`  [${f.slug}] ${f.url} → ${f.status}${f.note ? ' (' + f.note + ')' : ''}${f.error ? ' — ' + f.error : ''}`)
    process.exit(1)
  }
  console.log(`✅ All ${citations.length} citations resolve.`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(2) })
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run scripts/verify-blog-citations.test.mjs
```

Expected: 3 tests passing (one requires network; the test hits httpbin.org + docs.oracle.com).

- [ ] **Step 5: Smoke-test CLI against current blogPosts.ts**

```bash
node scripts/verify-blog-citations.mjs
```

Expected: exit 0 with "✅ All 0 citations resolve" (since no posts have citations yet — expected state pre-backfill).

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-blog-citations.mjs scripts/verify-blog-citations.test.mjs
git commit -m "feat(gates)(quick-298): Gate A — verify-blog-citations.mjs checks citation URLs resolve"
```

---

### Task 1.9 — Quality-gate script: `lint-blog-answer.mjs` (Gate C — 40-60 word count)

**Files:**
- Create: `/Users/jeet/arthaBuild/scripts/lint-blog-answer.mjs`
- Test: `/Users/jeet/arthaBuild/scripts/lint-blog-answer.test.mjs`

- [ ] **Step 1: Write failing test**

Create `scripts/lint-blog-answer.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { lintAnswer, extractAnswersFromText } from './lint-blog-answer.mjs'

describe('lint-blog-answer — Gate C word count (quick-298)', () => {
  it('accepts a 50-word answer', () => {
    const fifty = Array(50).fill('word').join(' ')
    expect(lintAnswer(fifty).ok).toBe(true)
  })

  it('rejects a 39-word answer', () => {
    const short = Array(39).fill('word').join(' ')
    const r = lintAnswer(short)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('too short')
  })

  it('rejects a 61-word answer', () => {
    const long = Array(61).fill('word').join(' ')
    const r = lintAnswer(long)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('too long')
  })

  it('accepts boundary values 40 and 60', () => {
    expect(lintAnswer(Array(40).fill('x').join(' ')).ok).toBe(true)
    expect(lintAnswer(Array(60).fill('x').join(' ')).ok).toBe(true)
  })

  it('accepts undefined (field is optional)', () => {
    expect(lintAnswer(undefined).ok).toBe(true)
  })

  it('parser canary: answer with apostrophe is extracted correctly', () => {
    const fixture = `
      {
        slug: "t",
        answer: "NetSuite's SuiteScript 2.1 lets you automate record events.",
        content: "x"
      }
    `
    const out = extractAnswersFromText(fixture)
    expect(out).toHaveLength(1)
    expect(out[0].answer).toContain("NetSuite's SuiteScript")
    expect(out[0].answer).toContain('automate')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `lint-blog-answer.mjs`**

Create `scripts/lint-blog-answer.mjs`:

```js
#!/usr/bin/env node
/**
 * Gate C — answer field word count 40-60 (quick-298)
 *
 * The answer regex uses a balanced-quote matcher so apostrophes inside
 * double-quoted answers don't truncate the capture.
 */
export function lintAnswer(answer) {
  if (answer === undefined || answer === null) return { ok: true }
  const words = answer.trim().split(/\s+/).filter(Boolean)
  const n = words.length
  if (n < 40) return { ok: false, count: n, reason: `too short (${n} words; min 40)` }
  if (n > 60) return { ok: false, count: n, reason: `too long (${n} words; max 60)` }
  return { ok: true, count: n }
}

/**
 * Extract `answer:` string values from blogPosts.ts source text.
 * Uses a balanced-quote matcher — the opening quote char (`, ', or ")
 * must match the closing char, with backslash escapes honored in between.
 * Exported for parser canary tests.
 */
export function extractAnswersFromText(src) {
  const posts = src.split(/(?=\s*slug:\s*['"])/).slice(1)
  const out = []
  // Match answer:  QUOTE  BODY  SAME_QUOTE   where BODY may contain escapes.
  const re = /answer:\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/
  for (const block of posts) {
    const slug = block.match(/slug:\s*['"]([^'"]+)['"]/)?.[1]
    const m = block.match(re)
    if (!slug || !m) continue
    out.push({ slug, answer: m[2] })
  }
  return out
}

async function main() {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const here = path.dirname(fileURLToPath(import.meta.url))
  const src = await fs.readFile(path.resolve(here, '..', 'src', 'frontend', 'src', 'data', 'blogPosts.ts'), 'utf-8')
  let bad = 0
  for (const { slug, answer } of extractAnswersFromText(src)) {
    const r = lintAnswer(answer)
    if (!r.ok) {
      console.error(`❌ ${slug}: ${r.reason}`)
      bad++
    }
  }
  if (bad > 0) process.exit(1)
  console.log(`✅ Answer word counts OK.`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(2) })
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run scripts/lint-blog-answer.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add scripts/lint-blog-answer.mjs scripts/lint-blog-answer.test.mjs
git commit -m "feat(gates)(quick-298): Gate C — lint-blog-answer.mjs enforces 40-60 word count"
```

---

### Task 1.10 — Gate B: Pre-commit hook (`check-provenance-delta.sh`) + install script

**Scope note:** Gate B in Chunk 1 enforces **FAQ provenance** only (pairs `blogPosts.ts` FAQ changes with `faq-provenance.md` delta). **Gate G** (claims-map-&lt;slug&gt;.md pairing for new posts) is a separate pre-commit check that lands in **Chunk 4 (P3)**, not here. This is intentional — Chunk 1 ships before any new post exists, so there's no surface for Gate G to enforce. Do not attempt to enforce Gate G in Chunk 1.

**Files:**
- Create: `/Users/jeet/arthaBuild/scripts/check-provenance-delta.sh`
- Create: `/Users/jeet/arthaBuild/scripts/install-pre-commit-hook.sh`
- Create: `/Users/jeet/arthaBuild/.planning/marketing/faq-provenance.md` (empty skeleton)
- Create: `/Users/jeet/arthaBuild/.planning/marketing/DRIFT_LOG.md` (empty skeleton)

- [ ] **Step 1: Create provenance + drift log skeletons**

```bash
cd /Users/jeet/arthaBuild
mkdir -p .planning/marketing
cat > .planning/marketing/faq-provenance.md <<'EOF'
# FAQ Provenance (quick-298)

Every FAQ question in a published post MUST have an entry here, recording the source of the question (real community thread URL or Oracle doc section).

## Format

```
## Post: <slug>
### FAQ #N — "<Question>"
Source: <URL>
Date pulled: <YYYY-MM-DD>
Real asker: <username/handle> or "Oracle doc §N.N"
Grounded in: <where the answer comes from — Oracle doc section, post's own content>
```

## Entries

(none yet)
EOF

cat > .planning/marketing/DRIFT_LOG.md <<'EOF'
# Drift Log — AEO Backfill + New Posts (quick-298)

Per-batch negative attestation. Every batch writes an entry here even when empty.

## Template

```
## Batch <phase-N> (posts <range>) — <YYYY-MM-DD>
Topics rejected mid-batch: [none | <list>]
Citations replaced due to 404: [none | <slug, old, new>]
Claims softened to conditional language: [none | <slug, original, revised>]
Open concerns flagged: [none | <summary>]
```

## Entries

(none yet)
EOF
```

- [ ] **Step 2: Create `check-provenance-delta.sh` (the pre-commit hook payload)**

```bash
cat > scripts/check-provenance-delta.sh <<'EOF'
#!/usr/bin/env bash
# Gate B pre-commit hook (quick-298) — enforce provenance-delta pairing.
# If blogPosts.ts is in the staged diff AND faqs field has changed for any post,
# faq-provenance.md must also be staged in the same commit.

set -e

STAGED=$(git diff --cached --name-only)

# Fast exit if blogPosts.ts isn't touched
if ! echo "$STAGED" | grep -q "^src/frontend/src/data/blogPosts\.ts$"; then
  exit 0
fi

# Check if faqs field is being added/modified for any post
FAQS_CHANGED=$(git diff --cached src/frontend/src/data/blogPosts.ts | grep -cE "^\+[[:space:]]*faqs:" || true)

if [ "$FAQS_CHANGED" -eq 0 ]; then
  # blogPosts.ts changed but no faqs field changes — Gate B not triggered
  exit 0
fi

# faqs field changed → provenance file must also be staged
if ! echo "$STAGED" | grep -q "^\.planning/marketing/faq-provenance\.md$"; then
  echo ""
  echo "❌ Gate B (faq-provenance-delta) FAILED"
  echo "   blogPosts.ts has faqs field additions/changes ($FAQS_CHANGED lines)"
  echo "   but .planning/marketing/faq-provenance.md is NOT staged in this commit."
  echo ""
  echo "   Add the corresponding provenance entries to faq-provenance.md and re-stage."
  echo "   Per spec §10 Gate B: pre-commit hook blocks commits with unpaired changes."
  exit 1
fi

echo "✅ Gate B (faq-provenance-delta) passed."
exit 0
EOF
chmod +x scripts/check-provenance-delta.sh
```

- [ ] **Step 3: Create `install-pre-commit-hook.sh`**

```bash
cat > scripts/install-pre-commit-hook.sh <<'EOF'
#!/usr/bin/env bash
# Install the Gate B pre-commit hook (quick-298).
# Idempotent — safe to run multiple times.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK="$REPO_ROOT/.git/hooks/pre-commit"

# Preserve any existing pre-commit (append, don't clobber)
if [ -f "$HOOK" ] && ! grep -q "check-provenance-delta.sh" "$HOOK"; then
  echo "# quick-298 Gate B — FAQ provenance delta pairing" >> "$HOOK"
  echo "bash \"$REPO_ROOT/scripts/check-provenance-delta.sh\" || exit 1" >> "$HOOK"
elif [ ! -f "$HOOK" ]; then
  cat > "$HOOK" <<EOHOOK
#!/usr/bin/env bash
# quick-298 Gate B — FAQ provenance delta pairing
bash "$REPO_ROOT/scripts/check-provenance-delta.sh" || exit 1
EOHOOK
  chmod +x "$HOOK"
fi

echo "✅ Pre-commit hook installed."
EOF
chmod +x scripts/install-pre-commit-hook.sh
```

- [ ] **Step 4: Install the hook and verify**

```bash
bash scripts/install-pre-commit-hook.sh
test -x .git/hooks/pre-commit && echo "hook is executable"
grep -c "check-provenance-delta" .git/hooks/pre-commit
```

Expected: "hook is executable" + match count ≥1.

- [ ] **Step 5: Smoke-test the hook — should PASS on this commit (no blogPosts.ts change)**

```bash
cd /Users/jeet/arthaBuild
git add scripts/check-provenance-delta.sh scripts/install-pre-commit-hook.sh .planning/marketing/faq-provenance.md .planning/marketing/DRIFT_LOG.md
git commit -m "feat(gates)(quick-298): Gate B pre-commit hook + provenance + drift log skeletons"
```

Expected: commit succeeds (blogPosts.ts not changed, so hook exits 0).

---

### Task 1.11 — Quality-gate script: `validate-blog-schemas.mjs` (Gate E — JSON-LD validation)

**Files:**
- Create: `/Users/jeet/arthaBuild/scripts/validate-blog-schemas.mjs`
- Test: `/Users/jeet/arthaBuild/scripts/validate-blog-schemas.test.mjs`

- [ ] **Step 1: Write failing test**

Create `scripts/validate-blog-schemas.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { validateBlogPostSchemas } from './validate-blog-schemas.mjs'

describe('validate-blog-schemas — Gate E (quick-298)', () => {
  it('passes for a fully-populated AEO post', () => {
    const post = {
      slug: 't', title: 'T', description: 'd', publishedAt: '2026-04-22', category: 'netsuite',
      readTime: '1 min read', tags: [], content: '<p>x</p>',
      updatedAt: '2026-04-22',
      author: 'Jithesh Manoharan',
      reviewedBy: 'Jithesh Manoharan',
      answer: Array(50).fill('x').join(' '),
      faqs: [{ q: 'Q?', a: 'A.' }],
      citations: [{ label: 'L', url: 'https://example.com' }],
    }
    const r = validateBlogPostSchemas(post)
    expect(r.ok).toBe(true)
  })

  it('flags missing dateModified when updatedAt is absent', () => {
    const r = validateBlogPostSchemas({
      slug: 't', title: 'T', description: 'd', publishedAt: '2026-04-22', category: 'netsuite',
      readTime: '1 min read', tags: [], content: '<p>x</p>',
      author: 'X', reviewedBy: 'X', faqs: [{ q: 'Q?', a: 'A.' }],
    })
    expect(r.ok).toBe(true) // updatedAt optional — should fall back to publishedAt
  })

  it('flags FAQ with empty answer', () => {
    const r = validateBlogPostSchemas({
      slug: 't', title: 'T', description: 'd', publishedAt: '2026-04-22', category: 'netsuite',
      readTime: '1 min read', tags: [], content: '<p>x</p>',
      faqs: [{ q: 'Q?', a: '' }],
    })
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => e.includes('empty FAQ answer'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `validate-blog-schemas.mjs`**

```js
#!/usr/bin/env node
/**
 * Gate E — JSON-LD structural validation (quick-298).
 * Does NOT call Google Rich Results Test (no API). Checks structural invariants:
 *   - Article schema has headline, datePublished, dateModified, author or reviewer
 *   - FAQPage has valid mainEntity array with non-empty Qs and As
 */

export function validateBlogPostSchemas(post) {
  const errors = []
  if (!post.title) errors.push('Article: missing title')
  if (!post.publishedAt) errors.push('Article: missing publishedAt')
  if (post.faqs) {
    post.faqs.forEach((f, i) => {
      if (!f.q || f.q.trim() === '') errors.push(`FAQ #${i + 1}: empty FAQ question`)
      if (!f.a || f.a.trim() === '') errors.push(`FAQ #${i + 1}: empty FAQ answer`)
    })
  }
  if (post.citations) {
    post.citations.forEach((c, i) => {
      if (!c.url || !/^https?:\/\//.test(c.url)) errors.push(`Citation #${i + 1}: invalid URL ${c.url}`)
    })
  }
  return { ok: errors.length === 0, errors }
}

/**
 * Parse one post block and return a structured object for validation.
 * Uses same balanced-quote approach as lint-blog-answer.
 */
export function parsePostBlock(block) {
  const slug = block.match(/slug:\s*['"]([^'"]+)['"]/)?.[1]
  if (!slug) return null
  const title = block.match(/title:\s*['"]([^'"]+)['"]/)?.[1]
  const publishedAt = block.match(/publishedAt:\s*['"]([^'"]+)['"]/)?.[1]
  const faqsBlock = block.match(/faqs:\s*\[([\s\S]*?)\]/)?.[1]
  const faqs = faqsBlock
    ? [...faqsBlock.matchAll(/\{[^}]*?q:\s*['"]([^'"]*)['"][^}]*?a:\s*['"]([^'"]*)['"][^}]*?\}/g)].map(m => ({ q: m[1], a: m[2] }))
    : undefined
  const citationsBlock = block.match(/citations:\s*\[([\s\S]*?)\]/)?.[1]
  const citations = citationsBlock
    ? [...citationsBlock.matchAll(/\{[^}]*?url:\s*['"]([^'"]+)['"][^}]*?\}/g)].map(m => ({ url: m[1], label: m[0].match(/label:\s*['"]([^'"]+)['"]/)?.[1] ?? '' }))
    : undefined
  return { slug, title, publishedAt, faqs, citations }
}

async function main() {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const here = path.dirname(fileURLToPath(import.meta.url))
  const src = await fs.readFile(path.resolve(here, '..', 'src', 'frontend', 'src', 'data', 'blogPosts.ts'), 'utf-8')
  const postBlocks = src.split(/(?=\s*slug:\s*['"])/).slice(1)
  let bad = 0
  for (const block of postBlocks) {
    const post = parsePostBlock(block)
    if (!post) continue
    const r = validateBlogPostSchemas(post)
    if (!r.ok) {
      console.error(`❌ ${post.slug}:\n  ${r.errors.join('\n  ')}`)
      bad++
    }
  }
  if (bad > 0) {
    console.error(`\nGate E FAILED: ${bad} post(s) with invalid schema.`)
    process.exit(1)
  }
  console.log(`✅ Gate E: all ${postBlocks.length} posts validate (structural invariants hold).`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(2) })
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-blog-schemas.mjs scripts/validate-blog-schemas.test.mjs
git commit -m "feat(gates)(quick-298): Gate E — validate-blog-schemas.mjs structural invariants"
```

---

### Task 1.12 — `recheck-blog-citations.mjs` (quarterly scheduled re-check)

**Files:**
- Create: `/Users/jeet/arthaBuild/scripts/recheck-blog-citations.mjs`

- [ ] **Step 1: Create the script**

```bash
cat > /Users/jeet/arthaBuild/scripts/recheck-blog-citations.mjs <<'EOF'
#!/usr/bin/env node
/**
 * Quarterly link-rot re-check (quick-298).
 * Runs over ALL citations AND all team[].linkedin URLs. Writes a dated report.
 * Scheduled via macOS Calendar reminder at P4+90/180/270/360 days.
 *
 * Usage: node scripts/recheck-blog-citations.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyCitations } from './verify-blog-citations.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const BLOGPOSTS_PATH = path.join(repoRoot, 'src/frontend/src/data/blogPosts.ts')
const TEAM_PATH = path.join(repoRoot, 'src/frontend/src/data/team.ts')
const REPORT_DIR = path.join(repoRoot, '.planning/marketing')

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const reportPath = path.join(REPORT_DIR, `link-rot-${today}.md`)

  // Collect citations
  const blogSrc = await fs.readFile(BLOGPOSTS_PATH, 'utf-8')
  const posts = blogSrc.split(/(?=\s*slug:\s*['"])/).slice(1)
  const allCitations = []
  for (const block of posts) {
    const slug = block.match(/slug:\s*['"]([^'"]+)['"]/)?.[1]
    const citationsBlock = block.match(/citations:\s*\[([\s\S]*?)\]/)?.[1] ?? ''
    const urls = [...citationsBlock.matchAll(/url:\s*['"]([^'"]+)['"]/g)].map(m => m[1])
    for (const url of urls) allCitations.push({ label: `[${slug}] citation`, url })
  }

  // Collect team LinkedIn URLs
  const teamSrc = await fs.readFile(TEAM_PATH, 'utf-8')
  const liUrls = [...teamSrc.matchAll(/linkedin:\s*['"]([^'"]+)['"]/g)].map(m => ({ label: 'team.linkedin', url: m[1] }))
  allCitations.push(...liUrls)

  console.log(`Re-checking ${allCitations.length} URLs (${posts.length} posts + ${liUrls.length} LI URLs)…`)
  const { ok, failures } = await verifyCitations(allCitations)

  let report = `# Link-rot report — ${today}\n\n`
  report += `Checked: ${allCitations.length} URLs\n`
  report += `Failures: ${failures.length}\n\n`
  if (failures.length > 0) {
    report += `## Dead URLs\n\n`
    for (const f of failures) report += `- \`${f.label}\` → ${f.url} → HTTP ${f.status}${f.error ? ' — ' + f.error : ''}\n`
  } else {
    report += `✅ All URLs resolve.\n`
  }
  await fs.writeFile(reportPath, report)
  console.log(`Report written: ${reportPath}`)
  if (!ok) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(2) })
EOF
chmod +x /Users/jeet/arthaBuild/scripts/recheck-blog-citations.mjs
```

- [ ] **Step 2: Smoke-test (exit 0 on empty citations state)**

```bash
cd /Users/jeet/arthaBuild
node scripts/recheck-blog-citations.mjs
ls .planning/marketing/link-rot-*.md | head -1
```

- [ ] **Step 3: Commit**

```bash
git add scripts/recheck-blog-citations.mjs
git commit -m "feat(gates)(quick-298): recheck-blog-citations.mjs for quarterly scheduled re-check"
```

---

### Task 1.13 — Wire npm scripts + run full build

**Files:**
- Modify: `/Users/jeet/arthaBuild/package.json`

- [ ] **Step 1: Add script entries**

Edit `/Users/jeet/arthaBuild/package.json`, add to `"scripts"`:

```json
"gate:a": "node scripts/verify-blog-citations.mjs",
"gate:c": "node scripts/lint-blog-answer.mjs",
"gate:e": "node scripts/validate-blog-schemas.mjs",
"gate:recheck": "node scripts/recheck-blog-citations.mjs",
"gates:all": "npm run gate:a && npm run gate:c && npm run gate:e"
```

- [ ] **Step 2: Run `npm run gates:all`**

```bash
cd /Users/jeet/arthaBuild
npm run gates:all
```

Expected: all 3 gates exit 0 (nothing to fail yet — no posts have AEO fields).

- [ ] **Step 3: Run full build + test suite (one command — shell state does not persist across tool calls)**

```bash
cd /Users/jeet/arthaBuild && npm run build 2>&1 | tail -5 && cd src/frontend && npx vitest run 2>&1 | tail -10
```

Expected: build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/jeet/arthaBuild
git add package.json
git commit -m "feat(gates)(quick-298): npm scripts gate:a, gate:c, gate:e, gate:recheck, gates:all"
```

---

### Task 1.14 — End of Chunk 1 — Verify all 3 LinkedIn URLs (P0 completion blocker)

**Per spec §13: P0 cannot complete until all 3 LinkedIn URLs resolve to real profiles.**

Gate A (Task 1.8) now handles LinkedIn's 999-on-HEAD by falling back to `GET` + inspecting the HTML for `og:url` or `og:type=profile` markers. A URL that returns 999 on HEAD AND does NOT have profile markers on GET is a real broken URL (e.g., typo'd slug), not just rate-limiting.

- [ ] **Step 1: Run Gate A against the 3 LinkedIn URLs using the real Gate A implementation**

```bash
cd /Users/jeet/arthaBuild
node --input-type=module -e "
import('./scripts/verify-blog-citations.mjs').then(async m => {
  const li = [
    { label: 'Jithesh LI', url: 'https://www.linkedin.com/in/jiteshmanoharan/' },
    { label: 'Rajesh Nair LI', url: 'https://www.linkedin.com/in/rajesh-nair-356b671a2/' },
    { label: 'Ethan LI', url: 'https://www.linkedin.com/in/ethan-vreal-9a265b394/' },
  ]
  const r = await m.verifyCitations(li)
  if (!r.ok) { console.error('FAIL:', r.failures); process.exit(1) }
  console.log('All 3 LI URLs verified (HEAD or GET-fallback with profile markers)')
})
"
```

- [ ] **Step 2: Human browser check (irreducible manual verification)**

Gate A's HTML-marker check is heuristic — it can have false positives if LinkedIn serves a valid-looking "profile not found" page. Open each URL in a real browser and confirm you see:
- **Jithesh Manoharan** profile with NetSuite-related title
- **Rajesh Nair** profile
- **Ethan Vereal** profile (this is the most at-risk — spec §13 flags the `ethan-vreal-9a265b394` slug as a potential typo)

```bash
open https://www.linkedin.com/in/jiteshmanoharan/
open https://www.linkedin.com/in/rajesh-nair-356b671a2/
open https://www.linkedin.com/in/ethan-vreal-9a265b394/
```

If Ethan's URL lands on a 404 or shows the wrong person, STOP and ask Jeet (question in Step 4 below).

- [ ] **Step 3: Push Chunk 1 work to origin**

```bash
cd /Users/jeet/arthaBuild && git push origin main
```

- [ ] **Step 4: User approval gate — questions to Jeet**

**STOP execution here.** Ask:

1. Did Step 1 (Gate A) pass for all 3 LinkedIn URLs?
2. Did Step 2 (human browser check) confirm all 3 profiles belong to the correct people?
3. **Ethan LinkedIn URL resolution** — if `https://www.linkedin.com/in/ethan-vreal-9a265b394/` is wrong, pick one:
   - (a) Provide the correct slug → I'll update `team.ts` Step 2 of Task 1.2
   - (b) Remove Ethan from `team.ts` for P0 → re-ship with 2 team members, add Ethan later when slug is confirmed
   - (c) Proceed with the current URL and accept weaker E-E-A-T signal for Ethan-reviewed posts
4. Is the rest of `team.ts` data correct (names, titles, bios)?
5. **Jithesh headshot path** — when will you paste it? (14-day soft deadline from P0 ship per spec §16.)
6. Any AuthorPage rendering adjustments before Chunk 2 begins?

**Only proceed to Chunk 2 after Jeet answers Q3 explicitly** (the Ethan path matters — wrong URL in schema breaks E-E-A-T permanently until recrawled).

- [ ] **Step 5: Rollback-during-drift note**

Chunk 1 is safe to deploy in isolation. No user-visible change on the 84 existing posts (all AEO fields are `undefined`, BlogPost.tsx conditionally renders them). `/about` and `/about/:slug` are new but empty bio pages don't mislead users. If Chunk 2 is delayed >2 weeks:

- Run `npm run gates:all` weekly as a liveness check
- Re-run Task 1.14 Step 1 to catch LinkedIn URL drift
- No manual rollback needed — safe to leave live indefinitely

---

*(Chunks 2-5 will be added in subsequent revisions of this plan — dispatched for review first.)*
