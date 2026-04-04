# BrandMonkz — Follow-up Campaign Wizard Design

**Date:** 2026-04-03  
**Status:** Approved  
**Project:** BrandMonkz CRM (brandmonkz.com)  
**Backend:** `/var/www/crm-backend/dist/routes/campaigns.js` (PM2: `crm-backend`)  
**Frontend source:** `/var/www/crm-backend/frontend/src/`

---

## Problem

After sending a campaign, there is no structured way to follow up with engaged contacts (openers and clickers). The existing follow-up plumbing in `CampaignWizard.tsx` pre-fills a generic template but has no intelligence — it doesn't know who engaged, why they might care, or what to say to them specifically. Follow-ups end up generic and miss the high-intent window.

---

## Goal

Build a **Follow-up Campaign Wizard** that:
1. Identifies engaged contacts from a sent campaign (clickers and openers)
2. Uses AI (Claude API) to generate per-company intelligence briefs — why each company is worth following up with, what angle to use, and a suggested subject line
3. Pre-populates the wizard with the right segment, template, and AI-written context
4. Sends a targeted, personalized follow-up — not a blast

---

## Architecture

### Existing Infrastructure (reused)
- `CampaignWizard.tsx` — 4-step wizard (compose → audience → review → sent). Follow-up wizard extends this.
- `EmailLog` model — has `contactId`, `campaignId`, `status` (OPENED/CLICKED), `openedAt`, `clickedAt`, `totalOpens`, `engagementScore`
- `Company` model — has `industry`, `size`, `intent`, `hiringInfo`, `pitch`, `description`
- `Contact` model — has `role`, `title`, `bio`, `skills`. Note: `email` is `String?` (optional).
- sessionStorage handoff pattern — existing stub uses key `followUpCampaign`. This feature uses a distinct key: `followUpSource`.

### New Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `FollowUpWizard.tsx` | `frontend/src/components/FollowUpWizard.tsx` | New wizard component (mirrors CampaignWizard) |
| `GET /api/campaigns/:id/engaged-contacts` | `campaigns.js` | Returns contacts grouped by CLICKED / OPENED with company data |
| `POST /api/campaigns/:id/ai-intel` | `campaigns.js` | Claude API call — generates per-company brief |

### Claude API Key
The backend must have `ANTHROPIC_API_KEY` set as an environment variable (PM2 env or `.env` file). If missing, the `ai-intel` endpoint returns `{ error: "AI unavailable" }` and the wizard continues without the intel panel. Check with: `pm2 env 0 | grep ANTHROPIC`.

---

## Feature Spec

### 1. Trigger — "Send Follow-up" Button

**Location:** `CampaignsPage.tsx` — on each sent campaign card that has `openedCount > 0 OR clickedCount > 0`

**Placement:** Next to the existing "View Full Report" button.

**On click:**
1. Fetch `GET /api/campaigns/:id/engaged-contacts`
2. Store response + source campaign metadata in `sessionStorage` under key `followUpSource` (distinct from the existing `followUpCampaign` key used by the old stub)
3. Open `FollowUpWizard` modal

**Button label:** `Send Follow-up`  
**Icon:** `ArrowUturnRightIcon` (Heroicons)

---

### 2. Follow-up Wizard — Step 1: Intelligence + Segment

**Layout:** Two-column panel inside the wizard modal.

#### Left Column — Segment Picker
Three segment buttons:
- **Clickers (N)** — contacts whose highest-priority status for this campaign is CLICKED. High intent.
- **Openers (N)** — contacts whose highest-priority status is OPENED (did not click). Mild interest.
- **All Engaged (N)** — both combined.

**Segment counts exclude contacts with no email address** (`contact.email = null`). These contacts cannot be emailed, so they are filtered out before display. The count shown on the button is the emailable count only.

Selecting a segment triggers the AI Intel call for that segment's companies.

#### Right Column — AI Intelligence Brief

Triggered when a segment is selected. Calls `POST /api/campaigns/:id/ai-intel` with:
```json
{
  "segment": "CLICKED" | "OPENED" | "ALL",
  "companies": [
    {
      "id": "...",
      "name": "...",
      "industry": "...",
      "size": "...",
      "intent": "...",
      "hiringInfo": "...",
      "pitch": "...",
      "engagementSignal": {
        "status": "CLICKED",
        "totalOpens": 3,
        "clickedAt": "2026-04-02T10:30:00Z",
        "engagementScore": 82
      }
    }
  ]
}
```

