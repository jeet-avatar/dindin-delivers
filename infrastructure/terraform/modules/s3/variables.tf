variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "buckets" {
  type = map(object({
    versioning = bool
    lifecycle_rules = list(object({
      id      = string
      enabled = bool
      expiration = optional(object({
        days = number
      }))
      noncurrent_version_transition = optional(object({
        days          = number
        storage_class = string
      }))
    }))
  }))
}

variable "tags" {
  type    = map(string)
  default = {}
}
