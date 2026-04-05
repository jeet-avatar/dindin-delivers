---
phase: quick-268
subsystem: vibingticket-agents
tags: [mongodb, system-prompt, performance, trial-chat]
---

# Quick 268: Trim Alex and Sarah System Prompts — Summary

**One-liner:** Replaced 20K/40K char bloated system prompts with focused 1.2K char prompts — trial chat response time dropped from 8-9s to 4-5s.

## Changes

| Agent | Before | After | Response time |
|-------|--------|-------|---------------|
| Alex | 20,512 chars | 1,255 chars | 8.3s → 5.1s |
| Sarah | 39,990 chars | 1,246 chars | 8.9s → 3.7s |

## What was removed
- Sarah: video generation specs (Runway, Pika, D-ID), legal/compliance, HR/recruiting, McKinsey frameworks, finance — none of which she actually does
- Alex: 18-phase "AUTONOMOUS EXECUTION" spec, duplicate identity sections, hidden preference matrices — collapsed into clear capability list

## What was preserved
- Core name, role, employer (VibingTicket)
- Real capabilities each agent has
- Personality and tone
- Trial mode intro instructions

## Verification
- Alex: ✅ 5.1s, responds correctly as job hunter
- Sarah: ✅ 3.7s, responds correctly as sales rep
- All other 16 agents: unchanged, unaffected
