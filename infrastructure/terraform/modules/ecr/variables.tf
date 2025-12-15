# Dollor.ai - ECR Module Variables
# ==================================

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "repositories" {
  description = "List of ECR repository names to create"
  type        = list(string)
}

variable "image_tag_mutability" {
  description = "Image tag mutability (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "lifecycle_policy_count" {
  description = "Number of images to retain"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
