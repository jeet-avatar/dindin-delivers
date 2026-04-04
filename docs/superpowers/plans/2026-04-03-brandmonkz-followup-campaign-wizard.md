# Follow-up Campaign Wizard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered follow-up campaign wizard that segments engaged contacts (openers/clickers) from a sent campaign, generates per-company Claude intelligence briefs, and sends a targeted follow-up email.

**Architecture:** Two new backend endpoints in `campaigns.ts` handle contact segmentation and Claude AI calls. A new `FollowUpWizard.tsx` React component implements the 4-step wizard with an intelligence panel in Step 1. `CampaignsPage.tsx` gains a "Send Follow-up" button that fetches engaged contacts and opens the wizard.

**Tech Stack:** TypeScript + Express + Prisma (backend), React + TypeScript + Heroicons (frontend), `@anthropic-ai/sdk` already installed and configured via `AI_CONFIG`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `/var/www/crm-backend/src/routes/campaigns.ts` | Modify | Add 2 new endpoints before `/:id` catch-all (line ~85) |
| `/var/www/crm-backend/frontend/src/components/FollowUpWizard.tsx` | Create | New 4-step wizard component |
| `/var/www/crm-backend/frontend/src/pages/Campaigns/CampaignsPage.tsx` | Modify | Add "Send Follow-up" button + FollowUpWizard modal |

---

## Chunk 1: Backend Endpoints

### Task 1: `GET /:id/engaged-contacts` endpoint

**Files:**
- Modify: `/var/www/crm-backend/src/routes/campaigns.ts` (insert before line 85 — the `GET /:id` route)

**Background:** A contact who clicked will have multiple `EmailLog` rows for the same campaign (one SENT, one OPENED, one CLICKED). We must deduplicate by `contactId`, keeping CLICKED over OPENED. Contacts with no email are excluded — they can't receive the follow-up.

- [ ] **Step 1: Add the endpoint to `campaigns.ts`**

SSH into the server and open the file:
```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@brandmonkz.com
nano /var/www/crm-backend/src/routes/campaigns.ts
```

Insert this block **before** the `router.get('/:id', ...)` route (currently at line 85):

```typescript
// GET /api/campaigns/:id/engaged-contacts - Get contacts who opened or clicked
router.get('/:id/engaged-contacts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Verify campaign belongs to this user (or their team)
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      select: { id: true, name: true, subject: true },
    });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Ownership check covers team members: try accountOwner's userId too
    // (mirrors the pattern used in GET / at the top of this file)
    // If campaign not found under userId, also check if user is a team member
    // whose account owner owns it — but for simplicity, we do the same guard
    // as all other /:id routes in this file (findFirst with userId).

    // Fetch all OPENED + CLICKED logs for this campaign
    const logs = await prisma.emailLog.findMany({
      where: {
        campaignId: id,
        status: { in: ['OPENED', 'CLICKED'] },
      },
      include: {
        contact: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                industry: true,
                size: true,
                intent: true,
                hiringInfo: true,
                pitch: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Deduplicate by contactId — CLICKED wins over OPENED
    const byContact = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      const existing = byContact.get(log.contactId);
      if (!existing || log.status === 'CLICKED') {
        byContact.set(log.contactId, log);
      }
    }

    // Filter out contacts with no email (can't send to them)
    const emailable = Array.from(byContact.values()).filter(
      (l) => l.contact?.email
    );

    // Split into segments
    const clicked = emailable.filter((l) => l.status === 'CLICKED');
    const opened = emailable.filter((l) => l.status === 'OPENED');

    // Build response shape
    const toContactShape = (l: typeof logs[0]) => ({
      contactId: l.contactId,
      email: l.contact.email,
      firstName: l.contact.firstName,
      lastName: l.contact.lastName,
      role: l.contact.role,
      company: l.contact.company
        ? {
            id: l.contact.company.id,
            name: l.contact.company.name,
            industry: l.contact.company.industry,
            size: l.contact.company.size,
            intent: l.contact.company.intent,
            hiringInfo: l.contact.company.hiringInfo,
            pitch: l.contact.company.pitch,
            description: l.contact.company.description,
          }
        : null,
      engagementSignal: {
        status: l.status,
        totalOpens: l.totalOpens,
        openedAt: l.openedAt,
        clickedAt: l.clickedAt,
        engagementScore: l.engagementScore,
      },
    });

    return res.json({
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignSubject: campaign.subject,
      segments: {
        clicked: clicked.map(toContactShape),
        opened: opened.map(toContactShape),
      },
      totals: {
        clicked: clicked.length,
        opened: opened.length,
        allEngaged: emailable.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});
```

