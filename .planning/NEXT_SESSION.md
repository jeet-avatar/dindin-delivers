# NEXT SESSION — Zietra Platform M1 kickoff

If you're a fresh Claude session reading this, here's everything you need to know in order:

## 1. Read the handover first
**`/Users/jeet/.claude/handoffs/2026-05-14-zietra-platform-milestone-kickoff.md`** (≈250 lines)

It has:
- Strategic vision (Zietra multi-tenant SaaS at `<tenant>.zietra.com`, $99/mo base + add-ons, full AWS)
- Locked decisions (don't relitigate)
- AWS resources provisioned 2026-05-14 (account `134607809447`, SES, Route 53, IAM, secrets)
- Codebase state (Phases 27–38 complete; Turion stack = tenant 1)
- Milestone plan M1–M8 (~6–9 weeks)
- Critical pitfalls
- Repo + path reference

## 2. Six PERMANENT global engineering rules
At the top of `/Users/jeet/.claude/projects/-Users-jeet-doordash-p2p/memory/MEMORY.md`. Non-negotiable:
1. No hardcoded DB-derivable values anywhere
2. Every link must lead somewhere useful (no dead ends, no stubbed toasts)
3. No shortcuts, no assumptions — verify before writing code that depends on something
4. All workflows work the same across modules (one shell, one nav, one form idiom)
5. Remove dead code as you find it
6. No unnecessary code

These apply to every file from now on.

## 3. The first concrete command
After confirming the SES email chain is working with the user (have them request a fresh magic link and confirm inbox placement):

```
/gsd:plan-phase 39
```

Phase 39 is the first M1 phase: Cognito user pool + SES integration + migrate users from Supabase Auth. The roadmap entry is at `/Users/jeet/doordash-p2p/.planning/ROADMAP.md` (search for "Phase 39"). Phases 40 and 41 are also scaffolded.

## 4. Open carryover tasks (from the prior session's TaskList)

| # | State | Task |
|---|---|---|
| 18 | in_progress | Verify SES → Supabase email chain (DMARC + apex SPF added; user needs to request fresh magic link and confirm inbox placement) |
| 19 | pending | SES production-access reopen via AWS Console (Console-only; prior case `176066476400763` was DENIED for an unrelated marketing case on brandmonkz.com — needs to be reopened with the transactional-use-case template in the handover doc) |

## 5. Status quick-reference

| | |
|---|---|
| AWS account | `134607809447` (us-east-1) |
| Live site | `https://turionspace.zietra.com` (turion stack) |
| Satellite backend Lambda | `turion-satellite-api` (APIGW `rjydekliee.execute-api.us-east-1.amazonaws.com`) |
| ERP backend Lambda | `turion-demo-api` (APIGW `lo254mvukl.execute-api.us-east-1.amazonaws.com`) |
| DB | Supabase Postgres, password `Thirumala977!` (URL-encode `!` → `%21`); schemas `turion` + `turion_satellite`. M2 migrates this to AWS RDS. |
| SES SMTP creds | AWS Secrets Manager `zietra/ses-smtp-credentials-RsRKSm`. Already plugged into Supabase Auth → Custom SMTP. |
| Route 53 hosted zone | `zietra.com` → `Z090201115UMJZ8TIAX5G` |

## 6. Do NOT
- Break the Turion Thursday demo (Turion is anchor tenant — they're on the current stack).
- Skip reading the handover doc.
- Make architecture decisions without checking the "Locked decisions" table in the handover.
- Treat ANY new code as exempt from the six global engineering rules.

---

*Created 2026-05-14 by the session that finished Phase 38 + provisioned SES. If you've read this and the handover, you're ready to execute. Don't proceed without both.*
