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

---

## Phase 54.5 — Aurora cutover COMPLETE 2026-05-15T05:22:38Z

| | |
|---|---|
| **Cutover wall-clock** | ~25 min (T+0:00 → T+25:13) |
| **New Aurora writer endpoint** | `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com:5432/zietra` |
| **Cluster ID / ARN** | `zietra-aurora-prod` / `arn:aws:rds:us-east-1:134607809447:cluster:zietra-aurora-prod` |
| **Master secret** | `arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9-VbuP4h` (auto-rotated) |
| **Restored data** | 153 tables across public/crm/turion/turion_satellite, 3070 rows, parity diff = 0 lines |
| **Snapshot ID** | `zietra-aurora-pre-migration-cutover-2026-05-15` (available, 100%) |
| **Smoke verdict** | 4/4 PASS (turion-demo, turion-satellite, zietra-crm, zietra-api) with SMOKE_WRITE=1 |
| **CloudWatch (5min)** | 0 `pooler.supabase.com` references across all 4 Lambdas |
| **SG state** | Operator IP /32 + 0.0.0.0/0:5432 (Lambda-egress fallback — Phase 54.5-04 will VPC-attach + RDS Proxy) |

### 4 Lambdas now on Aurora
- `turion-demo-api` — env DATABASE_URL → Aurora ?schema=turion
- `turion-satellite-api` — secret `turion-satellite/production/database-url` rotated → Aurora ?schema=turion_satellite
- `zietra-crm-api` — env DATABASE_URL + DIRECT_URL → Aurora ?schema=crm; SUPABASE_URL/ANON/SERVICE deleted
- `zietra-api` — env SUPABASE_DB_URL + SUPABASE_DB_URL_SERVICE (kept names, new values) → Aurora ?schema=public; SUPABASE_URL/ANON/SERVICE deleted

### Day-7 Supabase teardown (2026-05-22)
- Phase 54.5-04 plan handles the soak monitoring (days 1–6) + the day-7 Supabase project deletion
- Supabase project `lbpkbpfwdpnwlccmlfxn` (us-east-2) remains LIVE for rollback
- Rollback runbook: `.planning/runbooks/aurora-rollback-54-5-03.md`

### Phase 54.1 Wave 2 status
- **NOT YET unblocked.** Wait for 54.5-04 7-day soak verdict before issuing the unblock signal.
- 54.5-04 deliverables: alarm tuning, RDS Proxy provisioning, Lambda-into-VPC migration, Supabase project deletion, this NEXT_SESSION block updated to show Wave 2 unblock.

---

## Phase 54.6 — Enterprise Hardening Starter Pack COMPLETE 2026-05-15T09:37:00Z

| | |
|---|---|
| **All 4 waves** | 54.6-01 VPC + private Aurora · 54.6-02 RDS Proxy + Lambda VPC-attach + 0/0:5432 revoke · 54.6-03 WAF + GuardDuty + Security Hub + Config · 54.6-04 trust page + smoke matrix |
| **Requirements closed** | 10/10 (VpcIsolation, AuroraPrivate, LambdaVpcAttached, RdsProxyDeployed, ZeroPublicDbIngress, WafEnabledAllDistros, GuardDutyEnabled, SecurityHubEnabled, AwsConfigEnabled, SecurityTrustPage) |
| **Cost delta** | ~$296/mo (Proxy $144 + WAF $43 + GuardDuty $30 + Security Hub $10 + Config $15 + 3 VPCE $22 + NAT $3 + Aurora ServerlessV2 baseline already in 54.5) |
| **Architecture** | All 4 Lambdas (turion-demo-api, turion-satellite-api, zietra-crm-api, zietra-api) now serve via RDS Proxy in zietra-prod-vpc → private Aurora `zietra-aurora-prod-v2`. OLD cluster `zietra-aurora-prod` still LIVE for 14-day rollback through 2026-05-29. WAF on 2 of 3 CF distros in COUNT mode. |
| **Smoke verdict** | `scripts/smoke-phase-54-6.sh` → 16/16 PASS (Lambda health + edges + trust page + Aurora public-blocked + posture services state) |
| **CHECKPOINT** | `.planning/phases/54.6-enterprise-hardening-starter-pack-vpc-rds-proxy-waf-guardduty-close-sg/CHECKPOINT.md` |
| **Trust page** | https://zietra.com/security.html LIVE — 12 sections, 149 lines |

### Recurring operator tasks (high-priority, scheduled)
- **Day +1 to +4 (2026-05-16 → 2026-05-19):** WAF COUNT→BLOCK transition (KBI → IpRep → CRS → BotControl), per `.planning/runbooks/waf-deployment-54-6-03.md`
- **2026-05-29:** delete OLD Aurora cluster `zietra-aurora-prod` (rollback window expires) + delete OLD SG `sg-0760238c408d0f2b7`
- **Immediate:** confirm SNS subscription `security@zietra.com` (click email link)
- **Immediate:** `aws iam create-service-linked-role --aws-service-name config.amazonaws.com` (1-line from IAM-admin creds) to leave AWS Config FAILURE state

### Deferred to M3 / future
- WAF regional ACL attach to marquee + asc606 APIGW v2 (front each with new CF, or accept native APIGW v2 controls)
- IAM token client conversion on Lambda Pool (replace password-auth on Proxy)
- HA NAT across 2 AZs (~$32/mo extra)
- SAML SSO (M8 / first enterprise pilot)
- SOC 2 Type II audit (M8 / first customer requiring it)
- zietra-api Lambda missing APIGW route (open since Phase 54.5-02)

### Unblocked next
- **Phase 55 / M3: RLS multi-tenancy** — Aurora hardened, all Lambdas in VPC, 0/0:5432 closed. M3 starts with `tenant_id` column audit + RLS policies + isolation tests.
- Start via: `/gsd:plan-phase 55`