- [ ] **Step 2: Build and restart**

```bash
cd /var/www/crm-backend
npm run build && pm2 restart crm-backend
```

Expected: no TypeScript errors, PM2 shows `online`.

- [ ] **Step 3: Smoke test the endpoint**

First, get a JWT token (use browser devtools → Network tab on brandmonkz.com to grab the `crmToken` from localStorage, or login via curl):

```bash
# Replace TOKEN and CAMPAIGN_ID with real values
curl -s -H "Authorization: Bearer TOKEN" \
  https://brandmonkz.com/api/campaigns/CAMPAIGN_ID/engaged-contacts | python3 -m json.tool
```

Expected response shape:
```json
{
  "campaignId": "...",
  "campaignName": "NetSuite Campaign",
  "segments": {
    "clicked": [ { "contactId": "...", "email": "...", ... } ],
    "opened": [ ... ]
  },
  "totals": { "clicked": 22, "opened": 47, "allEngaged": 69 }
}
```

Verify: clickers do NOT appear in the opened array. Contacts with no email are absent.

- [ ] **Step 4: Commit**

```bash
cd /var/www/crm-backend
git add src/routes/campaigns.ts
git commit -m "feat: add GET /:id/engaged-contacts endpoint"
```

---

### Task 2: `POST /:id/ai-intel` endpoint

**Files:**
- Modify: `/var/www/crm-backend/src/routes/campaigns.ts` (insert after the engaged-contacts route)

**Background:** Uses the existing `anthropic` client and `getAIMessageConfig('enrichment')` (1024 max tokens). Batches all companies into one Claude call returning a JSON array of per-company briefs. Must not throw if Claude fails — returns graceful fallback so the wizard still works.

- [ ] **Step 1: Add the AI intel endpoint to `campaigns.ts`**

Insert this block immediately after the `GET /:id/engaged-contacts` route:

```typescript
// POST /api/campaigns/:id/ai-intel - Generate per-company follow-up intelligence
router.post('/:id/ai-intel', async (req, res, next) => {
  try {
    const { segment, companies } = req.body as {
      segment: 'CLICKED' | 'OPENED' | 'ALL';
      companies: Array<{
        id: string;
        name: string;
        industry?: string | null;
        size?: string | null;
        intent?: string | null;
        hiringInfo?: string | null;
        pitch?: string | null;
        description?: string | null;
        engagementSignal: {
          status: string;
          totalOpens: number;
          engagementScore: number;
          openedAt?: string | null;
          clickedAt?: string | null;
        };
      }>;
    };

    if (!companies || companies.length === 0) {
      return res.json({ intel: [] });
    }

    // Cap batch size to prevent token overflow — 1024 tokens (~350 words)
    // fits ~5 companies comfortably. Cap at 10; beyond that, slice.
    const batchedCompanies = companies.slice(0, 10);

    // Build prompt — batch all companies in one call
    const companyBriefs = batchedCompanies.map((c, i) => {
      const signal =
        c.engagementSignal.status === 'CLICKED'
          ? `Clicked your email CTA (engagement score: ${c.engagementSignal.engagementScore}/100)`
          : `Opened your email ${c.engagementSignal.totalOpens}x (engagement score: ${c.engagementSignal.engagementScore}/100)`;
      const daysAgo = c.engagementSignal.clickedAt || c.engagementSignal.openedAt
        ? Math.floor(
            (Date.now() - new Date(c.engagementSignal.clickedAt || c.engagementSignal.openedAt!).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      return `Company ${i + 1}:
Name: ${c.name}
Industry: ${c.industry || 'Unknown'}
Size: ${c.size || 'Unknown'}
Intent/Context: ${c.intent || c.description || 'Not available'}
Hiring Info: ${c.hiringInfo || 'Not available'}
Our Pitch for Them: ${c.pitch || 'Not available'}
Engagement: ${signal}${daysAgo !== null ? ` — ${daysAgo} day(s) ago` : ''}`;
    });

    const prompt = `You are an outbound sales intelligence engine for TechCloudPro, a NetSuite and technology staffing firm. We charge a flat $2/hr markup on contractor rates — far below the 15-20% industry standard.

