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

_Pending — to be appended live._

---

## Task 3 — Extensions, schemas, baseline snapshot

_Pending — to be appended live._

---

## Task 4 — CloudWatch alarms + AWS Budget

_Pending — to be appended live._
