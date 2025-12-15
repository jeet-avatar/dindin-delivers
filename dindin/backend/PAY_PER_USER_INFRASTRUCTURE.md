# EatFair Pay-Per-User Infrastructure Guide

## Overview

This document outlines how to implement a **pay-per-user** architecture where infrastructure costs scale linearly with actual usage, eliminating the need to pay for idle capacity.

---

## Architecture Options Comparison

### Option 1: AWS Fargate (Recommended for EatFair)

**How it works:** Containers scale from 0 to N based on traffic. Pay only for running containers.

| Users | Containers | vCPU Hours/Day | Cost/Month |
|-------|------------|----------------|------------|
| 0 | 0 | 0 | $0 |
| 100 | 1 | 24 | ~$50 |
| 1,000 | 2 | 48 | ~$100 |
| 10,000 | 5 | 120 | ~$250 |
| 100,000 | 20 | 480 | ~$1,000 |
| 1,000,000 | 100 | 2,400 | ~$5,000 |

**Cost per user:** $0.005 - $0.05/user/month

### Option 2: AWS Lambda (Best for Spiky Traffic)

**How it works:** Each API request runs in its own function. Zero cost when idle.

| Requests/Month | Lambda Cost | API Gateway | Total |
|----------------|-------------|-------------|-------|
| 100,000 | $0.20 | $0.35 | $0.55 |
| 1,000,000 | $2.00 | $3.50 | $5.50 |
| 10,000,000 | $20.00 | $35.00 | $55.00 |
| 100,000,000 | $200.00 | $350.00 | $550.00 |

**Cost per request:** $0.0000055

### Option 3: Firebase Functions (Good for Firebase-heavy apps)

| Invocations/Month | Cost |
|-------------------|------|
| 2,000,000 (free tier) | $0 |
| 10,000,000 | ~$4.00 |
| 100,000,000 | ~$40.00 |

---

## Recommended Implementation: AWS Fargate + Application Auto Scaling

### Step 1: Fargate Task Definition

```json
{
  "family": "eatfair-api",
  "cpu": "256",
  "memory": "512",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "eatfair-backend",
      "image": "YOUR_ECR_REPO/eatfair-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "ENVIRONMENT", "value": "production"},
        {"name": "DATABASE_URL", "value": "postgresql://..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/eatfair-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 2: Auto Scaling Policy (Scale to Zero)

```json
{
  "ServiceName": "eatfair-api-service",
  "ScalableDimension": "ecs:service:DesiredCount",
  "MinCapacity": 0,
  "MaxCapacity": 100,
  "TargetTrackingScalingPolicies": [
    {
      "TargetValue": 70.0,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
      },
      "ScaleOutCooldown": 60,
      "ScaleInCooldown": 300
    },
    {
      "TargetValue": 1000,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ALBRequestCountPerTarget"
      },
      "ScaleOutCooldown": 30,
      "ScaleInCooldown": 300
    }
  ]
}
```

### Step 3: Scheduled Scaling for Predictable Patterns

```bash
# Scale up before lunch rush (11 AM)
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/eatfair-cluster/eatfair-api-service \
  --scheduled-action-name lunch-rush-scale-up \
  --schedule "cron(0 11 * * ? *)" \
  --scalable-target-action MinCapacity=5,MaxCapacity=50

# Scale up before dinner rush (5 PM)
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/eatfair-cluster/eatfair-api-service \
  --scheduled-action-name dinner-rush-scale-up \
  --schedule "cron(0 17 * * ? *)" \
  --scalable-target-action MinCapacity=10,MaxCapacity=100

# Scale down at night (11 PM)
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/eatfair-cluster/eatfair-api-service \
  --scheduled-action-name night-scale-down \
  --schedule "cron(0 23 * * ? *)" \
  --scalable-target-action MinCapacity=0,MaxCapacity=5
```

---

## Database: Pay-Per-Query with Aurora Serverless v2

### Configuration

```yaml
AuroraServerlessV2:
  Engine: aurora-postgresql
  EngineVersion: "15.4"
  ServerlessV2ScalingConfiguration:
    MinCapacity: 0.5  # Minimum 0.5 ACU (~$0.06/hour)
    MaxCapacity: 64   # Maximum 64 ACU (handles millions of queries)

  # Auto-pause when idle (saves $$$)
  AutoPause: true
  SecondsUntilAutoPause: 300  # Pause after 5 minutes idle
