# BrandMonkz Campaign Wizard — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Replace 5-step `CreateCampaignModal.tsx` with a 3-step wizard; fix AIChat dark theme

---

## Problem

The current campaign creation flow (5 steps: basics → content → audience → schedule → review) is too complex for Rajesh. He needs a "nursery kid" simple path: describe what he wants → AI writes it → pick who gets it → send.

Additionally, the AIChat sidebar uses hardcoded white/light backgrounds that are broken in the Indigo Noir dark theme.

---

## Solution Overview

Replace `CreateCampaignModal.tsx` with a new `CampaignWizard.tsx` component — a 3-step wizard that guides Rajesh through campaign creation with AI at the center. Modal width: 860px. Min-height: auto (grows to content).

---

## Step 1 — Write Your Email

**Left panel (50% width):**
- Section label: "Tell the AI what you want to say"
- `<textarea>` — free-text prompt, height 100px (e.g. "We are offering 20% off our cyber security training for NetSuite customers this month only")
- Tone pills: Professional (default selected) / Friendly / Urgent (maps to `'professional' | 'friendly' | 'persuasive'`)
- "✨ Write my email" CTA button — calls 3 AI endpoints sequentially (see Data Flow below)
- While generating: button shows spinner + "Generating…" text

**Right panel (50% width, visible after generation):**
- Section label: "AI Draft — edit anything"
- "🔄 Regenerate" link (top right of panel) — re-runs the same 3-step generation
- **Subject line:** `<input>` pre-filled from `generate-subject` variants[0] — fully editable
- **Email body:** `<textarea>` pre-filled from `generate-content` response `content` field — fully editable, height ~130px

**Progress bar:** 3 segments, segment 1 active (indigo), 2 and 3 inactive (glass)

**Footer:** "Next: Pick your group →" button — disabled until AI has generated content (subject + body both non-empty)

---

## Step 2 — Who Gets It?

**Group tiles grid (3 columns):**
- Fetched from `GET /api/companies` — each tile shows company `name` + contact count (`_count.contacts`)
- Each tile: emoji (auto-assigned by index or from color) + company name + "X contacts"
- Click to toggle selected — selected state: 2px indigo border + indigo background tint
- Multi-select supported
- Last tile: "+ Custom filter" dashed border — **disabled** (tooltip: "Coming soon"), no click action

**Summary bar (below grid):**
- "✅ N groups selected — X contacts will receive this email"
- Contact count = sum of `_count.contacts` across selected companies

**Empty state:** If user has no companies, show: "No groups yet — add contacts first" with a link to /contacts

**Footer:** "← Back" button + "Next: Review & Send →" button (disabled until ≥1 group selected)

---

## Step 3 — Review & Send

**4 summary cards (2×2 grid):**
1. **Campaign name** — auto-derived client-side: first 50 chars of subject line (editable `<input>` inline)
2. **Sending to** — comma-joined selected company names + total contact count
3. **Subject line** — as written in Step 1 (read-only `<p>` display)
4. **From address** — pre-filled with user profile email from `localStorage` (`crmUser.email`); "✏️ edit" link toggles to inline `<input>`. Note: from address is display-only in this version — the backend does not accept a `from_email` field. Stored in component state for future backend support.

**Send button:**
- Full-width, green gradient (`#10B981 → #059669`)
- Label: "🚀 Send Campaign to X People"
- Calls campaign creation API sequence (see Data Flow)

**Footer:** "← Back" button

**Error handling:** If creation fails, show inline error below send button (keep wizard open so user can retry).

---

## AI Generation Data Flow

When user clicks "✨ Write my email":

```
Step A — generate-basics:
  POST /api/campaigns/ai/generate-basics
  body: { tone, description: <user's prompt text> }
  response: { name, goal }
  → store: campaignName = data.name, campaignGoal = data.goal

Step B — generate-subject (uses goal from Step A):
  POST /api/campaigns/ai/generate-subject
  body: { goal: campaignGoal, tone, campaignName }
  response: { variants: string[] }
  → store: subject = data.variants[0]

Step C — generate-content (uses goal + subject from A/B):
  POST /api/campaigns/ai/generate-content
  body: { goal: campaignGoal, subject, tone, personalization: true }
  response: { content, previewText }
  → store: emailBody = data.content

All 3 run sequentially. If any fails, show inline error. User can retry via Regenerate.
```

