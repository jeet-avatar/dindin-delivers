#!/usr/bin/env bash
# Phase 54.6-01 — Provision zietra-prod-vpc + 4 subnets + IGW + NAT GW + 3 SGs
#
# IDEMPOTENT: safe to re-run. Each resource is created only if a matching Name-tagged
# resource is not already present. Returns existing IDs on re-run.
#
# Naming convention (LOCKED per RESEARCH §A.1 + critical_constraints):
#   VPC:      zietra-prod-vpc           10.0.0.0/16
#   Subnets:  zietra-prod-public-1a     10.0.0.0/24  us-east-1a
#             zietra-prod-public-1b     10.0.1.0/24  us-east-1b
#             zietra-prod-private-1a    10.0.10.0/24 us-east-1a
#             zietra-prod-private-1b    10.0.11.0/24 us-east-1b
#   IGW:      zietra-prod-igw
#   NAT GW:   zietra-prod-nat           (in public-1a; single AZ — HA NAT deferred to M8)
#   EIP:      zietra-prod-nat-eip
#   Routes:   zietra-prod-public-rt     (public-1a, public-1b → IGW)
#             zietra-prod-private-rt    (private-1a, private-1b → NAT GW)
#   SGs:      zietra-prod-lambda-sg     (no ingress; default egress allow-all)
#             zietra-prod-rds-proxy-sg  (5432 ingress from lambda-sg)
#             zietra-prod-aurora-sg     (5432 ingress from rds-proxy-sg ONLY — NO 0/0)
#
# Usage:  bash scripts/setup-vpc-and-private-aurora.sh
# Output: writes resource IDs to stdout in `KEY=value` form (sourceable)

set -euo pipefail
REGION=us-east-1
PHASE_TAG=54.6
ENV_TAG=production

log() { echo "[setup-vpc] $*" >&2; }

# ---------- VPC ----------
get_or_create_vpc() {
  local existing
  existing=$(aws ec2 describe-vpcs \
    --filters Name=tag:Name,Values=zietra-prod-vpc \
    --query 'Vpcs[0].VpcId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "VPC zietra-prod-vpc already exists: $existing"
    echo "$existing"
    return
  fi
  log "Creating VPC zietra-prod-vpc (10.0.0.0/16)"
  aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=zietra-prod-vpc},{Key=Phase,Value=$PHASE_TAG},{Key=Environment,Value=$ENV_TAG}]" \
    --region "$REGION" --query 'Vpc.VpcId' --output text
}

VPC_ID=$(get_or_create_vpc)
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames --region "$REGION"
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support --region "$REGION"
log "VPC ready: $VPC_ID (DNS hostnames + DNS support enabled)"

# ---------- Internet Gateway ----------
get_or_create_igw() {
  local existing
  existing=$(aws ec2 describe-internet-gateways \
    --filters Name=tag:Name,Values=zietra-prod-igw \
    --query 'InternetGateways[0].InternetGatewayId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "IGW zietra-prod-igw already exists: $existing"
    echo "$existing"
    return
  fi
  log "Creating IGW zietra-prod-igw"
  aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=zietra-prod-igw},{Key=Phase,Value=$PHASE_TAG}]" \
    --region "$REGION" --query 'InternetGateway.InternetGatewayId' --output text
}

IGW_ID=$(get_or_create_igw)
# Attach IGW to VPC (idempotent: skip if already attached)
ATTACHED_VPC=$(aws ec2 describe-internet-gateways --internet-gateway-ids "$IGW_ID" \
  --query 'InternetGateways[0].Attachments[0].VpcId' --output text --region "$REGION" 2>/dev/null || echo None)
if [ "$ATTACHED_VPC" != "$VPC_ID" ]; then
  log "Attaching IGW $IGW_ID to VPC $VPC_ID"
  aws ec2 attach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID" --region "$REGION"
else
  log "IGW $IGW_ID already attached to $VPC_ID"
fi

# ---------- Subnets ----------
get_or_create_subnet() {
  local name=$1 cidr=$2 az=$3 tier=$4
  local existing
  existing=$(aws ec2 describe-subnets \
    --filters Name=tag:Name,Values="$name" Name=vpc-id,Values="$VPC_ID" \
    --query 'Subnets[0].SubnetId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "Subnet $name already exists: $existing"
    echo "$existing"
    return
  fi
  log "Creating subnet $name ($cidr in $az)"
  aws ec2 create-subnet \
    --vpc-id "$VPC_ID" --cidr-block "$cidr" --availability-zone "$az" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$name},{Key=Tier,Value=$tier},{Key=Phase,Value=$PHASE_TAG}]" \
    --region "$REGION" --query 'Subnet.SubnetId' --output text
}

