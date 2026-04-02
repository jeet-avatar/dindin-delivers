---
phase: quick-264
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
  - /Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx
autonomous: true
requirements: [SENT-FILTER-01, SENT-BADGES-02, SEND-DEDUP-03]
must_haves:
  truths:
    - "Contacts previously sent any campaign show a purple 'Sent' badge in Step 2"
    - "Already-sent contacts are NOT auto-selected when selecting a company or using Select All"
    - "User can still manually check a sent contact to re-send"
    - "send-throttled endpoint skips contacts already sent for THIS campaign (dedup)"
    - "totalSelectedContacts count accurately reflects only checked contacts"
  artifacts:
    - path: "backend/src/routes/campaigns.ts"
      provides: "GET /api/campaigns/sent-contact-ids endpoint + send-throttled dedup"
      contains: "sent-contact-ids"
    - path: "frontend/src/components/CampaignWizard.tsx"
      provides: "Sent badges, auto-exclude from selection, manual override"
      contains: "sentContactIds"
  key_links:
    - from: "CampaignWizard.tsx"
      to: "/api/campaigns/sent-contact-ids"
      via: "fetch on wizard open"
      pattern: "sent-contact-ids"
    - from: "campaigns.ts send-throttled"
      to: "prisma.emailLog.findMany"
      via: "dedup query before sending"
      pattern: "emailLog.*findMany"
---

<objective>
Add sent-contact filtering to the campaign wizard so users can see which contacts have already received campaign emails, auto-exclude them from selection, and prevent double-sends at the backend level.

Purpose: Prevent accidental duplicate campaign sends and give users visibility into who has already been contacted.
Output: Backend endpoint for sent contact IDs, frontend badges + auto-exclude, backend dedup guard.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
@/Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx
@/Users/jeet/Documents/production-crm-backup/backend/prisma/schema.prisma
</context>

<tasks>

