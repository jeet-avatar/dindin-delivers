---
phase: quick
plan: 218
subsystem: brandmonkz-frontend
tags: [ui-fix, theme, tailwind, dark-mode, campaign]
dependency_graph:
  requires: []
  provides: [readable-campaign-ui]
  affects: [AICampaignGenerator, CreateCampaignModal]
tech_stack:
  added: []
  patterns: [css-vars-over-tailwind-gradients]
key_files:
  modified:
    - /Users/jeet/Documents/production-crm-backup/frontend/src/components/AICampaignGenerator.tsx
    - /Users/jeet/Documents/production-crm-backup/frontend/src/components/CreateCampaignModal.tsx
decisions:
  - "Replaced Tailwind gradient-stop classes (from-gray-50, from-orange-50) with inline CSS var() references — these classes are not overridden by the Indigo Noir theme in index.css, so they produce light backgrounds that make near-white text invisible"
  - "Used var(--bg-base)/var(--bg-deep) for outer AICampaignGenerator wrapper, var(--glass-bg) for example prompt buttons and panel rows, var(--bg-elevated) for review step summary"
  - "AI content save flow confirmed correct — no changes needed: generateAIContent sets emailContent, handleCreateCampaign sends htmlContent: emailContent"
metrics:
  duration: 8m
  completed: "2026-03-23"
  tasks_completed: 2
  files_changed: 2
---

# Quick Task 218: Fix BrandMonkz Campaign Text Visibility Summary

Fixed invisible text in the BrandMonkz campaign creation UI by replacing Tailwind gradient-stop utility classes (not overridden by the Indigo Noir theme) with dark-safe CSS variable inline styles.

## What Was Fixed

**Root cause:** The Indigo Noir theme in `index.css` remaps `text-gray-900` to near-white (`#F1F5F9`) and `bg-white` to dark (`#161625`), but does NOT override Tailwind gradient-stop classes (`from-gray-50`, `via-orange-50`, `to-rose-50`, `from-orange-50`, `to-orange-100`). These stay light (default Tailwind values), making near-white text invisible.

**Fixes applied:**

1. **AICampaignGenerator.tsx line 133** — Outer wrapper `bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50` replaced with `style={{ background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-deep) 100%)' }}`

2. **AICampaignGenerator.tsx line 203** — Example prompt buttons `bg-gradient-to-r from-orange-50 to-rose-50` replaced with `style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}`

3. **CreateCampaignModal.tsx line 737** — Review step summary `bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200` replaced with `style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-accent)' }}`

4. **CreateCampaignModal.tsx line 635** — Personalization checkbox row `bg-orange-50` replaced with `style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-default)' }}`

5. **CreateCampaignModal.tsx line 490** — A/B variants panel `bg-orange-50 border-orange-200` replaced with `style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-accent)' }}`

## AI Content Save Flow Verification

Confirmed correct (no changes needed):
- `generateAIContent()` at line 151 → calls `/api/campaigns/ai/generate-content` → `setEmailContent(data.content)`
- `handleCreateCampaign()` at line 252 → sends `htmlContent: emailContent` in POST `/api/campaigns`
- Flow is complete and correct end-to-end.

## Deployment

- Build: `npm run build` passed — `built in 2.15s`, zero TypeScript errors
- Deploy: SCP archive to EC2 + nginx-owned `/var/www/brandmonkz`
- Verification: `https://brandmonkz.com/` returns HTTP 200 (bot protection blocks curl user-agent; verified with Mozilla UA)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- AICampaignGenerator.tsx modified: confirmed
- CreateCampaignModal.tsx modified: confirmed
- Build: passed (`built in 2.15s`)
- HTTP 200: confirmed with browser UA
