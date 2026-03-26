# BrandMonkz Campaign Wizard — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Replace 5-step CreateCampaignModal with a 3-step wizard; fix AIChat dark theme

---

## Problem

The current campaign creation flow (5 steps: basics → content → audience → schedule → review) is too complex for Rajesh. He needs a "nursery kid" simple path: describe what he wants → AI writes it → pick who gets it → send.

Additionally, the AIChat sidebar uses hardcoded white/light backgrounds that are broken in the Indigo Noir dark theme.

---

## Solution Overview

Replace `CreateCampaignModal.tsx` with a new `CampaignWizard.tsx` component — a 3-step wizard that guides Rajesh through campaign creation with AI at the center.

---

## Step 1 — Write Your Email

**Left panel:**
- Section label: "Tell the AI what you want to say"
- `<textarea>` — free-text prompt (e.g. "We are offering 20% off our cyber security training for NetSuite customers this month only")
- Tone selector — pill buttons: Professional (default selected) / Friendly / Urgent
- "✨ Write my email" CTA button — calls `/api/campaigns/ai/generate-content` with the prompt + tone

**Right panel (appears after AI generates):**
- Section label: "AI Draft — edit anything"
- "🔄 Regenerate" link (top right) — re-calls AI with same prompt
- Subject line: `<input>` pre-filled with AI subject — fully editable
- Email body: `<textarea>` pre-filled with AI body — fully editable (height ~130px)

**Progress bar:** 3 segments, segment 1 active (indigo), 2 and 3 inactive (glass)

**Footer:** "Next: Pick your group →" button (enabled only after AI has generated content)

---

## Step 2 — Who Gets It?

**Group tiles grid (3 columns):**
- Fetched from existing API: company tags / contact segments
- Each tile: emoji + group name + contact count
- Selected state: indigo border + indigo background tint
- Multi-select supported
- Last tile: "+ Custom filter" (dashed border, opens existing filter UI or disabled for now)

**Summary bar (below grid):**
- "✅ N groups selected — X contacts will receive this email"
- Contact count sums across selected groups

**Footer:** Back button + "Next: Review & Send →" button

---

## Step 3 — Review & Send

**4 summary cards (2×2 grid):**
1. Campaign name — auto-generated from AI subject (editable inline)
2. Sending to — group name + contact count
3. Subject line — as written in Step 1 (read-only preview)
4. From address — pre-filled with user's account email; "✏️ edit" link opens inline `<input>`

**Send button:**
- Full-width, green gradient (`#10B981 → #059669`)
- Label: "🚀 Send Campaign to X People"
- Calls existing campaign send endpoint

**Footer:** Back button

---

## AIChat Dark Theme Fix

File: `src/components/AIChat.tsx`

Replace all hardcoded light styles:
| Current | Replacement |
|---------|-------------|
| `backgroundColor: 'white'` | `rgba(22, 22, 37, 0.95)` |
| `bg-white` | inline dark glass style |
| `bg-gray-50` | `rgba(255,255,255,0.04)` |
| `border-gray-200` | `rgba(255,255,255,0.08)` |
| Assistant message bubble `bg-white text-gray-800` | dark glass bubble with `color: #CBD5E1` |
| Input field `bg-white border-gray-300` | dark glass input |
| Panel header white | dark glass header matching Sidebar style |

---

## Data Flow

```
User types prompt
  → "Write my email" click
  → POST /api/campaigns/ai/generate-content { prompt, tone }
  → Returns { subject, body }
  → Pre-fills editable subject input + body textarea

User edits freely, picks tone, clicks Regenerate if needed

Step 2: GET /api/contacts/tags or /api/companies
  → Render group tiles with name + count

Step 3: User clicks Send
  → POST /api/campaigns { name, subject, body, from_email, group_ids }
  → Success → close wizard, show toast
```

---

## Component Architecture

```
CampaignWizard.tsx          ← new file, replaces CreateCampaignModal.tsx
├── WizardStep1.tsx         ← email writing panel (or inline section)
├── WizardStep2.tsx         ← group tile selector (or inline section)
└── WizardStep3.tsx         ← review + send (or inline section)
```

Steps can be inline sections within `CampaignWizard.tsx` rather than separate files — keep it simple unless file grows unwieldy.

The wizard renders as a modal overlay (same as current modal, same backdrop). All 3 steps share the same modal shell; only the body content swaps.

---

## What Is NOT Changing

- Campaign list page (`Campaigns.tsx`) — unchanged
- Scheduling (send now only — schedule feature removed from wizard for simplicity; can be added later)
- Backend API endpoints — reuse existing AI generation + campaign creation endpoints
- Existing `CreateCampaignModal.tsx` — replaced, not modified (delete old file after wizard works)

---

## Success Criteria

1. Rajesh can create and send a campaign in under 2 minutes
2. AI writes the email — Rajesh only types one sentence of context
3. Email subject and body are both editable before sending
4. FROM address is editable in Step 3
5. Audience groups show real contact counts
6. AIChat sidebar matches the dark theme — no white panels visible
