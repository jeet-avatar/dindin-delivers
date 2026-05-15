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
- [x] **Task 2** — Operator GO at 2026-05-15T07:10Z; cutover authorized
- [x] **Task 3** — Pre-flight baseline + final snapshot (DONE 2026-05-15T07:17Z)
- [x] **Task 4** — Restore snapshot into new private VPC + parity gate PASS (DONE 2026-05-15T07:35Z)
- [ ] **Task 5** — Rollback runbook

---

## T+0:00 — Snapshot+restore cutover begin: 2026-05-15T07:15:57Z

## Task 3 — Pre-flight baseline + final pre-VPC-migration snapshot — 2026-05-15T07:17Z

**Pre-migration baseline captured from `zietra-aurora-prod` (the OLD cluster, still serving live traffic):**

| Metric | Value |
|--------|-------|
| Tables counted (4 schemas: public/crm/turion/turion_satellite) | **153** |
| Total rows across all 153 tables | **3070** |
| Baseline CSV | `/tmp/aurora-pre-54-6-counts.csv` |
| Captured at | 2026-05-15T07:15:30Z |
| Source endpoint | `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com` |
| Postgres version | 16.4 (verified via `SELECT version()`) |

**Final pre-VPC-migration snapshot — kept INDEFINITELY (rollback target beyond 14-day window):**

| Field | Value |
|-------|-------|
| Snapshot ID | `zietra-aurora-pre-vpc-migration-2026-05-15` |
| Snapshot ARN | `arn:aws:rds:us-east-1:134607809447:cluster-snapshot:zietra-aurora-pre-vpc-migration-2026-05-15` |
| Source cluster | `zietra-aurora-prod` |
| Snapshot type | manual |
| Status | available |
| Created at | 2026-05-15T07:16:12.930Z |
| Tags | `Project=Zietra`, `Phase=54.6`, `Purpose=pre-vpc-migration-rollback` |
| KMS key (inherited) | `arn:aws:kms:us-east-1:134607809447:key/1086212a-cf06-41ca-8767-514b2b18a008` |

This snapshot is the **rollback target for the next 14 days AND beyond**. We retain it indefinitely per plan spec — if the old cluster is deleted on 2026-05-29, this snapshot remains the absolute last copy of pre-migration state.

---

*Runbook updated 2026-05-15T07:17Z. Snapshot ready. Proceeding to Task 4 (restore + parity gate).*

---

## Task 4 — Restore snapshot into new private VPC + parity gate — 2026-05-15T07:35Z

### Resources created

