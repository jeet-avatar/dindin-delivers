# Dollor.ai - Production Environment
# ====================================
# CRITICAL: All changes require approval

terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "dollor-terraform-state"
    key            = "environments/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "dollor-terraform-locks"
  }
}

module "infrastructure" {
  source = "../../"

  environment = "production"
  aws_region  = "us-east-1"

  # VPC
  vpc_cidr           = "10.2.0.0/16"
  enable_nat_gateway = true

  # EKS - Production Grade
  eks_cluster_version = "1.28"
  eks_node_groups = {
    general = {
      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 4
        min_size     = 3
        max_size     = 10
      }
      labels = {
        role        = "general"
        environment = "production"
      }
      taints = []
    }
    cpu_intensive = {
      instance_types = ["c5.xlarge", "c5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 2
        min_size     = 1
        max_size     = 5
      }
      labels = {
        role        = "cpu-intensive"
        environment = "production"
      }
      taints = [{
        key    = "workload"
        value  = "cpu-intensive"
        effect = "NO_SCHEDULE"
      }]
    }
  }
  enable_cluster_autoscaler = true

  # RDS - Production Grade (Multi-AZ)
  rds_instance_class        = "db.r6g.large"
  rds_allocated_storage     = 100
  rds_max_allocated_storage = 500
  database_name             = "dollor_production"
  database_username         = "dollor_admin"

  # Secrets
  smtp_password        = var.smtp_password
  twilio_auth_token    = var.twilio_auth_token
  stripe_secret_key    = var.stripe_secret_key
  firebase_credentials = var.firebase_credentials

  # Monitoring
  alarm_email = "production-alerts@dollor.ai"
}

# =============================================================================
# VARIABLES
# =============================================================================

variable "smtp_password" {
  type      = string
  sensitive = true
}

variable "twilio_auth_token" {
  type      = string
  sensitive = true
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
}

variable "firebase_credentials" {
  type      = string
  sensitive = true
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "vpc_id" {
  value = module.infrastructure.vpc_id
}

output "eks_cluster_name" {
  value = module.infrastructure.eks_cluster_name
}

output "eks_cluster_endpoint" {
  value     = module.infrastructure.eks_cluster_endpoint
  sensitive = true
}

output "ecr_repository_urls" {
  value = module.infrastructure.ecr_repository_urls
}

output "rds_endpoint" {
  value     = module.infrastructure.rds_endpoint
  sensitive = true
}