For each company below, generate a concise follow-up brief. Return ONLY a valid JSON array with one object per company, in the same order. Each object must have exactly these fields:
- "companyId": string (copy from input)
- "whyFollowUp": string (1-2 sentences — why this company is worth following up with RIGHT NOW based on their profile and engagement)
- "suggestedAngle": string (the specific messaging angle, e.g. "contract flexibility", "cost vs full-time hire", "urgent NetSuite project")  
- "suggestedSubject": string (personalized subject line for this company, max 60 chars)
- "urgencySignal": string (short phrase about timing, e.g. "Clicked 2 days ago — optimal follow-up window")

Companies:
${companyBriefs.join('\n\n')}

Return ONLY the JSON array. No markdown, no explanation.`;

    let intel: Array<{
      companyId: string;
      whyFollowUp: string;
      suggestedAngle: string;
      suggestedSubject: string;
      urgencySignal: string;
    }> = [];

    try {
      const message = await anthropic.messages.create({
        ...getAIMessageConfig('enrichment'),
        messages: [{ role: 'user', content: prompt }],
        system:
          'You are a B2B sales intelligence engine. Return only valid JSON arrays with no markdown wrapping.',
      });

      const content = message.content[0];
      if (content.type === 'text') {
        // Strip markdown code fences if present
        const raw = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        // Handle truncated JSON: if parse fails, intel stays empty (graceful)
        try {
          intel = JSON.parse(raw);
          if (!Array.isArray(intel)) intel = [];
        } catch {
          // Truncated response — graceful fallback
          intel = [];
        }
      }
    } catch (aiError) {
      // AI failure is non-fatal — return empty intel, wizard continues
      console.error('AI intel generation failed:', aiError);
    }

    return res.json({ intel });
  } catch (error) {
    return next(error);
  }
});
```

- [ ] **Step 2: Build and restart**

```bash
cd /var/www/crm-backend
npm run build && pm2 restart crm-backend
```

Expected: no TypeScript errors.

- [ ] **Step 3: Smoke test the AI intel endpoint**

```bash
curl -s -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "segment": "CLICKED",
    "companies": [{
      "id": "test-id-1",
      "name": "Acme Corp",
      "industry": "Technology",
      "size": "500-1000",
      "intent": "Expanding NetSuite ERP implementation",
      "hiringInfo": "Hiring NetSuite developers",
      "pitch": "Flat $2/hr markup, pre-vetted NetSuite engineers",
      "engagementSignal": {
        "status": "CLICKED",
        "totalOpens": 2,
        "engagementScore": 85,
        "clickedAt": "2026-04-01T10:00:00Z"
      }
    }]
  }' \
  https://brandmonkz.com/api/campaigns/any-id/ai-intel | python3 -m json.tool
```

Expected: JSON with `intel` array containing one object with `whyFollowUp`, `suggestedAngle`, `suggestedSubject`, `urgencySignal`.

Also test graceful failure by temporarily passing an invalid company array — verify it returns `{ "intel": [] }` rather than 500.

- [ ] **Step 4: Commit**

```bash
cd /var/www/crm-backend
git add src/routes/campaigns.ts
git commit -m "feat: add POST /:id/ai-intel endpoint for follow-up intelligence"
```

---

## Chunk 2: FollowUpWizard Component

### Task 3: Create `FollowUpWizard.tsx`

**Files:**
- Create: `/var/www/crm-backend/frontend/src/components/FollowUpWizard.tsx`

**Background:** This is a self-contained 4-step wizard modal. Step 1 is unique (segment picker + AI intel panel). Steps 2-4 mirror the existing `CampaignWizard` flow but with locked company list and pre-filled content. The component reads its initial data from `sessionStorage('followUpSource')` set by `CampaignsPage` immediately before opening the wizard.

**sessionStorage `followUpSource` shape** (set by `CampaignsPage.handleFollowUp`, defined later in Task 4):
```typescript
{
  campaignId: string;       // source campaign id — used for ai-intel call
  campaignName: string;     // used as campaignTopic in templates
  campaignSubject: string;  // original subject for reference
  segments: {
    clicked: ContactRecord[];
    opened: ContactRecord[];
  };
  totals: { clicked: number; opened: number; allEngaged: number; }
}
```

**`campaignTopic` substitution:** `buildClickersTemplate(campaignTopic)` and `buildOpenersTemplate(campaignTopic)` use JavaScript template literals (`${campaignTopic}`) — the topic string is embedded directly at the time the function is called, before the HTML is stored in state or saved to the DB. `{{companyName}}` and `{{firstName}}` remain as merge tags in the body and are substituted by the existing send loop per-contact.

