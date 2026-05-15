# Aurora VPC Migration Rollback — Phase 54.6-01

**Pre-condition:** Use this runbook if VPC-migrated Aurora is broken AND old cluster `zietra-aurora-prod` is still running (through **2026-05-29**, the 14-day rollback window).

**Trivially easy during Wave 1 (this plan only):** No Lambda env vars have flipped yet. All 4 Lambdas (`zietra-api`, `turion-demo-api`, `turion-satellite-api`, `marquee-app`) STILL point at the OLD endpoint. To rollback Wave 1 alone, you literally just delete the new private cluster. The old cluster keeps serving traffic uninterrupted.

**Estimated rollback wall-clock:** <2 min during Wave 1 (just delete new cluster). 5-10 min if Wave 2 had already flipped Lambdas (revert env vars + delete new cluster).

---

## Decision tree — when to roll back

| Scenario | Action |
|----------|--------|
| Parity diff non-empty at T+18min during 54.6-01 Task 4 | **HALT** Task 4. Execute Step 1 (delete new cluster) below. Re-snapshot at a quieter time and retry. Most likely cause: late writes between snapshot T0 and parity check (rare for low-traffic demo). |
| Restore stuck `creating` for >25 min | AWS RDS service issue. Open AWS support ticket. Keep waiting OR delete partial cluster (Step 1) and retry later. |
| Aurora new SG blocks parity check from operator | Re-add operator IP `/32` to `sg-099d916a8fe5cdb65` temporarily, re-run parity, revoke. (See Task 4 in migration runbook.) |
| Lambdas in 54.6-02 cutover fail to connect | Revert Lambda env vars per Step 3 below. Old cluster instantly resumes serving. Investigate, retry. |
| Customer reports broken site immediately post 54.6-02 cutover | Step 3 instant revert. Then root-cause via CloudWatch logs. |
| 7-day soak in 54.6-04 finds drift or errors | Same as above — Step 3 revert is still safe within 14 days. |

---

## State assumption before rollback

Before triggering rollback, capture the current state for the SUMMARY-of-rollback:

```bash
source .planning/phases/54.6-.../vpc-migration.handoff.sh

# What's running?
aws rds describe-db-clusters --db-cluster-identifier $OLD_CLUSTER \
  --query 'DBClusters[0].[Status,Endpoint]' --output json --region us-east-1
aws rds describe-db-clusters --db-cluster-identifier $NEW_CLUSTER \
  --query 'DBClusters[0].[Status,Endpoint]' --output json --region us-east-1

# Where do the 4 Lambdas point?
for FN in zietra-api turion-demo-api turion-satellite-api marquee-app; do
  echo "--- $FN ---"
  aws lambda get-function-configuration --function-name $FN \
    --query 'Environment.Variables.DATABASE_URL' --output text --region us-east-1 \
    | sed 's/postgresql:\/\/[^@]*@/postgresql:\/\/REDACTED@/'
done
```

If `DATABASE_URL` on all 4 Lambdas still contains `zietra-aurora-prod.cluster-c23qcukqe810` → **Wave 1 only**, use Steps 1 + (optional) 2.
If `DATABASE_URL` contains `zietra-aurora-prod-v2.cluster-c23qcukqe810` or an RDS Proxy endpoint → **Wave 2 has happened**, use Steps 3 + 1.

---

## Step 1 — Delete new private cluster + writer (Wave 1 rollback)

```bash
source .planning/phases/54.6-.../vpc-migration.handoff.sh
NEW_CLUSTER=zietra-aurora-prod-v2

# 1.a Delete writer first (cluster cannot be deleted while instance still attached)
aws rds delete-db-instance \
  --db-instance-identifier ${NEW_CLUSTER}-writer \
  --skip-final-snapshot \
  --region us-east-1
aws rds wait db-instance-deleted \
  --db-instance-identifier ${NEW_CLUSTER}-writer \
  --region us-east-1

# 1.b Delete cluster (keep the pre-migration snapshot — that's still our rollback target for the OLD cluster)
aws rds delete-db-cluster \
  --db-cluster-identifier $NEW_CLUSTER \
  --skip-final-snapshot \
  --region us-east-1
aws rds wait db-cluster-deleted \
  --db-cluster-identifier $NEW_CLUSTER \
  --region us-east-1

# 1.c Delete the DB subnet group (no clusters reference it after 1.b)
aws rds delete-db-subnet-group \
  --db-subnet-group-name zietra-aurora-private-subnets \
  --region us-east-1
```

**Effect:** New cluster + writer + master secret gone. Old cluster `zietra-aurora-prod` unaffected. The pre-migration snapshot `zietra-aurora-pre-vpc-migration-2026-05-15` is kept indefinitely. Lambdas (still on OLD endpoint) saw zero impact. **Estimated time: <2 min.**

