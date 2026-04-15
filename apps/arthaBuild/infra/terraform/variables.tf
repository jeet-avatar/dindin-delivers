variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "Customer VPC ID"
  type        = string
}

variable "subnet_id" {
  description = "Public subnet ID (must have internet gateway)"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type (g4dn.xlarge recommended for GPU)"
  type        = string
  default     = "g4dn.xlarge"
}

variable "ebs_size_gb" {
  description = "EBS volume size in GB (100 minimum for models + data)"
  type        = number
  default     = 100
}

variable "key_pair_name" {
  description = "EC2 key pair name for SSH access"
  type        = string
}

variable "license_key" {
  description = "ArthaBuild license key provided by TechCloudPro"
  type        = string
  sensitive   = true
}

variable "arthaBuild_version" {
  description = "ArthaBuild version tag to deploy"
  type        = string
  default     = "latest"
}