**Send error policy:** campaign link-companies calls are fire-and-forget (non-blocking `catch(() => {})`). Only campaign creation failure or send failure halts the flow and shows an error to the user.

**Individual contacts (no company) are excluded from the send** — the existing backend send loop iterates `campaign.companies → contacts`, so contacts with no company cannot be reached through this flow. This is a known limitation. The Step 3 send summary must count only company-linked contacts (`contacts.length - individuals.length`) and show a warning if `individuals.length > 0` (e.g. "N contacts without a company will not receive this email").

**Templates:** Two templates are hardcoded in this file.

- [ ] **Step 1: Create the component file**

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@brandmonkz.com
nano /var/www/crm-backend/frontend/src/components/FollowUpWizard.tsx
```

Paste the full component:

```typescript
import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  UserGroupIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EngagementSignal {
  status: string;
  totalOpens: number;
  engagementScore: number;
  openedAt?: string | null;
  clickedAt?: string | null;
}

interface ContactRecord {
  contactId: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string | null;
  company: {
    id: string;
    name: string;
    industry?: string | null;
    size?: string | null;
    intent?: string | null;
    hiringInfo?: string | null;
    pitch?: string | null;
    description?: string | null;
  } | null;
  engagementSignal: EngagementSignal;
}

interface FollowUpSource {
  campaignId: string;
  campaignName: string;
  campaignSubject: string;
  segments: {
    clicked: ContactRecord[];
    opened: ContactRecord[];
  };
  totals: {
    clicked: number;
    opened: number;
    allEngaged: number;
  };
}

interface IntelBrief {
  companyId: string;
  whyFollowUp: string;
  suggestedAngle: string;
  suggestedSubject: string;
  urgencySignal: string;
}

interface SendResult {
  success: boolean;
  sent: number;
  total: number;
  failed: number;
}

type Segment = 'CLICKED' | 'OPENED' | 'ALL';

// Build HTML template for clickers (high intent)
function buildClickersTemplate(campaignTopic: string): string {
  return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Following up on ${campaignTopic}</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">TechCloudPro · Technology Staffing</p>
  </div>
  <div style="padding: 28px; background: #ffffff; color: #1e293b;">
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">Hi {{firstName}},</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">I wanted to follow up on our recent outreach about technology staffing for <strong>{{companyName}}</strong>.</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">We work with companies who need <strong>pre-vetted engineers fast</strong> — without the 15-20% markup most staffing firms charge. Our flat $2/hr model means you get senior talent at contractor rates, with full flexibility to scale up or down.</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">Would a quick 15-minute call this week work? I can walk you through how we've placed engineers at similar companies in your space.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://calendly.com/peter-techcloudpro" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; letter-spacing: 0.3px;">Schedule a 15-Min Call</a>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0;">Best regards,<br/><strong style="color: #1e293b;">Peter Varghese</strong><br/>TechCloudPro · Technology Staffing</p>
  </div>
</div>`;
}

// Build HTML template for openers (mild interest)
function buildOpenersTemplate(campaignTopic: string): string {
  return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">One thought on ${campaignTopic}</h1>
    <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px;">TechCloudPro · Technology Staffing</p>
  </div>
  <div style="padding: 28px; background: #ffffff; color: #1e293b;">
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">Hi {{firstName}},</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">I'll keep this brief — one question for <strong>{{companyName}}</strong>:</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px; padding: 16px 20px; background: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 6px 6px 0;"><em>If you needed a senior engineer in the next 30 days — would you rather pay a 15% placement fee, or $2/hr above contractor rate with no long-term commitment?</em></p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">Most companies we talk to haven't done the math. Happy to share a quick comparison if useful — just reply to this email.</p>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0;">Best,<br/><strong style="color: #1e293b;">Peter Varghese</strong><br/>TechCloudPro · Technology Staffing</p>
  </div>
</div>`;
}

