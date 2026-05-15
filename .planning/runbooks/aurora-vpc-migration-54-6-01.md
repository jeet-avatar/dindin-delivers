# Aurora VPC Migration Runbook — Phase 54.6-01

**Live cutover record.** Updated as Phase 54.6-01 Wave 1 executes (VPC provisioning → final snapshot → restore-to-new-cluster in private subnets → parity gate).

---

## T+0:00 — VPC provisioning begin: 2026-05-15T06:53:59Z

Operator: GSD executor (Claude Code), AWS account `134607809447`, region `us-east-1`.

---

## NAT pivot — 2026-05-15T07:05Z (Option D selected)

Operator decision following the EIP-quota Rule-4 architectural checkpoint: **Option D — NAT instance instead of NAT Gateway.**

**Rationale:**
- Avoids the 21/21 EIP quota ceiling (no EIP required — NAT instance gets an auto-assigned public IP on the public subnet ENI).
- Saves ~$30/mo vs NAT Gateway ($3.07/mo t4g.nano vs ~$33/mo NAT GW).
- Acceptable for demo workload — lower HA (single EC2, no multi-AZ failover) is tolerable; AWS-managed NAT GW upgrade path is documented below.

**Tradeoffs accepted:**
- Lower HA — if the NAT instance dies, private subnets lose egress until manual restart. Mitigation: t4g.nano is a Nitro instance running AL2023 (stable); CloudWatch alarm on instance status is a follow-up.
- Lower throughput (~5 Gbps vs 45 Gbps NAT GW). Ample for demo + Lambda traffic.
- Our maintenance burden — AMI updates, iptables persistence, kernel updates. Mitigated by `rc.local` MASQUERADE rule that survives reboot.

**Upgrade path back to NAT Gateway (when EIP quota is raised):**
1. `aws ec2 allocate-address --domain vpc` to get a free EIP (post quota raise).
2. `aws ec2 create-nat-gateway --subnet-id $PUB_1A --allocation-id <eipalloc>` and wait for `available`.
3. `aws ec2 replace-route --route-table-id $PRIV_RT --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <natid>` (atomic swap — no downtime for outbound traffic if NAT GW is ready first).
4. `aws ec2 terminate-instances --instance-ids $NAT_INSTANCE_ID`.
5. `aws ec2 delete-security-group --group-id $NAT_SG`.

Estimated upgrade window: <30 min. Acceptable maintenance window for the demo workload.

---

## VPC + Subnets + IGW + NAT instance + Route tables + 3 SGs — COMPLETE

The idempotent script `scripts/setup-vpc-and-private-aurora.sh` was executed at 2026-05-15T07:05Z. After NAT pivot edit, re-run succeeded end-to-end. VPC/IGW/4 subnets from prior run were skipped (idempotent); NAT instance + NAT SG + 2 route tables + 3 app SGs created fresh.

### Resource map