---

## Step 2 — Optionally tear down VPC fabric (only if abandoning the phase entirely)

If we've decided to abandon Phase 54.6 entirely, we can also tear down the VPC. **Otherwise skip — keep the VPC ($3.08/mo NAT + EBS) for the retry.**

```bash
source .planning/phases/54.6-.../vpc-migration.handoff.sh

# 2.a Terminate NAT instance + delete its ENI (deletes automatically on terminate)
aws ec2 terminate-instances --instance-ids $NAT_INSTANCE_ID --region us-east-1
aws ec2 wait instance-terminated --instance-ids $NAT_INSTANCE_ID --region us-east-1

# 2.b Delete the 3 app SGs + NAT SG (no resources reference them now)
aws ec2 delete-security-group --group-id $AURORA_NEW_SG --region us-east-1
aws ec2 delete-security-group --group-id $PROXY_SG --region us-east-1
aws ec2 delete-security-group --group-id $LAMBDA_SG --region us-east-1
aws ec2 delete-security-group --group-id $NAT_SG --region us-east-1

# 2.c Disassociate and delete route tables
for ASSOC in $(aws ec2 describe-route-tables --route-table-ids $PUB_RT \
  --query 'RouteTables[0].Associations[?Main!=`true`].RouteTableAssociationId' \
  --output text --region us-east-1); do
  aws ec2 disassociate-route-table --association-id $ASSOC --region us-east-1
done
for ASSOC in $(aws ec2 describe-route-tables --route-table-ids $PRIV_RT \
  --query 'RouteTables[0].Associations[?Main!=`true`].RouteTableAssociationId' \
  --output text --region us-east-1); do
  aws ec2 disassociate-route-table --association-id $ASSOC --region us-east-1
done
aws ec2 delete-route-table --route-table-id $PUB_RT --region us-east-1
aws ec2 delete-route-table --route-table-id $PRIV_RT --region us-east-1

# 2.d Delete 4 subnets
for SN in $PUB_1A $PUB_1B $PRIV_1A $PRIV_1B; do
  aws ec2 delete-subnet --subnet-id $SN --region us-east-1
done

# 2.e Detach + delete IGW
aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region us-east-1
aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID --region us-east-1

# 2.f Delete VPC
aws ec2 delete-vpc --vpc-id $VPC_ID --region us-east-1
```

**Reversible alternative:** Keep VPC running and retry cutover when ready. Cost is only $3.08/mo while idle.

---

## Step 3 — Wave 2 rollback (if Lambda env vars HAVE been flipped to new endpoint)

This applies if 54.6-02 ran and updated Lambda DATABASE_URL env vars. The mechanics mirror `.planning/runbooks/aurora-rollback-54-5-03.md` Step 1.

**Pre-condition:** 54.6-02 saved pre-flip Lambda env snapshots to `.planning/phases/54.6-.../lambda-env-snapshots/` (the plan REQUIRES this). If not, reconstruct from `OLD_ENDPOINT` in the handoff env:
```
postgresql://zietra_admin:<OLD_PW>@zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com:5432/zietra
```

```bash
# 3.a Resolve OLD master password (kept in old Secrets Manager secret)
source .planning/phases/54.6-.../vpc-migration.handoff.sh
OLD_PW=$(aws secretsmanager get-secret-value --secret-id "$OLD_MASTER_SECRET_ARN" \
  --query SecretString --output text --region us-east-1 | jq -r .password)

OLD_DATABASE_URL="postgresql://zietra_admin:${OLD_PW}@${OLD_ENDPOINT}:5432/zietra"

# 3.b Flip all 4 Lambdas back to OLD endpoint atomically
# IMPORTANT: pull current Environment.Variables, override DATABASE_URL only, re-apply
for FN in zietra-api turion-demo-api turion-satellite-api marquee-app; do
  echo "--- Reverting $FN ---"
  CURRENT_ENV=$(aws lambda get-function-configuration --function-name $FN \
    --query 'Environment.Variables' --output json --region us-east-1)
  NEW_ENV=$(echo "$CURRENT_ENV" | jq --arg url "$OLD_DATABASE_URL" \
    '.DATABASE_URL = $url')
  aws lambda update-function-configuration --function-name $FN \
    --environment "Variables=$NEW_ENV" --region us-east-1 \
    --query 'LastUpdateStatus' --output text
done

# 3.c Wait for all Lambda updates to converge
for FN in zietra-api turion-demo-api turion-satellite-api marquee-app; do
  aws lambda wait function-updated --function-name $FN --region us-east-1
done

# 3.d Smoke test old endpoint
PGPASSWORD="$OLD_PW" psql -h "$OLD_ENDPOINT" -U zietra_admin -d zietra -c "SELECT now();"

# 3.e Smoke each Lambda via its public endpoint (depends on the Lambda)
# zietra-api:        curl -s https://api.zietra.com/api/health
# turion-demo-api:   curl -s https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health
# turion-satellite:  curl -s https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health
# marquee-app:       curl -s https://marquee.zietra.com/api/health
```

