---
created: 2026-03-15T00:00:00Z
title: "D1: Encrypt bank account details at rest using Fernet"
area: security/encryption
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/main_new.py
  - apps/web/p2p-platform/backend/encryption.py (new)
---

## Problem

Driver bank account details stored as plaintext in PostgreSQL:
- bank_routing_number (models.py Driver class)
- bank_account_holder
- bank_name

A database breach would expose all driver banking information.

## Solution

1. Create encryption.py with Fernet encrypt/decrypt helpers
2. Encrypt on write, decrypt on read for sensitive fields
3. Key from ENCRYPTION_KEY env var (stored in AWS Secrets Manager)
4. Migrate existing plaintext data to encrypted
