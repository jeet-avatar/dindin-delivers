# Dollor.ai Infrastructure - Variables
# =====================================

# =============================================================================
# GENERAL
# =============================================================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "dollor"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# VPC
# =============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# =============================================================================
# EKS
# =============================================================================

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    scaling_config = object({
      desired_size = number
      min_size     = number
      max_size     = number
    })
    labels = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      scaling_config = {
        desired_size = 2
        min_size     = 1
        max_size     = 5
      }
      labels = {
        role = "general"
      }
      taints = []
    }
  }
}

variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

# =============================================================================
# RDS
# =============================================================================

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Initial storage allocation in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Maximum storage allocation for autoscaling in GB"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "dollor"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  default     = "dollor_admin"
}

# =============================================================================
# SECRETS (Sensitive)
# =============================================================================

variable "smtp_password" {
  description = "SMTP password for email service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_auth_token" {
  description = "Twilio auth token for SMS service"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key for payments"
  type        = string
  sensitive   = true
  default     = ""
}

variable "firebase_credentials" {
  description = "Firebase credentials JSON for push notifications"
  type        = string
  sensitive   = true
  default     = ""
}

# =============================================================================
# MONITORING
# =============================================================================

variable "alarm_email" {
  description = "Email for CloudWatch alarms"
  type        = string
  default     = "alerts@dollor.ai"
}
