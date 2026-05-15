# Aurora Provisioning Runbook — Phase 54.5-01

> Live record of every `aws` CLI invocation + the actual values returned during the provisioning of `zietra-aurora-prod`. Captured in real time during Phase 54.5 Plan 01 execution.
>
> **Account:** `134607809447` · **Region:** `us-east-1` · **Engine:** `aurora-postgresql 16.4` · **Mode:** Serverless v2 (0.5–4 ACU)
>
> Started: `2026-05-15T03:37:45Z`

---

## Task 1 — Networking pre-requisites

Started: `2026-05-15T03:37:45Z`

### Inputs discovered

| Variable | Value |
|----------|-------|
| `DEFAULT_VPC` | `vpc-019418bb8d484ad8c` |
| `AZ_COUNT` | `6` (us-east-1a, 1b, 1c, 1d, 1e, 1f) |

### Subnets (default VPC, all 6 AZs)

| AZ | Subnet ID |
|----|-----------|
| us-east-1a | `subnet-07f752a51bc45c90c` |
| us-east-1b | `subnet-0f93bd819cd829a1d` |
| us-east-1c | `subnet-03d490f59589f3b0b` |
| us-east-1d | `subnet-043e874e52f45681f` |
| us-east-1e | `subnet-03b54056b26178c6d` |
| us-east-1f | `subnet-069fdeb3f8cb48783` |

### DB subnet group

| Field | Value |
|-------|-------|
| Name | `zietra-aurora-subnets` |
| VPC | `vpc-019418bb8d484ad8c` |
| Status | `Complete` |
| AZ coverage | 6 AZs (≥2 required) |

**Deviation [Rule 3 - Blocking]:** First two attempts to pass `--subnet-ids $SUBNETS` (tab-separated and then space-separated from CLI tokenization) failed:
- Attempt 1 (raw `--output text`): `InvalidParameterValue: Input can't contain control characters` (tabs)
- Attempt 2 (space-joined): `InvalidParameterValue: Some input subnets in :[…] are invalid` (CLI joined into one arg)

**Fix:** switched to `--cli-input-json file://…` with a JSON `SubnetIds` array. Reliable across `aws-cli/1.42.43`. Captured in `/tmp/aurora-subnet-group.json`.

### Security group

| Field | Value |
|-------|-------|
| `SG_ID` | `sg-0760238c408d0f2b7` |
| Name | `zietra-aurora-sg` |
| VPC | `vpc-019418bb8d484ad8c` |
| Ingress rule | `tcp/5432` from `0.0.0.0/0` (cutover-only — tightened in 54.5-03) |
| Ingress rule ID | `sgr-06de28621424b8a7d` |
| Tags | `Project=Zietra`, `Environment=production`, `Phase=54.5` |

### Verification (gate)

```bash
$ aws ec2 describe-security-groups --filters Name=group-name,Values=zietra-aurora-sg --region us-east-1 \
    --query 'SecurityGroups[0].IpPermissions[?ToPort==`5432`].IpRanges[].CidrIp' --output text
0.0.0.0/0
$ aws rds describe-db-subnet-groups --db-subnet-group-name zietra-aurora-subnets --region us-east-1 \
    --query 'DBSubnetGroups[0].Subnets[*].SubnetAvailabilityZone.Name' --output text \
    | tr '\t' '\n' | sort -u | wc -l
6
```

Task 1 status: **PASS** at `2026-05-15T03:39Z`.

---

## Task 2 — Aurora cluster + writer instance

Started: `2026-05-15T03:39Z` · Cluster available: `2026-05-15T03:40:42Z` · Writer available: `2026-05-15T03:45:47Z` · Wall time: ~6 min

### Cluster

| Field | Value |
|-------|-------|
| Cluster ID | `zietra-aurora-prod` |
| Cluster ARN | `arn:aws:rds:us-east-1:134607809447:cluster:zietra-aurora-prod` |
| Engine | `aurora-postgresql 16.4` |
| Mode | Serverless v2 (MinACU=0.5, MaxACU=4) |
| Database name | `zietra` |
| Master user | `zietra_admin` (password auto-managed) |
| Backup retention | 7 days, window 07:00-09:00 UTC |
| Maintenance window | sun:09:00-sun:11:00 UTC |
| Storage encryption | enabled (KMS `arn:aws:kms:us-east-1:134607809447:key/1086212a-cf06-41ca-8767-514b2b18a008`) |
| CloudWatch Logs export | `postgresql` |
| IAM DB auth | enabled |
| **Writer endpoint** | `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com` |
| **Reader endpoint** | `zietra-aurora-prod.cluster-ro-c23qcukqe810.us-east-1.rds.amazonaws.com` |
| Status | `available` |

### Master credential (auto-managed)

| Field | Value |
|-------|-------|
| Secret ARN | `arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9-VbuP4h` |
| Secret status | `active` |
| Resolved password | redacted (length 28) |

### Writer instance

| Field | Value |
|-------|-------|
| Instance ID | `zietra-aurora-prod-writer` |
| Class | `db.serverless` |
| Publicly accessible | `true` |
| Status | `available` |
| Performance Insights | enabled (7-day retention, free tier) |

### Verification (gates)

```bash
$ PGPASSWORD="<redacted>" psql -h zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com \
    -U zietra_admin -d zietra -c "SELECT version();"
 PostgreSQL 16.4 on aarch64-unknown-linux-gnu, compiled by gcc 9.5.0, 64-bit
exit=0
```

### Operator env files

- `/tmp/aurora-cutover.env` — operator-only, mode 600, contains real `MASTER_PW`
- `.planning/phases/54.5-aurora-postgres-migration-leave-supabase/aurora-cutover.env.example` — sanitized (placeholders), git-committed

**Deviation [Rule 1 - Bug]:** Plan named the git-committed file `aurora-cutover.env` but the project's `.git/hooks/pre-commit` blocks any `*.env` or `*.env.local` regardless of content (`grep -qE '\\.env$|\\.env\\.local$'` at line 28). Renamed to `aurora-cutover.env.example` — the hook explicitly allows `.env.example` per its own comment ("Block .env files with actual secrets (not .env.example or .env.staging)"). File contents unchanged. Downstream plans 54.5-02/03/04 should source `aurora-cutover.env.example` (or `cp` it to `aurora-cutover.env` locally for tooling compatibility).

Task 2 status: **PASS** at `2026-05-15T03:46Z`.



---

## Task 3 — Extensions, schemas, baseline snapshot

_Pending — to be appended live._

---

## Task 4 — CloudWatch alarms + AWS Budget

_Pending — to be appended live._