<task type="auto">
  <name>Task 1: Backend — sent-contact-ids endpoint + send-throttled dedup</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts
  </files>
  <action>
    **Part A — New GET endpoint `/api/campaigns/sent-contact-ids`:**

    Add a new route BEFORE the `/:id` routes (to avoid param conflict). Location: around line 20-30 in the router, after the existing GET routes.

    ```typescript
    router.get('/sent-contact-ids', async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const { campaignType } = req.query; // optional filter

        const where: any = {
          campaign: { userId },
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
        };
        if (campaignType) {
          where.campaign.type = campaignType as string;
        }

        const logs = await prisma.emailLog.findMany({
          where,
          select: { contactId: true },
          distinct: ['contactId'],
        });

        return res.json({ sentContactIds: logs.map(l => l.contactId) });
      } catch (error: any) {
        return next(error);
      }
    });
    ```

    Key details:
    - Uses Prisma `distinct` to deduplicate — efficient since `contactId` is indexed on `email_logs`
    - Filters to successful statuses only (SENT, DELIVERED, OPENED, CLICKED) — excludes PENDING, BOUNCED, FAILED, COMPLAINED, UNSUBSCRIBED
    - Scoped to `campaign.userId` for multi-tenant safety
    - Optional `?campaignType=` query param for future filtering

    **Part B — Dedup in send-throttled (around line 280-295):**

    After building `validContacts` array (line ~291) and before the `if (validContacts.length === 0)` check (line ~293), add a dedup step:

    ```typescript
    // Dedup: remove contacts already sent for THIS campaign
    const alreadySent = await prisma.emailLog.findMany({
      where: {
        campaignId: id,
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
      },
      select: { contactId: true },
    });
    const alreadySentIds = new Set(alreadySent.map(l => l.contactId));
    const dedupedContacts = validContacts.filter(vc => !alreadySentIds.has(vc.contact.id));
    const dupCount = validContacts.length - dedupedContacts.length;
    ```

    Then replace all subsequent references to `validContacts` with `dedupedContacts` (lines ~293-311):
    - `if (dedupedContacts.length === 0)` — update error message to mention dedup: `'No new contacts to send to (X already sent, Y invalid emails)'`
    - `startThrottledSend(id, userId!, dedupedContacts, ...)`
    - `(dedupedContacts.length - 1) * intervalMinutes`
    - Response: `total: dedupedContacts.length, duplicatesSkipped: dupCount, invalidSkipped: invalidCount`
  </action>
  <verify>
    1. `grep -n "sent-contact-ids" /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts` — confirms new endpoint exists
    2. `grep -n "alreadySentIds\|dedupedContacts\|duplicatesSkipped" /Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts` — confirms dedup logic exists
    3. TypeScript compiles: `cd /Users/jeet/Documents/production-crm-backup/backend && npx tsc --noEmit 2>&1 | head -20`
  </verify>
  <done>
    - GET /api/campaigns/sent-contact-ids returns `{ sentContactIds: string[] }` of contacts with successful sends
    - send-throttled filters out contacts already sent for the specific campaign, reports `duplicatesSkipped` in response
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend — Sent badges, auto-exclude from selection</name>
  <files>
    /Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx
  </files>
  <action>
    **Part A — State + fetch sent IDs:**

    Near the existing state declarations (~line 73, after `selectedContactIds`), add:
    ```typescript
    const [sentContactIds, setSentContactIds] = useState<Set<string>>(new Set());
    ```

    In the `useEffect` that fires when `isOpen` changes (~line 95-99), add a call to fetch sent contact IDs:
    ```typescript
    // Fetch contacts already sent any campaign
    const fetchSentContacts = async () => {
      try {
        const token = localStorage.getItem('crmToken');
        const res = await fetch(`${API_URL}/api/campaigns/sent-contact-ids`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSentContactIds(new Set(data.sentContactIds || []));
        }
      } catch { /* ignore — badges just won't show */ }
    };
    fetchSentContacts();
    ```

    **Part B — Auto-exclude sent contacts from selection:**

    Modify `toggleCompany` (~line 387-396, the "Selecting company" branch):
    Replace the auto-select-all logic to SKIP sent contacts:
    ```typescript
    if (company?.contacts) {
      setSelectedContactIds(prevContacts => {
        const next = new Set(prevContacts);
        company.contacts!.forEach(c => {
          if (!sentContactIds.has(c.id)) next.add(c.id); // skip already-sent
        });
        return next;
      });
    }
    ```

    Modify `toggleAllContactsInCompany` (~line 417-429):
    When selecting all, skip sent contacts:
    ```typescript
    const toggleAllContactsInCompany = (company: Company) => {
      const contacts = company.contacts || [];
      const selectableContacts = contacts.filter(c => !sentContactIds.has(c.id));
      const allSelected = selectableContacts.length > 0 && selectableContacts.every(c => selectedContactIds.has(c.id));
      setSelectedContactIds(prev => {
        const next = new Set(prev);
        if (allSelected) {
          contacts.forEach(c => next.delete(c.id)); // deselect ALL (including manually selected sent ones)
        } else {
          selectableContacts.forEach(c => next.add(c.id)); // only select non-sent
        }
        return next;
      });
    };
    ```

    Modify the "Select All" button at the top (~line 1140-1147):
    The `allFilteredSelected` check and the bulk select should also skip sent contacts:
    ```typescript
    // When clicking Select All companies button, auto-select non-sent contacts
    onClick={() => {
      if (allFilteredSelected) {
        setSelectedCompanyIds(prev => prev.filter(id => !filtered.find(c => c.id === id)));
        // Also remove contacts from deselected companies
        const filteredIds = new Set(filtered.map(c => c.id));
        setSelectedContactIds(prev => {
          const next = new Set(prev);
          filtered.forEach(company => {
            (company.contacts || []).forEach(c => next.delete(c.id));
          });
          return next;
        });
      } else {
        const newIds = [...new Set([...selectedCompanyIds, ...filtered.map(c => c.id)])];
        setSelectedCompanyIds(newIds);
        // Auto-select non-sent contacts in newly selected companies
        setSelectedContactIds(prev => {
          const next = new Set(prev);
          filtered.forEach(company => {
            (company.contacts || []).forEach(c => {
              if (!sentContactIds.has(c.id)) next.add(c.id);
            });
          });
          return next;
        });
      }
    }
    ```

    **Part C — Purple "Sent" badge on contacts:**

    In the contact row rendering (~line 1316-1351, inside the `contacts.map` block), after the contact name div (~line 1342-1344), add a "Sent" badge:

    After `{contact.firstName} {contact.lastName}`, add:
    ```tsx
    {sentContactIds.has(contact.id) && (
      <span style={{
        display: 'inline-block',
        marginLeft: '8px',
        padding: '1px 7px',
        borderRadius: '4px',
        background: 'rgba(139, 92, 246, 0.25)',
        color: '#C4B5FD',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.03em',
        verticalAlign: 'middle',
      }}>
        Sent
      </span>
    )}
    ```

    Also add a subtle indicator on the company row for companies that have sent contacts. In the contact count span (~line 1274-1277), after the existing content, add:
    ```tsx
    {(() => {
      const sentInCompany = (company.contacts || []).filter(c => sentContactIds.has(c.id)).length;
      return sentInCompany > 0 ? (
        <span style={{ color: '#C4B5FD', marginLeft: '6px', fontSize: '11px' }}>
          ({sentInCompany} already sent)
        </span>
      ) : null;
    })()}
    ```

    **Part D — Manual override still works:**

    The `toggleContact` function (~line 401-414) does NOT need changes — it adds/removes individual contacts regardless of sent status. This means users can still manually check a sent contact to re-include it.
  </action>
  <verify>
    1. `grep -n "sentContactIds\|Sent.*badge\|already sent" /Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx` — confirms badge + state + auto-exclude
    2. `grep -c "sentContactIds" /Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx` — should show 10+ occurrences
    3. TypeScript compiles: `cd /Users/jeet/Documents/production-crm-backup/frontend && npx tsc --noEmit 2>&1 | head -20`
  </verify>
  <done>
    - Contacts with prior sends show a purple "Sent" badge in the contact list
    - Company rows show "(N already sent)" count
    - Selecting a company or "Select All" skips already-sent contacts
    - Users can still manually toggle sent contacts back on
    - totalSelectedContacts accurately reflects actual selection
  </done>
</task>

</tasks>

<verification>
1. Backend compiles without TypeScript errors
2. Frontend compiles without TypeScript errors
3. GET /api/campaigns/sent-contact-ids returns correct shape
4. send-throttled dedup logic filters already-sent contacts for the specific campaign
5. CampaignWizard Step 2 shows "Sent" badges on contacts with prior sends
6. Select All / company select skips sent contacts by default
7. Manual toggle still allows re-selecting sent contacts
</verification>

<success_criteria>
- Backend: New endpoint returns sent contact IDs, send-throttled prevents double-sends
- Frontend: Purple "Sent" badges visible, auto-exclude works, manual override works
- Both files compile without errors
</success_criteria>

<output>
After completion, create `.planning/quick/264-campaign-wizard-sent-contact-filtering-a/264-SUMMARY.md`
</output>