---

## Campaign Creation Data Flow

When user clicks "🚀 Send Campaign":

```
Step 1 — create campaign:
  POST /api/campaigns
  body: { name: campaignName, subject, status: 'SENDING', htmlContent: emailBody }
  response: { campaign: { id, ... } }

Step 2 — link companies (one request per selected company):
  POST /api/campaigns/:id/companies/:companyId
  (loop over selectedCompanyIds)

On success → close wizard → call onSuccess() callback → show toast "Campaign sent!"
On failure → show inline error, keep wizard open
```

---

## AIChat Dark Theme Fix

File: `src/components/AIChat.tsx`

Replace all hardcoded light styles:

| Element | Current | Replacement |
|---------|---------|-------------|
| Outer container | `backgroundColor: 'white'` | `background: rgba(22,22,37,0.95), backdropFilter: blur(20px)` |
| Panel header | light bg | `background: rgba(22,22,37,0.98), borderBottom: '1px solid rgba(255,255,255,0.08)'` |
| Messages area | `bg-gray-50` (Tailwind) | inline: `background: rgba(255,255,255,0.02)` |
| Assistant bubble | `bg-white text-gray-800 border-gray-200` | inline: `background: rgba(255,255,255,0.06), color: #CBD5E1, border: 1px solid rgba(255,255,255,0.1)` |
| Input field | `bg-white border-gray-300` | inline: `background: rgba(255,255,255,0.06), border: 1px solid rgba(255,255,255,0.12), color: #F1F5F9` |
| Approval card | `bg-gradient-to-r from-green-50 to-orange-50 border-green-300` | inline: `background: rgba(99,102,241,0.12), border: 1px solid rgba(99,102,241,0.3)` |
| Loading dots | `bg-orange-600` | inline: `background: #6366F1` |
| Quick action buttons | `bg-orange-50 text-orange-700 border-orange-200` | inline: `background: rgba(99,102,241,0.15), color: #A5B4FC, border: 1px solid rgba(99,102,241,0.3)` |
| User bubble | already indigo gradient | keep as-is |

---

## Component Architecture

```
CampaignWizard.tsx    ← new file, single component (all 3 steps inline)
```

All 3 steps live as conditional sections within `CampaignWizard.tsx`. The component shares a single state object. No sub-files — the wizard is self-contained.

`CreateCampaignModal.tsx` is deleted after the wizard is wired up in `Campaigns.tsx`.

**Props interface (same as current modal):**
```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

---

## Backend Fix Required

**`generate-basics` must be updated to use the user's description.**

Current backend handler (`campaigns.ts:263`) reads only `tone` from the request body and uses a static AI prompt regardless of user input. The `description` field is silently ignored.

Fix: update the `generate-basics` AI prompt to interpolate `description` so the returned `name` and `goal` are relevant to what the user typed. This is a 2-line backend change. Without it, Step A of the generation always produces generic B2B output, making the whole wizard experience worse than it should be.

---

## What Is NOT Changing

- Campaign list page (`Campaigns.tsx`) — only the "New Campaign" button wiring changes (swap component)
- Scheduling — send-now only in this version (no scheduledAt)
- Backend API endpoints — reuse all existing endpoints as documented above
- A/B testing, HTML mode, content mode — removed (YAGNI; wizard is the simple path)

---

## Success Criteria

1. Wizard reaches the send button in exactly 3 user interactions: "Write my email" click → group tile click → "Send Campaign" click
2. AI subject and body are both editable before sending
3. FROM address is displayed and editable inline in Step 3
4. Selected companies' contact counts sum correctly in the summary bar
5. AIChat sidebar: no white or light-colored panels visible in dark mode
6. Campaign is created in the backend with correct `name`, `subject`, `htmlContent`, and linked companies