| Resource | Name | ID | State | Detail | Created |
|----------|------|----|-------|--------|---------|
| VPC | `zietra-prod-vpc` | `vpc-012ab4500dcd4ee41` | available | 10.0.0.0/16 | 2026-05-15T06:54Z |
| IGW | `zietra-prod-igw` | `igw-0f7bb813b6b5edb0d` | attached | — | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-public-1a` | `subnet-0b5e4abedde216d3a` | available | 10.0.0.0/24 / us-east-1a, MapPublicIpOnLaunch=true | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-public-1b` | `subnet-02f98e40f1b4afef7` | available | 10.0.1.0/24 / us-east-1b | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-private-1a` | `subnet-052ed80f6904b9fe7` | available | 10.0.10.0/24 / us-east-1a | 2026-05-15T06:54Z |
| Subnet | `zietra-prod-private-1b` | `subnet-07893035668f1b015` | available | 10.0.11.0/24 / us-east-1b | 2026-05-15T06:54Z |
| NAT instance | `zietra-nat-instance` | `i-0e9159d87ede802bd` | running | t4g.nano, AL2023 ARM (`ami-0f8551bed4b9b7adb`), SourceDestCheck=false, PublicIP=34.205.27.197 | 2026-05-15T07:05Z |
| NAT instance ENI | (primary) | `eni-0f6f2c8a5b11b53d5` | in-use | attached to NAT instance | 2026-05-15T07:05Z |
| NAT SG | `zietra-nat-instance-sg` | `sg-0400616d58a1129b6` | — | inbound all-traffic from 10.0.0.0/16; default egress | 2026-05-15T07:05Z |
| Public RT | `zietra-prod-public-rt` | `rtb-050b67fa351db37bd` | — | 0.0.0.0/0 → IGW; associated to public-1a + public-1b | 2026-05-15T07:05Z |
| Private RT | `zietra-prod-private-rt` | `rtb-0c00aa94b1cee94d1` | — | 0.0.0.0/0 → NAT ENI `eni-0f6f2c8a5b11b53d5`; associated to private-1a + private-1b | 2026-05-15T07:05Z |
| Lambda SG | `zietra-prod-lambda-sg` | `sg-01768e18aaa6d3173` | — | no ingress; default egress allow-all | 2026-05-15T07:05Z |
| RDS Proxy SG | `zietra-prod-rds-proxy-sg` | `sg-0e066f754bf795ed5` | — | 5432 ingress from lambda-sg | 2026-05-15T07:05Z |
| Aurora new SG | `zietra-prod-aurora-sg` | `sg-099d916a8fe5cdb65` | — | 5432 ingress from rds-proxy-sg ONLY (NO 0.0.0.0/0) | 2026-05-15T07:05Z |

**VPC attributes verified:** DNS hostnames + DNS support both `enabled`.

**Cost now:** NAT instance ~$3.07/mo (t4g.nano on-demand, 100% uptime) + ~$0.01/mo for EBS root (8GB gp3); IGW/VPC/subnets/route tables/SGs all $0.

---

## T+1:12 (after pivot) — VPC fabric COMPLETE. Ready for Aurora migration.

```bash
# Sourceable env (also written to vpc-migration.env at Task 4)
VPC_ID=vpc-012ab4500dcd4ee41
IGW_ID=igw-0f7bb813b6b5edb0d
PUB_1A=subnet-0b5e4abedde216d3a
PUB_1B=subnet-02f98e40f1b4afef7
PRIV_1A=subnet-052ed80f6904b9fe7
PRIV_1B=subnet-07893035668f1b015
NAT_INSTANCE_ID=i-0e9159d87ede802bd
NAT_ENI_ID=eni-0f6f2c8a5b11b53d5
NAT_PUBLIC_IP=34.205.27.197
NAT_SG=sg-0400616d58a1129b6
PUB_RT=rtb-050b67fa351db37bd
PRIV_RT=rtb-0c00aa94b1cee94d1
LAMBDA_SG=sg-01768e18aaa6d3173
PROXY_SG=sg-0e066f754bf795ed5
AURORA_NEW_SG=sg-099d916a8fe5cdb65
```

---

## Task progress (against plan 54.6-01)

- [x] **Task 1.a** — VPC + IGW + 4 subnets (DONE 2026-05-15T06:54Z, commit `677b2111`)
- [x] **Task 1.b** — NAT instance + NAT SG + 2 route tables + 3 app SGs (DONE 2026-05-15T07:05Z, after NAT pivot)
- [ ] **Task 2** — Operator GO/NO-GO checkpoint before snapshot cutover (PENDING — executor PAUSES here per plan)
- [ ] **Task 3** — Pre-flight baseline + final snapshot of old cluster (BLOCKED on Task 2 GO)
- [ ] **Task 4** — Restore snapshot into new private VPC + parity gate (BLOCKED on Task 2 GO)
- [ ] **Task 5** — Rollback runbook (BLOCKED on Task 2 GO)

**Why we stop at Task 2:** the plan places its only blocking checkpoint at Task 2, before any Aurora touch. The orchestrator's resume prompt directs us not to execute the cutover. Tasks 3+4 ARE the cutover (snapshot + restore + parity), so they remain blocked. The new private VPC fabric is built and parked at $3.08/mo (NAT instance + EBS) until the operator says "go" for the snapshot.

---

*Runbook updated 2026-05-15T07:08Z. NAT pivot complete. Awaiting operator GO at Task 2 checkpoint before snapshot+restore.*