PUB_1A=$(get_or_create_subnet zietra-prod-public-1a 10.0.0.0/24 us-east-1a public)
PUB_1B=$(get_or_create_subnet zietra-prod-public-1b 10.0.1.0/24 us-east-1b public)
PRIV_1A=$(get_or_create_subnet zietra-prod-private-1a 10.0.10.0/24 us-east-1a private)
PRIV_1B=$(get_or_create_subnet zietra-prod-private-1b 10.0.11.0/24 us-east-1b private)

# ---------- Elastic IP for NAT ----------
get_or_allocate_eip() {
  local existing
  existing=$(aws ec2 describe-addresses \
    --filters Name=tag:Name,Values=zietra-prod-nat-eip \
    --query 'Addresses[0].AllocationId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "EIP zietra-prod-nat-eip already allocated: $existing"
    echo "$existing"
    return
  fi
  log "Allocating EIP zietra-prod-nat-eip"
  aws ec2 allocate-address --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=zietra-prod-nat-eip},{Key=Phase,Value=$PHASE_TAG}]" \
    --region "$REGION" --query 'AllocationId' --output text
}

EIP_ALLOC=$(get_or_allocate_eip)

# ---------- NAT Gateway ----------
get_or_create_nat() {
  local existing
  # Filter out DELETED/FAILED NATs (re-running after a deletion should create a new one)
  existing=$(aws ec2 describe-nat-gateways \
    --filter Name=tag:Name,Values=zietra-prod-nat Name=state,Values=available,pending \
    --query 'NatGateways[0].NatGatewayId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "NAT GW zietra-prod-nat already exists: $existing"
    echo "$existing"
    return
  fi
  log "Creating NAT GW zietra-prod-nat in $PUB_1A"
  aws ec2 create-nat-gateway \
    --subnet-id "$PUB_1A" --allocation-id "$EIP_ALLOC" \
    --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=zietra-prod-nat},{Key=Phase,Value=$PHASE_TAG}]" \
    --region "$REGION" --query 'NatGateway.NatGatewayId' --output text
}

NAT_ID=$(get_or_create_nat)
log "Waiting for NAT GW $NAT_ID to become available (typically 2-3 min)..."
aws ec2 wait nat-gateway-available --nat-gateway-ids "$NAT_ID" --region "$REGION"
log "NAT GW $NAT_ID is available"

# ---------- Route Tables ----------
get_or_create_route_table() {
  local name=$1
  local existing
  existing=$(aws ec2 describe-route-tables \
    --filters Name=tag:Name,Values="$name" Name=vpc-id,Values="$VPC_ID" \
    --query 'RouteTables[0].RouteTableId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "Route table $name already exists: $existing"
    echo "$existing"
    return
  fi
  log "Creating route table $name"
  aws ec2 create-route-table --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$name},{Key=Phase,Value=$PHASE_TAG}]" \
    --region "$REGION" --query 'RouteTable.RouteTableId' --output text
}

ensure_route() {
  local rt=$1 dest=$2 target_flag=$3 target_id=$4
  # Check if exact route exists
  local existing
  existing=$(aws ec2 describe-route-tables --route-table-ids "$rt" \
    --query "RouteTables[0].Routes[?DestinationCidrBlock=='$dest']" \
    --output json --region "$REGION" 2>/dev/null || echo "[]")
  if [ "$existing" != "[]" ] && [ -n "$existing" ]; then
    log "Route $dest on $rt already exists"
    return
  fi
  log "Adding route $dest → $target_id on $rt"
  aws ec2 create-route --route-table-id "$rt" --destination-cidr-block "$dest" \
    "$target_flag" "$target_id" --region "$REGION" >/dev/null
}

ensure_associate() {
  local rt=$1 subnet=$2
  local existing
  existing=$(aws ec2 describe-route-tables --route-table-ids "$rt" \
    --query "RouteTables[0].Associations[?SubnetId=='$subnet'].RouteTableAssociationId" \
    --output text --region "$REGION" 2>/dev/null || echo "")
  if [ -n "$existing" ] && [ "$existing" != "None" ]; then
    log "Subnet $subnet already associated with $rt"
    return
  fi
  log "Associating subnet $subnet with $rt"
  aws ec2 associate-route-table --route-table-id "$rt" --subnet-id "$subnet" --region "$REGION" >/dev/null
}

