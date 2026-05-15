# Phase 54.6-01 — sanitized handoff for 54.6-02/03/04
#
# Source this file at the start of 54.6-02 (Lambda VPC-attach + connection-string flip).
# Resolve NEW_MASTER_SECRET_ARN to the password via Secrets Manager — no passwords committed here.
#
# Generated: 2026-05-15T07:35Z (Phase 54.6-01 Task 4 completion)

# --- NEW VPC FABRIC (Phase 54.6-01 Task 1.a + 1.b) ---
export VPC_ID=vpc-012ab4500dcd4ee41
export IGW_ID=igw-0f7bb813b6b5edb0d
export PUB_1A=subnet-0b5e4abedde216d3a       # us-east-1a, 10.0.0.0/24, MapPublicIpOnLaunch=true
export PUB_1B=subnet-02f98e40f1b4afef7       # us-east-1b, 10.0.1.0/24
export PRIV_1A=subnet-052ed80f6904b9fe7      # us-east-1a, 10.0.10.0/24
export PRIV_1B=subnet-07893035668f1b015      # us-east-1b, 10.0.11.0/24
export PUB_RT=rtb-050b67fa351db37bd          # 0/0 → IGW
export PRIV_RT=rtb-0c00aa94b1cee94d1         # 0/0 → NAT ENI

# --- NAT INSTANCE (replaces NAT Gateway after EIP-quota pivot) ---
export NAT_INSTANCE_ID=i-0e9159d87ede802bd   # t4g.nano, AL2023 ARM
export NAT_ENI_ID=eni-0f6f2c8a5b11b53d5
export NAT_PUBLIC_IP=34.205.27.197
export NAT_SG=sg-0400616d58a1129b6           # allows 10.0.0.0/16 inbound

# --- APP SECURITY GROUPS ---
export LAMBDA_SG=sg-01768e18aaa6d3173        # no ingress; egress allow-all
export PROXY_SG=sg-0e066f754bf795ed5         # 5432 ingress from LAMBDA_SG
export AURORA_NEW_SG=sg-099d916a8fe5cdb65    # 5432 ingress from PROXY_SG ONLY (NO 0/0)

# --- NEW AURORA CLUSTER (Phase 54.6-01 Task 4) ---
export NEW_CLUSTER=zietra-aurora-prod-v2
export NEW_ENDPOINT=zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com
export NEW_READER_ENDPOINT=zietra-aurora-prod-v2.cluster-ro-c23qcukqe810.us-east-1.rds.amazonaws.com
export NEW_WRITER_INSTANCE=zietra-aurora-prod-v2-writer
export NEW_WRITER_ENDPOINT=zietra-aurora-prod-v2-writer.c23qcukqe810.us-east-1.rds.amazonaws.com
export NEW_MASTER_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473
export NEW_CLUSTER_KMS_KEY=arn:aws:kms:us-east-1:134607809447:key/1086212a-cf06-41ca-8767-514b2b18a008
export AURORA_SUBNET_GROUP=zietra-aurora-private-subnets

# --- OLD CLUSTER (kept LIVE for 14-day rollback through 2026-05-29) ---
export OLD_CLUSTER=zietra-aurora-prod
export OLD_ENDPOINT=zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com
export OLD_SG=sg-0760238c408d0f2b7            # 0/0:5432 — CLOSE in 54.6-02 Task 4 after Lambdas soak
export OLD_MASTER_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9-VbuP4h
export OLD_PRE_MIGRATION_SNAPSHOT=zietra-aurora-pre-vpc-migration-2026-05-15
export OLD_PRE_MIGRATION_SNAPSHOT_ARN=arn:aws:rds:us-east-1:134607809447:cluster-snapshot:zietra-aurora-pre-vpc-migration-2026-05-15
export OLD_CLUSTER_DELETE_DATE=2026-05-29

# --- PARITY GATE STATE (Phase 54.6-01 Task 4) ---
# 153 tables · 3070 rows · diff /tmp/aurora-pre-54-6-counts.csv /tmp/aurora-post-54-6-counts.csv = 0 lines
# Verdict: PASSED
