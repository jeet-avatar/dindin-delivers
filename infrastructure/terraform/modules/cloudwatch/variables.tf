variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "alarm_email" {
  type = string
}

variable "eks_cluster_name" {
  type = string
}

variable "rds_identifier" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