**Contacts with no linked company are excluded from the AI call.** They are still included in the segment and will receive the generic template, but the AI brief panel only renders cards for companies that exist.

**AI prompt strategy (per company):**
- System: "You are an outbound sales intelligence engine for TechCloudPro, a NetSuite staffing firm. Generate a concise follow-up brief."
- Input: company profile + engagement signal
- Output per company:
  - `whyFollowUp` — 1–2 sentences: why this company is worth contacting now
  - `suggestedAngle` — the messaging angle (e.g. "contract flexibility", "cost vs hire")
  - `suggestedSubject` — personalized subject line, shown **as a suggestion only** in the AI panel. Does NOT override the pre-filled template subject in the compose step — the user can copy it manually.
  - `urgencySignal` — e.g. "Clicked 2 days ago — follow-up window is now"

**UI per company card (right panel):**
```
[Company Name] · [Industry] · [Size]
────────────────────────────────────
Why follow up: [whyFollowUp]
Angle: [suggestedAngle]
Suggested subject: [suggestedSubject]
Signal: [urgencySignal]
```

Loading state: spinner with "Analyzing 5 companies..." while Claude call is in flight.

---

### 3. Wizard Steps 2–4

Identical to `CampaignWizard` with these differences:

| Field | Behavior |
|-------|---------|
| Campaign name | Pre-filled: `Follow-up: [original campaign name]` |
| Subject | Pre-filled from AI's `suggestedSubject` for the dominant company (editable) |
| Email body | Pre-filled with segment-appropriate template (see Templates section) |
| Company list | **Pre-selected and locked** to the chosen segment's companies. No add/remove. |
| Content source | Defaults to `staffing` tab, showing the pre-filled follow-up template |

**Locked company list rationale:** This is a targeted follow-up, not a new blast. The whole point is precision. Adding random companies defeats the intelligence.

---

### 4. Templates

Two templates stored in `EmailServerConfig` / staffing templates, or hardcoded in wizard:

Templates are hardcoded in `FollowUpWizard.tsx`. The **original campaign name** (e.g. `"NetSuite Campaign — Subject #1"`) is passed via sessionStorage and used verbatim as `campaignTopic` — no transformation, no truncation. It is pre-substituted in the subject and body strings before the campaign is saved (i.e., the literal `{{campaignTopic}}` placeholder never reaches the send loop or DB).

**`{{companyName}}` fallback for contacts with no company:** If `contact.companyId` is null, substitute `{{companyName}}` with `contact.firstName + " " + contact.lastName` (e.g. `"John Smith"`). This applies to both template rendering and subject line pre-fill.

#### Clickers Template (high intent)
- **Subject:** `Following up on {{campaignTopic}} — resources for {{companyName}}`
- **Opening:** Acknowledges their interest without referencing the open/click explicitly
- **Body:** Leads with contract flexibility + pre-vetted engineers. Asks for 15-min call.
- **CTA button:** `Schedule a 15-Min Call` → Peter's Calendly link (hardcoded URL, TBD from Peter)
- **Sign-off:** Peter Varghese, TechCloudPro

#### Openers Template (mild interest)
- **Subject:** `One thought on {{campaignTopic}} for {{companyName}}`
- **Opening:** Soft re-engagement — new angle, not a repeat
- **Body:** Contract-vs-full-hire value prop. No pressure CTA.
- **CTA:** `Reply to this email` (soft ask — no button, just a hyperlink)
- **Sign-off:** Peter Varghese, TechCloudPro

Both templates support `{{firstName}}`, `{{companyName}}`, `{{role}}`, `{{campaignTopic}}` merge tags (existing send loop handles `{{firstName}}`, `{{companyName}}`, `{{role}}`; `{{campaignTopic}}` is pre-substituted before save).

---

### 5. Backend Endpoints

#### `GET /api/campaigns/:id/engaged-contacts`

**Auth:** Bearer JWT (existing middleware)

**Response:**
```json
{
  "campaignId": "...",
  "campaignName": "NetSuite Campaign",
  "campaignSubject": "...",
  "segments": {
    "clicked": [
      {
        "contactId": "...",
        "email": "...",
        "firstName": "...",
        "lastName": "...",
        "role": "...",
        "company": {
          "id": "...",
          "name": "...",
          "industry": "...",
          "size": "...",
          "intent": "...",
          "hiringInfo": "...",
          "pitch": "..."
        },
        "engagementSignal": {
          "status": "CLICKED",
          "totalOpens": 2,
          "openedAt": "...",
          "clickedAt": "...",
          "engagementScore": 85
        }
      }
    ],
    "opened": [ ... ]
  },
  "totals": {
    "clicked": 22,
    "opened": 47,
    "allEngaged": 69
  }
}
```

