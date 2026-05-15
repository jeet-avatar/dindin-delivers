#!/usr/bin/env bash
# Phase 54.6-01 — Provision zietra-prod-vpc + 4 subnets + IGW + NAT instance + 3 SGs
#
# IDEMPOTENT: safe to re-run. Each resource is created only if a matching Name-tagged
# resource is not already present. Returns existing IDs on re-run.
#
# NAT pivot (2026-05-15): account is at 21/21 EIP quota and AWS support quota raise
# would take hours. Pivoted from NAT Gateway → NAT instance per operator decision
# (Option D in runbook). NAT instance uses auto-assigned public IP on a t4g.nano
# (Graviton, ~$3/mo) — no EIP required. Tradeoffs documented in runbook:
#   - Lower HA (single EC2, no multi-AZ failover; mitigated by demo workload)
#   - Lower throughput (~5 Gbps vs 45 Gbps NAT GW; ample for demo traffic)
#   - Our maintenance burden (AMI updates, iptables persistence) vs AWS-managed NAT GW
# Upgrade path back to NAT Gateway: provision NAT GW in same subnet, swap private
# route table 0/0 target from instance ENI → NAT GW ID, terminate NAT instance.
# Estimated upgrade window: <30 min (acceptable maintenance).
#
# Naming convention (LOCKED per RESEARCH §A.1 + critical_constraints):
#   VPC:      zietra-prod-vpc           10.0.0.0/16
#   Subnets:  zietra-prod-public-1a     10.0.0.0/24  us-east-1a
#             zietra-prod-public-1b     10.0.1.0/24  us-east-1b
#             zietra-prod-private-1a    10.0.10.0/24 us-east-1a
#             zietra-prod-private-1b    10.0.11.0/24 us-east-1b
#   IGW:      zietra-prod-igw
#   NAT inst: zietra-nat-instance       (in public-1a, t4g.nano, AL2023 ARM, source/dest disabled)
#   NAT SG:   zietra-nat-instance-sg    (allow VPC CIDR inbound, 0/0 outbound)
#   Routes:   zietra-prod-public-rt     (public-1a, public-1b → IGW)
#             zietra-prod-private-rt    (private-1a, private-1b → NAT instance ENI)
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

# Enable auto-assign public IP on public-1a so the NAT instance gets one without an EIP.
# (Public-1b doesn't need MapPublicIpOnLaunch — nothing public launches there.)
log "Ensuring MapPublicIpOnLaunch=true on $PUB_1A"
aws ec2 modify-subnet-attribute --subnet-id "$PUB_1A" --map-public-ip-on-launch --region "$REGION" >/dev/null