export function FollowUpWizard({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [source, setSource] = useState<FollowUpSource | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [intel, setIntel] = useState<IntelBrief[]>([]);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [intelError, setIntelError] = useState(false);

  // Step 2-3 state
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Load source data when wizard opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSelectedSegment(null);
    setIntel([]);
    setError('');
    setSendResult(null);
    setShowPreview(false);

    try {
      const raw = sessionStorage.getItem('followUpSource');
      if (raw) {
        const data: FollowUpSource = JSON.parse(raw);
        setSource(data);
        // Pre-fill campaign name
        setCampaignName(`Follow-up: ${data.campaignName}`);
      }
    } catch {
      // ignore parse errors
    }
  }, [isOpen]);

  // Fetch AI intel when segment is selected
  const handleSegmentSelect = async (segment: Segment) => {
    if (!source) return;
    setSelectedSegment(segment);
    setIntel([]);
    setIntelError(false);

    // Build company list for the segment
    const contacts =
      segment === 'CLICKED'
        ? source.segments.clicked
        : segment === 'OPENED'
        ? source.segments.opened
        : [...source.segments.clicked, ...source.segments.opened];

    // Only pass contacts that have a linked company (others get generic template)
    const companiesWithData = contacts
      .filter((c) => c.company !== null)
      .reduce<ContactRecord[]>((acc, c) => {
        // Deduplicate by company id — one brief per company
        if (!acc.find((x) => x.company?.id === c.company?.id)) acc.push(c);
        return acc;
      }, [])
      .map((c) => ({ ...c.company!, engagementSignal: c.engagementSignal }));

    if (companiesWithData.length === 0) return;

    setLoadingIntel(true);
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/campaigns/${source.campaignId}/ai-intel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ segment, companies: companiesWithData }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntel(data.intel || []);
      } else {
        setIntelError(true);
      }
    } catch {
      setIntelError(true);
    } finally {
      setLoadingIntel(false);
    }

    // Pre-fill subject + body based on segment
    if (!source) return;
    const campaignTopic = source.campaignName;
    if (segment === 'CLICKED' || segment === 'ALL') {
      setSubject(`Following up on ${campaignTopic} — resources for {{companyName}}`);
      setEmailBody(buildClickersTemplate(campaignTopic));
    } else {
      setSubject(`One thought on ${campaignTopic} for {{companyName}}`);
      setEmailBody(buildOpenersTemplate(campaignTopic));
    }
  };

  // Get contacts for the selected segment
  const getSegmentContacts = (): ContactRecord[] => {
    if (!source || !selectedSegment) return [];
    if (selectedSegment === 'CLICKED') return source.segments.clicked;
    if (selectedSegment === 'OPENED') return source.segments.opened;
    return [...source.segments.clicked, ...source.segments.opened];
  };

  // Group contacts: with company vs individual
  const getGroupedContacts = () => {
    const contacts = getSegmentContacts();
    const byCompany = new Map<string, { company: ContactRecord['company']; contacts: ContactRecord[] }>();
    const individuals: ContactRecord[] = [];

    for (const c of contacts) {
      if (c.company) {
        const existing = byCompany.get(c.company.id);
        if (existing) {
          existing.contacts.push(c);
        } else {
          byCompany.set(c.company.id, { company: c.company, contacts: [c] });
        }
      } else {
        individuals.push(c);
      }
    }
    return { byCompany: Array.from(byCompany.values()), individuals };
  };

  const handleSend = async () => {
    if (!source || !selectedSegment) return;
    setSending(true);
    setError('');

    const token = localStorage.getItem('crmToken');
    const contacts = getSegmentContacts();

    try {
      // 1. Create the campaign
      const createRes = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          subject,
          htmlContent: emailBody,
          status: 'DRAFT',
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create campaign');
      const { id: newCampaignId } = await createRes.json();

      // 2. Link companies to the campaign
      const companyIds = [
        ...new Set(contacts.filter((c) => c.company).map((c) => c.company!.id)),
      ];
      for (const companyId of companyIds) {
        await fetch(`${API_URL}/api/campaigns/${newCampaignId}/companies/${companyId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {}); // non-blocking
      }

      // 3. Send
      const sendRes = await fetch(`${API_URL}/api/campaigns/${newCampaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || 'Send failed');

      setSendResult({ success: true, sent: sendData.sent, total: sendData.total, failed: sendData.failed || 0 });
      setStep(4);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const contacts = getSegmentContacts();
  const { byCompany, individuals } = getGroupedContacts();
  const segmentCount = (seg: Segment) => {
    if (!source) return 0;
    if (seg === 'CLICKED') return source.totals.clicked;
    if (seg === 'OPENED') return source.totals.opened;
    return source.totals.allEngaged;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#0f172a', borderRadius: '16px', width: '100%', maxWidth: '860px',
          maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: 0 }}>Follow-up Campaign</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
              {source ? `Following up: ${source.campaignName}` : 'Loading...'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ padding: '16px 28px', display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Pick Segment', 'Review Audience', 'Preview & Send', 'Sent!'].map((label, i) => {
            const s = i + 1;
            const active = s === step;
            const done = s < step;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                  background: done ? '#10b981' : active ? '#6366f1' : 'rgba(255,255,255,0.08)',
                  color: done || active ? '#fff' : '#64748b',
                }}>
                  {done ? '✓' : s}
                </div>
                <span style={{ color: active ? '#f1f5f9' : '#64748b' }}>{label}</span>
                {i < 3 && <span style={{ color: '#334155', marginLeft: 4 }}>›</span>}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '24px 28px' }}>

          {/* ─── STEP 1: Segment + AI Intel ─── */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px', minHeight: '380px' }}>
              {/* Left: Segment picker */}
              <div>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Who gets the follow-up?
                </p>
                {(['CLICKED', 'OPENED', 'ALL'] as Segment[]).map((seg) => {
                  const count = segmentCount(seg);
                  const icon = seg === 'CLICKED' ? <CursorArrowRaysIcon style={{ width: 18, height: 18 }} /> : seg === 'OPENED' ? <EyeIcon style={{ width: 18, height: 18 }} /> : <UserGroupIcon style={{ width: 18, height: 18 }} />;
                  const label = seg === 'CLICKED' ? 'Clickers' : seg === 'OPENED' ? 'Openers' : 'All Engaged';
                  const desc = seg === 'CLICKED' ? 'Clicked your CTA — high intent' : seg === 'OPENED' ? 'Opened but didn\'t click — mild interest' : 'Everyone who engaged';
                  return (
                    <button
                      key={seg}
                      onClick={() => handleSegmentSelect(seg)}
                      disabled={count === 0}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%',
                        padding: '14px 16px', borderRadius: '10px', marginBottom: '10px', cursor: count === 0 ? 'not-allowed' : 'pointer',
                        border: `2px solid ${selectedSegment === seg ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        background: selectedSegment === seg ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        textAlign: 'left', opacity: count === 0 ? 0.4 : 1,
                      }}
                    >
                      <div style={{ color: selectedSegment === seg ? '#818cf8' : '#64748b', marginTop: '2px' }}>{icon}</div>
                      <div>
                        <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>
                          {label} <span style={{ color: '#6366f1', fontWeight: 700 }}>({count})</span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: AI Intel panel */}
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '24px' }}>
                {!selectedSegment && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155', textAlign: 'center' }}>
                    <SparklesIcon style={{ width: 32, height: 32, marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', margin: 0 }}>Pick a segment to see AI intelligence</p>
                    <p style={{ fontSize: '12px', margin: '6px 0 0', color: '#1e293b' }}>Claude will analyze each company and suggest the right approach</p>
                  </div>
                )}

                {selectedSegment && loadingIntel && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                    <SparklesIcon style={{ width: 28, height: 28, marginBottom: '12px', animation: 'spin 2s linear infinite' }} />
                    <p style={{ fontSize: '14px', margin: 0 }}>Analyzing {segmentCount(selectedSegment)} companies...</p>
                    <p style={{ fontSize: '12px', margin: '6px 0 0', color: '#334155' }}>Claude is generating follow-up intelligence</p>
                  </div>
                )}

                {selectedSegment && !loadingIntel && intelError && (
                  <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px' }}>
                    Intelligence unavailable — AI service error. You can still proceed with the pre-filled template.
                  </div>
                )}

                {selectedSegment && !loadingIntel && !intelError && intel.length > 0 && (
                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      <SparklesIcon style={{ width: 12, height: 12, display: 'inline', marginRight: '4px' }} />
                      AI Intelligence · {intel.length} companies
                    </p>
                    {intel.map((brief) => (
                      <div key={brief.companyId} style={{ marginBottom: '16px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                          {byCompany.find(g => g.company?.id === brief.companyId)?.company?.name || 'Company'}
                          <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 500, marginLeft: '8px' }}>⚡ {brief.urgencySignal}</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.6 }}>
                          <div style={{ marginBottom: '6px' }}><span style={{ color: '#64748b' }}>Why follow up: </span>{brief.whyFollowUp}</div>
                          <div style={{ marginBottom: '6px' }}><span style={{ color: '#64748b' }}>Angle: </span><span style={{ color: '#a5b4fc' }}>{brief.suggestedAngle}</span></div>
                          <div><span style={{ color: '#64748b' }}>Suggested subject: </span><em>{brief.suggestedSubject}</em></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1 footer */}
          {step === 1 && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedSegment}
                style={{
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: selectedSegment ? 'pointer' : 'not-allowed',
                  background: selectedSegment ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.06)',
                  color: selectedSegment ? '#fff' : '#475569', border: 'none',
                }}
              >
                Review Audience →
              </button>
            </div>
          )}

          {/* ─── STEP 2: Audience (locked) ─── */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <LockClosedIcon style={{ width: 16, height: 16, color: '#6366f1' }} />
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                  Audience is locked to contacts who engaged with your original campaign.
                </p>
              </div>
              <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>
                These contacts engaged with your original campaign. Remove this follow-up and start a new campaign if you need a different audience.
              </p>

              {/* Companies */}
              {byCompany.map(({ company, contacts: cc }) => (
                <div key={company?.id} style={{ marginBottom: '10px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>{company?.name}</span>
                    <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>{company?.industry}</span>
                  </div>
                  <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{cc.length} contact{cc.length !== 1 ? 's' : ''}</span>
                </div>
              ))}

              {/* Individual contacts (no company) */}
              {individuals.length > 0 && (
                <div style={{ marginBottom: '10px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>Individual Contacts</span>
                  <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{individuals.length} contact{individuals.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ← Back
                </button>
                <button onClick={() => setStep(3)} style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none' }}>
                  Preview & Send →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Preview & Send ─── */}
          {step === 3 && (
            <div>
              {/* Campaign name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>CAMPAIGN NAME</label>
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Subject line */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>SUBJECT LINE</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Email body with preview toggle */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>EMAIL BODY</label>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {showPreview ? 'Edit HTML' : 'Preview'}
                  </button>
                </div>
                {showPreview ? (
                  <div
                    style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailBody) }}
                  />
                ) : (
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                )}
              </div>

              {/* Send summary */}
              {(() => {
                const linkedCount = contacts.length - individuals.length;
                return (
                  <>
                    <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '13px', color: '#a5b4fc', marginBottom: individuals.length > 0 ? '8px' : '16px' }}>
                      Sending to <strong>{linkedCount}</strong> contacts across <strong>{byCompany.length}</strong> {byCompany.length === 1 ? 'company' : 'companies'} · Segment: <strong>{selectedSegment}</strong>
                    </div>
                    {individuals.length > 0 && (
                      <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', color: '#fbbf24', fontSize: '12px', marginBottom: '16px' }}>
                        ⚠ {individuals.length} contact{individuals.length !== 1 ? 's' : ''} without a linked company will not receive this email.
                      </div>
                    )}
                  </>
                );
              })()}

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ← Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !campaignName || !subject}
                  style={{
                    padding: '10px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    background: sending ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: sending ? '#475569' : '#fff', border: 'none',
                  }}
                >
                  {sending ? 'Sending...' : `Send to ${contacts.length - individuals.length} Contacts`}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Sent! ─── */}
          {step === 4 && sendResult && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircleIcon style={{ width: 56, height: 56, color: '#10b981', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Follow-up Sent!</h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
                {sendResult.sent} emails sent · {sendResult.failed} failed
              </p>
              <button
                onClick={() => { onClose(); }}
                style={{ padding: '10px 28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build frontend and check for TypeScript errors**

```bash
cd /var/www/crm-backend/frontend
npm run build 2>&1 | head -50
```

Expected: build succeeds with no errors. Fix any TypeScript type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
cd /var/www/crm-backend
git add frontend/src/components/FollowUpWizard.tsx
git commit -m "feat: add FollowUpWizard component with AI intel panel"
```

---

## Chunk 3: CampaignsPage Integration

### Task 4: Wire "Send Follow-up" button and FollowUpWizard into `CampaignsPage.tsx`

**Files:**
- Modify: `/var/www/crm-backend/frontend/src/pages/Campaigns/CampaignsPage.tsx`

**Background:** Need to: (1) add `ArrowUturnRightIcon` to Heroicons imports, (2) add `showFollowUpWizard` + `followUpLoading` state, (3) add `handleFollowUp` function that fetches engaged contacts and stores in sessionStorage, (4) add "Send Follow-up" button next to "View Full Report" on sent campaigns with engagement, (5) render `<FollowUpWizard>` modal at the bottom of the JSX.

- [ ] **Step 1: Add import for `ArrowUturnRightIcon` and `FollowUpWizard`**

In `/var/www/crm-backend/frontend/src/pages/Campaigns/CampaignsPage.tsx`, find the Heroicons import block (around line 2–18) and add `ArrowUturnRightIcon` to the existing imports. Then add the FollowUpWizard import.

Find:
```typescript
import {
  MegaphoneIcon,
  PlusIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  XMarkIcon,
  PencilIcon,
  QuestionMarkCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import CampaignWizard from '../../components/CampaignWizard';
```

Replace with:
```typescript
import {
  MegaphoneIcon,
  PlusIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  XMarkIcon,
  PencilIcon,
  QuestionMarkCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';
import CampaignWizard from '../../components/CampaignWizard';
import { FollowUpWizard } from '../../components/FollowUpWizard';
```

- [ ] **Step 2: Add state variables for follow-up wizard**

Find the existing state declarations (around line 55–60, near `reportCampaign`):
```typescript
  const [reportCampaign, setReportCampaign] = useState<Campaign | null>(null);
```

Add after that line:
```typescript
  const [showFollowUpWizard, setShowFollowUpWizard] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState<string | null>(null); // campaignId being loaded
```

- [ ] **Step 3: Add the `handleFollowUp` function**

Find the `loadCampaigns` function (around line 72). Add this function after `loadCampaigns`:

```typescript
  const handleFollowUp = async (campaign: Campaign) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('crmToken');
    setFollowUpLoading(campaign.id);
    try {
      const res = await fetch(`${apiUrl}/api/campaigns/${campaign.id}/engaged-contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch engaged contacts');
      const data = await res.json();
      sessionStorage.setItem('followUpSource', JSON.stringify(data));
      setShowFollowUpWizard(true);
    } catch (err) {
      console.error('Follow-up fetch failed:', err);
      alert('Could not load engagement data. Please try again.');
    } finally {
      setFollowUpLoading(null);
    }
  };
```

- [ ] **Step 4: Add "Send Follow-up" button next to "View Full Report"**

Find the "View Full Report" button block (around line 484–492):
```typescript
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setReportCampaign(campaign); }}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                      >
                        View Full Report
                      </button>
                    </div>
```

Replace with:
```typescript
                    <div className="mt-3 flex justify-end items-center gap-4">
                      {(campaign.openedCount > 0 || campaign.clickedCount > 0) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFollowUp(campaign); }}
                          disabled={followUpLoading === campaign.id}
                          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                        >
                          <ArrowUturnRightIcon className="w-3.5 h-3.5" />
                          {followUpLoading === campaign.id ? 'Loading...' : 'Send Follow-up'}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setReportCampaign(campaign); }}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                      >
                        View Full Report
                      </button>
                    </div>