```

### Cost Model

| ACU Hours/Day | Queries/Day | Cost/Month |
|---------------|-------------|------------|
| 12 (0.5 ACU) | 10,000 | ~$22 |
| 48 (2 ACU) | 100,000 | ~$86 |
| 240 (10 ACU) | 1,000,000 | ~$432 |
| 1,440 (60 ACU) | 10,000,000 | ~$2,592 |

---

## Cache: ElastiCache Serverless

### Configuration

```yaml
ElastiCacheServerless:
  Engine: redis
  CacheUsageLimits:
    DataStorage:
      Minimum: 1  # 1 GB minimum
      Maximum: 100  # 100 GB maximum
    ECPUPerSecond:
      Minimum: 1000
      Maximum: 100000
```

### Cost: $0.0034/ECPU-hour + $0.125/GB-hour

---

## Complete Pay-Per-User Cost Calculator

```python
def calculate_monthly_cost(active_users: int) -> dict:
    """
    Calculate infrastructure cost based on active users.

    Assumptions:
    - Each user makes ~50 requests/day
    - 10% of users active at peak
    - Average session: 5 minutes
    """

    # Request volume
    requests_per_month = active_users * 50 * 30
    peak_concurrent = active_users * 0.10

    # Fargate (containers)
    containers_needed = max(1, peak_concurrent / 1000)
    fargate_hours = containers_needed * 24 * 30
    fargate_cost = fargate_hours * 0.05  # ~$0.05/hour for 0.25 vCPU

    # Aurora Serverless
    acu_needed = max(0.5, active_users / 50000)
    aurora_cost = acu_needed * 24 * 30 * 0.18

    # ElastiCache Serverless
    cache_gb = max(1, active_users / 100000)
    ecpu_cost = (requests_per_month / 1000000) * 3.4
    storage_cost = cache_gb * 0.125 * 24 * 30
    cache_cost = ecpu_cost + storage_cost

    # Load Balancer
    alb_cost = 16.20 + (requests_per_month / 1000000) * 0.008

    total = fargate_cost + aurora_cost + cache_cost + alb_cost

    return {
        "active_users": active_users,
        "requests_per_month": requests_per_month,
        "fargate": round(fargate_cost, 2),
        "aurora": round(aurora_cost, 2),
        "cache": round(cache_cost, 2),
        "alb": round(alb_cost, 2),
        "total": round(total, 2),
        "cost_per_user": round(total / max(1, active_users), 4)
    }

# Example outputs:
# 100 users:   $45/month ($0.45/user)
# 1,000 users: $85/month ($0.085/user)
# 10,000 users: $350/month ($0.035/user)
# 100,000 users: $2,500/month ($0.025/user)
# 1,000,000 users: $22,000/month ($0.022/user)
```

---

## Terraform Infrastructure-as-Code

```hcl
# eatfair-pay-per-user.tf

module "eatfair_api" {
  source = "terraform-aws-modules/ecs/aws"

  cluster_name = "eatfair-cluster"

  fargate_capacity_providers = {
    FARGATE_SPOT = {  # 70% cheaper than on-demand
      default_capacity_provider_strategy = {
        weight = 100
      }
    }
  }
}

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 100
  min_capacity       = 0  # Scale to zero!
  resource_id        = "service/${module.eatfair_api.cluster_name}/eatfair-api"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "eatfair-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Aurora Serverless v2
resource "aws_rds_cluster" "eatfair_db" {
  cluster_identifier = "eatfair-db"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "15.4"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 64
  }
}

# ElastiCache Serverless
resource "aws_elasticache_serverless_cache" "eatfair_cache" {
  engine           = "redis"
  name             = "eatfair-cache"

  cache_usage_limits {
    data_storage {
      minimum = 1
      maximum = 100
      unit    = "GB"
    }
    ecpu_per_second {
      minimum = 1000
      maximum = 100000
    }
  }
}
```

---

## Summary: True Pay-Per-User

| Component | Pricing Model | Zero Traffic Cost |
|-----------|--------------|-------------------|
| Fargate | Per vCPU-second | $0 (scale to 0) |
| Aurora Serverless v2 | Per ACU-hour | ~$22 (min 0.5 ACU) |
| ElastiCache Serverless | Per ECPU + storage | ~$10 (min 1GB) |
| API Gateway | Per request | $0 |
| CloudFront | Per request + data | $0 |

**Minimum Monthly Cost (0 users):** ~$32/month
**Maximum Cost per Active User:** $0.02 - $0.50/month depending on usage patterns

This architecture ensures you **never pay for capacity you don't use** while automatically scaling to handle 10+ million users when needed.