# ---------- NAT Instance SG ----------
# Allows ALL traffic from the VPC CIDR inbound (so private subnets can MASQUERADE through it),
# and ALL traffic outbound (default egress already allow-all on a fresh SG).
get_or_create_nat_sg() {
  local existing
  existing=$(aws ec2 describe-security-groups \
    --filters Name=group-name,Values=zietra-nat-instance-sg Name=vpc-id,Values="$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "SG zietra-nat-instance-sg already exists: $existing"
    echo "$existing"
    return
  fi
  log "Creating SG zietra-nat-instance-sg"
  aws ec2 create-security-group \
    --group-name zietra-nat-instance-sg \
    --description "Zietra NAT instance (Phase 54.6-01) - allow VPC CIDR inbound, 0/0 outbound" \
    --vpc-id "$VPC_ID" --region "$REGION" --query 'GroupId' --output text
}

NAT_SG=$(get_or_create_nat_sg)
aws ec2 create-tags --resources "$NAT_SG" \
  --tags "Key=Name,Value=zietra-nat-instance-sg" "Key=Phase,Value=$PHASE_TAG" "Key=Environment,Value=$ENV_TAG" \
  --region "$REGION" 2>/dev/null || true

# Ingress: all traffic from VPC CIDR 10.0.0.0/16
EXISTING_NAT_INGRESS=$(aws ec2 describe-security-groups --group-ids "$NAT_SG" \
  --query "SecurityGroups[0].IpPermissions[?IpProtocol=='-1'].IpRanges[?CidrIp=='10.0.0.0/16'].CidrIp" \
  --output text --region "$REGION" 2>/dev/null || echo "")
if [ -z "$EXISTING_NAT_INGRESS" ] || [ "$EXISTING_NAT_INGRESS" = "None" ]; then
  log "Adding 10.0.0.0/16 all-traffic ingress on NAT SG $NAT_SG"
  aws ec2 authorize-security-group-ingress --group-id "$NAT_SG" \
    --ip-permissions 'IpProtocol=-1,IpRanges=[{CidrIp=10.0.0.0/16}]' \
    --region "$REGION" >/dev/null
else
  log "NAT SG $NAT_SG already has VPC-CIDR ingress"
fi

# ---------- NAT Instance ----------
# AL2023 ARM64 (latest); t4g.nano; iptables MASQUERADE via user-data.
# Source/dest check disabled post-launch (required for NAT to forward traffic).
get_or_create_nat_instance() {
  local existing
  # Match running OR pending; ignore terminated/stopped (re-run after termination should create new)
  existing=$(aws ec2 describe-instances \
    --filters Name=tag:Name,Values=zietra-nat-instance \
              Name=instance-state-name,Values=pending,running \
    --query 'Reservations[0].Instances[0].InstanceId' --output text --region "$REGION" 2>/dev/null || echo None)
  if [ "$existing" != "None" ] && [ "$existing" != "null" ] && [ -n "$existing" ]; then
    log "NAT instance zietra-nat-instance already exists: $existing"
    echo "$existing"
    return
  fi
  log "Looking up latest AL2023 ARM64 AMI"
  local ami
  ami=$(aws ec2 describe-images --owners amazon \
    --filters 'Name=name,Values=al2023-ami-2023*arm64' 'Name=state,Values=available' \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text --region "$REGION")
  log "AMI selected: $ami"

  # User-data: enable IP forward + iptables MASQUERADE on the ENI (ens5 on AL2023 Nitro)
  local user_data
  user_data=$(cat <<'USERDATA'
#!/bin/bash
set -e
# Enable IP forwarding immediately and persist
echo 1 > /proc/sys/net/ipv4/ip_forward
sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/99-nat.conf

# NAT/masquerade outbound traffic on the primary ENI (AL2023 Nitro = ens5)
/sbin/iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE
/sbin/iptables -F FORWARD

# Persist iptables across reboots via rc.local
cat > /etc/rc.d/rc.local <<'RC'
#!/bin/bash
echo 1 > /proc/sys/net/ipv4/ip_forward
/sbin/iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE
/sbin/iptables -F FORWARD
RC
chmod +x /etc/rc.d/rc.local
USERDATA
)

  log "Launching NAT instance (t4g.nano, AL2023 ARM, subnet=$PUB_1A, sg=$NAT_SG)"
  aws ec2 run-instances \
    --image-id "$ami" \
    --instance-type t4g.nano \
    --subnet-id "$PUB_1A" \
    --security-group-ids "$NAT_SG" \
    --user-data "$user_data" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=zietra-nat-instance},{Key=Phase,Value=$PHASE_TAG},{Key=Role,Value=nat},{Key=Environment,Value=$ENV_TAG}]" \
    --region "$REGION" --query 'Instances[0].InstanceId' --output text
}

NAT_INSTANCE_ID=$(get_or_create_nat_instance)
log "Waiting for NAT instance $NAT_INSTANCE_ID to be running..."
aws ec2 wait instance-running --instance-ids "$NAT_INSTANCE_ID" --region "$REGION"

# Disable source/dest check (REQUIRED for NAT — instances must forward traffic not destined to them)
SRC_DEST_CHECK=$(aws ec2 describe-instances --instance-ids "$NAT_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].SourceDestCheck' --output text --region "$REGION")
if [ "$SRC_DEST_CHECK" = "True" ]; then
  log "Disabling source/dest check on $NAT_INSTANCE_ID"
  aws ec2 modify-instance-attribute --instance-id "$NAT_INSTANCE_ID" --no-source-dest-check --region "$REGION"
else
  log "Source/dest check already disabled on $NAT_INSTANCE_ID"
fi

# Capture the NAT instance's ENI (primary network interface) for use as the private RT 0/0 target
NAT_ENI_ID=$(aws ec2 describe-instances --instance-ids "$NAT_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].NetworkInterfaces[0].NetworkInterfaceId' \
  --output text --region "$REGION")
NAT_PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$NAT_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text --region "$REGION")
log "NAT instance ready: $NAT_INSTANCE_ID  ENI=$NAT_ENI_ID  PublicIP=$NAT_PUBLIC_IP"

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

# Private RT: 0.0.0.0/0 → NAT instance ENI
# (When/if we upgrade to NAT Gateway later, swap target_flag from --network-interface-id to --nat-gateway-id.)
PRIV_RT=$(get_or_create_route_table zietra-prod-private-rt)
ensure_route "$PRIV_RT" 0.0.0.0/0 --network-interface-id "$NAT_ENI_ID"
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
echo "NAT_INSTANCE_ID=$NAT_INSTANCE_ID"
echo "NAT_ENI_ID=$NAT_ENI_ID"
echo "NAT_PUBLIC_IP=$NAT_PUBLIC_IP"
echo "NAT_SG=$NAT_SG"
echo "PUB_RT=$PUB_RT"
echo "PRIV_RT=$PRIV_RT"
echo "LAMBDA_SG=$LAMBDA_SG"
echo "PROXY_SG=$PROXY_SG"
echo "AURORA_NEW_SG=$AURORA_NEW_SG"