```

- [ ] **Step 5: Render the FollowUpWizard modal**

Find where the `CampaignEmailReport` modal is rendered (around line 545). Add the FollowUpWizard just after it:

```typescript
      {/* Follow-up Campaign Wizard */}
      {showFollowUpWizard && (
        <FollowUpWizard
          isOpen={showFollowUpWizard}
          onClose={() => setShowFollowUpWizard(false)}
          onSuccess={() => {
            loadCampaigns();
            setShowFollowUpWizard(false);
          }}
        />
      )}
```

- [ ] **Step 6: Build frontend and deploy**

```bash
cd /var/www/crm-backend/frontend
npm run build 2>&1 | tail -20
```

Expected: build completes with no errors.

Deploy:
```bash
sudo cp -r dist/. /var/www/brandmonkz/
```

- [ ] **Step 7: End-to-end verification**

1. Open `https://brandmonkz.com` → Campaigns page
2. Find a sent campaign with opens/clicks — verify "Send Follow-up" button is visible in green
3. Confirm campaigns with zero engagement do NOT show the button
4. Click "Send Follow-up" → wizard should open
5. In Step 1: pick "Clickers" — verify AI intel cards appear for each company
6. Pick "Openers" — verify a different segment loads and body switches to openers template
7. Click "Review Audience" → verify companies are shown as read-only locked list
8. Click "Preview & Send" → verify subject/body are pre-filled, send summary shows correct contact count
9. Click "Send to N Contacts" → verify campaign is created and sent, step 4 "Sent!" screen appears
10. Return to Campaigns page → verify new "Follow-up: [name]" campaign appears in the list

- [ ] **Step 8: Commit**

```bash
cd /var/www/crm-backend
git add frontend/src/pages/Campaigns/CampaignsPage.tsx
git commit -m "feat: wire Follow-up Campaign wizard into CampaignsPage"
```
