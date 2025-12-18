# Dollor.ai - Staging Environment
# =================================

terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "dollor-terraform-state"
    key            = "environments/staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "dollor-terraform-locks"
  }
}

module "infrastructure" {
  source = "../../"

  environment = "staging"
  aws_region  = "us-east-1"

  # VPC
  vpc_cidr           = "10.1.0.0/16"
  enable_nat_gateway = true

  # EKS
  eks_cluster_version = "1.29"
  eks_node_groups = {
    general = {
      instance_types = ["t3.medium", "t3.large"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 3
        min_size     = 2
        max_size     = 6
      }
      labels = {
        role        = "general"
        environment = "staging"
      }
      taints = []
    }
  }
  enable_cluster_autoscaler = true

  # RDS
  rds_instance_class        = "db.t3.small"
  rds_allocated_storage     = 50
  rds_max_allocated_storage = 100
  database_name             = "dollor_staging"
  database_username         = "dollor_admin"

  # Secrets
  smtp_password        = var.smtp_password
  twilio_auth_token    = var.twilio_auth_token
  stripe_secret_key    = var.stripe_secret_key
  firebase_credentials = var.firebase_credentials

  # Monitoring
  alarm_email = "staging-alerts@dollor.ai"
}

# =============================================================================
# VARIABLES
# =============================================================================

variable "smtp_password" {
  type      = string
  sensitive = true
  default   = ""
}

variable "twilio_auth_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "firebase_credentials" {
  type      = string
  sensitive = true
  default   = ""
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
  value = module.infrastructure.eks_cluster_endpoint
}

output "ecr_repository_urls" {
  value = module.infrastructure.ecr_repository_urls
}
