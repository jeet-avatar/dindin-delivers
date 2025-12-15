# Dollor.ai - Secrets Manager Module
# ====================================

# Use nonsensitive keys for iteration
locals {
  secret_keys = nonsensitive(keys(var.secrets))
}

resource "aws_secretsmanager_secret" "main" {
  for_each = toset(local.secret_keys)

  name        = "dollor/${var.environment}/${each.key}"
  description = "Secret for ${each.key} in ${var.environment}"

  tags = merge(var.tags, {
    Name = "dollor-${var.environment}-${each.key}"
  })
}

resource "aws_secretsmanager_secret_version" "main" {
  for_each = toset(local.secret_keys)

  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = var.secrets[each.key]
}