**Query strategy — prioritizing CLICKED over OPENED:**

A contact who clicked will have multiple EmailLog rows for the same campaign (SENT → OPENED → CLICKED). Using `distinct: ['contactId']` alone is non-deterministic. The correct approach:

```javascript
// Step 1: Get all OPENED and CLICKED logs for the campaign
const logs = await prisma.emailLog.findMany({
  where: { campaignId: id, status: { in: ['OPENED', 'CLICKED'] } },
  include: { contact: { include: { company: true } } },
  orderBy: { status: 'desc' } // SENT < OPENED < CLICKED alphabetically — not reliable
});

// Step 2: Deduplicate by contactId, keeping CLICKED over OPENED
const byContact = new Map();
for (const log of logs) {
  const existing = byContact.get(log.contactId);
  if (!existing || log.status === 'CLICKED') {
    byContact.set(log.contactId, log);
  }
}
const deduped = Array.from(byContact.values());

// Step 3: Filter out contacts with no email
const emailable = deduped.filter(l => l.contact?.email);

// Step 4: Split into segments
const clicked = emailable.filter(l => l.status === 'CLICKED');
const opened  = emailable.filter(l => l.status === 'OPENED');
```

#### `POST /api/campaigns/:id/ai-intel`

**Auth:** Bearer JWT

**Input:** `{ segment, companies[] }` (see above)

**Processing:** Single Claude API call with all companies batched. Returns array of per-company briefs.

**Model:** `claude-haiku-4-5-20251001` (correct full model ID per this project's Anthropic SDK version — confirmed in system environment context)

**Claude API key:** Read from `process.env.ANTHROPIC_API_KEY`. If missing or call fails, endpoint returns `{ intel: [], error: "AI unavailable" }` with HTTP 200 — the wizard renders an "Intelligence unavailable" notice and lets the user proceed without it. Never block the wizard on AI failure.

**Locked company list UI:** The company list in Step 2 shows a read-only list of company names with contact counts. No checkboxes, no add/remove UI. A note reads: "These contacts engaged with your original campaign. Remove this follow-up and start a new campaign if you need a different audience." Contacts with `companyId = null` are grouped under "Individual Contacts" at the bottom of the list.

---

### 6. Data Flow

```
User clicks "Send Follow-up" on campaign card
  → GET /api/campaigns/:id/engaged-contacts
  → sessionStorage('followUpSource') = { campaign, segments, totals }
  → FollowUpWizard opens

Step 1: User picks segment
  → POST /api/campaigns/:id/ai-intel (with selected segment's companies)
  → AI brief renders per company
  → Subject/body pre-filled from AI suggestion + template

Steps 2–4: Standard wizard flow
  → Companies locked to segment
  → Review & throttled send (1/min via Peter's SMTP)
  → Campaign saved with name "Follow-up: [original]"
```

---

### 7. Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/components/FollowUpWizard.tsx` | Create — new wizard component |
| `frontend/src/pages/Campaigns/CampaignsPage.tsx` | Modify — add "Send Follow-up" button + `FollowUpWizard` import |
| `dist/routes/campaigns.js` | Modify — add 2 new endpoints |
| `frontend/src/components/CampaignWizard.tsx` | No change — existing wizard untouched |

---

### 8. Out of Scope

- Website pixel / page visit tracking (not in current DB)
- Per-contact subject line personalization (one subject per send)
- A/B testing follow-up templates
- Scheduled follow-up sends (future)

---

## Success Criteria

1. "Send Follow-up" button visible on all sent campaigns with engagement
2. Engaged contacts correctly split into CLICKED / OPENED segments
3. AI brief generates in < 5 seconds and shows per-company intelligence
4. Wizard pre-fills subject, body, and company list from segment + AI
5. Company list is locked — no accidental blasts to non-engaged contacts
6. Send goes through the existing `POST /:id/send` endpoint — **sequential send, no artificial delay** (the existing loop has no throttle). Audience is ≤70 contacts so volume is safe for Peter's Office365 account. Campaign saved with "Follow-up:" prefix.
7. If AI call fails, wizard still works without intel panel
