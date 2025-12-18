# Dollor.ai - Secrets Manager Module
# ====================================
# Manages AWS Secrets Manager secrets for the platform
# Empty secrets are given placeholder values to be updated later

# Use nonsensitive keys for iteration
locals {
  secret_keys = nonsensitive(keys(var.secrets))

  # For empty secrets, use a placeholder that will be updated later
  # This allows terraform to create the secret structure without real values
  secret_values = {
    for k, v in var.secrets :
    k => length(v) > 0 ? v : "PLACEHOLDER_UPDATE_ME_${upper(replace(k, "-", "_"))}"
  }
}

resource "aws_secretsmanager_secret" "main" {
  for_each = toset(local.secret_keys)

  name        = "dollor/${var.environment}/${each.key}"
  description = "Secret for ${each.key} in ${var.environment}"

  tags = merge(var.tags, {
    Name        = "dollor-${var.environment}-${each.key}"
    Placeholder = length(var.secrets[each.key]) == 0 ? "true" : "false"
  })
}

resource "aws_secretsmanager_secret_version" "main" {
  for_each = toset(local.secret_keys)

  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = local.secret_values[each.key]

  lifecycle {
    ignore_changes = [
      # Allow secrets to be updated outside terraform (e.g., via AWS Console or CI/CD)
      secret_string
    ]
  }
}