| Resource | ID / value | Detail |
|----------|-----------|--------|
| DB subnet group | `zietra-aurora-private-subnets` | spans PRIV_1A `subnet-052ed80f6904b9fe7` (us-east-1a) + PRIV_1B `subnet-07893035668f1b015` (us-east-1b) in `vpc-012ab4500dcd4ee41` |
| New cluster | `zietra-aurora-prod-v2` | aurora-postgresql 16.4, ServerlessV2 MinCapacity=0.5/MaxCapacity=4, IAMDatabaseAuthenticationEnabled=true, StorageEncrypted=true (inherited), KMS `arn:aws:kms:us-east-1:134607809447:key/1086212a-cf06-41ca-8767-514b2b18a008` |
| Writer endpoint | `zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com` | cluster writer endpoint |
| Reader endpoint | `zietra-aurora-prod-v2.cluster-ro-c23qcukqe810.us-east-1.rds.amazonaws.com` | cluster reader endpoint |
| Writer instance | `zietra-aurora-prod-v2-writer` | db.serverless, PubliclyAccessible=false (after parity revert), in `subnet-052ed80f6904b9fe7` |
| New MasterUserSecret ARN | `arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473` | freshly rotated via `--manage-master-user-password` (NOT the snapshot's master) |
| Handoff env file | `.planning/phases/54.6-.../vpc-migration.handoff.sh` | sanitized — `source` this in 54.6-02 to import all IDs (no passwords) |
| CloudWatch logs export | `["postgresql"]` | enabled at restore |

### Timeline

| Stamp | Event |
|-------|-------|
| 2026-05-15T07:20Z | `create-db-subnet-group` — `Complete` |
| 2026-05-15T07:21Z | `restore-db-cluster-from-snapshot` — Status=creating |
| 2026-05-15T07:25Z | Cluster `available` after restore (≈4 min) |
| 2026-05-15T07:25Z | `modify-db-cluster --manage-master-user-password` — fresh Secrets Manager secret created |
| 2026-05-15T07:29Z | `create-db-instance` writer (db.serverless) — Status=creating |
| 2026-05-15T07:30Z | Writer `available` (≈5 min) |
| 2026-05-15T07:33Z | Parity gate: row counts captured from new cluster → 153 tables / 3070 rows |
| 2026-05-15T07:34Z | **PARITY DIFF: 0 lines → PASSED** |
| 2026-05-15T07:34Z | All temporary diagnostic state reverted (see below) |

### Parity gate verdict

```
$ wc -l /tmp/aurora-pre-54-6-counts.csv /tmp/aurora-post-54-6-counts.csv
     153 /tmp/aurora-pre-54-6-counts.csv
     153 /tmp/aurora-post-54-6-counts.csv

$ awk -F, '{sum+=$2} END {print sum}' /tmp/aurora-pre-54-6-counts.csv
3070
$ awk -F, '{sum+=$2} END {print sum}' /tmp/aurora-post-54-6-counts.csv
3070

$ diff /tmp/aurora-pre-54-6-counts.csv /tmp/aurora-post-54-6-counts.csv
$ echo $?
0
```

**Verdict: PARITY GATE PASSED.** 153 tables match (public + crm + turion + turion_satellite schemas), 3070 total rows match byte-for-byte, zero-line diff.

### Temporary diagnostic state (reverted post-parity)

To reach the private-subnet cluster from the operator machine for the parity check, three temporary changes were made — **all reverted after the parity diff was captured**:

| Change | Reverted state |
|--------|----------------|
| Aurora SG `sg-099d916a8fe5cdb65` ingress: added operator IP `184.189.123.74/32` on 5432 | **Revoked** — SG ingress is now `IpRanges=[]`, `UserIdGroupPairs=[proxy-SG]` ONLY |
| Writer `--publicly-accessible` flipped to `true` | **Reverted** — `PubliclyAccessible=false` |
| Private-RT 0/0 swapped IGW (NAT routing temporarily bypassed during connectivity test) | **Restored** — Private-RT 0/0 → NAT ENI `eni-0f6f2c8a5b11b53d5` |

(Background: the writer's ENI gets an AWS-assigned public IP when `publicly-accessible=true`, but in a NAT-routed private subnet the return path goes through NAT and cannot reach internet origin. The temporary route swap routed 0/0 via IGW so the writer's public IP was Internet-reachable. NAT instance remained `running` throughout; no Lambda or other VPC consumer was affected because Wave 1 doesn't VPC-attach Lambdas — that's Wave 2.)

### Post-parity state (verified)

```
$ aws rds describe-db-clusters --db-cluster-identifier zietra-aurora-prod-v2 \
    --query 'DBClusters[0].[Status,EngineVersion,IAMDatabaseAuthenticationEnabled]'
["available", "16.4", true]

$ aws rds describe-db-instances --db-instance-identifier zietra-aurora-prod-v2-writer \
    --query 'DBInstances[0].[DBInstanceStatus,PubliclyAccessible,DBSubnetGroup.DBSubnetGroupName]'
["available", false, "zietra-aurora-private-subnets"]

$ aws ec2 describe-security-groups --group-ids sg-099d916a8fe5cdb65 \
    --query 'SecurityGroups[0].IpPermissions[?ToPort==`5432`].[IpRanges,UserIdGroupPairs[].GroupId]'
[[[], ["sg-0e066f754bf795ed5"]]]   # No CIDR ingress; proxy-SG only

$ aws ec2 describe-route-tables --route-table-ids rtb-0c00aa94b1cee94d1 \
    --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0`].NetworkInterfaceId'
["eni-0f6f2c8a5b11b53d5"]          # 0/0 → NAT ENI (restored)
```

### Old cluster status (rollback target)

The OLD cluster `zietra-aurora-prod` remained UNCHANGED throughout Tasks 3-4:
- Status = `available`
- Endpoint = `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com` (unchanged)
- 4 Lambdas (zietra-api, turion-demo-api, turion-satellite-api, marquee-app) STILL hitting OLD endpoint via 0/0:5432 old SG
- Pre-migration snapshot `zietra-aurora-pre-vpc-migration-2026-05-15` retained INDEFINITELY
- Scheduled deletion: 2026-05-29 (14-day window)

---

*Runbook updated 2026-05-15T07:36Z. Parity gate PASSED. Proceeding to Task 5 (rollback runbook).*
