# Aurora VPC Migration Runbook — Phase 54.6-01

**Live cutover record.** Updated as Phase 54.6-01 Wave 1 executes (VPC provisioning → final snapshot → restore-to-new-cluster in private subnets → parity gate).

---

## T+0:00 — VPC provisioning begin: 2026-05-15T06:53:59Z

Operator: GSD executor (Claude Code), AWS account `134607809447`, region `us-east-1`.

---

## VPC + Subnets + IGW — PARTIAL (created before EIP-quota block)

The idempotent script `scripts/setup-vpc-and-private-aurora.sh` was executed at 2026-05-15T06:54Z. It successfully created the VPC, IGW, and 4 subnets, then halted when AWS rejected EIP allocation with `AddressLimitExceeded` (account currently at 21/21 allocated EIPs against the quota).

| Resource | Name | ID | State | CIDR / AZ | Created |
|----------|------|----|-------|-----------|---------|
| VPC | `zietra-prod-vpc` | `vpc-012ab4500dcd4ee41` | available | 10.0.0.0/16 | 2026-05-15T06:54Z |
| IGW | `zietra-prod-igw` | `igw-0f7bb813b6b5edb0d` | attached to vpc-012ab4500dcd4ee41 | — | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-public-1a` | `subnet-0b5e4abedde216d3a` | available | 10.0.0.0/24 / us-east-1a | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-public-1b` | `subnet-02f98e40f1b4afef7` | available | 10.0.1.0/24 / us-east-1b | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-private-1a` | `subnet-052ed80f6904b9fe7` | available | 10.0.10.0/24 / us-east-1a | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-private-1b` | `subnet-07893035668f1b015` | available | 10.0.11.0/24 / us-east-1b | 2026-05-15T06:54Z |

**VPC attributes verified:** DNS hostnames + DNS support both `enabled`.

**Cost so far:** $0/hr (VPC/IGW/subnets are free; NAT GW + EIP are the billable resources, neither has been created yet).

---

## BLOCKER — EIP quota exhausted (Rule 4 — architectural decision required)

**Issue:** `aws ec2 allocate-address --domain vpc` returned `AddressLimitExceeded`. Account holds **21 EIPs** (all in `vpc` domain, all `Associated`), and the soft quota appears applied at 21 (`service-quotas` API reports default `5` but actual ceiling is higher). Cannot allocate the EIP needed for the `zietra-prod-nat` NAT Gateway.

**EIP inventory (from `aws ec2 describe-addresses`):**

| AllocId | IP | Tag/Owner | Attached to | Reclaim risk |
|---------|----|-----------|-------------|-------------|
| eipalloc-0fb8cf45f782ec1d1 | 100.24.213.224 | (BrandMonkz CRM box per MEMORY) | i-0988d1a0a7e4c0a7e | LIVE — do not touch |
| eipalloc-09050de3015dcc9f6 | 100.28.106.16 | (unnamed) | zyre-prod ALB | likely live |
| eipalloc-0d187a104dd8f216a | 100.50.178.154 | (unnamed) | zietra-meet ALB | live |
| eipalloc-0e5265dad82b7af1a | 107.20.92.214 | (unnamed) | Socialflow ALB | live |
| eipalloc-0da0cbc0094b237db | 18.205.32.81 | (unnamed) | Socialflow ALB | live |
| eipalloc-026d4964fab98e5da | 18.214.189.125 | (unnamed) | Socialflow ALB | live |
| eipalloc-0d1475f611697a1a4 | 3.217.108.6 | (unnamed) | dollor-api ALB | live |
| eipalloc-0bf3534119dec02bb | 3.228.239.112 | `arthaBuild-eip` | i-02e665cfa2b776226 | live |
| eipalloc-0f52c37280a57ee24 | 3.93.84.207 | (unnamed) | zyre-prod ALB | live |
| eipalloc-04081b4ffe08e1111 | 34.197.219.147 | (unnamed) | Socialflow ALB | live |
| eipalloc-0b7a513a316f7d49c | 34.198.136.254 | (unnamed) | zyre-prod ALB | live |
| eipalloc-0737b35f5bcab1059 | 35.175.61.157 | `dollor-staging-nat-eip-1` | NAT GW `nat-0edf6d0ff7ec26b80` (vpc-06b31cf4c5205c340, dollor-staging-nat-1) | **DEFUNCT?** — old dollor-staging VPC; verify before reclaim |
| eipalloc-068ec6528ecd37961 | 44.194.34.223 | (unnamed) | i-062dcd31988aed289 | likely live |
| eipalloc-048de2c6eea3dc5ec | 52.200.216.128 | (unnamed) | Socialflow ALB | live |
| eipalloc-054581e95021b2519 | 52.203.153.64 | (unnamed) | zietra-meet ALB | live |
| eipalloc-00e75d48b98ab7d17 | 52.203.19.73 | (unnamed) | RDSNetworkInterface | live |
| eipalloc-0c835e9a56028fbe3 | 52.7.144.55 | (unnamed) | Socialflow ALB | live |
| eipalloc-0b9b92fdf6718f10b | 52.72.203.115 | (unnamed) | RDSNetworkInterface | live |
| eipalloc-073a6f31f5a4114cd | 54.174.45.93 | (unnamed) | dollor-api ALB | live |
| eipalloc-0d501a89b5b0f0b2e | 54.236.97.40 | (unnamed) | NAT GW `nat-0a41bcbe59eba13a8` (vpc-0c87f730a3208b3f6, `dollor-nat-gateway`) | **DEFUNCT?** — pre-zietra dollor NAT; verify before reclaim |
| eipalloc-089f1362f9d86cb71 | 54.83.1.152 | (unnamed) | RDSNetworkInterface | live |