# Public RT: 0.0.0.0/0 → IGW
PUB_RT=$(get_or_create_route_table zietra-prod-public-rt)
ensure_route "$PUB_RT" 0.0.0.0/0 --gateway-id "$IGW_ID"
ensure_associate "$PUB_RT" "$PUB_1A"
ensure_associate "$PUB_RT" "$PUB_1B"

# Private RT: 0.0.0.0/0 → NAT
PRIV_RT=$(get_or_create_route_table zietra-prod-private-rt)
ensure_route "$PRIV_RT" 0.0.0.0/0 --nat-gateway-id "$NAT_ID"
ensure_associate "$PRIV_RT" "$PRIV_1A"
ensure_associate "$PRIV_RT" "$PRIV_1B"

# ---------- Security Groups ----------
get_or_create_sg() {
  local name=$1 desc=$2
  local existing
  existing=$(aws ec2 describe-security-groups \
    --filters Name=group-name,Values="$name" Name=vpc-id,Values="$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "SG $name already exists: $existing"
    echo "$existing"
    return
  fi
  log "Creating SG $name"
  aws ec2 create-security-group \
    --group-name "$name" --description "$desc" \
    --vpc-id "$VPC_ID" --region "$REGION" --query 'GroupId' --output text
  # Tag separately because --tag-specifications is fiddly on create-security-group
}

tag_sg() {
  local sg=$1 name=$2
  aws ec2 create-tags --resources "$sg" \
    --tags "Key=Name,Value=$name" "Key=Phase,Value=$PHASE_TAG" "Key=Environment,Value=$ENV_TAG" \
    --region "$REGION" 2>/dev/null || true
}

ensure_sg_ingress_from_sg() {
  local sg=$1 source_sg=$2 port=$3
  local existing
  existing=$(aws ec2 describe-security-groups --group-ids "$sg" \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`$port\` && ToPort==\`$port\`].UserIdGroupPairs[?GroupId=='$source_sg'].GroupId" \
    --output text --region "$REGION" 2>/dev/null || echo "")
  if [ -n "$existing" ] && [ "$existing" != "None" ]; then
    log "SG $sg already has $port ingress from $source_sg"
    return
  fi
  log "Adding $port ingress on $sg from $source_sg"
  aws ec2 authorize-security-group-ingress --group-id "$sg" \
    --protocol tcp --port "$port" --source-group "$source_sg" --region "$REGION" >/dev/null
}

LAMBDA_SG=$(get_or_create_sg zietra-prod-lambda-sg "Zietra production Lambdas in zietra-prod-vpc (Phase 54.6)")
tag_sg "$LAMBDA_SG" zietra-prod-lambda-sg
# No ingress on lambda-sg (Lambdas are pull-only); default egress allow-all preserved

PROXY_SG=$(get_or_create_sg zietra-prod-rds-proxy-sg "Zietra Aurora RDS Proxy (Phase 54.6)")
tag_sg "$PROXY_SG" zietra-prod-rds-proxy-sg
ensure_sg_ingress_from_sg "$PROXY_SG" "$LAMBDA_SG" 5432

AURORA_NEW_SG=$(get_or_create_sg zietra-prod-aurora-sg "Zietra Aurora cluster in zietra-prod-vpc (Phase 54.6) - proxy-SG ingress only")
tag_sg "$AURORA_NEW_SG" zietra-prod-aurora-sg
ensure_sg_ingress_from_sg "$AURORA_NEW_SG" "$PROXY_SG" 5432

# ---------- Emit all values for runbook capture ----------
echo "VPC_ID=$VPC_ID"
echo "IGW_ID=$IGW_ID"
echo "PUB_1A=$PUB_1A"
echo "PUB_1B=$PUB_1B"
echo "PRIV_1A=$PRIV_1A"
echo "PRIV_1B=$PRIV_1B"
echo "EIP_ALLOC=$EIP_ALLOC"
echo "NAT_ID=$NAT_ID"
echo "PUB_RT=$PUB_RT"
echo "PRIV_RT=$PRIV_RT"
echo "LAMBDA_SG=$LAMBDA_SG"
echo "PROXY_SG=$PROXY_SG"
echo "AURORA_NEW_SG=$AURORA_NEW_SG"
