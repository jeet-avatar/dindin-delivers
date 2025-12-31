# Dollor.ai - RDS Module
# =======================
# Creates PostgreSQL RDS instance

# =============================================================================
# DB SUBNET GROUP
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "dollor-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "dollor-${var.environment}-db-subnet-group"
  })
}

# =============================================================================
# SECURITY GROUP
# =============================================================================

resource "aws_security_group" "rds" {
  name        = "dollor-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "PostgreSQL access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "dollor-${var.environment}-rds-sg"
  })
}

# =============================================================================
# KMS KEY
# =============================================================================

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "dollor-${var.environment}-rds-kms"
  })
}

# =============================================================================
# PARAMETER GROUP
# =============================================================================

resource "aws_db_parameter_group" "main" {
  name   = "dollor-${var.environment}-pg15"
  family = "postgres15"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries over 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = var.tags
}

# =============================================================================
# RDS INSTANCE
# =============================================================================

resource "random_password" "master" {
  length  = 32
  special = false
}

resource "aws_db_instance" "main" {
  identifier = var.identifier

  engine                = "postgres"
  engine_version        = "15.7"
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  multi_az                  = var.multi_az
  publicly_accessible       = false
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.identifier}-final-snapshot" : null

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = aws_kms_key.rds.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  auto_minor_version_upgrade = true

  tags = merge(var.tags, {
    Name = var.identifier
  })
}

# =============================================================================
# STORE PASSWORD IN SECRETS MANAGER
# =============================================================================

resource "aws_secretsmanager_secret" "rds_password" {
  name        = "dollor/${var.environment}/rds/master-password"
  description = "RDS master password for ${var.identifier}"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id = aws_secretsmanager_secret.rds_password.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    database = var.database_name
  })
}