**Two candidate EIPs for reclaim (both attached to NAT Gateways in old VPCs):**

1. `eipalloc-0737b35f5bcab1059` → `dollor-staging-nat-1` in VPC `vpc-06b31cf4c5205c340` — created 2025-12-17. Is dollor-staging still in use?
2. `eipalloc-0d501a89b5b0f0b2e` → `dollor-nat-gateway` in VPC `vpc-0c87f730a3208b3f6` — created 2025-12-10. Is this NAT still serving any traffic?

**Reclaim path (per candidate):** `aws ec2 delete-nat-gateway --nat-gateway-id <id>` → wait ~5 min for state=deleted → EIP returns to pool → `setup-vpc-and-private-aurora.sh` re-run succeeds (idempotent — picks up where it left off).

**Decision options (require operator GO):**
- **A — Reclaim dollor NAT GW (`nat-0a41bcbe59eba13a8`)** — oldest, "dollor-nat-gateway" is generic naming consistent with pre-zietra demo. **Risk:** unknown what depends on it.
- **B — Reclaim dollor-staging NAT GW (`nat-0edf6d0ff7ec26b80`)** — explicitly named "staging" so likely safe.
- **C — File AWS support ticket to raise EIP quota from 21 → 25** — clean, no risk, takes hours-days.
- **D — Re-architect to use a NAT instance instead of NAT GW** — uses an EC2 ENI's auto-assigned public IP (no EIP needed), cheaper (~$3/mo) but no HA / lower throughput / our maintenance burden.

**Recommended:** Option C (quota increase) — zero risk, $0 cost. Phase 54.6-01 simply pauses at this checkpoint until quota raised; VPC + subnets + IGW are already in place and idle ($0 cost). Once quota raised, re-run `bash scripts/setup-vpc-and-private-aurora.sh` (idempotent → completes from where it stopped).

If operator picks A or B (faster, free), the script can be re-run immediately after the chosen NAT GW deletes.

**Current state:** STOPPED at the EIP allocation step. No partial damage — VPC + IGW + 4 subnets are valid resources awaiting the NAT layer.

---

## What still needs to happen (Tasks 1-5 of plan 54.6-01)

- [x] **Task 1.a** — VPC + IGW + 4 subnets (DONE — see table above)
- [ ] **Task 1.b** — EIP + NAT GW + 2 route tables + 3 SGs (BLOCKED — EIP quota)
- [ ] **Task 2** — Operator GO/NO-GO checkpoint before snapshot cutover (PENDING — not yet reached)
- [ ] **Task 3** — Pre-flight baseline + final snapshot of old cluster
- [ ] **Task 4** — Restore snapshot into new private VPC + parity gate
- [ ] **Task 5** — Rollback runbook

---

## Resource IDs captured so far (for handoff)

```bash
VPC_ID=vpc-012ab4500dcd4ee41
IGW_ID=igw-0f7bb813b6b5edb0d
PUB_1A=subnet-0b5e4abedde216d3a
PUB_1B=subnet-02f98e40f1b4afef7
PRIV_1A=subnet-052ed80f6904b9fe7
PRIV_1B=subnet-07893035668f1b015
# EIP_ALLOC=<BLOCKED — quota exhausted>
# NAT_ID=<BLOCKED — depends on EIP>
# PUB_RT=<not yet created>
# PRIV_RT=<not yet created>
# LAMBDA_SG=<not yet created>
# PROXY_SG=<not yet created>
# AURORA_NEW_SG=<not yet created>
```

---

*Runbook updated 2026-05-15T06:55Z. Halted at EIP quota block. Awaiting operator decision A/B/C/D before resuming Task 1.b.*
