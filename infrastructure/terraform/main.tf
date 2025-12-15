# Dollor.ai Infrastructure - Main Terraform Configuration
# =======================================================
# This is the root module that orchestrates all infrastructure components

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Remote state configuration - uncomment and configure for your backend
  # backend "s3" {
  #   bucket         = "dollor-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "dollor-terraform-locks"
  # }
}

# =============================================================================
# PROVIDERS
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "dollor-ai"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

# Kubernetes provider - configured after EKS is created
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# =============================================================================
# DATA SOURCES
# =============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# =============================================================================
# MODULES
# =============================================================================

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)

  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.environment != "production"

  tags = local.common_tags
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  environment     = var.environment
  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.eks_cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  node_groups = var.eks_node_groups

  enable_cluster_autoscaler = var.enable_cluster_autoscaler

  tags = local.common_tags

  depends_on = [module.vpc]
}

# RDS Module (PostgreSQL)
module "rds" {
  source = "./modules/rds"

  environment = var.environment
  identifier  = "${var.project_name}-${var.environment}"

  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  allowed_cidr_blocks = [var.vpc_cidr]

  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage

  database_name   = var.database_name
  master_username = var.database_username

  multi_az            = var.environment == "production"
  deletion_protection = var.environment == "production"

  backup_retention_period = var.environment == "production" ? 30 : 7

  tags = local.common_tags

  depends_on = [module.vpc]
}

# ECR Module
module "ecr" {
  source = "./modules/ecr"

  environment = var.environment

  repositories = [
    "dollor/auth-service",
    "dollor/notification-service",
    "dollor/driver-service",
    "dollor/food-order-service",
    "dollor/location-service",
    "dollor/payment-service",
    "dollor/api-gateway"
  ]

  image_tag_mutability = "MUTABLE"
  scan_on_push         = true

  lifecycle_policy_count = var.environment == "production" ? 50 : 10

  tags = local.common_tags
}

# Secrets Manager Module
module "secrets" {
  source = "./modules/secrets"

  environment  = var.environment
  project_name = var.project_name

  secrets = {
    "database-url"   = module.rds.connection_string
    "jwt-secret"     = random_password.jwt_secret.result
    "smtp-password"  = var.smtp_password
    "twilio-auth"    = var.twilio_auth_token
    "stripe-secret"  = var.stripe_secret_key
    "firebase-creds" = var.firebase_credentials
  }

  tags = local.common_tags

  depends_on = [module.rds]
}

# S3 Module (for assets, backups)
module "s3" {
  source = "./modules/s3"

  environment  = var.environment
  project_name = var.project_name

  buckets = {
    "assets" = {
      versioning = true
      lifecycle_rules = [
        {
          id      = "archive-old-versions"
          enabled = true
          noncurrent_version_transition = {
            days          = 30
            storage_class = "STANDARD_IA"
          }
        }
      ]
    }
    "backups" = {
      versioning = true
      lifecycle_rules = [
        {
          id      = "expire-old-backups"
          enabled = true
          expiration = {
            days = var.environment == "production" ? 90 : 30
          }
        }
      ]
    }
    "logs" = {
      versioning = false
      lifecycle_rules = [
        {
          id      = "expire-logs"
          enabled = true
          expiration = {
            days = 90
          }
        }
      ]
    }
  }

  tags = local.common_tags
}

# CloudWatch Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment  = var.environment
  project_name = var.project_name

  log_retention_days = var.environment == "production" ? 365 : 30

  alarm_email = var.alarm_email

  eks_cluster_name = module.eks.cluster_name
  rds_identifier   = module.rds.identifier

  tags = local.common_tags

  depends_on = [module.eks, module.rds]
}

# =============================================================================
# RANDOM RESOURCES
# =============================================================================

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# =============================================================================
# LOCALS
# =============================================================================

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "s3_bucket_names" {
  description = "S3 bucket names"
  value       = module.s3.bucket_names
}