**Effect:** Lambdas immediately resume hitting OLD cluster. New cluster + RDS Proxy left in place for diagnosis. Once root cause identified, can retry 54.6-02 cutover.

---

## Step 4 — Data-loss accounting (only if Wave 2 was live + took writes)

If new cluster received writes between Wave 2 cutover and rollback, those writes are NOT on the old cluster.

**For Wave 1 alone (this plan):** No writes are possible — Lambdas still hit OLD endpoint. Zero data loss.

**For Wave 2 rollback scenario:**

```bash
# 4.a Connect to new cluster (still up) and dump rows newer than the cutover timestamp
# Most Zietra tables have created_at/updated_at columns
NEW_PW=$(aws secretsmanager get-secret-value --secret-id "$NEW_MASTER_SECRET_ARN" \
  --query SecretString --output text --region us-east-1 | jq -r .password)

CUTOVER_TS="2026-05-15T07:35:00Z"   # set to actual Wave 2 cutover timestamp

for TABLE in crm.activities crm.contacts crm.deals turion.work_orders \
             turion_satellite.part_instances; do
  PGPASSWORD="$NEW_PW" psql -h "$NEW_ENDPOINT" -U zietra_admin -d zietra \
    -c "\COPY (SELECT * FROM $TABLE WHERE updated_at > '$CUTOVER_TS') TO STDOUT" \
    > /tmp/new-writes-${TABLE//./_}.csv
done

# 4.b Inspect, then replay onto old cluster via pg_dump --data-only OR manual UPSERT
# This is per-table because Zietra has 153 tables across 4 schemas — operator judgement needed.
```

---

## Decision tree quick reference

```
Did 54.6-02 run yet?
├── NO  → Step 1 (delete new cluster). Done.
│         Optionally: Step 2 (tear down VPC). Cost savings ~$3/mo if abandoning phase entirely.
│
└── YES → Step 3 (flip Lambdas back to OLD endpoint). Smoke test old.
          Then Step 4 (recover writes from new cluster onto old, if any).
          Then Step 1 (delete new cluster).
          New cluster + RDS Proxy can be left in place for diagnosis if root cause unclear.
```

---

## Old cluster final deletion (planned 2026-05-29)

After the 14-day rollback window closes AND 54.6-02 + 54.6-03 + 54.6-04 all complete cleanly, schedule deletion of OLD cluster + OLD SG:

```bash
# On 2026-05-29 (NOT before):
aws rds delete-db-instance \
  --db-instance-identifier zietra-aurora-prod-writer \
  --skip-final-snapshot --region us-east-1
aws rds wait db-instance-deleted --db-instance-identifier zietra-aurora-prod-writer --region us-east-1

aws rds delete-db-cluster \
  --db-cluster-identifier zietra-aurora-prod \
  --skip-final-snapshot --region us-east-1
aws rds wait db-cluster-deleted --db-cluster-identifier zietra-aurora-prod --region us-east-1

aws ec2 delete-security-group --group-id sg-0760238c408d0f2b7 --region us-east-1
```

**Important:** The pre-migration snapshot `zietra-aurora-pre-vpc-migration-2026-05-15` is retained INDEFINITELY (NOT deleted with the cluster — manual snapshots survive cluster deletion). It remains the absolute final rollback target.

---

## Resources reference (from 54.6-01)

| Resource | ID |
|----------|----|
| OLD cluster | `zietra-aurora-prod` (KEPT through 2026-05-29) |
| OLD endpoint | `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com` |
| OLD SG | `sg-0760238c408d0f2b7` (0/0:5432 — closed in 54.6-02 Task 4) |
| OLD master secret | `arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9-VbuP4h` |
| Pre-migration snapshot | `zietra-aurora-pre-vpc-migration-2026-05-15` (retain indefinitely) |
| NEW cluster | `zietra-aurora-prod-v2` |
| NEW endpoint | `zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com` |
| NEW master secret | `arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473` |
| NEW Aurora SG | `sg-099d916a8fe5cdb65` (proxy-SG ingress only) |
| RDS Proxy SG | `sg-0e066f754bf795ed5` |
| Lambda SG | `sg-01768e18aaa6d3173` |
| Handoff env file | `.planning/phases/54.6-.../vpc-migration.handoff.sh` |

---

*Runbook written 2026-05-15T07:40Z (Phase 54.6-01 Task 5).*
*14-day rollback window through 2026-05-29.*
*Author: GSD executor (Claude Code) — AWS account 134607809447, region us-east-1.*
